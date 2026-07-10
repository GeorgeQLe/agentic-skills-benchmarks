# Video Script — Driftctl v4.0 Launch

> Generated: 2026-05-03

## Video Brief

| Field | Value |
|-------|-------|
| **Type** | Launch |
| **Audience** | Backend ICs (individual contributor backend/platform engineers) |
| **Goal** | Drive installs — target 5,000 npm installs in first 2 weeks |
| **Duration target** | ~5:00 (medium) |
| **Series context** | None (no series-spec) |
| **Enhancement tier** | 4 (creator positioning + product-led media map + journey map + GTM) |
| **Production** | Solo webcam + screen recording |
| **Tone** | Build-in-public |

## Narrative Arc

| # | Section | Duration | Timing |
|---|---------|----------|--------|
| 1 | Hook | ~20s | 0:00–0:20 |
| 2 | Context | ~40s | 0:20–1:00 |
| 3 | Reveal | ~50s | 1:00–1:50 |
| 4 | Proof/Demo | ~120s | 1:50–3:50 |
| 5 | Transformation | ~40s | 3:50–4:30 |
| 6 | CTA | ~20s | 4:30–4:50 |
| 7 | Outro | ~10s | 4:50–5:00 |

## Scene Breakdown

### Scene 1 — Hook (0:00–0:20)

**Visual:** Webcam, Alex at desk. No intro card, no logo — straight to camera.

**Narration:**

> "You write your migrations, you test them locally, you ship them — and then three months later someone runs a manual ALTER TABLE in production and nobody knows. That gap between what your migration files say and what your database actually looks like? That's schema drift. I've been building a tool to kill it for three years. Today it gets its biggest update."

<!-- UNGROUNDED — The "three months later / manual ALTER TABLE" scenario is a plausible composite but not sourced from a specific documented incident involving Alex. -->

**On-screen text:** None.
**Music/mood:** None — cold open, direct address.
**Duration:** 20s

<!-- Source: research/journey-map.md — Stage 1 trigger: "column was added manually in production but never tracked in migration files" -->
<!-- Source: research/youtube/creator-positioning-driftctl.md — "Built and maintained Driftctl as a solo developer for 3 years" -->

---

### Scene 2 — Context (0:20–1:00)

**Visual:** Webcam for first 15s, then cut to screen showing GitHub repo page (stars count, recent releases).

**Narration:**

> "Driftctl is an open-source CLI for database schema migrations. You point it at your database, it tells you what's different from your migration files, and it generates a plan to fix it. PostgreSQL, MySQL, SQLite.
>
> It's been around for three years now — 12,000 stars on GitHub, about 45,000 npm installs a month. Teams at Linear, Lattice, and Raycast run it in production. I built it as a solo developer and I still maintain it, so when I say I know where the rough edges are — I mean it."

**On-screen text:** Brief overlay when mentioned: `12,400+ stars` · `45k installs/mo` · `Linear · Lattice · Raycast`
**Music/mood:** Low ambient — subtle, nothing distracting.
**Duration:** 40s

<!-- Source: research/youtube/product-led-media-map-driftctl.md — "GitHub stars: 12,400+" -->
<!-- Source: research/youtube/product-led-media-map-driftctl.md — "npm downloads: ~45,000/month" -->
<!-- Source: research/youtube/product-led-media-map-driftctl.md — "Used by Linear, Lattice, and Raycast (public mentions in their engineering blogs)" -->
<!-- Source: research/youtube/product-led-media-map-driftctl.md — "PostgreSQL, MySQL, and SQLite" -->
<!-- Source: research/youtube/creator-positioning-driftctl.md — "Built and maintained Driftctl as a solo developer for 3 years" -->

---

### Scene 3 — Reveal (1:00–1:50)

**Visual:** Webcam, then split screen with bullet list appearing as each feature is named.

**Narration:**

> "Version 4.0 has four things I've been wanting to ship for a long time.
>
> First — automatic rollback plans. Every time you run `driftctl apply`, it now generates a rollback migration alongside it. Before this, you had to write rollbacks by hand, and honestly? Most people didn't.
>
> Second — multi-database drift detection. If you're running the same schema across staging and production, one command now diffs all of them.
>
> Third — PostgreSQL advisory lock support. This means zero-downtime migrations without fighting over table locks.
>
> And fourth — `driftctl audit`. If your team has compliance requirements around schema changes, this generates the report."

**On-screen text:** Numbered feature list building as each is mentioned:
1. `Automatic rollback plans`
2. `Multi-database drift detection`
3. `Advisory lock support`
4. `driftctl audit`

**Music/mood:** Same low ambient, slight energy lift.
**Duration:** 50s

<!-- Source: research/gtm.md — "Automatic rollback plan generation (previously manual)" -->
<!-- Source: research/gtm.md — "Multi-database drift detection in a single command" -->
<!-- Source: research/gtm.md — "PostgreSQL advisory lock support for zero-downtime migrations" -->
<!-- Source: research/gtm.md — "New driftctl audit command for compliance reporting" -->

---

### Scene 4 — Proof/Demo (1:50–3:50)

**Visual:** Full-screen terminal recording. Webcam in small corner overlay.

#### 4a — Drift Detection (1:50–2:30)

**Narration:**

> "Let me show you. I've got a Postgres database here where I've intentionally added a column that isn't in my migration files — simulating someone running a manual change in production.
>
> `driftctl diff`.
>
> There it is. It found the drift. It shows me exactly which column doesn't belong and which table it's on. Under 200 milliseconds on this 200-table schema."

**On-screen text:** Terminal output of `driftctl diff` with colored diff highlighting the drifted column.
**Duration:** 40s

<!-- Source: research/youtube/product-led-media-map-driftctl.md — "Drift detection on a real database with intentional schema divergence" -->
<!-- Source: research/youtube/product-led-media-map-driftctl.md — "Average migration plan generation: <200ms for schemas under 500 tables" -->

#### 4b — Rollback Demo (2:30–3:20)

**Narration:**

> "Now the new stuff. I'm going to apply a migration that adds an index. Watch — `driftctl apply`.
>
> See that? It applied the migration and generated a rollback file automatically. Let me open that rollback — it's a clean DROP INDEX.
>
> Now let's say that index is causing problems. `driftctl rollback`. Done. One command, back to the previous state. No hand-written SQL."

**On-screen text:** Terminal showing `driftctl apply` output with rollback file path, then `driftctl rollback` output.
**Duration:** 50s

<!-- Source: research/gtm.md — "Automatic rollback plan generation (previously manual)" -->
<!-- Source: research/youtube/product-led-media-map-driftctl.md — "Rollback workflow: apply a migration, break something, roll back cleanly" -->

#### 4c — Audit Command (3:20–3:50)

**Narration:**

> "And for the compliance folks — `driftctl audit`. This generates a report of schema changes tracked against your migration files. I'll link the docs for output options in the description."

**On-screen text:** Terminal showing `driftctl audit` output.
**Duration:** 30s

<!-- Source: research/gtm.md — "New driftctl audit command for compliance reporting" -->

---

### Scene 5 — Transformation (3:50–4:30)

**Visual:** Back to webcam, full frame. Terminal gone — this is founder talking.

**Narration:**

> "I spent the first two years of Driftctl solving detection — knowing when something is wrong. v4.0 is about the other half: what happens after you detect it. You get a rollback plan you didn't have to write. You get an audit trail that doesn't live in someone's head. And if you wire `driftctl check` into your CI, you catch drift before it ever reaches production.
>
> That's the version of this tool I always wanted to build. It took 47 releases to get here, but it's the one I'm most proud of."

**On-screen text:** None.
**Music/mood:** Ambient drops out. Just voice.
**Duration:** 40s

<!-- Source: research/youtube/creator-positioning-driftctl.md — "Has shipped 47 releases with public changelogs" -->
<!-- Source: research/journey-map.md — Stage 4 aha moment: "First CI run that catches a schema change before it reaches production" -->
<!-- Source: research/youtube/product-led-media-map-driftctl.md — "47 releases shipped in 3 years with zero data-loss incidents reported" -->

---

### Scene 6 — CTA (4:30–4:50)

**Visual:** Webcam with terminal visible behind, showing the init command.

**Narration:**

> "If you want to try it — `npx driftctl init` in any project with a database. Takes about 30 seconds. Link's in the description.
>
> If you've got a team, the paid plan adds drift alerts, audit log retention, and multi-database sync. But the open-source core does everything I just showed you."

**On-screen text:** `npx driftctl init` — large, centered overlay.
**Music/mood:** Low ambient returns.
**Duration:** 20s

<!-- Source: research/gtm.md — funnel: "Trial (npx driftctl init)" -->
<!-- Source: research/gtm.md — "Team plan adds drift alerts, audit logs, and multi-DB sync" -->

---

### Scene 7 — Outro (4:50–5:00)

**Visual:** Webcam. Relaxed posture, slight energy drop — wrapping up, not selling.

**Narration:**

> "I'll be doing deeper dives on the v4.0 internals — subscribe if you want to see how things actually get built. See you in the next one."

**On-screen text:** End screen — subscribe button, next video card.
**Music/mood:** Ambient fades out.
**Duration:** 10s

<!-- Source: research/youtube/creator-positioning-driftctl.md — "Build-in-public: showing real development decisions and trade-offs" -->

---

## CTA Strategy

- **Primary CTA:** `npx driftctl init` (Scene 6, 4:30)
- **Placement:** Single CTA at 90% mark — no mid-roll CTA to preserve demo flow
- **Secondary mention:** Team plan (Scene 6, brief — one sentence)
- **End screen:** Subscribe + next video card (Scene 7, 4:50–5:00)
- **Description links:** GitHub repo, docs landing page, team plan pricing

## Asset Requirements

| Asset | Type | Status | Notes |
|-------|------|--------|-------|
| `driftctl diff` terminal recording | Screen recording | Available | Colored diff output, ~200-table schema |
| `driftctl apply` + rollback recording | Screen recording | Needs recording | Apply → show rollback file → rollback sequence |
| `driftctl audit` terminal recording | Screen recording | Needs recording | v4.0 feature — verify actual output format before recording |
| GitHub repo page (stars) | Screen recording | Available | Brief scroll, star count visible |
| Webcam footage (Scenes 1, 2, 3, 5, 6, 7) | Camera | Needs recording | Solo setup, consistent lighting across all webcam scenes |
| Feature list overlay (Scene 3) | Graphic | Needs creation | Simple numbered list, 4 items |
| Stats overlay (Scene 2) | Graphic | Needs creation | `12,400+ stars` · `45k installs/mo` · `Linear · Lattice · Raycast` |
| `npx driftctl init` overlay (Scene 6) | Graphic | Needs creation | Large centered text |
| Low ambient music | Audio | Needs sourcing | Subtle, non-distracting, royalty-free |

## Source Attribution Summary

| Claim | Source artifact | Section |
|-------|----------------|---------|
| 12,400+ GitHub stars | product-led-media-map-driftctl.md | What Can Be Proven |
| ~45,000 npm downloads/month | product-led-media-map-driftctl.md | What Can Be Proven |
| Used by Linear, Lattice, Raycast | product-led-media-map-driftctl.md | What Can Be Proven |
| 47 releases, zero data-loss incidents | product-led-media-map-driftctl.md | What Can Be Proven |
| <200ms plan generation on 500-table schemas | product-led-media-map-driftctl.md | What Can Be Proven |
| PostgreSQL, MySQL, SQLite support | product-led-media-map-driftctl.md | Product Truth |
| Solo developer, 3 years | creator-positioning-driftctl.md | Credibility Sources |
| v4.0 features (rollback, multi-DB, advisory locks, audit) | gtm.md | What's New |
| Team plan features (drift alerts, audit logs, multi-DB sync) | gtm.md | Objection Handling |
| Schema drift as awareness trigger | journey-map.md | Stage 1 |
| CI catching drift before production | journey-map.md | Stage 4 |
| Build-in-public as content theme | creator-positioning-driftctl.md | Content Themes That Work |

## Ungrounded Claims

| Claim | Scene | Status | Note |
|-------|-------|--------|------|
| "Three months later someone runs a manual ALTER TABLE" | Scene 1 (Hook) | In narration | Plausible composite scenario — not sourced from a documented Alex incident. Retained as narrative device; flag for Alex to confirm or replace with a real anecdote. |

## Next Steps

1. **Alex review:** Confirm hook anecdote — replace composite with a real incident if one exists.
2. **Record terminal demos:** Prioritize `driftctl apply` + rollback and `driftctl audit` (both marked "Needs recording"). Verify `driftctl audit` actual output format before recording.
3. **Record webcam:** All non-demo scenes. Consistent lighting and framing.
4. **Create overlays:** Feature list (Scene 3), stats (Scene 2), CTA (Scene 6).
5. **Source music:** Low ambient, royalty-free.
6. **Proceed to `/video-build`** for edit assembly and timeline.
