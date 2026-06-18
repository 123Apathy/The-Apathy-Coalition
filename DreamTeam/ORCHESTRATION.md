# DreamTeam Orchestration (`ORCHESTRATION.md`)

How the panel actually *works as a team*: how a task is routed, how a convened
group reaches a decision, how disagreements resolve, and what every engagement
returns. Replaces the old empty `flowchart.txt`.

## The engagement loop

```
        ┌────────────────────────────────────────────────────────────┐
        │ 1. INTAKE   classify the task                              │
        │ 2. ROUTE    ROSTER.md routing table → lead + support       │
        │ 3. RECALL   each expert reads its expert-learnings.json    │
        │ 4. DELIBERATE  lead drafts; support critiques in-lane      │
        │ 5. GATE     run each expert's Decision Gate (Stop/Go)      │
        │ 6. RESOLVE  conflicts → conflict-resolution-analyst        │
        │ 7. DELIVER  return the standard output contract            │
        │ 8. RECORD   append durable lessons to the memory loop      │
        └────────────────────────────────────────────────────────────┘
```

## 1. Intake & 2. Route

Classify the request, then use the **routing table in `ROSTER.md`** to pick the
**lead** (owns the decision) and **support** experts (critique within their own
lane only). If no row fits, route to `product-strategist` to triage.

## 3. Recall

Before deliberating, each convened expert reads
`../memory/embeddings/expert-learnings.json` for entries where its slug appears
in `slug` or `applies_to`. Past lessons enter the discussion as evidence.

## 4. Deliberate — roles in a convened group

- **Lead** drafts the recommendation and owns the final call.
- **Support** experts may only push back inside their own `owns`. A support
  expert cannot overrule the lead's domain — it can raise a blocking concern,
  which escalates (step 6).
- Every claim carries a source + confidence (`high`/`medium`/`low`), per
  `_SYSTEM.md`.

## 5. Decision Gate

The lead's recommendation must pass **its own** Stop/Go gate (in its expert
file). If any support expert's domain gate fails (e.g. `security` flags a control
gap, `legal-compliance` flags a claim), the output becomes **"Not yet, because…"**
naming the failed gate. No soft yeses.

## 6. Conflict resolution (quorum rule)

When experts disagree and neither will yield, `conflict-resolution-analyst`
arbitrates:

1. Restate each position as a testable claim + its evidence/confidence.
2. Apply the **quorum rule**: the lead's call stands **unless** a support expert
   raises a *blocking* concern in its own domain backed by ≥ `medium` confidence
   evidence — then it escalates to `risk-governance` for a final, logged ruling.
3. Record a **Decision Record** (below). Track reversal rate as a quality signal.

**Decision Record format:**
```
DR-<date>-<n>: <one-line decision>
Context: <task>
Options considered: A / B / C
Chosen: <option> — by <lead>, arbitrated by conflict-resolution-analyst
Dissent: <expert> held <position> (confidence: …)
Trigger to revisit: <metric/date>
```

## 7. Deliver — the output contract

Every engagement returns (from `_SYSTEM.md`):

- **1–3 prioritized actions**, each with owner + timeframe.
- **Updated artifacts/templates** when applicable.
- **Evidence/assumptions** logged with confidence.
- **Next review date.**
- The **Decision Record** if a conflict was resolved.

## 8. Record — close the loop

Append durable lessons to `../memory/embeddings/expert-learnings.json` (schema in
`_SYSTEM.md`). This is what turns one engagement's insight into the panel's
standing knowledge.

## Repetitive-task script library

Reusable, pre-composed multi-expert workflows. Each script names its trigger,
expert set, steps, and output. Fill variables per run.

### SCRIPT-01 · Price/packaging change
- **Trigger:** considering a price, tier, or packaging change.
- **Experts:** pricing-strategy (lead) → analytics, billing, product-strategist, risk-governance.
- **Steps:** gather WTP + win/loss → model margin & NRR impact → check billing feasibility → run pricing Decision Gate → risk sign-off if >15% → comms + rollback plan.
- **Output:** Pricing recommendation memo + Decision Record.

### SCRIPT-02 · Ship a release safely
- **Trigger:** a change is ready to deploy to production.
- **Experts:** deployment-expert (lead) → qa-automation, devops-sre, code-quality-expert, security.
- **Steps:** confirm test coverage + green CI → security check on changed surface → staged rollout plan + rollback → observability/alerts ready → go/no-go.
- **Output:** Release plan + go/no-go decision.

### SCRIPT-03 · New feature intake
- **Trigger:** a feature idea needs a build/no-build call.
- **Experts:** product-strategist (lead) → ux-researcher, ai-expert, analytics, security, pricing-strategy.
- **Steps:** define the user problem + evidence → feasibility (incl. AI/security) → success metric → packaging/price implication → prioritize against roadmap.
- **Output:** Feature brief with success metric + a build/defer/kill call.

### SCRIPT-04 · Growth campaign
- **Trigger:** launching a paid acquisition push.
- **Experts:** social-meta-ads-expert (lead) → analytics, graphic-designer, authenticity-officer, email-copy-expert.
- **Steps:** define audience + offer → creative variants → claims pass (authenticity) → tracking/attribution set → budget + ROAS target + kill criteria.
- **Output:** Campaign plan with ROAS target + kill criteria.

### SCRIPT-05 · Incident response
- **Trigger:** a production outage or severe degradation.
- **Experts:** devops-sre (lead) → backend-architect, security, deployment-expert.
- **Steps:** stabilize/mitigate → identify blast radius → security check (is it a breach?) → fix + verify → postmortem with prevention into Failure Modes.
- **Output:** Incident timeline + blameless postmortem + prevention items.

> Retire or revise a script when outcomes drift from best practice. Log script
> performance lessons to the memory loop like any other learning.
