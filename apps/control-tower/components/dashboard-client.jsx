'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const NAV_ITEMS = [
  { id: 'system-status', label: 'System Status', detail: 'Live operational overview' },
  { id: 'tasks', label: 'Tasks', detail: 'Jobs, loops, and sandbox runs' },
  { id: 'change-sets', label: 'Change Sets', detail: 'Atomic modification progress' },
  { id: 'repository', label: 'Repository', detail: 'Health, debt, and architecture' },
  { id: 'memory', label: 'Memory', detail: 'Stored knowledge and skills' },
  { id: 'teams', label: 'Teams', detail: 'DreamTeam participation metrics' },
];

function CoalitionMark({ className = '' }) {
  return (
    <svg viewBox="0 0 160 180" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id="tower-face-fill" x1="0%" x2="100%" y1="10%" y2="90%">
          <stop offset="0%" stopColor="#fbfbfb" />
          <stop offset="62%" stopColor="#efefef" />
          <stop offset="100%" stopColor="#dadada" />
        </linearGradient>
        <linearGradient id="tower-rim-fill" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#27282b" />
          <stop offset="100%" stopColor="#111214" />
        </linearGradient>
        <linearGradient id="tower-shadow-fill" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#73767b" stopOpacity="0.88" />
          <stop offset="100%" stopColor="#45484c" stopOpacity="0.12" />
        </linearGradient>
        <clipPath id="tower-face-clip">
          <ellipse cx="80" cy="90" rx="49" ry="67" />
        </clipPath>
      </defs>
      <ellipse cx="80" cy="90" rx="59" ry="79" fill="url(#tower-rim-fill)" />
      <ellipse cx="80" cy="90" rx="49" ry="67" fill="url(#tower-face-fill)" />
      <g clipPath="url(#tower-face-clip)">
        <path d="M28 14C47 32 53 58 50 95C47 127 57 153 78 173L34 173L26 13Z" fill="url(#tower-shadow-fill)" />
        <path d="M57 20C70 35 74 61 72 92C70 122 77 150 95 171L80 173C60 154 51 128 54 95C57 59 52 36 40 18Z" fill="#ffffff" fillOpacity="0.36" />
      </g>
      <path d="M44 76C56 73 69 72 79 72C74 83 64 88 50 87C47 84 45 80 44 76Z" fill="#101113" />
      <path d="M116 76C104 73 91 72 81 72C86 83 96 88 110 87C113 84 115 80 116 76Z" fill="#101113" />
      <path d="M69 124C76 121 84 121 91 124C92 126 92 129 90 130C83 132 76 132 70 131C68 129 68 126 69 124Z" fill="#101113" />
      <ellipse cx="80" cy="90" rx="49.5" ry="67.5" fill="none" stroke="#060709" strokeOpacity="0.55" strokeWidth="1.2" />
    </svg>
  );
}

function formatTime(value) {
  if (!value) return 'n/a';
  return new Date(value).toLocaleString();
}

function statusClass(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('pass') || normalized.includes('success') || normalized.includes('approve') || normalized.includes('verified')) return 'good';
  if (normalized.includes('fail') || normalized.includes('reject') || normalized.includes('error') || normalized.includes('blocked')) return 'bad';
  return 'warn';
}

function SummaryCards({ snapshot }) {
  const memoryCount = Object.values(snapshot.memory.memory || {}).reduce((sum, items) => sum + items.length, 0);
  const approvalRate = snapshot.organization.teams?.length
    ? Math.round((snapshot.organization.teams.reduce((sum, team) => sum + team.performance.approvalRate, 0) / snapshot.organization.teams.length) * 100)
    : 0;

  const cards = [
    {
      label: 'Repo Health',
      value: snapshot.repository.healthScore,
      hint: `${snapshot.repository.complexity.highDebtModuleCount} high-debt modules`,
    },
    {
      label: 'Active Tasks',
      value: snapshot.jobs.activeTasks.length,
      hint: `${snapshot.jobs.sandboxRuns.length} sandbox runs tracked`,
    },
    {
      label: 'Memory Entries',
      value: memoryCount,
      hint: `${snapshot.memory.skills.length} learned skills`,
    },
    {
      label: 'Team Approval',
      value: `${approvalRate}%`,
      hint: `${snapshot.organization.teams.length} DreamTeam groups`,
    },
  ];

  return (
    <div className="tower-summary">
      {cards.map((card) => (
        <div className="tower-panel metric-card" key={card.label}>
          <div className="label">{card.label}</div>
          <div className="value">{card.value}</div>
          <div className="hint">{card.hint}</div>
        </div>
      ))}
    </div>
  );
}

function SystemStatusSection({ snapshot }) {
  return (
    <div className="section-grid two-up">
      <div className="tower-panel content-card">
        <h2>System Status</h2>
        <p>{snapshot.repository.summary || 'Repository summary unavailable.'}</p>
        <div className="tag-row">
          <span className={`status ${statusClass(snapshot.repository.healthScore > 70 ? 'success' : snapshot.repository.healthScore > 45 ? 'warn' : 'fail')}`}>
            Health {snapshot.repository.healthScore}
          </span>
          <span className="tag">{snapshot.jobs.notifications.length} notifications</span>
          <span className="tag">{snapshot.execution.changeSets.length} tracked change sets</span>
        </div>
      </div>
      <div className="tower-panel content-card">
        <h3>Recent Signals</h3>
        <div className="list-stack">
          {snapshot.events.slice(0, 6).map((event) => (
            <div className="list-item" key={event.id}>
              <strong>{event.type}</strong>
              <div className="mono">{formatTime(event.createdAt)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TasksSection({ snapshot }) {
  return (
    <div className="section-grid two-up">
      <div className="tower-panel content-card">
        <h2>Active Tasks</h2>
        <div className="list-stack">
          {(snapshot.jobs.activeTasks.length ? snapshot.jobs.activeTasks : snapshot.jobs.recentJobs).slice(0, 10).map((task, index) => (
            <div className="list-item" key={task.jobId || task.job_id || index}>
              <strong>{task.title || task.jobType || task.job_type || 'Task'}</strong>
              <div className="mono">{task.jobId || task.job_id || task.branch || 'pending'}</div>
              {task.job && <p>{String(task.job).slice(0, 180)}</p>}
            </div>
          ))}
        </div>
      </div>
      <div className="tower-panel content-card">
        <h3>Sandbox Runs</h3>
        <div className="list-stack">
          {snapshot.jobs.sandboxRuns.slice(0, 10).map((run, index) => (
            <div className="list-item" key={`${run.type}-${run.jobId || index}`}>
              <strong>{run.type}</strong>
              <div className="tag-row">
                {run.jobId && <span className="tag mono">{run.jobId}</span>}
                {run.changeSetId && <span className="tag mono">{run.changeSetId}</span>}
                {run.status && <span className={`status ${statusClass(run.status)}`}>{run.status}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChangeSetsSection({ snapshot }) {
  return (
    <div className="tower-panel content-card">
      <h2>Change Set Progress</h2>
      <div className="list-stack">
        {snapshot.execution.changeSets.length ? snapshot.execution.changeSets.map((changeSet) => (
          <div className="list-item" key={changeSet.id}>
            <strong>{changeSet.id}</strong>
            <div className="tag-row">
              <span className={`status ${statusClass(changeSet.status)}`}>{changeSet.status}</span>
              {changeSet.files.map((file) => <span className="tag mono" key={file}>{file}</span>)}
            </div>
            {changeSet.impacted?.length ? <p>Impacted: {changeSet.impacted.join(', ')}</p> : null}
            {changeSet.verification?.length ? (
              <div className="tag-row">
                {changeSet.verification.at(-1).results.map((result) => (
                  <span className={`status ${statusClass(result.status)}`} key={`${changeSet.id}-${result.gate}`}>
                    {result.gate}: {result.status}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        )) : <div className="empty-state">No change sets tracked yet.</div>}
      </div>
    </div>
  );
}

function RepositorySection({ snapshot }) {
  return (
    <div className="section-grid two-up">
      <div className="tower-panel content-card">
        <h2>Repository Health</h2>
        <p>Health score: <strong>{snapshot.repository.healthScore}</strong></p>
        <div className="tag-row">
          <span className="tag">{snapshot.repository.complexity.moduleCount} modules</span>
          <span className="tag">{snapshot.repository.complexity.graphEdgeCount} graph edges</span>
          <span className="tag">Avg complexity {snapshot.repository.complexity.averageComplexity}</span>
        </div>
      </div>
      <div className="tower-panel content-card">
        <h3>Technical Debt Hotspots</h3>
        <div className="list-stack">
          {snapshot.repository.technicalDebt.slice(0, 10).map((module) => (
            <div className="list-item" key={module.path}>
              <strong className="mono">{module.path}</strong>
              <p>{module.responsibility}</p>
              <div className="tag-row">
                <span className="tag">{module.line_count} lines</span>
                <span className="tag">{module.function_count} functions</span>
                <span className="tag">importance {module.importance_score}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="tower-panel content-card" style={{ gridColumn: '1 / -1' }}>
        <h3>System Map Modules</h3>
        <div className="table-like">
          {snapshot.repository.modules.slice(0, 15).map((module) => (
            <div className="table-row" key={module.path}>
              <div>
                <strong className="mono">{module.path}</strong>
                <div>{module.responsibility}</div>
              </div>
              <div>{module.dependencies?.length || 0} deps</div>
              <div>{module.importance_score}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MemorySection({ snapshot }) {
  return (
    <div className="section-grid two-up">
      <div className="tower-panel content-card">
        <h2>Memory Types</h2>
        <div className="list-stack">
          {Object.entries(snapshot.memory.memory).map(([type, items]) => (
            <div className="list-item" key={type}>
              <strong>{type}</strong>
              <p>{items.length} entries</p>
              {items[0] ? <div className="mono">{items[0].title}</div> : null}
            </div>
          ))}
        </div>
      </div>
      <div className="tower-panel content-card">
        <h3>Learned Skills</h3>
        <div className="list-stack">
          {snapshot.memory.skills.length ? snapshot.memory.skills.map((skill) => (
            <div className="list-item" key={skill.id}>
              <strong>{skill.name}</strong>
              <p>{skill.description}</p>
              <div className="tag-row">
                <span className="tag">confidence {skill.confidence_score}</span>
                {skill.trigger_conditions.slice(0, 3).map((condition) => (
                  <span className="tag" key={condition}>{condition}</span>
                ))}
              </div>
            </div>
          )) : <div className="empty-state">No learned skills stored yet.</div>}
        </div>
      </div>
    </div>
  );
}

function TeamsSection({ snapshot }) {
  return (
    <div className="section-grid two-up">
      {snapshot.organization.teams.map((team) => (
        <div className="tower-panel content-card" key={team.id}>
          <h2>{team.name}</h2>
          <p>{team.expertCount} experts · {team.performance.reviews} reviews</p>
          <div className="tag-row">
            <span className="tag">approval rate {Math.round(team.performance.approvalRate * 100)}%</span>
          </div>
          <div className="list-stack" style={{ marginTop: 14 }}>
            {team.experts.slice(0, 6).map((expert) => (
              <div className="list-item" key={expert.domain}>
                <strong>{expert.name}</strong>
                <div className="mono">{expert.domain}</div>
                <p>Participation: {expert.participation}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionBody({ section, snapshot }) {
  switch (section) {
    case 'tasks':
      return <TasksSection snapshot={snapshot} />;
    case 'change-sets':
      return <ChangeSetsSection snapshot={snapshot} />;
    case 'repository':
      return <RepositorySection snapshot={snapshot} />;
    case 'memory':
      return <MemorySection snapshot={snapshot} />;
    case 'teams':
      return <TeamsSection snapshot={snapshot} />;
    case 'system-status':
    default:
      return <SystemStatusSection snapshot={snapshot} />;
  }
}

export function DashboardClient({ section, initialSnapshot }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [events, setEvents] = useState(initialSnapshot.events || []);
  const [connection, setConnection] = useState('connecting');
  const refreshTimer = useRef(null);

  useEffect(() => {
    let mounted = true;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${protocol}://${window.location.host}/control-tower/ws`);

    const refreshSnapshot = async () => {
      try {
        const res = await fetch('/api/control-tower/snapshot', { cache: 'no-store' });
        const next = await res.json();
        if (mounted) setSnapshot(next);
      } catch {}
    };

    ws.addEventListener('open', () => {
      if (mounted) setConnection('live');
    });

    ws.addEventListener('close', () => {
      if (mounted) setConnection('offline');
    });

    ws.addEventListener('message', (message) => {
      try {
        const payload = JSON.parse(message.data);
        if (payload.type === 'hello') {
          setEvents(payload.events || []);
          refreshSnapshot();
          return;
        }
        if (payload.type === 'event' && payload.event) {
          setEvents((current) => [payload.event, ...current].slice(0, 50));
          window.clearTimeout(refreshTimer.current);
          refreshTimer.current = window.setTimeout(refreshSnapshot, 180);
        }
      } catch {}
    });

    return () => {
      mounted = false;
      window.clearTimeout(refreshTimer.current);
      ws.close();
    };
  }, []);

  const activeLabel = useMemo(
    () => NAV_ITEMS.find((item) => item.id === section)?.label || 'Control Tower',
    [section]
  );

  return (
    <div className="tower-shell">
      <aside className="tower-sidebar">
        <div className="tower-brand">
          <div className="tower-mark-shell">
            <CoalitionMark className="tower-mark" />
          </div>
          <div className="tower-eyebrow">Read Only Control Plane</div>
          <h1>The Apathy Coalition Control Tower</h1>
          <p>Observe planning, execution, memory, and repository intelligence without triggering actions.</p>
        </div>
        <nav className="tower-nav">
          {NAV_ITEMS.map((item) => (
            <a href={`/dashboard/${item.id}`} key={item.id} data-active={item.id === section}>
              <strong>{item.label}</strong>
              <span>{item.detail}</span>
            </a>
          ))}
        </nav>
      </aside>

      <main className="tower-main">
        <SummaryCards snapshot={snapshot} />
        <div className="tower-panel content-card" style={{ marginBottom: 16 }}>
          <div className="feed-header">
            <div>
              <div className="tower-eyebrow">{activeLabel}</div>
              <h2 style={{ margin: '14px 0 4px' }}>Operational View</h2>
            </div>
            <div className={`status ${statusClass(connection)}`}>{connection}</div>
          </div>
          <SectionBody section={section} snapshot={snapshot} />
        </div>
      </main>

      <aside className="tower-feed">
        <div className="feed-header">
          <div>
            <h3 style={{ margin: 0 }}>Live Event Feed</h3>
            <p style={{ margin: '6px 0 0' }}>Streaming from the local control-tower event bus.</p>
          </div>
          <div className={`status ${statusClass(connection)}`}>{connection}</div>
        </div>
        <div className="feed-list">
          {events.length ? events.map((event) => (
            <div className="feed-event" key={event.id}>
              <strong>{event.type}</strong>
              <div className="mono">{JSON.stringify(event.payload).slice(0, 220)}</div>
              <time>{formatTime(event.createdAt)}</time>
            </div>
          )) : <div className="empty-state">Waiting for local system activity.</div>}
        </div>
      </aside>
    </div>
  );
}
