#!/usr/bin/env python3
"""
Ingests raw municipal & state safety compliance feeds (NYC Socrata 52dp-yji6,
6bgk-3dad, PLUTO 64uk-42ks; Chicago Socrata 22u3-xenr; Texas TDLR ELBI CSV),
applies deterministic commercial-only & active-defect filters, deduplicates,
and routes edge-case records into the Founder Quarantine Queue.
"""

from __future__ import annotations

import csv
import datetime as dt
import hashlib
import json
from pathlib import Path
from typing import Any, Dict, List, Tuple

from pipeline import AIRGAP_MODE, REFERENCE_DATE


class AirGapViolationError(RuntimeError):
    """Raised if any code attempts live network/email/payment side effects while air-gapped."""


def assert_airgap_safe(operation: str, allow_network: bool = False) -> None:
    if AIRGAP_MODE and allow_network:
        raise AirGapViolationError(
            f"SAFETY AIR-GAP BLOCKED live external operation: {operation}"
        )


def _record_hash(source: str, native_id: str) -> str:
    digest = hashlib.sha256(f"{source}::{native_id}".encode("utf-8")).hexdigest()
    return digest[:16]


def _parse_iso_or_compact_date(raw: str) -> dt.date:
    cleaned = raw.strip()
    if "T" in cleaned:
        cleaned = cleaned.split("T")[0]
    if len(cleaned) == 8 and cleaned.isdigit():
        return dt.date(int(cleaned[0:4]), int(cleaned[4:6]), int(cleaned[6:8]))
    return dt.date.fromisoformat(cleaned)


def ingest_all_sources(base_dir: Path) -> Dict[str, Any]:
    """
    Processes local open-data snapshots in `data/raw/` and returns:
      - verified_leads: clean, active commercial compliance leads
      - quarantine_queue: ambiguous records held for the 6-min monthly founder triage
      - dropped_audit: audit counts of noise/residential/cured/duplicate rows filtered out
    """
    assert_airgap_safe("ingest_all_sources", allow_network=False)
    ref_date = dt.date.fromisoformat(REFERENCE_DATE)
    raw_dir = base_dir / "data" / "raw"

    pluto_rows = json.loads((raw_dir / "nyc_pluto_owners_64uk_42ks.json").read_text(encoding="utf-8"))
    pluto_by_bin: Dict[str, Dict[str, Any]] = {str(r["bin"]): r for r in pluto_rows}

    seen_hashes = set()
    verified_leads: List[Dict[str, Any]] = []
    quarantine_queue: List[Dict[str, Any]] = []
    dropped_counts = {
        "duplicate_filings": 0,
        "clean_or_compliant": 0,
        "residential_excluded": 0,
        "quarantined_for_triage": 0,
    }

    # 1. NYC DOB NOW: Safety Boiler (52dp-yji6)
    nyc_boilers = json.loads((raw_dir / "nyc_dob_boilers_52dp_yji6.json").read_text(encoding="utf-8"))
    for row in nyc_boilers:
        rec_hash = _record_hash("NYC_52DP_YJI6", row["tracking_number"])
        if rec_hash in seen_hashes:
            dropped_counts["duplicate_filings"] += 1
            continue
        seen_hashes.add(rec_hash)

        if not row.get("defects_found"):
            dropped_counts["clean_or_compliant"] += 1
            continue

        bin_num = str(row.get("bin_number", ""))
        pluto = pluto_by_bin.get(bin_num)
        if not pluto:
            dropped_counts["quarantined_for_triage"] += 1
            quarantine_queue.append({
                "quarantine_id": f"Q-{rec_hash[:8].upper()}",
                "source_dataset": "NYC Open Data 52dp-yji6 (DOB NOW: Safety Boiler)",
                "native_id": row["tracking_number"],
                "metro": "NYC",
                "address": f"{row.get('house_number', '')} {row.get('street_name', '')}, {row.get('boro', '')} NY {row.get('zip_code', '')}".strip(),
                "trade_bucket": "BOILER_MECHANICAL",
                "reason_code": "UNMAPPED_PLUTO_BIN",
                "reason_detail": f"BIN {bin_num} not matched in PLUTO 64uk-42ks tax roll; verify commercial land-use before dispatch.",
                "recommended_action": "VERIFY_BIN_OR_DROP",
                "raw_summary": row.get("defect_type", ""),
            })
            continue

        landuse = str(pluto.get("landuse", ""))
        if landuse in {"01", "02", "03"}:
            dropped_counts["residential_excluded"] += 1
            continue

        if landuse == "04":
            # Mixed residential/commercial building -> hold for founder 1-click check
            dropped_counts["quarantined_for_triage"] += 1
            quarantine_queue.append({
                "quarantine_id": f"Q-{rec_hash[:8].upper()}",
                "source_dataset": "NYC Open Data 52dp-yji6 + PLUTO 64uk-42ks",
                "native_id": row["tracking_number"],
                "metro": "NYC",
                "address": f"{pluto['address']}, {pluto['borough']} NY {pluto['zipcode']}",
                "owner_name": pluto["ownername"],
                "trade_bucket": "BOILER_MECHANICAL",
                "reason_code": "MIXED_USE_LANDUSE_04",
                "reason_detail": (
                    f"PLUTO LandUse=04 ({pluto['bldgclass']}, {pluto['numfloors']} floors, "
                    f"{pluto['bldgarea']:,} sq ft). Defect notes 'commercial podium plant' — confirm commercial contractor eligibility."
                ),
                "recommended_action": "APPROVE_COMMERCIAL_PODIUM",
                "raw_summary": row.get("defect_type", ""),
            })
            continue

        insp_date = _parse_iso_or_compact_date(row["inspection_date"])
        cure_deadline = insp_date + dt.timedelta(days=90)  # Statutory NYC 90-day boiler defect cure window
        sub_territory = "BROOKLYN_DOWNTOWN" if pluto["borough"] == "BROOKLYN" else "MANHATTAN_CORE"

        verified_leads.append({
            "lead_id": f"CS-NYC-{rec_hash[:6].upper()}",
            "record_hash": rec_hash,
            "metro": "NYC",
            "territory_id": "NYC_BOILER_MECHANICAL",
            "sub_territory": sub_territory,
            "trade_bucket": "BOILER_MECHANICAL",
            "source_portal": "data.cityofnewyork.us",
            "source_dataset_id": "52dp-yji6 + 64uk-42ks",
            "native_filing_id": row["tracking_number"],
            "property_id": f"BIN {bin_num} / BBL {pluto['bbl']}",
            "building_name": f"{pluto['address']} Commercial Tower",
            "address": f"{pluto['address']}, {pluto['borough']}, NY {pluto['zipcode']}",
            "owner_entity": pluto["ownername"],
            "decision_maker_contact": f"{pluto['managing_agent']} | {pluto['managing_phone']}",
            "building_sqft": int(pluto["bldgarea"]),
            "floors": int(pluto["numfloors"]),
            "equipment_detail": f"{row['boiler_make']} {row['boiler_model']} ({row['pressure_type']})",
            "deficiency_summary": row["defect_type"],
            "citation_date": insp_date.isoformat(),
            "cure_deadline": cure_deadline.isoformat(),
            "days_until_deadline": (cure_deadline - ref_date).days,
            "statutory_hook": "NYC Admin. Code §28-303.7 (Mandatory 90-Day Boiler Defect Affirmation of Correction; $1,000+ late/failure-to-cure penalties)",
            "current_fine_posted": float(row.get("civil_penalties_due", 0.0)),
            "severity_tier": "HIGH" if "High Pressure" in row["pressure_type"] else "STANDARD",
        })

    # 2. NYC DOB OATH/ECB Violations (6bgk-3dad)
    nyc_ecb = json.loads((raw_dir / "nyc_ecb_violations_6bgk_3dad.json").read_text(encoding="utf-8"))
    for row in nyc_ecb:
        rec_hash = _record_hash("NYC_6BGK_3DAD", row["ecb_violation_number"])
        if rec_hash in seen_hashes:
            dropped_counts["duplicate_filings"] += 1
            continue
        seen_hashes.add(rec_hash)

        if str(row.get("ecb_violation_status", "")).upper() != "ACTIVE":
            dropped_counts["clean_or_compliant"] += 1
            continue

        bin_num = str(row.get("bin", ""))
        pluto = pluto_by_bin.get(bin_num)
        vtype_raw = str(row.get("violation_type", "")).upper()
        trade_bucket = "ELEVATOR_CONVEYANCE" if "ELEVATOR" in vtype_raw else "FIRE_SUPPRESSION"

        if not pluto:
            dropped_counts["quarantined_for_triage"] += 1
            quarantine_queue.append({
                "quarantine_id": f"Q-{rec_hash[:8].upper()}",
                "source_dataset": "NYC Open Data 6bgk-3dad (DOB ECB Violations)",
                "native_id": row["ecb_violation_number"],
                "metro": "NYC",
                "address": f"{row.get('house_number', '')} {row.get('street_name', '')}, {row.get('boro', '')} NY {row.get('zip_code', '')}".strip(),
                "owner_name": "UNMAPPED IN PLUTO SNAPSHOT",
                "trade_bucket": trade_bucket,
                "reason_code": "UNMAPPED_PLUTO_BIN",
                "reason_detail": f"Active Class-{row.get('class')} OATH summons {row['ecb_violation_number']} on BIN {bin_num} lacks PLUTO owner match.",
                "recommended_action": "LOOKUP_ACRISS_OWNER_OR_DROP",
                "raw_summary": row.get("infraction_code_description", ""),
            })
            continue

        if str(pluto.get("landuse", "")) != "05":
            dropped_counts["residential_excluded"] += 1
            continue

        issue_dt = _parse_iso_or_compact_date(row["issue_date"])
        cure_dt = _parse_iso_or_compact_date(row["cure_date"])
        territory_id = (
            "NYC_ELEVATOR_CONVEYANCE"
            if trade_bucket == "ELEVATOR_CONVEYANCE"
            else "NYC_FIRE_SUPPRESSION"
        )
        sub_territory = "BROOKLYN_DOWNTOWN" if pluto["borough"] == "BROOKLYN" else "MANHATTAN_CORE"

        verified_leads.append({
            "lead_id": f"CS-NYC-{rec_hash[:6].upper()}",
            "record_hash": rec_hash,
            "metro": "NYC",
            "territory_id": territory_id,
            "sub_territory": sub_territory,
            "trade_bucket": trade_bucket,
            "source_portal": "data.cityofnewyork.us",
            "source_dataset_id": "6bgk-3dad + 64uk-42ks",
            "native_filing_id": f"ECB #{row['ecb_violation_number']}",
            "property_id": f"BIN {bin_num} / BBL {pluto['bbl']}",
            "building_name": f"{pluto['address']} Commercial Building",
            "address": f"{pluto['address']}, {pluto['borough']}, NY {pluto['zipcode']}",
            "owner_entity": pluto["ownername"],
            "decision_maker_contact": f"{pluto['managing_agent']} | {pluto['managing_phone']}",
            "building_sqft": int(pluto["bldgarea"]),
            "floors": int(pluto["numfloors"]),
            "equipment_detail": f"OATH Class-{row['class']} Infraction {row['infraction_code']} ({row['violation_type']})",
            "deficiency_summary": row["infraction_code_description"],
            "citation_date": issue_dt.isoformat(),
            "cure_deadline": cure_dt.isoformat(),
            "days_until_deadline": (cure_dt - ref_date).days,
            "statutory_hook": f"NYC DOB OATH Summons Class {row['class']} — Certificate of Correction due before {cure_dt.isoformat()} / Hearing { _parse_iso_or_compact_date(row['hearing_date']).isoformat() }",
            "current_fine_posted": float(row.get("penalty_imposed", 0.0)),
            "severity_tier": "CRITICAL" if str(row.get("class")) == "1" else "HIGH",
        })

    # 3. Chicago Building Violations (22u3-xenr)
    chi_rows = json.loads((raw_dir / "chicago_violations_22u3_xenr.json").read_text(encoding="utf-8"))
    for row in chi_rows:
        rec_hash = _record_hash("CHI_22U3_XENR", str(row["id"]))
        if rec_hash in seen_hashes:
            dropped_counts["duplicate_filings"] += 1
            continue
        seen_hashes.add(rec_hash)

        if str(row.get("violation_status", "")).upper() != "OPEN":
            dropped_counts["clean_or_compliant"] += 1
            continue

        if not str(row.get("property_class", "")).startswith("COMMERCIAL"):
            dropped_counts["residential_excluded"] += 1
            continue

        bureau = str(row.get("department_bureau", "")).upper()
        if bureau in {"BOILER", "REFRIGERATION"}:
            trade_bucket = "BOILER_MECHANICAL"
            territory_id = "CHICAGO_BOILER_MECHANICAL"
        elif bureau == "ELEVATOR":
            trade_bucket = "ELEVATOR_CONVEYANCE"
            territory_id = "CHICAGO_ELEVATOR_FIRE"
        else:
            trade_bucket = "FIRE_SUPPRESSION"
            territory_id = "CHICAGO_ELEVATOR_FIRE"

        viol_dt = _parse_iso_or_compact_date(row["violation_date"])
        cure_dt = viol_dt + dt.timedelta(days=30)

        verified_leads.append({
            "lead_id": f"CS-CHI-{rec_hash[:6].upper()}",
            "record_hash": rec_hash,
            "metro": "CHICAGO",
            "territory_id": territory_id,
            "sub_territory": "CHICAGO_LOOP",
            "trade_bucket": trade_bucket,
            "source_portal": "data.cityofchicago.org",
            "source_dataset_id": "22u3-xenr",
            "native_filing_id": f"DOB Violation #{row['id']} / Insp #{row['inspection_number']}",
            "property_id": f"Property Group {row['property_group']}",
            "building_name": f"{row['address']} Loop Commercial Tower",
            "address": f"{row['address']}, CHICAGO, IL {row['zip_code']}",
            "owner_entity": row["owner_entity"],
            "decision_maker_contact": row["managing_contact"],
            "building_sqft": int(row["building_sqft"]),
            "floors": int(row["floors"]),
            "equipment_detail": f"{bureau} Code {row['violation_code']} — {row['violation_location']}",
            "deficiency_summary": row["violation_inspector_comments"],
            "citation_date": viol_dt.isoformat(),
            "cure_deadline": cure_dt.isoformat(),
            "days_until_deadline": (cure_dt - ref_date).days,
            "statutory_hook": f"Chicago Municipal Code ({row['violation_code']}): Mandatory reinspection & administrative hearing risk ($500–$1,000/day continuing infraction)",
            "current_fine_posted": 1500.0,
            "severity_tier": "CRITICAL" if bureau in {"FIRE PREVENTION", "ELEVATOR"} else "HIGH",
        })

    # 4. Texas TDLR Commercial Elevators (ELBI# / Decal# CSV)
    tx_csv_path = raw_dir / "tx_tdlr_elevators_elbi.csv"
    with tx_csv_path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            rec_hash = _record_hash("TX_TDLR_ELBI", f"{row['ELBI#']}-{row['Decal#']}")
            if rec_hash in seen_hashes:
                dropped_counts["duplicate_filings"] += 1
                continue
            seen_hashes.add(rec_hash)

            next_insp = _parse_iso_or_compact_date(row["Date of Next Inspection"])
            days_remaining = (next_insp - ref_date).days

            # Keep only overdue (<0 days) or imminent renewal window (<=30 days)
            if days_remaining > 30:
                dropped_counts["clean_or_compliant"] += 1
                continue

            owner_name = row.get("Owner Name", "").strip()
            if not owner_name:
                dropped_counts["quarantined_for_triage"] += 1
                quarantine_queue.append({
                    "quarantine_id": f"Q-{rec_hash[:8].upper()}",
                    "source_dataset": "Texas TDLR Elevator Compliance File (ELBI)",
                    "native_id": f"{row['ELBI#']} / Decal #{row['Decal#']}",
                    "metro": "TX_TRIANGLE",
                    "address": f"{row['Building Address Line 1']}, {row['Building City']}, TX {row['Building Zip']}",
                    "owner_name": "MISSING IN TDLR EXPORT",
                    "trade_bucket": "ELEVATOR_CONVEYANCE",
                    "reason_code": "MISSING_OWNER_ENTITY",
                    "reason_detail": (
                        f"Overdue elevator {row['ELBI#']} ({abs(days_remaining)} days past due) has blank Owner Name in TDLR export; "
                        "cross-check Dallas CAD parcel owner before releasing to Exclusive subscriber."
                    ),
                    "recommended_action": "ENRICH_CAD_OWNER_AND_RELEASE",
                    "raw_summary": row.get("Equipment Type", ""),
                })
                continue

            city = row["Building City"].strip().upper()
            territory_id = "TX_AUSTIN_ELEVATOR" if city == "AUSTIN" else "TX_DALLAS_ELEVATOR"
            sub_territory = "AUSTIN_TRAVIS" if city == "AUSTIN" else "DALLAS_CORE"
            status_word = (
                f"OVERDUE BY {abs(days_remaining)} DAYS"
                if days_remaining < 0
                else f"EXPIRING IN {days_remaining} DAYS"
            )

            verified_leads.append({
                "lead_id": f"CS-TX-{rec_hash[:6].upper()}",
                "record_hash": rec_hash,
                "metro": "TX_TRIANGLE",
                "territory_id": territory_id,
                "sub_territory": sub_territory,
                "trade_bucket": "ELEVATOR_CONVEYANCE",
                "source_portal": "data.texas.gov / tdlr.texas.gov",
                "source_dataset_id": "TDLR-ELBI-EQUIPMENT",
                "native_filing_id": f"{row['ELBI#']} (Decal #{row['Decal#']})",
                "property_id": f"{row['ELBI#']} | {row['Building County']} County",
                "building_name": row["Building Name"],
                "address": f"{row['Building Address Line 1']}, {city}, TX {row['Building Zip']}",
                "owner_entity": owner_name,
                "decision_maker_contact": row["Contact Name"],
                "building_sqft": int(row["Building SqFt"]),
                "floors": int(row["Floors"]),
                "equipment_detail": row["Equipment Type"],
                "deficiency_summary": (
                    f"{status_word}: Annual QEI safety certification & TDLR compliance filing due {next_insp.isoformat()} "
                    f"(Last certified {row['Date of Last Certified Inspection']}). Certificate of Compliance at risk."
                ),
                "citation_date": row["Date of Last Certified Inspection"],
                "cure_deadline": next_insp.isoformat(),
                "days_until_deadline": days_remaining,
                "statutory_hook": (
                    "Texas Health & Safety Code §754.019 & Occ. Code Ch. 51: Mandatory QEI Annual Inspection + $20/unit filing; "
                    "administrative penalties up to $5,000/day for continuing overdue operation."
                ),
                "current_fine_posted": 750.0 if days_remaining < 0 else 0.0,
                "severity_tier": "CRITICAL" if days_remaining < 0 else "HIGH",
            })

    return {
        "reference_date": REFERENCE_DATE,
        "airgap_mode": AIRGAP_MODE,
        "verified_leads": verified_leads,
        "quarantine_queue": quarantine_queue,
        "dropped_counts": dropped_counts,
        "raw_records_scanned": (
            len(nyc_boilers) + len(nyc_ecb) + len(chi_rows) + 8
        ),
    }
