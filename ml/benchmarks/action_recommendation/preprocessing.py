from __future__ import annotations

import os
import re
from pathlib import Path

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder, OneHotEncoder, StandardScaler
from sqlalchemy import create_engine


ACTION_CLASSES = [
    "RESOLVE_LOCALLY",
    "APPLY_KM",
    "ESCALATE_N3",
    "TRANSFER_PERIMETER",
    "REQUEST_INFORMATION",
    "MONITOR",
]

FEATURE_COLUMNS = [
    "title",
    "description",
    "perimeter",
    "priority",
    "sla_breached",
    "escalation_required",
    "transfer_required",
    "resolution_time_minutes",
    "incident_category",
    "ticket_source",
    "environment_type",
    "description_missing",
    "resolution_time_missing",
]

TARGET_COLUMN = "recommended_action"
TEXT_COLUMN = "ticket_text"
CAT_COLUMNS = ["perimeter", "priority", "incident_category", "ticket_source", "environment_type"]
NUM_COLUMNS = [
    "sla_breached",
    "escalation_required",
    "transfer_required",
    "resolution_time_minutes",
    "description_missing",
    "resolution_time_missing",
]


def _read_env_file(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    values: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        raw = line.strip()
        if not raw or raw.startswith("#") or "=" not in raw:
            continue
        key, value = raw.split("=", 1)
        value = value.strip().strip('"').strip("'")
        values[key.strip()] = value
    return values


def load_database_url(project_root: Path) -> str:
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


def load_action_dataset(database_url: str) -> pd.DataFrame:
    query = """
      SELECT
        ticket_id,
        title,
        description,
        perimeter,
        priority,
        sla_breached,
        escalation_required,
        transfer_required,
        resolution_time_minutes,
        incident_category,
        ticket_source,
        environment_type,
        recommended_action
      FROM ml_training.historical_tickets
      ORDER BY ticket_id
    """
    engine = create_engine(database_url)
    with engine.connect() as conn:
        return pd.read_sql_query(query, conn)


def load_ml_training_table_counts(database_url: str) -> dict[str, int]:
    query = """
      SELECT
        (SELECT COUNT(*) FROM ml_training.historical_tickets) AS historical_tickets,
        (SELECT COUNT(*) FROM ml_training.historical_actions) AS historical_actions,
        (SELECT COUNT(*) FROM ml_training.historical_resolutions) AS historical_resolutions,
        (SELECT COUNT(*) FROM ml_training.km_articles) AS km_articles,
        (SELECT COUNT(*) FROM ml_training.dataset_exports) AS dataset_exports
    """
    engine = create_engine(database_url)
    with engine.connect() as conn:
        row = pd.read_sql_query(query, conn).iloc[0].to_dict()
    return {key: int(value) for key, value in row.items()}


def clean_text(value: object) -> str:
    text = "" if value is None else str(value)
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def normalize_perimeter(value: object) -> str:
    text = clean_text(value)
    if "sco" in text or "self" in text:
        return "sco"
    if "payment" in text or "monetique" in text:
        return "payment"
    if "loyal" in text or "fidel" in text:
        return "loyalty"
    if "network" in text or "lan" in text or "wan" in text:
        return "network"
    if "hardware" in text or "periph" in text:
        return "hardware"
    if "back" in text or text == "bo sync":
        return "back_office"
    if "infra" in text or "server" in text:
        return "store_infrastructure"
    if "checkout" in text or "vlp" in text or text == "fo":
        return "checkout"
    return text or "unknown"


def prepare_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out["title"] = out["title"].fillna("")
    out["description"] = out["description"].fillna("")
    out["description_missing"] = (out["description"].str.strip() == "").astype(int)
    out[TEXT_COLUMN] = (out["title"] + " " + out["description"]).map(clean_text)
    out["perimeter"] = out["perimeter"].map(normalize_perimeter)
    out["priority"] = out["priority"].fillna("unknown").map(lambda x: clean_text(x) or "unknown")
    out["incident_category"] = out["incident_category"].fillna("unknown").map(lambda x: clean_text(x) or "unknown")
    out["ticket_source"] = out["ticket_source"].fillna("unknown").map(lambda x: clean_text(x) or "unknown")
    out["environment_type"] = out["environment_type"].fillna("unknown").map(lambda x: clean_text(x) or "unknown")
    out["sla_breached"] = out["sla_breached"].astype(int)
    out["escalation_required"] = out["escalation_required"].astype(int)
    out["transfer_required"] = out["transfer_required"].astype(int)
    out["resolution_time_minutes"] = pd.to_numeric(out["resolution_time_minutes"], errors="coerce")
    out["resolution_time_missing"] = out["resolution_time_minutes"].isna().astype(int)
    out[TARGET_COLUMN] = out[TARGET_COLUMN].astype(str)
    return out


def build_label_encoder(y: pd.Series) -> LabelEncoder:
    encoder = LabelEncoder()
    encoder.fit(ACTION_CLASSES)
    known = set(y.unique())
    missing = sorted(known - set(ACTION_CLASSES))
    if missing:
        raise ValueError(f"Unexpected action classes in dataset: {missing}")
    return encoder


def encode_labels(y: pd.Series, encoder: LabelEncoder) -> pd.Series:
    return pd.Series(encoder.transform(y), index=y.index)


def build_preprocessor(max_text_features: int = 2800) -> ColumnTransformer:
    text_pipeline = Pipeline(
        steps=[
            (
                "tfidf",
                TfidfVectorizer(
                    lowercase=False,
                    preprocessor=None,
                    tokenizer=None,
                    stop_words="english",
                    ngram_range=(1, 2),
                    min_df=3,
                    max_df=0.92,
                    max_features=max_text_features,
                ),
            ),
        ],
    )
    categorical_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore")),
        ],
    )
    numeric_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler(with_mean=False)),
        ],
    )
    return ColumnTransformer(
        transformers=[
            ("text", text_pipeline, TEXT_COLUMN),
            ("cat", categorical_pipeline, CAT_COLUMNS),
            ("num", numeric_pipeline, NUM_COLUMNS),
        ],
        sparse_threshold=0.3,
    )


def feature_matrix(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    return df[[TEXT_COLUMN, *CAT_COLUMNS, *NUM_COLUMNS]], df[TARGET_COLUMN]
