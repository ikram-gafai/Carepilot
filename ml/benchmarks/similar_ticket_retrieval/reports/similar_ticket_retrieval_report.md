# Similar Ticket Retrieval Benchmark Summary

## Objective

Surface historically resolved tickets that match a new operational incident using NLP retrieval over the full historical ticket corpus.

## Ground Truth

- **Relevant ticket:** any historical ticket with the same `similar_case_group_id`, excluding the query ticket itself.
- **Group metadata:** `incident_family`, `root_cause_family`, `resolution_pattern`
- **Retrieval corpus:** full labeled historical corpus (14000 tickets); only the query ticket is excluded per query.

## Dataset Validation

- Tickets with `similar_case_group_id`: 14000
- Unique groups: 792
- Group size min / avg / max: 9 / 17.7 / 35
- Evaluable test queries: 1584

## Retrieval Text

Each ticket uses: title + description + perimeter + incident category + resolution summary + incident family + root cause family + resolution pattern + derived keywords, with operational synonym normalization.

## Benchmark Results

| Method | P@1 | P@3 | R@3 | MRR | nDCG@3 | Avg Time (ms) |
| --- | --- | --- | --- | --- | --- | --- |
| TF-IDF + Cosine | 0.3611 | 0.3114 | 0.0512 | 0.4456 | 0.3224 | 45.91 |
| BM25 | 0.5726 | 0.4617 | 0.0904 | 0.6509 | 0.4862 | 591.23 |
| Sentence Transformers | 0.2658 | 0.1806 | 0.0329 | 0.3298 | 0.1996 | 1.79 |

## Best Method

**Production method:** BM25

Artifacts:

- `ml/artifacts/models/similar_ticket_retrieval_minilm.joblib`
- `ml/artifacts/models/similar_ticket_tfidf.joblib`
- `ml/artifacts/models/similar_ticket_bm25.joblib`

Metrics: `ml/artifacts/metrics/similar_ticket_retrieval_metrics.json`
