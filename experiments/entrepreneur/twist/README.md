# Prebid Brief V2 (`CivicSignal`) — Anti-Jagged Public-Data Venture & 4-Persona Red-Team Arena

**Experiment 3 Twist (`experiments/entrepreneur/twist`)**  
Grounded in Ethan Mollick's *"Fable 5.2 and Jagged AGI"* prompt (*"Launch a business to make me money, I want at least $20,000 in a year. It should take no more than 20 minutes a month from me"*).

## Why V1 Failed ("The Jagged Frontier") vs. How V2 Solves It

Fable 5.2 screened 22 ideas and identified **Prebid Brief**: extracting early pre-RFP municipal water, wastewater, stormwater, and park equipment replacement signals before formal bids hit BidNet/DemandStar. While the arbitrage thesis was strong, the V1 agent lacked institutional and legal judgment—proposing to **autonomously submit commercial FOIA requests to City Clerks** and **blast unmonitored cold emails**.

This repository implements the **Three-Stage Adversarial Multi-Agent Protocol**:

1. **Stage 1 — 22-Idea Asymmetric Arbitrage Screening + Deterministic Python Pipeline (`pipeline.py`)**:
   - Evaluates 22 autonomous business candidates across gross margin, open-data durability, statutory/ToS safety, churn, and the `<= 20 min/month` founder cap.
   - Ingests **20 real, web-verified FY 2025–2026 U.S. municipal CIP & council agenda projects** across 13 states (`$54,654,749` verified FY CIP scope; `$19,149,000` estimated OEM equipment TAM; `147.8-day` mean pre-RFP lead window) plus 1 synthetic V1 FOIA trap (`V1-FOIA-TRAP-999`) that is hard-quarantined at ingestion.
   - Executes deterministic currency regex + character `[start:end]` span-offset verification, routing 16 clean leads to `AUTO_VERIFIED` and 4 nuanced multi-year / `$0`-deferral / GMP-amendment items to the **18-Minute Monthly Founder Cockpit**.

2. **Stage 2 — 4-Persona Hostile Red-Team Audit (`red_team_audit.json`)**:
   - **VETO-REP-01 (15-Yr Municipal Equipment Territory Rep)**: Kills post-RFP BidNet overlap and multi-year umbrella budget conflation; enforces 90–240d Basis-of-Design window + spec-influence role targeting.
   - **VETO-CLERK-01 (Master Municipal Clerk, MMC)**: Kills automated commercial FOIA filings (`AZ A.R.S. § 39-121.03`, `KY KRS § 61.874`, `VA FOIA § 2.2-3704`); enforces passive open-API allowlist (`Legistar OData`, `OpenGov`, `ClearGov`, published CIP books).
   - **VETO-LEGAL-01 (B2B SaaS & Messaging Counsel)**: Kills unmonitored cold SMTP outreach and scraped PII; enforces Hardware-Style Air-Gap Lock, verbatim citation spans, and opt-in trade association sponsorships (`SWEMA`, `WWEMA`, `NRPA`).
   - **VETO-CFO-01 (Unit-Economics & Ops CFO)**: Kills 201 fragile HTML DOM spiders (`690 min/mo` repair burden) and low-ARPU pricing; proves **3 standardized schemas + `$199 Solo / $449 Agency` territory seats** clear **`$33,254.01` Year-1 Net Profit** (`$54,623.64/yr` M12 run-rate) in **`17.5 minutes/month`**.

3. **Stage 3 — Self-Contained Dual-Mode Web Application (`index.html`, `styles.css`, `app.js`)**:
   - Zero external runtime CDNs; works both via local HTTP server and direct `file://` open.
   - **01 // CivicSignal Pre-RFP Feed**: Live filterable territory feed, SVG pre-RFP timeline & vertical TAM charts, verbatim `[start:end]` span highlighting, Rep ROI calculator, and 1-click RFC-4180 CSV export.
   - **02 // Adversarial Red-Team War Room & V1→V2 Diff**: Interactive 4-persona cross-examination, quarantined FOIA trap proof, side-by-side code governance diffs, and live 12-month CFO cashflow + parser-breakage simulator.
   - **03 // 22-Idea Asymmetric Arbitrage Funnel**: Interactive feasibility quadrant SVG scatter plot + sortable 22-venture matrix.
   - **04 // 18-Minute Monthly Founder Cockpit**: Hardware-style Air-Gap interlock (with V1 FOIA/SMTP penetration test interceptors), live monthly time-budget stopwatch (`17m 30s / 20m 00s`), 3-click exception span triage, and SHA-256 batch digest signing.

## Re-Running Verification Locally

```bash
/usr/local/bin/python3 pipeline.py
/Users/rkaranjai/.nvm/versions/node/v24.21.0/bin/node --check data_bundle.js
/Users/rkaranjai/.nvm/versions/node/v24.21.0/bin/node --check app.js
```
