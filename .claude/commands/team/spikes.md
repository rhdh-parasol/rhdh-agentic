---
name: "Team: Spikes"
description: Spawn N parallel spike-runner teammates to execute autonomous feasibility spikes against a spec with pass criteria
category: Agent Teams
tags: [agent-teams, spikes, feasibility]
---

Spawn parallel autonomous spike-runner teammates against a spike spec.

**Input** (`$ARGUMENTS`): one of

- A spec file path (e.g. `openspec/changes/my-change/design.md`) — spawn one teammate per spike defined in the spec
- A spec path plus a comma-separated list of spike names (e.g. `openspec/changes/my-change/design.md | catalog-api, template-engine`)
- Empty — ask which spec

## Pre-flight

1. **Verify agent teams are enabled.** `.claude/settings.json` must contain
   `"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"` under `env`. If not, refuse
   and tell the user to add it and restart Claude Code.

2. **Verify the spec file exists** and contains pass criteria. Refuse
   otherwise — spike-runners need concrete criteria to evaluate against.

3. **Verify each spike's `spikes/<name>/` does NOT already exist.** Conflict
   means refuse for that spike. Other spikes can still proceed.

4. **Confirm the user wants autonomous execution.** Spike-runners have Bash
   and will run build/test commands autonomously. If you suspect the user
   wanted to drive these manually, ask first. Skip this confirmation if the
   spec explicitly authorizes autonomous runs.

## Team spawn

Create a team with one `spike-runner` teammate per spike. For a single spike,
prefer single-shot delegation instead — teams are overkill for N=1.

For each spike, spawn with this prompt:

```
Execute spike `<spike-name>` per spec `<spec-path>`.
Run autonomously to verdict per the spike-runner agent's loop.

Hard reminders:
- Spike dir = spikes/<spike-name>/
- Write PLAN.md before building
- Append your `## Results — <YYYY-MM-DD>` section to the spec file
- Write `spikes/<spike-name>/README.md` with one-line verdict + anchor link
- Stop at 2× the spec's time-box
- Tear down any background processes you start

When done, post a one-line verdict + path to your README to the team
mailbox addressed to `lead`.
```

## Mediation loop (lead's job — i.e. you)

1. Let the teammates run. **Do not implement anything yourself** — wait.
2. As verdicts arrive, collect them. Don't synthesize until all teammates
   have reported (or hit timeout).
3. Once all teammates have reported, append a **joint synthesis** section
   to the spec file:

   ```
   ## Joint Verdict — <YYYY-MM-DD>
   - Spikes run: <list>
   - Per-spike verdicts: <table>
   - Joint recommendation: <PROCEED | FALLBACK | NO-GO> with reasoning
   - Open questions for the user: <bullets>
   ```

4. **Do not delete spike directories.** That's the user's call after they've
   read the reports.

5. List any cleanup state (running processes, temp files, dirty working
   trees) for the user.

## Hard rules

- **Spike-runners are autonomous.** Do not micromanage them. If one is stuck
  for >10 min, message it once asking for status; don't replace it unless dead.
- **Lead does not edit spike directories.** Each spike dir is owned by its
  teammate.
- **Lead does not run build/test commands for the spikes.** That's the
  teammates' job. The lead may run `git status`, `git diff` for the
  synthesis section.
- **No `git push`** from the lead during the run. The user reviews and
  commits.
- **Cleanup of the team itself**: after synthesis is written, ask the user
  to confirm before cleaning up the team.

## Argument: $ARGUMENTS
