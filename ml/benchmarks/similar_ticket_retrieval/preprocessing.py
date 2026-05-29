from __future__ import annotations

import os
import re
import sys
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
    "self": "self checkout",
    "pinpad": "pinpad payment terminal card reader",
    "printer": "printer receipt printer fiscal",
    "network": "network connectivity lan wan",
    "payment": "payment authorization card transaction",
    "auth": "payment authorization",
    "loyalty": "loyalty member customer profile",
    "sync": "sync synchronization replication",
    "vpn": "vpn tunnel remote access",
    "dns": "dns name resolution",
    "timeout": "timeout delay latency",
    "offline": "offline unavailable down disconnected",
    "authorization": "authorization validation approval",
    "gateway": "gateway host acquirer",
    "lane": "lane checkout lane pos lane",
    "hardware": "hardware peripheral device",
    "receipt": "receipt printer ticket",
    "fiscal": "fiscal printer receipt",
    "backup": "backup restore retention",
    "scale": "scale bagging security scale",
    "scanner": "scanner barcode reader",
    "terminal": "terminal checkout terminal pos terminal",
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
    env_values = {**_read_env_file(project_root / ".env"), **_read_env_file(project_root / ".env.local")}
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
    for source, target in {
        "back office": "back_office",
        "self checkout": "sco",
        "store infra": "store_infra",
    }.items():
        text_value = text_value.replace(source, target)
    return text_value


def apply_synonyms(text: str) -> str:
    return " ".join(SYNONYM_MAP.get(token, token) for token in text.split())


def normalize_text(value: str | None) -> str:
    if not value:
        return ""
    text_value = re.sub(r"[^\w\s\-/]", " ", str(value).lower())
    text_value = re.sub(r"\s+", " ", text_value).strip()
    tokens = [token for token in text_value.split() if token not in STOPWORDS and len(token) > 1]
    return " ".join(tokens)


def base_incident_category(value: str | None) -> str:
    if not value:
        return ""
    return str(value).split("__ROOT_")[0]


def category_keywords(value: str | None) -> str:
    category = base_incident_category(value)
    return category.replace("_", " ").lower() if category else ""


def derive_incident_keywords(row: pd.Series) -> str:
    merged = " ".join(
        part
        for part in [
            category_keywords(row.get("incident_category")),
            normalize_text(row.get("title")),
            normalize_text(row.get("description")),
            normalize_text(row.get("resolution_summary")),
        ]
        if part
    )
    deduped: list[str] = []
    for token in merged.split():
        if token not in deduped:
            deduped.append(token)
    return " ".join(deduped[:14])


def build_retrieval_text(row: pd.Series, *, expand_synonyms: bool = False) -> str:
    """Natural ticket fields only — no label/metadata columns."""
    parts = [
        normalize_text(row.get("title")),
        normalize_text(row.get("description")),
        normalize_perimeter(row.get("perimeter")),
        category_keywords(row.get("incident_category")),
        normalize_text(row.get("resolution_summary")),
    ]
    text = " ".join(part for part in parts if part)
    text = re.sub(r"\s+", " ", text).strip()
    return apply_synonyms(text) if expand_synonyms else text


def build_ticket_text(row: pd.Series) -> str:
    return build_retrieval_text(row, expand_synonyms=False)


def build_ticket_text_semantic(row: pd.Series) -> str:
    return build_retrieval_text(row, expand_synonyms=True)


def assert_no_label_leakage(all_tickets: pd.DataFrame) -> None:
    """Fail fast if group ids or synthetic label tokens appear in retrieval text."""
    text_series = all_tickets["ticket_text"].astype(str).str.lower()
    group_ids = all_tickets["similar_case_group_id"].dropna().astype(str)
    group_leaks = sum(1 for idx, group_id in group_ids.items() if group_id.lower() in text_series.loc[idx])
    if group_leaks > 0:
        raise ValueError(
            f"Label leakage detected: similar_case_group_id appears in ticket_text for {group_leaks} tickets."
        )
    if text_series.str.contains("operational scenario", regex=False).any():
        raise ValueError("Label leakage detected: synthetic scenario tokens appear in ticket_text.")
    if text_series.str.contains("_group_", regex=False).any():
        raise ValueError("Label leakage detected: group id patterns appear in ticket_text.")


def load_all_tickets(database_url: str) -> pd.DataFrame:
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
              resolution_summary,
              expected_km_id,
              similar_case_group_id,
              incident_cluster,
              semantic_group,
              incident_family,
              root_cause_family,
              resolution_pattern,
              split
            FROM ml_training.historical_tickets
            WHERE similar_case_group_id IS NOT NULL
            """
        ),
        engine,
    )
    engine.dispose()
    return tickets


def build_ground_truth_index(all_tickets: pd.DataFrame) -> dict[str, list[str]]:
    group_index: dict[str, list[str]] = {}
    for group_id, frame in all_tickets.groupby("similar_case_group_id"):
        group_index[str(group_id)] = frame["ticket_id"].astype(str).tolist()
    return group_index


def ground_truth_for_ticket(ticket_id: str, group_id: str, group_index: dict[str, list[str]]) -> list[str]:
    peers = [item for item in group_index.get(str(group_id), []) if item != str(ticket_id)]
    return peers


def validate_similar_ticket_dataset(
    all_tickets: pd.DataFrame,
    queries: pd.DataFrame,
    *,
    min_relevant_peers: int = 3,
) -> dict[str, float | int]:
    labeled = all_tickets[all_tickets["similar_case_group_id"].notna()].copy()
    group_sizes = labeled.groupby("similar_case_group_id").size()
    relevant_counts = queries["ground_truth_ids"].map(len)
    insufficient = int((relevant_counts < min_relevant_peers).sum())

    stats: dict[str, float | int] = {
        "tickets_with_group_id": int(len(labeled)),
        "unique_groups": int(group_sizes.size),
        "min_group_size": int(group_sizes.min()) if not group_sizes.empty else 0,
        "max_group_size": int(group_sizes.max()) if not group_sizes.empty else 0,
        "avg_group_size": float(group_sizes.mean()) if not group_sizes.empty else 0.0,
        "query_count": int(len(queries)),
        "queries_with_min_relevant_peers": int((relevant_counts >= min_relevant_peers).sum()),
        "queries_below_min_relevant_peers": insufficient,
    }

    print("Similar Ticket Retrieval dataset validation")
    print(f"  tickets with similar_case_group_id: {stats['tickets_with_group_id']}")
    print(f"  unique similar_case_group_id values: {stats['unique_groups']}")
    print(f"  group size min / avg / max: {stats['min_group_size']} / {stats['avg_group_size']:.1f} / {stats['max_group_size']}")
    print(f"  query tickets: {stats['query_count']}")
    print(f"  queries with >={min_relevant_peers} relevant peers: {stats['queries_with_min_relevant_peers']}")
    print(f"  queries below {min_relevant_peers} relevant peers: {stats['queries_below_min_relevant_peers']}")

    if stats["min_group_size"] < 8:
        print(
            f"WARNING: smallest group has {stats['min_group_size']} tickets (target minimum is 8).",
            file=sys.stderr,
        )
    if insufficient > 0:
        raise ValueError(
            f"{insufficient} query tickets have fewer than {min_relevant_peers} relevant peers. "
            "Fix dataset grouping before running the benchmark."
        )
    if stats["query_count"] == 0:
        raise ValueError("No evaluable query tickets found. Fix dataset splits and grouping first.")

    return stats


def prepare_frames(all_tickets: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    all_tickets = all_tickets.copy()
    all_tickets["perimeter_normalized"] = all_tickets["perimeter"].map(normalize_perimeter)
    all_tickets["incident_keywords"] = all_tickets.apply(derive_incident_keywords, axis=1)
    all_tickets["ticket_text"] = all_tickets.apply(build_ticket_text, axis=1)
    all_tickets["ticket_text_semantic"] = all_tickets.apply(build_ticket_text_semantic, axis=1)
    assert_no_label_leakage(all_tickets)

    group_index = build_ground_truth_index(all_tickets)
    queries = all_tickets[all_tickets["split"] == "test"].reset_index(drop=True)
    queries["ground_truth_ids"] = queries.apply(
        lambda row: ground_truth_for_ticket(
            str(row["ticket_id"]),
            str(row["similar_case_group_id"]),
            group_index,
        ),
        axis=1,
    )
    queries = queries[queries["ground_truth_ids"].map(len) >= 3].reset_index(drop=True)

    corpus = all_tickets.reset_index(drop=True)
    return queries, corpus
