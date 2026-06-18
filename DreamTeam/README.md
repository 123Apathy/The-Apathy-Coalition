# The DreamTeam

A panel of 32 specialist experts that can be convened — solo or as a group — to
plan, decide, review, and produce artifacts. It is built as a **system**, not a
folder of documents: every expert declares a machine-readable contract, stays in
a defined lane, passes a decision gate before recommending, and records what it
learns so the whole panel improves over time.

## Start here

| File | What it is |
|---|---|
| [`_SYSTEM.md`](_SYSTEM.md) | The operating standard every expert follows. Read once. |
| [`ROSTER.md`](ROSTER.md) | The registry of all 32 experts + the routing table (task → expert set). |
| [`ORCHESTRATION.md`](ORCHESTRATION.md) | How a convened group deliberates, resolves conflict, and delivers. Includes the reusable script library. |
| [`RUBRIC.md`](RUBRIC.md) | How experts and the panel are scored. |
| [`experts/`](experts/) | One file per expert — its full contract and knowledge. |
| [`scripts/validate.mjs`](scripts/validate.mjs) | Structural validator that enforces the contract. |

## How to use it

1. **Pick the task.** Find the matching row in `ROSTER.md`'s routing table → it
   names a **lead** and **support** experts.
2. **Convene them.** Load the lead's `experts/<slug>.md` (plus support files).
   Each file is self-contained — it is the full context that expert needs.
3. **Run the loop.** Follow `ORCHESTRATION.md`: recall past lessons → deliberate
   → pass decision gates → resolve conflicts → deliver the standard output.
4. **Record the lesson.** Append durable learnings to
   `../memory/embeddings/expert-learnings.json` so they propagate to the panel.

For a GPT/assistant project: upload `_SYSTEM.md`, `ROSTER.md`, `ORCHESTRATION.md`,
and `experts/*.md` together. The model reads the standard once and applies it to
whichever expert(s) the routing table selects.

## Design at a glance

- **Contracts over prose.** Each expert's YAML frontmatter declares `owns`,
  `excludes`, `inputs`, `outputs`, `kpis`, `depends_on`, `escalates_to`. This is
  what makes the team routable and checkable.
- **Shared standard, role-specific content.** The operating rules live once in
  `_SYSTEM.md`; expert files hold only what is unique to the role (no duplicated
  boilerplate).
- **No empty templates.** Every section is filled with real numbers, tools, and
  worked examples. `validate.mjs` fails the build if a file regresses to
  placeholders.
- **A living memory.** Lessons accumulate in the embeddings store and re-enter
  future deliberations.

## Validate

```bash
node DreamTeam/scripts/validate.mjs
```

Checks every expert file for a valid contract, all required sections, referential
integrity of `depends_on`/`excludes`/`escalates_to`, and the absence of empty
bullets or `____` placeholders.
