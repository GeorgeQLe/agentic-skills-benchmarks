# Product-Led Media Map — Driftctl

> Generated: 2026-04-28

## Product Truth

Driftctl is an open-source CLI for database schema migrations. It tracks migration state, generates rollback plans, detects drift between declared schema and live databases, and supports PostgreSQL, MySQL, and SQLite.

### What Can Be Shown

- Live terminal demos: `driftctl plan`, `driftctl apply`, `driftctl diff`
- Drift detection on a real database with intentional schema divergence
- Rollback workflow: apply a migration, break something, roll back cleanly
- CI integration: GitHub Actions running `driftctl check` on every PR
- Speed comparison: migration plan generation time vs manual SQL review

### What Can Be Proven

- GitHub stars: 12,400+ (as of 2026-04-20)
- npm downloads: ~45,000/month (source: npm stats, public)
- Used by Linear, Lattice, and Raycast (public mentions in their engineering blogs)
- 47 releases shipped in 3 years with zero data-loss incidents reported
- Average migration plan generation: <200ms for schemas under 500 tables

### What Can Be Taught

- How schema drift happens and why it's dangerous
- Migration best practices: idempotent migrations, rollback-first design
- When NOT to use automated migrations (large-table locks, data backfills)
- How to set up drift detection in CI pipelines

## Audience Overlap

| Segment | Product relationship | Media interest |
| --- | --- | --- |
| Backend engineers (IC) | Primary users | Technical deep dives, migration patterns |
| Platform/infra engineers | Power users, CI integrators | Drift detection, automation, reliability |
| Engineering managers | Budget holders, team adoption | Productivity gains, risk reduction |
| Indie hackers / solo founders | Aspirational users | Build-in-public, founder journey |

## Proof Assets

| Asset | Type | Status | Notes |
| --- | --- | --- | --- |
| `driftctl plan` terminal recording | Screen recording | Available | 2-minute demo, clean terminal |
| Drift detection diff output | Screen recording | Available | Shows colored diff of schema vs live DB |
| Rollback workflow | Screen recording | Needs recording | Apply → break → rollback sequence |
| GitHub stars graph | Screenshot | Available | Shows growth trajectory |
| npm download chart | Screenshot | Available | Monthly trend, last 12 months |
| Linear engineering blog mention | Link | Available | Quote about migration reliability |
| CI pipeline integration | Screen recording | Needs recording | GitHub Actions workflow |
| Speed benchmark | Terminal output | Available | `time driftctl plan` on 200-table schema |

## Media Themes

1. **Product demos:** Show real workflows, not slides
2. **Build-in-public:** Architecture decisions, mistakes, revenue
3. **Technical education:** Migration patterns, drift detection, rollback strategies
4. **Case studies:** How teams use Driftctl (with permission)
5. **Founder judgment:** Why certain features were cut, pricing decisions, saying no

## Trust Risks

- Overpromising scale: Driftctl is not tested beyond 500-table schemas
- Customer data exposure: Never show customer schemas or data in demos
- Competitor bashing: Comparisons must be factual and acknowledge trade-offs
- Revenue claims: Only share verified, public numbers
- Feature promises: Don't announce unshipped features in video content

## Content-Role Mapping

| Role | Content type | Example |
| --- | --- | --- |
| Acquisition | Problem-aware content | "Your database schema is drifting and you don't know it" |
| Trust-building | Live demos with real databases | "Watch me detect and fix schema drift in 90 seconds" |
| Proof | Customer stories, GitHub metrics | "How Linear uses Driftctl for 200+ migrations/quarter" |
| Education | Tutorial content | "Set up drift detection in your CI pipeline in 10 minutes" |
| Launch support | Release announcements | "Driftctl v4.0: automatic rollback plans" |
| Retention | Advanced workflows | "Migration strategies for zero-downtime deploys" |
