"""E0 - Determinism of the synthetic data generator, and a profile of the pinned dataset.

Seeds ml_training five times through the real seed script (requires Bun on PATH), always with seed 20260525:
  generator clock shifted by +10 minutes, by +1 day, the pinned clock under TZ=Europe/Paris, and the pinned
  clock (2026-05-25T00:00:00Z, TZ=UTC) twice.
Without --generated-at the script uses the wall clock and local timezone, so the shifted runs show what
happens when the unpinned script is run at another time or on another machine. Also compares the pinned data
with the committed ml/exports/historical_tickets.csv and profiles the pinned dataset. The database is left
in the pinned state used by E1-E8.

Usage: python experiments/00_generator_determinism.py
"""
from __future__ import annotations

import os
import shutil
import subprocess

import pandas as pd

from common import ROOT, dataset_fingerprint, load_tickets, write_result

PINNED_AT = "2026-05-25T00:00:00Z"
COMPARE = ["title", "description", "priority", "escalation_required", "transfer_required", "sla_breached", "recommended_action", "similar_case_group_id", "split"]


def seed(generated_at: str, tz: str = "UTC") -> pd.DataFrame:
    env = dict(os.environ)
    bun = shutil.which("bun") or shutil.which("bun.exe") or os.path.expanduser("~/.bun/bin/bun.exe")
    args = [bun, "scripts/seed-ml-training.ts", f"--generated-at={generated_at}"]
    env["TZ"] = tz
    proc = subprocess.run(args, cwd=ROOT, env=env, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=1200)
    if proc.returncode != 0:
        raise SystemExit(proc.stdout[-2000:] + proc.stderr[-2000:])
    print([line for line in proc.stdout.splitlines() if "seeded" in line][-1], flush=True)
    return load_tickets()


def agreement(a: pd.DataFrame, b: pd.DataFrame, columns) -> dict:
    return {c: float((a[c].astype(str).to_numpy() == b[c].astype(str).to_numpy()).mean()) for c in columns}


def profile(df: pd.DataFrame) -> dict:
    cat = df["incident_category"].astype(str)
    return {
        "rows": int(len(df)),
        "columns": int(df.shape[1]),
        "positive_rate": {t: float(df[t].astype(int).mean()) for t in ["escalation_required", "transfer_required", "sla_breached"]},
        "priority_distribution": df["priority"].value_counts(normalize=True).round(4).to_dict(),
        "action_distribution": df["recommended_action"].value_counts(normalize=True).round(4).to_dict(),
        "raw_perimeter_values": int(df["perimeter"].nunique()),
        "incident_categories": int(cat.nunique()),
        "share_with_root_cause_suffix": float(cat.str.contains("__ROOT_").mean()),
        "similar_case_groups": int(df["similar_case_group_id"].nunique()),
        "stores": int(df["store_id"].nunique()),
        "missing_rate": {c: float(df[c].isna().mean()) for c in ["description", "resolution_time_minutes", "resolution_summary"]},
        "generator_split": df["split"].value_counts().to_dict(),
    }


def main() -> None:
    # Without --generated-at the script uses `new Date()` in the machine's timezone, so the clock and TZ
    # below stand in for "running the script at another time / on another machine".
    shifted_10min = seed("2026-05-25T00:10:00Z")
    shifted_1day = seed("2026-05-26T00:00:00Z")
    other_tz = seed(PINNED_AT, tz="Europe/Paris")
    pinned_a, pinned_b = seed(PINNED_AT), seed(PINNED_AT)  # last: leaves the pinned dataset in the database
    csv = pd.read_csv(ROOT / "ml" / "exports" / "historical_tickets.csv")
    merged = pinned_b.merge(csv, on="ticket_id", suffixes=("", "_csv"))
    out = {
        "agreement_with_pinned_run": {
            "same_clock_and_tz_rerun": agreement(pinned_a, pinned_b, COMPARE),
            "clock_plus_10_minutes": agreement(shifted_10min, pinned_b, COMPARE),
            "clock_plus_1_day": agreement(shifted_1day, pinned_b, COMPARE),
            "same_clock_tz_europe_paris": agreement(other_tz, pinned_b, COMPARE),
        },
        "pinned_fingerprints_identical": dataset_fingerprint(pinned_a) == dataset_fingerprint(pinned_b),
        "committed_csv_vs_pinned_agreement": {
            c: float((merged[c].fillna("").astype(str) == merged[c + "_csv"].fillna("").astype(str)).mean())
            for c in ["title", "description", "priority", "incident_category", "split"]
        },
        "pinned_dataset_profile": profile(pinned_b),
        "pinned_generated_at": PINNED_AT,
    }
    write_result("00_generator_determinism", out, pinned_b)


if __name__ == "__main__":
    main()
