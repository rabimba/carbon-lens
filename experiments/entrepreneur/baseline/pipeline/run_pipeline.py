#!/usr/bin/env python3
"""
Master orchestrator for CiteSignal autonomous B2B compliance intelligence platform.

Usage:
    /usr/local/bin/python3 pipeline/run_pipeline.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from pipeline import AIRGAP_MODE, REFERENCE_DATE
from pipeline.digest_generator import generate_deliverables
from pipeline.financial_model import build_financial_projections
from pipeline.ingest_and_normalize import ingest_all_sources
from pipeline.lead_scorer import score_leads
from pipeline.monthly_founder_brief import sync_sqlite_ledger, write_founder_monthly_brief
from pipeline.outbound_drafter import draft_outbound_proof_batch


def run_full_pipeline(base_dir: Path = BASE_DIR) -> dict:
    ingest_res = ingest_all_sources(base_dir)
    scored_leads = score_leads(ingest_res["verified_leads"])
    deliverables_meta = generate_deliverables(base_dir, scored_leads)
    outbound_batch = draft_outbound_proof_batch(base_dir, scored_leads)
    financials = build_financial_projections(base_dir)
    ledger_meta = sync_sqlite_ledger(
        base_dir,
        scored_leads,
        ingest_res["quarantine_queue"],
        outbound_batch,
    )
    founder_brief_relpath = write_founder_monthly_brief(
        base_dir,
        ingest_res,
        scored_leads,
        outbound_batch,
        financials,
        ledger_meta,
    )

    data_dir = base_dir / "data"
    (data_dir / "scored_leads.json").write_text(
        json.dumps(scored_leads, indent=2), encoding="utf-8"
    )

    bundle = {
        "brand": "CiteSignal",
        "tagline": "Autonomous Municipal Mechanical, Elevator & Fire-Code Compliance Triggers for Licensed Commercial Contractors",
        "reference_date": REFERENCE_DATE,
        "airgap_mode": AIRGAP_MODE,
        "pipeline_stats": {
            "raw_records_scanned": ingest_res["raw_records_scanned"],
            "verified_commercial_leads": len(scored_leads),
            "quarantined_exceptions": len(ingest_res["quarantine_queue"]),
            "dropped_counts": ingest_res["dropped_counts"],
            "total_midpoint_repair_pipeline_usd": sum(l["est_job_mid"] for l in scored_leads),
            "total_penalty_exposure_usd": sum(l["est_penalty_exposure"] for l in scored_leads),
        },
        "scored_leads": scored_leads,
        "quarantine_queue": ingest_res["quarantine_queue"],
        "deliverables": deliverables_meta,
        "outbound_batch": outbound_batch,
        "financials": financials,
        "ledger": ledger_meta,
        "founder_brief_relpath": founder_brief_relpath,
    }

    (data_dir / "pipeline_summary.json").write_text(
        json.dumps(bundle, indent=2), encoding="utf-8"
    )
    (data_dir / "dashboard_bundle.js").write_text(
        "window.CITESIGNAL_BUNDLE = " + json.dumps(bundle, indent=2) + ";\n",
        encoding="utf-8",
    )
    return bundle


if __name__ == "__main__":
    summary = run_full_pipeline()
    stats = summary["pipeline_stats"]
    fin_base = summary["financials"]["scenarios"]["base"]
    fin_cons = summary["financials"]["scenarios"]["conservative"]
    mc = summary["financials"]["monte_carlo_1000_trials"]

    print("=" * 72)
    print(f"CiteSignal Autonomous Pipeline Complete | AIRGAP_MODE={summary['airgap_mode']}")
    print("=" * 72)
    print(f"Raw Records Scanned          : {stats['raw_records_scanned']}")
    print(f"Verified Commercial Leads    : {stats['verified_commercial_leads']}")
    print(f"Quarantined for 6m Triage    : {stats['quarantined_exceptions']}")
    print(f"Est. Contractor Repair Pool  : ${stats['total_midpoint_repair_pipeline_usd']:,}")
    print(f"Outbound Proof Drafts Ready  : {summary['outbound_batch']['ready_for_founder_approval_count']} (Air-Gapped)")
    print("-" * 72)
    print(f"Year-1 Net Profit (Conserv.) : ${fin_cons['year1_net_profit_usd']:,.2f}")
    print(f"Year-1 Net Profit (Base)     : ${fin_base['year1_net_profit_usd']:,.2f} (Exit MRR: ${fin_base['exit_mrr_usd']:,.2f})")
    print(f"Monte Carlo P50 / Prob >=20k : ${mc['p50_median_net_profit_usd']:,.2f} ({mc['probability_exceeding_20k_pct']}%)")
    print(f"Avg Founder Time / Month     : {fin_base['avg_founder_minutes_per_month']} min (Max: {fin_base['max_founder_minutes_any_month']} min <= 20m)")
    print("=" * 72)
