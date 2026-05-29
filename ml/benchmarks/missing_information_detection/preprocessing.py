"""Dataset loading, enrichment, and feature engineering for Task 8."""

from __future__ import annotations

import json
import os
import re
from pathlib import Path

import numpy as np
import pandas as pd
from sqlalchemy import create_engine, text

from labels import (
    CANONICAL_LABELS,
    completeness_score_from_labels,
    generate_noisy_multilabel,
    quality_level_from_score,
)

NUMERIC_PATTERN = re.compile(r"\d")
ERROR_CODE_PATTERN = re.compile(r"\bERR[-_]?\w+", re.I)
LANE_PATTERN = re.compile(r"\b(?:lane|register|sco)\s*#?\s*\d+", re.I)
TIMESTAMP_PATTERN = re.compile(r"\b\d{1,2}[:h]\d{2}\b|\d{4}-\d{2}-\d{2}")
PAYMENT_PATTERN = re.compile(r"\b(?:rrn|auth|transaction|card)\b", re.I)


def _read_env_file(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    values: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        raw = line.strip()
        if not raw or raw.startswith("#") or "=" not in raw:
            continue
        key, value = raw.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def load_database_url(project_root: Path, explicit: str | None = None) -> str:
    if explicit:
        return explicit
    env_values = {
        **_read_env_file(project_root / ".env"),
        **_read_env_file(project_root / ".env.local"),
    }
    return (
        os.getenv("DATABASE_URL")
        or os.getenv("POSTGRES_DATABASE_URL")
        or env_values.get("DATABASE_URL")
        or env_values.get("POSTGRES_DATABASE_URL")
        or "postgresql://carepilot:carepilot@localhost:5433/carepilot"
    )


def ensure_schema(project_root: Path, database_url: str) -> None:
    patch = project_root / "sql" / "patches" / "020_ml_training_missing_information_labels.sql"
    if not patch.exists():
        return
    try:
        engine = create_engine(database_url, connect_args={"connect_timeout": 5})
        with engine.begin() as conn:
            conn.execute(text(patch.read_text(encoding="utf-8")))
    except Exception:
        pass


def generate_synthetic_historical_tickets(size: int = 14000, seed: int = 42) -> pd.DataFrame:
    """Offline fallback mirroring ml_training.historical_tickets when Postgres is unavailable."""
    rng = np.random.default_rng(seed)
    perimeters = ["CHECKOUT", "PAYMENT", "NETWORK", "SCO", "BACK_OFFICE", "MONETIQUE"]
    priorities = ["P1", "P2", "P3", "P4"]
    categories = ["CHECKOUT", "PAYMENT", "SCO", "NETWORK", "POS", "GENERAL"]
    sources = ["CARE_PORTAL", "EMAIL", "PHONE", "MONITORING"]
    envs = ["PRODUCTION", "STORE", "HYPER", "MARKET"]
    stores = [f"FR-{1000 + i}" for i in range(120)]

    complete_templates = [
        ("SCO lane {lane} payment timeout", "Store {store} SCO lane {lane} — ERR-AUTH-042 at {time}. Reboot attempted, screenshot attached. Transaction ref RRN-{rrn}."),
        ("Register {lane} sync failure", "Checkout register {lane} at {store} failed sync after card read. Error ERR-SYNC-17 at {time}. VLAN zone B, restart tried."),
        ("TPE terminal {term} declined", "Terminal TPE {term} on lane {lane}, store {store}. Authorization failed ERR-PAY-881 at {time}. EMV contactless, auth code AC-{rrn}."),
    ]
    partial_templates = [
        ("Payment issue lane {lane}", "Card payment not working on lane {lane}. Store {store}. Happens during peak hours."),
        ("SCO problem", "Self checkout broken at store. Customers blocked. Need help urgently."),
        ("Network down", "POS cannot connect since morning. Multiple lanes affected in hyper."),
    ]
    vague_templates = [
        ("checkout not working", "not working please fix"),
        ("payment issue", "broken urgent help"),
        ("system problem", "issue at store asap"),
    ]

    rows: list[dict] = []
    for i in range(size):
        tier_roll = float(rng.random())
        if tier_roll < 0.4:
            tpl = complete_templates[int(rng.integers(0, len(complete_templates)))]
            quality_hint = "complete"
        elif tier_roll < 0.85:
            tpl = partial_templates[int(rng.integers(0, len(partial_templates)))]
            quality_hint = "partial"
        else:
            tpl = vague_templates[int(rng.integers(0, len(vague_templates)))]
            quality_hint = "severe"

        store = stores[int(rng.integers(0, len(stores)))]
        lane = int(rng.integers(1, 32))
        term = int(rng.integers(100, 999))
        rrn = int(rng.integers(100000, 999999))
        time = f"{int(rng.integers(7, 22))}:{int(rng.integers(10, 59)):02d}"
        title = tpl[0].format(store=store, lane=lane, term=term, time=time, rrn=rrn)
        desc = tpl[1].format(store=store, lane=lane, term=term, time=time, rrn=rrn)

        split = "train" if i < int(size * 0.7) else "validation" if i < int(size * 0.85) else "test"
        rows.append(
            {
                "ticket_id": f"ML-CARE-{i + 1:06d}",
                "title": title,
                "description": desc,
                "perimeter": perimeters[int(rng.integers(0, len(perimeters)))],
                "priority": priorities[int(rng.integers(0, len(priorities)))],
                "status": "Open",
                "store_id": store if tier_roll < 0.55 else "",
                "store_name": f"Carrefour Store {store}" if tier_roll < 0.6 else "",
                "incident_category": categories[int(rng.integers(0, len(categories)))],
                "environment_type": envs[int(rng.integers(0, len(envs)))],
                "ticket_source": sources[int(rng.integers(0, len(sources)))],
                "split": split,
                "missing_information_labels": "[]",
                "completeness_hint": quality_hint,
            }
        )
    return pd.DataFrame(rows)


def load_historical_tickets(project_root: Path, database_url: str) -> pd.DataFrame:
    export_path = project_root / "ml" / "exports" / "historical_tickets.csv"
    if export_path.exists():
        return pd.read_csv(export_path).fillna("")

    query = """
      SELECT
        ticket_id,
        title,
        description,
        perimeter,
        priority,
        status,
        store_id,
        store_name,
        incident_category,
        environment_type,
        ticket_source,
        split,
        missing_information_labels
      FROM ml_training.historical_tickets
      ORDER BY ticket_id
    """
    try:
        engine = create_engine(database_url, connect_args={"connect_timeout": 5})
        with engine.connect() as conn:
            df = pd.read_sql_query(query, conn).fillna("")
        if len(df):
            export_path.parent.mkdir(parents=True, exist_ok=True)
            df.to_csv(export_path, index=False)
            return df
    except Exception as exc:
        print(f"DB unavailable ({exc}); using synthetic historical_tickets fallback.", flush=True)

    df = generate_synthetic_historical_tickets()
    export_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(export_path, index=False)
    return df


def enrich_missing_information_labels(
    df: pd.DataFrame, seed: int = 42, force_regenerate: bool = False
) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    out = df.copy()
    labels_col: list[list[str]] = []
    for _, row in out.iterrows():
        existing = row.get("missing_information_labels")
        parsed: list[str] | None = None
        if not force_regenerate:
            if isinstance(existing, str) and existing.strip():
                try:
                    loaded = json.loads(existing)
                    if isinstance(loaded, list) and len(loaded) > 0:
                        parsed = loaded
                except json.JSONDecodeError:
                    parsed = None
            elif isinstance(existing, list) and len(existing) > 0:
                parsed = existing
        labels_col.append(parsed if parsed is not None else generate_noisy_multilabel(row.to_dict(), rng))
    out["missing_information_labels"] = labels_col
    out["completeness_score"] = out["missing_information_labels"].apply(completeness_score_from_labels)
    out["quality_level"] = out["completeness_score"].apply(quality_level_from_score)
    out["missing_count"] = out["missing_information_labels"].apply(len)
    return out


def persist_labels(df: pd.DataFrame, database_url: str, batch_size: int = 1000) -> None:
    try:
        engine = create_engine(database_url, connect_args={"connect_timeout": 5})
    except Exception as exc:
        print(f"Skipping label persistence — DB unavailable: {exc}", flush=True)
        return
    params = [
        {
            "labels": json.dumps(row["missing_information_labels"]),
            "ticket_id": row["ticket_id"],
        }
        for _, row in df.iterrows()
    ]
    stmt = text(
        """
        UPDATE ml_training.historical_tickets
        SET missing_information_labels = CAST(:labels AS jsonb)
        WHERE ticket_id = :ticket_id
        """
    )
    with engine.begin() as conn:
        for i in range(0, len(params), batch_size):
            conn.execute(stmt, params[i : i + batch_size])


def build_ticket_text(row: pd.Series) -> str:
    return " ".join(
        str(row.get(col) or "")
        for col in ("title", "description", "perimeter", "priority", "incident_category", "ticket_source", "environment_type")
    ).lower()


def handcrafted_features(df: pd.DataFrame) -> pd.DataFrame:
    text = df.apply(build_ticket_text, axis=1)
    title = df["title"].astype(str)
    desc = df["description"].astype(str)
    return pd.DataFrame(
        {
            "title_len": title.str.len(),
            "desc_len": desc.str.len(),
            "word_count": text.str.split().str.len(),
            "has_numeric": text.str.contains(NUMERIC_PATTERN, regex=True).astype(int),
            "has_error_code": text.str.contains(ERROR_CODE_PATTERN, regex=True).astype(int),
            "has_lane_pattern": text.str.contains(LANE_PATTERN, regex=True).astype(int),
            "has_timestamp_pattern": text.str.contains(TIMESTAMP_PATTERN, regex=True).astype(int),
            "has_payment_pattern": text.str.contains(PAYMENT_PATTERN, regex=True).astype(int),
        },
        index=df.index,
    )


def split_frames(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    if "split" in df.columns and df["split"].isin(["train", "validation", "test"]).any():
        train = df[df["split"] == "train"].copy()
        val = df[df["split"] == "validation"].copy()
        test = df[df["split"] == "test"].copy()
        if len(train) and len(val) and len(test):
            return train, val, test

    train, temp = _stratified_split(df, 0.7)
    val, test = _stratified_split(temp, 0.5)
    return train, val, test


def _stratified_split(df: pd.DataFrame, frac: float) -> tuple[pd.DataFrame, pd.DataFrame]:
    parts_a: list[pd.DataFrame] = []
    parts_b: list[pd.DataFrame] = []
    for level in sorted(df["quality_level"].unique()):
        chunk = df[df["quality_level"] == level]
        n = max(1, int(round(len(chunk) * frac)))
        parts_a.append(chunk.iloc[:n])
        parts_b.append(chunk.iloc[n:])
    return pd.concat(parts_a), pd.concat(parts_b)


def label_frequency(df: pd.DataFrame) -> dict[str, int]:
    counts = {label: 0 for label in CANONICAL_LABELS}
    for labels in df["missing_information_labels"]:
        for label in labels:
            counts[label] = counts.get(label, 0) + 1
    return counts


def dataset_distribution_stats(df: pd.DataFrame) -> dict:
    complete = float((df["quality_level"] == "COMPLETE").mean())
    partial = float(df["quality_level"].isin(["ADEQUATE", "INCOMPLETE"]).mean())
    severe = float((df["quality_level"] == "POOR").mean())
    return {
        "ticket_count": len(df),
        "complete_rate": round(complete, 3),
        "partial_rate": round(partial, 3),
        "severe_rate": round(severe, 3),
        "avg_completeness": round(float(df["completeness_score"].mean()), 3),
        "avg_missing_count": round(float(df["missing_count"].mean()), 2),
    }


def tune_rule_threshold(val_df: pd.DataFrame, y_val: np.ndarray) -> float:
    from labels import CANONICAL_LABELS, labels_to_matrix, rule_based_predict
    from sklearn.metrics import f1_score

    best_threshold = 0.52
    best_f1 = -1.0
    for threshold in np.arange(0.46, 0.66, 0.02):
        pred = labels_to_matrix(
            [rule_based_predict(row.to_dict(), threshold=float(threshold)) for _, row in val_df.iterrows()],
            CANONICAL_LABELS,
        )
        score = f1_score(y_val, pred, average="micro", zero_division=0)
        if score > best_f1:
            best_f1 = score
            best_threshold = float(threshold)
    return best_threshold
