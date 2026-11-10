# Technique Catalog: Concrete Visual Moves by Goal

Replace generic defaults with intentional, surgical CSS and layout techniques. Choose moves based on the exact visual problem you need to solve.

---

## 1. Establishing Instant Typographic Authority

- **Extreme Scale Polarity (`4:1` Ratio):** Pair tightly tracked display titles (`font-size: clamp(2rem, 3.4vw, 3.1rem); letter-spacing: -0.028em; line-height: 1.08`) directly with micro-tracked uppercase eyebrows (`font-size: 0.69rem; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 600`). Avoid lukewarm middle sizes (`19px–22px`) that blur hierarchy.
- **Serif / Mono Tension:** In scholarly, editorial, or analytical apps, pair a high-character serif for titles & primary quotes with a crisp technical monospace for catalog numbers, page counts, coordinates, citations, and timestamps.
- **Optical Measure & Hanging Punctuation:** Constrain long-form prose to `max-width: 64ch`. On pull-quotes, indent or use a crisp `2px` vertical ink bar (`border-left: 2px solid var(--accent); padding-left: 1.25rem`) rather than oversized cartoon quotation-mark icons.
- **Tabular & Oldstyle Numerals:** Apply `font-variant-numeric: tabular-nums` to all tables, counters, meters, and timers so digits never jitter horizontally; use `oldstyle-nums` inside literary prose paragraphs.

---

## 2. Replacing "Card Soup" with Architectural Structure

- **The Hairline Ledger Grid (`1px` Shared Keylines):** Instead of 12 separate cards with `border-radius: 12px` and drop shadows, use a unified container with `display: grid; gap: 1px; background: var(--border-hairline); border: 1px solid var(--border-hairline)` where each child cell has `background: var(--surface)`. Result: crisp Swiss/Stripe architectural precision with zero double-borders.
- **Editorial Row Dividers:** For lists of 6+ items (syllabi, leads, transactions, catalogs), use borderless horizontal rows separated only by `1px solid var(--rule-subtle)` with subtle hover tonal shift—increasing scan speed by 2x over boxy grids.
- **Sticky Split Master-Detail Stage:** Pair a scrollable index/catalog on the left (`minmax(320px, 42%)`) with a sticky, deeply art-directed inspection folio on the right (`position: sticky; top: 1.5rem`) so users never lose context in jarring modal popups.
- **Concentric Corner Math:** Whenever one rounded element sits inside another with padding `P`, enforce `radius_inner = max(4px, radius_outer - P)`. Better yet, in archival/Swiss layouts, use crisp `2px–4px` micro-radii rather than bubbly `16px` pills.

---

## 3. Tonal Surface Depth (Without Muddy Shadows)

- **3-Step Chromatic Paper / Slate Ladder:** Define three background steps separated by `3–5%` lightness + consistent hue warmth:
  - *Light Archival:* `--paper-base: #f5f1e8` -> `--paper-elevated: #fbf9f4` -> `--paper-recessed: #ebe4d6`.
  - *Dark Instrument:* `--slate-base: #0b0d12` -> `--slate-panel: #12161f` -> `--slate-elevated: #191f2b`.
- **Directional Top-Edge Highlight:** On dark or physical instrument panels (turntables, chalkboards, control docks), add `box-shadow: inset 0 1px 0 rgba(255,255,255,0.07), 0 10px 30px -10px rgba(0,0,0,0.35)` to simulate overhead studio lighting.
- **Subtle SVG Grain / Paper Tooth (Restrained `0.025` Opacity):** In print/archival themes, an ultra-faint inline SVG fractalNoise overlay (`opacity: 0.025; pointer-events: none`) eliminates sterile digital flatness—keep it barely perceptible, never grungy.

---

## 4. Restraint & Signal-to-Noise Purification

- **Monochrome Metadata, Single-Hue Action:** Render 90% of tags, filters, and counts in quiet neutral ink (`color: var(--ink-muted); border: 1px solid var(--rule-subtle)`). Reserve your primary accent color strictly for active selection, primary CTAs, or critical highlights (like a crimson editorial slash).
- **Segmented Control Over Button Row:** Replace rows of 4–6 floating buttons with a single recessed track (`padding: 3px; background: var(--surface-recessed); border: 1px solid var(--rule)`) housing flush toggle segments where the active state lifts cleanly onto `--surface-elevated`.
- **Inline Sparkbars Over Heavy Charts:** When comparing quantities across rows (e.g., 720 pages vs. 90 pages), embed a `3px`-tall inline proportional bar directly beneath the numeral instead of spawning heavyweight chart chrome.

---

## 5. Choreographed Micro-Motion & Tactility

- **Fast, Snappy Physics Curves:** Use `140ms–220ms cubic-bezier(0.22, 1, 0.36, 1)` for UI state shifts—never sluggish `500ms ease-in-out` fades.
- **Purposeful Domain Motion:** Reserve longer animations (`400ms–700ms`) exclusively for meaningful domain metaphors: a red grease-pencil `stroke-dashoffset` strike across counterfeit prose, chalk drawing a dialectical arc on slate, or a brass Victrola tonearm pivoting onto spinning shellac grooves.
- **Respect `prefers-reduced-motion`:** Always wrap decorative continuous motion in `@media (prefers-reduced-motion: reduce)` fallbacks.
