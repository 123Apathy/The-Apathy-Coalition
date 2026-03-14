# The Apathy Coalition Workspaces V1

This document defines the first shippable version of Workspaces for The Apathy Coalition.

The goal of V1 is not to create a full realtime collaboration platform. The goal is to create a shared project space that feels clearly better than “send screenshots in Slack” and clearly safer than “everyone shares one local machine.”

---

## V1 Goal

Enable multiple people using The Apathy Coalition to work together on the same project through:

- shared workspace membership
- shared project chat threads
- shared task history
- shared approvals and governance visibility
- shared workspace memory
- shared repository/project context

V1 should feel like:

- a shared project room
- a shared operational memory
- a shared AI planning surface

It should not try to feel like:

- Figma
- Google Docs
- a live code editor
- a full enterprise permissions suite

---

## Core Concepts

### User

A person with their own installed app, their own local settings, and their own private local state.

### Workspace

A shared collaboration container for a team, project, or initiative.

### Project

A repository or project context inside a workspace.

### Task

A discrete work item with planning, governance, execution history, and outcomes.

### Conversation

A shared chat thread attached to a workspace or project.

### Workspace Memory

Shared knowledge learned from tasks, approvals, architecture decisions, and failures within that workspace.

---

## V1 User Stories

### Owner

- I can create a workspace.
- I can invite collaborators.
- I can attach a repository/project to the workspace.
- I can see what tasks and plans are happening in the workspace.
- I can review decisions and approvals made in the workspace.

### Collaborator

- I can join a workspace through an invite.
- I can see shared workspace chats.
- I can create tasks in the workspace.
- I can review project context and workspace memory.
- I can see the status of shared plans and executions.

### Reviewer

- I can see proposed work.
- I can inspect governance outcomes.
- I can review execution and verification results.
- I can follow what changed and why.

---

## V1 Feature Set

### 1. Workspace Creation

Users can:

- create a workspace
- give it a name
- optionally add a description
- choose an icon/color

V1 scope:

- one owner
- simple creation flow

### 2. Invitations

Owners can invite users by:

- email
- invite link

V1 should support:

- pending invite state
- accept/decline flow
- expiration for unused invites

### 3. Membership Roles

V1 roles:

- `owner`
- `collaborator`
- `reviewer`

V1 permissions should stay simple.

### 4. Shared Workspace Chat

Users can:

- create shared chat threads inside the workspace
- post messages into shared threads
- see message history
- attach tasks to threads

Important:

- these are not personal chats
- they are visible to workspace members

### 5. Shared Project Context

Workspace can hold one or more project entries with:

- project name
- repository binding
- default branch
- optional notes

This allows workspace chats and tasks to be project-aware.

### 6. Shared Tasks

Tasks in a workspace should store:

- title
- creator
- status
- linked conversation
- linked project
- planning artifacts
- approvals/governance state
- execution history

Suggested statuses:

- `draft`
- `planning`
- `awaiting-review`
- `approved`
- `running`
- `completed`
- `failed`

### 7. Shared Governance Visibility

Workspace members should be able to see:

- Task Market winner
- DreamTeam decision
- approval state
- rejection/escalation reasons

This gives the team a shared understanding of what the AI system decided.

### 8. Shared Workspace Memory

Workspace-scoped memory should store:

- architecture decisions
- governance learnings
- failures
- project learnings

It should be distinct from:

- personal memory
- global/system memory

### 9. Activity Feed

Workspace should include a simple chronological feed for:

- member joined
- task created
- plan approved
- task started
- task completed
- task failed
- memory written

This gives V1 a strong “team room” feel.

---

## What V1 Should Explicitly Not Include

Do not build these into V1:

- realtime collaborative text editing
- shared terminal sessions
- cross-machine peer-to-peer sync
- branch protection configuration UI
- granular object-level ACLs
- workspace billing
- enterprise SSO
- deep analytics

These can come later.

---

## Personal vs Workspace Boundaries

### Personal stays personal

V1 should keep these private:

- personal settings
- personal model preferences
- personal private chats
- personal notification settings
- local-only memory

### Shared becomes shared

V1 should share:

- workspace threads
- workspace tasks
- workspace approvals
- workspace memory
- workspace project context

This distinction needs to be very visible in the UI.

---

## Suggested V1 UX

### Navigation

New top-level concept:

- `Workspaces`

Inside a workspace:

- Overview
- Chats
- Tasks
- Projects
- Memory
- Activity
- Members

### Workspace Overview

Should show:

- recent tasks
- active conversations
- latest decisions
- recent activity
- project list

### Task Detail

Should show:

- task description
- context sources used
- Task Market result
- DreamTeam outcome
- execution state
- verification state
- linked discussion

This is one of the most important pages in the whole feature.

---

## Data Model

Suggested V1 entities:

- `users`
- `workspaces`
- `workspace_members`
- `workspace_invites`
- `workspace_projects`
- `workspace_conversations`
- `workspace_messages`
- `workspace_tasks`
- `workspace_activity_events`
- `workspace_memory_entries`

Important design rule:

Every shared object should be workspace-scoped by default.

---

## API Requirements

V1 backend needs:

- create workspace
- list workspaces for user
- invite user
- accept invite
- list workspace members
- create workspace conversation
- list workspace conversations
- create workspace task
- update task status
- list task details
- list activity feed
- write/read workspace memory

---

## Security Requirements

V1 must enforce:

- only members can see workspace content
- only owners can manage membership
- reviewers/collaborators have bounded permissions
- workspace memory is isolated from other workspaces
- personal chats never leak into workspace chats

---

## Recommended V1 Build Order

1. workspace entities + membership
2. invitations
3. workspace overview
4. shared conversations
5. shared tasks
6. approvals/governance visibility
7. workspace memory
8. activity feed

---

## Success Criteria

V1 is successful if:

- two or more people can join the same workspace
- they can see shared project chat and task state
- they can follow planning and governance together
- shared project memory improves continuity
- the UX clearly distinguishes personal vs shared state

