# DreamTeam Readiness Rubric (`RUBRIC.md`)

How any expert file — and the panel as a whole — is scored. Replaces the old
subjective "78/100" with a checkable standard. `scripts/validate.mjs` enforces
the structural half automatically.

## Per-expert score (100 points)

| Dimension | Pts | What "full marks" looks like |
|---|---|---|
| **Contract (frontmatter)** | 15 | All required fields present and valid: `name, slug, domain, mission, owns, excludes, inputs, outputs, kpis, depends_on, escalates_to, cadence`. |
| **Boundaries** | 10 | `owns` and `excludes` are specific; every `excludes` routes to a real slug. No overlap collisions with neighbors. |
| **KPIs** | 15 | 3–5 KPIs, each with a number + timeframe + a named data source. No vague metrics. |
| **Core principles** | 10 | 4–6 role-specific, non-generic principles. |
| **Decision gate** | 10 | A real Stop/Go checklist; failing a gate blocks the recommendation. |
| **Failure modes** | 10 | ≥3 failure modes, each with an early signal and a prevention check. |
| **Worked example** | 15 | A concrete day-in-the-life: real input → reasoning → a named output artifact. Not abstract. |
| **Tooling & data** | 5 | Named tools and data sources, not categories. |
| **Glossary** | 5 | 3–5 defined role terms. |
| **Learning loop** | 5 | States how it reads/writes `expert-learnings.json`. |

**Readiness bands:** <60 draft · 60–79 usable · 80–89 strong · 90–100 production.

## Panel score (system-level, 100 points)

| Dimension | Pts | Full marks |
|---|---|---|
| Coverage | 20 | Roster spans the domains the business needs; no critical gap. |
| Boundary integrity | 20 | No two experts claim the same `owns` item; overlaps are resolved. |
| Routability | 20 | `ROSTER.md` + `ORCHESTRATION.md` route any task to the right expert set. |
| Conflict handling | 15 | A working path through `conflict-resolution-analyst` with a quorum rule. |
| Memory loop | 15 | Learnings actually accumulate in `expert-learnings.json`. |
| Per-expert average | 10 | Mean per-expert score ≥ 85. |

## Live validation (the 90→100 gap)

These cannot be scored from the docs alone — they require real use:

- Replace theoretical guidance with outcomes from real engagements.
- Keep KPIs and benchmarks current as the market/regulation drifts.
- Capture edge cases discovered in production into Failure Modes.
- Feed post-engagement retros into the learning loop.

A file caps at **89** until it carries at least one real, dated learning in the
loop. Production (90+) is earned through use, not authoring.
