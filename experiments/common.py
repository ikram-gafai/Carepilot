"""Shared utilities for the CarePilot evaluation audit (``experiments/``).

The audit re-uses the original benchmark modules under ``ml/benchmarks`` wherever possible so that
every comparison is made against the code that produced the committed reports, not a re-implementation.
"""
from __future__ import annotations

import hashlib
import importlib
import json
import os
import platform
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

os.environ.setdefault("MPLBACKEND", "Agg")

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    brier_score_loss,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

ROOT = Path(__file__).resolve().parents[1]
BENCH = ROOT / "ml" / "benchmarks"
EXPERIMENTS = Path(__file__).resolve().parent
RESULTS = EXPERIMENTS / "results"
FIGURES = EXPERIMENTS / "figures"
RANDOM_STATE = 20260525  # same constant as every ml/benchmarks/*/benchmark.py


@dataclass(frozen=True)
class Task:
    key: str
    bench_dir: str
    target: str
    kind: str  # "binary" | "multiclass"


TASKS: dict[str, Task] = {
    "escalation": Task("escalation", "escalation", "escalation_required", "binary"),
    "transfer": Task("transfer", "transfer", "transfer_required", "binary"),
    "sla": Task("sla", "sla_prediction", "sla_breached", "binary"),
    "priority": Task("priority", "priority_prediction", "priority", "multiclass"),
    "action": Task("action", "action_recommendation", "recommended_action", "multiclass"),
}

# Fields that only exist after the ticket has been worked or resolved, or that the synthetic generator
# derives from other labels (see lib/ml-training/dataset-generator.ts). They are excluded from the
# "creation-time" feature set.
POST_OUTCOME_OR_LABEL_DERIVED = [
    "resolution_time_minutes",
    "resolution_time_missing",
    "ticket_age_minutes",
    "sla_breached",
    "escalation_required",
    "transfer_required",
    "recommended_action",
    "operational_complexity",
]

CREATION_TIME_CAT = ["perimeter", "incident_category", "environment_type", "ticket_source", "store_size", "priority"]
CREATION_TIME_NUM = ["queue_load", "description_missing"]


# --------------------------------------------------------------------------------------------- data
def database_url() -> str:
    """DATABASE_URL with an explicit SQLAlchemy driver.

    ``postgresql://`` makes SQLAlchemy default to psycopg2, which ml/requirements.txt does not list,
    so the first importable driver among psycopg2, psycopg (v3) and pg8000 is selected.
    """
    url = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_DATABASE_URL") or "postgresql://carepilot:carepilot@localhost:5433/carepilot"
    if "+" in url.split("://", 1)[0]:
        return url
    rest = url.split("://", 1)[1]
    for module, dialect in (("psycopg2", "postgresql+psycopg2"), ("psycopg", "postgresql+psycopg"), ("pg8000", "postgresql+pg8000")):
        try:
            importlib.import_module(module)
            return f"{dialect}://{rest}"
        except ImportError:
            continue
    raise RuntimeError("No PostgreSQL driver found: install psycopg[binary] (ml/requirements.txt), psycopg2-binary or pg8000.")


def load_tickets() -> pd.DataFrame:
    from sqlalchemy import create_engine

    engine = create_engine(database_url())
    with engine.connect() as conn:
        df = pd.read_sql_query("SELECT * FROM ml_training.historical_tickets ORDER BY ticket_id", conn)
    if df.empty:
        raise SystemExit("ml_training.historical_tickets is empty: seed it first (see experiments/README.md).")
    return df


FINGERPRINT_COLUMNS = [
    "ticket_id", "title", "description", "perimeter", "priority", "incident_category", "environment_type",
    "ticket_source", "store_id", "store_size", "queue_load", "escalation_required", "transfer_required",
    "sla_breached", "recommended_action", "resolution_time_minutes", "ticket_age_minutes",
    "operational_complexity", "resolution_summary", "similar_case_group_id",
]


def dataset_fingerprint(df: pd.DataFrame) -> str:
    """Driver-independent SHA-256 over the columns the audit uses (numerics rounded to 6 d.p.)."""
    parts = []
    for column in FINGERPRINT_COLUMNS:
        series = df[column]
        if series.dtype == bool or column in ("escalation_required", "transfer_required", "sla_breached"):
            series = series.astype("Int64").astype(str)
        elif column in ("queue_load", "resolution_time_minutes", "ticket_age_minutes", "operational_complexity"):
            series = pd.to_numeric(series, errors="coerce").round(6).astype(str)
        else:
            series = series.fillna("").astype(str)
        parts.append(series.to_numpy())
    joined = "\x1f".join("\x1e".join(map(str, row)) for row in zip(*parts))
    return hashlib.sha256(joined.encode("utf-8")).hexdigest()


def clean_text(value: object) -> str:
    """Identical to clean_text() in every ml/benchmarks/*/preprocessing.py."""
    text = "" if value is None or (isinstance(value, float) and np.isnan(value)) else str(value)
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def prepare_common(df: pd.DataFrame) -> pd.DataFrame:
    """One prepared frame holding every feature any task uses, cleaned exactly as the benchmarks do."""
    escalation_pp = load_task_modules(TASKS["escalation"])[1]
    out = df.copy()
    out["title"] = out["title"].fillna("")
    out["description"] = out["description"].fillna("")
    out["description_missing"] = (out["description"].str.strip() == "").astype(int)
    out["ticket_text"] = (out["title"] + " " + out["description"]).map(clean_text)
    out["perimeter"] = out["perimeter"].map(escalation_pp.normalize_perimeter)
    out["base_incident_category"] = out["incident_category"].fillna("").map(lambda v: str(v).split("__ROOT_")[0]).map(lambda x: clean_text(x) or "unknown")
    for column in ["priority", "incident_category", "environment_type", "ticket_source", "store_size", "recommended_action"]:
        out[column] = out[column].fillna("unknown").map(lambda x: clean_text(x) or "unknown")
    for column in ["resolution_time_minutes", "ticket_age_minutes", "queue_load", "operational_complexity"]:
        out[column] = pd.to_numeric(out[column], errors="coerce")
    out["resolution_time_missing"] = out["resolution_time_minutes"].isna().astype(int)
    for column in ["escalation_required", "transfer_required", "sla_breached"]:
        out[column] = out[column].astype(int)
    return out


# ------------------------------------------------------------------------------ original benchmark code
_SHARED_MODULES = ("benchmark", "preprocessing", "evaluation", "visualization")
_MODULE_CACHE: dict[str, tuple] = {}


def load_task_modules(task: Task):
    """Import (benchmark, preprocessing, evaluation) of one ml/benchmarks/<task> directory.

    The five directories reuse the same module names, so sys.modules is cleared between tasks.
    """
    if task.key in _MODULE_CACHE:
        return _MODULE_CACHE[task.key]
    for name in _SHARED_MODULES:
        sys.modules.pop(name, None)
    path = str(BENCH / task.bench_dir)
    sys.path.insert(0, path)
    try:
        benchmark = importlib.import_module("benchmark")
        modules = (benchmark, sys.modules.get("preprocessing"), sys.modules.get("evaluation"))
    finally:
        sys.path.remove(path)
        for name in _SHARED_MODULES:
            sys.modules.pop(name, None)
    _MODULE_CACHE[task.key] = modules
    return modules


def original_xgb_params(task: Task) -> dict:
    """XGBoost hyper-parameters exactly as declared in the task's build_models()."""
    benchmark = load_task_modules(task)[0]
    models = benchmark.build_models(pos_weight=1.0) if task.kind == "binary" else benchmark.build_models()
    params = models["XGBoost"].named_steps["model"].get_params()
    return {k: v for k, v in params.items() if v is not None and k not in ("missing",)}


def original_feature_columns(task: Task) -> tuple[list[str], list[str]]:
    preprocessing = load_task_modules(task)[1]
    return list(preprocessing.CAT_COLUMNS), list(preprocessing.NUM_COLUMNS)


def original_split(df: pd.DataFrame, target: str, seed: int = RANDOM_STATE):
    """Re-implementation of stratified_splits() (identical in all five benchmarks): 70/15/15."""
    from sklearn.model_selection import train_test_split

    train, holdout = train_test_split(df, train_size=0.70, random_state=seed, stratify=df[target])
    validation, test = train_test_split(holdout, train_size=0.50, random_state=seed, stratify=holdout[target])
    return train, validation, test


# ------------------------------------------------------------------------------------------ features
def feature_set(task: Task, name: str) -> tuple[list[str], list[str]]:
    """(categorical, numeric) columns for a named feature set; text (ticket_text) is always included."""
    if name == "original":
        return original_feature_columns(task)
    cat = [c for c in CREATION_TIME_CAT if c != task.target]
    num = list(CREATION_TIME_NUM)
    if name == "creation_time":
        return cat, num
    if name == "creation_time_base_category":
        return ["base_incident_category" if c == "incident_category" else c for c in cat], num
    raise ValueError(name)


def build_preprocessor(cat: list[str], num: list[str], max_text_features: int = 3500) -> ColumnTransformer:
    """Same transformer design as the benchmarks; the text budget is held constant across models."""
    text = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), min_df=3, max_df=0.92, max_features=max_text_features)
    categorical = Pipeline([("imputer", SimpleImputer(strategy="most_frequent")), ("onehot", OneHotEncoder(handle_unknown="ignore"))])
    numeric = Pipeline([("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler(with_mean=False))])
    transformers = [("text", text, "ticket_text")]
    if cat:
        transformers.append(("cat", categorical, cat))
    if num:
        transformers.append(("num", numeric, num))
    return ColumnTransformer(transformers, sparse_threshold=0.3)


def encode_target(task: Task, frame: pd.DataFrame, classes: list[str] | None = None):
    if task.kind == "binary":
        return frame[task.target].astype(int).to_numpy(), [0, 1]
    classes = classes or sorted(frame[task.target].unique())
    lookup = {c: i for i, c in enumerate(classes)}
    return frame[task.target].map(lookup).to_numpy(), classes


# ------------------------------------------------------------------------------------------- metrics
def binary_metrics(y: np.ndarray, proba: np.ndarray, threshold: float = 0.5) -> dict:
    pred = (proba >= threshold).astype(int)
    return {
        "accuracy": accuracy_score(y, pred),
        "precision": precision_score(y, pred, zero_division=0),
        "recall": recall_score(y, pred, zero_division=0),
        "f1": f1_score(y, pred, zero_division=0),
        "roc_auc": roc_auc_score(y, proba) if len(np.unique(y)) > 1 else float("nan"),
        "pr_auc": average_precision_score(y, proba) if len(np.unique(y)) > 1 else float("nan"),
        "brier": brier_score_loss(y, proba),
        "positive_rate": float(np.mean(y)),
    }


def multiclass_metrics(y: np.ndarray, pred: np.ndarray) -> dict:
    return {
        "accuracy": accuracy_score(y, pred),
        "macro_f1": f1_score(y, pred, average="macro", zero_division=0),
        "weighted_f1": f1_score(y, pred, average="weighted", zero_division=0),
        "macro_precision": precision_score(y, pred, average="macro", zero_division=0),
        "macro_recall": recall_score(y, pred, average="macro", zero_division=0),
    }


def primary_metric(task: Task) -> str:
    return "f1" if task.kind == "binary" else "macro_f1"


def metric_fn(task: Task, name: str) -> Callable[[np.ndarray, np.ndarray], float]:
    """Metric on (y, score) where score is P(y=1) for binary tasks and the predicted class otherwise."""
    if task.kind == "binary":
        if name == "roc_auc":
            return lambda y, s: roc_auc_score(y, s)
        if name == "pr_auc":
            return lambda y, s: average_precision_score(y, s)
        return lambda y, s: binary_metrics(y, s)[name]
    return lambda y, s: multiclass_metrics(y, s)[name]


def bootstrap_ci(y, score, fn, n: int = 1000, seed: int = RANDOM_STATE) -> tuple[float, float]:
    rng = np.random.default_rng(seed)
    y, score = np.asarray(y), np.asarray(score)
    values = []
    for _ in range(n):
        idx = rng.integers(0, len(y), len(y))
        if len(np.unique(y[idx])) < 2:
            continue
        values.append(fn(y[idx], score[idx]))
    return float(np.percentile(values, 2.5)), float(np.percentile(values, 97.5))


def paired_bootstrap(y, score_a, score_b, fn, n: int = 1000, seed: int = RANDOM_STATE) -> dict:
    """Bootstrap distribution of fn(a) - fn(b) on identical resamples of the same test set."""
    rng = np.random.default_rng(seed)
    y, a, b = np.asarray(y), np.asarray(score_a), np.asarray(score_b)
    diffs = []
    for _ in range(n):
        idx = rng.integers(0, len(y), len(y))
        if len(np.unique(y[idx])) < 2:
            continue
        diffs.append(fn(y[idx], a[idx]) - fn(y[idx], b[idx]))
    diffs = np.asarray(diffs)
    p_two_sided = float(min(1.0, 2 * min((diffs <= 0).mean(), (diffs >= 0).mean())))
    return {
        "observed_diff": float(fn(y, a) - fn(y, b)),
        "ci95": [float(np.percentile(diffs, 2.5)), float(np.percentile(diffs, 97.5))],
        "bootstrap_p_two_sided": p_two_sided,
        "n_resamples": int(len(diffs)),
    }


# -------------------------------------------------------------------------------------------- output
def environment() -> dict:
    import sklearn
    import xgboost

    return {
        "python": platform.python_version(),
        "platform": platform.platform(),
        "numpy": np.__version__,
        "pandas": pd.__version__,
        "scikit_learn": sklearn.__version__,
        "xgboost": xgboost.__version__,
    }


def _json_default(value):
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        return None if np.isnan(value) else float(value)
    if isinstance(value, np.ndarray):
        return value.tolist()
    if isinstance(value, Path):
        return str(value.relative_to(ROOT)) if value.is_relative_to(ROOT) else str(value)
    raise TypeError(type(value))


def _round(obj, digits: int = 4):
    if isinstance(obj, float):
        return None if np.isnan(obj) else round(obj, digits)
    if isinstance(obj, dict):
        return {k: _round(v, digits) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_round(v, digits) for v in obj]
    return obj


def write_result(name: str, payload: dict, df: pd.DataFrame | None = None) -> Path:
    RESULTS.mkdir(parents=True, exist_ok=True)
    meta = {"experiment": name, "environment": environment(), "random_state": RANDOM_STATE}
    if df is not None:
        meta["dataset"] = {"rows": int(len(df)), "fingerprint_sha256": dataset_fingerprint(df)}
    path = RESULTS / f"{name}.json"
    path.write_text(json.dumps(_round({"meta": meta, **payload}), indent=2, default=_json_default) + "\n", encoding="utf-8")
    print(f"wrote {path.relative_to(ROOT)}")
    return path
