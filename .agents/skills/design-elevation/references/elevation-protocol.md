# Elevation Protocol: 5-Pass Design Director Refinement Loop

Never style and ship in a single undifferentiated pass. Run every visual output through these five deliberate passes—either when building from scratch or when elevating an existing functional build.

---

## Pass 0: Domain & Archetype Lock (Before Touching CSS)
Ask three grounding questions:
1. **What physical or cultural artifact is this at its best?** (e.g., a 1941 Penguin/Faber literary folio & Angell Hall seminar table; a Braun/Linear telemetry console; a Financial Times econometric broadsheet).
2. **What is the single hero experience on each screen?** Every view gets **one** undisputed protagonist (`60–70%` visual weight) and a quiet supporting apparatus.
3. **Which two reference lineages govern the rules?** Pick from [reference-library.md](./reference-library.md) and forbid styles outside those lineages.

---

## Pass 1: Structural Grid & Spatial Compression
1. Establish a strict container rhythm and persistent vertical alignment axes—elements across header, navigation, filter bar, and content stage must snap to shared left/right column guides.
2. Replace generic multi-card grids with the right structural form for the content:
   - **Catalog / Syllabus / Feed (10+ items):** Crisp hairline ledger rows or master-detail split folio, not bloated cards.
   - **Side-by-Side Comparison / Critique:** Balanced two-column broadsheet folio divided by a single vertical rule (`1px solid var(--rule)`) with synchronized baselines.
   - **Interactive Instrument (Audio / Canvas / Graph):** Recessed dark architectural bay paired with a calibrated control strip.
3. Enforce a strict 8-point / modular spacing scale (`4, 8, 12, 16, 24, 32, 48, 64, 96px`)—eliminate arbitrary random gaps.

---

## Pass 2: Typographic Voice, Scale & Optical Rhythm
1. Assign **exact roles** to at most 2–3 font stacks (e.g., `--font-display` literary serif, `--font-sans` clean UI grotesque, `--font-mono` tabular catalog/technical specs).
2. Widen scale contrast: give primary headlines real presence and tight tracking (`-0.025em` to `-0.035em`), tighten line-height on display type (`1.06–1.15`), and loosen line-height on reading prose (`1.6–1.7`).
3. Audit every text block's line length: clamp prose paragraphs to `58ch–68ch`, prevent awkward 1-word orphans in headings (`text-wrap: balance`), and enable `tabular-nums` on every numeral column, counter, and dial.

---

## Pass 3: Chromatic Calibration & Material Restraint
1. Build a disciplined **custom property token system**:
   - 3 surface steps (base, elevated, recessed)
   - 3 ink steps (primary high-contrast, secondary reading, muted metadata)
   - 2 hairline rule strengths (`--rule-subtle` at `8–12%` ink alpha, `--rule-strong` at `20–28%` ink alpha)
   - **1 primary accent** + at most **1 semantic contrast accent** (used on `< 8%` of screen area).
2. Purge muddiness: replace murky gray drop-shadows and multi-stop decorative gradients with crisp tonal contrast and `1px` structural borders.

---

## Pass 4: The Subtractive Edit (Kill 30% of Visual Noise)
Scan the rendered layout like a ruthless magazine art director and cut:
- **Border-inside-border nesting:** Never put a bordered card inside a bordered panel inside a bordered page container. Flatten at least one layer.
- **Pill badge proliferation:** Convert decorative colored pills into clean monochrome typographic metadata separated by middle-dots (`1941 · 720 pp. · Moral Possibility`).
- **Redundant labels & helper copy:** If a search input says `Search 35 syllabus works, authors, or themes…`, delete the redundant `"SEARCH SYLLABUS"` label above it.
- **Emoji confetti in professional UI:** Replace casual emojis (`📚`, `🎵`, `✨`, `🔥`) in navigation and headers with Roman numerals (`I–V`), section glyphs (`§`), typographic ornaments, or crisp inline geometric SVG strokes.

---

## Pass 5: Tactile Craft & Final Interrogation
1. Polish interactive states (`:hover`, `:focus-visible`, `:active`, `.is-selected`) so every clickable element gives crisp, immediate feedback.
2. Check empty states, active drawers, and responsive breakpoints (`1440px`, `1024px`, `768px`) to confirm zero horizontal overflow or crushed columns.
3. Run the complete [design-interrogation-checklist.md](./design-interrogation-checklist.md) before signing off.
