# DreamTeam Roster & Routing (`ROSTER.md`)

The single registry of who is on the panel, what each owns, and how to route a
task to the right expert(s). Source of truth for membership; each expert's full
contract lives in `experts/<slug>.md`.

## The panel (32 experts)

### Engineering & Infrastructure
| Slug | Owns (one line) | Depends on |
|---|---|---|
| `backend-architect` | Service boundaries, API contracts, scaling design | data-modeling, devops-sre, security |
| `data-modeling` | Schemas, entities, data contracts, warehouse models | backend-architect, analytics |
| `devops-sre` | Reliability, observability, incident response, SLOs | deployment-expert, security, backend-architect |
| `deployment-expert` | Release process, CI/CD pipelines, rollouts, environments | devops-sre, qa-automation |
| `security` | Appsec, threat modeling, secrets, access control | risk-governance, devops-sre, backend-architect |
| `code-quality-expert` | Code standards, reviews, maintainability, tech debt | qa-automation, backend-architect |
| `qa-automation` | Test strategy, automated testing, CI quality gates | code-quality-expert, deployment-expert |
| `fe-performance` | Frontend load/render, Core Web Vitals, bundle size | code-quality-expert, mobile-app-expert |
| `mobile-app-expert` | Native/mobile architecture, app-store, mobile perf | backend-architect, fe-performance |
| `ai-expert` | Applied AI/ML: model choice, agents, evals, feasibility | data-modeling, product-strategist, security |

### Product, Design & Learning
| Slug | Owns (one line) | Depends on |
|---|---|---|
| `product-strategist` | Vision, roadmap, prioritization, positioning | ux-researcher, analytics, pricing-strategy |
| `ux-researcher` | User research, usability testing, journey mapping | human-behavioural-scientist, product-strategist |
| `visual-designer` | Product UI visual system & design system | ux-researcher, fe-performance, graphic-designer |
| `graphic-designer` | Static brand & marketing asset production | visual-designer, authenticity-officer |
| `presentation-storytelling` | Narrative, decks, executive comms, pitch structure | graphic-designer, product-strategist |
| `teacher` | Learning design, docs, onboarding education | ux-researcher, presentation-storytelling |

### Revenue & Go-To-Market
| Slug | Owns (one line) | Depends on |
|---|---|---|
| `pricing-strategy` | Price points, tiers, packaging, discount policy | product-strategist, analytics, billing, upsell-expert |
| `billing` | Invoicing, payments, subscriptions, proration, tax | pricing-strategy, legal-compliance, security |
| `upsell-expert` | In-product expansion, upgrade prompts, cross-sell | pricing-strategy, enterprise-cs, analytics |
| `analytics` | Metrics, dashboards, experimentation, forecasting | data-modeling, product-strategist |
| `crm-expert` | CRM strategy, pipeline, lead lifecycle, sales ops | analytics, enterprise-cs |
| `enterprise-cs` | Enterprise onboarding, retention, QBRs, expansion | crm-expert, client-experience-reviewer |
| `social-meta-ads-expert` | Paid social/Meta ads, creative testing, ROAS | analytics, graphic-designer, authenticity-officer |
| `email-copy-expert` | Email/lifecycle copywriting, sequences | crm-expert, authenticity-officer |
| `client-experience-reviewer` | End-to-end CX audit, friction, journey QA | ux-researcher, enterprise-cs |

### Trust, People & Governance
| Slug | Owns (one line) | Depends on |
|---|---|---|
| `legal-compliance` | Legal risk, contracts, privacy (GDPR/CCPA), claims | risk-governance, security |
| `risk-governance` | Enterprise risk framework, decision authority, audit | legal-compliance, security |
| `conflict-resolution-analyst` | Arbitrates disagreements between experts; decision records | risk-governance, product-strategist |
| `authenticity-officer` | Truthful brand voice, anti-hype, honest claims | legal-compliance, trust-signals |
| `trust-signals` | Social proof, testimonials, certifications, badges | authenticity-officer, ux-researcher |
| `human-behavioural-scientist` | Behavioral economics, nudges, decision design | ux-researcher, psychologist |
| `psychologist` | Team/individual well-being, motivation, burnout | human-behavioural-scientist |

## Routing table — task → expert set

Pick the lead (first listed) and convene the support experts. See
`ORCHESTRATION.md` for how a convened group reaches a decision.

| If the task is about… | Lead | Support |
|---|---|---|
| Launching/repricing a plan | pricing-strategy | product-strategist, analytics, billing, risk-governance |
| A new product feature | product-strategist | ux-researcher, ai-expert, analytics, security |
| Slow app / poor UX speed | fe-performance | mobile-app-expert, backend-architect, devops-sre |
| An outage or reliability issue | devops-sre | backend-architect, security, deployment-expert |
| Shipping/release safely | deployment-expert | qa-automation, devops-sre, code-quality-expert |
| A security or privacy concern | security | legal-compliance, risk-governance |
| Data/schema or reporting | data-modeling | analytics, backend-architect |
| Growth / acquisition campaign | social-meta-ads-expert | analytics, graphic-designer, authenticity-officer, email-copy-expert |
| Conversion / sign-up friction | ux-researcher | trust-signals, human-behavioural-scientist, client-experience-reviewer |
| Expansion / retention revenue | upsell-expert | enterprise-cs, pricing-strategy, analytics |
| Brand / messaging integrity | authenticity-officer | trust-signals, legal-compliance |
| Team morale / burnout | psychologist | human-behavioural-scientist, conflict-resolution-analyst |
| Experts disagree | conflict-resolution-analyst | (the disputing experts) + risk-governance |

## Boundary map (resolved overlaps)

These pairs look similar; the boundary is deliberate:

- **visual-designer** (product UI/design system) ↔ **graphic-designer** (static brand/marketing assets).
- **ux-researcher** (research methods/evidence) ↔ **human-behavioural-scientist** (behavioral theory/nudges) ↔ **psychologist** (human well-being).
- **pricing-strategy** (the menu/price) ↔ **billing** (the till) ↔ **upsell-expert** (the in-product upgrade moment) ↔ **analytics** (the math).
- **legal-compliance** (law/regulation) ↔ **risk-governance** (risk framework/authority) ↔ **security** (technical controls).
- **authenticity-officer** (truthful voice) ↔ **trust-signals** (credibility proof elements).
