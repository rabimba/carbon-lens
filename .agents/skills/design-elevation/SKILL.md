---
name: design-elevation
description: >-
  Automatically applies Design Director-level critique, visual systems thinking,
  and multi-pass aesthetic refinement to any visual output—including HTML pages,
  interactive apps, dashboards, presentations, reports, spreadsheets, and PDFs.
  Activate whenever creating, styling, or refining any user-facing visual artifact
  so outputs look hand-crafted across multiple rounds of professional design direction
  rather than generic first-draft templates.
---

# Design Elevation Skill

Transform functional first-draft visual outputs into work that looks art-directed across multiple rounds of senior design critique. Never ship default LLM layout habits ("card soup", arbitrary pill badges, muddy drop shadows, purple-indigo SaaS clichés, uniform 3-up grids, or timid typographic hierarchy).

## Core Operating Contract

1. **Silent Excellence by Default**: Execute the full design interrogation and elevation process internally. Present **only the finished, refined artifact** to the user unless they explicitly ask to see the design rationale, critique log, or before/after thinking.
2. **Never Ship Pass 1**: Treat your initial layout instinct as a wireframe scaffold, not a deliverable. Every visual output must pass through the structured **Elevation Protocol** before delivery.
3. **Interrogate Every Token**: Every typeface pairing, font size ratio, line measure, color value, border opacity, spacing increment, and motion curve must earn its keep functionally and aesthetically.
4. **Restraint Over Decoration**: Sophistication comes from subtraction, proportion, alignment, and material honesty—not adding extra gradients, icons, glow effects, or decorative borders.

## Mandatory Reference Consultation Workflow

Before writing or finalizing CSS, layout markup, slide geometry, or chart styling, consult the five reference manuals in `./references/` in this exact sequence:

1. **Ground Your Posture** — Read [design-philosophy.md](./references/design-philosophy.md) to internalize core tensions (bold point-of-view vs. quiet restraint, structural honesty vs. decorative noise) and eliminate "AI-generated template" tells.
2. **Anchor to Exemplars** — Read [reference-library.md](./references/reference-library.md) to select 1–2 primary design lineages suited to the artifact's domain (e.g., *Swiss International Grid + Archival Monograph* for editorial/scholarly work; *Linear + Dieter Rams Braun* for precision instruments; *Stripe + Financial Times* for data/econometric dashboards; *Apple Editorial* for product storytelling).
3. **Execute the Multi-Pass Refinement Loop** — Follow [elevation-protocol.md](./references/elevation-protocol.md) from Pass 0 (Archetype Lock) through Pass 4 (Subtractive Edit — removing ~30% of visual chrome while sharpening hierarchy).
4. **Deploy Specific Craft Moves** — Pull concrete implementation patterns from [technique-catalog.md](./references/technique-catalog.md) for optical typography, tonal surface layering, asymmetric tension, hairline keyline grids, and data-ink clarity.
5. **Pass the Pre-Delivery Gate** — Audit the finished output against [design-interrogation-checklist.md](./references/design-interrogation-checklist.md). If *any* red-flag check fails, fix it in code before completing the task.

## Validation Before Delivery

- Verify visual rhythm at multiple viewport widths (`1440px`, `1024px`, `390px`) or page/slide aspect ratios—no cramped text against container edges, orphaned wrapping, or broken grid tracks.
- Confirm tabular numerals (`font-variant-numeric: tabular-nums`) on all metrics, counters, timestamps, and tables, and cap prose reading widths at `55ch–70ch`.
- Ensure WCAG AA contrast (`>= 4.5:1` body text, `>= 3:1` UI graphics) without relying on harsh pure `#000000` on `#FFFFFF` unless intentionally channeling brutalist Swiss print.
