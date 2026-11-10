#!/usr/bin/env python3
"""
Drafts zero-call B2B 'Live-Lead Proof Outbound' messages matching active
public compliance failures to licensed local contractors from public registries
(TX TDLR 7358-krk7, NYC DOB t8hj-ruu2, Chicago Licensed Mechanical/Elevator).

SAFETY AIR-GAP:
  - Strictly enforces AIRGAP_MODE = True (zero SMTP/HTTP transmissions).
  - Enforces CAN-SPAM global suppression ledger (`state/suppression_list.json`).
  - Checks seat inventory so Exclusive-locked territories are never oversold.
  - Writes drafts locally to `deliverables/outbox_airgapped/` for the founder's
    5-minute monthly batch review.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

from pipeline import AIRGAP_MODE, REFERENCE_DATE
from pipeline.ingest_and_normalize import assert_airgap_safe


def draft_outbound_proof_batch(
    base_dir: Path,
    scored_leads: List[Dict[str, Any]],
) -> Dict[str, Any]:
    assert_airgap_safe("draft_outbound_proof_batch", allow_network=False)

    contractors = json.loads(
        (base_dir / "data" / "raw" / "licensed_contractors_registry.json").read_text(encoding="utf-8")
    )
    suppression = json.loads(
        (base_dir / "state" / "suppression_list.json").read_text(encoding="utf-8")
    )
    sub_seed = json.loads(
        (base_dir / "state" / "subscribers_seed.json").read_text(encoding="utf-8")
    )

    suppressed_emails = {e.lower() for e in suppression.get("suppressed_emails", [])}
    suppressed_domains = {d.lower() for d in suppression.get("suppressed_domains", [])}
    suppressed_ids = set(suppression.get("suppressed_contractor_ids", []))

    territories_by_key: Dict[tuple, List[Dict[str, Any]]] = {}
    for t in sub_seed["territories"]:
        territories_by_key.setdefault((t["metro"], t["trade_bucket"]), []).append(t)

    drafts: List[Dict[str, Any]] = []
    skipped_suppressed = 0
    skipped_sold_out = 0

    outbox_dir = base_dir / "deliverables" / "outbox_airgapped"
    outbox_dir.mkdir(parents=True, exist_ok=True)

    for c in contractors:
        email_lc = c["public_email"].lower()
        domain_lc = email_lc.split("@")[-1] if "@" in email_lc else ""
        if (
            c["contractor_id"] in suppressed_ids
            or email_lc in suppressed_emails
            or domain_lc in suppressed_domains
        ):
            skipped_suppressed += 1
            continue

        # Match leads in same metro + trade
        matching_leads = [
            l for l in scored_leads
            if l["metro"] == c["metro"] and l["trade_bucket"] == c["trade_bucket"]
        ]
        if not matching_leads:
            continue

        # Prefer leads in exact sub_territory first
        matching_leads.sort(
            key=lambda l: (0 if l["sub_territory"] == c["sub_territory"] else 1, -l["urgency_score"])
        )
        proof_lead = matching_leads[0]

        # Check territory seat availability for proof_lead's territory_id
        territory_meta = next(
            (t for t in sub_seed["territories"] if t["territory_id"] == proof_lead["territory_id"]),
            None,
        )
        if territory_meta and territory_meta["exclusive_locked"]:
            # Never pitch a territory already under an Exclusive Lock!
            skipped_sold_out += 1
            continue

        open_seats = (
            (territory_meta["pro_seat_cap"] - territory_meta["pro_seats_filled"])
            if territory_meta
            else 2
        )
        if open_seats <= 0:
            skipped_sold_out += 1
            continue

        second_teaser = (
            f"Plus {len(matching_leads) - 1} additional verified commercial building(s) in {c['metro']} "
            f"(~$ {sum(x['est_job_mid'] for x in matching_leads[1:]):,} est. remediation value) queued in this week's feed."
            if len(matching_leads) > 1
            else "Additional weekly municipal filings monitored automatically every Monday at 6:00 AM."
        )

        subject = (
            f"[{c['metro']} {c['license_number']}] Uncured {proof_lead['equipment_detail'].split('(')[0].strip()} "
            f"at {proof_lead['address'].split(',')[0]}"
        )
        body = f"""Hi {c['contact_person'].split()[0]},

Because {c['business_name']} holds active license #{c['license_number']} ({c['license_type']}), I pulled a live commercial compliance trigger filed near your shop that requires a licensed sign-off:

  • Property: {proof_lead['building_name']} ({proof_lead['address']})
  • Public Filing: {proof_lead['native_filing_id']} ({proof_lead['source_portal']})
  • Owner / Ops: {proof_lead['owner_entity']} — {proof_lead['decision_maker_contact']}
  • Verified Defect: {proof_lead['deficiency_summary']}
  • Cure Window: {proof_lead['cure_deadline']} (Est. job scope: ${proof_lead['est_job_low']:,}–${proof_lead['est_job_high']:,})

{second_teaser}

CiteSignal cross-joins municipal safety inspection failures with commercial tax-lot ownership so your estimating desk reaches building engineers 30–60 days before RFP bidding wars. We cap {territory_meta['display_name'] if territory_meta else c['metro']} at {territory_meta['pro_seat_cap'] if territory_meta else 4} total contractors ({open_seats} Pro seat(s) currently open at $199/mo, or lock 1-of-1 Exclusive Territory rights at $499/mo — no calls, cancel in 1 click anytime).

  -> Self-Serve Instant Access / $149 30-Day Audit Pack:
     https://citesignal.local/checkout?territory={proof_lead['territory_id']}&ref={c['contractor_id']}

Best,
CiteSignal Automated Dispatch Desk
244 Fifth Ave, Suite C-209, New York, NY 10001
Reply UNSUBSCRIBE or click https://citesignal.local/unsubscribe?cid={c['contractor_id']} for instant permanent removal.
"""

        draft_obj = {
            "draft_id": f"OUT-202611-{c['contractor_id']}",
            "airgap_status": "QUEUED_LOCAL_AIRGAPPED_NEVER_SENT",
            "contractor_id": c["contractor_id"],
            "business_name": c["business_name"],
            "recipient_email": c["public_email"],
            "license_number": c["license_number"],
            "metro": c["metro"],
            "territory_id": proof_lead["territory_id"],
            "open_pro_seats": open_seats,
            "proof_lead_id": proof_lead["lead_id"],
            "proof_address": proof_lead["address"],
            "subject": subject,
            "body_text": body,
        }
        drafts.append(draft_obj)

        eml_path = outbox_dir / f"{draft_obj['draft_id']}.eml"
        eml_content = (
            f"X-CiteSignal-Airgap: TRUE (LOCAL DRAFT ONLY - DO NOT TRANSMIT)\n"
            f"From: CiteSignal Dispatch <dispatch@citesignal.example>\n"
            f"To: {c['business_name']} <{c['public_email']}>\n"
            f"Subject: {subject}\n"
            f"Content-Type: text/plain; charset=utf-8\n\n"
            f"{body}"
        )
        eml_path.write_text(eml_content, encoding="utf-8")

    batch_summary = {
        "batch_id": "BATCH-2026-11",
        "generated_on": REFERENCE_DATE,
        "airgap_mode": AIRGAP_MODE,
        "contractors_scanned": len(contractors),
        "skipped_suppressed": skipped_suppressed,
        "skipped_exclusive_locked_or_full": skipped_sold_out,
        "ready_for_founder_approval_count": len(drafts),
        "drafts": drafts,
    }
    (outbox_dir / "outbound_batch_2026_11.json").write_text(
        json.dumps(batch_summary, indent=2), encoding="utf-8"
    )
    return batch_summary
