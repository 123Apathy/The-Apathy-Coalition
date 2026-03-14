# The Apathy Coalition Roadmap

This roadmap translates the platform strategy into a build order with priorities and expected outcomes.

It is designed to answer:

- what should be built first
- what can wait
- what blocks what

---

## Strategy Summary

The highest-level sequence is:

1. stabilize the product foundation
2. make it installable
3. make updates safe
4. add cross-platform support
5. add shared workspaces
6. deepen collaboration and model management

---

## Milestone 1: Product Foundation

### Goal

Prepare the current codebase to become a real desktop-distributed product.

### Priorities

- separate app/runtime state from user data
- define stable data directories
- audit what is currently hardcoded to dev/runtime paths
- document managed vs user-owned state
- make local runtime startup more deterministic

### Deliverables

- app/data separation contract
- runtime bootstrap design
- persistent data layout
- upgrade boundary definitions

### Why This Comes First

Without this, installer and updater work will be fragile and likely destructive.

---

## Milestone 2: Windows Desktop Installer

### Goal

Ship the first installable version for Windows.

### Priorities

- choose desktop shell
- bundle local runtime
- build first-run wizard
- install local services cleanly
- launch the app without manual WSL/dev setup

### Deliverables

- Windows installer
- first-run onboarding flow
- basic runtime manager
- local app launch flow

### Success Criteria

A friend should be able to click install and get a working app.

---

## Milestone 3: Safe Updater

### Goal

Allow the base app to update without overwriting personal state.

### Priorities

- updater architecture
- migration framework
- rollback support
- release channels

### Deliverables

- version-aware updater
- staged update flow
- migration runner
- rollback path

### Success Criteria

New app versions can be delivered while preserving:

- chats
- settings
- memories
- model cache

---

## Milestone 4: Model Profile Onboarding

### Goal

Make local AI setup feel guided and machine-aware.

### Priorities

- hardware detection
- profile recommendation
- model bundle definitions
- download/progress UX

### Deliverables

- Lite / Standard / Power profiles
- installer recommendation logic
- optional add-on packs
- model management UI

### Success Criteria

Users no longer need to understand model names to get started.

---

## Milestone 5: macOS Desktop Support

### Goal

Bring the same install and runtime model to macOS.

### Priorities

- macOS packaging
- signing/notarization
- runtime helper behavior
- update support

### Deliverables

- macOS app package
- notarized release flow
- parity with Windows first-run experience

### Success Criteria

Coworkers on MacBooks can install and use the same app successfully.

---

## Milestone 6: Workspace Backend Foundation

### Goal

Introduce a shared source of truth for collaboration.

### Priorities

- user identity model
- workspace entities
- membership and invitations
- shared API/service layer

### Deliverables

- workspace service
- workspace membership
- invite flow
- workspace data model

### Success Criteria

Multiple users can belong to the same workspace with correct access boundaries.

---

## Milestone 7: Workspaces V1

### Goal

Ship the first useful collaboration experience.

### Priorities

- shared workspace chat
- shared tasks
- shared project context
- shared approvals visibility
- shared memory

### Deliverables

- workspace overview
- workspace chat threads
- workspace task pages
- workspace memory
- activity feed

### Success Criteria

Two or more people can use the app together on the same project in a way that is obviously better than disconnected local use.

---

## Milestone 8: Collaboration Refinement

### Goal

Make workspaces feel operationally strong.

### Priorities

- project dashboards
- better task ownership
- richer activity streams
- more polished approval flows

### Deliverables

- better member experience
- better project visibility
- stronger task and review ergonomics

---

## Milestone 9: Product Hardening

### Goal

Prepare the platform for broader distribution.

### Priorities

- installer reliability
- update reliability
- supportability
- observability
- failure recovery UX

### Deliverables

- better logs and diagnostics
- update failure recovery flows
- stronger health checks
- release readiness checklists

---

## Priority Order

If time and focus are limited, the correct order is:

1. product foundation
2. Windows installer
3. safe updater
4. model profile onboarding
5. macOS support
6. workspace backend
7. Workspaces V1

That gives you the strongest path with the least rework.

---

## What Can Wait

Do not prioritize these before the foundation is stable:

- multiplayer live editing
- advanced enterprise permissions
- billing
- complicated analytics
- broad plugin marketplace ideas

These are later-stage concerns.

---

## Recommended Immediate Next Actions

The best next concrete work after these specs is:

1. define the app/data separation contract in code terms
2. choose Electron vs Tauri
3. define Windows installer packaging path
4. define updater storage/version switching model
5. define the shared backend approach for workspaces

---

## Final Outcome

If this roadmap is followed, The Apathy Coalition becomes:

- a local-first cross-platform desktop product
- with safe updates
- with preserved personal state
- with adaptive local AI setup
- with optional shared workspaces for real collaboration

