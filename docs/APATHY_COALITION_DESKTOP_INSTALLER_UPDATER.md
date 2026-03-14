# The Apathy Coalition Desktop Installer and Updater Design

This document defines the technical shape of the desktop distribution and update system for Windows and macOS.

The central rule is simple:

**App updates must upgrade the product without overwriting user state.**

---

## Goals

The installer and updater must support:

- one-click install
- first-run onboarding
- machine-aware model selection
- safe base-app updates
- persistent user data
- rollback when updates fail
- Windows and macOS support

---

## High-Level Architecture

The desktop product should consist of:

1. **Desktop shell**
   Electron or Tauri

2. **Local runtime**
   A bundled local service that runs the app backend

3. **Model backend**
   Ollama or compatible local model runtime

4. **Updater service**
   Handles application package download, validation, installation, and rollback

5. **User data directory**
   Separate from app/runtime files

---

## Separation of Concerns

### App Layer

Replaceable on upgrade:

- desktop shell
- runtime binaries
- packaged frontend assets
- bundled service scripts
- migrations

### User Layer

Persistent across upgrades:

- chats
- settings
- memory
- workspaces
- logs
- caches
- model store

### Model Layer

Persistent, but version-managed separately:

- installed models
- model profiles
- optional packs

This should not be blindly wiped during app updates.

---

## Recommended File Layout

### Windows

App:

- `%ProgramFiles%/ApathyCoalition/`

User data:

- `%LOCALAPPDATA%/ApathyCoalition/`

### macOS

App:

- `/Applications/The Apathy Coalition.app`

User data:

- `~/Library/Application Support/The Apathy Coalition/`

### Shared Logical Structure

```text
app/
  current-version/
  previous-version/

user-data/
  db/
  config/
  memory/
  workspaces/
  chats/
  logs/
  cache/
  models/
```

---

## Installer Responsibilities

The installer should:

- install app shell
- install local runtime
- set up app data directories
- create required permissions/directories
- register startup hooks or local services if needed
- launch first-run wizard

The installer should **not**:

- silently install the largest model pack
- overwrite an existing user data directory
- require the user to manually edit environment files

---

## First-Run Wizard

The first-run wizard should perform:

### Environment Checks

- OS version
- CPU architecture
- RAM
- available disk
- GPU availability if detectable

### Product Setup

- initialize local database
- initialize memory directories
- create default user profile
- configure local runtime

### Model Setup

- recommend model profile
- show expected disk footprint
- let user choose or override
- start model downloads
- show progress

### User Experience

The user should understand:

- what is being installed
- how much disk it uses
- how long setup may take
- what can be added later

---

## Model Profile System

### Recommended Profiles

#### Lite

Target:

- 16 GB RAM or constrained machines

Use:

- smaller chat model
- smaller coding model
- embeddings
- minimal optional extras

#### Standard

Target:

- common developer laptop

Use:

- balanced local stack
- reasoning model
- coding model
- embeddings
- optional vision later

#### Power

Target:

- high-RAM / high-VRAM machines

Use:

- larger reasoning/coding stack
- vision/OCR available
- full local capability

### Required Product Behavior

The app should:

- recommend a profile automatically
- let advanced users override it
- allow adding/removing optional packs later

---

## Update System

### Update Goals

- update app/runtime only
- preserve user state
- run migrations safely
- support rollback

### Update Flow

1. detect new version
2. download update package
3. validate checksum/signature
4. stage update into new app directory
5. stop app/runtime
6. apply update
7. run migrations
8. perform health check
9. switch active version
10. restore previous version on failure

### Health Check

Minimum checks:

- runtime starts
- local API responds
- DB migration succeeds
- UI boots

---

## Migration Strategy

### Required Migration Categories

- DB schema
- settings schema
- workspace schema
- memory schema

### Migration Rules

- every migration must be versioned
- migrations must be logged
- migrations should be reversible when practical
- failed migrations must block the version switch

---

## Rollback Strategy

If an update fails:

- keep the user data directory intact
- revert the runtime/app version
- log the failure
- surface a friendly recovery message

Rollback must not delete:

- chats
- settings
- memory
- workspace data
- models

---

## Release Channels

Suggested channels:

- `stable`
- `beta`
- `nightly` later if needed

Each install should track one channel.

Users should be able to:

- see current version
- see target version
- choose whether to stay on stable or opt into beta

---

## Windows-Specific Notes

Recommended:

- signed installer
- background updater service or scheduled task
- runtime launched in user context unless privileged behavior is required

The Windows version should avoid requiring the user to manually open PowerShell or WSL.

---

## macOS-Specific Notes

Recommended:

- signed and notarized app
- launch agent for background helper if needed
- all runtime paths normalized under Application Support

The macOS experience should feel native and not depend on Terminal for normal use.

---

## Packaging Choice

### Recommendation

Electron is likely the most practical first choice because:

- you can reuse the current web UI directly
- it reduces time-to-product
- updater tooling is mature
- Windows and macOS support is straightforward

Tauri remains a valid later optimization path if footprint becomes a priority.

---

## Security Requirements

The updater must:

- validate packages before install
- never overwrite user data blindly
- protect release channel integrity
- avoid exposing sensitive user state in logs

---

## Success Criteria

This system is successful when:

- a user can install without touching a terminal
- a user can update without losing personal state
- the app recovers from failed updates
- model setup is understandable and guided
- Windows and macOS users get comparable experiences

