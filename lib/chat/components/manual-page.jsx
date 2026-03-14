'use client';

import { PageLayout } from './page-layout.js';
import { ApathyLogo } from './apathy-logo.js';

function Section({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="space-y-4 text-sm text-foreground/90">
        {children}
      </div>
    </section>
  );
}

function BulletList({ items }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function ManualPage({ session }) {
  return (
    <PageLayout session={session}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
        <section className="rounded-3xl border border-border bg-gradient-to-br from-background via-card to-muted/40 p-8">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_220px] md:items-center">
            <div className="max-w-3xl space-y-4">
              <span className="inline-flex rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                The Apathy Coalition Manual
              </span>
              <h1 className="text-3xl font-semibold tracking-tight">
                The Apathy Coalition is your local autonomous engineering workspace.
              </h1>
              <p className="text-base leading-7 text-muted-foreground">
                It is not just a chat app and it is not just a coding agent. The Apathy Coalition combines memory,
                repository intelligence, planning, governance, sandboxed execution, verification, and
                observability so you can work with it like an AI engineering partner instead of a single prompt.
              </p>
            </div>
            <div className="mx-auto w-full max-w-[220px]">
              <ApathyLogo framed className="h-[220px] w-full" />
            </div>
          </div>
          <div className="grid gap-3 pt-6 md:grid-cols-3">
              {[
                ['Understand the repo', 'Code search, system mapping, graph impact, and architecture summaries.'],
                ['Plan work safely', 'Task Market, DreamTeam review, change sets, and simulation.'],
                ['Execute and learn', 'Sandbox jobs, verification gates, rollback behavior, and memory writing.'],
              ].map(([title, text]) => (
                <div key={title} className="rounded-xl border border-border bg-background/80 p-4">
                  <div className="text-sm font-semibold">{title}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{text}</div>
                </div>
              ))}
          </div>
        </section>

        <Section
          title="What The Apathy Coalition Can Do"
          description="The core capabilities you already have in this install."
        >
          <BulletList
            items={[
              'Chat with a routed local model stack instead of a single fixed model.',
              'Create autonomous coding jobs that work on isolated job branches instead of directly touching main.',
              'Search the repository semantically and structurally before making changes.',
              'Generate competing plans with multiple agent roles and rank them before review.',
              'Run DreamTeam governance before execution for safer decisions on risky work.',
              'Break work into change sets, run verification gates, and roll back when validation fails.',
              'Observe activity through Control Tower, notifications, runners, and repository health views.',
              'Learn over time through memory, skills, cached plans, and codebase intelligence.',
            ]}
          />
        </Section>

        <Section
          title="How To Work With It"
          description="The simplest mental model for getting good results."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="text-sm font-semibold">For normal tasks</div>
              <BulletList
                items={[
                  'Open chat and describe the outcome you want, not just the code you want written.',
                  'Mention the repository area, desired constraints, and what success looks like.',
                  'Let The Apathy Coalition retrieve memory, skills, repo search context, and graph impact.',
                  'Review the proposed direction before you ask it to execute anything major.',
                ]}
              />
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="text-sm font-semibold">For bigger changes</div>
              <BulletList
                items={[
                  'Ask for a plan first when the task spans multiple modules or subsystems.',
                  'Use settings to steer model preferences, memory usage, tone, and notifications.',
                  'Watch the Task Market, DreamTeam, and runner behavior through the UI and Control Tower.',
                  'Prefer incremental workflows so change sets and verification can do their job.',
                ]}
              />
            </div>
          </div>
        </Section>

        <Section
          title="Recommended Prompt Pattern"
          description="If you are not sure how to phrase something, this is the strongest default shape."
        >
          <div className="rounded-xl border border-border bg-background p-4 font-mono text-sm leading-6 whitespace-pre-wrap">
{`Goal:
What outcome do I want?

Context:
What part of the app or repository is involved?

Constraints:
What should be preserved, avoided, or treated carefully?

Success criteria:
What should be true when this is done?

Example:
"I want to improve the settings experience. Focus on speed and clarity. Keep the existing sidebar style. Do not break the current workflow pages. I want the result to feel more polished and faster to navigate."`}
          </div>
        </Section>

        <Section
          title="How Planning Works"
          description="This is the internal lifecycle behind a meaningful engineering task."
        >
          <div className="rounded-xl border border-border bg-background p-4 font-mono text-sm leading-6 whitespace-pre-wrap">
{`Task
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
-> Memory + skill learning`}
          </div>
          <p className="text-sm text-muted-foreground">
            The important thing is that The Apathy Coalition is layered on purpose. It does not just jump from prompt
            to code. It tries to understand context, select a plan, review risk, and only then move into
            sandboxed execution.
          </p>
        </Section>

        <Section
          title="Feature Guide"
          description="What each major area in the app is for."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ['Chat', 'Your main working surface. Best for asking for plans, changes, reviews, debugging help, and guided execution.'],
              ['Settings', 'Personalization, memory controls, model preferences, notification preferences, appearance, and operational settings like crons, triggers, and secrets.'],
              ['Runners', 'Operational view of job execution, active runs, and automation state.'],
              ['Clusters', 'Environment and runtime-oriented views for grouped execution surfaces and related tooling.'],
              ['Approvals', 'Pending PR and review related surfaces. Useful for seeing what is waiting on human confirmation.'],
              ['Control Tower', 'Read-only operational dashboard for system activity, execution progress, memory, repository health, and teams.'],
            ].map(([title, text]) => (
              <div key={title} className="rounded-xl border border-border bg-background p-4">
                <div className="text-sm font-semibold">{title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{text}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Workflow Recipes"
          description="Practical ways to use The Apathy Coalition for personal development work."
        >
          <div className="grid gap-4 md:grid-cols-3">
            {[
              [
                'UI polish',
                [
                  'Ask for a critique of the current screen.',
                  'Request a plan before implementation.',
                  'Approve a focused execution path.',
                ],
              ],
              [
                'Bug fixing',
                [
                  'Describe the bug and how to reproduce it.',
                  'Ask which files are most likely involved.',
                  'Let The Apathy Coalition plan and test the fix incrementally.',
                ],
              ],
              [
                'Refactors',
                [
                  'State the architectural goal clearly.',
                  'Ask for risk assessment and affected modules first.',
                  'Prefer change sets and verification over one-shot rewrites.',
                ],
              ],
            ].map(([title, steps]) => (
              <div key={title} className="rounded-xl border border-border bg-background p-4">
                <div className="text-sm font-semibold">{title}</div>
                <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {steps.map((step, index) => (
                    <li key={step} className="flex gap-2">
                      <span className="font-mono text-foreground">{index + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Settings That Matter Most"
          description="If you only configure a few things, start here."
        >
          <BulletList
            items={[
              'Personalization: set your preferred tone, coding style, and persistent instructions.',
              'Memory: control whether long-term memory is used and which memory types should be included.',
              'Models: choose preferred defaults for chat, reasoning, coding, and embeddings while keeping router behavior intact.',
              'Notifications: decide what shows up in your in-app bell and what kinds of events deserve attention.',
              'Appearance: tune the UI feel without changing the actual system behavior.',
            ]}
          />
        </Section>

        <Section
          title="Safety Model"
          description="Why The Apathy Coalition feels more controlled than a normal coding assistant."
        >
          <BulletList
            items={[
              'Execution is designed to happen in sandbox job workflows instead of directly on main.',
              'DreamTeam governance acts as a review layer before higher-risk execution.',
              'Change sets and verification gates help stop bad modifications earlier.',
              'Failure memory and rollback behavior help the system learn from mistakes instead of repeating them blindly.',
              'Control Tower gives you visibility so you can inspect what the system is doing and why.',
            ]}
          />
        </Section>
      </div>
    </PageLayout>
  );
}
