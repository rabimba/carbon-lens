// Stage 2 Interactive Controller: W.H. Auden's Fall 1941 Angell Hall Seminar Studio
(function () {
  "use strict";

  const STUDIO = window.AUDEN_STUDIO;
  const STORAGE_KEY = "auden_1941_studio_ledger_v1";
  const ROMAN_NUMERALS = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

  const state = {
    activeRoom: "syllabus", // 'syllabus' | 'chalkboard' | 'counterfeit' | 'booth' | 'colloquium'
    provenanceOpen: false,

    // Room I: Syllabus
    searchQuery: "",
    arcFilter: "all",
    genreFilter: "all",
    poleFilter: "all",
    selectedWorkNumber: 8, // Shakespeare, Henry IV, Part 2

    // Room II: Chalkboard
    activeSchemaId: "coordinate",
    selectedChalkNodeId: "falstaff",
    redrawTick: 0,

    // Room III: Spot the Counterfeit Critic
    activeCaseNumber: 1,

    // Room IV: Acoustic & Prosody Lab
    activePlateId: "plate-tristan",
    currentChordStepText: "Stylus at rest · Select a 78-RPM pressing to audition.",
    activeProsodyId: "sapphic",
    prosodyPracticeMode: false,
    userScansionMarks: {},
    pulsingTokenKey: null,

    // Room V: 1941 Socratic Colloquium
    selectedCast: {
      classical: "prospero",
      comicReligious: "falstaff",
      modernDaemon: "iago"
    },

    // Persistent Commonplace Ledger
    ledger: {
      worksInspected: [8],
      chalkNodesVisited: ["falstaff"],
      counterfeitResults: {},
      boothAuditioned: [],
      danteChoices: {},
      librettosStaged: []
    }
  };

  let prosodyTimers = [];
  let scopeAnimId = null;

  // =========================================================================
  // PERSISTENCE & COMMONPLACE LEDGER
  // =========================================================================

  function loadLedger() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        state.ledger = {
          worksInspected: Array.isArray(parsed.worksInspected) ? parsed.worksInspected : [8],
          chalkNodesVisited: Array.isArray(parsed.chalkNodesVisited) ? parsed.chalkNodesVisited : ["falstaff"],
          counterfeitResults: parsed.counterfeitResults || {},
          boothAuditioned: Array.isArray(parsed.boothAuditioned) ? parsed.boothAuditioned : [],
          danteChoices: parsed.danteChoices || {},
          librettosStaged: Array.isArray(parsed.librettosStaged) ? parsed.librettosStaged : []
        };
      }
    } catch (_) {}
  }

  function saveLedger() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.ledger));
    } catch (_) {}
    renderLedgerPills();
  }

  function addUnique(arr, item) {
    if (!arr.includes(item)) {
      arr.push(item);
      saveLedger();
    }
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function renderLedgerPills() {
    const el = document.getElementById("ledger-pills");
    if (!el) return;
    const counterfeitSolved = Object.values(state.ledger.counterfeitResults).filter((r) => r.won).length;
    const colloquiumCount = Object.keys(state.ledger.danteChoices).length + (state.ledger.librettosStaged.length > 0 ? 1 : 0);

    el.innerHTML = `
      <span class="ledger-metric" title="Syllabus works inspected">SYLLABUS <strong>${pad2(state.ledger.worksInspected.length)}/35</strong></span>
      <span class="dot-sep">·</span>
      <span class="ledger-metric" title="Slate loci examined">SLATE <strong>${pad2(state.ledger.chalkNodesVisited.length)}</strong></span>
      <span class="dot-sep">·</span>
      <span class="ledger-metric is-rubric" title="Counterfeit critics struck">PROOFS <strong>${pad2(counterfeitSolved)}/10</strong></span>
      <span class="dot-sep">·</span>
      <span class="ledger-metric" title="Acoustic plates & meters auditioned">LAB <strong>${pad2(state.ledger.boothAuditioned.length)}/08</strong></span>
      <span class="dot-sep">·</span>
      <span class="ledger-metric" title="Colloquium exercises completed">COLLOQUIUM <strong>${pad2(colloquiumCount)}/07</strong></span>
    `;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // =========================================================================
  // ROOM NAVIGATION
  // =========================================================================

  function switchRoom(roomId, silent = false) {
    if (!["syllabus", "chalkboard", "counterfeit", "booth", "colloquium"].includes(roomId)) return;
    if (state.activeRoom !== roomId && !silent) {
      STUDIO.audio.playPaperTurn();
    }
    if (state.activeRoom === "booth" && roomId !== "booth") {
      stopBoothPlayback();
    }
    state.activeRoom = roomId;

    document.querySelectorAll(".studio-tab").forEach((btn) => {
      const isSelected = btn.dataset.room === roomId;
      btn.setAttribute("aria-selected", isSelected ? "true" : "false");
    });

    document.querySelectorAll(".room-panel").forEach((panel) => {
      panel.classList.toggle("active", panel.id === `room-${roomId}`);
    });

    if (roomId === "chalkboard") {
      renderChalkboardRoom();
    } else if (roomId === "counterfeit") {
      renderCounterfeitRoom();
    } else if (roomId === "booth") {
      renderBoothRoom();
      startOscilloscopeLoop();
    } else if (roomId === "colloquium") {
      renderColloquiumRoom();
    } else {
      renderSyllabusRoom();
    }
  }

  // =========================================================================
  // ROOM I: 35-WORK SYLLABUS INDEX & STICKY PROOF FOLIO
  // =========================================================================

  function getFilteredWorks() {
    const q = state.searchQuery.trim().toLowerCase();
    return STUDIO.SYLLABUS_35.filter((w) => {
      if (state.arcFilter !== "all" && w.arc !== state.arcFilter) return false;
      if (state.genreFilter !== "all" && w.genre !== state.genreFilter) return false;
      if (state.poleFilter !== "all" && w.pole !== state.poleFilter) return false;
      if (q) {
        const hay = `${w.number} ${w.author} ${w.title} ${w.subtitle} ${w.audenLens} ${w.clicheInversion} ${w.edition1941} ${w.pole}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function renderArcRibbon() {
    const container = document.getElementById("arc-ribbon");
    if (!container) return;

    const allCell = `
      <button type="button" class="arc-cell ${state.arcFilter === "all" ? "is-active" : ""}" data-arc="all">
        <span class="arc-cell-kicker">I–V · COMPLETE</span>
        <span class="arc-cell-title">All Historical Arcs</span>
        <span class="arc-cell-meta">35 works · 6,240 pp.</span>
      </button>
    `;

    const arcCells = STUDIO.HISTORICAL_ARCS.map((arc) => {
      const worksInArc = STUDIO.SYLLABUS_35.filter((w) => w.arc === arc.id);
      const pagesInArc = worksInArc.reduce((s, w) => s + w.pages, 0);
      return `
        <button type="button" class="arc-cell ${state.arcFilter === arc.id ? "is-active" : ""}" data-arc="${arc.id}">
          <span class="arc-cell-kicker">ARC ${escapeHtml(arc.roman)} · ${escapeHtml(arc.years)}</span>
          <span class="arc-cell-title">${escapeHtml(arc.shortTitle)}</span>
          <span class="arc-cell-meta">${worksInArc.length} works · ${pagesInArc.toLocaleString()} pp.</span>
        </button>
      `;
    }).join("");

    container.innerHTML = allCell + arcCells;

    container.querySelectorAll(".arc-cell").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.arcFilter = btn.dataset.arc;
        STUDIO.audio.playPaperTurn();
        renderSyllabusRoom();
      });
    });
  }

  function renderSyllabusRoom() {
    renderArcRibbon();

    const filtered = getFilteredWorks();
    const filteredPages = filtered.reduce((acc, w) => acc + w.pages, 0);
    const pct = Math.min(100, Math.round((filteredPages / STUDIO.COURSE_META.assignedPages) * 100));
    const maxPagesInSingleWork = 680;

    const burdenEl = document.getElementById("page-burden-bar");
    if (burdenEl) {
      const activeArcObj = STUDIO.HISTORICAL_ARCS.find((a) => a.id === state.arcFilter);
      burdenEl.innerHTML = `
        <div>
          <span>DISPLAYING <strong>${pad2(filtered.length)} / 35 WORKS</strong> · <strong>${filteredPages.toLocaleString()} / 6,240 PP.</strong> · PACE: ${Math.round(filteredPages / 15)} PP./WK</span>
          ${activeArcObj ? `<span class="dot-sep"> · </span><span>${escapeHtml(activeArcObj.title)}</span>` : ""}
        </div>
        <div class="pace-track" aria-hidden="true">
          <div class="pace-fill" style="width:${pct}%"></div>
        </div>
      `;
    }

    const gridEl = document.getElementById("works-grid");
    if (gridEl) {
      if (filtered.length === 0) {
        gridEl.innerHTML = `
          <div style="padding:2rem 0.65rem;">
            <p style="color:var(--ink-secondary);margin-bottom:0.85rem;">No entries on the Fall 1941 syllabus match the active filter criteria.</p>
            <button type="button" class="btn-quiet" id="btn-clear-syllabus-filters">Reset Syllabus Filters</button>
          </div>
        `;
        const resetBtn = document.getElementById("btn-clear-syllabus-filters");
        if (resetBtn) {
          resetBtn.addEventListener("click", () => {
            state.searchQuery = "";
            state.arcFilter = "all";
            state.genreFilter = "all";
            state.poleFilter = "all";
            document.getElementById("syllabus-search").value = "";
            document.getElementById("genre-filter").value = "all";
            document.getElementById("pole-filter").value = "all";
            renderSyllabusRoom();
          });
        }
      } else {
        gridEl.innerHTML = filtered.map((w) => {
          const isSelected = w.number === state.selectedWorkNumber;
          const isRead = state.ledger.worksInspected.includes(w.number);
          const sparkPct = Math.max(6, Math.round((w.pages / maxPagesInSingleWork) * 100));
          const caseRoman = w.counterfeitCaseId ? ROMAN_NUMERALS[w.counterfeitCaseId] : "";

          return `
            <button type="button" class="index-row ${isSelected ? "is-selected" : ""}" data-num="${w.number}">
              <span class="row-idx">${pad2(w.number)}${isRead ? " ·" : ""}</span>
              <span>
                <span class="row-work-title">${escapeHtml(w.title)}</span>
                <span class="row-work-author">${escapeHtml(w.author)} · ${escapeHtml(w.year)} · ${escapeHtml(w.week)}</span>
              </span>
              <span class="row-meta-col">
                ${escapeHtml(w.genre)} · ${escapeHtml(w.pole)}
                ${caseRoman ? `<span class="row-case-flag">§ Proof ${caseRoman}</span>` : ""}
              </span>
              <span class="row-extent-col">
                ${w.pages} pp.
                <span class="extent-spark" aria-hidden="true">
                  <span class="extent-spark-bar" style="width:${sparkPct}%"></span>
                </span>
              </span>
            </button>
          `;
        }).join("");

        gridEl.querySelectorAll(".index-row").forEach((row) => {
          row.addEventListener("click", () => {
            const num = Number(row.dataset.num);
            state.selectedWorkNumber = num;
            addUnique(state.ledger.worksInspected, num);
            STUDIO.audio.playPaperTurn();
            renderSyllabusRoom();
          });
        });
      }
    }

    renderWorkInspector();
    renderCompanionShelf();
  }

  function renderWorkInspector() {
    const inspectorEl = document.getElementById("work-inspector");
    if (!inspectorEl) return;

    const w = STUDIO.SYLLABUS_35.find((item) => item.number === state.selectedWorkNumber) || STUDIO.SYLLABUS_35[0];
    const arcObj = STUDIO.HISTORICAL_ARCS.find((a) => a.id === w.arc);
    const caseRoman = w.counterfeitCaseId ? ROMAN_NUMERALS[w.counterfeitCaseId] : "";

    const pairedChips = (w.pairedNumbers || []).map((num) => {
      const target = STUDIO.SYLLABUS_35.find((item) => item.number === num);
      if (!target) return "";
      return `<button type="button" class="thread-ref" data-jump-work="${target.number}">#${pad2(target.number)} ${escapeHtml(target.author)}</button>`;
    }).join("");

    inspectorEl.innerHTML = `
      <div class="folio-running-head">
        <span>FOLIO #${pad2(w.number)} · ${escapeHtml(w.week)}</span>
        <span>${w.pages} PAGES</span>
      </div>

      <h3>${escapeHtml(w.title)}</h3>
      <div class="folio-byline">${escapeHtml(w.author)} (${escapeHtml(w.year)}) — ${escapeHtml(w.subtitle)}</div>

      <div class="folio-spec-line">
        ${escapeHtml(arcObj ? `ARC ${arcObj.roman}` : w.arc)} · ${escapeHtml(w.genre)} · POLE OF ${escapeHtml(w.pole)}
      </div>

      <blockquote class="folio-epigraph">“${escapeHtml(w.keyQuote)}”</blockquote>

      <div class="folio-rubric">Auden’s 1941 Angell Hall Lens</div>
      <p class="folio-prose">${escapeHtml(w.audenLens)}</p>

      <div class="folio-rubric">Conventional Cliché Inverted</div>
      <p class="folio-prose">${escapeHtml(w.clicheInversion)}</p>

      <div class="folio-rubric">1941 Wahr’s Bookstore Classroom Edition</div>
      <p class="folio-prose" style="font-size:0.84rem;color:var(--ink-secondary);">${escapeHtml(w.edition1941)}</p>

      <div class="folio-rubric">Cross-Century Seminar Pairings</div>
      <div class="thread-list">${pairedChips}</div>

      <div class="folio-footer-actions">
        ${w.chalkNodeId ? `<button type="button" class="btn-quiet" id="btn-jump-chalk">Locate on Slate Matrix →</button>` : ""}
        ${w.counterfeitCaseId ? `<button type="button" class="btn-editorial-primary vermilion" id="btn-jump-case">Inspect Proof ${caseRoman} →</button>` : ""}
      </div>
    `;

    inspectorEl.querySelectorAll("[data-jump-work]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const num = Number(btn.dataset.jumpWork);
        state.selectedWorkNumber = num;
        addUnique(state.ledger.worksInspected, num);
        STUDIO.audio.playPaperTurn();
        renderSyllabusRoom();
      });
    });

    const chalkBtn = document.getElementById("btn-jump-chalk");
    if (chalkBtn && w.chalkNodeId) {
      chalkBtn.addEventListener("click", () => {
        state.activeSchemaId = "coordinate";
        state.selectedChalkNodeId = w.chalkNodeId;
        addUnique(state.ledger.chalkNodesVisited, w.chalkNodeId);
        switchRoom("chalkboard");
      });
    }

    const caseBtn = document.getElementById("btn-jump-case");
    if (caseBtn && w.counterfeitCaseId) {
      caseBtn.addEventListener("click", () => {
        state.activeCaseNumber = w.counterfeitCaseId;
        switchRoom("counterfeit");
      });
    }
  }

  function renderCompanionShelf() {
    const shelfEl = document.getElementById("companion-grid");
    if (!shelfEl || shelfEl.dataset.rendered === "true") return;
    shelfEl.innerHTML = STUDIO.COMPANION_TEXTS_8.map((c) => `
      <div class="companion-cell">
        <strong>${escapeHtml(c.author)} — <em>${escapeHtml(c.title)}</em></strong>
        <span>${escapeHtml(c.role)}</span>
      </div>
    `).join("");
    shelfEl.dataset.rendered = "true";
  }

  // =========================================================================
  // ROOM II: SLATE CHALKBOARD MATRIX
  // =========================================================================

  function renderChalkboardRoom() {
    const schema = STUDIO.CHALKBOARD_SCHEMAS[state.activeSchemaId] || STUDIO.CHALKBOARD_SCHEMAS.coordinate;
    if (!schema.nodes.some((n) => n.id === state.selectedChalkNodeId)) {
      state.selectedChalkNodeId = schema.nodes[0].id;
    }

    const tabsEl = document.getElementById("chalk-schema-tabs");
    if (tabsEl) {
      tabsEl.innerHTML = Object.values(STUDIO.CHALKBOARD_SCHEMAS).map((s) => `
        <button type="button" class="seg-btn ${s.id === schema.id ? "is-active" : ""}" data-schema="${s.id}">
          ${escapeHtml(s.tabLabel)}
        </button>
      `).join("");

      tabsEl.querySelectorAll(".seg-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          state.activeSchemaId = btn.dataset.schema;
          const nextSchema = STUDIO.CHALKBOARD_SCHEMAS[state.activeSchemaId];
          state.selectedChalkNodeId = nextSchema.nodes[0].id;
          addUnique(state.ledger.chalkNodesVisited, state.selectedChalkNodeId);
          STUDIO.audio.playChalkTap();
          renderChalkboardRoom();
        });
      });
    }

    const activeNode = schema.nodes.find((n) => n.id === state.selectedChalkNodeId) || schema.nodes[0];
    const foilSet = new Set(activeNode.foils || []);

    const svgWrap = document.getElementById("slate-svg-container");
    if (svgWrap) {
      let backgroundGeometry = "";
      const animClass = state.redrawTick > 0 ? "chalk-draw-anim" : "";

      if (schema.id === "coordinate") {
        backgroundGeometry = `
          <g filter="url(#chalk-grain)" opacity="0.82">
            <line x1="65" y1="265" x2="885" y2="265" stroke="#e8e2d2" stroke-width="1.6" class="${animClass}" />
            <line x1="475" y1="55" x2="475" y2="475" stroke="#e8e2d2" stroke-width="1.6" class="${animClass}" />
            <polygon points="888,265 876,260 876,270" fill="#e8e2d2" />
            <polygon points="62,265 74,260 74,270" fill="#e8e2d2" />
            <polygon points="475,52 470,64 480,64" fill="#e8e2d2" />
            <polygon points="475,478 470,466 480,466" fill="#e8e2d2" />
          </g>
          <text x="74" y="253" fill="#a8b2ac" font-family="monospace" font-size="10.2" letter-spacing="0.8">${escapeHtml(schema.xAxisLeft)}</text>
          <text x="875" y="253" text-anchor="end" fill="#a8b2ac" font-family="monospace" font-size="10.2" letter-spacing="0.8">${escapeHtml(schema.xAxisRight)}</text>
          <text x="488" y="68" fill="#b5d6a7" font-family="monospace" font-size="10.2" letter-spacing="0.8">${escapeHtml(schema.yAxisTop)}</text>
          <text x="488" y="472" fill="#e5958e" font-family="monospace" font-size="10.2" letter-spacing="0.8">${escapeHtml(schema.yAxisBottom)}</text>
        `;
      } else if (schema.id === "kierkegaard") {
        backgroundGeometry = schema.zones.map((z) => `
          <g>
            <ellipse cx="${z.cx}" cy="${z.cy}" rx="${z.rx}" ry="${z.ry}" fill="rgba(255,255,255,0.015)"
              stroke="${z.color}" stroke-width="1.6" stroke-dasharray="7 5" filter="url(#chalk-grain)" class="${animClass}" />
            <text x="${z.cx}" y="${z.cy - z.ry - 14}" text-anchor="middle" fill="${z.color}" font-family="monospace" font-size="11" letter-spacing="0.9" font-weight="bold">${escapeHtml(z.label)}</text>
            <text x="${z.cx}" y="${z.cy - z.ry + 2}" text-anchor="middle" fill="#b8bfb9" font-family="Georgia, serif" font-size="11" font-style="italic">${escapeHtml(z.sub)}</text>
          </g>
        `).join("") + `
          <path d="M 355 135 Q 480 95 605 135" fill="none" stroke="#d8b56c" stroke-width="1.4" stroke-dasharray="4 4" />
          <text x="480" y="106" text-anchor="middle" fill="#d8b56c" font-family="monospace" font-size="9.8" letter-spacing="0.8">LEAP OF CHOICE / REPENTANCE →</text>
        `;
      } else if (schema.id === "iconography") {
        backgroundGeometry = schema.quadrants.map((q) => `
          <g>
            <rect x="${q.x}" y="${q.y}" width="${q.w}" height="${q.h}" rx="2" fill="rgba(255,255,255,0.015)"
              stroke="${q.color}" stroke-width="1.5" filter="url(#chalk-grain)" class="${animClass}" />
            <text x="${q.x + 14}" y="${q.y + 22}" fill="${q.color}" font-family="monospace" font-size="10.5" letter-spacing="0.7" font-weight="bold">${escapeHtml(q.title)}</text>
          </g>
        `).join("");
      }

      const foilEdgesSvg = (activeNode.foils || []).map((foilId) => {
        const target = schema.nodes.find((n) => n.id === foilId);
        if (!target) return "";
        const mx = (activeNode.x + target.x) / 2;
        const my = (activeNode.y + target.y) / 2 - 24;
        return `
          <path d="M ${activeNode.x} ${activeNode.y} Q ${mx} ${my} ${target.x} ${target.y}"
            fill="none" stroke="#d8b56c" stroke-width="1.8" opacity="0.88" class="chalk-foil-edge" />
        `;
      }).join("");

      const nodesSvg = schema.nodes.map((n) => {
        const isSelected = n.id === activeNode.id;
        const isFoil = foilSet.has(n.id);
        const dim = !isSelected && !isFoil ? 0.52 : 1;
        const labelY = n.y > 425 ? n.y - 14 : n.y + 20;

        return `
          <g class="chalk-node-group" data-node-id="${n.id}" opacity="${dim}" tabindex="0" role="button" aria-label="${escapeHtml(n.label)}">
            ${isSelected ? `<circle cx="${n.x}" cy="${n.y}" r="15" fill="none" stroke="#d8b56c" stroke-width="1.6" stroke-dasharray="3 3" />` : ""}
            ${isFoil ? `<circle cx="${n.x}" cy="${n.y}" r="12" fill="none" stroke="rgba(216,181,108,0.5)" stroke-width="1.2" />` : ""}
            <circle class="node-dot" cx="${n.x}" cy="${n.y}" r="${isSelected ? 8.5 : 6.8}" fill="${n.color}" stroke="#101714" stroke-width="1.8" />
            <text x="${n.x}" y="${labelY}" text-anchor="middle" fill="${isSelected ? "#ffffff" : "#e8e2d2"}"
              font-family="Georgia, serif" font-size="${isSelected ? "12.5" : "11.4"}" font-weight="${isSelected ? "bold" : "normal"}"
              style="paint-order:stroke;stroke:#121a17;stroke-width:3.5px;stroke-linejoin:round;">
              ${escapeHtml(n.label)}
            </text>
          </g>
        `;
      }).join("");

      svgWrap.innerHTML = `
        <svg class="slate-svg" viewBox="0 0 940 505" role="img" aria-label="${escapeHtml(schema.boardTitle)}">
          <defs>
            <filter id="chalk-grain" x="-5%" y="-5%" width="110%" height="110%">
              <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="2" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.6" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
          <text x="24" y="28" fill="#d8b56c" font-family="monospace" font-size="11.5" letter-spacing="0.6">${escapeHtml(schema.boardTitle)}</text>
          <text x="916" y="28" text-anchor="end" fill="#8f9c95" font-family="monospace" font-size="9.8" letter-spacing="0.6">SELECT LOCUS TO ILLUMINATE FOILS</text>
          ${backgroundGeometry}
          ${foilEdgesSvg}
          ${nodesSvg}
        </svg>
      `;

      svgWrap.querySelectorAll(".chalk-node-group").forEach((g) => {
        const activate = () => {
          const id = g.dataset.nodeId;
          state.selectedChalkNodeId = id;
          state.redrawTick = 0;
          addUnique(state.ledger.chalkNodesVisited, id);
          STUDIO.audio.playChalkTap();
          renderChalkboardRoom();
        };
        g.addEventListener("click", activate);
        g.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            activate();
          }
        });
      });
    }

    const trayEl = document.getElementById("chalktray-card");
    if (trayEl) {
      const foilBtns = (activeNode.foils || []).map((fid) => {
        const target = schema.nodes.find((n) => n.id === fid);
        if (!target) return "";
        return `<button type="button" class="btn-chalk-foil" data-foil-jump="${target.id}">↔ ${escapeHtml(target.label)}</button>`;
      }).join("");

      trayEl.innerHTML = `
        <div class="eyebrow">${escapeHtml(activeNode.category)}</div>
        <h3>${escapeHtml(activeNode.label)}</h3>
        <div class="chalk-source-ref">${escapeHtml(activeNode.work)}</div>
        <p class="chalk-gloss-block">${escapeHtml(activeNode.gloss)}</p>

        <div class="eyebrow" style="margin-bottom:0.2rem;">Dialectical Foils</div>
        <div class="foil-chip-row">${foilBtns}</div>

        <div class="chalk-schema-note">
          ${escapeHtml(schema.subtitle)}
        </div>
      `;

      trayEl.querySelectorAll("[data-foil-jump]").forEach((btn) => {
        btn.addEventListener("click", () => {
          state.selectedChalkNodeId = btn.dataset.foilJump;
          state.redrawTick = 0;
          addUnique(state.ledger.chalkNodesVisited, state.selectedChalkNodeId);
          STUDIO.audio.playChalkTap();
          renderChalkboardRoom();
        });
      });
    }
  }

  // =========================================================================
  // ROOM III: TWO-COLUMN BROADSHEET GALLEY PROOF (COUNTERFEIT CRITIC)
  // =========================================================================

  function renderCounterfeitRoom() {
    const cases = STUDIO.COUNTERFEIT_CASES;
    const currentCase = cases.find((c) => c.caseNumber === state.activeCaseNumber) || cases[0];
    const savedResult = state.ledger.counterfeitResults[currentCase.caseNumber] || null;

    const scoreEl = document.getElementById("counterfeit-score-readout");
    if (scoreEl) {
      const tried = Object.keys(state.ledger.counterfeitResults).length;
      const wins = Object.values(state.ledger.counterfeitResults).filter((r) => r.won).length;
      scoreEl.innerHTML = `COUNTERFEITS EXPOSED: <strong>${pad2(wins)} / 10</strong> · FOLIOS ADJUDICATED: ${pad2(tried)} / 10`;
    }

    // 10-Folio Selector Strip
    const stripEl = document.getElementById("case-strip");
    if (stripEl) {
      stripEl.innerHTML = cases.map((c) => {
        const res = state.ledger.counterfeitResults[c.caseNumber];
        const statusCls = res ? (res.won ? "is-win" : "is-miss") : "";
        const glyph = res ? (res.won ? "✓" : "×") : "—";
        const cleanLabel = c.shortTitle.replace(/^[IVX]+\.\s*/, "");
        return `
          <button type="button" class="case-index-cell ${c.caseNumber === currentCase.caseNumber ? "is-active" : ""} ${statusCls}" data-case="${c.caseNumber}">
            <span class="case-cell-top">
              <span>${ROMAN_NUMERALS[c.caseNumber]}</span>
              <span class="case-status-glyph">${glyph}</span>
            </span>
            <span class="case-cell-name">${escapeHtml(cleanLabel)}</span>
          </button>
        `;
      }).join("");

      stripEl.querySelectorAll(".case-index-cell").forEach((btn) => {
        btn.addEventListener("click", () => {
          state.activeCaseNumber = Number(btn.dataset.case);
          STUDIO.audio.playPaperTurn();
          renderCounterfeitRoom();
        });
      });
    }

    // Primary Specimen Epigraph
    const specEl = document.getElementById("specimen-box");
    if (specEl) {
      specEl.innerHTML = `
        <div class="specimen-citation-rail">
          <div class="eyebrow">${escapeHtml(currentCase.seminarWeek)}</div>
          <h3>${escapeHtml(currentCase.title)}</h3>
          <div class="specimen-work-line">${escapeHtml(currentCase.workCitation)}</div>
        </div>
        <div class="specimen-passage-col">
          <blockquote>${escapeHtml(currentCase.specimenQuote)}</blockquote>
          <div class="specimen-directive">§ ${escapeHtml(currentCase.cruxQuestion)}</div>
        </div>
      `;
    }

    // Unified Two-Column Broadsheet Galley Proof
    const duelEl = document.getElementById("duel-grid");
    if (duelEl) {
      duelEl.innerHTML = currentCase.critiques.map((crit) => {
        const isRevealed = Boolean(savedResult);
        const userStruckThis = savedResult && savedResult.struckSlot === crit.slot;
        const subtitleClean = crit.heading.replace(/^Margin Note [AB]\s*—\s*/, "");

        let colClass = "galley-column";
        if (!isRevealed) {
          colClass += " is-interactive";
        } else {
          colClass += crit.isCounterfeit ? " is-revealed-counterfeit" : " is-revealed-authentic";
        }

        const attributionHtml = isRevealed
          ? (crit.isCounterfeit
              ? `<span class="folio-attribution-tag counterfeit">Counterfeit Attribution</span>`
              : `<span class="folio-attribution-tag authentic">Authentic W.H. Auden</span>`)
          : `<span class="folio-attribution-tag" style="color:var(--ink-muted);">Unmarked Galley</span>`;

        const showGreaseSlash = isRevealed && crit.isCounterfeit;
        const greaseOverlayHtml = showGreaseSlash
          ? `
            <div class="grease-overlay" aria-hidden="true">
              <svg class="grease-svg" viewBox="0 0 400 260" preserveAspectRatio="none">
                <path class="grease-stroke" d="M 26 22 Q 204 128 374 238" />
                <path class="grease-stroke second" d="M 370 26 Q 196 132 30 234" />
              </svg>
            </div>
          `
          : "";

        const actionAreaHtml = !isRevealed
          ? `
            <button type="button" class="btn-grease-strike" data-strike-slot="${crit.slot}">
              Strike Folio ${crit.slot} with Red Grease-Pencil
            </button>
          `
          : (crit.isCounterfeit
              ? `<div class="marginalia-slash-note"><strong>w.h.a. margin strike:</strong> “${escapeHtml(currentCase.greasePencilQuip)}”</div>`
              : `<div class="authentic-foot-note">
                  Verified in Auden’s Critical Prose${userStruckThis ? " · (Struck in error)" : ""}
                 </div>`);

        return `
          <article class="${colClass}" data-card-slot="${crit.slot}">
            ${greaseOverlayHtml}
            <div>
              <div class="galley-folio-head">
                <span class="folio-id-mark">FOLIO ${crit.slot} · SEMINAR GALLEY</span>
                ${attributionHtml}
              </div>
              <h4 class="galley-subtitle">${escapeHtml(subtitleClean)}</h4>
              <p class="galley-prose">${escapeHtml(crit.text)}</p>
            </div>
            ${actionAreaHtml}
          </article>
        `;
      }).join("");

      if (!savedResult) {
        const handleStrike = (slot) => {
          const chosen = currentCase.critiques.find((c) => c.slot === slot);
          if (!chosen) return;
          const won = Boolean(chosen.isCounterfeit);
          state.ledger.counterfeitResults[currentCase.caseNumber] = {
            struckSlot: slot,
            won
          };
          saveLedger();
          STUDIO.audio.playGreasePencilStrike(won);
          renderCounterfeitRoom();
        };

        duelEl.querySelectorAll(".galley-column.is-interactive").forEach((col) => {
          col.addEventListener("click", (ev) => {
            if (ev.target.closest("button")) return;
            handleStrike(col.dataset.cardSlot);
          });
        });

        duelEl.querySelectorAll("[data-strike-slot]").forEach((btn) => {
          btn.addEventListener("click", (ev) => {
            ev.stopPropagation();
            handleStrike(btn.dataset.strikeSlot);
          });
        });
      }
    }

    // Critical Apparatus
    const dossierEl = document.getElementById("dossier-container");
    if (dossierEl) {
      if (!savedResult) {
        dossierEl.innerHTML = "";
      } else {
        const proof = currentCase.archivalProof;
        const nextCaseNum = (currentCase.caseNumber % cases.length) + 1;

        dossierEl.innerHTML = `
          <section class="apparatus-wrap" aria-live="polite">
            <div class="apparatus-verdict-bar ${savedResult.won ? "is-win" : "is-miss"}">
              <div class="verdict-headline">
                ${savedResult.won
                  ? `Counterfeit Identified — Folio ${savedResult.struckSlot} struck; Auden’s primary thesis preserved.`
                  : `Attribution Inverted — Folio ${savedResult.struckSlot} voiced W.H. Auden’s genuine position.`}
              </div>
              <div style="display:flex;gap:0.5rem;">
                <button type="button" class="btn-quiet" id="btn-retry-case">Clear Folio Marks</button>
                <button type="button" class="btn-editorial-primary vermilion" id="btn-next-case">Proceed to Proof ${ROMAN_NUMERALS[nextCaseNum]} →</button>
              </div>
            </div>

            <div class="apparatus-columns">
              <div class="apparatus-cell">
                <div class="eyebrow">§ I · Primary Source Citation</div>
                <strong style="font-family:var(--font-display);font-size:0.98rem;">${escapeHtml(proof.primarySource)}</strong>
                <blockquote class="apparatus-quote">${escapeHtml(proof.verbatimAnchor)}</blockquote>
              </div>

              <div class="apparatus-cell">
                <div class="eyebrow">§ II · Auden’s Critical Position</div>
                <p style="font-size:0.9rem;line-height:1.62;">${escapeHtml(proof.audenArgument)}</p>
              </div>

              <div class="apparatus-cell">
                <div class="eyebrow">§ III · Counterfeit Diagnosis &amp; Signals</div>
                <p style="font-size:0.89rem;line-height:1.6;">${escapeHtml(proof.jaggedAgiBlindSpot)}</p>
                <ul class="signal-list">
                  ${proof.diagnosticClues.map((c) => `<li>${escapeHtml(c)}</li>`).join("")}
                </ul>
              </div>
            </div>
          </section>
        `;

        const retryBtn = document.getElementById("btn-retry-case");
        if (retryBtn) {
          retryBtn.addEventListener("click", () => {
            delete state.ledger.counterfeitResults[currentCase.caseNumber];
            saveLedger();
            renderCounterfeitRoom();
          });
        }

        const nextBtn = document.getElementById("btn-next-case");
        if (nextBtn) {
          nextBtn.addEventListener("click", () => {
            state.activeCaseNumber = nextCaseNum;
            STUDIO.audio.playPaperTurn();
            renderCounterfeitRoom();
          });
        }
      }
    }
  }

  // =========================================================================
  // ROOM IV: ACOUSTIC TURNTABLE BAY & PROSODIC SCANSION STAVES
  // =========================================================================

  function stopBoothPlayback() {
    STUDIO.audio.stopAll();
    prosodyTimers.forEach((id) => clearTimeout(id));
    prosodyTimers = [];
    state.pulsingTokenKey = null;
    updateTurntableVisuals(false);
  }

  function updateTurntableVisuals(playing) {
    const disc = document.getElementById("svg-record-disc");
    const arm = document.getElementById("svg-tonearm");
    const playBtn = document.getElementById("btn-victrola-play");
    if (disc) disc.classList.toggle("spinning", playing);
    if (arm) arm.classList.toggle("engaged", playing);
    if (playBtn) {
      playBtn.textContent = playing ? "Lift Stylus · Halt Platter" : "Engage Stylus · Play 78-RPM Plate";
    }
  }

  function startOscilloscopeLoop() {
    if (scopeAnimId) cancelAnimationFrame(scopeAnimId);
    const canvas = document.getElementById("oscilloscope-canvas");
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");

    function draw() {
      if (state.activeRoom !== "booth") return;
      const w = canvas.width;
      const h = canvas.height;
      ctx2d.fillStyle = "#0b0f0e";
      ctx2d.fillRect(0, 0, w, h);

      // Calibrated instrument graticule rules
      ctx2d.strokeStyle = "rgba(255, 255, 255, 0.07)";
      ctx2d.lineWidth = 1;
      ctx2d.beginPath();
      ctx2d.moveTo(0, h / 2);
      ctx2d.lineTo(w, h / 2);
      for (let gx = w / 4; gx < w; gx += w / 4) {
        ctx2d.moveTo(gx, 0);
        ctx2d.lineTo(gx, h);
      }
      ctx2d.stroke();

      const analyser = STUDIO.audio.analyser;
      if (analyser && (STUDIO.audio.isPlayingVictrola || STUDIO.audio.isPlayingProsody)) {
        const bufLen = analyser.frequencyBinCount;
        const data = new Uint8Array(bufLen);
        analyser.getByteTimeDomainData(data);

        ctx2d.strokeStyle = "#d8b56c";
        ctx2d.lineWidth = 1.8;
        ctx2d.beginPath();
        const slice = w / bufLen;
        let x = 0;
        for (let i = 0; i < bufLen; i++) {
          const v = data[i] / 128.0;
          const y = (v * h) / 2;
          if (i === 0) ctx2d.moveTo(x, y);
          else ctx2d.lineTo(x, y);
          x += slice;
        }
        ctx2d.stroke();
      }
      scopeAnimId = requestAnimationFrame(draw);
    }
    scopeAnimId = requestAnimationFrame(draw);
  }

  function renderBoothRoom() {
    renderVictrolaStation();
    renderProsodyStation();
  }

  function renderVictrolaStation() {
    const plates = STUDIO.VICTROLA_PLATES;
    const activePlate = plates.find((p) => p.id === state.activePlateId) || plates[0];

    const headerEl = document.getElementById("victrola-plate-info");
    if (headerEl) {
      headerEl.innerHTML = `
        <div class="bay-label" style="color:var(--inst-ochre);">${escapeHtml(activePlate.catalogNo)}</div>
        <h3>${escapeHtml(activePlate.composer)} — ${escapeHtml(activePlate.work)}</h3>
        <div class="plate-submeta">${escapeHtml(activePlate.keySignature)} · ${escapeHtml(activePlate.syllabusRef)}</div>
      `;
    }

    const selectorEl = document.getElementById("plate-selector");
    if (selectorEl) {
      selectorEl.innerHTML = plates.map((p) => `
        <button type="button" class="plate-cell ${p.id === activePlate.id ? "is-active" : ""}" data-plate-id="${p.id}">
          <span class="plate-cell-composer">${escapeHtml(p.composer)}</span>
          <span class="plate-cell-work">${escapeHtml(p.work.split(",")[0])}</span>
        </button>
      `).join("");

      selectorEl.querySelectorAll(".plate-cell").forEach((btn) => {
        btn.addEventListener("click", () => {
          stopBoothPlayback();
          state.activePlateId = btn.dataset.plateId;
          state.currentChordStepText = "Plate mounted · Engage stylus to audition.";
          renderVictrolaStation();
        });
      });
    }

    const stepEl = document.getElementById("victrola-step-tracker");
    if (stepEl) {
      stepEl.textContent = state.currentChordStepText;
    }

    const thesisEl = document.getElementById("victrola-musical-thesis");
    if (thesisEl) {
      thesisEl.textContent = activePlate.musicalThesis;
    }

    updateTurntableVisuals(STUDIO.audio.isPlayingVictrola);
  }

  function renderProsodyStation() {
    const specimens = STUDIO.PROSODY_SPECIMENS;
    const spec = specimens.find((s) => s.id === state.activeProsodyId) || specimens[0];

    const tabsEl = document.getElementById("meter-tabs");
    if (tabsEl) {
      tabsEl.innerHTML = specimens.map((s) => {
        const shortName = s.name.replace(/^[IVX]+\.\s*/, "");
        return `
          <button type="button" class="seg-btn ${s.id === spec.id ? "is-active" : ""}" data-meter-id="${s.id}">
            ${escapeHtml(shortName)}
          </button>
        `;
      }).join("");

      tabsEl.querySelectorAll(".seg-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          stopBoothPlayback();
          state.activeProsodyId = btn.dataset.meterId;
          STUDIO.audio.playPaperTurn();
          renderProsodyStation();
        });
      });
    }

    const metaEl = document.getElementById("prosody-meta");
    if (metaEl) {
      metaEl.innerHTML = `
        <div class="eyebrow">${escapeHtml(spec.originWork)}</div>
        <h3>${escapeHtml(spec.name)}</h3>
        <div class="prosody-formula">${escapeHtml(spec.patternFormula)}</div>
        <p style="font-size:0.89rem;color:var(--ink-secondary);">${escapeHtml(spec.audenNote)}</p>
      `;
    }

    let totalSyllables = 0;
    let matchingSyllables = 0;

    const sheetEl = document.getElementById("scansion-sheet");
    if (sheetEl) {
      sheetEl.innerHTML = spec.lines.map((line, lIdx) => {
        const tokensHtml = line.syllables.map((s, sIdx) => {
          totalSyllables++;
          const tokenKey = `${spec.id}-${lIdx}-${sIdx}`;
          const shownStress = state.prosodyPracticeMode
            ? (state.userScansionMarks[tokenKey] ?? 0)
            : s.stress;

          if (shownStress === s.stress) matchingSyllables++;

          const markChar = shownStress === 1 ? "—" : "∪";
          const isPulsing = state.pulsingTokenKey === tokenKey;

          return `
            <span class="syl-unit ${shownStress === 1 ? "is-stressed" : ""} ${state.prosodyPracticeMode ? "is-practice" : ""} ${isPulsing ? "is-pulsing" : ""}"
              data-token-key="${tokenKey}" role="${state.prosodyPracticeMode ? "button" : "presentation"}" tabindex="${state.prosodyPracticeMode ? "0" : "-1"}">
              <span class="syl-glyph">${markChar}</span>
              <span class="syl-text">${escapeHtml(s.syl)}</span>
            </span>
            ${s.caesuraAfter ? `<span class="caesura-mark" title="Medial Alliterative Caesura">||</span>` : ""}
          `;
        }).join("");

        return `
          <div class="stave-row">
            <div class="stave-label">${escapeHtml(line.lineLabel)}</div>
            <div class="stave-tokens">${tokensHtml}</div>
          </div>
        `;
      }).join("");

      if (state.prosodyPracticeMode) {
        sheetEl.querySelectorAll(".syl-unit.is-practice").forEach((tok) => {
          const toggleMark = () => {
            const k = tok.dataset.tokenKey;
            const nextVal = (state.userScansionMarks[k] ?? 0) === 1 ? 0 : 1;
            state.userScansionMarks[k] = nextVal;
            STUDIO.audio.playSyllablePulse(nextVal === 1, false);
            renderProsodyStation();
          };
          tok.addEventListener("click", toggleMark);
          tok.addEventListener("keydown", (ev) => {
            if (ev.key === "Enter" || ev.key === " ") {
              ev.preventDefault();
              toggleMark();
            }
          });
        });
      }
    }

    const practiceBtn = document.getElementById("btn-prosody-practice");
    const practiceStatus = document.getElementById("prosody-practice-status");
    if (practiceBtn) {
      practiceBtn.textContent = state.prosodyPracticeMode
        ? "Reveal Canonical Scansion"
        : "Practice Mode: Mark Stresses";
      practiceBtn.classList.toggle("is-active", state.prosodyPracticeMode);
    }
    if (practiceStatus) {
      practiceStatus.textContent = state.prosodyPracticeMode
        ? `Click any syllable to toggle lift (—) vs. dip (∪) · Concordance: ${pad2(matchingSyllables)}/${pad2(totalSyllables)} syllables`
        : "Canonical prosodic notation displayed · Engage WebAudio pulse to hear stressed lifts.";
    }
  }

  function pulseActiveProsodyStanza() {
    stopBoothPlayback();
    const spec = STUDIO.PROSODY_SPECIMENS.find((s) => s.id === state.activeProsodyId) || STUDIO.PROSODY_SPECIMENS[0];
    STUDIO.audio.ensureContext();
    STUDIO.audio.isPlayingProsody = true;
    addUnique(state.ledger.boothAuditioned, `meter-${spec.id}`);

    let delayMs = 40;
    spec.lines.forEach((line, lIdx) => {
      line.syllables.forEach((s, sIdx) => {
        const tokenKey = `${spec.id}-${lIdx}-${sIdx}`;
        const stressVal = state.prosodyPracticeMode
          ? (state.userScansionMarks[tokenKey] ?? 0)
          : s.stress;

        const t = setTimeout(() => {
          state.pulsingTokenKey = tokenKey;
          STUDIO.audio.playSyllablePulse(stressVal === 1, Boolean(s.caesuraAfter));
          renderProsodyStation();
        }, delayMs);
        prosodyTimers.push(t);

        delayMs += spec.tempoMs + (stressVal === 1 ? 45 : 0) + (s.caesuraAfter ? 180 : 0);
      });
      delayMs += 240;
    });

    const endT = setTimeout(() => {
      state.pulsingTokenKey = null;
      STUDIO.audio.isPlayingProsody = false;
      renderProsodyStation();
    }, delayMs + 80);
    prosodyTimers.push(endT);
  }

  // =========================================================================
  // ROOM V: 1941 SOCRATIC COLLOQUIUM & DANTEAN CARTOGRAPHY
  // =========================================================================

  function buildLibrettoCritique(cId, rId, mId) {
    const casts = STUDIO.FINAL_EXAM_DATA.librettoCasts;
    const c = casts.classical.find((x) => x.id === cId) || casts.classical[0];
    const r = casts.comicReligious.find((x) => x.id === rId) || casts.comicReligious[0];
    const m = casts.modernDaemon.find((x) => x.id === mId) || casts.modernDaemon[0];

    const sceneOpenings = {
      "antigone": "Act I opens before a besieged city gate where Antigone chants in stark Doric intervals, insisting unburied blood-duty overrides every modern excuse.",
      "horace": "Act I opens on a terraced Sabine hillside where Horace sings measured Sapphic strophes, urging stoic poise while distant 1941 artillery rumbles.",
      "prospero": "Act I opens on a bare wooden stage strewn with broken wands as Prospero confesses in austere bass-baritone arioso that island enchantment never converted a single villain."
    };

    const daemonCollisions = {
      "iago": "Into this order steps Honest Iago—refusing to sing a single melodic phrase. Speaking in dry clinical parlando prose, he proposes a laboratory stress-test to prove the others love only their own pride.",
      "ahab": "Suddenly chromatic brass shatters the key signature as Captain Ahab storms aboard in defiant Heldentenor, demanding the ensemble join his metaphysical strike against creaturely finitude.",
      "kafka": "At the side door appears Land-Surveyor K. clutching contradictory carbon-paper forms, interrupting the aria in anxious syncopated fugato to demand an official written permit for grace."
    };

    const charityResolutions = {
      "falstaff": "The climax turns comic-parabolic when Sir John Falstaff enters in warm Basso Buffo polyphony: immune to Iago's sneers, Ahab's heroics, and K.'s lawsuits alike, plump Jack invites enemy and failure to supper without merit—exposing egoism through festive Charity.",
      "quixote": "Don Quixote answers in luminous high-tenor recitative: mistaking the crisis with literal chivalric simplicity yet exhibiting such complete self-forgetfulness after defeat that pride collapses into humble laughter.",
      "alyosha": "Alyosha Karamazov answers neither with syllogisms nor magic, singing an unadorned Russian chorale line of active neighbor-love that disarms defiance and recalls the trio to historical responsibility."
    };

    return {
      title: `${c.name.split(" (")[0]} × ${r.name.split(" (")[0]} × ${m.name.split(" (")[0]}`,
      vocalScoring: `${c.voice} · ${r.voice} · ${m.voice}`,
      dramaturgy: `${sceneOpenings[c.id]} ${daemonCollisions[m.id]} ${charityResolutions[r.id]}`,
      audenGradeNote: `“First-rate structural casting. Notice why opera handles this trio better than a realist novel: in an ensemble quartet, ${c.name.split(" ")[0]}’s tragic law, ${m.name.split(" ")[0]}’s modern anxiety or defiance, and ${r.name.split(" ")[0]}’s comic grace can sing simultaneously without erasing their existential contradiction.” — w.h.a.`
    };
  }

  function renderColloquiumRoom() {
    const casts = STUDIO.FINAL_EXAM_DATA.librettoCasts;
    const colsEl = document.getElementById("colloquium-columns");

    if (colsEl) {
      const renderRail = (key, heading, list) => `
        <div class="cast-rail">
          <div class="cast-rail-head">${escapeHtml(heading)}</div>
          ${list.map((item) => `
            <button type="button" class="cast-row ${state.selectedCast[key] === item.id ? "is-selected" : ""}"
              data-cast-group="${key}" data-cast-id="${item.id}">
              <span class="cast-name">${escapeHtml(item.name)}</span>
              <span class="cast-voice">${escapeHtml(item.voice)}</span>
              <span class="cast-stance">${escapeHtml(item.stance)}</span>
            </button>
          `).join("")}
        </div>
      `;

      colsEl.innerHTML =
        renderRail("classical", "I · Classical / Renaissance Order", casts.classical) +
        renderRail("comicReligious", "II · Comic-Religious Charity", casts.comicReligious) +
        renderRail("modernDaemon", "III · Modern Anxiety or Defiance", casts.modernDaemon);

      colsEl.querySelectorAll(".cast-row").forEach((btn) => {
        btn.addEventListener("click", () => {
          const grp = btn.dataset.castGroup;
          const id = btn.dataset.castId;
          state.selectedCast[grp] = id;
          const comboKey = `${state.selectedCast.classical}-${state.selectedCast.comicReligious}-${state.selectedCast.modernDaemon}`;
          addUnique(state.ledger.librettosStaged, comboKey);
          STUDIO.audio.playPaperTurn();
          renderColloquiumRoom();
        });
      });
    }

    const critique = buildLibrettoCritique(
      state.selectedCast.classical,
      state.selectedCast.comicReligious,
      state.selectedCast.modernDaemon
    );

    const bluebookEl = document.getElementById("bluebook-output");
    if (bluebookEl) {
      bluebookEl.innerHTML = `
        <div class="eyebrow">ANGELL HALL EXAMINATION FOLIO · ENSEMBLE EVALUATION</div>
        <h4>${escapeHtml(critique.title)}</h4>
        <div class="prosody-formula" style="margin-bottom:0.75rem;">${escapeHtml(critique.vocalScoring)}</div>
        <p style="font-size:0.95rem;line-height:1.66;margin-bottom:0.95rem;">${escapeHtml(critique.dramaturgy)}</p>
        <div class="marginalia-slash-note">
          ${escapeHtml(critique.audenGradeNote)}
        </div>
      `;
    }

    // Exercise II: Dante's Moral Cartography
    const cartEl = document.getElementById("cartography-grid");
    if (cartEl) {
      cartEl.innerHTML = STUDIO.FINAL_EXAM_DATA.danteCartographyItems.map((item) => {
        const chosen = state.ledger.danteChoices[item.id] || null;
        const infCls = chosen === "inferno"
          ? (item.correctRealm === "inferno" ? "is-correct" : "is-wrong")
          : "";
        const purgCls = chosen === "purgatorio"
          ? (item.correctRealm === "purgatorio" ? "is-correct" : "is-wrong")
          : "";

        return `
          <div class="cartography-cell">
            <div class="cartography-row-top">
              <span class="cartography-char">${escapeHtml(item.character)}</span>
              <div class="realm-seg" role="group" aria-label="Assign moral realm for ${escapeHtml(item.character)}">
                <button type="button" class="btn-realm ${infCls}" data-dc-id="${item.id}" data-realm="inferno">
                  Inferno
                </button>
                <button type="button" class="btn-realm ${purgCls}" data-dc-id="${item.id}" data-realm="purgatorio">
                  Purgatorio
                </button>
              </div>
            </div>
            ${chosen ? `<p class="cartography-gloss"><strong>${chosen === item.correctRealm ? "Concurrence:" : "Correction:"}</strong> ${escapeHtml(item.audenRuling)}</p>` : ""}
          </div>
        `;
      }).join("");

      cartEl.querySelectorAll(".btn-realm").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.dataset.dcId;
          const realm = btn.dataset.realm;
          const item = STUDIO.FINAL_EXAM_DATA.danteCartographyItems.find((x) => x.id === id);
          state.ledger.danteChoices[id] = realm;
          saveLedger();
          STUDIO.audio.playGreasePencilStrike(item && item.correctRealm === realm);
          renderColloquiumRoom();
        });
      });
    }
  }

  // =========================================================================
  // GLOBAL EVENT BINDINGS
  // =========================================================================

  function bindStaticControls() {
    document.querySelectorAll(".studio-tab").forEach((tab) => {
      tab.addEventListener("click", () => switchRoom(tab.dataset.room));
    });

    window.addEventListener("keydown", (ev) => {
      const tag = (ev.target && ev.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const map = {
        "1": "syllabus",
        "2": "chalkboard",
        "3": "counterfeit",
        "4": "booth",
        "5": "colloquium"
      };
      if (map[ev.key]) {
        switchRoom(map[ev.key]);
      }
    });

    const provBtn = document.getElementById("btn-toggle-provenance");
    const provDrawer = document.getElementById("provenance-drawer");
    if (provBtn && provDrawer) {
      provBtn.addEventListener("click", () => {
        state.provenanceOpen = !state.provenanceOpen;
        provDrawer.hidden = !state.provenanceOpen;
        provBtn.classList.toggle("is-active", state.provenanceOpen);
        provBtn.setAttribute("aria-expanded", state.provenanceOpen ? "true" : "false");
        STUDIO.audio.playPaperTurn();
      });
    }

    const muteBtn = document.getElementById("btn-audio-mute");
    if (muteBtn) {
      muteBtn.addEventListener("click", () => {
        const nextMuted = !STUDIO.audio.muted;
        STUDIO.audio.setMuted(nextMuted);
        muteBtn.textContent = nextMuted ? "Audio: Muted" : "Audio: On";
        muteBtn.classList.toggle("is-active", nextMuted);
      });
    }

    const resetLedgerBtn = document.getElementById("btn-reset-ledger");
    if (resetLedgerBtn) {
      resetLedgerBtn.addEventListener("click", () => {
        state.ledger = {
          worksInspected: [8],
          chalkNodesVisited: ["falstaff"],
          counterfeitResults: {},
          boothAuditioned: [],
          danteChoices: {},
          librettosStaged: []
        };
        saveLedger();
        switchRoom(state.activeRoom, true);
      });
    }

    const searchInput = document.getElementById("syllabus-search");
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        state.searchQuery = searchInput.value;
        renderSyllabusRoom();
      });
    }
    const genreSelect = document.getElementById("genre-filter");
    if (genreSelect) {
      genreSelect.addEventListener("change", () => {
        state.genreFilter = genreSelect.value;
        renderSyllabusRoom();
      });
    }
    const poleSelect = document.getElementById("pole-filter");
    if (poleSelect) {
      poleSelect.addEventListener("change", () => {
        state.poleFilter = poleSelect.value;
        renderSyllabusRoom();
      });
    }

    const redrawBtn = document.getElementById("btn-chalk-redraw");
    if (redrawBtn) {
      redrawBtn.addEventListener("click", () => {
        state.redrawTick++;
        STUDIO.audio.playChalkTap();
        renderChalkboardRoom();
      });
    }

    const playVictrolaBtn = document.getElementById("btn-victrola-play");
    if (playVictrolaBtn) {
      playVictrolaBtn.addEventListener("click", () => {
        if (STUDIO.audio.isPlayingVictrola) {
          stopBoothPlayback();
          state.currentChordStepText = "Stylus lifted · 78-RPM platter halted.";
          renderVictrolaStation();
          return;
        }
        const plate = STUDIO.VICTROLA_PLATES.find((p) => p.id === state.activePlateId) || STUDIO.VICTROLA_PLATES[0];
        addUnique(state.ledger.boothAuditioned, plate.id);
        updateTurntableVisuals(true);
        STUDIO.audio.playVictrolaPlate(
          plate,
          (stepIdx, stepObj) => {
            state.currentChordStepText = `STEP ${pad2(stepIdx + 1)}/${pad2(plate.scoreSteps.length)} · ${stepObj.label}`;
            const tracker = document.getElementById("victrola-step-tracker");
            if (tracker) tracker.textContent = state.currentChordStepText;
          },
          () => {
            state.currentChordStepText = `Completed · ${plate.composer} (${plate.work.split(",")[0]}).`;
            updateTurntableVisuals(false);
            const tracker = document.getElementById("victrola-step-tracker");
            if (tracker) tracker.textContent = state.currentChordStepText;
          }
        );
      });
    }

    const crackleToggle = document.getElementById("chk-shellac-crackle");
    if (crackleToggle) {
      crackleToggle.addEventListener("change", () => {
        STUDIO.audio.setShellacCrackle(crackleToggle.checked);
      });
    }

    const pulseBtn = document.getElementById("btn-prosody-pulse");
    if (pulseBtn) {
      pulseBtn.addEventListener("click", pulseActiveProsodyStanza);
    }

    const practiceBtn = document.getElementById("btn-prosody-practice");
    if (practiceBtn) {
      practiceBtn.addEventListener("click", () => {
        stopBoothPlayback();
        state.prosodyPracticeMode = !state.prosodyPracticeMode;
        STUDIO.audio.playPaperTurn();
        renderProsodyStation();
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    loadLedger();
    renderLedgerPills();
    bindStaticControls();
    renderSyllabusRoom();
  });
})();
