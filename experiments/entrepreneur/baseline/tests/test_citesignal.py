#!/usr/bin/env python3
"""
End-to-end automated verification suite for CiteSignal.
Verifies:
  1. Strict Air-Gap Safety Lock (`AirGapViolationError` raised on live network flag)
  2. Noise stripping (residential walkups, clean inspections, resolved tickets, duplicates = 0 leaks)
  3. Quarantine routing (mixed-use LandUse=04, unmapped BIN, blank TDLR owner isolated)
  4. CAN-SPAM suppression + Exclusive Territory seat-lock enforcement in outbound drafts
  5. Financial physics: Conservative & Base Year-1 Net Profit >= $20,000; Founder time <= 20m/mo
  6. SQLite ledger, HTML/CSV deliverables, and JS browser bundle integrity
"""

from __future__ import annotations

import csv
import json
import sqlite3
import subprocess
import sys
import unittest
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from pipeline import AIRGAP_MODE
from pipeline.ingest_and_normalize import AirGapViolationError, assert_airgap_safe
from pipeline.run_pipeline import run_full_pipeline


class TestCiteSignalPlatform(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.bundle = run_full_pipeline(BASE_DIR)

    def test_01_airgap_lock_enforced(self) -> None:
        self.assertTrue(AIRGAP_MODE)
        with self.assertRaises(AirGapViolationError):
            assert_airgap_safe("attempt_live_smtp_send", allow_network=True)

    def test_02_noise_and_residential_zero_leakage(self) -> None:
        leads = self.bundle["scored_leads"]
        self.assertEqual(len(leads), 17)
        addresses = " | ".join(l["address"] for l in leads).upper()
        # Residential walkups & compliant towers must NEVER appear in subscriber feeds
        self.assertNotIn("STERLING PLACE", addresses)
        self.assertNotIn("LINCOLN AVE", addresses)
        self.assertNotIn("301 CONGRESS", addresses)
        self.assertNotIn("104 S MICHIGAN", addresses)
        self.assertNotIn("350 5TH AVENUE", addresses)

        # Duplicate tracking number 2026-1014522Y0001-88412 must appear only once
        filings = [l["native_filing_id"] for l in leads]
        self.assertEqual(filings.count("2026-1014522Y0001-88412"), 1)

    def test_03_quarantine_queue_catches_ambiguous_records(self) -> None:
        q = self.bundle["quarantine_queue"]
        self.assertEqual(len(q), 3)
        codes = {item["reason_code"] for item in q}
        self.assertEqual(
            codes,
            {"MIXED_USE_LANDUSE_04", "UNMAPPED_PLUTO_BIN", "MISSING_OWNER_ENTITY"},
        )

    def test_04_outbound_suppression_and_exclusive_seat_locks(self) -> None:
        batch = self.bundle["outbound_batch"]
        self.assertEqual(batch["skipped_suppressed"], 1)
        self.assertGreaterEqual(batch["skipped_exclusive_locked_or_full"], 4)

        recipients = {d["recipient_email"] for d in batch["drafts"]}
        self.assertNotIn("optout@hillcountrylift.example", recipients)

        pitched_territories = {d["territory_id"] for d in batch["drafts"]}
        # Exclusive-locked territories must NEVER be pitched to new prospects
        self.assertNotIn("NYC_ELEVATOR_CONVEYANCE", pitched_territories)
        self.assertNotIn("CHICAGO_ELEVATOR_FIRE", pitched_territories)
        self.assertNotIn("TX_DALLAS_ELEVATOR", pitched_territories)

    def test_05_financial_goal_and_20_min_ceiling_satisfied(self) -> None:
        fin = self.bundle["financials"]
        cons = fin["scenarios"]["conservative"]
        base = fin["scenarios"]["base"]

        self.assertGreaterEqual(cons["year1_net_profit_usd"], 20000.0)
        self.assertGreaterEqual(base["year1_net_profit_usd"], 30000.0)
        self.assertLessEqual(cons["max_founder_minutes_any_month"], 20.0)
        self.assertLessEqual(base["max_founder_minutes_any_month"], 20.0)

    def test_06_deliverables_and_sqlite_integrity(self) -> None:
        db_path = BASE_DIR / "state" / "citesignal.db"
        self.assertTrue(db_path.exists())
        conn = sqlite3.connect(str(db_path))
        try:
            lead_cnt = conn.execute("SELECT COUNT(*) FROM leads").fetchone()[0]
            q_cnt = conn.execute("SELECT COUNT(*) FROM quarantine_queue").fetchone()[0]
            self.assertEqual(lead_cnt, 17)
            self.assertEqual(q_cnt, 3)
        finally:
            conn.close()

        for digest in self.bundle["deliverables"]["digests"]:
            csv_file = BASE_DIR / digest["csv_relpath"]
            html_file = BASE_DIR / digest["html_relpath"]
            self.assertTrue(csv_file.exists())
            self.assertTrue(html_file.exists())
            with csv_file.open("r", encoding="utf-8") as fh:
                rows = list(csv.DictReader(fh))
                self.assertEqual(len(rows), digest["lead_count"])

    def test_07_javascript_syntax_and_bundle_valid(self) -> None:
        node_bin = "/Users/rkaranjai/.nvm/versions/node/v24.21.0/bin/node"
        for rel in ("data/dashboard_bundle.js", "assets/app.js"):
            proc = subprocess.run(
                [node_bin, "--check", str(BASE_DIR / rel)],
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(proc.returncode, 0, msg=f"JS syntax error in {rel}: {proc.stderr}")


if __name__ == "__main__":
    unittest.main()
