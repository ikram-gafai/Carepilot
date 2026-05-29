from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass
class RetrievalResult:
    method: str
    precision_at_1: float
    precision_at_3: float
    recall_at_3: float
    mrr: float
    ndcg_at_3: float
    avg_retrieval_time_ms: float


def _precision_at_k(ranked_ids: list[str], relevant: set[str], k: int) -> float:
    if not relevant:
        return 0.0
    top = ranked_ids[:k]
    hits = sum(1 for item in top if item in relevant)
    if hits == 0:
        return 0.0
    return hits / min(k, len(relevant))


def _recall_at_k(ranked_ids: list[str], relevant: set[str], k: int) -> float:
    if not relevant:
        return 0.0
    top = ranked_ids[:k]
    hits = sum(1 for item in top if item in relevant)
    return hits / len(relevant)


def _mrr(ranked_ids: list[str], relevant: set[str]) -> float:
    for index, item in enumerate(ranked_ids, start=1):
        if item in relevant:
            return 1.0 / index
    return 0.0


def _ndcg_at_k(ranked_ids: list[str], relevant: set[str], k: int) -> float:
    dcg = 0.0
    for index, item in enumerate(ranked_ids[:k], start=1):
        if item in relevant:
            dcg += 1.0 / np.log2(index + 1)
    ideal_hits = min(len(relevant), k)
    idcg = sum(1.0 / np.log2(index + 1) for index in range(1, ideal_hits + 1))
    if idcg == 0:
        return 0.0
    return dcg / idcg


def evaluate_rankings(
    method: str,
    rankings: list[list[str]],
    ground_truth: list[list[str]],
    retrieval_times_ms: list[float],
) -> RetrievalResult:
    p1: list[float] = []
    p3: list[float] = []
    r3: list[float] = []
    mrrs: list[float] = []
    ndcgs: list[float] = []

    for ranked, relevant_list in zip(rankings, ground_truth, strict=True):
        relevant = set(relevant_list)
        p1.append(_precision_at_k(ranked, relevant, 1))
        p3.append(_precision_at_k(ranked, relevant, 3))
        r3.append(_recall_at_k(ranked, relevant, 3))
        mrrs.append(_mrr(ranked, relevant))
        ndcgs.append(_ndcg_at_k(ranked, relevant, 3))

    return RetrievalResult(
        method=method,
        precision_at_1=float(np.mean(p1)),
        precision_at_3=float(np.mean(p3)),
        recall_at_3=float(np.mean(r3)),
        mrr=float(np.mean(mrrs)),
        ndcg_at_3=float(np.mean(ndcgs)),
        avg_retrieval_time_ms=float(np.mean(retrieval_times_ms)),
    )


def result_table(results: list[RetrievalResult]) -> str:
    headers = ["Method", "P@1", "P@3", "R@3", "MRR", "nDCG@3", "Avg Time (ms)"]
    lines = ["| " + " | ".join(headers) + " |", "| " + " | ".join(["---"] * len(headers)) + " |"]
    for row in results:
        lines.append(
            "| "
            + " | ".join(
                [
                    row.method,
                    f"{row.precision_at_1:.4f}",
                    f"{row.precision_at_3:.4f}",
                    f"{row.recall_at_3:.4f}",
                    f"{row.mrr:.4f}",
                    f"{row.ndcg_at_3:.4f}",
                    f"{row.avg_retrieval_time_ms:.2f}",
                ]
            )
            + " |"
        )
    return "\n".join(lines)
