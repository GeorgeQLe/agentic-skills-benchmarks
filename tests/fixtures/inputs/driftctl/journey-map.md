# Journey Map — Driftctl

> Generated: 2026-04-25

## Stage 1: Problem Awareness

**Trigger:** Engineer encounters a production incident caused by schema drift — a column was added manually in production but never tracked in migration files.

- Emotional state: Frustrated, anxious about data integrity
- Current behavior: Manual `pg_dump` diffs, spreadsheet tracking, or ignoring the problem
- Key question: "How do I know my migration files match what's actually in production?"

**Aha moment:** Realizing that schema drift is a class of problem, not a one-off mistake.

## Stage 2: Solution Discovery

**Trigger:** Googling "database schema drift detection" or seeing a tweet/video about Driftctl.

- Emotional state: Curious but skeptical — "another migration tool?"
- Current behavior: Evaluating Flyway, Liquibase, or custom scripts
- Key question: "How is this different from what I already use?"

**Aha moment:** Seeing a live `driftctl diff` that instantly shows the gap between declared and live schema.

## Stage 3: First Use

**Trigger:** Running `npx driftctl init` on an existing project.

- Emotional state: Cautiously optimistic
- Current behavior: Testing on a staging database first
- Key question: "Will this break my existing migrations?"

**Aha moment:** First `driftctl plan` output that shows a clear, readable migration plan — "it just works."

## Stage 4: Integration

**Trigger:** Adding `driftctl check` to CI pipeline after a successful local test.

- Emotional state: Confident, wanting to prevent future drift
- Current behavior: Adding to GitHub Actions or similar CI
- Key question: "How do I make this a team standard?"

**Aha moment:** First CI run that catches a schema change before it reaches production.

## Stage 5: Advocacy

**Trigger:** Drift detected and prevented in production, or a teammate asks "what tool is that?"

- Emotional state: Relieved, wanting to share
- Current behavior: Recommending in Slack, blog posts, or conference talks
- Key question: "How do I get my whole team to adopt this?"

## Key Aha Moments Summary

| Stage | Aha moment | Proof type |
| --- | --- | --- |
| Awareness | Schema drift is a class of problem | Educational content |
| Discovery | Live diff shows the gap instantly | Product demo |
| First use | `driftctl plan` just works | Tutorial / walkthrough |
| Integration | CI catches drift before production | Case study / demo |
| Advocacy | Prevented a production incident | Testimonial / story |
