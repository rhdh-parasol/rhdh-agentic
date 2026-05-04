# Agentic Development

How we practice agentic SDLC in this project — and how you can adopt it in yours.

## The Core Idea

Traditional SDLC roles (product manager, architect, developer) each have well-defined responsibilities, artifacts, and review loops. In an agentic SDLC, each of these roles is supported by a **dedicated agent skill** — a version-controlled definition that encodes what the role does, what it produces, and how it evaluates the work of others.

The human remains in control. The agent handles process; the human makes decisions.

## Skills as Agent Identities

A skill defines a persona — who the agent is, what it cares about, what it produces, and where it stops. Skills live in `.claude/skills/` alongside the codebase:

```
.claude/skills/<persona>/
├── SKILL.md           # Identity, principles, artifacts, boundaries
├── templates/         # Output formats (specs, reviews)
└── workflows/         # Step-by-step procedures (optional, per skill)
```

Because skills are version-controlled, the team's process evolves with the code. A new contributor — human or agent — picks up the current process by cloning the repo.

### Current Personas

**Product Manager** (`product-manager`) owns the *what* and *why*:

- Writes and maintains Product Requirements Documents (PRDs)
- Reviews PRs for product alignment and scope drift
- Guards product scope — if it's not in the PRD, it's not a requirement

**Architect** (`architect`) owns the *how* and *trade-offs*:

- Captures structural decisions in Architecture Decision Records (ADRs)
- Reviews PRDs for architectural readiness
- Reviews PRs for structural soundness against ADR decisions

### OpenSpec for Change Management and Task Decomposition

We use **[OpenSpec](https://openspec.dev/)** to manage changes through a structured artifact workflow. Each change lives in `openspec/changes/<name>/` and progresses through a defined sequence: proposal → specs → design → tasks → implementation → archive.

OpenSpec handles what was previously split across multiple personas:

- **Specs** replace Functional Specification Documents (FSDs) — defining what needs to be built
- **Tasks** replace epics — decomposing work into implementable units

This separation keeps personas focused on identity (principles and judgment) while OpenSpec handles lifecycle (sequencing and decomposition).

**Key commands:**

| Command | What it does |
|---|---|
| `/opsx:onboard` | Guided walkthrough of a complete workflow cycle |
| `/opsx:new` | Start a new change, step through artifacts one at a time |
| `/opsx:apply` | Implement tasks from a change |
| `/opsx:archive` | Archive a completed change |

Run `/opsx:onboard` to learn the workflow by doing it on a real task in the codebase.

### Collaboration Through Artifacts

Personas don't talk to each other directly — they collaborate through **shared artifacts**:

```
Product Manager        Architect             Developer
      │                    │                    │
      ├─── PRD ──────────► │                    │
      │                    ├─── ADR ───────────►│
      │                    │                    │
      │     OpenSpec: specs + tasks ───────────►│
      │                    │                    │
      │◄── PR (product)    │◄── PR (technical)  │
```

Each persona's skill defines its own review criteria, so a single PR can receive both a product review (does it deliver what the PRD asks for?) and a technical review (does it follow the architecture?).

### Current Tooling

Artifacts are tracked **in the repository** as markdown files — PRDs and ADRs under `specifications/`, feature and domain specs under `openspec/specs/`. GitHub serves as an optional **coordination layer** for status tracking (PRs, labels) — not the source of truth for artifacts. Agents read specs from the repo, not from issue bodies.

This is intentional: keeping artifacts in the repo makes them version-controlled, auditable, and close to the code. The skills define *what* to produce and *how* to review, not *where* to coordinate — so the coordination layer (GitHub, Jira, etc.) can change without affecting the skill definitions.

### PR Review & Merge Workflow

Pull requests are the primary coordination point between humans and agents. The project uses a set of conventions designed for agentic collaboration:

**Review routing** — The GitHub **Reviewers** field is used to request reviews. The **Assignee** field is not used for review routing. Draft PRs do not trigger reviews — use drafts for work-in-progress that isn't ready for feedback.

**Multi-perspective review** — A single PR can receive reviews from multiple agent personas, each evaluating from its own angle:

- **Product Manager** — Does this PR deliver what the PRD asks for? (acceptance against PRD goals)
- **Architect** — Does the implementation comply with ADR decisions and structural constraints? (technical review)

Each persona has its own review principles and verdict template, so review criteria are consistent and auditable.

**No self-merging** — Every PR requires review from another team member. Even when both parties use AI agents to assist, the human on the other side makes the approve/reject decision.

**Auto-merge** — A GitHub Actions workflow enables auto-merge (squash) on every non-draft PR targeting `main`. The PR does not merge immediately — GitHub waits for branch protection conditions (green checks + approval) before merging. This removes the manual "click merge" step and lets the team focus on review quality rather than merge logistics.

## Sharing Skills Across Teams

Skills are portable. A team that develops effective agent workflows can share them at three levels:

**Within a repository** — Skills in `.claude/skills/` are available to anyone who clones the repo. This is where persona skills like `product-manager` and `architect` live — they encode project-specific process and travel with the code.

**Across repositories** — Skills can be packaged as [Claude Code plugins](https://docs.anthropic.com/en/docs/claude-code/plugins) and installed into any project. A plugin is a standalone repository with a `.claude-plugin` manifest, skills, and optionally its own CLI tooling. Teams install plugins and enable them in `.claude/settings.json`.

A working example is **[rhdh-skill](https://github.com/durandom/rhdh-skill)** — a Claude Code plugin for RHDH plugin lifecycle management (onboarding, updating, and triaging plugins in the Extensions Catalog). It demonstrates the pattern:

- Domain-specific skills and workflows packaged as a plugin
- A lightweight Python CLI for environment discovery and session context
- Slash commands (`/onboard-plugin`, `/update-plugin`, `/fix-plugin-build`) that encode multi-step domain workflows

```bash
# Install the plugin
claude plugin marketplace add durandom/rhdh-skill
claude plugin install --scope project rhdh
```

**Across organizations** — Open-source skills (like those developed in this project and `rhdh-skill`) can be adopted and adapted by other teams building on RHDH and Backstage.

The goal is a composable ecosystem: teams combine process skills (from this repo) with domain skills (like `rhdh-skill`) and customize them for their context.

## Maturity Levels

### Level 1: Shared Skills

The foundation. Each SDLC persona has a skill. Skills are version-controlled and travel with the repo.

**What you get:**

- Consistent process regardless of which human (or agent) is doing the work
- New team members onboard by reading skill definitions, not tribal knowledge
- Process changes are reviewed in PRs like any other code change

**What it looks like in practice:**

- A product manager invokes `/product-manager` to write a PRD from a product goal
- An architect invokes `/architect` to capture a decision as an ADR
- Reviews happen through skill-defined principles, ensuring consistent evaluation criteria

### Level 2: Multi-Persona Workflows

Personas are aware of each other's artifacts and constraints. The PM's PRD feeds the architect's ADRs, and OpenSpec decomposes the work into specs and tasks for the developer.

**What you get:**

- Traceability from goal → PRD → ADR → spec → task → implementation → review
- Each persona reviews from its own perspective, catching different classes of issues
- Artifacts serve as the shared language between humans and agents

**What it looks like in practice:**

- The PM writes a PRD that defines the product vision and goals
- The architect creates ADRs for key decisions
- OpenSpec produces specs and tasks, ordered by dependency
- The developer implements against specs and ADRs, and the PR receives a product review (PM) and a technical review (architect)

### Level 3: Agents in Systems

Agents participate beyond the IDE — in CI/CD pipelines, deployment workflows, and Day-2 operations. Multiple coding assistants and automation systems consume the same organizational context.

**What you get:**

- CI/CD agents that don't just gate — they triage failures, propose fixes, and flag compliance gaps
- Multiple tools (Claude Code, Cursor, Copilot, custom agents) share the same organizational knowledge through the RHDH CLI
- RHDH becomes the coordination plane: the catalog knows which agents are active, what they've changed, and what constraints apply

**What it looks like in practice:**

- A CI agent detects a failing build, reads the relevant ADR, and proposes a fix that respects architectural constraints
- A deployment agent checks the catalog for downstream dependencies before rolling out a change
- An operations agent monitors service health and creates issues with full organizational context

## Getting Started

1. **Clone the repo** — Skills in `.claude/skills/` are immediately available
2. **Try a persona** — Run `/product-manager` or `/architect` to see how skills guide agent behavior
3. **Read the skill definitions** — `SKILL.md` files document each persona's identity, principles, and boundaries
4. **Adapt for your team** — Modify skills, add new personas, or adjust review criteria to match your process

## What We're Learning

This project is both the tooling and the experiment. As we build RHDH Agentic using agentic practices, we're learning what works:

- **Skills need to be opinionated but not rigid** — Too loose and the agent improvises; too strict and it can't handle edge cases
- **Artifacts are the integration layer** — Agents collaborate through documents, not conversations
- **Review loops are essential** — Without skill-defined review criteria, agent output drifts from organizational standards
- **Process-as-code scales** — When the process is version-controlled, it can be tested, reviewed, and improved like any other code
