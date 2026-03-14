# The Apathy Coalition Team Onboarding

Welcome to The Apathy Coalition.

Repository home:
- https://github.com/123Apathy/The-Apathy-Coalition

This is not just a chatbot, and it is not just an agent runner.

The Apathy Coalition is a self-hosted autonomous engineering system: a local-first AI operating layer that can understand a codebase, plan work, debate approaches, govern risky changes, execute modifications in sandboxed environments, verify results, learn from past work, and expose the whole process through an operational dashboard.

If you are joining this project as an engineer, operator, or reviewer, the fastest useful mental model is:

**The Apathy Coalition is an AI engineering organization encoded as software.**

It has:
- a control plane
- multiple specialized planning layers
- long-term memory
- repository intelligence
- governance
- sandboxed execution
- observability

And most importantly:

**the repository is the agent**

Every meaningful autonomous action becomes a branch, a commit, a verification step, a PR, a memory entry, or an event in the control tower.

---

## What The Apathy Coalition Is

The Apathy Coalition is a self-hosted autonomous AI framework for software work.

At runtime it combines:

1. **Next.js control plane**
   For chat, web UI, APIs, auth, streaming, settings, notifications, planning orchestration, and read-only operations visibility.

2. **Docker-based worker execution**
   For sandboxed coding, autonomous jobs, headless tasks, and isolated repository modification workflows.

   In the default Compose deployment, Docker control is brokered through a dedicated internal Job Runner service instead of giving the web-facing control plane direct Docker socket access.

3. **Local multi-model LLM routing**
   For selecting the best local model for chat, reasoning, coding, OCR, vision, and embeddings.

4. **Governance and planning systems**
   For proposal review, competing solution generation, change-set sequencing, architectural simulation, and verification.

5. **Persistent memory and repository intelligence**
   For long-term learning, semantic search, skills, codebase analysis, dependency graphs, and impact prediction.

This means The Apathy Coalition can act like:
- an AI coding assistant
- an autonomous repo worker
- a governed self-improvement system
- a repository intelligence engine
- a local engineering command center

---

## What It Can Do

The Apathy Coalition already supports a surprisingly deep engineering loop.

### Collaboration and Interfaces

- Web chat interface with persistent conversations
- Telegram integration for remote interaction
- Local Control Tower dashboard for operations visibility
- Notifications and job summaries

### Autonomous Engineering

- Create autonomous coding jobs on isolated `job/<uuid>` branches
- Run tasks through Docker sandbox workers
- Commit changes and open PRs instead of modifying `main` directly
- Perform self-improvement jobs on its own codebase
- Use change sets and verification gates to break work into safer increments

### Planning Intelligence

- Retrieve long-term architectural memory
- Retrieve learned engineering skills
- Run semantic repository search
- Query a repository dependency graph
- Use a Task Market to generate competing proposals from different agent roles
- Send proposals through DreamTeam governance before execution
- Simulate architectural impact before applying risky refactors

### Governance and Safety

- Multi-stage DreamTeam review before execution
- High-risk escalation instead of blind execution
- Verification gates after change sets
- Rollback and failure-memory logging when verification fails
- Sandboxed execution only

### Repository Understanding

- Codebase scanning
- Dependency mapping
- Architecture summarization
- Importance scoring
- Complexity metrics
- Semantic code search
- Repository knowledge graph
- Impact analysis for changed modules

### Learning Systems

- Long-term memory by type
- Learned engineering skills from successful executions
- Model performance tracking
- Embedding caching
- Planner result caching

### Local Model Operation

- Local Ollama-based model routing
- Separate model roles for chat, reasoning, coding, OCR, vision, and embeddings
- Model-independent memory and retrieval
- Local-first execution and storage

---

## The Big Idea

Most AI tooling gives you one model and one prompt.

The Apathy Coalition behaves more like an engineering organization:

- **Memory** remembers what the system has learned
- **Skills** preserve reusable engineering patterns
- **Task Market** creates competing approaches
- **DreamTeam** reviews proposals before work begins
- **Repo Graph + Simulation** predict blast radius before execution
- **Change Sets** force incremental, testable changes
- **Verification Gates** stop bad work early
- **Control Tower** makes the system observable

This is the core reason the project feels different from a normal agent wrapper.

It is trying to turn autonomous software work into something:
- auditable
- governable
- inspectable
- reversible
- continuously improvable

---

## How It Works

Here is the current high-level lifecycle for a meaningful engineering task:

```text
Task
-> Memory retrieval
-> Skill retrieval
-> Repository semantic search
-> Repository graph impact analysis
-> Task Market contest
-> DreamTeam governance
-> Change-set planning
-> Architectural simulation
-> Sandbox execution
-> Verification gates
-> PR / completion
-> Memory + skill learning
-> Control Tower visibility
```

### Step by step

1. **A task enters the system**
   Through chat, Telegram, an API call, a scheduled job, a trigger, or an internal planner.

2. **Context is assembled**
   The Apathy Coalition retrieves:
   - relevant memory
   - learned engineering skills
   - semantic repository matches
   - repository graph impact data

3. **Context is budgeted**
   The Context Budget Manager trims or compresses planning context so local models stay fast and usable.

4. **Task Market runs**
   Multiple agent roles compete on the same task:
   - coding-agent
   - reasoning-agent
   - architecture-agent

   The best proposal is selected deterministically.

5. **DreamTeam governance reviews the plan**
   Specialized experts review the proposal in stages:
   - Product & Human Impact
   - Engineering & Architecture
   - Risk / Security / Compliance
   - Growth & Communication

   Only approved work is allowed to continue.

6. **Change sets are planned**
   The approved proposal is decomposed into atomic, testable steps.

7. **Architectural simulation runs**
   The system predicts:
   - affected modules
   - dependency blast radius
   - refactor risk
   - verification scope

8. **Execution happens in the sandbox**
   Change sets are executed in isolated job branches and sandboxed Docker environments.

9. **Verification gates run**
   Typical gates include:
   - syntax validation
   - lint checks
   - unit tests
   - integration tests

10. **Rollback or completion**
   Failed changes are rolled back and written to failure memory.
   Successful changes move toward PR completion.

11. **The system learns**
   DreamTeam outputs, successful execution patterns, and repo intelligence are written back into memory and skills.

12. **Control Tower updates**
   Events stream into the dashboard so humans can watch the system think and operate.

---

## Core Subsystems

These are the major systems teammates should know first.

### 1. AI Layer

Path: [`lib/ai`](/d:/Popebot/lib/ai)

Responsible for:
- model creation
- local routing
- LangGraph agents
- model performance tracking
- AI tools

Important idea:
the AI layer does not just call one model. It routes by role and context.

### 2. DreamTeam Governance

Path: [`lib/dreamteam`](/d:/Popebot/lib/dreamteam)

Responsible for:
- staged expert review
- weighted decision synthesis
- proposal approval / rejection / escalation

Important idea:
execution is not the first thing The Apathy Coalition does. Review is.

### 3. Memory System

Path: [`lib/memory`](/d:/Popebot/lib/memory)

Responsible for:
- model-independent long-term memory
- embeddings-backed retrieval
- persistent architecture and governance knowledge

Important idea:
memory survives model changes. It is not just chat history.

### 4. Codebase Intelligence

Path: [`lib/codebase-intelligence`](/d:/Popebot/lib/codebase-intelligence)

Responsible for:
- repository scanning
- dependency mapping
- architecture summaries
- complexity metrics
- system-map generation

Important idea:
The Apathy Coalition builds a persistent machine-readable map of the repository.

### 5. Code Search

Path: [`lib/code-search`](/d:/Popebot/lib/code-search)

Responsible for:
- semantic repository search
- document indexing
- code preview context

Important idea:
The Apathy Coalition can retrieve semantically relevant files, not just keyword matches.

### 6. Repository Graph

Path: [`lib/repo-graph`](/d:/Popebot/lib/repo-graph)

Responsible for:
- deterministic dependency graph storage
- impact queries
- dependent-module expansion

Important idea:
this improves reliability by giving the planner structural knowledge, not only embeddings.

### 7. Task Market

Path: [`lib/task-market`](/d:/Popebot/lib/task-market)

Responsible for:
- multiple competing proposals
- deterministic ranking
- winner selection

Important idea:
The Apathy Coalition does not assume the first plan is the best plan.

### 8. Skills System

Path: [`lib/skills`](/d:/Popebot/lib/skills)

Responsible for:
- storing reusable engineering patterns
- embedding-based skill retrieval
- learning from successful past work

Important idea:
The Apathy Coalition can accumulate engineering habits over time.

### 9. Change Sets + Execution Loop

Paths:
- [`lib/change-sets`](/d:/Popebot/lib/change-sets)
- [`lib/execution-loop`](/d:/Popebot/lib/execution-loop)

Responsible for:
- splitting work into atomic modifications
- executing incremental steps
- verifying each step
- retrying or halting safely

Important idea:
large changes should be applied as a sequence of validated moves, not one giant mutation.

### 10. Architectural Simulation

Path: [`lib/architecture-simulation`](/d:/Popebot/lib/architecture-simulation)

Responsible for:
- pre-execution impact prediction
- refactor risk scoring
- execution order adjustments
- expanded verification scope

Important idea:
The Apathy Coalition tries to predict architectural damage before it writes code.

### 11. Control Tower

Paths:
- [`apps/control-tower`](/d:/Popebot/apps/control-tower)
- [`lib/control-tower`](/d:/Popebot/lib/control-tower)

Responsible for:
- live event streaming
- execution visibility
- memory exploration
- repository health visibility
- DreamTeam participation visibility

Important idea:
this system is meant to be watched, not just trusted.

---

## Why This Is Impressive

The Apathy Coalition is impressive for one reason above all:

**it treats autonomous software work as a full operating system problem, not just a prompt problem.**

It combines:
- planning
- governance
- memory
- repository intelligence
- simulation
- incremental execution
- verification
- rollback
- observability

Most AI engineering tools stop at "generate code."

The Apathy Coalition keeps going:
- "Should we do this at all?"
- "Which plan is best?"
- "What parts of the repo are likely affected?"
- "How should this be broken into safe steps?"
- "What should be verified after each step?"
- "What should the system learn from this result?"

That makes it much closer to a governed autonomous engineering platform than a chatbot with tools.

---

## What Teammates Should Know Before Changing It

### 1. The router is foundational

The model router is central infrastructure. Many systems now depend on routed local models indirectly. Avoid casually changing routing behavior without understanding downstream planning and memory usage.

### 2. The system is layered on purpose

There is a deliberate order:
- retrieve context
- compete on plans
- review governance
- decompose changes
- simulate impact
- execute incrementally
- verify
- learn

Skipping layers usually reduces safety.

### 3. Sandboxing matters

Main-branch direct mutation is not the operating model.
The safe path is always:
- branch
- sandbox
- verify
- PR

### 4. Observability matters as much as automation

If a subsystem makes decisions, we should be able to inspect:
- what it decided
- why it decided it
- what data it used
- what changed because of it

### 5. Local-first is a design principle

This repo is being built so that memory, routing, search, skills, planning, and control surfaces remain usable on a local machine with Ollama-hosted models.

---

## Recommended Mental Model for New Engineers

When you work in The Apathy Coalition, think in this order:

1. **What layer am I changing?**
   Planning, governance, retrieval, execution, verification, memory, or UI?

2. **What upstream systems feed it?**
   Does it depend on memory, search, graph impact, or DreamTeam outputs?

3. **What downstream systems trust it?**
   If this changes behavior, what else becomes less reliable?

4. **Is the change observable?**
   Can Control Tower, logs, or stored memory reveal what happened?

5. **Is the change reversible?**
   Can the system fail safely if this layer misbehaves?

That mindset will save you a lot of time here.

---

## Quick Start for Coworkers

### Read these first

1. [`README.md`](/d:/Popebot/README.md)
2. [`docs/ARCHITECTURE.md`](/d:/Popebot/docs/ARCHITECTURE.md)
3. [`CLAUDE.md`](/d:/Popebot/CLAUDE.md)
4. [`docs/RUNNING_DIFFERENT_MODELS.md`](/d:/Popebot/docs/RUNNING_DIFFERENT_MODELS.md)
5. This file

### Then inspect these directories

1. [`lib/ai`](/d:/Popebot/lib/ai)
2. [`lib/dreamteam`](/d:/Popebot/lib/dreamteam)
3. [`lib/memory`](/d:/Popebot/lib/memory)
4. [`lib/codebase-intelligence`](/d:/Popebot/lib/codebase-intelligence)
5. [`lib/task-market`](/d:/Popebot/lib/task-market)
6. [`lib/change-sets`](/d:/Popebot/lib/change-sets)
7. [`lib/execution-loop`](/d:/Popebot/lib/execution-loop)
8. [`apps/control-tower`](/d:/Popebot/apps/control-tower)

### To run the Control Tower

```bash
cd apps/control-tower
npm install
npm run dev
```

Open:

```text
http://localhost:3010/dashboard/system-status
```

### To understand current repository intelligence outputs

Inspect:
- [`memory/codebase/system-map.json`](/d:/Popebot/memory/codebase/system-map.json)
- [`memory/repo-graph.json`](/d:/Popebot/memory/repo-graph.json)

### To understand stored learning

Inspect:
- [`memory/`](/d:/Popebot/memory)
- [`memory/skills/`](/d:/Popebot/memory/skills)

---

## Final Summary

The Apathy Coalition is an ambitious local-first autonomous engineering platform.

It can:
- understand its own repository
- retrieve past knowledge
- generate competing plans
- govern risky work
- predict architectural impact
- execute changes incrementally
- verify and roll back failures
- learn reusable engineering skills
- show the whole process in a live operational dashboard

If you are working on this codebase, you are not just editing an app.

You are helping build a supervised autonomous software organization.
