# Agentic Development

How we practice agentic SDLC in this project — and how you can adopt it in yours.

## The Core Idea

Traditional SDLC roles (product manager, architect, developer) each have well-defined responsibilities, artifacts, and review loops. In an agentic SDLC, each of these roles is supported by a **dedicated agent skill** — a version-controlled definition that encodes what the role does, what it produces, and how it evaluates the work of others.

The human remains in control. The agent handles process; the human makes decisions.

## Skills as Process-as-Code

A skill is a structured definition that lives in `.claude/skills/` alongside the codebase. It typically contains:

```
.claude/skills/<persona>/
├── SKILL.md           # Role definition, triggers, principles
├── workflows/         # Step-by-step procedures for each loop
└── templates/         # Output formats (specs, reviews, issues)
```

Because skills are version-controlled, the team's process evolves with the code. A new contributor — human or agent — picks up the current process by cloning the repo.

### Current Personas

**Product Manager** (`product-manager`) owns the *what* and *why*:

- **Vision** — Takes a high-level goal and produces a Product Requirements Document (PRD)
- **Discovery** — Refines an approved PRD into a Functional Specification Document (FSD)
- **Decomposition** — Breaks an approved FSD into GitHub issues with acceptance criteria
- **Acceptance** — Reviews PRs against the FSD: does this ship what was specified?

**Architect** (`architect`) owns the *how* and *trade-offs*:

- **Decision** — Captures architectural choices in Architecture Decision Records (ADRs)
- **Specification** — Translates ADR decisions into Tier-2 technical specs (data models, APIs)
- **Review** — Reviews PRs for structural compliance with architectural decisions

**Tech Lead** (`tech-lead`) owns *implementation planning and epic decomposition*:

- **Planning** — Breaks a PRD into implementation epics scoped for agent sessions
- **Coordination** — Creates GitHub Issues for approved epics (optional coordination layer)
- **Review** — Reviews PRs against epic acceptance criteria

**Developer** (`developer`) owns *implementation and quality* *(planned)*:

- Implementation against spec and ADR constraints
- Test coverage and inner-loop feedback
- PR response and iteration

### Collaboration Through Artifacts

Personas don't talk to each other directly — they collaborate through **shared artifacts**:

```
Product Manager        Tech Lead           Architect              Developer
      │                    │                    │                      │
      ├─── PRD ──────────► │                    │                      │
      ├─── FSD ────────────────────────────────► │                      │
      │                    │ (reads PRD + FSD)   │                      │
      │                    ├─── Epics ─────────────────────────────────►│
      │                    │                    ├─── ADR ──────────────►│
      │                    │                    ├─── Technical Spec ───►│
      │                    │                    │                       │
      │◄── PR (acceptance) │◄── PR (epic review)│◄── PR (structural)   │
```

Each persona's skill defines its own review criteria, so a single PR can receive both an acceptance review (does it meet the spec?) and a structural review (does it follow the architecture?).

### Current Tooling

Artifacts (PRDs, FSDs, ADRs) are tracked **in the repository** as markdown files under `specifications/`. Discussions happen in **GitHub PRs and Issues** — PRs for artifact review, issues for work items produced by decomposition.

This is intentional: starting with repo + GitHub keeps everything version-controlled, auditable, and close to the code. Once the workflow is proven, artifacts and coordination can migrate to external tools (Jira, Confluence, etc.) without changing the underlying skill definitions — the skills define *what* to produce and *how* to review, not *where* to store it.

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

- A product manager invokes `/product-manager` to write an FSD from a goal
- An architect invokes `/architect` to capture a decision as an ADR
- Reviews happen through skill-defined templates, ensuring consistent evaluation criteria

### Level 2: Multi-Persona Workflows

Personas are aware of each other's artifacts and constraints. The PM's FSD feeds the architect's technical spec, which constrains the developer's implementation.

**What you get:**

- Traceability from goal → spec → decision → implementation → review
- Each persona reviews from its own perspective, catching different classes of issues
- Artifacts serve as the shared language between humans and agents

**What it looks like in practice:**

- The PM writes a PRD, refines it into an FSD, and decomposes it into issues
- The architect creates ADRs for key decisions, referencing the FSD
- The developer implements against both, and the PR receives reviews from both personas

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
3. **Read the skill definitions** — `SKILL.md` files document each persona's responsibilities and workflows
4. **Adapt for your team** — Modify skills, add new personas, or adjust review criteria to match your process

## What We're Learning

This project is both the tooling and the experiment. As we build RHDH Agentic using agentic practices, we're learning what works:

- **Skills need to be opinionated but not rigid** — Too loose and the agent improvises; too strict and it can't handle edge cases
- **Artifacts are the integration layer** — Agents collaborate through documents, not conversations
- **Review loops are essential** — Without skill-defined review criteria, agent output drifts from organizational standards
- **Process-as-code scales** — When the process is version-controlled, it can be tested, reviewed, and improved like any other code
