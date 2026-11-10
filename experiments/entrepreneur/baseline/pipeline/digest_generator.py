#!/usr/bin/env python3
"""
Generates real, customer-ready CiteSignal B2B deliverables:
  1. Weekly Metro/Trade Subscriber Digests (HTML + CRM-ready CSV)
  2. Self-Serve $149 Instant 30-Day Audit Packs (JSON + CSV)
"""

from __future__ import annotations

import csv
import html
import json
from pathlib import Path
from typing import Any, Dict, List

from pipeline import REFERENCE_DATE


CSV_COLUMNS = [
    "lead_id",
    "urgency_score",
    "metro",
    "territory_id",
    "trade_bucket",
    "native_filing_id",
    "building_name",
    "address",
    "owner_entity",
    "decision_maker_contact",
    "floors",
    "building_sqft",
    "equipment_detail",
    "deficiency_summary",
    "citation_date",
    "cure_deadline",
    "days_until_deadline",
    "est_penalty_exposure",
    "est_job_low",
    "est_job_mid",
    "est_job_high",
    "statutory_hook",
    "contractor_pitch_angle",
    "source_portal",
    "source_dataset_id",
]


def _write_csv(path: Path, rows: List[Dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_COLUMNS, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def _render_digest_html(title: str, subtitle: str, rows: List[Dict[str, Any]]) -> str:
    total_mid = sum(r["est_job_mid"] for r in rows)
    total_penalty = sum(r["est_penalty_exposure"] for r in rows)

    cards_html = []
    for r in rows:
        days = int(r["days_until_deadline"])
        badge_bg = "#dc2626" if days < 0 else ("#d97706" if days <= 35 else "#0f766e")
        deadline_label = (
            f"OVERDUE {abs(days)} DAYS"
            if days < 0
            else f"DUE IN {days} DAYS ({html.escape(r['cure_deadline'])})"
        )
        cards_html.append(f"""
        <div class="lead-card">
          <div class="lead-top">
            <div>
              <span class="urgency-pill">URGENCY {r['urgency_score']}/100</span>
              <span class="deadline-pill" style="background:{badge_bg}">{deadline_label}</span>
              <span class="filing-tag">{html.escape(r['native_filing_id'])}</span>
            </div>
            <div class="job-val">Est. Remediation Ticket: <strong>${r['est_job_low']:,} – ${r['est_job_high']:,}</strong></div>
          </div>
          <h3>{html.escape(r['building_name'])} — {html.escape(r['address'])}</h3>
          <div class="meta-grid">
            <div><strong>Owner of Record:</strong> {html.escape(r['owner_entity'])}</div>
            <div><strong>Facilities / Mgmt Contact:</strong> {html.escape(r['decision_maker_contact'])}</div>
            <div><strong>Scale &amp; System:</strong> {r['floors']} Floors ({r['building_sqft']:,} sq ft) | {html.escape(r['equipment_detail'])}</div>
            <div><strong>Penalty Exposure:</strong> ${r['est_penalty_exposure']:,}+ ({html.escape(r['source_portal'])} · {html.escape(r['source_dataset_id'])})</div>
          </div>
          <p class="defect-box"><strong>Verified Public Deficiency:</strong> {html.escape(r['deficiency_summary'])}</p>
          <p class="hook-box"><strong>Turnkey Sales Opener:</strong> {html.escape(r['contractor_pitch_angle'])}</p>
        </div>
        """)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>{html.escape(title)} — CiteSignal Dispatch ({REFERENCE_DATE})</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 32px 16px; }}
    .wrap {{ max-width: 920px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 24px rgba(15,23,42,0.05); }}
    .hdr {{ background: #0f172a; color: #f8fafc; padding: 28px 32px; }}
    .hdr h1 {{ margin: 0 0 6px; font-size: 22px; letter-spacing: -0.02em; }}
    .hdr p {{ margin: 0; color: #94a3b8; font-size: 14px; }}
    .kpi-bar {{ display: grid; grid-template-columns: repeat(3, 1fr); background: #f1f5f9; border-bottom: 1px solid #e2e8f0; padding: 16px 32px; gap: 16px; }}
    .kpi strong {{ display: block; font-size: 20px; color: #0f172a; }}
    .kpi span {{ font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.04em; }}
    .body {{ padding: 24px 32px; }}
    .lead-card {{ border: 1px solid #cbd5e1; border-radius: 10px; padding: 18px 20px; margin-bottom: 18px; background: #fff; }}
    .lead-top {{ display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }}
    .urgency-pill {{ background: #1e293b; color: #38bdf8; font-weight: 700; font-size: 11px; padding: 4px 8px; border-radius: 4px; }}
    .deadline-pill {{ color: #fff; font-weight: 700; font-size: 11px; padding: 4px 8px; border-radius: 4px; margin-left: 6px; }}
    .filing-tag {{ font-family: monospace; font-size: 12px; color: #475569; margin-left: 8px; }}
    .job-val {{ font-size: 13px; color: #047857; }}
    h3 {{ margin: 6px 0 12px; font-size: 17px; color: #0f172a; }}
    .meta-grid {{ display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 16px; font-size: 13px; color: #334155; margin-bottom: 12px; }}
    .defect-box {{ background: #fffbeb; border-left: 3px solid #d97706; padding: 10px 12px; font-size: 13px; margin: 8px 0; }}
    .hook-box {{ background: #f0fdf4; border-left: 3px solid #059669; padding: 10px 12px; font-size: 13px; margin: 8px 0 0; }}
    .ftr {{ background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 32px; font-size: 12px; color: #64748b; }}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hdr">
      <h1>CiteSignal // {html.escape(title)}</h1>
      <p>{html.escape(subtitle)} · Dispatch Cycle {REFERENCE_DATE} · Seat-Capped Commercial Feed</p>
    </div>
    <div class="kpi-bar">
      <div class="kpi"><strong>{len(rows)} Verified Buildings</strong><span>100% Commercial Filtered</span></div>
      <div class="kpi"><strong>${total_mid:,}</strong><span>Est. Midpoint Repair Pipeline</span></div>
      <div class="kpi"><strong>${total_penalty:,}+</strong><span>Aggregate Owner Fine Exposure</span></div>
    </div>
    <div class="body">
      {''.join(cards_html)}
    </div>
    <div class="ftr">
      CiteSignal Autonomous Compliance Intelligence · Data Verified Against Municipal Socrata &amp; State Regulatory Portals · Manage Seat or Cancel 1-Click via Self-Serve Billing Portal.
    </div>
  </div>
</body>
</html>
"""


def generate_deliverables(base_dir: Path, scored_leads: List[Dict[str, Any]]) -> Dict[str, Any]:
    digest_dir = base_dir / "deliverables" / "digests"
    audit_dir = base_dir / "deliverables" / "audit_packs"
    digest_dir.mkdir(parents=True, exist_ok=True)
    audit_dir.mkdir(parents=True, exist_ok=True)

    groups = [
        (
            "NYC_BOILER_MECHANICAL_weekly_digest",
            "NYC Commercial Boiler & Steam Plant Defects",
            "Cross-joined NYC Open Data 52dp-yji6 + PLUTO 64uk-42ks Commercial Towers",
            [r for r in scored_leads if r["metro"] == "NYC" and r["trade_bucket"] == "BOILER_MECHANICAL"],
        ),
        (
            "NYC_ELEVATOR_FIRE_weekly_digest",
            "NYC Commercial Elevator & Fire-Suppression OATH Summonses",
            "Cross-joined NYC Open Data 6bgk-3dad + PLUTO 64uk-42ks Class 1 & 2 Active Citations",
            [r for r in scored_leads if r["metro"] == "NYC" and r["trade_bucket"] != "BOILER_MECHANICAL"],
        ),
        (
            "CHICAGO_COMMERCIAL_TRADES_weekly_digest",
            "Chicago Loop Commercial Elevator, Boiler & Fire-Pump Citations",
            "Filtered City of Chicago 22u3-xenr Periodic Inspection Failures",
            [r for r in scored_leads if r["metro"] == "CHICAGO"],
        ),
        (
            "TX_TRIANGLE_ELEVATOR_QEI_weekly_digest",
            "Austin & Dallas TDLR Overdue & Expiring Commercial Elevators",
            "Texas Health & Safety Code §754.019 ELBI Equipment Compliance Triggers",
            [r for r in scored_leads if r["metro"] == "TX_TRIANGLE"],
        ),
    ]

    generated_files: List[Dict[str, Any]] = []
    for slug, title, subtitle, subset in groups:
        csv_path = digest_dir / f"{slug}.csv"
        html_path = digest_dir / f"{slug}.html"
        _write_csv(csv_path, subset)
        html_path.write_text(_render_digest_html(title, subtitle, subset), encoding="utf-8")
        generated_files.append({
            "slug": slug,
            "title": title,
            "lead_count": len(subset),
            "pipeline_value_mid": sum(r["est_job_mid"] for r in subset),
            "csv_relpath": f"deliverables/digests/{slug}.csv",
            "html_relpath": f"deliverables/digests/{slug}.html",
        })

    # Generate $149 Instant Self-Serve 30-Day Audit Pack (Texas Triangle + Chicago Sample Products)
    tx_rows = [r for r in scored_leads if r["metro"] == "TX_TRIANGLE"]
    audit_json_path = audit_dir / "TX_TRAVIS_DALLAS_30DAY_AUDIT_PACK.json"
    audit_csv_path = audit_dir / "TX_TRAVIS_DALLAS_30DAY_AUDIT_PACK.csv"
    _write_csv(audit_csv_path, tx_rows)
    audit_json_path.write_text(
        json.dumps(
            {
                "product_sku": "AUDIT-TX-ELEVATOR-30D",
                "price_usd": 149,
                "generated_on": REFERENCE_DATE,
                "record_count": len(tx_rows),
                "total_midpoint_pipeline_usd": sum(r["est_job_mid"] for r in tx_rows),
                "upgrade_credit_note": "100% of $149 Audit Pack price credits toward Month 1 if upgraded to Pro ($199/mo) or Exclusive ($499/mo) within 14 days.",
                "leads": tx_rows,
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    return {
        "digests": generated_files,
        "audit_pack": {
            "sku": "AUDIT-TX-ELEVATOR-30D",
            "price_usd": 149,
            "lead_count": len(tx_rows),
            "json_relpath": "deliverables/audit_packs/TX_TRAVIS_DALLAS_30DAY_AUDIT_PACK.json",
            "csv_relpath": "deliverables/audit_packs/TX_TRAVIS_DALLAS_30DAY_AUDIT_PACK.csv",
        },
    }
