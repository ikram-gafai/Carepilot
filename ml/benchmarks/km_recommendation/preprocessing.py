from __future__ import annotations

import os
import re
from pathlib import Path

import pandas as pd
from sqlalchemy import create_engine, text

STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in", "is", "it",
    "of", "on", "or", "that", "the", "to", "was", "with", "this", "ticket", "store",
}

SYNONYM_MAP = {
    "pos": "pos checkout terminal point of sale",
    "checkout": "checkout lane register",
    "sco": "sco self checkout self-checkout",
    "pinpad": "pinpad payment terminal card reader",
    "printer": "printer receipt printer",
    "network": "network connectivity lan wan",
    "payment": "payment authorization card transaction",
    "loyalty": "loyalty member customer profile",
    "sync": "sync synchronization replication",
    "vpn": "vpn tunnel remote access",
    "dns": "dns name resolution",
    "timeout": "timeout delay latency",
    "offline": "offline unavailable down",
    "authorization": "authorization validation approval",
    "gateway": "gateway host acquirer",
    "lane": "lane checkout lane pos lane",
    "hardware": "hardware peripheral device",
    "receipt": "receipt printer ticket",
    "inventory": "inventory stock supply",
    "price": "price pricing promotion",
    "server": "server controller infrastructure",
    "database": "database db storage",
    "backup": "backup restore retention",
    "scale": "scale bagging security scale",
    "scanner": "scanner barcode reader",
    "drawer": "drawer cash drawer",
    "coupon": "coupon promotion discount",
    "refund": "refund return reversal",
}


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


def normalize_perimeter(value: str | None) -> str:
    if not value:
        return ""
    text_value = str(value).lower().strip()
    replacements = {
        "back office": "back_office",
        "back-office": "back_office",
        "store infra": "store_infra",
        "store infrastructure": "store_infra",
        "self checkout": "sco",
        "self-checkout": "sco",
    }
    for source, target in replacements.items():
        text_value = text_value.replace(source, target)
    return text_value


def apply_synonyms(text: str) -> str:
    tokens = text.split()
    expanded: list[str] = []
    for token in tokens:
        expanded.append(SYNONYM_MAP.get(token, token))
    return " ".join(expanded)


def normalize_text(value: str | None, *, expand_synonyms: bool = False) -> str:
    if not value:
        return ""
    text_value = str(value).lower()
    text_value = re.sub(r"[^\w\s\-/]", " ", text_value)
    text_value = re.sub(r"\s+", " ", text_value).strip()
    if expand_synonyms:
        text_value = apply_synonyms(text_value)
    tokens = [token for token in text_value.split() if token not in STOPWORDS and len(token) > 1]
    return " ".join(tokens)


def base_incident_category(value: str | None) -> str:
    if not value:
        return ""
    return str(value).split("__ROOT_")[0]


def category_keywords(value: str | None) -> str:
    category = base_incident_category(value)
    if not category:
        return ""
    return category.replace("_", " ").lower()


def build_raw_text(parts: list[str | None]) -> str:
    return " ".join(normalize_text(part) for part in parts if part)


def build_ticket_text(row: pd.Series) -> str:
    return build_raw_text(
        [
            row.get("title"),
            row.get("description"),
            normalize_perimeter(row.get("perimeter")),
            category_keywords(row.get("incident_category")),
            row.get("incident_keywords"),
        ]
    )


def build_ticket_text_semantic(row: pd.Series) -> str:
    category = category_keywords(row.get("incident_category"))
    perimeter = normalize_perimeter(row.get("perimeter"))
    title = str(row.get("title") or "").strip()
    description = str(row.get("description") or "").strip()
    keywords = str(row.get("incident_keywords") or category).strip()
    action = str(row.get("recommended_action") or "").strip().lower()
    action_hint = ""
    if action == "apply_km":
        action_hint = "The agent should apply a documented recovery procedure."
    elif action == "monitor":
        action_hint = "The ticket may require monitoring before selecting a recovery procedure."
    parts = [
        f"Title: {title}." if title else "",
        f"Description: {description}." if description else "",
        f"Perimeter: {perimeter}." if perimeter else "",
        f"Incident category: {category}." if category else "",
        f"Operational keywords: {keywords}." if keywords else "",
        action_hint,
    ]
    text = " ".join(part for part in parts if part)
    return apply_synonyms(re.sub(r"\s+", " ", text.lower()).strip())


def build_km_text_semantic(row: pd.Series) -> str:
    title = str(row.get("title") or "").strip()
    steps = str(row.get("procedure_steps") or "").strip()
    keywords = str(row.get("keywords") or "").strip()
    perimeter = normalize_perimeter(row.get("perimeter"))
    category = str(row.get("incident_category") or "").replace("_", " ").lower()
    focus = "service recovery and restoration" if "recovery" in title.lower() else "operational diagnostic guidance"
    parts = [
        f"Procedure title: {title}." if title else "",
        f"Focus: {focus}.",
        f"Procedure steps: {steps}." if steps else "",
        f"Perimeter: {perimeter}." if perimeter else "",
        f"Incident category: {category}." if category else "",
        f"Keywords: {keywords}." if keywords else "",
    ]
    text = " ".join(part for part in parts if part)
    return apply_synonyms(re.sub(r"\s+", " ", text.lower()).strip())


def build_km_text(row: pd.Series) -> str:
    return build_raw_text(
        [
            row.get("title"),
            row.get("procedure_steps"),
            row.get("keywords"),
            normalize_perimeter(row.get("perimeter")),
            str(row.get("incident_category") or "").replace("_", " ").lower(),
        ]
    )


def parse_relevant_ids(raw) -> list[str]:
    if raw is None:
        return []
    if isinstance(raw, list):
        return [str(item) for item in raw if item]
    if isinstance(raw, str):
        cleaned = raw.strip()
        if cleaned.startswith("[") and cleaned.endswith("]"):
            cleaned = cleaned[1:-1]
        return [part.strip().strip('"').strip("'") for part in cleaned.split(",") if part.strip()]
    return []


def load_km_dataset(database_url: str) -> tuple[pd.DataFrame, pd.DataFrame]:
    engine = create_engine(database_url)
    tickets = pd.read_sql(
        text(
            """
            SELECT
              ticket_id,
              title,
              description,
              perimeter,
              incident_category,
              recommended_action,
              split,
              expected_km_id,
              relevant_km_ids
            FROM ml_training.historical_tickets
            WHERE split = 'test'
            """
        ),
        engine,
    )
    km = pd.read_sql(
        text(
            """
            SELECT
              km_code AS km_id,
              title,
              procedure_steps,
              perimeter,
              incident_category,
              keywords,
              difficulty_level,
              applicability_score
            FROM ml_training.km_articles
            ORDER BY km_id
            """
        ),
        engine,
    )
    engine.dispose()
    return tickets, km


def derive_incident_keywords(row: pd.Series) -> str:
    category = category_keywords(row.get("incident_category"))
    title = normalize_text(row.get("title"))
    description = normalize_text(row.get("description"))
    merged = " ".join(part for part in [category, title, description] if part)
    tokens = merged.split()
    deduped: list[str] = []
    for token in tokens:
        if token not in deduped:
            deduped.append(token)
    return " ".join(deduped[:12])


def prepare_frames(tickets: pd.DataFrame, km: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    tickets = tickets.copy()
    km = km.copy()
    km["km_id"] = km["km_id"].astype(str)
    km["incident_category"] = km["incident_category"].apply(base_incident_category)
    tickets["incident_keywords"] = tickets.apply(derive_incident_keywords, axis=1)
    tickets["ticket_text"] = tickets.apply(build_ticket_text, axis=1)
    tickets["ticket_text_semantic"] = tickets.apply(build_ticket_text_semantic, axis=1)
    km["km_text"] = km.apply(build_km_text, axis=1)
    km["km_text_semantic"] = km.apply(build_km_text_semantic, axis=1)
    tickets["ground_truth_ids"] = tickets.apply(
        lambda row: list(
            dict.fromkeys(
                ([str(row["expected_km_id"])] if pd.notna(row.get("expected_km_id")) and row.get("expected_km_id") else [])
                + [item for item in parse_relevant_ids(row.get("relevant_km_ids")) if item]
            )
        )[:3],
        axis=1,
    )
    tickets = tickets[tickets["ground_truth_ids"].map(len) > 0].reset_index(drop=True)
    return tickets, km
