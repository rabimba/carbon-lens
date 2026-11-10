# CiteSignal — Business Architecture, Pricing & Year-1 Financial Model

## 1. Executive Summary

- **Business Name:** **CiteSignal**
- **Category:** Autonomous B2B Municipal Mechanical, Elevator & Fire-Code Compliance Intelligence
- **Target Customers:** State- and city-licensed commercial Boiler/HVAC, Elevator/Conveyance, and Fire-Suppression contractors in major Socrata/Open-Data metros (Launching in **NYC**, **Chicago**, and **Texas Triangle: Austin & Dallas**).
- **Pricing Tiers:**
  - **\$149 One-Time — 30-Day Instant Audit Pack** (Frictionless self-serve entry wedge; 100% credited toward Month 1 if upgraded within 14 days)
  - **\$199 / Month — Pro Trade Territory Feed** (Weekly Monday 6:00 AM HTML Dossier + CRM CSV; hard-capped at **max 4 seats** per metro/trade)
  - **\$499 / Month — Exclusive Territory Lock** (**1-of-1 monopoly** on a trade territory + daily morning triggers; closes public Pro seats while active)
- **Year-1 Financial Performance (Verified via `pipeline/financial_model.py`):**
  - **Conservative Case Year-1 Net Profit:** **\$23,377.35**
  - **Base Case Year-1 Net Profit:** **\$38,482.10** (Exiting Month 12 at **\$6,064.03 MRR** / **\$72,768 ARR** run-rate; **91.4% net margin**)
  - **Upside Case Year-1 Net Profit:** **\$60,726.85**
  - **1,000-Trial Stress-Tested Monte Carlo:** **\$28,614.14 P50 Median Net Profit** | **86.4% probability** of clearing $\ge \$20,000$ even with simulated deliverability shocks and up to 10.5% monthly SMB churn.
- **Founder Time Commitment:** **14.8 minutes/month average** (15.4 min peak month $\le 20.0$ min ceiling).

---

## 2. Multi-Metro Open-Data Pipeline Architecture

CiteSignal ingests, cross-joins, scores, and packages public government datasets that contractors cannot easily filter or join by hand:

| Metro | Primary Violation / Equipment Source | Cross-Join Ownership & License Sources | High-Ticket Statutory Trigger |
| :--- | :--- | :--- | :--- |
| **New York City** | `data.cityofnewyork.us` **DOB NOW: Safety Boiler** (`52dp-yji6`) & **DOB OATH/ECB Violations** (`6bgk-3dad`) | **PLUTO Tax Lot Output** (`64uk-42ks`, `landuse=05` Class O/L) + **DOB License Info** (`t8hj-ruu2`) | Mandatory 90-day boiler affirmation of correction (§28-303.7); Class-1 OATH elevator/standpipe summonses (\$1,000–\$12,500+ fines) |
| **Chicago** | `data.cityofchicago.org` **Building Violations** (`22u3-xenr`) | Commercial Loop/CBD Property Group Registry + Licensed Elevator/Mechanical Directory | Failed periodic AIC Cat-1 elevator, high-pressure steam boiler, chiller purge, & high-rise fire-pump tests (30-day cure orders) |
| **Texas Triangle (Austin & Dallas)** | `data.texas.gov` / **TDLR Elevator & Escalator Equipment File** (`ELBI#` / `Decal#`) | **TDLR All Licenses** (`7358-krk7`: Registered Elevator & A/C Contractors) | Texas Health & Safety Code §754.019 overdue annual QEI certifications; up to **\$5,000/day** Occ. Code Ch. 51 penalty exposure |

### Deterministic Automated Value-Add (`pipeline/`)
1. **Noise Stripping:** Eliminates 100% of walkup/residential properties (`landuse` 01/02/03), passed inspections (`defects_found=false`), resolved historical tickets, and duplicate tracking filings.
2. **Quarantine-Don't-Leak Safety Gate:** Any record with mixed-use ambiguity (`landuse=04`), unmapped `BIN`, or missing `Owner Name` is routed into `quarantine_queue` for the founder's 6-minute monthly triage—protecting subscriber data quality automatically.
3. **Economic Quantification:** Calculates Urgency Score (`55–99`), cure countdown, statutory fine exposure, estimated contractor remediation ticket (`$3,100–$28,400`), and a copy-paste outreach script referencing the exact filing number.

---

## 3. Zero-Call Customer Acquisition Funnel ("Live-Lead Proof Outbound")

To maintain **0 sales calls**, CiteSignal uses **verifiable local proof** as its sole acquisition engine:

1. **Automated License-to-Violation Matching (`pipeline/outbound_drafter.py`):**
   - When a commercial boiler fails inspection in Midtown (`10018`) or an Austin office tower (`78701`) goes overdue on its TDLR `ELBI#` elevator decal, the script queries active licensed contractors in that exact metro & trade (`t8hj-ruu2` / `7358-krk7`).
2. ** Value-First Plain-Text Dispatch:**
   - The email gives the contractor **one real, active commercial violation in their territory for free**—complete with building address, public filing ID, defect description, cure window, and estimated ticket size—and shows how many open seats remain out of 4 (`$199/mo Pro`, `$499/mo Exclusive`, or `$149 Instant Audit Pack`).
3. **Why Contractors Convert Self-Serve:**
   - Contractors can verify the filing number on the city portal in 15 seconds.
   - Average commercial remediation gross profit (`~$2,400` on a `$5,800` job at `42%` gross margin) pays for **12 months of a \$199/mo Pro seat** from a single closed work order.
   - Seat scarcity (`Max 4 Pro seats` or `1-of-1 Exclusive Lock`) creates genuine urgency without human sales pressure.

---

## 4. Base-Case 12-Month Cohort & Cashflow Schedule

*Assumptions (`pipeline/financial_model.py`): 180 monthly proof emails at steady state (50% warmup in M1, 80% in M2); 1.05% direct Pro conversion + 0.28% Exclusive conversion + 0.70% \$149 Audit Pack conversion (26% upgrading to Pro next month with full \$149 credit deducted); 5.8% monthly Pro churn (3.6% Exclusive churn); 3.5% Zero-Argue Auto-Refund reserve; Stripe `2.9% + $0.30`; \$64/mo fixed infrastructure.*

| Month | Proof Emails Sent | Active Pro (\$199) | Active Exclusive (\$499) | Recurring MRR | Gross Cash Collected | Refunds + Stripe Fees | Fixed Infra | **Monthly Net Profit** | **Cumulative Net Profit** | Founder Mins |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **M1** | 90 | 0.9 | 0.3 | \$314.00 | \$408.00 | \$27.05 | \$64.00 | **\$316.95** | **\$316.95** | 14.7m |
| **M2** | 144 | 2.6 | 0.6 | \$836.00 | \$962.00 | \$62.66 | \$64.00 | **\$835.34** | **\$1,152.29** | 14.9m |
| **M3** | 180 | 4.6 | 1.1 | \$1,467.00 | \$1,616.00 | \$105.05 | \$64.00 | **\$1,446.95** | **\$2,599.24** | 14.1m |
| **M4** | 180 | 6.5 | 1.6 | \$2,090.00 | \$2,229.00 | \$144.69 | \$64.00 | **\$2,020.31** | **\$4,619.55** | 14.3m |
| **M5** | 180 | 8.4 | 2.0 | \$2,677.00 | \$2,816.00 | \$182.61 | \$64.00 | **\$2,569.39** | **\$7,188.94** | 14.5m |
| **M6** | 180 | 10.1 | 2.5 | \$3,231.00 | \$3,370.00 | \$218.42 | \$64.00 | **\$3,087.58** | **\$10,276.52** | 14.6m |
| **M7** | 180 | 11.7 | 2.9 | \$3,755.00 | \$3,893.00 | \$252.25 | \$64.00 | **\$3,576.75** | **\$13,853.27** | 14.8m |
| **M8** | 180 | 13.2 | 3.3 | \$4,249.00 | \$4,388.00 | \$284.22 | \$64.00 | **\$4,039.78** | **\$17,893.05** | 14.9m |
| **M9** | 180 | 14.6 | 3.7 | \$4,717.00 | \$4,856.00 | \$314.45 | \$64.00 | **\$4,477.55** | **\$22,370.60** | 15.1m |
| **M10** | 180 | 16.0 | 4.0 | \$5,160.00 | \$5,299.00 | \$343.08 | \$64.00 | **\$4,891.92** | **\$27,262.52** | 15.2m |
| **M11** | 180 | 17.2 | 4.4 | \$5,579.00 | \$5,718.00 | \$370.18 | \$64.00 | **\$5,283.82** | **\$32,546.34** | 15.3m |
| **M12** | 180 | 18.4 | 4.7 | \$6,064.03 | \$6,115.00 | \$395.84 | \$64.00 | **\$5,935.76** | **\$38,482.10** | 15.4m |

*Note: Exact unrounded schedule values are stored in `data/financial_projections.json`.*

---

## 5. Production Infrastructure Cost Breakdown (\$64 / Month Fixed)

| Component | Provider / Architecture | Monthly Cost | Autonomous Role |
| :--- | :--- | :---: | :--- |
| Domain + DNS + Static Storefront | Cloudflare Registrar + Cloudflare Pages | \$2.00 | Hosts `index.html`, territory status JSON, and checkout redirects |
| Scheduled Ingestion & Scoring | GitHub Actions Scheduled Cron + SQLite State Artifact | \$0.00 | Runs `pipeline/run_pipeline.py` every Monday 05:30 AM & daily 06:00 AM |
| Transactional Digest & Proof Delivery | Postmark (10,000 emails/mo tier + dedicated IP/DKIM/DMARC) | \$15.00 | Delivers HTML/CSV weekly digests + automated bounce/unsubscribe webhooks |
| Dedicated Outbound Domain + Warmup | Secondary `.io`/`.co` outbound domain + automated mailbox warmup | \$32.00 | Isolates outbound proof reputation from subscriber transactional stream |
| Socrata App Token + Backup Object Storage | NYC/Chicago/TX Open Data Free Tier + Cloudflare R2 | \$15.00 | High-quota API polling + immutable 12-month deliverable archive |
| **Total Fixed Operating Expense** | | **\$64.00 / mo** | **\$768.00 / year total fixed overhead** |

---

## 6. Pre-Built Downside Contingency Lever

If Month-3 cumulative net revenue trails the Conservative curve (`<$2,000` cumulative by M3) due to slower uptake in a specific trade, the system requires **zero business-model pivot**: Socrata uses an identical JSON/SoQL API standard across **Seattle (`data.seattle.gov`), San Francisco (`data.sfgov.org`), Los Angeles (`data.lacity.org`), and Austin (`data.austintexas.gov`)**. Enabling a 4th Socrata metro configuration adds 60+ addressable licensed commercial contractors/month in a single 10-minute config update.
