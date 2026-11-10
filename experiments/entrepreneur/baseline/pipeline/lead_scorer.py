#!/usr/bin/env python3
"""
Scores normalized commercial compliance triggers with:
  - Urgency Score (0–100)
  - Statutory Penalty Exposure ($)
  - Estimated Licensed Contractor Ticket Value (Low / Mid / High $)
  - Ready-to-use B2B Outreach Call/Email Hook for subscribing contractors
"""

from __future__ import annotations

from typing import Any, Dict, List


def score_leads(leads: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    scored: List[Dict[str, Any]] = []

    for item in leads:
        lead = dict(item)
        days = int(lead["days_until_deadline"])
        sqft = int(lead["building_sqft"])
        floors = int(lead["floors"])
        trade = lead["trade_bucket"]
        severity = lead["severity_tier"]

        # 1. Urgency Score (0 - 100)
        base_urgency = 72
        if days < 0:
            # Already past statutory due date!
            base_urgency += min(24, 10 + abs(days) // 3)
        elif days <= 15:
            base_urgency += 18
        elif days <= 35:
            base_urgency += 11
        else:
            base_urgency += 4

        if severity == "CRITICAL":
            base_urgency += 6
        elif severity == "HIGH":
            base_urgency += 3

        urgency_score = max(55, min(99, base_urgency))

        # 2. Estimated Contractor Repair / Remediation Ticket Value ($)
        size_multiplier = 1.0 + min(1.4, sqft / 450_000.0)
        if trade == "BOILER_MECHANICAL":
            high_pressure_bonus = 1.45 if "High Pressure" in lead["equipment_detail"] or "STEAM" in lead["deficiency_summary"].upper() else 1.0
            low = round((3400 * size_multiplier * high_pressure_bonus) / 50) * 50
            high = round((11800 * size_multiplier * high_pressure_bonus) / 100) * 100
        elif trade == "ELEVATOR_CONVEYANCE":
            car_factor = 1.0 + min(0.85, floors / 40.0)
            low = round((2900 * size_multiplier * car_factor) / 50) * 50
            high = round((9600 * size_multiplier * car_factor) / 100) * 100
        else:  # FIRE_SUPPRESSION
            low = round((4100 * size_multiplier) / 50) * 50
            high = round((14500 * size_multiplier) / 100) * 100

        mid = round(((low + high) / 2) / 50) * 50

        # 3. Estimated 30-Day Statutory Penalty / Operational Risk Exposure
        posted_fine = float(lead.get("current_fine_posted", 0.0))
        if lead["metro"] == "NYC":
            penalty_exposure = max(posted_fine, 6250.0 if severity == "CRITICAL" else 2500.0)
        elif lead["metro"] == "CHICAGO":
            penalty_exposure = max(posted_fine, 7500.0 if severity == "CRITICAL" else 4500.0)
        else:
            # TX Occ. Code Ch. 51 administrative exposure for continuing overdue commercial units
            penalty_exposure = 12500.0 if days < 0 else 3500.0

        # 4. Actionable Contractor Pitch Hook
        deadline_phrase = (
            f"{abs(days)} days past statutory deadline"
            if days < 0
            else f"facing a {days}-day cure deadline ({lead['cure_deadline']})"
        )
        lead["urgency_score"] = int(urgency_score)
        lead["est_job_low"] = int(low)
        lead["est_job_mid"] = int(mid)
        lead["est_job_high"] = int(high)
        lead["est_penalty_exposure"] = int(penalty_exposure)
        lead["contractor_pitch_angle"] = (
            f"Reference {lead['native_filing_id']} at {lead['address']} ({deadline_phrase}). "
            f"Offer turnkey licensed remediation + compliance sign-off to clear ${int(penalty_exposure):,}+ penalty exposure."
        )
        scored.append(lead)

    scored.sort(key=lambda x: (-x["urgency_score"], x["days_until_deadline"]))
    return scored
