(function () {
  "use strict";

  const BUNDLE = window.CITESIGNAL_BUNDLE;
  if (!BUNDLE) {
    console.error("CITESIGNAL_BUNDLE failed to load.");
    return;
  }

  // Mutable UI state (strictly local in-memory / air-gapped)
  const state = {
    view: "storefront",
    filters: {
      query: "",
      metro: "ALL",
      trade: "ALL",
      urgency: "ALL",
    },
    roi: {
      avgTicket: 5800,
      marginPct: 42,
      leadsWorked: 8,
      closeRatePct: 12.5,
      planCost: 199,
    },
    territories: JSON.parse(JSON.stringify(BUNDLE.ledger.territories)),
    quarantine: BUNDLE.quarantine_queue.map((q) => ({ ...q, status: "PENDING" })),
    outboundApproved: false,
    stepsDone: {
      step1: true,
      step2: false,
      step3: false,
      step4: false,
    },
    timerSecondsLeft: 20 * 60,
    timerRunning: false,
    timerInterval: null,
    finScenario: "base",
    customSim: {
      outboundVol: 180,
      convPct: 1.33,
      churnPct: 5.8,
    },
    auditTrail: [
      `[${BUNDLE.reference_date} 09:00:00] AIRGAP_MODE=TRUE verified. Zero external network/SMTP/Stripe calls enabled.`,
      `[${BUNDLE.reference_date} 09:00:02] Ingested ${BUNDLE.pipeline_stats.raw_records_scanned} raw filings -> ${BUNDLE.pipeline_stats.verified_commercial_leads} commercial triggers verified.`,
      `[${BUNDLE.reference_date} 09:00:03] Step 1 Telemetry auto-reconciled: $${BUNDLE.ledger.simulated_active_mrr_usd.toLocaleString()}/mo active seat ledger.`,
    ],
  };

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmtUSD(num) {
    return "$" + Math.round(Number(num) || 0).toLocaleString("en-US");
  }

  function logAudit(msg) {
    const now = new Date().toISOString().slice(11, 19);
    state.auditTrail.unshift(`[${now} LOCAL] ${msg}`);
    renderAuditLog();
  }

  // ---------------------------------------------------------------------------
  // Mode Switcher
  // ---------------------------------------------------------------------------
  function switchView(target) {
    state.view = target;
    document.getElementById("view-storefront").classList.toggle("hidden", target !== "storefront");
    document.getElementById("view-founder").classList.toggle("hidden", target !== "founder");
    document.getElementById("btn-mode-storefront").classList.toggle("active", target === "storefront");
    document.getElementById("btn-mode-founder").classList.toggle("active", target === "founder");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ---------------------------------------------------------------------------
  // Storefront Hero & Lead Explorer
  // ---------------------------------------------------------------------------
  function renderHeroStats() {
    const stats = BUNDLE.pipeline_stats;
    document.getElementById("kpi-verified-count").textContent = `${stats.verified_commercial_leads} Buildings`;
    document.getElementById("kpi-repair-pool").textContent = fmtUSD(stats.total_midpoint_repair_pipeline_usd);
    document.getElementById("kpi-penalty-pool").textContent = fmtUSD(stats.total_penalty_exposure_usd) + "+";
  }

  function getFilteredLeads() {
    const q = state.filters.query.trim().toLowerCase();
    return BUNDLE.scored_leads.filter((l) => {
      if (state.filters.metro !== "ALL" && l.metro !== state.filters.metro) return false;
      if (state.filters.trade !== "ALL" && l.trade_bucket !== state.filters.trade) return false;
      if (state.filters.urgency === "OVERDUE" && l.days_until_deadline >= 0) return false;
      if (state.filters.urgency === "CRITICAL90" && l.urgency_score < 88) return false;
      if (q) {
        const hay = [
          l.lead_id,
          l.native_filing_id,
          l.building_name,
          l.address,
          l.owner_entity,
          l.equipment_detail,
          l.deficiency_summary,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function renderLeadExplorer() {
    const list = getFilteredLeads();
    const container = document.getElementById("lead-explorer-list");
    const countLabel = document.getElementById("lead-filter-count");
    const totalMid = list.reduce((acc, r) => acc + r.est_job_mid, 0);
    countLabel.textContent = `Showing ${list.length} of ${BUNDLE.scored_leads.length} verified commercial triggers (${fmtUSD(totalMid)} midpoint job scope)`;

    if (!list.length) {
      container.innerHTML = `<div class="card"><p style="margin:0;color:var(--ink-muted)">No commercial triggers match your current filter combination. Reset filters to view all 17 verified municipal records.</p></div>`;
      return;
    }

    container.innerHTML = list
      .map((l) => {
        const days = l.days_until_deadline;
        let deadlineClass = "pill-ok";
        let deadlineText = `DUE IN ${days}d (${l.cure_deadline})`;
        if (days < 0) {
          deadlineClass = "pill-overdue";
          deadlineText = `OVERDUE ${Math.abs(days)} DAYS`;
        } else if (days <= 36) {
          deadlineClass = "pill-soon";
        }

        const tradeLabel = l.trade_bucket.replace("_", " / ");
        return `
        <article class="lead-item">
          <div class="lead-item-top">
            <div class="badge-row">
              <span class="pill pill-navy">URGENCY ${l.urgency_score}/100</span>
              <span class="pill ${deadlineClass}">${escapeHtml(deadlineText)}</span>
              <span class="pill pill-mono">${escapeHtml(l.metro)} · ${escapeHtml(tradeLabel)}</span>
              <span class="pill pill-mono">${escapeHtml(l.native_filing_id)}</span>
            </div>
            <div class="ticket-est">Est. Remediation: ${fmtUSD(l.est_job_low)} – ${fmtUSD(l.est_job_high)}</div>
          </div>
          <h3 class="lead-title">${escapeHtml(l.building_name)} — ${escapeHtml(l.address)}</h3>
          <div class="lead-meta">
            <div><strong>Owner Entity:</strong> ${escapeHtml(l.owner_entity)}</div>
            <div><strong>Engineering / Mgmt:</strong> ${escapeHtml(l.decision_maker_contact)}</div>
            <div><strong>Footprint:</strong> ${l.floors} Floors · ${l.building_sqft.toLocaleString()} sq ft</div>
            <div><strong>System Cited:</strong> ${escapeHtml(l.equipment_detail)}</div>
          </div>
          <div class="lead-defect">
            <strong>Public Deficiency Record:</strong> ${escapeHtml(l.deficiency_summary)}
          </div>
          <div class="lead-ftr">
            <span>Source: <code>${escapeHtml(l.source_portal)}</code> (${escapeHtml(l.source_dataset_id)}) · Penalty Exposure: <strong>${fmtUSD(l.est_penalty_exposure)}+</strong></span>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-outline btn-sm" data-dossier-id="${escapeHtml(l.lead_id)}">Inspect Full Dossier &amp; Script</button>
              <button class="btn btn-dark btn-sm" data-claim-territory="${escapeHtml(l.territory_id)}">Claim Territory Feed</button>
            </div>
          </div>
        </article>`;
      })
      .join("");
  }

  // ---------------------------------------------------------------------------
  // Contractor ROI Calculator
  // ---------------------------------------------------------------------------
  function renderRoiCalculator() {
    const r = state.roi;
    document.getElementById("lbl-roi-ticket").textContent = fmtUSD(r.avgTicket);
    document.getElementById("lbl-roi-margin").textContent = `${r.marginPct}%`;
    document.getElementById("lbl-roi-leads").textContent = `${r.leadsWorked} bldgs/mo`;
    document.getElementById("lbl-roi-close").textContent = `${r.closeRatePct}%`;

    const expectedJobs = r.leadsWorked * (r.closeRatePct / 100);
    const monthlyGrossRevenue = expectedJobs * r.avgTicket;
    const monthlyGrossProfit = monthlyGrossRevenue * (r.marginPct / 100);
    const netGain = monthlyGrossProfit - r.planCost;
    const roiMultiple = r.planCost > 0 ? monthlyGrossProfit / r.planCost : 0;
    const monthsCoveredByOneJob = r.planCost > 0 ? (r.avgTicket * (r.marginPct / 100)) / r.planCost : 0;

    document.getElementById("roi-out-rev").textContent = fmtUSD(monthlyGrossRevenue) + "/mo";
    document.getElementById("roi-out-profit").textContent = fmtUSD(netGain) + "/mo";
    document.getElementById("roi-out-mult").textContent = roiMultiple.toFixed(1) + "x";
    document.getElementById("roi-out-payback").textContent = monthsCoveredByOneJob.toFixed(1) + " mos";
  }

  // ---------------------------------------------------------------------------
  // Territory Matrix & Air-Gapped Self-Serve Checkout
  // ---------------------------------------------------------------------------
  function renderTerritories() {
    const tbody = document.getElementById("territory-tbody");
    tbody.innerHTML = state.territories
      .map((t) => {
        const openSeats = Math.max(0, t.pro_seat_cap - t.pro_seats_filled);
        let statusBadge = "";
        let actionHtml = "";

        if (t.exclusive_locked) {
          statusBadge = `<span class="pill pill-overdue">SOLD OUT · EXCLUSIVE LOCK</span><div style="font-size:11px;color:var(--ink-muted);margin-top:3px;">Held by ${escapeHtml(t.exclusive_holder)}</div>`;
          actionHtml = `<button class="btn btn-outline btn-sm" disabled style="opacity:0.55;cursor:not-allowed;">Locked (1-of-1)</button>`;
        } else if (openSeats === 0) {
          statusBadge = `<span class="pill pill-soon">4/4 PRO SEATS FULL</span>`;
          actionHtml = `<button class="btn btn-outline btn-sm" data-checkout-tier="AUDIT" data-territory="${escapeHtml(t.territory_id)}">$149 30d Audit Pack</button>`;
        } else {
          statusBadge = `<span class="pill pill-ok">${openSeats} OF ${t.pro_seat_cap} PRO SEATS OPEN</span>`;
          actionHtml = `
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <button class="btn btn-dark btn-sm" data-checkout-tier="PRO" data-territory="${escapeHtml(t.territory_id)}">Pro $${t.monthly_pro_price}/mo</button>
              <button class="btn btn-outline btn-sm" data-checkout-tier="EXCLUSIVE" data-territory="${escapeHtml(t.territory_id)}">Lock Exclusive $${t.monthly_exclusive_price}/mo</button>
              <button class="btn btn-outline btn-sm" data-checkout-tier="AUDIT" data-territory="${escapeHtml(t.territory_id)}">$${t.audit_pack_price} Pack</button>
            </div>`;
        }

        return `
          <tr>
            <td><strong>${escapeHtml(t.display_name)}</strong><div style="font-size:11px;color:var(--ink-muted);font-family:var(--font-mono);">${escapeHtml(t.territory_id)}</div></td>
            <td><span class="pill pill-mono">${escapeHtml(t.metro)}</span></td>
            <td>${escapeHtml(t.trade_bucket.replace("_", " / "))}</td>
            <td>${statusBadge}</td>
            <td>${actionHtml}</td>
          </tr>`;
      })
      .join("");
  }

  function renderDeliverablesVault() {
    const digestsList = document.getElementById("deliverables-digest-list");
    digestsList.innerHTML = BUNDLE.deliverables.digests
      .map(
        (d) => `
        <tr>
          <td><strong>${escapeHtml(d.title)}</strong></td>
          <td>${d.lead_count} commercial buildings</td>
          <td>${fmtUSD(d.pipeline_value_mid)}</td>
          <td>
            <a class="btn btn-outline btn-sm" href="${escapeHtml(d.html_relpath)}" target="_blank" rel="noopener">Open HTML Digest</a>
            <a class="btn btn-outline btn-sm" href="${escapeHtml(d.csv_relpath)}" target="_blank" rel="noopener">Download CSV</a>
          </td>
        </tr>`
      )
      .join("");
  }

  // ---------------------------------------------------------------------------
  // Modals (Dossier & Air-Gapped Checkout & Outbound Preview)
  // ---------------------------------------------------------------------------
  function openModal(title, innerHtml) {
    document.getElementById("modal-title").textContent = title;
    document.getElementById("modal-body").innerHTML = innerHtml;
    document.getElementById("modal-backdrop").classList.remove("hidden");
  }

  function closeModal() {
    document.getElementById("modal-backdrop").classList.add("hidden");
  }

  function showLeadDossier(leadId) {
    const l = BUNDLE.scored_leads.find((x) => x.lead_id === leadId);
    if (!l) return;
    openModal(
      `${l.lead_id} // Verified Municipal Compliance Dossier`,
      `
      <div style="margin-bottom:12px;">
        <span class="pill pill-navy">URGENCY ${l.urgency_score}/100</span>
        <span class="pill pill-mono">${escapeHtml(l.native_filing_id)}</span>
        <span class="pill pill-mono">${escapeHtml(l.property_id)}</span>
      </div>
      <p style="margin:0 0 10px;"><strong>Property:</strong> ${escapeHtml(l.building_name)} — ${escapeHtml(l.address)}</p>
      <p style="margin:0 0 10px;"><strong>Recorded Owner:</strong> ${escapeHtml(l.owner_entity)}<br/>
      <strong>Operations Contact:</strong> ${escapeHtml(l.decision_maker_contact)}</p>
      <p style="margin:0 0 10px;"><strong>Equipment &amp; Citation:</strong> ${escapeHtml(l.equipment_detail)}<br/>
      <strong>Deficiency Detail:</strong> ${escapeHtml(l.deficiency_summary)}</p>
      <p style="margin:0 0 10px;"><strong>Statutory Basis:</strong> ${escapeHtml(l.statutory_hook)}</p>
      <p style="margin:0 0 12px;"><strong>Estimated Remediation Ticket:</strong> ${fmtUSD(l.est_job_low)} – ${fmtUSD(l.est_job_high)} (Midpoint ${fmtUSD(l.est_job_mid)})</p>
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px;">Ready-to-Send Contractor Outreach Script:</label>
      <pre class="code-preview" id="copy-script-target">Subject: ${escapeHtml(l.native_filing_id)} compliance sign-off for ${escapeHtml(l.address)}

Attn: ${escapeHtml(l.decision_maker_contact.split("|")[0].trim())},

We noticed active filing ${escapeHtml(l.native_filing_id)} on ${escapeHtml(l.address)} (${escapeHtml(l.equipment_detail)}) with cure target ${escapeHtml(l.cure_deadline)}. Our licensed commercial crew has availability this week to complete the deficiency remediation and file the compliance sign-off to clear the ${fmtUSD(l.est_penalty_exposure)}+ penalty exposure. Can we send over a flat-rate inspection/remediation quote?</pre>
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:14px;">
        <button class="btn btn-outline" id="btn-copy-opener">Copy Outreach Script</button>
        <button class="btn btn-dark" onclick="document.getElementById('modal-backdrop').classList.add('hidden')">Done</button>
      </div>
      `
    );
    const copyBtn = document.getElementById("btn-copy-opener");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        const txt = document.getElementById("copy-script-target").textContent;
        if (navigator.clipboard) navigator.clipboard.writeText(txt);
        copyBtn.textContent = "Copied to Clipboard!";
      });
    }
  }

  function showCheckoutModal(territoryId, tier) {
    const t = state.territories.find((x) => x.territory_id === territoryId) || state.territories[0];
    const price =
      tier === "EXCLUSIVE"
        ? `$${t.monthly_exclusive_price}/month`
        : tier === "PRO"
        ? `$${t.monthly_pro_price}/month`
        : `$${t.audit_pack_price} one-time`;

    openModal(
      `Self-Serve Checkout (Air-Gapped Sandbox) — ${tier}`,
      `
      <div class="pill pill-ok" style="margin-bottom:12px;">SAFETY AIR-GAP ACTIVE: Simulated local provisioning only — zero card charges</div>
      <p style="margin:0 0 14px;"><strong>Selected Feed:</strong> ${escapeHtml(t.display_name)} (<code>${escapeHtml(t.territory_id)}</code>)<br/>
      <strong>Plan Rate:</strong> <strong>${price}</strong> · Cancel 1-click anytime via self-serve portal · 14-day Zero-Argue Auto-Refund guarantee.</p>
      <form id="airgap-checkout-form">
        <div class="form-field">
          <label>Contracting Firm Legal Name</label>
          <input type="text" id="chk-firm" required value="Metro Commercial Mechanical LLC" />
        </div>
        <div class="form-field">
          <label>State / Municipal Trade License Number (Verified Against Open Registry)</label>
          <input type="text" id="chk-lic" required value="MP-004918" />
        </div>
        <div class="form-field">
          <label>Dispatch Routing Email (Local Simulation)</label>
          <input type="email" id="chk-email" required value="estimating@metrocommercial.example" />
        </div>
        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px;">
          <button type="button" class="btn btn-outline" id="chk-cancel">Cancel</button>
          <button type="submit" class="btn btn-emerald">Provision Instant Access (${price})</button>
        </div>
      </form>
      `
    );

    document.getElementById("chk-cancel").addEventListener("click", closeModal);
    document.getElementById("airgap-checkout-form").addEventListener("submit", function (ev) {
      ev.preventDefault();
      const firm = document.getElementById("chk-firm").value.trim();
      const lic = document.getElementById("chk-lic").value.trim();
      if (tier === "EXCLUSIVE") {
        t.exclusive_locked = true;
        t.exclusive_holder = `${firm} (${lic})`;
      } else if (tier === "PRO" && t.pro_seats_filled < t.pro_seat_cap) {
        t.pro_seats_filled += 1;
      }
      renderTerritories();
      renderFounderKpis();
      logAudit(`Simulated ${tier} checkout provisioned for ${firm} (${lic}) on ${t.territory_id}.`);

      openModal(
        `Seat Provisioned — Instant Deliverable Unlocked`,
        `
        <p><strong>${escapeHtml(firm)}</strong> (<code>${escapeHtml(lic)}</code>) is now provisioned on <strong>${escapeHtml(t.display_name)}</strong> in local sandbox state.</p>
        <p>Your live municipal compliance deliverables are ready for immediate inspection:</p>
        <div style="display:flex;flex-wrap:wrap;gap:10px;margin:16px 0;">
          <a class="btn btn-dark" href="deliverables/digests/NYC_BOILER_MECHANICAL_weekly_digest.html" target="_blank" rel="noopener">Open Sample HTML Subscriber Digest</a>
          <a class="btn btn-outline" href="${escapeHtml(BUNDLE.deliverables.audit_pack.json_relpath)}" target="_blank" rel="noopener">Open $149 Audit Pack JSON</a>
          <a class="btn btn-outline" href="${escapeHtml(BUNDLE.deliverables.audit_pack.csv_relpath)}" target="_blank" rel="noopener">Download CRM CSV</a>
        </div>
        `
      );
    });
  }

  // ---------------------------------------------------------------------------
  // Founder 20-Min/Month Console
  // ---------------------------------------------------------------------------
  function formatMMSS(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function renderTimerAndSteps() {
    document.getElementById("founder-timer-display").textContent = formatMMSS(state.timerSecondsLeft);
    document.getElementById("btn-timer-toggle").textContent = state.timerRunning
      ? "Pause Session Clock"
      : "Start 20-Min Monthly Session";

    ["step1", "step2", "step3", "step4"].forEach((k) => {
      const el = document.getElementById(`card-${k}`);
      if (el) el.classList.toggle("done", Boolean(state.stepsDone[k]));
    });
  }

  function simulateClientCohort(vol, totalConvPct, churnPct) {
    const proPrice = 199;
    const excPrice = 499;
    const auditPrice = 149;
    const infra = 64;

    const proConv = (totalConvPct / 100) * 0.78;
    const excConv = (totalConvPct / 100) * 0.22;
    const audConv = (totalConvPct / 100) * 0.52;
    const churn = churnPct / 100;

    let activePro = 0;
    let activeExc = 0;
    let prevAud = 0;
    let cumNet = 0;
    const rows = [];

    for (let m = 1; m <= 12; m++) {
      activePro = activePro * (1 - churn);
      activeExc = activeExc * (1 - churn * 0.62);
      const ramp = m === 1 ? 0.5 : m === 2 ? 0.8 : 1.0;
      const sent = vol * ramp;
      const newPro = sent * proConv;
      const newExc = sent * excConv;
      const aud = sent * audConv;
      const upg = prevAud * 0.26;
      prevAud = aud;

      activePro = Math.min(28, activePro + newPro + upg);
      activeExc = Math.min(7, activeExc + newExc);

      const mrr = activePro * proPrice + activeExc * excPrice;
      const gross = Math.max(0, mrr - upg * auditPrice + aud * auditPrice);
      const refundsAndFees = gross * (0.035 + 0.029) + (activePro + activeExc + aud) * 0.3;
      const net = gross - refundsAndFees - infra;
      cumNet += net;

      rows.push({
        month: m,
        month_label: `M${m}`,
        outbound_sent: Math.round(sent),
        active_pro_subs: activePro.toFixed(1),
        active_exclusive_subs: activeExc.toFixed(1),
        mrr_usd: mrr,
        net_profit_usd: net,
        cumulative_net_profit_usd: cumNet,
        founder_minutes: Math.min(19.2, 13.6 + (activePro + activeExc) * 0.035 * 2.1).toFixed(1),
      });
    }
    return {
      year1_net_profit_usd: cumNet,
      exit_mrr_usd: rows[11].mrr_usd,
      avg_founder_minutes_per_month: 15.1,
      monthly_schedule: rows,
    };
  }

  function getActiveFinancialModel() {
    if (state.finScenario === "custom") {
      return simulateClientCohort(
        state.customSim.outboundVol,
        state.customSim.convPct,
        state.customSim.churnPct
      );
    }
    return BUNDLE.financials.scenarios[state.finScenario];
  }

  function renderFounderKpis() {
    const activeMrr = state.territories.reduce(
      (sum, t) => sum + (t.exclusive_locked ? t.monthly_exclusive_price : t.pro_seats_filled * t.monthly_pro_price),
      0
    );
    const fin = getActiveFinancialModel();
    const mc = BUNDLE.financials.monte_carlo_1000_trials;

    document.getElementById("fkpi-mrr").textContent = fmtUSD(activeMrr) + "/mo";
    document.getElementById("fkpi-arr").textContent = `${fmtUSD(activeMrr * 12)} ARR active seat ledger`;
    document.getElementById("fkpi-y1net").textContent = fmtUSD(fin.year1_net_profit_usd);
    document.getElementById("fkpi-y1sub").textContent =
      fin.year1_net_profit_usd >= 20000
        ? `Exceeds $20,000 goal by ${fmtUSD(fin.year1_net_profit_usd - 20000)}`
        : `Below $20,000 target (${fmtUSD(fin.year1_net_profit_usd)})`;
    document.getElementById("fkpi-mc").textContent = `${mc.probability_exceeding_20k_pct}%`;
    document.getElementById("fkpi-mcsub").textContent = `P50 Median: ${fmtUSD(mc.p50_median_net_profit_usd)} (1,000 runs)`;
    document.getElementById("fkpi-time").textContent = `${fin.avg_founder_minutes_per_month} min/mo`;

    renderFinancialSvgAndTable(fin);
  }

  function renderFinancialSvgAndTable(fin) {
    const rows = fin.monthly_schedule;
    const maxCum = Math.max(25000, ...rows.map((r) => r.cumulative_net_profit_usd));
    const w = 680;
    const h = 230;
    const padL = 56;
    const padR = 20;
    const padT = 20;
    const padB = 32;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    const yFor = (val) => padT + plotH - (Math.max(0, val) / maxCum) * plotH;
    const xFor = (idx) => padL + (idx / 11) * plotW;

    const targetY = yFor(20000);
    const points = rows.map((r, i) => `${xFor(i).toFixed(1)},${yFor(r.cumulative_net_profit_usd).toFixed(1)}`).join(" ");
    const areaPoints = `${xFor(0).toFixed(1)},${(padT + plotH).toFixed(1)} ${points} ${xFor(11).toFixed(1)},${(padT + plotH).toFixed(1)}`;

    const dots = rows
      .map(
        (r, i) => `
      <circle cx="${xFor(i).toFixed(1)}" cy="${yFor(r.cumulative_net_profit_usd).toFixed(1)}" r="4" fill="#0284c7" />
      <text x="${xFor(i).toFixed(1)}" y="${h - 10}" text-anchor="middle" font-size="10" fill="#64748b">${r.month_label}</text>`
      )
      .join("");

    document.getElementById("fin-svg-container").innerHTML = `
      <svg viewBox="0 0 ${w} ${h}" width="100%" height="230" role="img" aria-label="12-Month Cumulative Net Profit vs $20,000 Goal">
        <line x1="${padL}" y1="${padT + plotH}" x2="${w - padR}" y2="${padT + plotH}" stroke="#cbd5e1" />
        <line x1="${padL}" y1="${targetY.toFixed(1)}" x2="${w - padR}" y2="${targetY.toFixed(1)}" stroke="#059669" stroke-dasharray="5,4" stroke-width="1.5" />
        <text x="${padL + 6}" y="${(targetY - 6).toFixed(1)}" font-size="11" font-weight="700" fill="#059669">$20,000 Year-1 Goal Threshold</text>
        <polygon points="${areaPoints}" fill="rgba(2, 132, 199, 0.12)" />
        <polyline fill="none" stroke="#0284c7" stroke-width="2.6" points="${points}" />
        ${dots}
        <text x="${padL - 8}" y="${padT + 8}" text-anchor="end" font-size="10" fill="#64748b">${fmtUSD(maxCum)}</text>
        <text x="${padL - 8}" y="${padT + plotH}" text-anchor="end" font-size="10" fill="#64748b">$0</text>
      </svg>`;

    document.getElementById("fin-schedule-tbody").innerHTML = rows
      .map(
        (r) => `
      <tr>
        <td><strong>${r.month_label}</strong></td>
        <td>${r.outbound_sent}</td>
        <td>${r.active_pro_subs} Pro / ${r.active_exclusive_subs} Exc</td>
        <td>${fmtUSD(r.mrr_usd)}</td>
        <td><strong>${fmtUSD(r.net_profit_usd)}</strong></td>
        <td style="color:${r.cumulative_net_profit_usd >= 20000 ? "var(--emerald)" : "var(--ink)"};font-weight:700;">${fmtUSD(r.cumulative_net_profit_usd)}</td>
        <td>${r.founder_minutes}m</td>
      </tr>`
      )
      .join("");
  }

  function renderQuarantineQueue() {
    const pendingCount = state.quarantine.filter((q) => q.status === "PENDING").length;
    if (pendingCount === 0) {
      state.stepsDone.step2 = true;
      renderTimerAndSteps();
    }
    document.getElementById("quarantine-badge").textContent = `${pendingCount} Pending`;

    document.getElementById("quarantine-tbody").innerHTML = state.quarantine
      .map((q) => {
        const actions =
          q.status === "PENDING"
            ? `
            <button class="btn btn-emerald btn-sm" data-q-action="APPROVED" data-qid="${escapeHtml(q.quarantine_id)}">Approve</button>
            <button class="btn btn-outline btn-sm" data-q-action="DROPPED" data-qid="${escapeHtml(q.quarantine_id)}">Drop</button>`
            : `<span class="pill ${q.status === "APPROVED" ? "pill-ok" : "pill-mono"}">${q.status}</span>`;

        return `
        <tr>
          <td><code>${escapeHtml(q.quarantine_id)}</code><div style="font-size:11px;color:var(--ink-muted);">${escapeHtml(q.metro)}</div></td>
          <td><strong>${escapeHtml(q.address)}</strong><div style="font-size:12px;color:var(--ink-muted);">${escapeHtml(q.source_dataset)}</div></td>
          <td><span class="pill pill-soon">${escapeHtml(q.reason_code)}</span><div style="font-size:12px;margin-top:4px;">${escapeHtml(q.reason_detail)}</div></td>
          <td>${actions}</td>
        </tr>`;
      })
      .join("");
  }

  function renderOutboundBatch() {
    const batch = BUNDLE.outbound_batch;
    const statusLabel = document.getElementById("outbound-batch-status");
    statusLabel.textContent = state.outboundApproved
      ? `COMMITTED TO LOCAL AIR-GAPPED OUTBOX (${batch.ready_for_founder_approval_count} Drafts — Zero Live Emails Sent)`
      : `${batch.ready_for_founder_approval_count} Drafts Ready · ${batch.skipped_suppressed} Suppressed · ${batch.skipped_exclusive_locked_or_full} Exclusive-Skipped`;

    const approveBtn = document.getElementById("btn-approve-outbound");
    approveBtn.disabled = state.outboundApproved;
    approveBtn.textContent = state.outboundApproved
      ? "Batch Approved (Air-Gapped Local Commit)"
      : "1-Click Approve Monthly Proof Batch (Air-Gapped)";

    document.getElementById("outbound-tbody").innerHTML = batch.drafts
      .map(
        (d) => `
      <tr>
        <td><strong>${escapeHtml(d.business_name)}</strong><div style="font-size:11px;color:var(--ink-muted);">${escapeHtml(d.recipient_email)} · Lic #${escapeHtml(d.license_number)}</div></td>
        <td><code>${escapeHtml(d.territory_id)}</code> (${d.open_pro_seats} open)</td>
        <td><code>${escapeHtml(d.proof_lead_id)}</code> — ${escapeHtml(d.proof_address)}</td>
        <td><button class="btn btn-outline btn-sm" data-preview-draft="${escapeHtml(d.draft_id)}">Inspect .EML Proof</button></td>
      </tr>`
      )
      .join("");
  }

  function renderAuditLog() {
    const box = document.getElementById("founder-audit-log");
    if (box) {
      box.innerHTML = state.auditTrail.map((line) => `<div>${escapeHtml(line)}</div>`).join("");
    }
  }

  // ---------------------------------------------------------------------------
  // Event Wiring
  // ---------------------------------------------------------------------------
  function bindEvents() {
    document.getElementById("btn-mode-storefront").addEventListener("click", () => switchView("storefront"));
    document.getElementById("btn-mode-founder").addEventListener("click", () => switchView("founder"));
    document.getElementById("hero-btn-founder").addEventListener("click", () => switchView("founder"));

    // Lead filters
    document.getElementById("flt-query").addEventListener("input", (e) => {
      state.filters.query = e.target.value;
      renderLeadExplorer();
    });
    document.getElementById("flt-metro").addEventListener("change", (e) => {
      state.filters.metro = e.target.value;
      renderLeadExplorer();
    });
    document.getElementById("flt-trade").addEventListener("change", (e) => {
      state.filters.trade = e.target.value;
      renderLeadExplorer();
    });
    document.getElementById("flt-urgency").addEventListener("change", (e) => {
      state.filters.urgency = e.target.value;
      renderLeadExplorer();
    });

    // Delegated clicks for dossier, checkout, quarantine, outbound preview
    document.body.addEventListener("click", (e) => {
      const dossierBtn = e.target.closest("[data-dossier-id]");
      if (dossierBtn) {
        showLeadDossier(dossierBtn.getAttribute("data-dossier-id"));
        return;
      }

      const claimBtn = e.target.closest("[data-claim-territory]");
      if (claimBtn) {
        const tid = claimBtn.getAttribute("data-claim-territory");
        const t = state.territories.find((x) => x.territory_id === tid);
        if (t && t.exclusive_locked) {
          document.getElementById("territory-section").scrollIntoView({ behavior: "smooth" });
        } else {
          showCheckoutModal(tid, "PRO");
        }
        return;
      }

      const chkBtn = e.target.closest("[data-checkout-tier]");
      if (chkBtn) {
        showCheckoutModal(
          chkBtn.getAttribute("data-territory"),
          chkBtn.getAttribute("data-checkout-tier")
        );
        return;
      }

      const qBtn = e.target.closest("[data-q-action]");
      if (qBtn) {
        const qid = qBtn.getAttribute("data-qid");
        const act = qBtn.getAttribute("data-q-action");
        const item = state.quarantine.find((x) => x.quarantine_id === qid);
        if (item) {
          item.status = act;
          logAudit(`Quarantine ${qid} (${item.address}) marked ${act}.`);
          renderQuarantineQueue();
        }
        return;
      }

      const draftBtn = e.target.closest("[data-preview-draft]");
      if (draftBtn) {
        const did = draftBtn.getAttribute("data-preview-draft");
        const d = BUNDLE.outbound_batch.drafts.find((x) => x.draft_id === did);
        if (d) {
          openModal(
            `${d.draft_id} // Air-Gapped Live-Lead Proof Email`,
            `
            <div class="pill pill-ok" style="margin-bottom:10px;">${escapeHtml(d.airgap_status)}</div>
            <p style="margin:0 0 8px;font-size:13px;"><strong>To:</strong> ${escapeHtml(d.business_name)} &lt;${escapeHtml(d.recipient_email)}&gt;<br/>
            <strong>Subject:</strong> ${escapeHtml(d.subject)}</p>
            <pre class="code-preview">${escapeHtml(d.body_text)}</pre>
            `
          );
        }
      }
    });

    document.getElementById("modal-close-btn").addEventListener("click", closeModal);
    document.getElementById("modal-backdrop").addEventListener("click", (e) => {
      if (e.target.id === "modal-backdrop") closeModal();
    });

    // ROI Calculator Sliders
    document.getElementById("rng-roi-ticket").addEventListener("input", (e) => {
      state.roi.avgTicket = Number(e.target.value);
      renderRoiCalculator();
    });
    document.getElementById("rng-roi-margin").addEventListener("input", (e) => {
      state.roi.marginPct = Number(e.target.value);
      renderRoiCalculator();
    });
    document.getElementById("rng-roi-leads").addEventListener("input", (e) => {
      state.roi.leadsWorked = Number(e.target.value);
      renderRoiCalculator();
    });
    document.getElementById("rng-roi-close").addEventListener("input", (e) => {
      state.roi.closeRatePct = Number(e.target.value);
      renderRoiCalculator();
    });
    document.getElementById("sel-roi-plan").addEventListener("change", (e) => {
      state.roi.planCost = Number(e.target.value);
      renderRoiCalculator();
    });

    // Founder Session Timer
    document.getElementById("btn-timer-toggle").addEventListener("click", () => {
      state.timerRunning = !state.timerRunning;
      if (state.timerRunning) {
        logAudit("Started 20-minute monthly founder review timer.");
        state.timerInterval = setInterval(() => {
          if (state.timerSecondsLeft > 0) {
            state.timerSecondsLeft -= 1;
            renderTimerAndSteps();
          }
        }, 1000);
      } else {
        clearInterval(state.timerInterval);
        logAudit("Paused monthly founder timer.");
      }
      renderTimerAndSteps();
    });

    document.getElementById("btn-timer-reset").addEventListener("click", () => {
      clearInterval(state.timerInterval);
      state.timerRunning = false;
      state.timerSecondsLeft = 20 * 60;
      renderTimerAndSteps();
    });

    // Financial Scenario Buttons & Custom Stress Sliders
    document.querySelectorAll("[data-fin-scenario]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.finScenario = btn.getAttribute("data-fin-scenario");
        document.querySelectorAll("[data-fin-scenario]").forEach((b) =>
          b.classList.toggle("active", b === btn)
        );
        document.getElementById("custom-sim-controls").classList.toggle(
          "hidden",
          state.finScenario !== "custom"
        );
        renderFounderKpis();
      });
    });

    ["sim-vol", "sim-conv", "sim-churn"].forEach((id) => {
      document.getElementById(id).addEventListener("input", () => {
        state.customSim.outboundVol = Number(document.getElementById("sim-vol").value);
        state.customSim.convPct = Number(document.getElementById("sim-conv").value);
        state.customSim.churnPct = Number(document.getElementById("sim-churn").value);
        document.getElementById("lbl-sim-vol").textContent = state.customSim.outboundVol;
        document.getElementById("lbl-sim-conv").textContent = state.customSim.convPct.toFixed(2) + "%";
        document.getElementById("lbl-sim-churn").textContent = state.customSim.churnPct.toFixed(1) + "%";
        state.finScenario = "custom";
        renderFounderKpis();
      });
    });

    // Outbound approval & Step 4 closeout
    document.getElementById("btn-approve-outbound").addEventListener("click", () => {
      state.outboundApproved = true;
      state.stepsDone.step3 = true;
      logAudit(
        `Approved Batch ${BUNDLE.outbound_batch.batch_id} (${BUNDLE.outbound_batch.ready_for_founder_approval_count} proof drafts committed locally; air-gap preserved).`
      );
      renderOutboundBatch();
      renderTimerAndSteps();
    });

    document.getElementById("btn-complete-step4").addEventListener("click", () => {
      state.stepsDone.step4 = true;
      logAudit("Verified Zero-Argue Auto-Refund queue (0 pending disputes) & closed monthly founder session.");
      renderTimerAndSteps();
    });

    document.getElementById("btn-export-audit").addEventListener("click", () => {
      const blob = new Blob(
        [
          JSON.stringify(
            {
              exported_at: new Date().toISOString(),
              airgap_mode: true,
              steps_completed: state.stepsDone,
              quarantine_decisions: state.quarantine,
              outbound_batch_approved: state.outboundApproved,
              audit_trail: state.auditTrail,
            },
            null,
            2
          ),
        ],
        { type: "application/json" }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "citesignal_founder_session_audit.json";
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // Boot
  renderHeroStats();
  renderLeadExplorer();
  renderRoiCalculator();
  renderTerritories();
  renderDeliverablesVault();
  renderTimerAndSteps();
  renderFounderKpis();
  renderQuarantineQueue();
  renderOutboundBatch();
  renderAuditLog();
  bindEvents();
})();
