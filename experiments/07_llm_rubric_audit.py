"""E7 - Construct validity of the LLM-explanation rubric.

ml/benchmarks/llm_explanation/evaluation.py:score_explanation() scores responses with lexical
heuristics (numbered sections, word count, section labels, context-token overlap, regexes for invented
FR-/ERR- codes), clamped to [1, 4.8]. This experiment feeds the SAME 50 evaluation contexts and the SAME
scorer with responses that involve no language model, to test whether the rubric separates good from
bad explanations:
  template_fallback        the benchmark's own deterministic template (benchmark.template_explanation)
  format_only_filler       correct five-section layout, generic text unrelated to the ticket
  filler_with_fabrication  same layout, plus invented people, sites and vendor ticket numbers
  contradiction            same layout, but negates the escalation prediction given in the context
  empty                    empty string
No Ollama call is made; results are fully deterministic.

Usage: python experiments/07_llm_rubric_audit.py
"""
from __future__ import annotations

import json

import numpy as np

from common import BENCH, Task, load_task_modules, write_result

LLM = Task("llm", "llm_explanation", "", "generation")

REPORTED = {  # ml/reports/03_llm_operational_explanation_summary.md
    "Mistral": {"clarity": 4.30, "relevance": 3.90, "completeness": 4.55, "hallucination_control": 4.00, "overall": 4.07},
    "Llama3": {"clarity": 4.30, "relevance": 3.90, "completeness": 4.55, "hallucination_control": 4.00, "overall": 4.07},
    "DeepSeek R1": {"clarity": 4.00, "relevance": 3.74, "completeness": 3.98, "hallucination_control": 4.00, "overall": 3.86},
}

FILLER = (
    "1. Operational summary: The incident affects a store system and requires structured follow-up by the support team "
    "according to the standard operating model and the usual service management practices.\n"
    "2. Recommended action: Apply the standard procedure, coordinate with the relevant team and keep the requester informed "
    "about progress until the situation is stabilised.\n"
    "3. Reasoning: The available signals are consistent with a routine operational case that benefits from a documented, "
    "repeatable approach and clear ownership.\n"
    "4. Missing information: Additional details may help, such as precise timing, affected equipment and recent changes.\n"
    "5. Next steps: Confirm the scope, apply the procedure, monitor the outcome and close the ticket once the service is restored."
)
FABRICATION = (
    "\nStore manager Paul Martin confirmed that the Marseille warehouse outage started after the vendor update; "
    "vendor case #88231 is open with the payment terminal supplier and the night team already replaced two switches."
)
CONTRADICTION = "\nNote: escalation is not predicted for this ticket and no N3 involvement is needed."


def main() -> None:
    bench, _, evaluation = load_task_modules(LLM)
    cases = json.loads((BENCH / "llm_explanation" / "eval_cases.json").read_text(encoding="utf-8"))
    contexts = [c["context_block"] for c in cases]
    strategies = {
        "template_fallback": lambda ctx: bench.template_explanation(ctx),
        "format_only_filler": lambda ctx: FILLER,
        "filler_with_fabrication": lambda ctx: FILLER + FABRICATION,
        "contradiction": lambda ctx: FILLER + CONTRADICTION,
        "empty": lambda ctx: "",
    }
    out: dict = {"n_cases": len(contexts), "reported_llm_scores": REPORTED, "strategies": {}}
    for name, make in strategies.items():
        rows, flags = [], 0
        for ctx in contexts:
            response = make(ctx)
            qs = evaluation.score_explanation(response, ctx, latency_ms=0.0)
            rows.append({k: getattr(qs, k) for k in ("clarity", "relevance", "completeness", "consistency", "hallucination_control")} | {"overall": qs.overall})
            flags += int(evaluation.hallucination_flag(response, ctx))
        out["strategies"][name] = {
            "mean_scores": {k: float(np.mean([r[k] for r in rows])) for k in rows[0]},
            "hallucination_flag_rate": flags / len(contexts),
        }
    out["contexts_asserting_escalation"] = sum("escalation is predicted as required" in c.lower() for c in contexts)
    write_result("07_llm_rubric_audit", out)


if __name__ == "__main__":
    main()
