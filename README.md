# Carbon Lens — Jagged AGI Head-to-Head Observatory

Empirical replications of Ethan Mollick's [*"Fable 5.2 and Jagged AGI"*](https://www.oneusefulthing.org/p/fable-52-and-jagged-agi) (*One Useful Thing*, Nov 2026), pitting **True Blind 1-Shot Baselines** (isolated subagents given *only* Mollick's raw prompt with zero steering) head-to-head against **Anti-Jagged Multi-Agent Twists** engineered to conquer Fable 5.2's exact structural failure modes.

All **45,080 lines** of code, WebGL2 shaders, 3D continuum physics, WebAudio synthesizers, archival corpora, and municipal pipelines run with **zero external runtime dependencies** directly on GitHub Pages or any static server.

## Live Entry Points (GitHub Pages & Local)

| Experience | Direct Relative Link | Description |
| :--- | :--- | :--- |
| **Carbon Lens Observatory Hub** | [`./index.html`](./index.html) | Split-Screen 50/50 Arena, Randomized **Blind Taste Test Mode**, and **Jaggedness X-Ray & Forensic Audit** across all experiments |
| **01 · Endless 3D Portals — Baseline (`Aetheria`)** | [`./experiments/portals/baseline/`](./experiments/portals/baseline/) | 6-DOF Newtonian & General-Relativistic WebGL2 HDR raymarcher (`Click` / `Space` to launch ray-sliced Verlet probes) |
| **01 · Endless 3D Portals — Twist (`Deregulation Multiverse`)** | [`./experiments/portals/twist/`](./experiments/portals/twist/) | 2-bounce FBO portals across 6 realms with Continuum & Rigid-Body Physics (`Click` / `F` to fire spheres), 4-axis Escher gravity walk (`G`), 480w Constitution, Jaccard `<= 0.06` Novelty Ledger (`T`), and **`[B]` 204-Section Bureaucracy Mode** with hinged 2x4 plywood billboards |
| **02 · Auden 1941 Seminar — Baseline (`Angell Hall Folio`)** | [`./experiments/auden/baseline/`](./experiments/auden/baseline/) | Design-elevated 6-room Ann Arbor folio covering 41 syllabus works, Ross Macdonald's smuggled notes, 9 synthesized operas, and workshops |
| **02 · Auden 1941 Seminar — Twist (`Spot the Counterfeit Critic`)** | [`./experiments/auden/twist/`](./experiments/auden/twist/) | Swiss/Penguin monograph studio with 35-work hairline index, recessed slate dualism boards, dark ebonite 78-RPM prosody lab, and 10 length-matched (`5A/5B`) *Spot the Counterfeit Critic* broadsheet galley duels |
| **03 · \$20k / 20-Min Venture — Baseline (`CiteSignal`)** | [`./experiments/entrepreneur/baseline/`](./experiments/entrepreneur/baseline/) | Unguided 1-shot municipal boiler/elevator compliance feed business (46 files, SQLite pipeline, 7 unit tests, Monte Carlo model) |
| **03 · \$20k / 20-Min Venture — Twist (`CivicSignal V2`)** | [`./experiments/entrepreneur/twist/`](./experiments/entrepreneur/twist/) | 20 web-verified FY25–26 U.S. municipal CIP leads (\$54.65M across 13 states) + Python span-verifier (`pipeline.py`) + 4-Persona Hostile Red-Team Arena + Air-Gapped 17.5-Min/Mo Founder Cockpit |

## Blog Post, Animated GIFs & 20s Social Reel

- **Live Blog Post (`rkrants.blogspot.com`)**: [Testing Gemini Carbon on "Jagged AGI": 3D Portal Physics, W.H. Auden, and a \$20k Autonomous Business](https://rkrants.blogspot.com/2026/11/testing-gemini-carbon-on-agi.html)
- **[`blog/rkrants-gemini-carbon-jagged-agi.html`](./blog/rkrants-gemini-carbon-jagged-agi.html)**: Source Blogger HTML essay audited with [`clarity.addy.ie`](https://clarity.addy.ie/) (`0/100` surface AI pattern score).
- **[`blog/media/`](./blog/media/)**: Recorded walkthrough GIFs (`01`–`05`) plus 19.2-second vertical `1080x1920` Instagram/TikTok Reels ([`instagram-reel-gemini-4-carbon.mp4`](./blog/media/instagram-reel-gemini-4-carbon.mp4) with narration + [`instagram-reel-gemini-4-carbon-dub-ready.mp4`](./blog/media/instagram-reel-gemini-4-carbon-dub-ready.mp4) backing-only teleprompter edition).

## Included Workspace Skill

- **[`design-elevation`](./.agents/skills/design-elevation/SKILL.md)**: Reusable Design Director skill with five reference manuals ([Design Philosophy](./.agents/skills/design-elevation/references/design-philosophy.md), [Reference Library](./.agents/skills/design-elevation/references/reference-library.md), [Technique Catalog](./.agents/skills/design-elevation/references/technique-catalog.md), [Elevation Protocol](./.agents/skills/design-elevation/references/elevation-protocol.md), and [Design Interrogation Checklist](./.agents/skills/design-elevation/references/design-interrogation-checklist.md)).

## Local Development

No `npm install` or external packages required (Python 3 standard library only):

```bash
python3 server.py --port 8420
```

Then open **http://127.0.0.1:8420**.
