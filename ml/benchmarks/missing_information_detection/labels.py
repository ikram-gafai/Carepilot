"""Canonical multilabel targets and noisy ground-truth generation for Task 8."""

from __future__ import annotations

import re
from typing import Any

import numpy as np

CANONICAL_LABELS = [
    "MISSING_STORE_IDENTIFIER",
    "MISSING_LANE_NUMBER",
    "MISSING_TERMINAL_ID",
    "MISSING_ERROR_MESSAGE",
    "MISSING_SCREENSHOT_REFERENCE",
    "MISSING_TIMESTAMP",
    "MISSING_TROUBLESHOOTING_STEPS",
    "MISSING_PAYMENT_REFERENCE",
    "MISSING_ENVIRONMENT_DETAILS",
    "VAGUE_DESCRIPTION",
    "GENERIC_TITLE",
    "MISSING_REPRODUCTION_STEPS",
]

# Legacy snake_case keys used in cp_agent production rows
LEGACY_LABEL_MAP = {
    "MISSING_STORE_IDENTIFIER": "store_code",
    "MISSING_LANE_NUMBER": "lane_number",
    "MISSING_TERMINAL_ID": "terminal_id",
    "MISSING_ERROR_MESSAGE": "error_message",
    "MISSING_SCREENSHOT_REFERENCE": "screenshot_reference",
    "MISSING_TIMESTAMP": "timestamp",
    "MISSING_TROUBLESHOOTING_STEPS": "troubleshooting_steps",
    "MISSING_PAYMENT_REFERENCE": "payment_reference",
    "MISSING_ENVIRONMENT_DETAILS": "environment_details",
    "VAGUE_DESCRIPTION": "vague_description",
    "GENERIC_TITLE": "generic_title",
    "MISSING_REPRODUCTION_STEPS": "reproduction_steps",
}

STORE_CODE_RE = re.compile(r"\bFR-[A-Z0-9]{3,}(?:-[A-Z0-9]+)?\b", re.I)
LANE_RE = re.compile(r"\b(?:lane|register|checkout|caisse)\s*[#:]?\s*\d{1,3}\b", re.I)
SCO_RE = re.compile(r"\bSCO\s*[#:]?\s*\d{1,3}\b", re.I)
TERMINAL_RE = re.compile(r"\b(?:terminal|tpe|pos|pin\s*pad|pinpad)\b", re.I)
ERROR_RE = re.compile(
    r"\b(?:ERR[-_]?\w+|error\s*(?:code|message)?|timeout|authorization failed|sync failure)\b", re.I
)
SCREENSHOT_RE = re.compile(r"\b(?:screenshot|capture|attached|photo|png|jpg)\b", re.I)
TIMESTAMP_RE = re.compile(r"\b(?:\d{1,2}[:h]\d{2}|yesterday|today|\d{4}-\d{2}-\d{2})\b", re.I)
TROUBLESHOOT_RE = re.compile(r"\b(?:reboot|restart|tried|attempted|cleared|reset|already)\b", re.I)
PAYMENT_RE = re.compile(r"\b(?:transaction|auth|rrn|card|wallet|emv|payment ref)\b", re.I)
ENV_RE = re.compile(r"\b(?:store|vlan|zone|network|perimeter|hyper|market)\b", re.I)
REPRO_RE = re.compile(r"\b(?:after|when|during|occurs when|intermittent|every time)\b", re.I)

VAGUE_PHRASES = ("not working", "broken", "issue", "problem", "help", "urgent", "please fix")


def _word_count(text: str) -> int:
    return len([w for w in text.split() if w.strip()])


def combined_text(row: dict[str, Any]) -> str:
    return f"{row.get('title', '')} {row.get('description', '')}".strip()


def missing_probability_signals(row: dict[str, Any]) -> dict[str, float]:
    """Probability each canonical label applies (ticket is missing that information)."""
    text = combined_text(row)
    desc = str(row.get("description") or "")
    title = str(row.get("title") or "")
    category = str(row.get("incident_category") or row.get("category") or "").upper()
    store_id = str(row.get("store_id") or row.get("storeId") or "").strip()

    def absent(pattern: re.Pattern[str]) -> float:
        return 0.82 if not pattern.search(text) else 0.12

    signals = {
        "MISSING_STORE_IDENTIFIER": 0.15 if store_id or STORE_CODE_RE.search(text) else 0.78,
        "MISSING_LANE_NUMBER": absent(LANE_RE) if not SCO_RE.search(text) else 0.18,
        "MISSING_TERMINAL_ID": absent(TERMINAL_RE),
        "MISSING_ERROR_MESSAGE": absent(ERROR_RE),
        "MISSING_SCREENSHOT_REFERENCE": absent(SCREENSHOT_RE),
        "MISSING_TIMESTAMP": absent(TIMESTAMP_RE),
        "MISSING_TROUBLESHOOTING_STEPS": absent(TROUBLESHOOT_RE),
        "MISSING_PAYMENT_REFERENCE": (
            absent(PAYMENT_RE) if "PAYMENT" in category else 0.22
        ),
        "MISSING_ENVIRONMENT_DETAILS": 0.74 if not ENV_RE.search(text) else 0.28,
        "VAGUE_DESCRIPTION": (
            0.86
            if len(desc.strip()) < 55 or _word_count(desc) < 9
            else 0.35
            if any(p in desc.lower() for p in VAGUE_PHRASES)
            else 0.18
        ),
        "GENERIC_TITLE": 0.84 if len(title.strip()) < 14 or _word_count(title) <= 3 else 0.2,
        "MISSING_REPRODUCTION_STEPS": (
            0.8 if not (REPRO_RE.search(text) and _word_count(text) >= 14) else 0.22
        ),
    }
    return signals


def infer_completeness_tier(row: dict[str, Any], rng: np.random.Generator) -> str:
    """Content-informed tier with stochastic ambiguity (not deterministic)."""
    signals = missing_probability_signals(row)
    avg_prob = float(np.mean(list(signals.values())))
    high_missing = sum(1 for p in signals.values() if p >= 0.65)
    roll = float(rng.random())

    if avg_prob < 0.38 and high_missing <= 2:
        if roll < 0.72:
            return "complete"
        return "partial" if roll < 0.9 else "severe"
    if avg_prob < 0.58 or high_missing <= 5:
        if roll < 0.12:
            return "complete"
        if roll < 0.82:
            return "partial"
        return "severe"
    if roll < 0.08:
        return "partial"
    return "severe"


def target_label_count(tier: str, rng: np.random.Generator) -> int:
    if tier == "complete":
        return 0 if rng.random() < 0.78 else 1
    if tier == "partial":
        return int(rng.choice([1, 2, 3], p=[0.35, 0.45, 0.20]))
    return int(rng.integers(4, 8))


def generate_noisy_multilabel(row: dict[str, Any], rng: np.random.Generator) -> list[str]:
    """Noisy multilabel ground truth — not identical to production rule detector."""
    hint = row.get("completeness_hint")
    if hint in ("complete", "partial", "severe") and rng.random() < 0.82:
        tier = str(hint)
    else:
        tier = infer_completeness_tier(row, rng)
    target_n = target_label_count(tier, rng)
    signals = missing_probability_signals(row)
    ranked = sorted(signals.items(), key=lambda item: item[1], reverse=True)

    labels: list[str] = []
    for label, prob in ranked:
        if len(labels) >= target_n:
            break
        threshold = 0.42 if tier == "severe" else 0.52 if tier == "partial" else 0.68
        if rng.random() < prob or (len(labels) < target_n and prob > threshold):
            if label not in labels:
                labels.append(label)

    while len(labels) < target_n:
        label = ranked[int(rng.integers(0, len(ranked)))][0]
        if label not in labels:
            labels.append(label)

    # Ambiguity noise: flip ~12% of labels
    if rng.random() < 0.12 and labels:
        drop = labels[int(rng.integers(0, len(labels)))]
        labels = [l for l in labels if l != drop]
    if rng.random() < 0.1 and labels:
        extra = ranked[int(rng.integers(0, len(ranked)))][0]
        if extra not in labels:
            labels.append(extra)

    return sorted(set(labels))


def rule_based_predict(row: dict[str, Any], threshold: float = 0.52) -> list[str]:
    """Production-style rule detector for benchmarking."""
    signals = missing_probability_signals(row)
    return sorted(label for label, prob in signals.items() if prob >= threshold)


def labels_to_matrix(label_lists: list[list[str]], label_order: list[str] | None = None) -> np.ndarray:
    order = label_order or CANONICAL_LABELS
    index = {label: i for i, label in enumerate(order)}
    matrix = np.zeros((len(label_lists), len(order)), dtype=int)
    for row_idx, labels in enumerate(label_lists):
        for label in labels:
            if label in index:
                matrix[row_idx, index[label]] = 1
    return matrix


def completeness_score_from_labels(labels: list[str]) -> float:
    return round((len(CANONICAL_LABELS) - len(labels)) / len(CANONICAL_LABELS), 3)


def quality_level_from_score(score: float) -> str:
    if score >= 0.85:
        return "COMPLETE"
    if score >= 0.65:
        return "ADEQUATE"
    if score >= 0.45:
        return "INCOMPLETE"
    return "POOR"
