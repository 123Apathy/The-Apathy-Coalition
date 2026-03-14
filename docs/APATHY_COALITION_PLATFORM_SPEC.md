# The Apathy Coalition Platform Spec

This document defines the target product architecture for turning the current local engineering system into a distributable cross-platform application with safe updates, preserved personal state, adaptive model installation, and shared workspaces.

It is intentionally product-facing and implementation-oriented at the same time.

---

## Product Vision

The Apathy Coalition should evolve into a product with three clear layers:

1. **The Apathy Coalition Desktop**
   A local application for Windows and macOS with one-click install, local runtime, local models, private chats, private settings, and private memory.

2. **The Apathy Coalition Workspaces**
   A shared collaboration layer for invited teammates working on the same projects, tasks, memory, and approvals.

3. **The Apathy Coalition Updater**
   A safe update system that upgrades the base app without overwriting personal data, chats, local memory, or workspace state.

The user experience goal is:

- install in one click
- choose an appropriate model profile for the machine
- use the app immediately
- receive base app updates safely
- keep personal state private and persistent
- collaborate with others through shared workspaces when desired

---

## Product Principles

1. **App code and user data must be separate**
   Updates should replace the app, not the user's life inside the app.

2. **Local-first remains the default**
   A single user should be able to use the product meaningfully without a cloud dependency.

3. **Collaboration must use a shared source of truth**
   Shared workspaces should not depend on fragile peer-to-peer sync.

4. **Model installation must adapt to the machine**
   Users should not be forced to download oversized model bundles blindly.

5. **Personal state and workspace state are different**
   Personal chats, settings, and memory should not be conflated with shared project context.

6. **Cross-platform support is a first-class requirement**
   Windows and macOS should be designed together, not treated as separate afterthoughts.

---

## Scope Split

### Personal Scope

Personal scope is private to one installed app identity and should include:

- personal chats
- personal settings
- personal notification preferences
- personal model preferences
- personal memory
- personal local-only tasks
- personal local model cache

### Workspace Scope

Workspace scope is shared across invited members and should include:

- shared workspace chat threads
- shared task history
- shared approvals and governance artifacts
- shared project memory
- shared repo/project bindings
- shared workflow logs and status
- shared roles and member list

### App Scope

App scope is versioned product/runtime state and should include:

- application binaries
- packaged frontend/backend runtime
- bundled assets
- installer logic
- updater logic
- schema migrations
- platform bootstrap code

Only app scope should be replaced on upgrade.

---

## Desktop Architecture

### Recommended Shape

The Desktop product should be built as:

- **Desktop shell**
  Electron or Tauri

- **Local app runtime**
  A local backend process responsible for:
  - HTTP/UI backend
  - local DB access
  - memory systems
  - model orchestration
  - job orchestration
  - update coordination

- **Local service manager**
  Starts and supervises:
  - the app runtime
  - the model backend
  - optional background download/update services

- **User data store**
  Stored outside the app bundle in a stable per-user data directory

### Recommended Runtime Separation

The desktop shell should not directly own all product logic.

Preferred layering:

- Desktop shell
  - windowing
  - native menus
  - tray/status integration
  - installer/updater integration

- Local backend service
  - API layer
  - orchestration
  - memory
  - workspaces
  - repo intelligence
  - model routing

- Model service
  - Ollama or a compatible local model daemon

This keeps the app maintainable and easier to update.

---

## Install and First-Run Experience

### Goal

A user should be able to:

1. download installer
2. click install
3. launch app
4. complete a first-run setup wizard
5. start using the product

### First-Run Wizard Responsibilities

The first-run wizard should:

- detect operating system
- detect CPU architecture
- detect RAM
- detect available disk
- detect GPU and VRAM when possible
- detect whether required runtimes are already present
- choose or recommend a model profile
- set the app data directory
- initialize the local database
- initialize local memory storage
- download or connect to the model backend
- pull required starter models
- present a quick explanation of what is being installed

### Hardware-Aware Model Profiles

The installer should support at least three model profiles:

1. **Lite**
   For lower-RAM machines or constrained work laptops

2. **Standard**
   For typical developer laptops

3. **Power**
   For high-RAM / GPU-capable machines

Each profile should define:

- chat model
- coding model
- reasoning model
- embeddings model
- optional vision/OCR models
- expected disk footprint
- expected memory footprint

The installer should display this before download.

### Adaptive Model Recommendation

Yes, the app can decide what to install based on PC specs.

That should work like this:

- inspect hardware
- classify machine
- recommend a default profile
- allow manual override
- allow optional add-on packs later

This is strongly recommended.

---

## Data Directory Strategy

The app must separate install-time assets from user data.

### Windows

Suggested:

- app/runtime:
  `%ProgramFiles%/ApathyCoalition` or packaged app directory

- per-user data:
  `%LOCALAPPDATA%/ApathyCoalition`

### macOS

Suggested:

- app/runtime:
  `/Applications/The Apathy Coalition.app`

- per-user data:
  `~/Library/Application Support/The Apathy Coalition`

### Data Layout

Suggested structure:

```text
user-data/
  db/
    app.sqlite
  chats/
  memory/
  workspaces/
  models/
  logs/
  cache/
  config/
    user-settings.json
  updates/
```

### Preservation Rules

Upgrades must preserve:

- chats
- settings
- memories
- workspaces
- model cache/store
- logs

Upgrades may replace:

- app binaries
- generated assets
- runtime wrappers
- managed templates

---

## Update Architecture

### Goal

When a new version is shipped:

- app code should update
- user data should remain intact
- schema changes should migrate safely
- rollback should be possible

### Update Model

Recommended updater flow:

1. app detects newer version
2. downloads update package
3. validates package signature/checksum
4. stops local runtime
5. installs new runtime/app files
6. runs migrations
7. restarts services
8. verifies health
9. rolls back if startup fails

### Migrations

A migration layer is required for:

- database schema changes
- settings schema changes
- memory schema changes
- workspace schema changes

Migrations must be:

- versioned
- idempotent when possible
- logged
- recoverable on failure

### Managed vs User Files

The updater must understand which files are:

- **managed**
  owned by the product and safe to replace

- **user-owned**
  personal state that must not be overwritten

This is non-negotiable.

---

## Workspace System

### Why Workspaces Exist

The app needs a collaboration model that is more structured than “shared chat.”

The correct object is a **workspace**, not just a shared thread.

### Workspace Definition

A workspace is a shared project container that can hold:

- members
- roles
- shared chats
- shared tasks
- shared memory
- shared repository bindings
- shared approvals
- shared execution history

### Recommended Roles

V1 roles:

- **Owner**
  full control over workspace settings, members, repo bindings, and admin actions

- **Collaborator**
  can participate in chats, create tasks, review context, and work in the project

- **Reviewer**
  can review plans, approvals, and outcomes, with more limited modification permissions

### V1 Workspace Features

Recommended first version:

- create workspace
- invite members by email or invite link
- connect workspace to one or more repositories/projects
- create shared workspace chat threads
- create and track workspace tasks
- attach shared memory to the workspace
- show member activity and task ownership
- support shared approvals/governance history

### What Not To Build In V1

Avoid these in the first release:

- fully realtime collaborative editing
- peer-to-peer workspace sync
- advanced enterprise permissions matrix
- offline conflict resolution across multiple devices
- shared execution across multiple personal machines without a coordinator

These are expensive and not required for a strong first version.

---

## Shared Source of Truth

### Recommendation

Collaboration should use a shared backend service.

Do not try to solve multi-user collaboration as purely local-only sync between desktop apps.

### Why

Shared workspaces need:

- consistent membership
- shared task state
- shared memory
- shared approvals
- message ordering
- access control

All of that becomes fragile if each machine is treated as a peer.

### Recommended Architecture

- Local Desktop app per user
- Shared coordination backend for workspace data
- Optional self-hosted backend later for privacy-sensitive teams

This allows:

- solo local-only usage
- optional collaboration mode
- clear separation between personal and shared state

---

## Suggested Collaboration Model

### Personal Mode

When no workspace is active:

- chats are private
- memory is private
- tasks are local
- settings are personal

### Workspace Mode

When a workspace is active:

- chat can be shared
- task threads are shared
- workspace memory is shared
- project context is shared
- approvals are visible to members

### Mixed Mode

The app should allow both:

- private personal chats in the same install
- shared workspace chats and tasks

This is likely the ideal model for individual consultants, founders, and small teams.

---

## Repo and Project Model

The workspace should support project-scoped collaboration.

Recommended structure:

- User
- Workspace
- Project
- Task
- Conversation
- Memory Entry
- Approval Record

Where:

- a workspace can have multiple projects
- a project can have multiple tasks
- tasks can have their own planning/execution history
- memory can be scoped to:
  - personal
  - workspace
  - project

This gives you the right flexibility without immediately building a massive enterprise system.

---

## Cross-Platform Packaging

### Windows

Recommended:

- signed installer
- app auto-updater
- service bootstrap for local runtime/model services

### macOS

Recommended:

- signed `.dmg` or `.pkg`
- notarized app bundle
- launch agent or service bootstrap for local runtime/model services

### Shared Requirements

Both platforms need:

- identical product behavior
- compatible data layout concepts
- version-aware updater
- spec-aware model installer
- first-run onboarding

### Packaging Technology

Likely candidates:

- Electron
- Tauri

The choice depends on:

- team comfort with web stack reuse
- native integration needs
- update tooling preference
- performance goals

Electron is the lower-risk choice for fast productization.
Tauri may be attractive later for footprint, but Electron likely gets to market faster.

---

## Model Backend Strategy

### Current Reality

The current system expects a local model backend and works well with Ollama-compatible endpoints.

### Product Requirement

The desktop product needs a first-class model management layer, including:

- backend installation/bootstrap
- model profile recommendation
- background downloads
- progress UI
- storage budgeting
- pruning/uninstall flow
- profile switching

### Desired Model Management Features

V1 should include:

- show installed models
- show required vs optional models
- recommend model bundle during setup
- pause/resume downloads
- show disk impact before pulling
- prune unused optional models later

### User Experience Goal

Users should not need to understand model names to get started.

The UI should talk in terms of:

- Lite
- Standard
- Power
- Optional vision pack
- Optional research pack

Model names can remain visible in advanced settings.

---

## Security and Trust Boundaries

For a shared product, the following trust boundaries matter:

1. **Local machine trust**
   Personal local data belongs to the user

2. **Workspace trust**
   Shared workspace data must be access-controlled

3. **Updater trust**
   Update packages must be signed and verified

4. **Model/runtime trust**
   The app must clearly distinguish local-private state from shared-synced state

The updater must never:

- overwrite personal chats
- overwrite personal settings
- overwrite local memories
- silently delete models

Without explicit user consent or a clearly documented policy.

---

## Proposed Phased Roadmap

### Phase 1: Product Foundation

Goal:
turn the current system into a stable installable desktop runtime

Deliverables:

- desktop shell
- local runtime manager
- stable user data directories
- installer for Windows
- first-run wizard
- model profile selector
- safe updater foundation

### Phase 2: Cross-Platform Expansion

Goal:
support macOS with the same user model

Deliverables:

- macOS packaging
- signing/notarization flow
- macOS runtime bootstrap
- unified update pipeline across platforms

### Phase 3: Safe Updates

Goal:
ship updates without breaking user state

Deliverables:

- updater service
- migration framework
- rollback support
- release channel strategy

### Phase 4: Workspace Backend

Goal:
enable shared collaboration

Deliverables:

- user identity model
- workspace creation
- invitations
- membership roles
- shared project/task/chat state

### Phase 5: Shared Project Workflows

Goal:
make collaboration genuinely useful for teams

Deliverables:

- shared task views
- shared approvals
- shared workspace memory
- shared project dashboards
- shared activity timelines

### Phase 6: Refined Model Management

Goal:
make hardware-aware local AI feel consumer-grade

Deliverables:

- machine classification
- dynamic model recommendations
- optional add-on packs
- pruning and storage assistant

---

## Recommended First Implementation Order

If building starts now, the most practical order is:

1. define app/data separation contract
2. design local desktop runtime packaging
3. implement Windows installer
4. implement stable updater + migration system
5. add hardware-aware model onboarding
6. implement macOS packaging
7. build workspace backend and invitations
8. add shared workspace chat/task/memory UX

This sequence reduces rework and avoids building collaboration on top of an unstable install/update foundation.

---

## Final Position

The Apathy Coalition should become:

- a cross-platform local AI engineering desktop app
- with preserved personal state
- with safe, versioned app updates
- with adaptive model installation based on machine capability
- with optional shared workspaces backed by a collaboration service

That is the cleanest path to:

- a strong solo experience
- a believable team product
- a maintainable architecture
- a product that can later scale commercially without needing to be reinvented

