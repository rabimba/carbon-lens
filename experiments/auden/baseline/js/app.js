/* ==========================================================================
   ENGLISH 135: MAIN INTERACTIVE SEMINAR APPLICATION
   Angell Hall & 1227 Pontiac Street • University of Michigan, Fall 1941
   ========================================================================== */

(function () {
  const STORAGE_KEY = "auden_eng135_1941_v1";

  const OPERA_RECORD_TO_SYLLABUS_ID = {
    "rec-dongiovanni": "opera-dongiovanni",
    "rec-magicflute": "opera-magicflute",
    "rec-fidelio": "opera-fidelio",
    "rec-tristan": "opera-tristan",
    "rec-orpheus": "opera-orpheus",
    "rec-carmen": "opera-carmen",
    "rec-dutchman": "opera-dutchman",
    "rec-gotterdammerung": "opera-gotterdammerung",
    "rec-traviata": "opera-traviata"
  };

  function defaultState() {
    return {
      activeRoom: "welcome",
      aphorismIdx: 0,
      stampedWorks: [],
      sparkAnswered: {},
      activeBoardId: "necessity-possibility",
      selectedBoardRow: 0,
      selectedSpatialIdx: 0,
      selectedChalkCharId: "sort-antigone",
      chalkSorted: {},
      smuggledOpen: false,
      activeRecordId: "rec-dongiovanni",
      recordsSpun: [],
      directorSolved: {},
      activeWorkshop: "dante",
      danteSolved: {},
      horaceChoices: {},
      alibiSolved: {},
      humaneMode: true,
      examAnswers: {},
      studentName: "",
      synClassical: "syn-aeschylus",
      synPivot: "syn-augustine",
      synOpera: "syn-fidelio",
      synModern: "syn-eliot",
      synNote: "",
      diplomaGenerated: false,
      muted: false,
      crackle: true
    };
  }

  let state = loadState();
  let syllabusFilterSec = "all";
  let syllabusFilterSphere = "all";
  let syllabusUnreadOnly = false;
  let syllabusSearch = "";
  let currentModalWorkId = null;
  let scopeAnimId = null;

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return Object.assign(defaultState(), parsed);
    } catch (_) {
      return defaultState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // =========================================================================
  // PROGRESS METERS & TOP MASTHEAD
  // =========================================================================
  function getPagesConquered() {
    const stampedSet = new Set(state.stampedWorks);
    return window.AUDEN_SYLLABUS.reduce((sum, w) => (stampedSet.has(w.id) ? sum + w.pages : sum), 0);
  }

  function getCompletedWorkshopsCount() {
    let count = 0;
    if (Object.keys(state.danteSolved).length >= window.AUDEN_ASSIGNMENTS.danteCantos.length) count++;
    if (Object.keys(state.horaceChoices).length >= window.AUDEN_ASSIGNMENTS.horaceLines.length) count++;
    if (Object.keys(state.alibiSolved).length >= window.AUDEN_ASSIGNMENTS.alibiCases.length) count++;
    return count;
  }

  function getExamCorrectCount() {
    let correct = 0;
    window.AUDEN_FINAL_EXAM.questions.forEach((q) => {
      if (state.examAnswers[q.id] === q.answer) correct++;
    });
    return correct;
  }

  function getVictrolaCompletedCount() {
    const set = new Set([...state.recordsSpun, ...Object.keys(state.directorSolved)]);
    return set.size;
  }

  function updateMastheadProgress() {
    const pages = getPagesConquered();
    const totalPages = window.AUDEN_SEMINAR_LORE.totalPages;
    const pct = Math.min(100, (pages / totalPages) * 100);

    const sortedCount = Object.keys(state.chalkSorted).length;
    const victrolaCount = getVictrolaCompletedCount();
    const workshopsCount = getCompletedWorkshopsCount();
    const examScore = getExamCorrectCount();

    const totalStamps =
      state.stampedWorks.length +
      sortedCount +
      victrolaCount +
      workshopsCount +
      examScore +
      (state.diplomaGenerated ? 1 : 0);

    const pagesText = document.getElementById("pagesCounterText");
    const stampsText = document.getElementById("stampsCounterText");
    const fill = document.getElementById("pagesMeterFill");
    const wrap = document.getElementById("pagesProgressBarWrap");

    if (pagesText) pagesText.textContent = `${pages.toLocaleString()} / ${totalPages.toLocaleString()}`;
    if (stampsText) stampsText.textContent = `${totalStamps} Stamps`;
    if (fill) fill.style.width = `${pct.toFixed(1)}%`;
    if (wrap) wrap.setAttribute("aria-valuenow", String(pages));

    const bSyl = document.getElementById("badgeSyllabus");
    const bBlk = document.getElementById("badgeBlackboard");
    const bVic = document.getElementById("badgeVictrola");
    const bAsg = document.getElementById("badgeAssignments");
    const bExm = document.getElementById("badgeExam");

    if (bSyl) bSyl.textContent = `${state.stampedWorks.length}/41`;
    if (bBlk) bBlk.textContent = `${sortedCount}/8`;
    if (bVic) bVic.textContent = `${victrolaCount}/9`;
    if (bAsg) bAsg.textContent = `${workshopsCount}/3`;
    if (bExm) bExm.textContent = `${examScore}/8`;
  }

  function renderAphorism() {
    const list = window.AUDEN_SEMINAR_LORE.aphorisms;
    const item = list[state.aphorismIdx % list.length];
    const qEl = document.getElementById("aphorismQuoteText");
    const cEl = document.getElementById("aphorismContextText");
    if (qEl) qEl.textContent = `\u201C${item.quote}\u201D`;
    if (cEl) cEl.textContent = `\u2014 ${item.context}`;
  }

  // =========================================================================
  // ROOM NAVIGATION
  // =========================================================================
  function switchRoom(roomId) {
    state.activeRoom = roomId;
    saveState();

    document.querySelectorAll(".room-tab").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-room") === roomId);
    });
    document.querySelectorAll(".room-panel").forEach((panel) => {
      panel.classList.toggle("active", panel.id === `room-${roomId}`);
    });

    if (roomId !== "victrola" && window.audenAudio && window.audenAudio.isPlaying) {
      window.audenAudio.stop();
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // =========================================================================
  // ROOM 1: WELCOME & INTELLECTUAL ARC
  // =========================================================================
  function renderWelcomeArc() {
    const grid = document.getElementById("intellectualArcGrid");
    if (!grid) return;

    const stageSearchMap = ["Aeschylus", "Augustine", "Shakespeare", "Kierkegaard", "Kafka"];

    grid.innerHTML = window.AUDEN_SEMINAR_LORE.intellectualArc
      .map(
        (item, idx) => `
      <article class="arc-card" style="cursor:pointer;" data-arc-idx="${idx}" title="Jump to these works on the Syllabus">
        <div>
          <span class="arc-dates">${esc(item.dates)}</span>
          <h4>${esc(item.stage)}</h4>
          <p><strong>Core Texts:</strong> ${esc(item.works)}</p>
          <p>${esc(item.coreShift)}</p>
        </div>
        <span class="arc-key-badge">${esc(item.audenKey)} &rarr;</span>
      </article>
    `
      )
      .join("");

    grid.querySelectorAll("[data-arc-idx]").forEach((card) => {
      card.addEventListener("click", () => {
        const idx = Number(card.getAttribute("data-arc-idx")) || 0;
        syllabusFilterSec = "all";
        syllabusFilterSphere = "all";
        syllabusSearch = "";
        const searchInput = document.getElementById("syllabusSearchInput");
        if (searchInput) searchInput.value = "";
        syncSyllabusFilterButtons();
        renderSyllabusGrid();
        switchRoom("syllabus");
        // Highlight matching stage author in modal if desired or scroll smoothly
        const hintAuthor = stageSearchMap[idx];
        const match = window.AUDEN_SYLLABUS.find((w) => w.author.includes(hintAuthor));
        if (match) openWorkModal(match.id);
      });
    });
  }

  // =========================================================================
  // ROOM 2: THE 41-WORK 1941 SYLLABUS & CALL-SLIP MODAL
  // =========================================================================
  function syncSyllabusFilterButtons() {
    document.querySelectorAll("#sectionFilterGroup .filter-chip").forEach((b) => {
      b.classList.toggle("active", b.getAttribute("data-sec") === syllabusFilterSec);
    });
    document.querySelectorAll("#sphereFilterGroup .filter-chip").forEach((b) => {
      b.classList.toggle("active", b.getAttribute("data-sphere") === syllabusFilterSphere);
    });
  }

  function getFilteredSyllabus() {
    const q = syllabusSearch.trim().toLowerCase();
    const stampedSet = new Set(state.stampedWorks);
    return window.AUDEN_SYLLABUS.filter((w) => {
      if (syllabusFilterSec !== "all" && w.section !== syllabusFilterSec) return false;
      if (syllabusFilterSphere !== "all" && w.sphere !== syllabusFilterSphere) return false;
      if (syllabusUnreadOnly && stampedSet.has(w.id)) return false;
      if (q) {
        const hay = `${w.author} ${w.title} ${w.tagline} ${w.dilemma} ${w.audenWrote} ${w.fateMode} ${w.era}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function sectionBadgeLabel(sec) {
    if (sec === "primary") return "Required Reading";
    if (sec === "opera") return "Opera Libretto";
    return "Critical Context";
  }

  function renderSyllabusGrid() {
    const grid = document.getElementById("syllabusCardsGrid");
    const summary = document.getElementById("syllabusCountSummary");
    if (!grid) return;

    const items = getFilteredSyllabus();
    const stampedSet = new Set(state.stampedWorks);
    const totalFilteredPages = items.reduce((s, w) => s + w.pages, 0);

    if (summary) {
      summary.textContent = `Showing ${items.length} of 41 syllabus works (${totalFilteredPages.toLocaleString()} pages in current view • ${state.stampedWorks.length} stamped in your Blue Book).`;
    }

    if (items.length === 0) {
      grid.innerHTML = `<div class="assignment-card"><p style="margin:0;">No works matched your current filter. Click <strong>All 41 Works</strong> and <strong>All Spheres</strong> to restore the full 1941 reading list.</p></div>`;
      return;
    }

    grid.innerHTML = items
      .map((w) => {
        const isStamped = stampedSet.has(w.id);
        const padNum = String(w.num).padStart(2, "0");
        const barPct = Math.max(6, Math.min(100, Math.round((w.pages / 840) * 100)));
        return `
        <article class="work-card ${isStamped ? "stamped" : ""}" data-work-id="${esc(w.id)}" tabindex="0" role="button" aria-label="Open seminar dossier for ${esc(w.title)} by ${esc(w.author)}">
          <div>
            <div class="work-top-row">
              <span class="work-call-no">NO. ${padNum} &middot; ${esc(sectionBadgeLabel(w.section))}</span>
              <span class="work-pages-wrap">
                <span class="work-pages-pill">${w.pages} pp.</span>
                <span class="work-sparkbar" aria-hidden="true"><span class="work-sparkbar-fill" style="width:${barPct}%;"></span></span>
              </span>
            </div>
            <p class="work-author">${esc(w.author)} &middot; ${esc(w.year)}</p>
            <h3 class="work-title">${esc(w.title)}</h3>
            <p class="work-tagline">${esc(w.tagline)}</p>
          </div>
          <div class="work-footer">
            <span class="sphere-tag">${esc(w.sphere)} &middot; ${esc(w.fateMode)}</span>
            ${
              isStamped
                ? `<span class="stamp-mark">Stamped</span>`
                : `<span class="open-slip-cue">Folio &rarr;</span>`
            }
          </div>
        </article>
      `;
      })
      .join("");

    grid.querySelectorAll(".work-card").forEach((card) => {
      const open = () => openWorkModal(card.getAttribute("data-work-id"));
      card.addEventListener("click", open);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      });
    });
  }

  function stampWork(workId) {
    if (!state.stampedWorks.includes(workId)) {
      state.stampedWorks.push(workId);
      if (window.audenAudio) window.audenAudio.playStampThud();
      saveState();
      updateMastheadProgress();
      renderSyllabusGrid();
    }
  }

  function openWorkModal(workId) {
    const idx = window.AUDEN_SYLLABUS.findIndex((x) => x.id === workId);
    if (idx === -1) return;
    const w = window.AUDEN_SYLLABUS[idx];
    currentModalWorkId = w.id;

    const prevWork = window.AUDEN_SYLLABUS[(idx - 1 + window.AUDEN_SYLLABUS.length) % window.AUDEN_SYLLABUS.length];
    const nextWork = window.AUDEN_SYLLABUS[(idx + 1) % window.AUDEN_SYLLABUS.length];

    const isStamped = state.stampedWorks.includes(w.id);
    const prevChoice = state.sparkAnswered[w.id];
    const matchingRecEntry = Object.entries(OPERA_RECORD_TO_SYLLABUS_ID).find(([, sylId]) => sylId === w.id);
    const matchingRecId = matchingRecEntry ? matchingRecEntry[0] : null;

    const backdrop = document.getElementById("workModalBackdrop");
    const box = document.getElementById("workModalContent");
    if (!backdrop || !box) return;

    box.innerHTML = `
      <button type="button" class="modal-close-btn" id="closeModalBtn" aria-label="Close dossier">&times;</button>
      <p class="section-kicker">Call-Slip #${w.num} of 41 • ${esc(sectionBadgeLabel(w.section))} • ${esc(w.edition1941)} (${w.pages} pages)</p>
      <h2 id="modalWorkTitle" style="margin:0.15rem 0 0.25rem; font-size:1.65rem;">${esc(w.title)}</h2>
      <p style="margin:0 0 0.9rem; font-family:var(--font-sans); font-size:0.86rem; color:var(--ink-muted);">
        <strong>${esc(w.author)}</strong> (${esc(w.year)}) &bull; Era: ${esc(w.era)} &bull; Auden Category: <strong>${esc(w.sphere)} / ${esc(w.fateMode)}</strong>
      </p>

      <p class="dossier-prose" style="margin:0 0 1rem; font-size:1rem;"><strong>The Core Dilemma of Fate &amp; Self:</strong> ${esc(w.dilemma)}</p>
      ${
        matchingRecId
          ? `<div style="margin:0 0 1rem;"><button type="button" class="btn-primary" id="jumpToVictrolaFromModalBtn">&#9654; Audition 78-RPM Record at 1227 Pontiac St. &rarr;</button></div>`
          : ""
      }

      <div class="dossier-quote-box">
        <div style="font-style:italic; font-size:0.98rem;">${esc(w.keyQuote)}</div>
        <div style="font-family:var(--font-sans); font-size:0.78rem; color:var(--ink-muted); margin-top:0.35rem;">&mdash; ${esc(w.quoteSource)}</div>
      </div>

      <div class="dossier-auden-box">
        <div style="font-family:var(--font-typewriter); font-size:0.75rem; text-transform:uppercase; color:var(--fountain-blue); font-weight:700; margin-bottom:0.25rem;">
          What W. H. Auden Wrote &amp; Lectured About This Work
        </div>
        <div style="font-size:0.96rem;">${esc(w.audenWrote)}</div>
        <div style="font-family:var(--font-sans); font-size:0.77rem; color:var(--ink-muted); margin-top:0.35rem;">Source: ${esc(w.audenSource)}</div>
      </div>

      <div class="spark-quiz-box">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem; flex-wrap:wrap;">
          <strong style="font-family:var(--font-typewriter); font-size:0.82rem; color:var(--mimeo-purple);">
            60-SECOND SEMINAR SPARK (CONQUER ${w.pages} PAGES!)
          </strong>
          ${
            isStamped
              ? `<span class="stamp-mark">READ &amp; DIGESTED (+${w.pages} PP.)</span>`
              : `<button type="button" class="filter-chip" id="directStampBtn">Stamp Read Directly</button>`
          }
        </div>
        <p style="margin:0.5rem 0 0.6rem; font-weight:600; font-size:0.96rem;">${esc(w.sparkQuestion)}</p>
        <div id="modalSparkOptions">
          ${w.sparkOptions
            .map((opt, oIdx) => {
              let cls = "";
              if (prevChoice !== undefined) {
                if (oIdx === w.sparkAnswer) cls = "correct";
                else if (oIdx === prevChoice) cls = "wrong";
              }
              return `<button type="button" class="spark-option-btn ${cls}" data-spark-idx="${oIdx}">${esc(opt)}</button>`;
            })
            .join("")}
        </div>
        <div id="modalSparkFeedback" style="margin-top:0.75rem; font-size:0.92rem; color:var(--forest-sage); font-weight:600;">
          ${prevChoice === w.sparkAnswer ? esc(w.sparkFeedback) : ""}
        </div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1.25rem; padding-top:0.9rem; border-top:1px solid #dfd2b7; gap:0.5rem; flex-wrap:wrap;">
        <button type="button" class="btn-secondary" id="prevWorkModalBtn">&larr; #${prevWork.num} ${esc(prevWork.author)}</button>
        <button type="button" class="btn-secondary" id="nextWorkModalBtn">#${nextWork.num} ${esc(nextWork.author)} &rarr;</button>
      </div>
    `;

    backdrop.classList.add("open");

    document.getElementById("closeModalBtn").addEventListener("click", closeWorkModal);
    document.getElementById("prevWorkModalBtn").addEventListener("click", () => openWorkModal(prevWork.id));
    document.getElementById("nextWorkModalBtn").addEventListener("click", () => openWorkModal(nextWork.id));

    const directBtn = document.getElementById("directStampBtn");
    if (directBtn) {
      directBtn.addEventListener("click", () => {
        stampWork(w.id);
        openWorkModal(w.id);
      });
    }

    const jumpVicBtn = document.getElementById("jumpToVictrolaFromModalBtn");
    if (jumpVicBtn && matchingRecId) {
      jumpVicBtn.addEventListener("click", () => {
        closeWorkModal();
        state.activeRecordId = matchingRecId;
        saveState();
        switchRoom("victrola");
        renderVictrola();
        const playBtn = document.getElementById("playRecordBtn");
        if (playBtn) playBtn.click();
      });
    }

    box.querySelectorAll("[data-spark-idx]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const chosen = Number(btn.getAttribute("data-spark-idx"));
        state.sparkAnswered[w.id] = chosen;
        const fb = document.getElementById("modalSparkFeedback");
        if (chosen === w.sparkAnswer) {
          stampWork(w.id);
          openWorkModal(w.id);
        } else {
          if (window.audenAudio) window.audenAudio.playChalkTick();
          saveState();
          btn.classList.add("wrong");
          if (fb) {
            fb.style.color = "var(--crimson-stamp)";
            fb.textContent = "Not quite—re-read 'What W. H. Auden Wrote' right above and try another angle!";
          }
        }
      });
    });
  }

  function closeWorkModal() {
    const backdrop = document.getElementById("workModalBackdrop");
    if (backdrop) backdrop.classList.remove("open");
    currentModalWorkId = null;
  }

  // =========================================================================
  // ROOM 3: ANGELL HALL BLACKBOARD & CHALK CHARACTER SORTER
  // =========================================================================
  function renderSmuggledNotes() {
    const drawer = document.getElementById("smuggledNotesDrawer");
    const list = document.getElementById("smuggledNotesList");
    const btn = document.getElementById("toggleSmuggledNotesBtn");
    if (!drawer || !list || !btn) return;

    drawer.hidden = !state.smuggledOpen;
    btn.textContent = state.smuggledOpen
      ? "× Close Contraband Notes"
      : "§ Contraband Student Notes (1941)";

    list.innerHTML = window.AUDEN_BLACKBOARD.smuggledNotes
      .map(
        (n) => `
      <div style="margin-bottom:0.85rem; padding-bottom:0.65rem; border-bottom:1px solid var(--rule-subtle); max-width:66ch;">
        <div style="font-family:var(--font-typewriter); font-size:0.73rem; color:var(--accent-vermilion); font-weight:600;">
          ${esc(n.date)} &middot; <span style="font-weight:400; color:var(--ink-muted);">${esc(n.author)}</span>
        </div>
        <div style="font-size:0.93rem; margin-top:0.25rem;">${esc(n.entry)}</div>
      </div>
    `
      )
      .join("");
  }

  function renderBlackboard() {
    const tabWrap = document.getElementById("blackboardTabButtons");
    const content = document.getElementById("blackboardActiveContent");
    if (!tabWrap || !content) return;

    const boards = window.AUDEN_BLACKBOARD.boards;
    const activeBoard = boards.find((b) => b.id === state.activeBoardId) || boards[0];

    tabWrap.innerHTML = boards
      .map(
        (b) => `
      <button type="button" class="chalk-tab-btn ${b.id === activeBoard.id ? "active" : ""}" data-board-id="${esc(b.id)}">
        ${esc(b.tabTitle)}
      </button>
    `
      )
      .join("");

    tabWrap.querySelectorAll("[data-board-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.activeBoardId = btn.getAttribute("data-board-id");
        state.selectedBoardRow = 0;
        if (window.audenAudio) window.audenAudio.playChalkTick();
        saveState();
        renderBlackboard();
      });
    });

    if (activeBoard.type === "comparison") {
      const selIdx = Math.min(state.selectedBoardRow, activeBoard.rows.length - 1);
      const activeRow = activeBoard.rows[selIdx];

      content.innerHTML = `
        <h3 class="chalk-heading">${esc(activeBoard.boardHeading)}</h3>
        <p class="chalk-citation">${esc(activeBoard.citation)} &mdash; ${esc(activeBoard.chalkSummary)}</p>
        <div style="overflow-x:auto;">
          <table class="chalk-table">
            <thead>
              <tr>
                ${activeBoard.columns.map((c) => `<th>${esc(c)}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${activeBoard.rows
                .map(
                  (r, rIdx) => `
                <tr class="chalk-row-interactive ${rIdx === selIdx ? "selected" : ""}" data-row-idx="${rIdx}">
                  <td style="font-family:var(--font-typewriter); color:var(--chalk-yellow); font-weight:700;">${esc(r.axis)}</td>
                  <td>${esc(r.left)}</td>
                  <td>${esc(r.right)}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
        <div class="chalk-commentary-tray">
          <strong style="font-family:var(--font-typewriter); color:var(--chalk-yellow);">AUDEN AT THE LECTERN (${esc(activeRow.axis)}):</strong>
          <p style="margin:0.3rem 0 0;">${esc(activeRow.audenNote)}</p>
        </div>
      `;

      content.querySelectorAll("[data-row-idx]").forEach((tr) => {
        tr.addEventListener("click", () => {
          state.selectedBoardRow = Number(tr.getAttribute("data-row-idx")) || 0;
          if (window.audenAudio) window.audenAudio.playChalkTick();
          saveState();
          renderBlackboard();
        });
      });
    } else if (activeBoard.type === "spheres") {
      content.innerHTML = `
        <h3 class="chalk-heading">${esc(activeBoard.boardHeading)}</h3>
        <p class="chalk-citation">${esc(activeBoard.citation)}</p>
        <div class="spheres-chalk-grid">
          ${activeBoard.nodes
            .map(
              (n) => `
            <div class="sphere-chalk-box" style="border-color:${esc(n.color)};">
              <div style="font-family:var(--font-typewriter); font-weight:700; color:${esc(n.color)}; font-size:0.96rem;">${esc(n.title)}</div>
              <div style="font-family:var(--font-sans); font-size:0.78rem; opacity:0.8; margin-bottom:0.45rem;">${esc(n.subtitle)}</div>
              <p style="font-style:italic; margin:0 0 0.5rem; color:#fff;">${esc(n.motto)}</p>
              <p style="font-size:0.86rem; margin:0 0 0.45rem;"><strong style="color:var(--chalk-yellow);">Syllabus Figures:</strong> ${esc(n.exemplars)}</p>
              <p style="font-size:0.86rem; margin:0 0 0.45rem;"><strong style="color:var(--chalk-coral);">Existential Trap:</strong> ${esc(n.trap)}</p>
              <p style="font-size:0.87rem; margin:0; color:var(--chalk-cyan);"><strong>Auden&rsquo;s Key:</strong> ${esc(n.audenInsight)}</p>
            </div>
          `
            )
            .join("")}
        </div>
      `;
    } else if (activeBoard.type === "spatial") {
      const cIdx = Math.min(state.selectedSpatialIdx, activeBoard.coordinates.length - 1);
      const activeCoord = activeBoard.coordinates[cIdx];

      content.innerHTML = `
        <h3 class="chalk-heading">${esc(activeBoard.boardHeading)}</h3>
        <p class="chalk-citation">${esc(activeBoard.citation)}</p>
        <svg viewBox="0 0 680 190" width="100%" style="max-width:680px; display:block; margin:0 auto 1rem;" role="img" aria-label="Auden chalk compass of Ariel, Caliban, Prospero, Antonio, and the Romantic Sea">
          <line x1="340" y1="24" x2="340" y2="166" stroke="#f4f1e8" stroke-opacity="0.35" stroke-dasharray="4 4" />
          <line x1="70" y1="95" x2="610" y2="95" stroke="#f4f1e8" stroke-opacity="0.35" stroke-dasharray="4 4" />
          <g data-spatial-idx="0" style="cursor:pointer;">
            <rect x="245" y="6" width="190" height="34" rx="4" fill="${cIdx === 0 ? "rgba(243,208,120,0.25)" : "#232f29"}" stroke="#94d6cc" stroke-dasharray="4 2" />
            <text x="340" y="27" text-anchor="middle" fill="#f3d078" font-family="Courier New, monospace" font-size="11" font-weight="bold">NORTH: ARIEL (MIRROR)</text>
          </g>
          <g data-spatial-idx="1" style="cursor:pointer;">
            <rect x="245" y="150" width="190" height="34" rx="4" fill="${cIdx === 1 ? "rgba(243,208,120,0.25)" : "#232f29"}" stroke="#94d6cc" stroke-dasharray="4 2" />
            <text x="340" y="171" text-anchor="middle" fill="#f3d078" font-family="Courier New, monospace" font-size="11" font-weight="bold">SOUTH: CALIBAN (FLESH)</text>
          </g>
          <g data-spatial-idx="2" style="cursor:pointer;">
            <rect x="248" y="76" width="184" height="38" rx="18" fill="${cIdx === 2 ? "rgba(243,208,120,0.28)" : "#232f29"}" stroke="#f3d078" stroke-width="1.6" />
            <text x="340" y="99" text-anchor="middle" fill="#ffffff" font-family="Courier New, monospace" font-size="11" font-weight="bold">PROSPERO (EGO)</text>
          </g>
          <g data-spatial-idx="3" style="cursor:pointer;">
            <rect x="18" y="76" width="176" height="38" rx="4" fill="${cIdx === 3 ? "rgba(243,208,120,0.25)" : "#232f29"}" stroke="#f29b8e" stroke-dasharray="4 2" />
            <text x="106" y="99" text-anchor="middle" fill="#f29b8e" font-family="Courier New, monospace" font-size="10.5" font-weight="bold">ANTONIO ('I AM I')</text>
          </g>
          <g data-spatial-idx="4" style="cursor:pointer;">
            <rect x="486" y="76" width="176" height="38" rx="4" fill="${cIdx === 4 ? "rgba(243,208,120,0.25)" : "#232f29"}" stroke="#94d6cc" stroke-dasharray="4 2" />
            <text x="574" y="99" text-anchor="middle" fill="#94d6cc" font-family="Courier New, monospace" font-size="10.5" font-weight="bold">ROMANTIC SEA</text>
          </g>
        </svg>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap:0.7rem; margin-bottom:1rem;">
          ${activeBoard.coordinates
            .map(
              (c, idx) => `
            <button type="button" class="sphere-chalk-box" data-spatial-idx="${idx}" style="text-align:left; cursor:pointer; color:var(--chalk-white); border-color:${
                idx === cIdx ? "var(--chalk-yellow)" : "rgba(244,241,232,0.3)"
              }; background:${idx === cIdx ? "rgba(243,208,120,0.16)" : "rgba(255,255,255,0.04)"};">
              <div style="font-family:var(--font-typewriter); font-size:0.7rem; color:var(--chalk-cyan);">${esc(c.pos)}</div>
              <div style="font-weight:700; font-size:0.95rem; color:var(--chalk-yellow); margin:0.2rem 0;">${esc(c.name)}</div>
              <div style="font-size:0.78rem; opacity:0.82;">${esc(c.works)}</div>
            </button>
          `
            )
            .join("")}
        </div>
        <div class="chalk-commentary-tray">
          <strong style="font-family:var(--font-typewriter); color:var(--chalk-yellow);">${esc(activeCoord.pos)} &mdash; ${esc(activeCoord.name)}</strong>
          <p style="margin:0.35rem 0;">${esc(activeCoord.desc)}</p>
          <p style="margin:0; font-style:italic; color:var(--chalk-cyan);">${esc(activeCoord.audenQuote)}</p>
        </div>
      `;

      content.querySelectorAll("[data-spatial-idx]").forEach((btn) => {
        btn.addEventListener("click", () => {
          state.selectedSpatialIdx = Number(btn.getAttribute("data-spatial-idx")) || 0;
          if (window.audenAudio) window.audenAudio.playChalkTick();
          saveState();
          renderBlackboard();
        });
      });
    }
  }

  function renderChalkSorter() {
    const pool = document.getElementById("sorterChipsPool");
    const clueBanner = document.getElementById("sorterClueBanner");
    const progLabel = document.getElementById("sorterProgressLabel");
    if (!pool) return;

    const chars = window.AUDEN_BLACKBOARD.chalkSorter;
    const sortedCount = Object.keys(state.chalkSorted).length;
    if (progLabel) progLabel.textContent = `${sortedCount} / ${chars.length} Chalked`;

    // Ensure selected character defaults to an unsorted one if available
    if (state.chalkSorted[state.selectedChalkCharId]) {
      const nextUnsorted = chars.find((c) => !state.chalkSorted[c.id]);
      if (nextUnsorted) state.selectedChalkCharId = nextUnsorted.id;
    }

    const activeChar = chars.find((c) => c.id === state.selectedChalkCharId);
    if (clueBanner) {
      if (sortedCount === chars.length) {
        clueBanner.innerHTML = `<strong>All 8 figures chalked onto the Angell Hall slate!</strong> Professor Auden nods approvingly over his Lucky Strike.`;
      } else if (activeChar) {
        clueBanner.innerHTML = `<strong>Selected Chalk Stick: ${esc(activeChar.name)}</strong> (${esc(activeChar.work)}) &mdash; <em>Clue:</em> ${esc(activeChar.clue)}`;
      }
    }

    pool.innerHTML = chars
      .map((c) => {
        const isSorted = Boolean(state.chalkSorted[c.id]);
        const isSel = c.id === state.selectedChalkCharId && !isSorted;
        return `<button type="button" class="char-chalk-chip ${isSel ? "selected" : ""} ${isSorted ? "sorted" : ""}" data-char-id="${esc(c.id)}">${esc(c.name)}</button>`;
      })
      .join("");

    pool.querySelectorAll("[data-char-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-char-id");
        if (state.chalkSorted[id]) return;
        state.selectedChalkCharId = id;
        if (window.audenAudio) window.audenAudio.playChalkTick();
        renderChalkSorter();
      });
    });

    // Populate the four slate buckets
    ["necessity", "aesthetic", "demonic", "ethical-religious"].forEach((bucketId) => {
      const container = document.getElementById(`bucket-${bucketId}`);
      if (!container) return;
      const placed = chars.filter((c) => state.chalkSorted[c.id] === bucketId);
      container.innerHTML = placed
        .map(
          (c) =>
            `<div style="font-family:var(--font-typewriter); font-size:0.8rem; color:var(--chalk-yellow); background:rgba(255,255,255,0.08); padding:0.25rem 0.5rem; border-radius:4px; margin-top:0.3rem;">✓ ${esc(c.name)}</div>`
        )
        .join("");
    });
  }

  function bindChalkBucketClicks() {
    document.querySelectorAll("#sorterBucketsGrid .sorter-bucket").forEach((bucketEl) => {
      bucketEl.addEventListener("click", () => {
        const bucketId = bucketEl.getAttribute("data-bucket");
        const chars = window.AUDEN_BLACKBOARD.chalkSorter;
        const activeChar = chars.find((c) => c.id === state.selectedChalkCharId);
        const fb = document.getElementById("sorterFeedbackBox");
        if (!activeChar || state.chalkSorted[activeChar.id]) return;

        if (activeChar.correctBucket === bucketId) {
          state.chalkSorted[activeChar.id] = bucketId;
          if (window.audenAudio) window.audenAudio.playStampThud();
          if (fb) {
            fb.style.color = "var(--forest-sage)";
            fb.textContent = activeChar.feedback;
          }
          saveState();
          updateMastheadProgress();
          renderChalkSorter();
        } else {
          if (window.audenAudio) window.audenAudio.playChalkTick();
          if (fb) {
            fb.style.color = "var(--crimson-stamp)";
            fb.textContent = `Careful! ${activeChar.name} doesn't belong in that quadrant—re-check their dossier clue above (don't fall for deterministic excuses!).`;
          }
        }
      });
    });
  }

  // =========================================================================
  // ROOM 4: 1227 PONTIAC STREET VICTROLA & 9 OPERA LIBRETTI
  // =========================================================================
  function getActiveRecord() {
    return window.AUDEN_VICTROLA.find((r) => r.id === state.activeRecordId) || window.AUDEN_VICTROLA[0];
  }

  function updateTurntableVisuals(playing, stepIdx, totalSteps) {
    const rec = getActiveRecord();
    const disc = document.getElementById("shellacDisc");
    const arm = document.getElementById("tonearmSvg");
    const label = document.getElementById("recordCenterLabel");
    const compText = document.getElementById("discComposerText");
    const titleText = document.getElementById("discTitleText");
    const statusBadge = document.getElementById("victrolaStatusBadge");
    const stepCounter = document.getElementById("motifStepCounter");
    const playBtn = document.getElementById("playRecordBtn");

    if (label) label.style.background = rec.labelColor || "#8c2d19";
    if (compText) compText.textContent = rec.composer.split(" ").pop().toUpperCase();
    if (titleText) titleText.textContent = rec.title.split("(")[0].trim();

    if (disc) disc.classList.toggle("spinning", Boolean(playing));
    if (arm) arm.classList.toggle("engaged", Boolean(playing));
    if (statusBadge) {
      statusBadge.textContent = playing ? "SPINNING @ 78 RPM" : "NEEDLE LIFTED";
      statusBadge.style.color = playing ? "#8fd3c7" : "#bfb29f";
    }
    if (playBtn) {
      playBtn.textContent = playing ? "↻ Replay Motif" : "▶ Drop Needle";
    }
    if (stepCounter) {
      const tot = totalSteps || (rec.motifNotes ? rec.motifNotes.length : 0);
      stepCounter.textContent = playing ? `Bar ${stepIdx + 1} / ${tot}` : `${tot} Harmonic Bars`;
    }
  }

  function renderVictrola() {
    const crate = document.getElementById("recordCrateGrid");
    const card = document.getElementById("activeLibrettoCard");
    if (!crate || !card) return;

    const activeRec = getActiveRecord();

    crate.innerHTML = window.AUDEN_VICTROLA
      .map((r, i) => {
        const done = state.recordsSpun.includes(r.id) || state.directorSolved[r.id];
        const padIdx = String(i + 1).padStart(2, "0");
        return `
        <button type="button" class="sleeve-btn ${r.id === activeRec.id ? "active" : ""}" data-rec-id="${esc(r.id)}">
          <div style="font-family:var(--font-typewriter); font-size:0.67rem; color:var(--ink-muted); letter-spacing:0.05em;">
            DISC ${padIdx} ${done ? "· AUDITIONED" : ""}
          </div>
          <div style="font-weight:700; font-size:0.88rem; line-height:1.24; margin:0.16rem 0;">${esc(r.title.split("(")[0].trim())}</div>
          <div style="font-family:var(--font-sans); font-size:0.72rem; color:var(--ink-secondary);">${esc(r.composer)}</div>
        </button>
      `;
      })
      .join("");

    crate.querySelectorAll("[data-rec-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const nextId = btn.getAttribute("data-rec-id");
        if (window.audenAudio && window.audenAudio.isPlaying) {
          window.audenAudio.stop();
        }
        state.activeRecordId = nextId;
        saveState();
        renderVictrola();
        updateTurntableVisuals(false, 0, getActiveRecord().motifNotes.length);
      });
    });

    const solved = state.directorSolved[activeRec.id];

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:baseline; flex-wrap:wrap; gap:0.5rem;">
        <span class="section-kicker">${esc(activeRec.catalogNo)} &bull; ${esc(activeRec.keySignature)}</span>
        <span class="sphere-tag">${esc(activeRec.sphereTag)}</span>
      </div>
      <h3 style="margin:0.2rem 0 0.2rem; font-size:1.45rem;">${esc(activeRec.title)} &mdash; <span style="font-weight:400;">${esc(activeRec.composer)}</span></h3>
      <p style="margin:0 0 0.85rem; font-family:var(--font-sans); font-size:0.84rem; color:var(--ink-muted);">
        Libretto: ${esc(activeRec.librettist)} &bull; Featured Needle-Drop: <strong>${esc(activeRec.sceneTitle)}</strong>
      </p>

      <div style="background:var(--paper-recessed); border-left:2px solid var(--ink-primary); padding:0.75rem 1rem; font-size:0.91rem; max-width:66ch;">
        <strong>Musical Anatomy on the Victrola:</strong> ${esc(activeRec.musicalAnatomy)}
      </div>

      <div class="bilingual-columns">
        <div>
          <strong style="font-family:var(--font-typewriter); font-size:0.72rem; color:var(--mimeo-purple); display:block; margin-bottom:0.3rem;">ORIGINAL LIBRETTO</strong>
          ${esc(activeRec.librettoOriginal)}
        </div>
        <div>
          <strong style="font-family:var(--font-typewriter); font-size:0.72rem; color:var(--fountain-blue); display:block; margin-bottom:0.3rem;">ENGLISH TRANSLATION</strong>
          ${esc(activeRec.librettoEnglish)}
        </div>
      </div>

      <div class="dossier-auden-box">
        <strong style="font-family:var(--font-typewriter); font-size:0.75rem; color:var(--fountain-blue); display:block; margin-bottom:0.2rem;">AUDEN OVER TEA AT 1227 PONTIAC STREET:</strong>
        ${esc(activeRec.audenCommentary)}
      </div>

      <div class="spark-quiz-box">
        <strong style="font-family:var(--font-typewriter); font-size:0.78rem; color:var(--crimson-stamp);">DIRECTOR&rsquo;S STAGING PROMPT (STAMPS OPERA + SYLLABUS LIBRETTO!)</strong>
        <p style="margin:0.4rem 0 0.55rem; font-weight:600;">${esc(activeRec.directorPrompt)}</p>
        <div>
          ${activeRec.directorChoices
            .map((c, idx) => {
              let cls = "";
              if (solved && c.correct) cls = "correct";
              return `<button type="button" class="spark-option-btn ${cls}" data-dir-idx="${idx}">${esc(c.text)}</button>`;
            })
            .join("")}
        </div>
        <div id="directorReplyBox" style="margin-top:0.65rem; font-size:0.91rem; font-weight:600; color:var(--forest-sage);">
          ${solved ? esc(activeRec.directorChoices.find((x) => x.correct).reply) : ""}
        </div>
      </div>
    `;

    card.querySelectorAll("[data-dir-idx]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-dir-idx"));
        const choice = activeRec.directorChoices[idx];
        const replyBox = document.getElementById("directorReplyBox");
        if (choice.correct) {
          state.directorSolved[activeRec.id] = true;
          const sylId = OPERA_RECORD_TO_SYLLABUS_ID[activeRec.id];
          if (sylId && !state.stampedWorks.includes(sylId)) {
            state.stampedWorks.push(sylId);
          }
          if (window.audenAudio) window.audenAudio.playStampThud();
          saveState();
          updateMastheadProgress();
          renderSyllabusGrid();
          renderVictrola();
        } else {
          btn.classList.add("wrong");
          if (window.audenAudio) window.audenAudio.playChalkTick();
          if (replyBox) {
            replyBox.style.color = "var(--crimson-stamp)";
            replyBox.textContent = choice.reply;
          }
        }
      });
    });

    updateTurntableVisuals(
      window.audenAudio && window.audenAudio.isPlaying && window.audenAudio.currentRecordId === activeRec.id,
      0,
      activeRec.motifNotes.length
    );
  }

  function startOscilloscopeLoop() {
    const canvas = document.getElementById("victrolaScopeCanvas");
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    const buf = new Uint8Array(128);
    let phase = 0;

    function draw() {
      const w = canvas.width;
      const h = canvas.height;
      ctx2d.fillStyle = "#101713";
      ctx2d.fillRect(0, 0, w, h);

      // Subtle grid line
      ctx2d.strokeStyle = "rgba(143, 211, 199, 0.16)";
      ctx2d.lineWidth = 1;
      ctx2d.beginPath();
      ctx2d.moveTo(0, h / 2);
      ctx2d.lineTo(w, h / 2);
      ctx2d.stroke();

      const hasLiveAudio = window.audenAudio && window.audenAudio.getWaveformSnapshot(buf);
      ctx2d.strokeStyle = "#8fd3c7";
      ctx2d.lineWidth = 2;
      ctx2d.beginPath();

      if (hasLiveAudio) {
        const slice = w / buf.length;
        for (let i = 0; i < buf.length; i++) {
          const v = buf[i] / 128.0;
          const y = (v * h) / 2;
          if (i === 0) ctx2d.moveTo(0, y);
          else ctx2d.lineTo(i * slice, y);
        }
      } else if (window.audenAudio && window.audenAudio.isPlaying) {
        // Muted visual harmonic wave so muted users still enjoy visual motion!
        phase += 0.16;
        for (let x = 0; x < w; x += 3) {
          const y = h / 2 + Math.sin(x * 0.05 + phase) * 11 * Math.cos(x * 0.015 - phase * 0.5);
          if (x === 0) ctx2d.moveTo(x, y);
          else ctx2d.lineTo(x, y);
        }
      } else {
        ctx2d.moveTo(0, h / 2);
        ctx2d.lineTo(w, h / 2);
      }
      ctx2d.stroke();
      scopeAnimId = requestAnimationFrame(draw);
    }

    if (!scopeAnimId) draw();
  }

  // =========================================================================
  // ROOM 5: THE THREE MERCIFULLY HUMANE ASSIGNMENTS
  // =========================================================================
  function renderAssignments() {
    document.querySelectorAll(".workshop-tab-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-workshop") === state.activeWorkshop);
    });

    const container = document.getElementById("workshopContainer");
    if (!container) return;

    if (state.activeWorkshop === "dante") {
      const cantos = window.AUDEN_ASSIGNMENTS.danteCantos;
      const solvedCount = Object.keys(state.danteSolved).length;

      container.innerHTML = `
        <div class="horace-meter-bar">
          <div>
            <strong style="font-family:var(--font-typewriter); color:var(--crimson-stamp);">LAB A: THE SIX-CANTO REPRIEVE (DANTE&rsquo;S TERZA RIMA WEAVER)</strong>
            <p style="margin:0.2rem 0 0; font-size:0.9rem; color:var(--ink-secondary);">
              Ross Macdonald recalled Auden assigning memorization of six entire cantos of Dante in lieu of a written exam. Restore 4 key tercets by locking both Dante&rsquo;s interlocking rhyme AND his theology of free will!
            </p>
          </div>
          <span class="stamp-mark" style="font-size:0.84rem;">${solvedCount} / ${cantos.length} Tercets Restored</span>
        </div>

        ${cantos
          .map((c) => {
            const isDone = Boolean(state.danteSolved[c.id]);
            const winningOpt = c.options.find((o) => o.correct);
            return `
            <div class="assignment-card">
              <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:0.5rem;">
                <strong style="font-family:var(--font-typewriter); color:var(--mimeo-purple);">${esc(c.cantoLabel)}</strong>
                <span style="font-family:var(--font-typewriter); font-size:0.76rem; color:var(--ink-muted);">${esc(c.rhymeScheme)}</span>
              </div>
              <p style="margin:0.4rem 0; font-size:0.92rem; color:var(--ink-secondary);">${esc(c.englishContext)}</p>
              <div class="tercet-verse">
                <div>1. ${esc(c.italianLines[0])}</div>
                <div>2. ${esc(c.italianLines[1])}</div>
                <div style="font-weight:700; color:${isDone ? "var(--forest-sage)" : "var(--crimson-stamp)"};">
                  3. ${isDone ? esc(winningOpt.line) : "[ Choose the completing Terza Rima line below ]"}
                </div>
              </div>
              <div>
                ${c.options
                  .map(
                    (o, oIdx) => `
                  <button type="button" class="spark-option-btn ${isDone && o.correct ? "correct" : ""}" data-canto-id="${esc(c.id)}" data-opt-idx="${oIdx}">
                    <strong>${esc(o.line)}</strong> <span style="color:var(--ink-muted); font-size:0.86rem;">${esc(o.trans)}</span>
                  </button>
                `
                  )
                  .join("")}
              </div>
              <div id="dante-fb-${esc(c.id)}" style="margin-top:0.65rem; font-size:0.91rem; font-weight:600; color:var(--forest-sage);">
                ${isDone ? esc(winningOpt.note) : ""}
              </div>
            </div>
          `;
          })
          .join("")}
      `;

      container.querySelectorAll("[data-canto-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const cId = btn.getAttribute("data-canto-id");
          const oIdx = Number(btn.getAttribute("data-opt-idx"));
          const canto = cantos.find((x) => x.id === cId);
          const opt = canto.options[oIdx];
          const fb = document.getElementById(`dante-fb-${cId}`);

          if (opt.correct) {
            state.danteSolved[cId] = true;
            if (window.audenAudio) window.audenAudio.playStampThud();
            saveState();
            updateMastheadProgress();
            renderAssignments();
          } else {
            btn.classList.add("wrong");
            if (window.audenAudio) window.audenAudio.playChalkTick();
            if (fb) {
              fb.style.color = "var(--crimson-stamp)";
              fb.textContent = opt.note;
            }
          }
        });
      });
    } else if (state.activeWorkshop === "horace") {
      const lines = window.AUDEN_ASSIGNMENTS.horaceLines;
      let totalPoise = 0;
      const assembledLines = [];

      lines.forEach((l) => {
        const chosenIdx = state.horaceChoices[l.id];
        if (chosenIdx !== undefined && l.variants[chosenIdx]) {
          totalPoise += l.variants[chosenIdx].poiseScore;
          assembledLines.push(l.variants[chosenIdx].text);
        }
      });

      const maxPoise = 135;
      let verdict = "Select a rendering for all 4 Latin phrases below to hear Auden’s scansion verdict.";
      if (assembledLines.length === lines.length) {
        if (totalPoise >= 125) {
          verdict = "SUMMA URBANA! Dry, un-hysterical, metrically crisp—Quintus Horatius Flaccus and Wystan Auden raise a glass of Sabine wine to your poise.";
        } else if (totalPoise >= 80) {
          verdict = "Passable idiomatic sense, though one or two Romantic sighs or bureaucratic stiffnesses crept past your fountain pen!";
        } else {
          verdict = "Merciful heavens—either Captain Ahab or a Muncie tax clerk hijacked poor Horace! Try tuning toward Audenesque Dry Wit.";
        }
      }

      container.innerHTML = `
        <div class="horace-meter-bar">
          <div>
            <strong style="font-family:var(--font-typewriter); color:var(--fountain-blue);">LAB B: HORACE&rsquo;S SABINE TRANSLATION TUNER (ODE I.11)</strong>
            <p style="margin:0.2rem 0 0; font-size:0.9rem; color:var(--ink-secondary);">
              Auden revered Horace&rsquo;s dry, civilized voice against fanatical Fate-worship. Tune each Latin clause to maximize Horatian Poise.
            </p>
          </div>
          <span class="stamp-mark" style="border-color:var(--fountain-blue); color:var(--fountain-blue); font-size:0.84rem;">
            Horatian Poise: ${totalPoise} / ${maxPoise}
          </span>
        </div>

        ${
          assembledLines.length > 0
            ? `<div class="dossier-auden-box" style="margin-bottom:1.15rem;">
                <strong style="font-family:var(--font-typewriter); font-size:0.75rem; color:var(--fountain-blue);">YOUR ASSEMBLED ENGLISH ODE I.11:</strong>
                <p style="font-style:italic; margin:0.4rem 0;">${assembledLines.map((x) => esc(x)).join(" <br/>")}</p>
                <div style="font-size:0.88rem; font-weight:600; color:var(--crimson-stamp);">&mdash; Prof. Auden&rsquo;s Red Ink: ${esc(verdict)}</div>
              </div>`
            : ""
        }

        ${lines
          .map((l, idx) => {
            const picked = state.horaceChoices[l.id];
            return `
            <div class="assignment-card">
              <div style="font-family:var(--font-typewriter); font-size:0.78rem; color:var(--mimeo-purple); font-weight:700;">CLAUSE ${idx + 1} OF 4</div>
              <div style="font-size:1.08rem; font-weight:700; margin:0.25rem 0;"><em>${esc(l.latin)}</em></div>
              <div style="font-size:0.86rem; color:var(--ink-muted); margin-bottom:0.65rem;">Literal crib: ${esc(l.literal)}</div>
              <div>
                ${l.variants
                  .map(
                    (v, vIdx) => `
                  <button type="button" class="spark-option-btn ${picked === vIdx ? "correct" : ""}" data-hor-id="${esc(l.id)}" data-var-idx="${vIdx}">
                    <span style="font-family:var(--font-typewriter); font-size:0.73rem; color:var(--mimeo-purple);">[${esc(v.style)}]</span>
                    ${esc(v.text)}
                  </button>
                `
                  )
                  .join("")}
              </div>
              ${
                picked !== undefined
                  ? `<div style="margin-top:0.55rem; font-size:0.89rem; color:var(--fountain-blue); font-weight:600;">${esc(l.variants[picked].feedback)}</div>`
                  : ""
              }
            </div>
          `;
          })
          .join("")}
      `;

      container.querySelectorAll("[data-hor-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const hId = btn.getAttribute("data-hor-id");
          const vIdx = Number(btn.getAttribute("data-var-idx"));
          state.horaceChoices[hId] = vIdx;
          if (window.audenAudio) window.audenAudio.playStampThud();
          saveState();
          updateMastheadProgress();
          renderAssignments();
        });
      });
    } else if (state.activeWorkshop === "augustine") {
      const cases = window.AUDEN_ASSIGNMENTS.alibiCases;
      const solvedCount = Object.keys(state.alibiSolved).length;

      container.innerHTML = `
        <div class="horace-meter-bar">
          <div>
            <strong style="font-family:var(--font-typewriter); color:var(--forest-sage);">LAB C: ST. AUGUSTINE&rsquo;S CLINIC OF BAD-FAITH ALIBIS</strong>
            <p style="margin:0.2rem 0 0; font-size:0.9rem; color:var(--ink-secondary);">
              Characters constantly claim &ldquo;Fate, biology, or compassion forced my hand!&rdquo; Stamp all 5 dossiers with Auden&rsquo;s true existential diagnosis.
            </p>
          </div>
          <span class="stamp-mark" style="font-size:0.84rem;">${solvedCount} / ${cases.length} Diagnosed</span>
        </div>

        ${cases
          .map((c) => {
            const done = Boolean(state.alibiSolved[c.id]);
            const rightStamp = c.stamps.find((s) => s.correct);
            return `
            <div class="assignment-card">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
                <strong style="font-family:var(--font-typewriter); color:var(--mimeo-purple);">${esc(c.patient)}</strong>
                ${done ? `<span class="stamp-mark">${esc(rightStamp.label)}</span>` : ""}
              </div>
              <div class="dossier-quote-box" style="margin:0.65rem 0;">
                <em>Defendant&rsquo;s Plea:</em> ${esc(c.testimony)}
              </div>
              <div style="display:flex; flex-wrap:wrap; gap:0.55rem;">
                ${c.stamps
                  .map(
                    (s, sIdx) => `
                  <button type="button" class="filter-chip ${done && s.correct ? "active" : ""}" data-case-id="${esc(c.id)}" data-stamp-idx="${sIdx}">
                    Stamp: ${esc(s.label)}
                  </button>
                `
                  )
                  .join("")}
              </div>
              <div id="case-fb-${esc(c.id)}" style="margin-top:0.65rem; font-size:0.91rem; font-weight:600; color:var(--forest-sage);">
                ${done ? esc(rightStamp.note) : ""}
              </div>
            </div>
          `;
          })
          .join("")}
      `;

      container.querySelectorAll("[data-case-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const caseId = btn.getAttribute("data-case-id");
          const sIdx = Number(btn.getAttribute("data-stamp-idx"));
          const item = cases.find((x) => x.id === caseId);
          const stamp = item.stamps[sIdx];
          const fb = document.getElementById(`case-fb-${caseId}`);

          if (stamp.correct) {
            state.alibiSolved[caseId] = true;
            if (window.audenAudio) window.audenAudio.playStampThud();
            saveState();
            updateMastheadProgress();
            renderAssignments();
          } else {
            if (window.audenAudio) window.audenAudio.playChalkTick();
            if (fb) {
              fb.style.color = "var(--crimson-stamp)";
              fb.textContent = stamp.note;
            }
          }
        });
      });
    }
  }

  // =========================================================================
  // ROOM 6: THE "IMPOSSIBLE & INHUMANE" FINAL EXAM + DIPLOMA SYNTHESIZER
  // =========================================================================
  function renderFinalExam() {
    const modeTitle = document.getElementById("examModeTitle");
    const modeDesc = document.getElementById("examModeDesc");
    const toggleBtn = document.getElementById("toggleExamModeBtn");
    const scoreBadge = document.getElementById("examScoreBadge");
    const qContainer = document.getElementById("examQuestionsContainer");

    const questions = window.AUDEN_FINAL_EXAM.questions;
    const score = getExamCorrectCount();

    if (modeTitle) {
      modeTitle.textContent = state.humaneMode
        ? "CURRENT RULES: HUMANE SEMINAR EDITION (SOCRATIC HINTS ENABLED)"
        : "CURRENT RULES: 1941 UNABRIDGED 'INHUMANE' EDITION (NO HINTS • SINGLE-INK LOCK)";
    }
    if (modeDesc) {
      modeDesc.textContent = state.humaneMode
        ? "Includes whispered hints from Ross Macdonald’s smuggled notebook and allows learning retries."
        : "Authentic Jan. 1942 Student Protest conditions: zero hints and your first ink mark on each question is permanent!";
    }
    if (toggleBtn) {
      toggleBtn.textContent = state.humaneMode
        ? "Dare 1941 'Inhumane' Mode"
        : "Return to Humane Seminar Mode";
    }
    if (scoreBadge) {
      scoreBadge.textContent = `Blue Book Score: ${score} / ${questions.length}`;
    }

    if (qContainer) {
      qContainer.innerHTML = questions
        .map((q, qIdx) => {
          const chosen = state.examAnswers[q.id];
          const answered = chosen !== undefined;
          const isRight = chosen === q.answer;

          return `
          <div class="bluebook-sheet">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.4rem;">
              <span style="font-family:var(--font-typewriter); font-size:0.76rem; color:var(--mimeo-purple); font-weight:700;">
                QUESTION ${qIdx + 1} OF ${questions.length} &bull; ${esc(q.category.toUpperCase())}
              </span>
              ${
                answered
                  ? `<span class="stamp-mark" style="color:${isRight ? "var(--forest-sage)" : "var(--crimson-stamp)"}; border-color:${isRight ? "var(--forest-sage)" : "var(--crimson-stamp)"};">
                      ${isRight ? "FULL CREDIT ✓" : state.humaneMode ? "TRY AGAIN ↺" : "INK LOCKED ✗"}
                    </span>`
                  : ""
              }
            </div>
            <p style="font-size:1.03rem; font-weight:700; margin:0.45rem 0; max-width:65ch;">${esc(q.prompt)}</p>
            ${state.humaneMode ? `<div class="hint-ribbon">&sect; <strong>Back-Row Clue</strong> &mdash; ${esc(q.humaneHint)}</div>` : ""}
            <div>
              ${q.options
                .map((opt, oIdx) => {
                  let cls = "";
                  if (answered) {
                    if (oIdx === q.answer && (isRight || !state.humaneMode)) cls = "correct";
                    else if (oIdx === chosen && !isRight) cls = "wrong";
                  }
                  return `<button type="button" class="spark-option-btn ${cls}" data-exam-qid="${esc(q.id)}" data-exam-oidx="${oIdx}">${esc(opt)}</button>`;
                })
                .join("")}
            </div>
            ${
              answered && (isRight || !state.humaneMode)
                ? `<div style="margin-top:0.7rem; font-size:0.92rem; color:${isRight ? "var(--forest-sage)" : "var(--crimson-stamp)"}; font-weight:600;">
                    ${esc(q.explanation)}
                  </div>`
                : answered && !isRight && state.humaneMode
                  ? `<div style="margin-top:0.7rem; font-size:0.9rem; color:var(--crimson-stamp); font-weight:600;">
                      Not quite! Re-read Ross Macdonald&rsquo;s whispered hint above and select another Blue Book answer.
                    </div>`
                  : ""
            }
          </div>
        `;
        })
        .join("");

      qContainer.querySelectorAll("[data-exam-qid]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const qId = btn.getAttribute("data-exam-qid");
          const oIdx = Number(btn.getAttribute("data-exam-oidx"));
          if (!state.humaneMode && state.examAnswers[qId] !== undefined) return;

          state.examAnswers[qId] = oIdx;
          const qObj = questions.find((x) => x.id === qId);
          if (window.audenAudio) {
            if (oIdx === qObj.answer) window.audenAudio.playStampThud();
            else window.audenAudio.playChalkTick();
          }
          saveState();
          updateMastheadProgress();
          renderFinalExam();
          if (state.diplomaGenerated) renderDiplomaOutput();
        });
      });
    }

    populateSynthesisDropdowns();
    if (state.diplomaGenerated) renderDiplomaOutput();
  }

  function populateSynthesisDropdowns() {
    const opts = window.AUDEN_FINAL_EXAM.synthesisOptions;
    const map = [
      ["synClassicalSelect", opts.classical, "synClassical"],
      ["synPivotSelect", opts.pivot, "synPivot"],
      ["synOperaSelect", opts.opera, "synOpera"],
      ["synModernSelect", opts.modern, "synModern"]
    ];

    map.forEach(([elId, list, key]) => {
      const sel = document.getElementById(elId);
      if (!sel) return;
      sel.innerHTML = list
        .map((item) => `<option value="${esc(item.id)}" ${state[key] === item.id ? "selected" : ""}>${esc(item.label)}</option>`)
        .join("");
      sel.onchange = () => {
        state[key] = sel.value;
        saveState();
      };
    });

    const nameIn = document.getElementById("studentNameInput");
    const noteIn = document.getElementById("synPersonalNote");
    if (nameIn && nameIn.value !== state.studentName) nameIn.value = state.studentName;
    if (noteIn && noteIn.value !== state.synNote) noteIn.value = state.synNote;
  }

  function renderDiplomaOutput() {
    const out = document.getElementById("diplomaOutputContainer");
    if (!out) return;

    const opts = window.AUDEN_FINAL_EXAM.synthesisOptions;
    const c1 = opts.classical.find((x) => x.id === state.synClassical) || opts.classical[0];
    const c2 = opts.pivot.find((x) => x.id === state.synPivot) || opts.pivot[0];
    const c3 = opts.opera.find((x) => x.id === state.synOpera) || opts.opera[0];
    const c4 = opts.modern.find((x) => x.id === state.synModern) || opts.modern[0];

    const pages = getPagesConquered();
    const examScore = getExamCorrectCount();
    const sortedCount = Object.keys(state.chalkSorted).length;
    const victrolaCount = getVictrolaCompletedCount();
    const workshopsCount = getCompletedWorkshopsCount();

    let standing = "SEMINAR FELLOW IN GOOD STANDING (EXEMPT FROM SIX CANTOS OF MEMORY WORK)";
    if (examScore >= 7 && (pages >= 2000 || workshopsCount >= 2)) {
      standing = "SUMMA CUM LAUDE • HONORARY GUEST OF 1227 PONTIAC STREET";
    } else if (examScore >= 5 || workshopsCount >= 2 || victrolaCount >= 4) {
      standing = "MAGNA CUM LAUDE • KEEPER OF THE ANGELL HALL CHALK";
    }

    const scholarName = state.studentName.trim() || "Visiting Member of English 135";
    const userLine = state.synNote.trim();

    out.innerHTML = `
      <div class="diploma-card" id="printableDiploma">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:0.75rem; border-bottom:1px solid var(--rule-strong); padding-bottom:0.95rem;">
          <div>
            <div style="font-family:var(--font-typewriter); font-size:0.71rem; color:var(--accent-vermilion); letter-spacing:0.11em;">
              UNIVERSITY OF MICHIGAN &middot; DEPARTMENT OF ENGLISH &middot; JANUARY 1942
            </div>
            <h3 style="margin:0.25rem 0 0; font-size:1.55rem; letter-spacing:-0.02em; color:var(--ink-primary);">
              English 135 Examination Evaluation &amp; Seminar Certificate
            </h3>
          </div>
          <span class="stamp-mark" style="border-color:var(--accent-vermilion); color:var(--accent-vermilion);">
            AUDEN APPROVED &middot; 2 CREDITS
          </span>
        </div>

        <p style="margin:1rem 0 0.4rem; font-size:1.02rem; max-width:65ch;">
          <strong>Candidate:</strong> ${esc(scholarName)} &middot; <strong>Standing Awarded:</strong> <span style="color:var(--accent-vermilion); font-weight:700;">${esc(standing)}</span>
        </p>

        <p style="margin:0 0 1.25rem; font-family:var(--font-typewriter); font-size:0.75rem; color:var(--ink-muted);">
          Record of Inquiry: ${pages.toLocaleString()} Pages (${state.stampedWorks.length}/41 Works) &middot; ${sortedCount}/8 Chalk Figures &middot; ${victrolaCount}/9 Operas &middot; ${workshopsCount}/3 Studio Labs &middot; ${examScore}/8 Exam
        </p>

        <div class="dossier-auden-box">
          <strong style="font-family:var(--font-typewriter); font-size:0.72rem; letter-spacing:0.08em; color:var(--ink-primary);">
            PROFESSOR W. H. AUDEN&rsquo;S MARGINALIA ON YOUR THESIS:
          </strong>
          <p style="margin:0.55rem 0;">
            &ldquo;My dear ${esc(scholarName)}, your trajectory across twenty-four centuries hangs together with admirable nerve. By setting out from <strong>${esc(c1.label)}</strong>, you rightly recognize our starting condition in ${esc(c1.theme)}—where classical mortals first measured dignity against an unyielding cosmos. Yet your pivot to <strong>${esc(c2.label)}</strong> marks the decisive inward turn: ${esc(c2.theme)}, shifting tragedy forever from <em>&lsquo;had to be&rsquo;</em> into <em>&lsquo;might have been otherwise.&rsquo;</em>
          </p>
          <p style="margin:0.55rem 0;">
            Better still, you remembered that nobody sings by accident! Pairing <strong>${esc(c3.label)}</strong> (${esc(c3.theme)}) beside <strong>${esc(c4.label)}</strong> (${esc(c4.theme)}) exposes every modern bad-faith alibi—whether magic potion, bureaucratic static, or defiant harpoon.
            ${userLine ? `And I particularly underlined your closing epigram—<em>&lsquo;${esc(userLine)}&rsquo;</em>—which deserves a line of yellow chalk on the Angell Hall slate.` : `Keep your ears dry like Horace, your conscience candid like Augustine, and your heart as generous as Papageno and Leonore.`}
            Drop by 1227 Pontiac Street for tea before the train leaves Ann Arbor.&rdquo;
          </p>
          <div style="text-align:right; font-family:var(--font-serif); font-style:italic; font-weight:700; color:var(--ink-primary);">
            &mdash; Wystan H. Auden, Visiting Lecturer (Fall 1941)
          </div>
        </div>

        <div class="no-print" style="margin-top:1.15rem; display:flex; gap:0.65rem; flex-wrap:wrap;">
          <button type="button" class="btn-secondary" id="printDiplomaBtn">Print / Save 1941 Examination Certificate</button>
        </div>
      </div>
    `;

    const printBtn = document.getElementById("printDiplomaBtn");
    if (printBtn) {
      printBtn.addEventListener("click", () => window.print());
    }
  }

  // =========================================================================
  // GLOBAL EVENT WIRING & INITIALIZATION
  // =========================================================================
  function init() {
    // Sync audio state
    if (window.audenAudio) {
      window.audenAudio.setMuted(state.muted);
      window.audenAudio.setCrackle(state.crackle);
    }

    const muteBtn = document.getElementById("audioMuteBtn");
    const muteLabel = document.getElementById("audioMuteLabel");
    function refreshMuteUI() {
      if (muteBtn) {
        muteBtn.setAttribute("aria-pressed", String(state.muted));
        muteBtn.classList.toggle("active-toggle", state.muted);
      }
      if (muteLabel) muteLabel.textContent = state.muted ? "Audio: Muted" : "Audio: On";
    }
    refreshMuteUI();

    if (muteBtn) {
      muteBtn.addEventListener("click", () => {
        state.muted = !state.muted;
        if (window.audenAudio) window.audenAudio.setMuted(state.muted);
        saveState();
        refreshMuteUI();
      });
    }

    const askBtn = document.getElementById("askWystanBtn");
    if (askBtn) {
      askBtn.addEventListener("click", () => {
        state.aphorismIdx = (state.aphorismIdx + 1) % window.AUDEN_SEMINAR_LORE.aphorisms.length;
        if (window.audenAudio) window.audenAudio.playChalkTick();
        saveState();
        renderAphorism();
      });
    }

    // Room nav tabs & jump buttons
    document.querySelectorAll(".room-tab").forEach((tab) => {
      tab.addEventListener("click", () => switchRoom(tab.getAttribute("data-room")));
    });
    document.querySelectorAll("[data-goto-room]").forEach((btn) => {
      btn.addEventListener("click", () => switchRoom(btn.getAttribute("data-goto-room")));
    });

    // Syllabus filters & search
    document.querySelectorAll("#sectionFilterGroup .filter-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        syllabusFilterSec = chip.getAttribute("data-sec");
        syncSyllabusFilterButtons();
        renderSyllabusGrid();
      });
    });
    document.querySelectorAll("#sphereFilterGroup .filter-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        syllabusFilterSphere = chip.getAttribute("data-sphere");
        syncSyllabusFilterButtons();
        renderSyllabusGrid();
      });
    });

    const searchIn = document.getElementById("syllabusSearchInput");
    if (searchIn) {
      searchIn.addEventListener("input", () => {
        syllabusSearch = searchIn.value;
        renderSyllabusGrid();
      });
    }

    const unreadChip = document.getElementById("unreadOnlyChip");
    if (unreadChip) {
      unreadChip.addEventListener("click", () => {
        syllabusUnreadOnly = !syllabusUnreadOnly;
        unreadChip.classList.toggle("active", syllabusUnreadOnly);
        unreadChip.textContent = syllabusUnreadOnly ? "Showing Unstamped Only ✓" : "Show Unstamped Only";
        renderSyllabusGrid();
      });
    }

    const surpriseBtn = document.getElementById("surpriseWorkBtn");
    if (surpriseBtn) {
      surpriseBtn.addEventListener("click", () => {
        const unread = window.AUDEN_SYLLABUS.filter((w) => !state.stampedWorks.includes(w.id));
        const pool = unread.length > 0 ? unread : window.AUDEN_SYLLABUS;
        const pick = pool[Math.floor(Math.random() * pool.length)];
        if (pick) openWorkModal(pick.id);
      });
    }

    const resetBtn = document.getElementById("resetProgressBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        if (window.confirm("Clear all saved Blue Book stamps, chalk sorts, and exam answers to start fresh?")) {
          const keepRoom = state.activeRoom;
          state = defaultState();
          state.activeRoom = keepRoom;
          saveState();
          renderAll();
        }
      });
    }

    // Modal backdrop & Escape key
    const modalBackdrop = document.getElementById("workModalBackdrop");
    if (modalBackdrop) {
      modalBackdrop.addEventListener("click", (e) => {
        if (e.target === modalBackdrop) closeWorkModal();
      });
    }
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && currentModalWorkId) closeWorkModal();
    });

    // Blackboard smuggled notes & sorter
    const smuggledBtn = document.getElementById("toggleSmuggledNotesBtn");
    if (smuggledBtn) {
      smuggledBtn.addEventListener("click", () => {
        state.smuggledOpen = !state.smuggledOpen;
        if (window.audenAudio) window.audenAudio.playChalkTick();
        saveState();
        renderSmuggledNotes();
      });
    }
    bindChalkBucketClicks();

    // Victrola controls
    const playBtn = document.getElementById("playRecordBtn");
    const stopBtn = document.getElementById("stopRecordBtn");
    const crackleBox = document.getElementById("crackleToggleCheckbox");
    if (crackleBox) {
      crackleBox.checked = state.crackle;
      crackleBox.addEventListener("change", () => {
        state.crackle = crackleBox.checked;
        if (window.audenAudio) window.audenAudio.setCrackle(state.crackle);
        saveState();
      });
    }

    if (playBtn) {
      playBtn.addEventListener("click", () => {
        const rec = getActiveRecord();
        if (!state.recordsSpun.includes(rec.id)) {
          state.recordsSpun.push(rec.id);
          saveState();
          updateMastheadProgress();
          renderVictrola();
        }
        updateTurntableVisuals(true, 0, rec.motifNotes.length);
        window.audenAudio.playRecord(rec, {
          onStep: (idx, total) => updateTurntableVisuals(true, idx, total),
          onEnd: () => updateTurntableVisuals(false, 0, rec.motifNotes.length)
        });
      });
    }
    if (stopBtn) {
      stopBtn.addEventListener("click", () => {
        if (window.audenAudio) window.audenAudio.stop();
        updateTurntableVisuals(false, 0, getActiveRecord().motifNotes.length);
      });
    }

    // Workshop subtabs
    document.querySelectorAll(".workshop-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.activeWorkshop = btn.getAttribute("data-workshop");
        if (window.audenAudio) window.audenAudio.playChalkTick();
        saveState();
        renderAssignments();
      });
    });

    // Exam controls & Diploma generator
    const toggleExamBtn = document.getElementById("toggleExamModeBtn");
    if (toggleExamBtn) {
      toggleExamBtn.addEventListener("click", () => {
        state.humaneMode = !state.humaneMode;
        if (window.audenAudio) window.audenAudio.playChalkTick();
        saveState();
        renderFinalExam();
      });
    }

    const clearExamBtn = document.getElementById("clearExamSheetBtn");
    if (clearExamBtn) {
      clearExamBtn.addEventListener("click", () => {
        state.examAnswers = {};
        if (window.audenAudio) window.audenAudio.playChalkTick();
        saveState();
        updateMastheadProgress();
        renderFinalExam();
      });
    }

    const nameIn = document.getElementById("studentNameInput");
    const noteIn = document.getElementById("synPersonalNote");
    if (nameIn) {
      nameIn.addEventListener("input", () => {
        state.studentName = nameIn.value;
        saveState();
      });
    }
    if (noteIn) {
      noteIn.addEventListener("input", () => {
        state.synNote = noteIn.value;
        saveState();
      });
    }

    const dipBtn = document.getElementById("generateDiplomaBtn");
    if (dipBtn) {
      dipBtn.addEventListener("click", () => {
        state.diplomaGenerated = true;
        if (window.audenAudio) window.audenAudio.playStampThud();
        saveState();
        updateMastheadProgress();
        renderDiplomaOutput();
        const card = document.getElementById("printableDiploma");
        if (card) card.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }

    renderAll();
    if (state.activeRoom && state.activeRoom !== "welcome") {
      switchRoom(state.activeRoom);
    }
    startOscilloscopeLoop();
  }

  function renderAll() {
    renderAphorism();
    renderWelcomeArc();
    renderSyllabusGrid();
    renderSmuggledNotes();
    renderBlackboard();
    renderChalkSorter();
    renderVictrola();
    renderAssignments();
    renderFinalExam();
    updateMastheadProgress();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
