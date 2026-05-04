---
name: "Team: Debate"
description: Spawn a 2-teammate debate team (proponent + devils-advocate) to adversarially review a research note or proposal
category: Agent Teams
tags: [agent-teams, research, review]
---

Spawn a debate team to adversarially review a research note or proposal.

**Input** (`$ARGUMENTS`): one of

- A path to the target file (e.g. `openspec/changes/my-change/proposal.md`)
- Empty — ask which file

## Pre-flight

1. **Verify agent teams are enabled.** `.claude/settings.json` must contain `"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"` under `env`. If not, refuse and tell the user to add it and restart Claude Code.

2. **Verify the target file exists** and is under `openspec/` or `specifications/`. Refuse paths outside those trees — this command is for adversarial review only.

3. **Read the target end-to-end** before spawning teammates. The lead must be able to mediate; mediation needs context.

## Team spawn

Create an agent team with two teammates:

| Name | Subagent type | Model | Role |
|------|--------------|-------|------|
| `adversary` | `devils-advocate` | opus (from agent file) | Surface load-bearing critiques only |
| `defender` | `proponent` | opus (from agent file) | Defend per the four-verdict scheme |

Spawn prompts:

- **adversary**: "Adversarially review `<target>`. Read its companion docs (links in the header). Produce up to 12 critiques, cull to load-bearing only. Post each critique to the team mailbox, addressed to `defender`. Do NOT write to the target file directly until referee phase."
- **defender**: "Defend `<target>` against critiques posted by `adversary`. Use your four-verdict scheme (defend / concede-patch / concede-future / stalemate). Wait for adversary's first critique before responding. Do NOT write to the target file until referee phase."

## Mediation loop (lead's job — i.e. you)

1. Wait for adversary's first batch of critiques.
2. Forward to defender; wait for responses.
3. After one full round (adversary → defender → adversary rebuttal where defended), call halt.
4. Synthesize a `## Adversarial Review — <YYYY-MM-DD>` section appended to the target file containing:
   - Surviving critiques (from adversary, after defender's responses)
   - Patched critiques with file:line edits applied (or list of pending patches)
   - Stalemates (left as open questions)
5. Apply the patches the defender conceded — these are real edits to the target.

## Hard rules

- **Maximum two debate rounds.** If consensus or stalemate isn't reached, that's the finding.
- **No teammate edits the target directly.** Only the lead applies edits, after synthesis.
- **No Bash** — none of the agents have Bash. This is a thought-only team.
- **Token budget**: cap the team at 30 minutes wall-clock by default. If wall-clock exceeds 30 min, halt and report partial findings.

## Cleanup

After the synthesis section is written and patches applied, run team cleanup. Confirm with the user that the synthesis is acceptable before doing so.

## Argument: $ARGUMENTS
