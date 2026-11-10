# CiteSignal — 20-Minute / Month Founder Operations Runbook

**Hard Constraint:** Total founder involvement must never exceed **20.0 minutes per calendar month**.  
**Engineered Steady-State Load:** **14.8 minutes/month average** (15.4 minutes peak).

---

## 1. Division of Labor: What Runs 100% Unattended vs. What You Touch

| Workflow Layer | Frequency | Owner | Human Minutes |
| :--- | :--- | :--- | :---: |
| Socrata / TDLR Open-Data Polling (`ingest_and_normalize.py`) | Daily 05:30 AM Cron | Autonomous Pipeline | **0.0m** |
| Commercial PLUTO Tax-Lot Join, Dedup & Urgency Scoring (`lead_scorer.py`) | Daily 05:35 AM Cron | Autonomous Pipeline | **0.0m** |
| Subscriber HTML + CSV Digest Compilation & Delivery (`digest_generator.py`) | Weekly Mon 06:00 AM | Autonomous Pipeline | **0.0m** |
| Checkout Provisioning, Seat-Cap Decrement & Card Retries | Real-Time Webhook | Stripe Billing + Portal | **0.0m** |
| `UNSUBSCRIBE` / Bounce Ingestion (`state/suppression_list.json`) | Real-Time Webhook | Postmark Suppression Hook | **0.0m** |
| **First-Tuesday Executive Review & Batch Gate** | **1x / Month** | **Founder (You)** | **14.8m – 17.5m** |

---

## 2. The Monthly 4-Step Checklist (First Tuesday of Month, 20:00 Clock)

Open `index.html` and click **`Founder Ops Console (≤20m/mo)`** &rarr; **`Start 20-Min Monthly Session`**.

### Step 1: Telemetry & Payout Reconciliation (Minutes 00:00 – 04:00)
1. Confirm **Pipeline Health** is `GREEN` (zero Socrata HTTP 4xx/5xx schema alerts in `deliverables/founder_packets/2026_11_FOUNDER_20MIN_BRIEF.md`).
2. Verify active MRR and cumulative net profit against the `$20,000` Year-1 trajectory line.
3. Confirm automated monthly Stripe bank payout landed cleanly.

### Step 2: Quarantine Exception Queue Triage (Minutes 04:00 – 10:00)
*Why this exists:* Whenever a municipal filing has mixed-use commercial/residential ambiguity (`PLUTO LandUse=04`), an unmapped `BIN`, or a blank `Owner Name`, CiteSignal **quarantines** the record rather than risking bad data in a paid subscriber feed or crashing the cron job.
1. Inspect the 2–5 quarantined records in the **Quarantine Exception Queue** table.
2. Click **`Approve`** if commercial mechanical/elevator scope is clear (e.g., commercial podium boiler plant), or **`Drop`** if ambiguous. *(Rule of thumb: if deciding takes >45 seconds, click **`Drop`**—never burn time researching a single row).*

### Step 3: Live-Lead Proof Outbound Batch Approval (Minutes 10:00 – 15:00)
1. Review the pre-generated **Live-Lead Proof Outbound Batch** table (`outbound_drafter.py`).
2. Spot-check 2 `.EML` previews to confirm:
   - Active state/city license number matches the trade (`MP-`, `OB-`, `EA-`, `FSC-`, `ELC-`).
   - Target territory has open seats (`Exclusive-Locked` territories are skipped automatically).
   - Opted-out addresses in `state/suppression_list.json` were excluded.
3. Click **`1-Click Approve Monthly Proof Batch`**. *(In this air-gapped prototype, approval commits locally to `deliverables/outbox_airgapped/` without sending external emails).*

### Step 4: Zero-Argue Refund Check & Sign-Off (Minutes 15:00 – 17:00)
1. Check if any subscriber replied requesting cancellation or disputing a lead outside the self-serve Stripe Customer Portal.
2. **Enforce the Iron Support Rule ("Zero-Argue 14-Day Auto-Refund"):**
   - **NEVER** write custom explanations, hop on phone calls, or negotiate scope.
   - Issue a 1-click full refund + cancel subscription + auto-release the territory seat back to open inventory. Losing one `$199` charge costs far less than losing your 20-minute monthly ceiling.
3. Click **`Mark Monthly Session Complete`** and **`Export Session Audit JSON`**. Close tab until next month.

---

## 3. Compliance, Legal & Safety Boundaries

1. **Pure Public-Record Information Publishing:** CiteSignal aggregates and formats public municipal open-data records (`data.cityofnewyork.us`, `data.cityofchicago.org`, `data.texas.gov`). It does not provide engineering certifications, legal advice, or regulated brokerage services.
2. **Strict CAN-SPAM & B2B Outreach Hygiene:** Every outbound proof draft includes an accurate physical postal address, clear commercial context tied to the recipient's active public trade license, non-deceptive subject lines citing the exact filing, and 1-click/reply permanent suppression (`state/suppression_list.json`).
3. **Air-Gap Prototype Lock (`AIRGAP_MODE = True`):** In this repository build, `pipeline/__init__.py` sets `AIRGAP_MODE = True`, raising `AirGapViolationError` if any code attempts live network mutations, external emails, government form submissions, or live payment charges.

---

## 4. Cutover Checklist (When Ready to Move from Air-Gap to Live Production)

1. Register primary domain + dedicated outbound domain on Cloudflare; configure SPF, DKIM, and DMARC records in Postmark.
2. Create 3 Stripe Payment Links / Products (`Pro $199/mo`, `Exclusive $499/mo`, `Audit Pack $149 one-time`) + enable Stripe Self-Serve Customer Portal + configure `checkout.session.completed` & `customer.subscription.deleted` webhooks to update `state/citesignal.db`.
3. Generate free Socrata App Tokens on `data.cityofnewyork.us`, `data.cityofchicago.org`, and `data.texas.gov`.
4. Flip `AIRGAP_MODE = False` in environment config and enable the scheduled GitHub Actions workflow.
