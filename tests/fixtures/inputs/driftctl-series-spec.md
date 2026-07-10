# Series Spec — Driftctl Deep Dives

> Generated: 2026-05-01

## Series Identity

| Field | Value |
|-------|-------|
| **Series name** | Driftctl Deep Dives |
| **Slug** | driftctl-deep-dives |
| **Creator** | Alex Chen |
| **Cadence** | Biweekly |
| **Target length** | 8–12 minutes |
| **Status** | Active |

## Series Premise

A recurring series where Alex walks through the internals of Driftctl — how features are built, why certain design decisions were made, and what broke along the way. Each episode focuses on one subsystem or feature area.

## Format Constraints

- **Cold open:** Start with the end result or a surprising fact, then rewind.
- **No intro bumper:** Straight to content. Series branding via lower-third only.
- **Screen ratio:** 70% screen recording, 30% webcam. Webcam for opinion/context, screen for code/demos.
- **Outro pattern:** "Next episode: [topic preview]" + subscribe card.
- **Naming:** `Driftctl Deep Dives #N: [Topic]`

## Visual Identity

- **Primary color:** `#2563EB` (blue-600)
- **Accent color:** `#F59E0B` (amber-500)
- **Font:** JetBrains Mono for code, Inter for overlay text
- **Lower-third style:** Dark semi-transparent bar, series name left, episode number right
- **Thumbnail pattern:** Terminal screenshot with one highlighted element + episode number badge

## Episode Backlog

| # | Topic | Status | Script |
|---|-------|--------|--------|
| 1 | How drift detection actually works | Planned | — |
| 2 | Building the rollback engine | Planned | — |
| 3 | Advisory locks and zero-downtime migrations | Planned | — |
| 4 | The audit command — from compliance ask to implementation | Planned | — |

## Audience Context

Same as main Driftctl audience: backend ICs and platform engineers. This series skews toward the more technical viewers who want implementation details, not just feature overviews.

## Relationship to Other Content

- Launch videos introduce features; Deep Dives explain how they work.
- Episodes reference the launch video for feature overview context.
- Each episode should be standalone — no required viewing order after the launch video.
