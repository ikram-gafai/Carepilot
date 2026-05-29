"""Qualitative rubric scoring for Task 9 LLM explanation benchmark."""

from __future__ import annotations

import re
from dataclasses import dataclass


FORBIDDEN_PHRASES = (
    "i think",
    "i believe",
    "as an ai",
    "language model",
    "training data",
    "openai",
    "gpt-",
)


@dataclass
class QualityScores:
    clarity: float
    relevance: float
    completeness: float
    consistency: float
    hallucination_control: float
    latency_ms: float

    @property
    def overall(self) -> float:
        return round(
            (self.clarity + self.relevance + self.completeness + self.consistency + self.hallucination_control) / 5,
            2,
        )


def _clamp(score: float) -> float:
    return round(max(1.0, min(4.8, score)), 2)


def score_explanation(
    response: str,
    context_text: str,
    latency_ms: float,
) -> QualityScores:
    text = response.strip()
    lower = text.lower()
    ctx_lower = context_text.lower()

    # Clarity: structure + length discipline
    has_sections = sum(1 for i in range(1, 6) if f"{i}." in text) >= 4
    word_count = len(text.split())
    clarity = 3.2
    if has_sections:
        clarity += 0.6
    if 80 <= word_count <= 320:
        clarity += 0.5
    elif word_count > 450:
        clarity -= 0.4
    if any(p in lower for p in FORBIDDEN_PHRASES):
        clarity -= 0.8

    # Relevance: mentions context tokens
    ctx_tokens = [t for t in re.findall(r"[A-Za-z0-9_-]{4,}", context_text) if t.lower() not in ("ticket", "prediction", "available")]
    hits = sum(1 for t in ctx_tokens[:20] if t.lower() in lower)
    relevance = 3.0 + min(0.9, hits * 0.08)

    # Completeness: all five sections present
    completeness = 2.8 + 0.35 * sum(
        1
        for label in ("operational summary", "recommended action", "reasoning", "missing information", "next steps")
        if label in lower
    )

    # Consistency: no contradictory escalation/transfer claims vs context
    consistency = 3.6
    if "escalation is predicted as required" in ctx_lower and "escalation is not predicted" in lower:
        consistency -= 0.7
    if "transfer is predicted" in ctx_lower and "transfer is not predicted" in lower:
        consistency -= 0.7

    # Hallucination control: penalize invented FR- store codes / ERR- codes not in context
    hallucination = 4.0
    for code in re.findall(r"\bFR-[A-Z0-9-]+\b", text):
        if code not in context_text:
            hallucination -= 0.6
    for code in re.findall(r"\bERR[-_][A-Z0-9]+\b", text, re.I):
        if code.upper() not in context_text.upper():
            hallucination -= 0.5
    if "team n3" in lower and "n3" not in ctx_lower:
        hallucination -= 0.3

    return QualityScores(
        clarity=_clamp(clarity),
        relevance=_clamp(relevance),
        completeness=_clamp(completeness),
        consistency=_clamp(consistency),
        hallucination_control=_clamp(hallucination),
        latency_ms=latency_ms,
    )


def hallucination_flag(response: str, context_text: str) -> bool:
    for code in re.findall(r"\bFR-[A-Z0-9-]+\b", response):
        if code not in context_text:
            return True
    for code in re.findall(r"\bERR[-_][A-Z0-9]+\b", response, re.I):
        if code.upper() not in context_text.upper():
            return True
    return False
