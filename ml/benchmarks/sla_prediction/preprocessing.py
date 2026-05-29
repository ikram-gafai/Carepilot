from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Iterable

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sqlalchemy import create_engine


FEATURE_COLUMNS = [
    "title",
    "description",
    "perimeter",
    "priority",
    "escalation_required",
    "transfer_required",
    "recommended_action",
    "ticket_age_minutes",
    "resolution_time_minutes",
    "queue_load",
    "store_size",
    "incident_category",
    "environment_type",
    "operational_complexity",
]

TARGET_COLUMN = "sla_breached"

TEXT_COLUMN = "ticket_text"
CAT_COLUMNS = [
    "perimeter",
    "priority",
    "recommended_action",
    "store_size",
    "incident_category",
    "environment_type",
]
NUM_COLUMNS = [
    "escalation_required",
    "transfer_required",
    "ticket_age_minutes",
    "resolution_time_minutes",
    "queue_load",
    "operational_complexity",
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


def load_sla_dataset(database_url: str) -> pd.DataFrame:
    query = """
      SELECT
        ticket_id,
        title,
        description,
        perimeter,
        priority,
        escalation_required,
        transfer_required,
        recommended_action,
        ticket_age_minutes,
        resolution_time_minutes,
        queue_load,
        store_size,
        incident_category,
        environment_type,
        operational_complexity,
        sla_breached
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
    out["recommended_action"] = out["recommended_action"].fillna("unknown").map(lambda x: clean_text(x) or "unknown")
    out["store_size"] = out["store_size"].fillna("unknown").map(lambda x: clean_text(x) or "unknown")
    out["incident_category"] = out["incident_category"].fillna("unknown").map(lambda x: clean_text(x) or "unknown")
    out["environment_type"] = out["environment_type"].fillna("unknown").map(lambda x: clean_text(x) or "unknown")
    out["escalation_required"] = out["escalation_required"].astype(int)
    out["transfer_required"] = out["transfer_required"].astype(int)
    out["ticket_age_minutes"] = pd.to_numeric(out["ticket_age_minutes"], errors="coerce")
    out["resolution_time_minutes"] = pd.to_numeric(out["resolution_time_minutes"], errors="coerce")
    out["queue_load"] = pd.to_numeric(out["queue_load"], errors="coerce")
    out["operational_complexity"] = pd.to_numeric(out["operational_complexity"], errors="coerce")
    out["resolution_time_missing"] = out["resolution_time_minutes"].isna().astype(int)
    out[TARGET_COLUMN] = out[TARGET_COLUMN].astype(int)
    return out


def build_preprocessor(max_text_features: int = 3500) -> ColumnTransformer:
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


def ensure_columns(df: pd.DataFrame, columns: Iterable[str]) -> None:
    missing = [column for column in columns if column not in df.columns]
    if missing:
        raise ValueError(f"Dataset missing required columns: {', '.join(missing)}")
