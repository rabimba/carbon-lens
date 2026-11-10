# Design Interrogation Checklist (Pre-Delivery Gate)

Interrogate the output against every question below before delivering. Any **"No"** requires a targeted refinement pass in code—never ship with known first-draft compromises.

---

## I. Anti-Template & First-Impression Test
- [ ] **The 2-Second Squint Test:** If you squint at the screen, is there a single unmistakable focal point and clear macro-hierarchy rather than a uniform grid of equal-sized rectangles?
- [ ] **Zero "AI Slop" Signatures:** Are default indigo/violet gradients, glowing neon borders, emoji-stuffed tab bars, and generic 3-card feature rows completely absent?
- [ ] **Domain Authenticity:** Could a viewer immediately guess the era, discipline, or mood of the subject matter from typography, palette, and layout structure alone—even if the words were blurred?
- [ ] **No Triple-Nested Boxes:** Have you eliminated boxes-inside-boxes-inside-boxes in favor of open whitespace and `1px` hairline dividers?

## II. Typography & Reading Ergonomics
- [ ] **Intentional Scale Contrast:** Is the display headline at least `2.4x–3.5x` the body size with tightened tracking (`-0.02em` to `-0.035em`), and are metadata/eyebrows crisp, tracked-out (`+0.08em` to `+0.12em`), and subordinate?
- [ ] **Controlled Line Measure:** Is every continuous prose passage constrained between `55ch` and `70ch` (never stretching `900px+` across a wide monitor)?
- [ ] **Balanced Headings & Clean Rags:** Is `text-wrap: balance` applied to multi-line titles and `text-wrap: pretty` to prose paragraphs?
- [ ] **Numeral Discipline:** Are all numbers in tables, tallies, durations, page counts, and gauges set in `font-variant-numeric: tabular-nums`?

## III. Grid, Alignment & Spacing
- [ ] **Continuous Plumb Lines:** Do left edges of headers, navigation rails, content columns, and tables lock onto shared vertical alignment axes rather than drifting by `4px–12px` from section to section?
- [ ] **Breathing Room vs. Grouping:** Is spacing between distinct sections at least `2.5x–4x` larger than spacing within a group (clear Gestalt proximity)?
- [ ] **Concentric Radii:** Wherever rounded corners nest, are inner radii mathematically smaller than outer radii (`R_inner = R_outer - padding`), or intentionally crisp (`2px–4px`) for editorial sharpness?

## IV. Color, Contrast & Surface Materiality
- [ ] **Accent Scarcity (< 8% Rule):** Is your strongest accent hue reserved strictly for primary actions, active states, and genuine focal signals rather than splashed across every header and badge?
- [ ] **Tonal Surface Hierarchy:** Are surface elevations communicated through calibrated lightness steps + crisp `1px` rules rather than heavy, blurry gray drop-shadows?
- [ ] **Accessible Contrast:** Do body text (`>= 4.5:1`), muted captions (`>= 3.5:1`), and interactive borders remain effortlessly legible?

## V. Interactive Polish & Restraint
- [ ] **Badge Diet Passed:** Have multi-colored pill badges been pared back to monochrome typographic metadata except where live state truly demands a badge?
- [ ] **Tactile Controls:** Do buttons, tabs, sliders, and interactive canvases have refined `:hover`, `:active`, and `:focus-visible` states with crisp `120ms–200ms` easing?
- [ ] **Responsive Integrity:** Does the layout hold its composure from wide desktop (`1440px+`) down to split-pane / tablet widths (`680px–960px`—critical for side-by-side comparison viewports!) without clipped controls or collided labels?
