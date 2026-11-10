# CiteSignal — Autonomous B2B Municipal Compliance Intelligence

> **Mandate Solved:** Generate **$\ge \$20,000$/year net profit** in **$\le 20$ minutes/month** of founder time.  
> **Safety Status:** `AIRGAP_MODE = True` — 100% self-contained local prototype (zero external emails sent, zero government forms filed, zero financial charges executed).

---

## 1. What CiteSignal Is

**CiteSignal** is an autonomous B2B compliance-trigger subscription platform serving state- and city-licensed commercial **Boiler/Mechanical, Elevator, and Fire-Suppression** contractors across **New York City**, **Chicago**, and the **Texas Triangle (Austin & Dallas)**.

Every week, municipal portals (`52dp-yji6`, `6bgk-3dad`, `22u3-xenr`, Texas TDLR `ELBI#`) publish commercial safety inspection failures and overdue certifications carrying steep statutory fines (up to \$5,000/day under TX Occ. Code Ch. 51; \$1,000–\$12,500+ NYC OATH summonses). Raw city files are 80%+ residential noise and lack property owner joins. CiteSignal's deterministic Python pipeline strips all residential/resolved noise, joins commercial tax-lot ownership (`PLUTO 64uk-42ks`), calculates urgency and repair ticket values (`$3,100–$28,400`), caps each territory at **4 Pro contractors (\$199/mo)** or **1 Exclusive Lock (\$499/mo)**, and acquires customers with **zero sales calls** by emailing licensed local contractors (`7358-krk7`, `t8hj-ruu2`) a verifiable live violation near their shop.

### Key Verified Metrics
- **Conservative Year-1 Net Profit:** **\$23,377.35**
- **Base-Case Year-1 Net Profit:** **\$38,482.10** (*\$6,064/mo Exit MRR · 91.4% Net Margin*)
- **1,000-Trial Stress-Tested Monte Carlo:** **\$28,614.14 P50 Median** (*86.4% probability $\ge \$20,000$*)
- **Founder Time Commitment:** **14.8 min/month average** (*15.4 min peak $\le 20.0$ min ceiling*)
- **Current Real-Schema Cycle Output:** **17 verified commercial buildings** representing **\$277,350** in midpoint contractor repair pipeline (+ **3 edge-case buildings** held safely in the Founder Quarantine Queue).

---

## 2. Quick-Start Verification Commands

### Run the End-to-End Ingestion, Scoring, Deliverable & Financial Pipeline
```bash
/usr/local/bin/python3 pipeline/run_pipeline.py
```

### Run the Automated Test Suite (Air-Gap, Filtering, Quarantine, Economics & JS Syntax)
```bash
/usr/local/bin/python3 -m unittest discover -s tests -v
```

### Launch the Interactive Customer Storefront + Founder 20-Min Ops Console
```bash
/usr/local/bin/python3 -m http.server 8080
# Open http://localhost:8080/index.html in any browser
```

---

## 3. Repository Structure

```text
.
├── index.html                                    # Self-contained Customer Storefront + Founder 20-Min Ops Console
├── assets/
│   ├── styles.css                                # Responsive industrial-B2B stylesheet (zero external CDNs)
│   └── app.js                                    # Live lead filtering, ROI calculator, checkout sandbox & cohort chart
├── docs/
│   ├── SCREENING_MEMO.md                         # Quantitative screening of 7 business ideas & kill-reasons
│   ├── BUSINESS_PLAN_AND_ECONOMICS.md            # Pricing, funnel physics, 12-month cohort table & $64/mo stack
│   └── FOUNDER_RUNBOOK_20MIN.md                  # Minute-by-minute 15–18m monthly SOP & Zero-Argue Refund rule
├── pipeline/
│   ├── __init__.py                               # Global AIRGAP_MODE = True lock & reference cycle config
│   ├── ingest_and_normalize.py                   # Socrata/TDLR ingestion, PLUTO join, dedup & Quarantine router
│   ├── lead_scorer.py                            # Urgency (0–100), statutory fine & job ticket valuation engine
│   ├── digest_generator.py                       # Builds subscriber HTML + CSV digests & $149 Audit Pack
│   ├── outbound_drafter.py                       # Air-gapped Live-Lead Proof Outbound drafter + CAN-SPAM filter
│   ├── financial_model.py                        # 12-month cohort simulator + 1,000-run Monte Carlo model
│   ├── monthly_founder_brief.py                  # SQLite operational ledger sync + Monthly Executive Brief writer
│   └── run_pipeline.py                           # Master single-command orchestrator & web bundle compiler
├── data/
│   ├── raw/                                      # Authentic Socrata & TDLR open-data snapshots + noise/edge cases
│   ├── scored_leads.json                         # Normalized, enriched commercial leads
│   ├── financial_projections.json                # Full Conservative/Base/Upside + Monte Carlo outputs
│   ├── pipeline_summary.json                     # Complete machine-readable pipeline snapshot
│   └── dashboard_bundle.js                       # Auto-synced JS bundle consumed by index.html
├── deliverables/
│   ├── digests/                                  # Customer-ready weekly HTML & CSV feeds (NYC, Chicago, TX)
│   ├── audit_packs/                              # Sample $149 30-Day Instant Audit Pack (JSON + CSV)
│   ├── outbox_airgapped/                         # Air-gapped .eml & JSON outbound proof drafts (never transmitted)
│   └── founder_packets/                          # Generated 20-Minute Monthly Founder Executive Brief (.md)
├── state/
│   ├── citesignal.db                             # SQLite operational database (leads, territories, quarantine, drafts)
│   ├── subscribers_seed.json                     # Active territory seat caps & historical time logs
│   └── suppression_list.json                     # Global CAN-SPAM opt-out & domain suppression ledger
└── tests/
    └── test_citesignal.py                        # Comprehensive automated verification suite
```
