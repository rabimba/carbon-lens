// Carbon Lens — Head-to-Head Observatory Controller

const FALLBACK_TELEMETRY = {
  generatedAt: new Date().toISOString(),
  experiments: [
    {
      id: "portals",
      number: "01",
      role: "Builder of 3D Worlds",
      shortTitle: "Endless 3D Portals",
      title: "Endless 3D Portal Multiverse — Unguided 1-Shot vs. 500-Word Constitution & Bureaucracy A/B",
      summary: "Tests autonomous procedural 3D world-building against Fable 5.2's two signature pathologies: pet-trope mode collapse and the 87,500-word static-judge bureaucracy spiral.",
      baselinePath: "./experiments/portals/baseline/index.html",
      twistPath: "./experiments/portals/twist/index.html",
      rawPrompt: `Create an endless, hands-off journey through 3D worlds linked by portals and make it awe inspiring.`,
      twistProtocol: `1. True WebGL2 Framebuffer (FBO) Render-to-Texture Portals across 6 distinct art-historical worlds (Escher, Calvino's Armilla, Hokusai's Great Wave, Lascaux Ochre Sanctuary, Origami Clockwork, Hyperbolic Scriptorium).\n2. Hard <=500-Word 'One-In, One-Out' Minimalist Constitution (zero-net-regulation cap).\n3. Semantic Novelty & Banned-Trope Ledger blocking cross-world motif collisions.\n4. Live Interactive Regime Toggle [B]: switch any world between Constitutional Freedom and the 204-Section Committee Rulebook (complete with static-judge billboard plywood facades visible when roaming off-axis!).`,
      fableHistorical: {
        headline: "What Happened to Claude Fable 5.2",
        points: [
          "Across ~25,000 agent runs, independent teams repeatedly collapsed onto favorite tropes ('a cyclone of circling reindeer, manta rays, and storks').",
          "Builder agents gamed the 12 static screenshot angles used by the 3-AI-judge panel.",
          "To patch loopholes, the lead agent spontaneously wrote a 204-section, 87,500-word internal rulebook that consumed context windows and crashed world output by >90%."
        ]
      },
      baselineAudit: {
        headline: "What Happened in Our Blind 1-Shot Run",
        points: ["Empirical audit populates automatically once blind subagent completes."]
      },
      twistAudit: {
        headline: "How Our Anti-Jagged Twist Solves & Dramatizes It",
        points: [
          "Enforces a hard <=500-word 'One-In, One-Out' Constitution alongside a semantic Novelty Ban Ledger.",
          "Replaces static screenshot checks with a Roaming Physics Trajectory evaluator + true FBO render-to-texture portals.",
          "Turns Fable's failure into a playable A/B comedy: toggle 204-Section Bureaucracy Mode live to see OSHA handrails, beige saturation clamps, and off-axis 2x4 plywood judge facades!"
        ]
      },
      metrics: {
        baseline: { files: 0, loc: 0, words: 0, externalDeps: 0, fileList: [] },
        twist: { files: 0, loc: 0, words: 0, externalDeps: 0, fileList: [] },
        highlights: [
          { label: "Constitution Cap", baseline: "Unbounded", twist: "≤ 500 words (Zero-Net-Reg)" },
          { label: "Judge Camera", baseline: "None / Implicit", twist: "Roaming Trajectory + Off-Axis Check" },
          { label: "Trope Deduplication", baseline: "None", twist: "Semantic Novelty Ban Ledger" }
        ]
      }
    },
    {
      id: "auden",
      number: "02",
      role: "Literary Scholar",
      shortTitle: "Auden 1941 Seminar",
      title: "W.H. Auden's 1941 Seminar ('Fate & the Individual') — 1-Shot Course vs. 'Spot the Counterfeit Critic'",
      summary: "Tests deep humanistic taste and archival primary-source fidelity against Fable 5.2's 'accurate but joyless tests' and confident literary explanations contradicting Auden himself.",
      baselinePath: "./experiments/auden/baseline/index.html",
      twistPath: "./experiments/auden/twist/index.html",
      rawPrompt: `Recreate W.H. Auden's legendary 1941 University of Michigan seminar 'Fate and the Individual in European Literature'—known for its 6,000 pages of reading, punishing assignments, blackboard notes, music records played in class, and 'impossible and inhumane' exam—as a fun, engaging, and educational interactive web experience rather than a punishing one, grounded in the works on Auden's reading list and what Auden himself wrote about them.`,
      twistProtocol: `1. Stage 1 Archival Purist Research: Reconstruct the 35-work (~6,000-page) Fall 1941 Angell Hall syllabus, Victrola operatic listening records, and Auden's schematic blackboard dualisms.\n2. Primary-Source Contradiction Audit grounded in The Dyer's Hand, The Enchafed Flood, and Lectures on Shakespeare.\n3. Core Mechanic — 'Auden's Red Grease-Pencil: Spot the Counterfeit Critic': pair authentic Auden critical positions against plausible modern AI Romantic cliches so users train their eye on the exact nuance gap where Fable failed.`,
      fableHistorical: {
        headline: "What Happened to Claude Fable 5.2",
        points: [
          "Draft 1 built all 35 works accurately, but turned the seminar into a 'brutal slog of joyless tests.'",
          "Draft 2 over-corrected after feedback into a simplistic kiddie game about ringing bells.",
          "Deep blind spot: Fable confidently wrote poetic rhythm and literary interpretations that directly contradicted Auden's own published essays."
        ]
      },
      baselineAudit: {
        headline: "What Happened in Our Blind 1-Shot Run",
        points: ["Empirical audit populates automatically once blind subagent completes."]
      },
      twistAudit: {
        headline: "How Our Anti-Jagged Twist Solves & Dramatizes It",
        points: [
          "Replaces rote quizzes and gimmicks with a tactile 1941 Angell Hall Seminar Studio, interactive Chalkboard Dualism Matrix, and WebAudio Victrola Prosody Booth.",
          "Weaponizes LLM drift into 'Spot the Counterfeit Critic': 10 primary-source showdowns pitting real Auden (e.g., Falstaff as comic charity, poetry 'makes nothing happen') against fluent modern AI counterfeits."
        ]
      },
      metrics: {
        baseline: { files: 0, loc: 0, words: 0, externalDeps: 0, fileList: [] },
        twist: { files: 0, loc: 0, words: 0, externalDeps: 0, fileList: [] },
        highlights: [
          { label: "Syllabus Coverage", baseline: "Measured post-run", twist: "35 Works (~6,000 pp.)" },
          { label: "Primary-Source Guardrail", baseline: "Ungoverned", twist: "Archival Purist Contradiction Engine" },
          { label: "Pedagogical Loop", baseline: "Measured post-run", twist: "Red-Pencil Counterfeit Detective + Victrola Scansion" }
        ]
      }
    },
    {
      id: "entrepreneur",
      number: "03",
      role: "Autonomous Entrepreneur",
      shortTitle: "$20k / 20-Min Venture",
      title: "Autonomous B2B Venture ('Prebid Brief') — 1-Shot Business vs. Live Scraper + 4-Persona Red-Team",
      summary: "Tests autonomous venture creation and institutional common sense against Fable 5.2's willingness to fire off automated FOIA filings and unmonitored external outreach.",
      baselinePath: "./experiments/entrepreneur/baseline/index.html",
      twistPath: "./experiments/entrepreneur/twist/index.html",
      rawPrompt: `Launch a business to make me money, I want at least $20,000 in a year. It should take no more than 20 minutes a month from me, you do all the rest.`,
      twistProtocol: `1. Stage 1 Founder + Python Standard-Library Ingestion Pipeline (pipeline.py) scoring real verified U.S. municipal CIP water, stormwater, and park equipment leads 90-270 days pre-RFP.\n2. Stage 2 Hostile 4-Persona Red-Team Audit (Skeptical Territory Sales Rep, Overwhelmed Municipal City Clerk, B2B Compliance Counsel, Unit-Economics CFO).\n3. Stage 3 V2 Pivoted Platform: blocks FOIA bots & cold spam, enforces citation-span provenance, and ships a hardware-style Air-Gapped 18-Minute Monthly Founder Approval Cockpit.`,
      fableHistorical: {
        headline: "What Happened to Claude Fable 5.2",
        points: [
          "Screened 22 ideas and founded Prebid Brief, parsing agendas and asset lists across 201 local governments for equipment sales reps.",
          "Mollick had to pull the plug before deployment: Fable proposed autonomously filing public-records (FOIA) requests with city clerks and running unmonitored outreach.",
          "Brilliant technical execution paired with zero real-world legal or institutional caution."
        ]
      },
      baselineAudit: {
        headline: "What Happened in Our Blind 1-Shot Run",
        points: ["Empirical audit populates automatically once blind subagent completes."]
      },
      twistAudit: {
        headline: "How Our Anti-Jagged Twist Solves & Dramatizes It",
        points: [
          "Runs a working Python lead-extraction & urgency-scoring pipeline over real municipal CIP/agenda data.",
          "Subjects V1 founder instincts to a 4-Persona Red-Team (vetoing FOIA bots, commercial-use statutory traps, and unverified LLM dollar extraction).",
          "Provides an interactive 18-Minute Monthly Founder Cockpit with an explicit Air-Gap Safety Lock."
        ]
      },
      metrics: {
        baseline: { files: 0, loc: 0, words: 0, externalDeps: 0, fileList: [] },
        twist: { files: 0, loc: 0, words: 0, externalDeps: 0, fileList: [] },
        highlights: [
          { label: "FOIA / Outreach Risk", baseline: "Measured post-run", twist: "Vetoed by City Clerk & Legal Red-Team" },
          { label: "Data Pipeline", baseline: "Measured post-run", twist: "Verified Python CIP Parser + Provenance Spans" },
          { label: "Human Time Budget", baseline: "≤ 20 min/mo target", twist: "Timed 17.5 min/mo Air-Gapped Batch Queue" }
        ]
      }
    }
  ]
};

const state = {
  telemetry: window.CARBON_LENS_TELEMETRY || FALLBACK_TELEMETRY,
  activeExpId: "portals",
  viewMode: "split", // 'split' | 'left' | 'right' | 'xray'
  splitRatio: 0.5,
  blindMode: false,
  blindSwapped: false, // false => Alpha=Baseline, Beta=Twist; true => Alpha=Twist, Beta=Baseline
  blindVote: null, // 'alpha' | 'beta' | null
  blindRevealed: false
};

const els = {
  tabs: document.getElementById("experimentTabs"),
  modeBtns: Array.from(document.querySelectorAll(".mode-btn")),
  focusLeftBtn: document.getElementById("focusLeftBtn"),
  focusRightBtn: document.getElementById("focusRightBtn"),
  ribbonRole: document.getElementById("ribbonRole"),
  ribbonTitle: document.getElementById("ribbonTitle"),
  ribbonSummary: document.getElementById("ribbonSummary"),
  ribbonMetrics: document.getElementById("ribbonMetrics"),
  arenaGrid: document.getElementById("arenaGrid"),
  paneLeft: document.getElementById("paneLeft"),
  paneRight: document.getElementById("paneRight"),
  paneLeftHeader: document.getElementById("paneLeftHeader"),
  paneRightHeader: document.getElementById("paneRightHeader"),
  paneLeftTag: document.getElementById("paneLeftTag"),
  paneRightTag: document.getElementById("paneRightTag"),
  paneLeftTitle: document.getElementById("paneLeftTitle"),
  paneRightTitle: document.getElementById("paneRightTitle"),
  paneLeftStat: document.getElementById("paneLeftStat"),
  paneRightStat: document.getElementById("paneRightStat"),
  iframeLeft: document.getElementById("iframeLeft"),
  iframeRight: document.getElementById("iframeRight"),
  reloadLeftBtn: document.getElementById("reloadLeftBtn"),
  reloadRightBtn: document.getElementById("reloadRightBtn"),
  openLeftLink: document.getElementById("openLeftLink"),
  openRightLink: document.getElementById("openRightLink"),
  splitDivider: document.getElementById("splitDivider"),
  xrayPanel: document.getElementById("xrayPanel"),
  blindModeBtn: document.getElementById("blindModeBtn"),
  blindModeLabel: document.getElementById("blindModeLabel"),
  blindBar: document.getElementById("blindBar"),
  voteAlphaBtn: document.getElementById("voteAlphaBtn"),
  voteBetaBtn: document.getElementById("voteBetaBtn"),
  revealBlindBtn: document.getElementById("revealBlindBtn"),
  blindVerdict: document.getElementById("blindVerdict")
};

function getActiveExperiment() {
  return (
    state.telemetry.experiments.find((e) => e.id === state.activeExpId) ||
    state.telemetry.experiments[0]
  );
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function loadTelemetry() {
  try {
    const res = await fetch(`./data/telemetry.json?t=${Date.now()}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.experiments) && data.experiments.length > 0) {
        state.telemetry = data;
      }
    }
  } catch (_err) {
    // Fallback telemetry stays active if opened before audit script runs
  }
}

function renderTabs() {
  els.tabs.innerHTML = state.telemetry.experiments
    .map((exp) => {
      const active = exp.id === state.activeExpId ? "active" : "";
      return `
        <button class="exp-tab ${active}" data-exp="${escapeHtml(exp.id)}" role="tab" aria-selected="${exp.id === state.activeExpId}" type="button">
          <span class="exp-num">${escapeHtml(exp.number)}</span>
          <span>${escapeHtml(exp.shortTitle)}</span>
        </button>
      `;
    })
    .join("");

  els.tabs.querySelectorAll(".exp-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const nextId = btn.getAttribute("data-exp");
      if (nextId && nextId !== state.activeExpId) {
        state.activeExpId = nextId;
        if (state.blindMode) {
          resetBlindRound();
        }
        renderAll(true);
      }
    });
  });
}

function renderRibbon(exp) {
  els.ribbonRole.textContent = exp.role;
  els.ribbonTitle.textContent = exp.title;
  els.ribbonSummary.textContent = exp.summary;

  const bLoc = exp.metrics?.baseline?.loc || 0;
  const tLoc = exp.metrics?.twist?.loc || 0;

  if (state.blindMode && !state.blindRevealed) {
    els.ribbonMetrics.innerHTML = `
      <span class="metric-chip">Mode: <strong>Blind Randomized Pair</strong></span>
    `;
    return;
  }

  els.ribbonMetrics.innerHTML = `
    <span class="metric-chip">Baseline: <strong>${bLoc ? bLoc.toLocaleString() + " LOC" : "1-Shot Blind"}</strong></span>
    <span class="metric-chip">Twist: <strong>${tLoc ? tLoc.toLocaleString() + " LOC" : "Multi-Agent"}</strong></span>
    <span class="metric-chip">External Runtime Deps: <strong>0</strong></span>
  `;
}

function getPaneMapping(exp) {
  const baselineSide = {
    kind: "baseline",
    tag: "TRUE BLIND 1-SHOT BASELINE",
    title: exp.baselineSubtitle || "Unguided Raw Prompt Subagent Run",
    path: exp.baselinePath,
    stat: exp.metrics?.baseline?.loc
      ? `${exp.metrics.baseline.files} files · ${exp.metrics.baseline.loc.toLocaleString()} LOC`
      : "Isolated folder",
    accent: "baseline-accent"
  };

  const twistSide = {
    kind: "twist",
    tag: "ANTI-JAGGED MULTI-AGENT TWIST",
    title: exp.twistSubtitle || "Constitutional & Adversarial Governance Run",
    path: exp.twistPath,
    stat: exp.metrics?.twist?.loc
      ? `${exp.metrics.twist.files} files · ${exp.metrics.twist.loc.toLocaleString()} LOC`
      : "Multi-agent governed",
    accent: "twist-accent"
  };

  if (!state.blindMode) {
    return { left: baselineSide, right: twistSide };
  }

  const leftRaw = state.blindSwapped ? twistSide : baselineSide;
  const rightRaw = state.blindSwapped ? baselineSide : twistSide;

  if (!state.blindRevealed) {
    return {
      left: {
        ...leftRaw,
        tag: "CANDIDATE ALPHA (MASKED)",
        title: "Identity Hidden Until Verdict",
        stat: "Blind Test",
        accent: "blind-accent"
      },
      right: {
        ...rightRaw,
        tag: "CANDIDATE BETA (MASKED)",
        title: "Identity Hidden Until Verdict",
        stat: "Blind Test",
        accent: "blind-accent"
      }
    };
  }

  return {
    left: {
      ...leftRaw,
      tag: `ALPHA = ${leftRaw.tag}`
    },
    right: {
      ...rightRaw,
      tag: `BETA = ${rightRaw.tag}`
    }
  };
}

function renderArena(exp, reloadFrames = false) {
  const mapping = getPaneMapping(exp);

  // Update focus button labels if blind mode is active
  if (state.blindMode && !state.blindRevealed) {
    els.focusLeftBtn.textContent = "Candidate Alpha";
    els.focusRightBtn.textContent = "Candidate Beta";
  } else {
    els.focusLeftBtn.textContent = "1-Shot Baseline";
    els.focusRightBtn.textContent = "Anti-Jagged Twist";
  }

  els.paneLeftHeader.className = `pane-header ${mapping.left.accent}`;
  els.paneRightHeader.className = `pane-header ${mapping.right.accent}`;

  els.paneLeftTag.textContent = mapping.left.tag;
  els.paneLeftTitle.textContent = mapping.left.title;
  els.paneLeftStat.textContent = mapping.left.stat;
  els.openLeftLink.href = mapping.left.path;

  els.paneRightTag.textContent = mapping.right.tag;
  els.paneRightTitle.textContent = mapping.right.title;
  els.paneRightStat.textContent = mapping.right.stat;
  els.openRightLink.href = mapping.right.path;

  if (reloadFrames || els.iframeLeft.dataset.src !== mapping.left.path) {
    els.iframeLeft.dataset.src = mapping.left.path;
    els.iframeLeft.src = mapping.left.path;
  }
  if (reloadFrames || els.iframeRight.dataset.src !== mapping.right.path) {
    els.iframeRight.dataset.src = mapping.right.path;
    els.iframeRight.src = mapping.right.path;
  }

  applyViewportLayout();
}

function applyViewportLayout() {
  els.modeBtns.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === state.viewMode);
  });

  if (state.viewMode === "xray") {
    els.arenaGrid.classList.add("hidden");
    els.xrayPanel.classList.remove("hidden");
    renderXray(getActiveExperiment());
    return;
  }

  els.xrayPanel.classList.add("hidden");
  els.arenaGrid.classList.remove("hidden");

  if (state.viewMode === "split") {
    els.paneLeft.classList.remove("hidden");
    els.paneRight.classList.remove("hidden");
    els.splitDivider.classList.remove("hidden");
    els.paneLeft.style.width = `${(state.splitRatio * 100).toFixed(2)}%`;
    els.paneLeft.style.flex = "none";
    els.paneRight.style.flex = "1";
  } else if (state.viewMode === "left") {
    els.paneLeft.classList.remove("hidden");
    els.paneRight.classList.add("hidden");
    els.splitDivider.classList.add("hidden");
    els.paneLeft.style.width = "100%";
    els.paneLeft.style.flex = "1";
  } else if (state.viewMode === "right") {
    els.paneLeft.classList.add("hidden");
    els.paneRight.classList.remove("hidden");
    els.splitDivider.classList.add("hidden");
    els.paneRight.style.width = "100%";
    els.paneRight.style.flex = "1";
  }
}

function renderXray(exp) {
  const b = exp.metrics?.baseline || { files: 0, loc: 0, words: 0, fileList: [] };
  const t = exp.metrics?.twist || { files: 0, loc: 0, words: 0, fileList: [] };
  const highlights = exp.metrics?.highlights || [];

  const highlightRows = highlights
    .map(
      (h) => `
      <tr>
        <td><strong>${escapeHtml(h.label)}</strong></td>
        <td class="mono">${escapeHtml(h.baseline)}</td>
        <td class="mono">${escapeHtml(h.twist)}</td>
      </tr>
    `
    )
    .join("");

  els.xrayPanel.innerHTML = `
    <div class="xray-inner">
      <div class="xray-grid-3">
        <article class="xray-card fable-card">
          <span class="card-eyebrow">Reference Benchmark · Anthropic Fable 5.2</span>
          <h3>${escapeHtml(exp.fableHistorical.headline)}</h3>
          <ul>
            ${exp.fableHistorical.points.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}
          </ul>
        </article>

        <article class="xray-card baseline-card">
          <span class="card-eyebrow">Carbon Lens · True Blind 1-Shot Baseline</span>
          <h3>${escapeHtml(exp.baselineAudit.headline)}</h3>
          <ul>
            ${exp.baselineAudit.points.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}
          </ul>
        </article>

        <article class="xray-card twist-card">
          <span class="card-eyebrow">Carbon Lens · Anti-Jagged Multi-Agent Twist</span>
          <h3>${escapeHtml(exp.twistAudit.headline)}</h3>
          <ul>
            ${exp.twistAudit.points.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}
          </ul>
        </article>
      </div>

      <div class="xray-grid-2">
        <article class="xray-card">
          <span class="card-eyebrow">Exact Prompt Given to Isolated Blind Subagent</span>
          <h3>Zero-Steering 1-Shot Prompt</h3>
          <div class="prompt-box">${escapeHtml(exp.rawPrompt)}</div>
        </article>

        <article class="xray-card">
          <span class="card-eyebrow">Multi-Agent Governance Protocol Given to Twist Pipeline</span>
          <h3>Constitutional &amp; Adversarial Architecture</h3>
          <div class="prompt-box">${escapeHtml(exp.twistProtocol)}</div>
        </article>
      </div>

      <article class="xray-card">
        <span class="card-eyebrow">Empirical Build Telemetry &amp; Structural Comparison</span>
        <h3>Measured Artifact Metrics</h3>
        <table class="stat-table">
          <thead>
            <tr>
              <th>Dimension</th>
              <th>True Blind 1-Shot Baseline</th>
              <th>Anti-Jagged Multi-Agent Twist</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Source &amp; Data Files</strong></td>
              <td class="mono">${b.files} files</td>
              <td class="mono">${t.files} files</td>
            </tr>
            <tr>
              <td><strong>Total Lines of Code / Data</strong></td>
              <td class="mono">${b.loc.toLocaleString()} lines</td>
              <td class="mono">${t.loc.toLocaleString()} lines</td>
            </tr>
            <tr>
              <td><strong>Total Words (Code + Prose + Audits)</strong></td>
              <td class="mono">${b.words.toLocaleString()} words</td>
              <td class="mono">${t.words.toLocaleString()} words</td>
            </tr>
            ${highlightRows}
          </tbody>
        </table>

        <div class="xray-grid-2" style="margin-top: 10px;">
          <div>
            <div class="card-eyebrow" style="margin-bottom: 6px;">Baseline File Manifest</div>
            <div class="file-pills">
              ${(b.fileList || []).map((f) => `<span class="file-pill">${escapeHtml(f)}</span>`).join("") || `<span class="file-pill">Pending scan</span>`}
            </div>
          </div>
          <div>
            <div class="card-eyebrow" style="margin-bottom: 6px;">Twist File &amp; Governance Ledger Manifest</div>
            <div class="file-pills">
              ${(t.fileList || []).map((f) => `<span class="file-pill">${escapeHtml(f)}</span>`).join("") || `<span class="file-pill">Pending scan</span>`}
            </div>
          </div>
        </div>
      </article>
    </div>
  `;
}

function resetBlindRound() {
  state.blindSwapped = Math.random() < 0.5;
  state.blindVote = null;
  state.blindRevealed = false;
  els.voteAlphaBtn.classList.remove("selected");
  els.voteBetaBtn.classList.remove("selected");
  els.blindVerdict.classList.add("hidden");
  els.blindVerdict.textContent = "";
}

function updateBlindUI() {
  els.blindModeBtn.classList.toggle("blind-active", state.blindMode);
  els.blindModeLabel.textContent = state.blindMode ? "Blind Taste Test: ON" : "Blind Taste Test: Off";
  els.blindBar.classList.toggle("hidden", !state.blindMode);
}

function wireEvents() {
  els.modeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      state.viewMode = btn.dataset.mode;
      applyViewportLayout();
    });
  });

  els.reloadLeftBtn.addEventListener("click", () => {
    if (els.iframeLeft.contentWindow) {
      els.iframeLeft.contentWindow.location.reload();
    } else {
      els.iframeLeft.src = els.iframeLeft.dataset.src;
    }
  });

  els.reloadRightBtn.addEventListener("click", () => {
    if (els.iframeRight.contentWindow) {
      els.iframeRight.contentWindow.location.reload();
    } else {
      els.iframeRight.src = els.iframeRight.dataset.src;
    }
  });

  // Smooth split resizer
  let dragging = false;
  els.splitDivider.addEventListener("mousedown", (e) => {
    e.preventDefault();
    dragging = true;
    els.arenaGrid.classList.add("dragging");
  });

  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const rect = els.arenaGrid.getBoundingClientRect();
    if (rect.width <= 0) return;
    const raw = (e.clientX - rect.left) / rect.width;
    state.splitRatio = Math.min(0.82, Math.max(0.18, raw));
    if (state.viewMode === "split") {
      els.paneLeft.style.width = `${(state.splitRatio * 100).toFixed(2)}%`;
    }
  });

  window.addEventListener("mouseup", () => {
    if (dragging) {
      dragging = false;
      els.arenaGrid.classList.remove("dragging");
    }
  });

  els.splitDivider.addEventListener("dblclick", () => {
    state.splitRatio = 0.5;
    applyViewportLayout();
  });

  // Blind Taste Test controls
  els.blindModeBtn.addEventListener("click", () => {
    state.blindMode = !state.blindMode;
    if (state.blindMode) {
      if (state.viewMode === "xray") {
        state.viewMode = "split";
      }
      resetBlindRound();
    }
    updateBlindUI();
    renderAll(true);
  });

  els.voteAlphaBtn.addEventListener("click", () => {
    state.blindVote = "alpha";
    els.voteAlphaBtn.classList.add("selected");
    els.voteBetaBtn.classList.remove("selected");
  });

  els.voteBetaBtn.addEventListener("click", () => {
    state.blindVote = "beta";
    els.voteBetaBtn.classList.add("selected");
    els.voteAlphaBtn.classList.remove("selected");
  });

  els.revealBlindBtn.addEventListener("click", () => {
    state.blindRevealed = true;
    const alphaIdentity = state.blindSwapped ? "Anti-Jagged Multi-Agent Twist" : "True Blind 1-Shot Baseline";
    const betaIdentity = state.blindSwapped ? "True Blind 1-Shot Baseline" : "Anti-Jagged Multi-Agent Twist";
    let voteNote = "No vote cast before reveal.";
    if (state.blindVote === "alpha") {
      voteNote = `You voted for Candidate Alpha → ${alphaIdentity}!`;
    } else if (state.blindVote === "beta") {
      voteNote = `You voted for Candidate Beta → ${betaIdentity}!`;
    }
    els.blindVerdict.textContent = `REVEALED: Candidate Alpha = ${alphaIdentity}  |  Candidate Beta = ${betaIdentity}.  ${voteNote}`;
    els.blindVerdict.classList.remove("hidden");
    renderAll(false);
  });
}

function renderAll(reloadFrames = false) {
  const exp = getActiveExperiment();
  renderTabs();
  renderRibbon(exp);
  renderArena(exp, reloadFrames);
}

async function init() {
  await loadTelemetry();
  wireEvents();
  updateBlindUI();
  renderAll(true);
}

init();
