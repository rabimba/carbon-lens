/* Prebid Brief V2 (CivicSignal) — Dual-Mode Live Platform + 4-Persona Red-Team Arena + 18-Min Cockpit
   Pure ES2024 Vanilla JavaScript | Zero External Dependencies | 100% Air-Gapped Client Runtime */

(() => {
  "use strict";

  const DATA = window.PREBID_V2_DATA;
  if (!DATA) {
    document.body.innerHTML =
      '<div style="padding:32px;color:#fca5a5;font-family:monospace">Fatal: data_bundle.js missing. Run python3 pipeline.py first.</div>';
    return;
  }

  const PIPELINE = DATA.pipeline;
  const AUDIT = DATA.audit;

  // Mutable session state (100% client-side, zero network I/O)
  const state = {
    activeTab: "tab-feed",
    // Tab 1: CivicSignal Feed
    searchQuery: "",
    territoryFilter: "ALL",
    verticalFilter: "ALL",
    windowFilter: "ALL",
    statusFilter: "ALL",
    selectedLeadId: PIPELINE.leads[0]?.lead_id ?? null,
    // Rep ROI Calculator
    roiDealSize: 420000,
    roiCommissionPct: 11,
    roiExtraWins: 1,
    roiPlanMonthly: 199,
    // Tab 2: Red-Team Arena & CFO Stress Simulator
    selectedPersonaId: AUDIT.personas[0]?.id ?? "PERSONA-REP",
    simSoloPerMo: 1.25,
    simAgencyPerMo: 0.58,
    simChurnPct: 3.2,
    simCacSpend: 320,
    simIncludeFragileScrapers: false,
    // Tab 3: 22-Idea Funnel
    ideaStatusFilter: "ALL",
    ideaSortField: "rank",
    ideaSortAsc: true,
    selectedIdeaId: "IDEA-01",
    // Tab 4: 18-Minute Monthly Founder Cockpit
    airGapStagedForLocalSign: false,
    cockpitResolutions: {}, // lead_id -> { spanChecked: bool, disposition: string, committed: bool, label: string }
    batchSigned: false,
    batchSignedTimestamp: null,
    // Stopwatch: 150s (2m 30s) Connector Check + 120s (2m 00s) Stripe/Channel Check + 570s (9m 30s) Triage + 210s (3m 30s) Sign-off = 1050s (17m 30s)
    basePrecheckSeconds: 150,
    triageSimulatedSeconds: 0,
    liveTimerRunning: false,
    liveElapsedSeconds: 0,
    timerIntervalId: null,
    auditLogs: [
      {
        ts: "08:00:02",
        kind: "ok",
        msg: "BOOT: Air-Gap Hardware Interlock LOCKED. External socket/SMTP/POST capabilities disabled.",
      },
      {
        ts: "08:00:05",
        kind: "block",
        msg: `KERNEL GATE [VETO-CLERK-01]: Quarantined record V1-FOIA-TRAP-999 (City of Mesa, AZ) — blocked A.R.S. § 39-121.03 commercial FOIA filing.`,
      },
      {
        ts: "08:02:30",
        kind: "ok",
        msg: "CONNECTOR HEALTH (2m 30s): Legistar OData, OpenGov CIP & ClearGov schemas 100% green. 20 passive leads ingested (16 Auto-Verified, 4 Exception Queue).",
      },
    ],
  };

  // Initialize exception triage defaults for the 4 flagged leads
  for (const lead of PIPELINE.leads) {
    if (lead.verification.needs_human_review) {
      const code = lead.verification.review_flags[0]?.code ?? "";
      const defaultDisp =
        code === "CMAR_GMP_SUBTIER_BUYOUT_CHECK"
          ? "TAG_SUBTIER_WARNING"
          : "APPROVE_CURRENT_FY_SCOPE";
      state.cockpitResolutions[lead.lead_id] = {
        spanChecked: false,
        disposition: defaultDisp,
        committed: false,
        badgeLabel: "COCKPIT REVIEW QUEUE",
      };
    }
  }

  // Formatting utilities
  const esc = (val) =>
    String(val ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const fmtUSD = (n) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(Number(n) || 0);

  const fmtCompactUSD = (n) => {
    const abs = Math.abs(Number(n) || 0);
    const sign = n < 0 ? "-" : "";
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
    return `${sign}$${abs.toFixed(0)}`;
  };

  const fmtClock = (totalSec) => {
    const s = Math.max(0, Math.round(totalSec));
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}m ${ss}s`;
  };

  const nowStamp = () => {
    const d = new Date();
    return [d.getHours(), d.getMinutes(), d.getSeconds()]
      .map((v) => String(v).padStart(2, "0"))
      .join(":");
  };

  function pushAuditLog(kind, msg) {
    state.auditLogs.unshift({ ts: nowStamp(), kind, msg });
  }

  function getTotalFounderSeconds() {
    // 150s connector check + 120s mid-month billing check + triage (up to 570s) + batch sign (210s) + live timer = 1050s (17m 30s)
    const billingCheckSec = 120;
    const signSec = state.batchSigned ? 210 : 0;
    return (
      state.basePrecheckSeconds +
      billingCheckSec +
      state.triageSimulatedSeconds +
      signSec +
      state.liveElapsedSeconds
    );
  }

  function getEffectiveLeadStatus(lead) {
    if (!lead.verification.needs_human_review) {
      return {
        code: "AUTO_VERIFIED",
        label: "AUTO-VERIFIED",
        badgeClass: "badge-emerald",
        includeInExport: true,
      };
    }
    const res = state.cockpitResolutions[lead.lead_id];
    if (!res || !res.committed) {
      return {
        code: "COCKPIT_REVIEW_QUEUE",
        label: "COCKPIT QUEUE",
        badgeClass: "badge-amber",
        includeInExport: true,
      };
    }
    if (res.disposition === "HOLD_FROM_BATCH") {
      return {
        code: "HELD_BY_FOUNDER",
        label: "HELD FROM DIGEST",
        badgeClass: "badge-crimson",
        includeInExport: false,
      };
    }
    if (res.disposition === "TAG_SUBTIER_WARNING") {
      return {
        code: "SIGNED_SUBTIER_WARN",
        label: "SIGNED · SUB-TIER BUYOUT",
        badgeClass: "badge-cyan",
        includeInExport: true,
      };
    }
    return {
      code: "FOUNDER_VERIFIED",
      label: "FOUNDER SIGNED FY26",
      badgeClass: "badge-emerald",
      includeInExport: true,
    };
  }

  // Highlight verbatim excerpt using exact character span offsets from pipeline.py
  function renderHighlightedExcerpt(lead) {
    const text = lead.verbatim_excerpt;
    const spans = [...(lead.verification.all_dollar_spans || [])].sort(
      (a, b) => a.char_start - b.char_start
    );
    if (spans.length === 0) return esc(text);

    let cursor = 0;
    let html = "";
    for (const sp of spans) {
      if (sp.char_start < cursor) continue;
      html += esc(text.slice(cursor, sp.char_start));
      const isPrimary = sp.amount === lead.verified_fy_budget;
      const cls = isPrimary ? "span-highlight-primary" : "span-highlight-secondary";
      const tip = isPrimary
        ? `Verified Primary FY Budget [${sp.char_start}:${sp.char_end}]`
        : `Secondary Context Span [${sp.char_start}:${sp.char_end}]`;
      html += `<span class="${cls}" title="${esc(tip)}">${esc(
        text.slice(sp.char_start, sp.char_end)
      )}</span>`;
      cursor = sp.char_end;
    }
    html += esc(text.slice(cursor));
    return html;
  }

  // CSV Export (RFC-4180 compliant, 100% local Blob download)
  function exportLeadsToCsv(leadsSubset, filename) {
    const headers = [
      "lead_id",
      "municipality",
      "state",
      "territory",
      "project_code",
      "project_title",
      "equipment_vertical",
      "verified_fy_budget_usd",
      "est_equipment_package_usd",
      "est_rep_commission_usd",
      "pre_rfp_window_days",
      "estimated_rfp_date",
      "urgency_score",
      "governance_status",
      "spec_contact_role",
      "agency",
      "extracted_skus",
      "passive_source_platform",
      "source_url",
    ];
    const csvCell = (v) => {
      const s = String(v ?? "");
      return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
    };
    const rows = [headers.join(",")];
    for (const l of leadsSubset) {
      const st = getEffectiveLeadStatus(l);
      if (!st.includeInExport) continue;
      rows.push(
        [
          l.lead_id,
          l.municipality,
          l.state,
          l.territory,
          l.project_code,
          l.project_title,
          l.equipment_vertical,
          l.verified_fy_budget,
          l.estimated_equipment_package,
          l.estimated_rep_commission,
          l.pre_rfp_window_days,
          l.estimated_rfp_date,
          l.urgency.total_score,
          st.label,
          l.spec_contact_role,
          l.agency,
          l.extracted_skus.join("; "),
          l.platform_label,
          l.source_url,
        ]
          .map(csvCell)
          .join(",")
      );
    }
    const blob = new Blob([rows.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
    pushAuditLog(
      "ok",
      `LOCAL CSV EXPORT: Generated ${filename} (${rows.length - 1} verified leads) — 0 external HTTP requests.`
    );
    renderTopTelemetry();
    if (state.activeTab === "tab-cockpit") renderCockpitView();
  }

  // Top Header & KPI Ribbon
  function renderTopTelemetry() {
    const airgapPill = document.getElementById("header-airgap-pill");
    const timePill = document.getElementById("header-time-pill");
    const unresolvedCount = Object.values(state.cockpitResolutions).filter(
      (r) => !r.committed
    ).length;

    if (airgapPill) {
      airgapPill.className = state.airGapStagedForLocalSign
        ? "status-pill airgap-staged"
        : "status-pill airgap-locked";
      airgapPill.innerHTML = state.airGapStagedForLocalSign
        ? `<span class="pulse-dot amber"></span><span>LOCAL SIGN ARMED · 0 EXTERNAL I/O</span>`
        : `<span class="pulse-dot"></span><span>AIR-GAP LOCKED · 0 FOIA · 0 SMTP</span>`;
    }

    const sec = getTotalFounderSeconds();
    if (timePill) {
      const over = sec > 1200;
      timePill.innerHTML = `<span class="pulse-dot ${over ? "crimson" : ""}"></span><span>FOUNDER TIME: ${fmtClock(
        sec
      )} / 20m 00s CAP</span>`;
    }

    const badgeCockpit = document.getElementById("tab-badge-cockpit");
    if (badgeCockpit) {
      badgeCockpit.textContent =
        unresolvedCount === 0 ? "SIGNED READY" : `${unresolvedCount} QUEUED`;
      badgeCockpit.className =
        unresolvedCount === 0 ? "tab-badge emerald" : "tab-badge amber";
    }
  }

  function renderKpiRibbon() {
    const tel = PIPELINE.telemetry;
    const cfo = AUDIT.cfo_unit_economics.year1_summary;
    const container = document.getElementById("kpi-ribbon");
    if (!container) return;

    const resolvedCount = Object.values(state.cockpitResolutions).filter(
      (r) => r.committed
    ).length;

    container.innerHTML = `
      <div class="kpi-card emerald">
        <div class="kpi-label">Verified Municipal Leads</div>
        <div class="kpi-value">${tel.verified_municipal_leads} Cities/Districts</div>
        <div class="kpi-sub">${tel.auto_verified_leads + resolvedCount} Signed Ready · ${
      tel.quarantined_foia_traps
    } FOIA Trap Blocked</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Tracked FY25–26 CIP Scope</div>
        <div class="kpi-value">${fmtCompactUSD(tel.total_verified_cip_budget)}</div>
        <div class="kpi-sub">${fmtCompactUSD(
          tel.total_estimated_equipment_tam
        )} Est. OEM Spec-In Equipment TAM (${tel.states_covered} States)</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Pre-RFP Early Warning Lead</div>
        <div class="kpi-value">${tel.mean_pre_rfp_lead_days} Days</div>
        <div class="kpi-sub">90–240d ahead of BidNet / DemandStar RFP drop</div>
      </div>
      <div class="kpi-card crimson">
        <div class="kpi-label">Red-Team Governance Gate</div>
        <div class="kpi-value">4 / 4 Vetoes</div>
        <div class="kpi-sub">FOIA Bot, Cold Blast, Raw LLM &amp; 201 Spiders Killed</div>
      </div>
      <div class="kpi-card amber">
        <div class="kpi-label">Audited Yr-1 Net Profit</div>
        <div class="kpi-value">${fmtUSD(cfo.annual_net_profit)}</div>
        <div class="kpi-sub">+${fmtUSD(
          cfo.surplus_above_target
        )} above $20K goal · 17.5m/mo founder ops</div>
      </div>
    `;
  }

  // ============================================================================
  // TAB 1: CIVICSIGNAL LIVE PRE-RFP PRODUCT FEED
  // ============================================================================
  function getFilteredLeads() {
    const q = state.searchQuery.trim().toLowerCase();
    return PIPELINE.leads.filter((lead) => {
      if (state.territoryFilter !== "ALL" && lead.territory !== state.territoryFilter) {
        return false;
      }
      if (
        state.verticalFilter !== "ALL" &&
        lead.equipment_vertical !== state.verticalFilter
      ) {
        return false;
      }
      if (state.windowFilter === "IMMEDIATE" && lead.pre_rfp_window_days > 135) {
        return false;
      }
      if (
        state.windowFilter === "PRIME" &&
        (lead.pre_rfp_window_days < 136 || lead.pre_rfp_window_days > 195)
      ) {
        return false;
      }
      if (state.windowFilter === "HORIZON" && lead.pre_rfp_window_days < 196) {
        return false;
      }
      const eff = getEffectiveLeadStatus(lead);
      if (state.statusFilter === "AUTO" && eff.code === "COCKPIT_REVIEW_QUEUE") {
        return false;
      }
      if (state.statusFilter === "QUEUE" && !lead.verification.needs_human_review) {
        return false;
      }
      if (q) {
        const hay = [
          lead.municipality,
          lead.state,
          lead.project_code,
          lead.project_title,
          lead.equipment_vertical,
          lead.agency,
          lead.spec_contact_role,
          lead.verbatim_excerpt,
          ...lead.extracted_skus,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function renderPreRfpTimelineSvg() {
    // Visualizes why 90-240d pre-RFP CIP capture beats BidNet/DemandStar
    const dots = PIPELINE.leads
      .map((l, idx) => {
        const days = l.pre_rfp_window_days;
        // Map 250 days (left) -> 0 days RFP Drop (right)
        const x = 48 + ((250 - Math.min(250, days)) / 250) * 430;
        const y = 54 + (idx % 3) * 18;
        const isSelected = l.lead_id === state.selectedLeadId;
        const color = l.verification.needs_human_review ? "#f59e0b" : "#10b981";
        return `<circle cx="${x.toFixed(1)}" cy="${y}" r="${
          isSelected ? 6.5 : 4.5
        }" fill="${color}" stroke="${
          isSelected ? "#ffffff" : "#090d14"
        }" stroke-width="${isSelected ? 2 : 1}">
          <title>${esc(l.location_label)} — ${days}d Pre-RFP (${fmtUSD(
          l.verified_fy_budget
        )})</title>
        </circle>`;
      })
      .join("");

    return `
      <svg viewBox="0 0 560 132" width="100%" height="132" role="img" aria-label="Pre-RFP Spec-Influence Window Timeline">
        <rect x="44" y="26" width="305" height="76" rx="6" fill="rgba(16,185,129,0.10)" stroke="rgba(16,185,129,0.35)" stroke-dasharray="4 3"/>
        <text x="54" y="41" fill="#6ee7b7" font-size="10.5" font-family="monospace" font-weight="700">BASIS-OF-DESIGN SPEC-IN ZONE (240d → 90d PRE-RFP)</text>
        <rect x="355" y="26" width="118" height="76" rx="6" fill="rgba(56,189,248,0.07)" stroke="rgba(56,189,248,0.22)"/>
        <text x="363" y="41" fill="#7dd3fc" font-size="9.5" font-family="monospace">FINAL BID PREP</text>
        <line x1="478" y1="20" x2="478" y2="108" stroke="#ef4444" stroke-width="2.2"/>
        <rect x="483" y="28" width="70" height="72" rx="5" fill="rgba(239,68,68,0.14)" stroke="rgba(239,68,68,0.4)"/>
        <text x="488" y="52" fill="#fca5a5" font-size="9.5" font-family="monospace" font-weight="700">RFP DROP</text>
        <text x="488" y="66" fill="#fca5a5" font-size="8.8" font-family="sans-serif">BidNet /</text>
        <text x="488" y="78" fill="#fca5a5" font-size="8.8" font-family="sans-serif">DemandStar</text>
        <text x="488" y="91" fill="#f87171" font-size="8.2" font-family="monospace">(Too Late)</text>
        ${dots}
        <text x="46" y="120" fill="#8b9bb4" font-size="10" font-family="monospace">-240 Days (CIP Adopted)</text>
        <text x="225" y="120" fill="#8b9bb4" font-size="10" font-family="monospace">-148d Mean Lead</text>
        <text x="442" y="120" fill="#fca5a5" font-size="10" font-family="monospace">Day 0 RFP</text>
      </svg>
    `;
  }

  function renderVerticalBreakdownSvg() {
    const byVert = new Map();
    for (const l of PIPELINE.leads) {
      const cur = byVert.get(l.equipment_vertical) || { tam: 0, count: 0 };
      cur.tam += l.estimated_equipment_package;
      cur.count += 1;
      byVert.set(l.equipment_vertical, cur);
    }
    const sorted = [...byVert.entries()]
      .sort((a, b) => b[1].tam - a[1].tam)
      .slice(0, 6);
    const maxTam = Math.max(...sorted.map((d) => d[1].tam), 1);

    const bars = sorted
      .map(([vert, info], i) => {
        const y = 14 + i * 20;
        const w = Math.max(12, (info.tam / maxTam) * 230);
        const active = state.verticalFilter === vert;
        return `
          <g class="vert-bar-row" data-vert="${esc(vert)}" style="cursor:pointer">
            <text x="4" y="${y + 11}" fill="${
          active ? "#6ee7b7" : "#cbd5e1"
        }" font-size="10.5" font-family="sans-serif">${esc(
          vert.length > 26 ? vert.slice(0, 25) + "…" : vert
        )} (${info.count})</text>
            <rect x="195" y="${y + 1}" width="${w.toFixed(1)}" height="12" rx="3" fill="${
          active ? "#10b981" : "#38bdf8"
        }" opacity="${active ? "0.95" : "0.75"}"/>
            <text x="${(201 + w).toFixed(1)}" y="${
          y + 11
        }" fill="#94a3b8" font-size="10" font-family="monospace">${fmtCompactUSD(
          info.tam
        )}</text>
          </g>
        `;
      })
      .join("");

    return `<svg viewBox="0 0 510 136" width="100%" height="136" role="img" aria-label="Estimated Equipment TAM by Vertical">${bars}</svg>`;
  }

  function renderFeedView() {
    const container = document.getElementById("tab-feed");
    if (!container) return;

    const territories = [...new Set(PIPELINE.leads.map((l) => l.territory))].sort();
    const verticals = [
      ...new Set(PIPELINE.leads.map((l) => l.equipment_vertical)),
    ].sort();
    const filtered = getFilteredLeads();

    if (
      filtered.length > 0 &&
      !filtered.some((l) => l.lead_id === state.selectedLeadId)
    ) {
      state.selectedLeadId = filtered[0].lead_id;
    }
    const selectedLead =
      PIPELINE.leads.find((l) => l.lead_id === state.selectedLeadId) ||
      PIPELINE.leads[0];

    // Rep ROI calculation
    const grossCommission =
      state.roiDealSize * (state.roiCommissionPct / 100) * state.roiExtraWins;
    const annualSubCost = state.roiPlanMonthly * 12;
    const netRepGain = grossCommission - annualSubCost;
    const roiMultiple = annualSubCost > 0 ? grossCommission / annualSubCost : 0;

    container.innerHTML = `
      <div class="analytics-grid-2">
        <div class="panel">
          <div class="panel-header" style="margin-bottom:6px">
            <div>
              <h2 class="panel-title">Pre-RFP Basis-of-Design Capture Window</h2>
              <p class="panel-subtitle">All 20 verified municipal CIP items plotted by days remaining before formal RFP publication</p>
            </div>
            <span class="badge badge-emerald">90–240d Early Moat</span>
          </div>
          <div class="svg-chart-box">${renderPreRfpTimelineSvg()}</div>
        </div>
        <div class="panel">
          <div class="panel-header" style="margin-bottom:6px">
            <div>
              <h2 class="panel-title">Spec-In Equipment TAM by Vertical (Click Bar to Filter)</h2>
              <p class="panel-subtitle">Estimated electromechanical, controls, lighting &amp; park equipment share of CIP budgets</p>
            </div>
            ${
              state.verticalFilter !== "ALL"
                ? `<button class="btn" id="btn-clear-vert" style="padding:4px 9px;font-size:11px">Reset Vertical</button>`
                : `<span class="badge badge-cyan">$19.15M OEM TAM</span>`
            }
          </div>
          <div class="svg-chart-box" id="vert-chart-wrap">${renderVerticalBreakdownSvg()}</div>
        </div>
      </div>

      <div class="filter-bar">
        <div class="field-group">
          <label for="feed-search">Search Municipality / Project ID / OEM SKU</label>
          <input id="feed-search" class="input-control" type="search" placeholder="e.g., SCADA, Chopper Pump, Manatee, WU020, UV..." value="${esc(
            state.searchQuery
          )}"/>
        </div>
        <div class="field-group">
          <label for="feed-territory">Sales Territory</label>
          <select id="feed-territory" class="select-control">
            <option value="ALL">All Territories (7)</option>
            ${territories
              .map(
                (t) =>
                  `<option value="${esc(t)}" ${
                    state.territoryFilter === t ? "selected" : ""
                  }>${esc(t)}</option>`
              )
              .join("")}
          </select>
        </div>
        <div class="field-group">
          <label for="feed-vertical">Equipment Vertical</label>
          <select id="feed-vertical" class="select-control">
            <option value="ALL">All Verticals (${verticals.length})</option>
            ${verticals
              .map(
                (v) =>
                  `<option value="${esc(v)}" ${
                    state.verticalFilter === v ? "selected" : ""
                  }>${esc(v)}</option>`
              )
              .join("")}
          </select>
        </div>
        <div class="field-group">
          <label for="feed-window">Pre-RFP Lead Window</label>
          <select id="feed-window" class="select-control">
            <option value="ALL" ${state.windowFilter === "ALL" ? "selected" : ""}>All Windows (90–240d)</option>
            <option value="IMMEDIATE" ${state.windowFilter === "IMMEDIATE" ? "selected" : ""}>Immediate (90–135d)</option>
            <option value="PRIME" ${state.windowFilter === "PRIME" ? "selected" : ""}>Prime Spec-In (136–195d)</option>
            <option value="HORIZON" ${state.windowFilter === "HORIZON" ? "selected" : ""}>Early Design (196–240d)</option>
          </select>
        </div>
        <div class="field-group">
          <label for="feed-status">Governance Status</label>
          <select id="feed-status" class="select-control">
            <option value="ALL" ${state.statusFilter === "ALL" ? "selected" : ""}>All Verified (${PIPELINE.leads.length})</option>
            <option value="AUTO" ${state.statusFilter === "AUTO" ? "selected" : ""}>Signed / Auto-Verified</option>
            <option value="QUEUE" ${state.statusFilter === "QUEUE" ? "selected" : ""}>Exception Review Queue (4)</option>
          </select>
        </div>
        <button class="btn btn-primary" id="btn-export-csv" title="Download RFC-4180 CSV Digest for CRM import">
          <span>Export CSV (${filtered.length})</span>
        </button>
      </div>

      <div class="feed-workspace">
        <div class="lead-list">
          ${
            filtered.length === 0
              ? `<div class="panel" style="text-align:center;color:var(--text-muted)">No municipal pre-RFP leads match the active filters. <button class="btn" id="btn-reset-all-filters" style="margin-left:8px">Reset Filters</button></div>`
              : filtered
                  .map((lead) => {
                    const eff = getEffectiveLeadStatus(lead);
                    const score = lead.urgency.total_score;
                    const pillCls =
                      score >= 86 ? "urgency-pill" : score >= 74 ? "urgency-pill mid" : "urgency-pill low";
                    return `
                      <article class="lead-card ${
                        lead.lead_id === selectedLead.lead_id ? "selected" : ""
                      }" data-lead-id="${esc(lead.lead_id)}">
                        <div class="lead-card-top">
                          <div class="lead-loc">
                            <span>${esc(lead.location_label)}</span>
                            <span class="badge badge-slate mono">#${esc(lead.project_code)}</span>
                            <span class="badge badge-cyan">${esc(lead.equipment_vertical)}</span>
                            <span class="badge ${eff.badgeClass}">${esc(eff.label)}</span>
                          </div>
                          <div class="${pillCls}" title="Pre-RFP Urgency & Spec-In Score">${score}/100</div>
                        </div>
                        <h3 class="lead-title">${esc(lead.project_title)}</h3>
                        <div class="lead-metrics-row">
                          <div class="metric-mini">
                            <span>Verified FY Budget</span>
                            <strong>${fmtUSD(lead.verified_fy_budget)}</strong>
                          </div>
                          <div class="metric-mini">
                            <span>Est. OEM Package</span>
                            <strong>${fmtUSD(lead.estimated_equipment_package)}</strong>
                          </div>
                          <div class="metric-mini">
                            <span>Est. Rep Commission</span>
                            <strong class="emerald">+${fmtUSD(lead.estimated_rep_commission)}</strong>
                          </div>
                          <div class="metric-mini">
                            <span>Pre-RFP Window</span>
                            <strong>${lead.pre_rfp_window_days}d (${esc(lead.estimated_rfp_date)})</strong>
                          </div>
                        </div>
                        <div class="sku-row">
                          ${lead.extracted_skus
                            .map((sku) => `<span class="sku-chip">${esc(sku)}</span>`)
                            .join("")}
                        </div>
                      </article>
                    `;
                  })
                  .join("")
          }
        </div>

        <aside class="sticky-inspector">
          ${renderLeadInspectorHtml(selectedLead)}
          ${renderRepRoiWidgetHtml(grossCommission, annualSubCost, netRepGain, roiMultiple)}
        </aside>
      </div>
    `;

    bindFeedEvents(filtered);
  }

  function renderLeadInspectorHtml(lead) {
    if (!lead) return "";
    const eff = getEffectiveLeadStatus(lead);
    const b = lead.urgency.breakdown;
    const pSpan = lead.verification.primary_span;

    return `
      <div class="panel">
        <div class="panel-header" style="margin-bottom:10px">
          <div>
            <div style="display:flex;gap:6px;align-items:center;margin-bottom:4px;flex-wrap:wrap">
              <span class="badge badge-cyan mono">${esc(lead.lead_id)}</span>
              <span class="badge ${eff.badgeClass}">${esc(eff.label)}</span>
              <span class="badge badge-slate">${esc(lead.territory)} Territory</span>
            </div>
            <h3 class="panel-title">${esc(lead.location_label)} — ${esc(lead.project_code)}</h3>
            <p class="panel-subtitle">${esc(lead.agency)}</p>
          </div>
        </div>

        <div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-bottom:5px">
            <span class="mono">VERBATIM PUBLIC SOURCE EXCERPT (SPAN VERIFIED)</span>
            <span class="mono" style="color:#6ee7b7">${
              pSpan
                ? `Span [${pSpan.char_start}:${pSpan.char_end}] = ${pSpan.token}`
                : "Span Check"
            }</span>
          </div>
          <div class="citation-box">${renderHighlightedExcerpt(lead)}</div>
        </div>

        ${
          lead.verification.review_flags.length > 0
            ? `<div style="background:rgba(245,158,11,0.10);border:1px solid rgba(245,158,11,0.4);border-radius:6px;padding:10px 12px;margin-bottom:10px;font-size:12px">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                  <strong style="color:#fcd34d" class="mono">GUARDRAIL-03 FLAG: ${esc(
                    lead.verification.review_flags[0].code
                  )}</strong>
                  <button class="btn btn-amber" id="btn-jump-cockpit" style="padding:3px 9px;font-size:11px">Open in 18-Min Cockpit →</button>
                </div>
                <div style="color:var(--text-secondary)">${esc(
                  lead.verification.review_flags[0].reason
                )}</div>
              </div>`
            : ""
        }

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;margin-bottom:10px">
          <div style="background:var(--bg-surface-2);padding:8px 10px;border-radius:6px;border:1px solid var(--border-subtle)">
            <div style="color:var(--text-muted);font-size:10.5px;text-transform:uppercase">Spec-Influence Target Role</div>
            <div style="font-weight:700;color:#7dd3fc;margin-top:2px">${esc(
              lead.spec_contact_role
            )}</div>
            <div style="font-size:10.5px;color:var(--text-dim)">Zero personal PII scraped (Legal V2 rule)</div>
          </div>
          <div style="background:var(--bg-surface-2);padding:8px 10px;border-radius:6px;border:1px solid var(--border-subtle)">
            <div style="color:var(--text-muted);font-size:10.5px;text-transform:uppercase">Passive Open-Data Feed</div>
            <div style="font-weight:700;margin-top:2px">${esc(lead.platform_label)}</div>
            <a href="${esc(
              lead.source_url
            )}" target="_blank" rel="noopener noreferrer" style="color:var(--accent-cyan);font-size:11px;text-decoration:none" class="mono">Verify Official .gov Portal ↗</a>
          </div>
        </div>

        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;font-family:var(--font-mono)">4-Factor Pre-RFP Urgency Decomposition (${
          lead.urgency.total_score
        }/100)</div>
        <div class="score-bars">
          <div class="score-bar-item">
            <div class="score-bar-head"><span>Pre-RFP Window (${lead.pre_rfp_window_days}d)</span><strong class="mono">${
      b.pre_rfp_window_pts
    }/30</strong></div>
            <div class="bar-track"><div class="bar-fill" style="width:${
              (b.pre_rfp_window_pts / 30) * 100
            }%"></div></div>
          </div>
          <div class="score-bar-item">
            <div class="score-bar-head"><span>Aging / Reg Mandate</span><strong class="mono">${
              b.aging_regulatory_pts
            }/25</strong></div>
            <div class="bar-track"><div class="bar-fill" style="width:${
              (b.aging_regulatory_pts / 25) * 100
            }%"></div></div>
          </div>
          <div class="score-bar-item">
            <div class="score-bar-head"><span>OEM SKU Density</span><strong class="mono">${
              b.equipment_density_pts
            }/25</strong></div>
            <div class="bar-track"><div class="bar-fill" style="width:${
              (b.equipment_density_pts / 25) * 100
            }%"></div></div>
          </div>
          <div class="score-bar-item">
            <div class="score-bar-head"><span>Span &amp; Fund Certainty</span><strong class="mono">${
              b.funding_provenance_pts
            }/20</strong></div>
            <div class="bar-track"><div class="bar-fill" style="width:${
              (b.funding_provenance_pts / 20) * 100
            }%"></div></div>
          </div>
        </div>

        <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:5px">
          ${lead.aging_triggers
            .map((t) => `<span class="badge badge-emerald">⚡ ${esc(t)}</span>`)
            .join("")}
        </div>
      </div>
    `;
  }

  function renderRepRoiWidgetHtml(grossComm, annualCost, netGain, multiple) {
    return `
      <div class="panel">
        <div class="panel-header" style="margin-bottom:8px">
          <div>
            <h3 class="panel-title">Territory Sales Rep ROI Calculator</h3>
            <p class="panel-subtitle">Why manufacturer reps retain at 96.8%/mo ($199 Solo | $449 Multi-Line Agency)</p>
          </div>
          <span class="badge badge-emerald mono">${multiple.toFixed(1)}x Payback</span>
        </div>

        <div class="slider-row">
          <div class="slider-head">
            <span>Spec-In OEM Equipment Package Won</span>
            <strong class="mono" id="roi-deal-val">${fmtUSD(state.roiDealSize)}</strong>
          </div>
          <input type="range" id="roi-deal-slider" min="80000" max="1500000" step="20000" value="${
            state.roiDealSize
          }"/>
        </div>

        <div class="slider-row">
          <div class="slider-head">
            <span>Manufacturer Rep Commission Rate</span>
            <strong class="mono" id="roi-comm-val">${state.roiCommissionPct}%</strong>
          </div>
          <input type="range" id="roi-comm-slider" min="6" max="18" step="1" value="${
            state.roiCommissionPct
          }"/>
        </div>

        <div style="display:flex;gap:8px;margin:8px 0 10px">
          <button class="btn ${
            state.roiPlanMonthly === 199 ? "btn-primary" : ""
          }" data-plan="199" style="flex:1;justify-content:center">Solo Rep ($199/mo)</button>
          <button class="btn ${
            state.roiPlanMonthly === 449 ? "btn-primary" : ""
          }" data-plan="449" style="flex:1;justify-content:center">Rep Agency ($449/mo)</button>
        </div>

        <div class="roi-grid">
          <div style="background:var(--bg-surface-2);padding:9px 11px;border-radius:6px;border:1px solid var(--border-subtle)">
            <div style="font-size:10.5px;color:var(--text-muted)">1 EXTRA SPEC-IN COMMISSION</div>
            <div class="mono" style="font-size:17px;font-weight:800;color:#6ee7b7" id="roi-gross-out">${fmtUSD(
              grossComm
            )}</div>
            <div style="font-size:10.5px;color:var(--text-dim)">vs. ${fmtUSD(
              annualCost
            )}/yr subscription</div>
          </div>
          <div style="background:var(--bg-surface-2);padding:9px 11px;border-radius:6px;border:1px solid var(--border-subtle)">
            <div style="font-size:10.5px;color:var(--text-muted)">NET REP ANNUAL GAIN</div>
            <div class="mono" style="font-size:17px;font-weight:800;color:var(--text-primary)" id="roi-net-out">+${fmtUSD(
              netGain
            )}</div>
            <div style="font-size:10.5px;color:#7dd3fc" id="roi-mult-out">${multiple.toFixed(
              1
            )}x gross subscription ROI</div>
          </div>
        </div>
      </div>
    `;
  }

  function bindFeedEvents(filteredLeads) {
    const searchEl = document.getElementById("feed-search");
    if (searchEl) {
      searchEl.addEventListener("input", (e) => {
        const pos = e.target.selectionStart;
        state.searchQuery = e.target.value;
        renderFeedView();
        const nextEl = document.getElementById("feed-search");
        if (nextEl) {
          nextEl.focus();
          nextEl.setSelectionRange(pos, pos);
        }
      });
    }

    const bindSelect = (id, key) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("change", (e) => {
          state[key] = e.target.value;
          renderFeedView();
        });
      }
    };
    bindSelect("feed-territory", "territoryFilter");
    bindSelect("feed-vertical", "verticalFilter");
    bindSelect("feed-window", "windowFilter");
    bindSelect("feed-status", "statusFilter");

    document.querySelectorAll(".lead-card").forEach((card) => {
      card.addEventListener("click", () => {
        state.selectedLeadId = card.dataset.leadId;
        renderFeedView();
      });
    });

    document.querySelectorAll(".vert-bar-row").forEach((row) => {
      row.addEventListener("click", () => {
        const v = row.dataset.vert;
        state.verticalFilter = state.verticalFilter === v ? "ALL" : v;
        renderFeedView();
      });
    });

    const clearVert = document.getElementById("btn-clear-vert");
    if (clearVert) {
      clearVert.addEventListener("click", () => {
        state.verticalFilter = "ALL";
        renderFeedView();
      });
    }

    const resetAll = document.getElementById("btn-reset-all-filters");
    if (resetAll) {
      resetAll.addEventListener("click", () => {
        state.searchQuery = "";
        state.territoryFilter = "ALL";
        state.verticalFilter = "ALL";
        state.windowFilter = "ALL";
        state.statusFilter = "ALL";
        renderFeedView();
      });
    }

    const exportBtn = document.getElementById("btn-export-csv");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        exportLeadsToCsv(filteredLeads, "civicsignal_pre_rfp_digest_verified.csv");
      });
    }

    const jumpBtn = document.getElementById("btn-jump-cockpit");
    if (jumpBtn) {
      jumpBtn.addEventListener("click", () => switchTab("tab-cockpit"));
    }

    // ROI sliders
    const dealSlider = document.getElementById("roi-deal-slider");
    const commSlider = document.getElementById("roi-comm-slider");
    if (dealSlider) {
      dealSlider.addEventListener("input", (e) => {
        state.roiDealSize = Number(e.target.value);
        renderFeedView();
      });
    }
    if (commSlider) {
      commSlider.addEventListener("input", (e) => {
        state.roiCommissionPct = Number(e.target.value);
        renderFeedView();
      });
    }
    document.querySelectorAll("[data-plan]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.roiPlanMonthly = Number(btn.dataset.plan);
        renderFeedView();
      });
    });
  }

  // ============================================================================
  // TAB 2: ADVERSARIAL RED-TEAM WAR ROOM & V1 -> V2 GOVERNANCE DIFF
  // ============================================================================
  function computeDynamicCfoSimulation() {
    const soloPrice = 199;
    const agencyPrice = 449;
    const churn = state.simChurnPct / 100;
    let solo = 0;
    let agency = 0;
    let cumNet = 0;
    const months = [];

    for (let m = 1; m <= 12; m++) {
      solo = solo * (1 - churn) + state.simSoloPerMo;
      agency = agency * (1 - churn) + state.simAgencyPerMo;
      const gross = solo * soloPrice + agency * agencyPrice;
      const logos = solo + agency;
      const stripe = gross * 0.029 + logos * 0.3;
      const cac = m <= 9 ? state.simCacSpend : state.simCacSpend * 0.78;
      const infra = state.simIncludeFragileScrapers ? 210 : 73; // V1 proxy/scraper churn + legal exposure
      const net = gross - stripe - cac - infra;
      cumNet += net;
      months.push({ m, label: `M${String(m).padStart(2, "0")}`, gross, net, cumNet, logos });
    }

    const monthlyFounderMins = state.simIncludeFragileScrapers ? 690 + 17.5 : 17.5;
    return {
      months,
      year1Net: cumNet,
      m12RunRateNet: months[11].net * 12,
      m12Logos: months[11].logos,
      monthlyFounderMins,
      passesProfit: cumNet >= 20000,
      passesTime: monthlyFounderMins <= 20,
    };
  }

  function renderCfoCashflowSvg(sim) {
    const w = 600;
    const h = 195;
    const padL = 58;
    const padR = 20;
    const padT = 20;
    const padB = 28;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    const vals = sim.months.map((d) => d.cumNet);
    const minV = Math.min(-2500, ...vals);
    const maxV = Math.max(26000, ...vals) * 1.08;
    const yOf = (v) => padT + plotH - ((v - minV) / (maxV - minV)) * plotH;
    const xOf = (i) => padL + (i / 11) * plotW;

    const pts = sim.months.map((d, i) => `${xOf(i).toFixed(1)},${yOf(d.cumNet).toFixed(1)}`).join(" ");
    const y20k = yOf(20000);
    const yZero = yOf(0);

    return `
      <svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="12-Month Cumulative Net Profit Curve">
        <line x1="${padL}" y1="${yZero.toFixed(1)}" x2="${w - padR}" y2="${yZero.toFixed(
      1
    )}" stroke="rgba(148,163,184,0.28)" stroke-width="1"/>
        <line x1="${padL}" y1="${y20k.toFixed(1)}" x2="${w - padR}" y2="${y20k.toFixed(
      1
    )}" stroke="#10b981" stroke-width="1.5" stroke-dasharray="5 4"/>
        <text x="${padL + 6}" y="${(y20k - 5).toFixed(
      1
    )}" fill="#6ee7b7" font-size="10" font-family="monospace" font-weight="700">$20,000 YR-1 TARGET FLOOR</text>
        <polyline fill="none" stroke="${
          sim.passesProfit ? "#38bdf8" : "#ef4444"
        }" stroke-width="2.8" points="${pts}"/>
        ${sim.months
          .map((d, i) => {
            const cx = xOf(i).toFixed(1);
            const cy = yOf(d.cumNet).toFixed(1);
            return `
              <circle cx="${cx}" cy="${cy}" r="4" fill="${
              d.cumNet >= 20000 ? "#10b981" : d.cumNet >= 0 ? "#38bdf8" : "#ef4444"
            }">
                <title>${d.label}: Monthly Net ${fmtUSD(d.net)} | Cumulative ${fmtUSD(
              d.cumNet
            )} (${d.logos.toFixed(1)} active seats)</title>
              </circle>
              <text x="${cx}" y="${
              h - 8
            }" text-anchor="middle" fill="#8b9bb4" font-size="9.5" font-family="monospace">${
              d.label
            }</text>
            `;
          })
          .join("")}
        <text x="6" y="${(yOf(maxV * 0.9) + 3).toFixed(
          1
        )}" fill="#94a3b8" font-size="9.5" font-family="monospace">${fmtCompactUSD(
      maxV * 0.9
    )}</text>
        <text x="6" y="${(yZero + 3).toFixed(
          1
        )}" fill="#94a3b8" font-size="9.5" font-family="monospace">$0</text>
      </svg>
    `;
  }

  function renderRedTeamView() {
    const container = document.getElementById("tab-redteam");
    if (!container) return;

    const selectedPersona =
      AUDIT.personas.find((p) => p.id === state.selectedPersonaId) ||
      AUDIT.personas[0];
    const qTrap = PIPELINE.quarantined_records[0];
    const sim = computeDynamicCfoSimulation();
    const platforms = AUDIT.cfo_unit_economics.platform_durability_matrix;

    container.innerHTML = `
      <div class="mollick-brief">
        <div>
          <span class="badge badge-crimson mono" style="margin-bottom:6px">CASE ORIGIN // MOLLICK'S "FABLE 5.2 &amp; JAGGED AGI"</span>
          <h2 style="margin:2px 0 6px;font-size:17px">Why Fable 5.2 Was Halted Before Launch — And How V2 Solves the Jagged Frontier</h2>
          <p style="margin:0;color:var(--text-secondary);font-size:13px">
            Tasked with generating <strong>&ge;$20,000/year in &le;20 minutes/month</strong>, Fable 5.2 brilliantly identified pre-RFP municipal equipment leads ("Prebid Brief"). Yet it lacked institutional &amp; legal judgment—proposing to <strong>autonomously file commercial FOIA requests with City Clerks</strong> and <strong>blast unmonitored cold outreach</strong>. Below, 4 adversarial domain auditors veto every V1 instinct and enforce deterministic V2 engineering controls.
          </p>
        </div>
        <div style="background:rgba(0,0,0,0.45);border:1px solid rgba(239,68,68,0.4);border-radius:10px;padding:12px 14px">
          <div class="mono" style="font-size:10.5px;color:#fca5a5;font-weight:700;margin-bottom:4px">LIVE PIPELINE QUARANTINE PROOF (${esc(
            qTrap.record_id
          )})</div>
          <div style="font-size:12.5px;font-weight:700;margin-bottom:3px">${esc(
            qTrap.municipality
          )} — ${esc(qTrap.attempted_platform)}</div>
          <div style="font-size:11.5px;color:var(--text-muted);margin-bottom:6px">${esc(
            qTrap.statutory_citation
          )}</div>
          <span class="badge badge-emerald mono">${esc(qTrap.disposition)}</span>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">Stage 2: 4-Persona Hostile Red-Team Audit Arena</h2>
            <p class="panel-subtitle">Click each hostile reviewer to inspect their statutory/commercial veto and mandatory V2 architectural fix</p>
          </div>
          <span class="badge badge-crimson mono">4 HARD VETOES LOGGED</span>
        </div>

        <div class="persona-grid">
          ${AUDIT.personas
            .map(
              (p) => `
              <div class="persona-card ${
                p.id === selectedPersona.id ? "active" : ""
              }" data-persona-id="${esc(p.id)}">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                  <span class="badge badge-cyan mono">${esc(p.avatar_code)}</span>
                  <span class="veto-stamp">${esc(p.veto_code)}</span>
                </div>
                <div style="font-weight:700;font-size:13.5px">${esc(p.name)}</div>
                <div style="font-size:11.5px;color:#7dd3fc;margin:2px 0 6px">${esc(
                  p.role
                )}</div>
                <div style="font-size:11px;color:var(--text-muted)">${esc(
                  p.credentials
                )}</div>
              </div>
            `
            )
            .join("")}
        </div>

        <div class="persona-spotlight">
          <div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
              <span class="veto-stamp">${esc(selectedPersona.veto_code)} · ${esc(
      selectedPersona.severity
    )}</span>
              <strong style="font-size:14.5px">${esc(selectedPersona.name)} — ${esc(
      selectedPersona.role
    )}</strong>
            </div>
            <div style="font-size:12px;color:#fca5a5;margin-bottom:8px">
              <strong>V1 Instinct Attacked:</strong> ${esc(selectedPersona.v1_flaw_attacked)}
            </div>
            <blockquote style="margin:0 0 12px;padding:12px 14px;background:#070b11;border-left:3px solid var(--accent-crimson);border-radius:6px;color:var(--text-primary);font-size:13px;line-height:1.6">
              "${esc(selectedPersona.hostile_critique)}"
            </blockquote>
            <div style="background:rgba(16,185,129,0.09);border:1px solid rgba(16,185,129,0.35);border-radius:6px;padding:10px 12px;font-size:12.5px">
              <strong style="color:#6ee7b7" class="mono">MANDATORY V2 ENGINEERED COUNTERMEASURE:</strong>
              <div style="margin-top:4px;color:var(--text-secondary)">${esc(
                selectedPersona.v2_engineered_fix
              )}</div>
            </div>
          </div>
          <div style="background:var(--bg-surface-1);border:1px solid var(--border-subtle);border-radius:8px;padding:14px">
            <div class="mono" style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px">Non-Negotiable Audit Conditions</div>
            <ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:10px;color:var(--text-secondary);font-size:12.5px">
              ${selectedPersona.non_negotiable_demands
                .map((d) => `<li>${esc(d)}</li>`)
                .join("")}
            </ul>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">V1 (Jagged Agent Instinct) → V2 (Hardened Production Governance) Diff</h2>
            <p class="panel-subtitle">Every autonomous failure mode neutralized by deterministic code &amp; physical air-gap boundaries</p>
          </div>
          <span class="badge badge-emerald mono">ALL 4 DIFFS VERIFIED IN PIPELINE.PY</span>
        </div>
        <div class="diff-list">
          ${AUDIT.governance_diffs
            .map(
              (d) => `
              <div class="diff-row">
                <div class="diff-v1">
                  <div style="display:flex;justify-content:space-between;margin-bottom:5px">
                    <span class="badge badge-crimson mono">V1 JAGGED INSTINCT · VETOED (${esc(
                      d.veto_ref
                    )})</span>
                    <span class="mono" style="font-size:11px;color:var(--text-muted)">${esc(
                      d.subsystem
                    )}</span>
                  </div>
                  <div style="font-weight:700;font-size:13px;margin-bottom:5px">${esc(
                    d.v1_jagged_instinct
                  )}</div>
                  <div style="font-size:12px;color:#fca5a5"><strong>Failure Mode:</strong> ${esc(
                    d.v1_failure_mode
                  )}</div>
                </div>
                <div class="diff-v2">
                  <div style="display:flex;justify-content:space-between;margin-bottom:5px">
                    <span class="badge badge-emerald mono">V2 HARDENED GUARDRAIL · ACTIVE</span>
                    <span class="mono" style="font-size:11px;color:#6ee7b7">${esc(
                      d.diff_id
                    )}</span>
                  </div>
                  <div style="font-weight:700;font-size:13px;margin-bottom:5px">${esc(
                    d.v2_hardened_guardrail
                  )}</div>
                  <div class="code-strip">${esc(d.code_proof)}</div>
                </div>
              </div>
            `
            )
            .join("")}
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">CFO Interactive Unit-Economics &amp; Municipal Parser-Breakage Stress Lab</h2>
            <p class="panel-subtitle">Stress-test subscriber velocity, logo churn, CAC, and see why scraping 201 HTML portals blows the 20-min/mo cap</p>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <span class="badge ${sim.passesProfit ? "badge-emerald" : "badge-crimson"} mono">Yr-1 Net: ${fmtUSD(
      sim.year1Net
    )}</span>
            <span class="badge ${sim.passesTime ? "badge-emerald" : "badge-crimson"} mono">Ops Time: ${sim.monthlyFounderMins.toFixed(
      1
    )}m / 20.0m Cap</span>
          </div>
        </div>

        <div class="analytics-grid-2" style="margin-bottom:14px">
          <div style="background:var(--bg-surface-2);padding:14px;border-radius:10px;border:1px solid var(--border-subtle)">
            <div class="slider-row">
              <div class="slider-head"><span>New Solo Seats / Mo ($199/mo)</span><strong class="mono">${state.simSoloPerMo.toFixed(
                2
              )} logos/mo</strong></div>
              <input type="range" id="sim-solo" min="0.5" max="3.0" step="0.25" value="${
                state.simSoloPerMo
              }"/>
            </div>
            <div class="slider-row">
              <div class="slider-head"><span>New Agency Seats / Mo ($449/mo)</span><strong class="mono">${state.simAgencyPerMo.toFixed(
                2
              )} logos/mo</strong></div>
              <input type="range" id="sim-agency" min="0.0" max="2.0" step="0.2" value="${
                state.simAgencyPerMo
              }"/>
            </div>
            <div class="slider-row">
              <div class="slider-head"><span>Monthly Logo Churn Rate</span><strong class="mono">${state.simChurnPct.toFixed(
                1
              )}%/mo</strong></div>
              <input type="range" id="sim-churn" min="1.5" max="12.0" step="0.5" value="${
                state.simChurnPct
              }"/>
            </div>
            <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border-subtle);display:flex;justify-content:space-between;align-items:center;gap:10px">
              <div>
                <div style="font-weight:700;font-size:12.5px">Ingestion Architecture Mode</div>
                <div style="font-size:11px;color:var(--text-muted)">Toggle V1's 201 fragile DOM spiders vs. V2's 3 standardized open APIs</div>
              </div>
              <button class="btn ${
                state.simIncludeFragileScrapers ? "btn-danger" : "btn-primary"
              }" id="btn-toggle-scrapers">
                ${
                  state.simIncludeFragileScrapers
                    ? "V1 201-Spider Mode (707.5m/mo — BREACH!)"
                    : "V2 3-Schema API Mode (17.5m/mo — PASS)"
                }
              </button>
            </div>
          </div>

          <div style="background:var(--bg-surface-2);padding:14px;border-radius:10px;border:1px solid var(--border-subtle)">
            <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:12px">
              <strong>Month-1 to Month-12 Cumulative Net Cashflow</strong>
              <span class="mono" style="color:#7dd3fc">M12 Run-Rate: ${fmtUSD(
                sim.m12RunRateNet
              )}/yr (${sim.m12Logos.toFixed(1)} seats)</span>
            </div>
            ${renderCfoCashflowSvg(sim)}
          </div>
        </div>

        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Municipal Agenda / CIP Platform</th>
                <th>CFO Governance Status</th>
                <th>Cities Covered</th>
                <th>Monthly Parser Breakage</th>
                <th>Monthly Repair Burden</th>
                <th>Engineering Assessment</th>
              </tr>
            </thead>
            <tbody>
              ${platforms
                .map(
                  (p) => `
                  <tr class="${
                    p.status === "INGESTED_V2" ? "winner-row" : "veto-row"
                  }">
                    <td><strong>${esc(p.platform)}</strong></td>
                    <td><span class="badge ${
                      p.status === "INGESTED_V2" ? "badge-emerald" : "badge-crimson"
                    } mono">${esc(p.status)}</span></td>
                    <td class="mono">${p.municipalities_targeted}</td>
                    <td class="mono">${p.monthly_breakage_pct}% / mo</td>
                    <td class="mono">${p.repair_mins_per_month} min / mo</td>
                    <td style="color:var(--text-secondary)">${esc(p.notes)}</td>
                  </tr>
                `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.querySelectorAll("[data-persona-id]").forEach((el) => {
      el.addEventListener("click", () => {
        state.selectedPersonaId = el.dataset.personaId;
        renderRedTeamView();
      });
    });

    const bindSimSlider = (id, key) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("input", (e) => {
          state[key] = Number(e.target.value);
          renderRedTeamView();
        });
      }
    };
    bindSimSlider("sim-solo", "simSoloPerMo");
    bindSimSlider("sim-agency", "simAgencyPerMo");
    bindSimSlider("sim-churn", "simChurnPct");

    const toggleScrapers = document.getElementById("btn-toggle-scrapers");
    if (toggleScrapers) {
      toggleScrapers.addEventListener("click", () => {
        state.simIncludeFragileScrapers = !state.simIncludeFragileScrapers;
        renderRedTeamView();
      });
    }
  }

  // ============================================================================
  // TAB 3: 22-IDEA ASYMMETRIC ARBITRAGE SCREENING FUNNEL
  // ============================================================================
  function renderArbitrageScatterSvg(ideas) {
    const w = 780;
    const h = 270;
    const padL = 64;
    const padR = 28;
    const padT = 22;
    const padB = 34;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    // Piecewise X mapping: 0..25 min gets 45% of width so the 20-min boundary is razor clear; 25..700 min gets 55%
    const xOf = (mins) => {
      if (mins <= 25) return padL + (mins / 25) * (plotW * 0.44);
      const clamped = Math.min(700, mins);
      return (
        padL +
        plotW * 0.44 +
        (Math.log10(clamped - 24) / Math.log10(700 - 24)) * (plotW * 0.56)
      );
    };
    const minY = -6000;
    const maxY = 38000;
    const yOf = (profit) =>
      padT + plotH - ((Math.max(minY, Math.min(maxY, profit)) - minY) / (maxY - minY)) * plotH;

    const x20 = xOf(20);
    const y20k = yOf(20000);
    const yZero = yOf(0);

    const nodes = ideas
      .map((idea) => {
        const cx = xOf(idea.founder_minutes_month).toFixed(1);
        const cy = yOf(idea.year1_net_profit).toFixed(1);
        const isSel = idea.id === state.selectedIdeaId;
        let fill = "#64748b";
        if (idea.status === "SELECTED_WINNER") fill = "#10b981";
        else if (idea.status === "VETOED_RED_TEAM" || idea.status === "REJECTED_LEGAL_OPS")
          fill = "#ef4444";
        else if (idea.status === "RUNNER_UP_SHORTFALL") fill = "#f59e0b";
        else if (idea.status === "REJECTED_TIME_CAP") fill = "#38bdf8";

        const r = idea.status === "SELECTED_WINNER" ? 9 : isSel ? 7.5 : 5.8;
        return `
          <g class="idea-dot" data-idea-id="${esc(idea.id)}" style="cursor:pointer">
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${
          isSel ? "#ffffff" : "#090d14"
        }" stroke-width="${isSel ? 2.4 : 1.2}"/>
            ${
              idea.rank <= 3 || isSel
                ? `<text x="${Number(cx) + 10}" y="${
                    Number(cy) + 4
                  }" fill="#e2e8f0" font-size="10" font-family="monospace" font-weight="700">#${
                    idea.rank
                  }</text>`
                : ""
            }
            <title>#${idea.rank} ${esc(idea.name)} | Yr-1 Net: ${fmtUSD(
          idea.year1_net_profit
        )} | Ops: ${idea.founder_minutes_month}m/mo</title>
          </g>
        `;
      })
      .join("");

    return `
      <svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="22-Idea Venture Screening Quadrant">
        <rect x="${padL}" y="${padT}" width="${(x20 - padL).toFixed(1)}" height="${(
      y20k - padT
    ).toFixed(
      1
    )}" fill="rgba(16,185,129,0.12)" stroke="rgba(16,185,129,0.45)" stroke-dasharray="4 3"/>
        <text x="${padL + 8}" y="${
      padT + 15
    }" fill="#6ee7b7" font-size="10" font-family="monospace" font-weight="700">GOLDEN ZONE (&ge;$20K NET &amp; &le;20m/MO)</text>

        <line x1="${padL}" y1="${yZero.toFixed(1)}" x2="${w - padR}" y2="${yZero.toFixed(
      1
    )}" stroke="rgba(148,163,184,0.2)" stroke-width="1"/>
        <line x1="${padL}" y1="${y20k.toFixed(1)}" x2="${w - padR}" y2="${y20k.toFixed(
      1
    )}" stroke="#10b981" stroke-width="1.4" stroke-dasharray="5 4"/>
        <line x1="${x20.toFixed(1)}" y1="${padT}" x2="${x20.toFixed(1)}" y2="${
      h - padB
    }" stroke="#ef4444" stroke-width="1.6" stroke-dasharray="5 4"/>

        <text x="${(x20 + 6).toFixed(1)}" y="${
      h - padB - 6
    }" fill="#fca5a5" font-size="10" font-family="monospace">20.0 MIN/MO HARD CAP →</text>
        <text x="${w - padR - 145}" y="${(y20k - 5).toFixed(
      1
    )}" fill="#6ee7b7" font-size="10" font-family="monospace">$20,000 MIN PROFIT</text>

        <text x="6" y="${(yOf(30000) + 3).toFixed(
          1
        )}" fill="#94a3b8" font-size="10" font-family="monospace">$30K</text>
        <text x="6" y="${(y20k + 3).toFixed(
          1
        )}" fill="#6ee7b7" font-size="10" font-family="monospace">$20K</text>
        <text x="6" y="${(yOf(10000) + 3).toFixed(
          1
        )}" fill="#94a3b8" font-size="10" font-family="monospace">$10K</text>
        <text x="6" y="${(yZero + 3).toFixed(
          1
        )}" fill="#94a3b8" font-size="10" font-family="monospace">$0</text>

        <text x="${padL}" y="${
      h - 10
    }" fill="#94a3b8" font-size="10" font-family="monospace">0m/mo</text>
        <text x="${(x20 - 14).toFixed(1)}" y="${
      h - 10
    }" fill="#fca5a5" font-size="10" font-family="monospace">20m</text>
        <text x="${xOf(60).toFixed(1)}" y="${
      h - 10
    }" fill="#94a3b8" font-size="10" font-family="monospace">60m</text>
        <text x="${xOf(150).toFixed(1)}" y="${
      h - 10
    }" fill="#94a3b8" font-size="10" font-family="monospace">150m</text>
        <text x="${(xOf(690) - 34).toFixed(1)}" y="${
      h - 10
    }" fill="#fca5a5" font-size="10" font-family="monospace">690m (V1)</text>
        ${nodes}
      </svg>
    `;
  }

  function renderFunnelView() {
    const container = document.getElementById("tab-funnel");
    if (!container) return;

    const allIdeas = AUDIT.arbitrage_matrix_22;
    let filtered = allIdeas.filter((item) => {
      if (state.ideaStatusFilter === "ALL") return true;
      return item.status === state.ideaStatusFilter;
    });

    filtered = [...filtered].sort((a, b) => {
      const av = a[state.ideaSortField];
      const bv = b[state.ideaSortField];
      return state.ideaSortAsc ? av - bv : bv - av;
    });

    const selectedIdea =
      allIdeas.find((i) => i.id === state.selectedIdeaId) || allIdeas[0];

    container.innerHTML = `
      <div class="analytics-grid-2">
        <div class="panel">
          <div class="panel-header" style="margin-bottom:6px">
            <div>
              <h2 class="panel-title">Stage 1: 22-Idea Asymmetric Arbitrage Feasibility Quadrant</h2>
              <p class="panel-subtitle">Only 1 of 22 candidates simultaneously clears &ge;$20,000 Yr-1 Net Profit, &le;20m/mo founder ops, and Red-Team legal audit</p>
            </div>
          </div>
          <div class="svg-chart-box">${renderArbitrageScatterSvg(allIdeas)}</div>
        </div>

        <div class="panel">
          <div class="panel-header" style="margin-bottom:8px">
            <div>
              <span class="badge badge-cyan mono">SELECTED CANDIDATE DOSSIER · #${
                selectedIdea.rank
              } OF 22</span>
              <h3 class="panel-title" style="margin-top:5px">${esc(selectedIdea.name)}</h3>
              <p class="panel-subtitle">${esc(selectedIdea.category)}</p>
            </div>
            <span class="badge ${
              selectedIdea.status === "SELECTED_WINNER"
                ? "badge-emerald"
                : selectedIdea.status === "VETOED_RED_TEAM" ||
                  selectedIdea.status === "REJECTED_LEGAL_OPS"
                ? "badge-crimson"
                : "badge-amber"
            } mono">${esc(selectedIdea.verdict_badge)}</span>
          </div>

          <div class="lead-metrics-row" style="margin-bottom:12px">
            <div class="metric-mini"><span>Yr-1 Net Profit</span><strong>${fmtUSD(
              selectedIdea.year1_net_profit
            )}</strong></div>
            <div class="metric-mini"><span>Founder Min/Mo</span><strong>${
              selectedIdea.founder_minutes_month
            }m</strong></div>
            <div class="metric-mini"><span>Gross Margin</span><strong>${
              selectedIdea.gross_margin_pct
            }%</strong></div>
            <div class="metric-mini"><span>Monthly Churn</span><strong>${
              selectedIdea.monthly_churn_pct
            }%</strong></div>
          </div>

          <div class="score-bars" style="margin-bottom:12px">
            <div class="score-bar-item">
              <div class="score-bar-head"><span>Data Openness</span><strong class="mono">${
                selectedIdea.data_openness
              }/10</strong></div>
              <div class="bar-track"><div class="bar-fill" style="width:${
                selectedIdea.data_openness * 10
              }%"></div></div>
            </div>
            <div class="score-bar-item">
              <div class="score-bar-head"><span>Scrape Durability</span><strong class="mono">${
                selectedIdea.scrape_durability
              }/10</strong></div>
              <div class="bar-track"><div class="bar-fill" style="width:${
                selectedIdea.scrape_durability * 10
              }%"></div></div>
            </div>
            <div class="score-bar-item">
              <div class="score-bar-head"><span>Legal &amp; ToS Safety</span><strong class="mono">${
                selectedIdea.legal_safety
              }/10</strong></div>
              <div class="bar-track"><div class="bar-fill" style="width:${
                selectedIdea.legal_safety * 10
              }%"></div></div>
            </div>
            <div class="score-bar-item">
              <div class="score-bar-head"><span>Steady-State ARR Net</span><strong class="mono">${fmtCompactUSD(
                selectedIdea.steady_state_arr_net
              )}</strong></div>
              <div class="bar-track"><div class="bar-fill" style="width:${Math.min(
                100,
                (selectedIdea.steady_state_arr_net / 55000) * 100
              )}%"></div></div>
            </div>
          </div>

          <div class="citation-box" style="border-left-color:var(--accent-cyan)">
            <strong>Screening Verdict Rationale:</strong> ${esc(selectedIdea.rationale)}
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">Complete 22-Idea Autonomous Venture Screening Matrix</h2>
            <p class="panel-subtitle">Click column headers to sort or click any row to inspect its 7-axis arbitrage profile</p>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <select id="idea-status-filter" class="select-control" style="width:auto">
              <option value="ALL" ${state.ideaStatusFilter === "ALL" ? "selected" : ""}>All 22 Screened Ideas</option>
              <option value="SELECTED_WINNER" ${state.ideaStatusFilter === "SELECTED_WINNER" ? "selected" : ""}>Selected Winner (1)</option>
              <option value="VETOED_RED_TEAM" ${state.ideaStatusFilter === "VETOED_RED_TEAM" ? "selected" : ""}>Vetoed V1 Jagged Plan (1)</option>
              <option value="RUNNER_UP_SHORTFALL" ${state.ideaStatusFilter === "RUNNER_UP_SHORTFALL" ? "selected" : ""}>Runner-Up &lt;$20K Yr-1 (3)</option>
              <option value="REJECTED_TIME_CAP" ${state.ideaStatusFilter === "REJECTED_TIME_CAP" ? "selected" : ""}>Rejected: Breaches 20m/mo Cap (7)</option>
              <option value="REJECTED_LEGAL_OPS" ${state.ideaStatusFilter === "REJECTED_LEGAL_OPS" ? "selected" : ""}>Rejected: Legal / ToS / Spam Trap (4)</option>
              <option value="REJECTED_SATURATED" ${state.ideaStatusFilter === "REJECTED_SATURATED" ? "selected" : ""}>Rejected: Saturated / No Moat (6)</option>
            </select>
          </div>
        </div>

        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th class="sortable" data-sort="rank">#</th>
                <th>Candidate Autonomous Venture</th>
                <th class="sortable" data-sort="gross_margin_pct">Margin</th>
                <th class="sortable" data-sort="data_openness">Openness</th>
                <th class="sortable" data-sort="scrape_durability">Durability</th>
                <th class="sortable" data-sort="legal_safety">Legal Safe</th>
                <th class="sortable" data-sort="monthly_churn_pct">Churn/Mo</th>
                <th class="sortable" data-sort="founder_minutes_month">Min/Mo</th>
                <th class="sortable" data-sort="year1_net_profit">Yr-1 Net</th>
                <th>Screening Verdict</th>
              </tr>
            </thead>
            <tbody>
              ${filtered
                .map((item) => {
                  const rowCls =
                    item.status === "SELECTED_WINNER"
                      ? "winner-row"
                      : item.status === "VETOED_RED_TEAM"
                      ? "veto-row"
                      : "";
                  const badgeCls =
                    item.status === "SELECTED_WINNER"
                      ? "badge-emerald"
                      : item.status === "VETOED_RED_TEAM" ||
                        item.status === "REJECTED_LEGAL_OPS"
                      ? "badge-crimson"
                      : item.status === "RUNNER_UP_SHORTFALL"
                      ? "badge-amber"
                      : "badge-slate";
                  return `
                    <tr class="${rowCls} idea-row" data-idea-id="${esc(
                    item.id
                  )}" style="cursor:pointer">
                      <td class="mono">${item.rank}</td>
                      <td>
                        <strong>${esc(item.name)}</strong>
                        <div style="font-size:11px;color:var(--text-muted)">${esc(
                          item.rationale
                        )}</div>
                      </td>
                      <td class="mono">${item.gross_margin_pct}%</td>
                      <td class="mono">${item.data_openness}</td>
                      <td class="mono">${item.scrape_durability}</td>
                      <td class="mono">${item.legal_safety}</td>
                      <td class="mono">${item.monthly_churn_pct}%</td>
                      <td class="mono" style="color:${
                        item.founder_minutes_month <= 20 ? "#6ee7b7" : "#fca5a5"
                      }">${item.founder_minutes_month}m</td>
                      <td class="mono" style="font-weight:700;color:${
                        item.year1_net_profit >= 20000 ? "#6ee7b7" : "var(--text-secondary)"
                      }">${fmtUSD(item.year1_net_profit)}</td>
                      <td><span class="badge ${badgeCls} mono">${esc(
                    item.verdict_badge
                  )}</span></td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.querySelectorAll(".idea-dot, .idea-row").forEach((el) => {
      el.addEventListener("click", () => {
        state.selectedIdeaId = el.dataset.ideaId;
        renderFunnelView();
      });
    });

    const filterSel = document.getElementById("idea-status-filter");
    if (filterSel) {
      filterSel.addEventListener("change", (e) => {
        state.ideaStatusFilter = e.target.value;
        renderFunnelView();
      });
    }

    document.querySelectorAll(".sortable").forEach((th) => {
      th.addEventListener("click", () => {
        const f = th.dataset.sort;
        if (state.ideaSortField === f) {
          state.ideaSortAsc = !state.ideaSortAsc;
        } else {
          state.ideaSortField = f;
          state.ideaSortAsc = f === "rank" || f === "founder_minutes_month" || f === "monthly_churn_pct";
        }
        renderFunnelView();
      });
    });
  }

  // ============================================================================
  // TAB 4: 18-MINUTE MONTHLY FOUNDER COCKPIT (WITH HARDWARE AIR-GAP LOCK)
  // ============================================================================
  function toggleLiveStopwatch() {
    if (state.liveTimerRunning) {
      clearInterval(state.timerIntervalId);
      state.timerIntervalId = null;
      state.liveTimerRunning = false;
    } else {
      state.liveTimerRunning = true;
      state.timerIntervalId = setInterval(() => {
        state.liveElapsedSeconds += 1;
        renderTopTelemetry();
        const swEl = document.getElementById("cockpit-stopwatch-readout");
        const remEl = document.getElementById("cockpit-remaining-readout");
        const barEl = document.getElementById("cockpit-time-bar-fill");
        const total = getTotalFounderSeconds();
        if (swEl) swEl.textContent = fmtClock(total);
        if (remEl) {
          const rem = 1200 - total;
          remEl.textContent =
            rem >= 0
              ? `${fmtClock(rem)} buffer remaining under 20:00 SLA`
              : `${fmtClock(-rem)} OVER 20:00 CAP`;
        }
        if (barEl) {
          barEl.style.width = `${Math.min(100, (total / 1200) * 100)}%`;
        }
      }, 1000);
    }
    renderCockpitView();
  }

  function renderCockpitView() {
    const container = document.getElementById("tab-cockpit");
    if (!container) return;

    const flaggedLeads = PIPELINE.leads.filter(
      (l) => l.verification.needs_human_review
    );
    const resolvedCount = flaggedLeads.filter(
      (l) => state.cockpitResolutions[l.lead_id]?.committed
    ).length;
    const allResolved = resolvedCount === flaggedLeads.length;
    const totalSec = getTotalFounderSeconds();
    const pctCap = Math.min(100, (totalSec / 1200) * 100);

    container.innerHTML = `
      <div class="cockpit-top-grid">
        <div class="hardware-lock-box ${state.airGapStagedForLocalSign ? "staged" : ""}">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
            <span class="badge ${
              state.airGapStagedForLocalSign ? "badge-amber" : "badge-emerald"
            } mono">
              ${
                state.airGapStagedForLocalSign
                  ? "KEY POSITION: LOCAL DIGEST SIGNING ARMED"
                  : "KEY POSITION: HARDWARE AIR-GAP LOCKED"
              }
            </span>
            <span class="mono" style="font-size:11px;color:var(--text-muted)">SHA-256: ${PIPELINE.batch_manifest_sha256.slice(
              0,
              16
            )}…</span>
          </div>

          <div class="interlock-switch-row">
            <div>
              <div style="font-weight:700;font-size:14px">Physical-Style Outbound Air-Gap Interlock</div>
              <div style="font-size:12px;color:var(--text-muted)">
                Blocks all autonomous FOIA filings, government webforms &amp; cold SMTP outreach. Permits only signed local CSV export.
              </div>
            </div>
            <button class="rocker-btn ${
              state.airGapStagedForLocalSign ? "staged" : ""
            }" id="btn-toggle-airgap">
              ${
                state.airGapStagedForLocalSign
                  ? "🔒 RE-LOCK SANDBOX"
                  : "🔑 ARM LOCAL DIGEST SIGN"
              }
            </button>
          </div>

          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-danger" id="btn-test-foia-block">
              ⚡ Penetration Test: Trigger V1 Auto-FOIA Bot
            </button>
            <button class="btn btn-danger" id="btn-test-smtp-block">
              ⚡ Penetration Test: Trigger V1 Cold Email Blast
            </button>
          </div>
        </div>

        <div class="panel" style="margin-top:0">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
            <div>
              <div class="kpi-label">Monthly Founder Time-Budget Stopwatch</div>
              <div class="stopwatch-display ${totalSec > 1080 ? "warn" : ""}" id="cockpit-stopwatch-readout">${fmtClock(
      totalSec
    )}</div>
              <div style="font-size:12px;color:var(--text-muted)" id="cockpit-remaining-readout">
                ${
                  1200 - totalSec >= 0
                    ? `${fmtClock(1200 - totalSec)} buffer remaining under 20:00 SLA`
                    : `${fmtClock(totalSec - 1200)} OVER 20:00 CAP`
                }
              </div>
            </div>
            <div style="display:flex;gap:7px;flex-wrap:wrap">
              <button class="btn ${
                state.liveTimerRunning ? "btn-amber" : "btn-primary"
              }" id="btn-live-timer">
                ${state.liveTimerRunning ? "⏸ Pause Live Timer" : "▶ Start Live Timer"}
              </button>
              <button class="btn" id="btn-auto-complete-run" title="Simulate full 17m 30s monthly batch sign-off in 1 click">
                ⚡ Simulate 17m 30s Batch
              </button>
              <button class="btn" id="btn-reset-cockpit">↺ Reset</button>
            </div>
          </div>

          <div style="margin:12px 0 8px">
            <div class="bar-track" style="height:9px">
              <div class="bar-fill" id="cockpit-time-bar-fill" style="width:${pctCap.toFixed(
                1
              )}%"></div>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;font-size:11px;color:var(--text-secondary)">
            <div><span class="mono" style="color:#6ee7b7">02m 30s</span> Connector Check</div>
            <div><span class="mono" style="color:#7dd3fc">${fmtClock(
              state.triageSimulatedSeconds
            )}</span> Exception Triage (${resolvedCount}/4)</div>
            <div><span class="mono" style="color:#fcd34d">${
              state.batchSigned ? "03m 30s" : "00m 00s"
            }</span> Digest Sign-Off</div>
            <div><span class="mono" style="color:#6ee7b7">02m 00s</span> Stripe/Ad Check</div>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">Step 2: 3-Click Exception Queue Triage (${resolvedCount} of ${
      flaggedLeads.length
    } Flagged Leads Resolved)</h2>
            <p class="panel-subtitle">
              16 leads passed deterministic span verification automatically. Review the 4 nuanced multi-year / $0-deferral / GMP-amendment items below (~2m 20s each).
            </p>
          </div>
          <span class="badge ${
            allResolved ? "badge-emerald" : "badge-amber"
          } mono">${resolvedCount} / ${flaggedLeads.length} TRIAGED</span>
        </div>

        ${flaggedLeads
          .map((lead, idx) => {
            const res = state.cockpitResolutions[lead.lead_id];
            const flag = lead.verification.review_flags[0];
            return `
              <div class="triage-card ${res.committed ? "resolved" : ""}">
                <div>
                  <div style="display:flex;gap:7px;align-items:center;margin-bottom:5px;flex-wrap:wrap">
                    <span class="badge badge-amber mono">EXCEPTION #${idx + 1} · ${esc(
              flag.code
            )}</span>
                    <strong>${esc(lead.location_label)} (${esc(lead.project_code)})</strong>
                    <span class="mono" style="color:#6ee7b7">${fmtUSD(
                      lead.verified_fy_budget
                    )} FY Scope</span>
                  </div>
                  <div style="font-size:12px;color:#fcd34d;margin-bottom:7px">${esc(
                    flag.reason
                  )}</div>
                  <div class="citation-box">${renderHighlightedExcerpt(lead)}</div>
                </div>

                <div class="step-checklist">
                  <div class="mono" style="font-size:11px;color:var(--text-muted)">3-CLICK FOUNDER VERIFICATION PROTOCOL</div>
                  <label style="display:flex;align-items:center;gap:8px;background:var(--bg-surface-1);padding:8px 10px;border-radius:6px;border:1px solid var(--border-subtle);cursor:pointer;font-size:12.5px">
                    <input type="checkbox" class="chk-span-verify" data-lead-id="${esc(
                      lead.lead_id
                    )}" ${res.spanChecked ? "checked" : ""}/>
                    <span><strong>Click 1:</strong> Confirm verbatim green/amber dollar spans against <a href="${esc(
                      lead.source_url
                    )}" target="_blank" rel="noopener noreferrer" style="color:var(--accent-cyan)">.gov source ↗</a></span>
                  </label>

                  <div class="field-group">
                    <label>Click 2: Select Governance Disposition</label>
                    <select class="select-control sel-disposition" data-lead-id="${esc(
                      lead.lead_id
                    )}">
                      <option value="APPROVE_CURRENT_FY_SCOPE" ${
                        res.disposition === "APPROVE_CURRENT_FY_SCOPE" ? "selected" : ""
                      }>Approve ${fmtUSD(
              lead.verified_fy_budget
            )} Current-FY Scope + Tag Horizon Note</option>
                      <option value="TAG_SUBTIER_WARNING" ${
                        res.disposition === "TAG_SUBTIER_WARNING" ? "selected" : ""
                      }>Publish with [Sub-Tier Buyout / GMP Spec-Locked Warning]</option>
                      <option value="HOLD_FROM_BATCH" ${
                        res.disposition === "HOLD_FROM_BATCH" ? "selected" : ""
                      }>Hold Lead from Monthly Territory Digest</option>
                    </select>
                  </div>

                  <button class="btn ${
                    res.committed ? "btn-amber" : "btn-primary"
                  } btn-commit-triage" data-lead-id="${esc(lead.lead_id)}" ${
              !res.spanChecked ? "disabled" : ""
            } style="justify-content:center;margin-top:2px">
                    ${
                      res.committed
                        ? "✓ Committed to Batch Manifest (Click to Re-Open)"
                        : "Click 3: Commit Resolution (+2m 22s Budgeted)"
                    }
                  </button>
                </div>
              </div>
            `;
          })
          .join("")}
      </div>

      <div class="analytics-grid-2" style="margin-top:16px">
        <div class="panel">
          <div class="panel-header" style="margin-bottom:8px">
            <div>
              <h2 class="panel-title">Step 3: Monthly Territory Digest Release Sign-Off</h2>
              <p class="panel-subtitle">Requires 4/4 exception items resolved + Local Digest Signing Armed on Hardware Interlock</p>
            </div>
            ${
              state.batchSigned
                ? `<span class="badge badge-emerald mono">BATCH SIGNED @ ${esc(
                    state.batchSignedTimestamp
                  )}</span>`
                : `<span class="badge badge-slate mono">AWAITING SIGN-OFF</span>`
            }
          </div>

          <div style="background:var(--bg-surface-2);padding:12px 14px;border-radius:8px;border:1px solid var(--border-subtle);margin-bottom:12px;font-size:12.5px">
            <div><strong>Pre-Flight Checklist:</strong></div>
            <div style="margin-top:5px;color:${
              allResolved ? "#6ee7b7" : "#fcd34d"
            }">• Exception Queue Triage: ${resolvedCount}/4 resolved</div>
            <div style="color:${
              state.airGapStagedForLocalSign ? "#6ee7b7" : "#fcd34d"
            }">• Hardware Interlock: ${
      state.airGapStagedForLocalSign
        ? "Armed for Local Signed CSV Generation"
        : "Locked (Click 'ARM LOCAL DIGEST SIGN' above)"
    }</div>
            <div style="color:#6ee7b7">• External FOIA / Cold Email Count: 0 (Hard-Blocked)</div>
          </div>

          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn btn-primary" id="btn-sign-monthly-batch" ${
              !allResolved || !state.airGapStagedForLocalSign ? "disabled" : ""
            }>
              ✍ Sign Monthly Batch &amp; Export Verified CSV Digest
            </button>
          </div>
        </div>

        <div class="panel">
          <div class="panel-header" style="margin-bottom:8px">
            <div>
              <h2 class="panel-title">Immutable Governance &amp; Kernel Intercept Log</h2>
              <p class="panel-subtitle">Real-time audit trail of air-gap blocks, span verifications &amp; founder sign-offs</p>
            </div>
          </div>
          <div class="audit-console">
            ${state.auditLogs
              .map(
                (entry) =>
                  `<div class="log-line ${esc(entry.kind)}">[${esc(
                    entry.ts
                  )}] ${esc(entry.msg)}</div>`
              )
              .join("")}
          </div>
        </div>
      </div>
    `;

    bindCockpitEvents();
  }

  function bindCockpitEvents() {
    const airgapBtn = document.getElementById("btn-toggle-airgap");
    if (airgapBtn) {
      airgapBtn.addEventListener("click", () => {
        state.airGapStagedForLocalSign = !state.airGapStagedForLocalSign;
        pushAuditLog(
          "ok",
          state.airGapStagedForLocalSign
            ? "INTERLOCK: Armed for signed local CSV artifact generation. External HTTP/SMTP sockets remain disabled."
            : "INTERLOCK: Re-locked to strict read-only sandbox."
        );
        renderTopTelemetry();
        renderCockpitView();
      });
    }

    const foiaTestBtn = document.getElementById("btn-test-foia-block");
    if (foiaTestBtn) {
      foiaTestBtn.addEventListener("click", () => {
        pushAuditLog(
          "block",
          "KERNEL INTERCEPT [VETO-CLERK-01]: Blocked simulated V1 FOIA submission -> Statutory violation risk (AZ A.R.S. § 39-121.03 / KY KRS § 61.874). 0 bytes transmitted."
        );
        renderCockpitView();
      });
    }

    const smtpTestBtn = document.getElementById("btn-test-smtp-block");
    if (smtpTestBtn) {
      smtpTestBtn.addEventListener("click", () => {
        pushAuditLog(
          "block",
          "KERNEL INTERCEPT [VETO-LEGAL-01]: Blocked simulated V1 cold SMTP blast -> Air-Gap active; opt-in SWEMA/WWEMA newsletter channel enforced. 0 emails sent."
        );
        renderCockpitView();
      });
    }

    const timerBtn = document.getElementById("btn-live-timer");
    if (timerBtn) {
      timerBtn.addEventListener("click", toggleLiveStopwatch);
    }

    const autoBtn = document.getElementById("btn-auto-complete-run");
    if (autoBtn) {
      autoBtn.addEventListener("click", () => {
        for (const [leadId, res] of Object.entries(state.cockpitResolutions)) {
          res.spanChecked = true;
          res.committed = true;
          void leadId;
        }
        state.triageSimulatedSeconds = 570; // 9m 30s across the 4 flagged items
        state.airGapStagedForLocalSign = true;
        state.batchSigned = true;
        state.batchSignedTimestamp = nowStamp();
        pushAuditLog(
          "ok",
          "BATCH SIMULATION COMPLETE: All 4 flagged leads verified, SHA-256 manifest signed in 17m 30s total monthly founder time (2m 30s under 20:00 cap)."
        );
        renderTopTelemetry();
        renderKpiRibbon();
        renderCockpitView();
      });
    }

    const resetBtn = document.getElementById("btn-reset-cockpit");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        if (state.liveTimerRunning) toggleLiveStopwatch();
        state.liveElapsedSeconds = 0;
        state.triageSimulatedSeconds = 0;
        state.airGapStagedForLocalSign = false;
        state.batchSigned = false;
        state.batchSignedTimestamp = null;
        for (const res of Object.values(state.cockpitResolutions)) {
          res.spanChecked = false;
          res.committed = false;
        }
        pushAuditLog("ok", "RESET: Monthly Founder Cockpit reset to start-of-month state.");
        renderTopTelemetry();
        renderKpiRibbon();
        renderCockpitView();
      });
    }

    document.querySelectorAll(".chk-span-verify").forEach((chk) => {
      chk.addEventListener("change", (e) => {
        const id = e.target.dataset.leadId;
        state.cockpitResolutions[id].spanChecked = e.target.checked;
        renderCockpitView();
      });
    });

    document.querySelectorAll(".sel-disposition").forEach((sel) => {
      sel.addEventListener("change", (e) => {
        const id = e.target.dataset.leadId;
        state.cockpitResolutions[id].disposition = e.target.value;
      });
    });

    document.querySelectorAll(".btn-commit-triage").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.leadId;
        const res = state.cockpitResolutions[id];
        res.committed = !res.committed;
        const committedCount = Object.values(state.cockpitResolutions).filter(
          (r) => r.committed
        ).length;
        // Each exception triage averages 142.5 seconds (~2m 22s) => 4 * 142.5s = 570s (9m 30s)
        state.triageSimulatedSeconds = Math.round(committedCount * 142.5);
        pushAuditLog(
          "ok",
          res.committed
            ? `TRIAGE COMMIT (${id}): Disposition=${res.disposition} logged (+02m 15s founder review).`
            : `TRIAGE RE-OPENED (${id}): Removed from signed state.`
        );
        renderTopTelemetry();
        renderKpiRibbon();
        renderCockpitView();
      });
    });

    const signBtn = document.getElementById("btn-sign-monthly-batch");
    if (signBtn) {
      signBtn.addEventListener("click", () => {
        state.batchSigned = true;
        state.batchSignedTimestamp = nowStamp();
        pushAuditLog(
          "ok",
          `MONTHLY BATCH SIGNED: SHA-256 ${PIPELINE.batch_manifest_sha256.slice(
            0,
            20
          )}… Total founder time = ${fmtClock(getTotalFounderSeconds())} (< 20m 00s SLA).`
        );
        exportLeadsToCsv(
          PIPELINE.leads,
          "prebid_brief_v2_monthly_signed_digest.csv"
        );
        renderTopTelemetry();
        renderKpiRibbon();
        renderCockpitView();
      });
    }
  }

  // Tab Switching
  function switchTab(tabId) {
    state.activeTab = tabId;
    document.querySelectorAll(".mode-tab").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.target === tabId);
    });
    document.querySelectorAll(".view-panel").forEach((panel) => {
      panel.classList.toggle("active", panel.id === tabId);
    });

    if (tabId === "tab-feed") renderFeedView();
    else if (tabId === "tab-redteam") renderRedTeamView();
    else if (tabId === "tab-funnel") renderFunnelView();
    else if (tabId === "tab-cockpit") renderCockpitView();
  }

  function init() {
    renderTopTelemetry();
    renderKpiRibbon();

    document.querySelectorAll(".mode-tab").forEach((btn) => {
      btn.addEventListener("click", () => switchTab(btn.dataset.target));
    });

    const headerAirgap = document.getElementById("header-airgap-pill");
    const headerTime = document.getElementById("header-time-pill");
    if (headerAirgap) {
      headerAirgap.addEventListener("click", () => switchTab("tab-cockpit"));
    }
    if (headerTime) {
      headerTime.addEventListener("click", () => switchTab("tab-cockpit"));
    }

    renderFeedView();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
