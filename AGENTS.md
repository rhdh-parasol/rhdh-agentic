# AGENTS.md

## Development Principles

- **Upstream-first**: Align with Backstage upstream (e.g MCP Actions, BEP-0013 skills) wherever possible
- **Intent over mechanism**: The CLI provides high-level, intent-based commands — not raw API wrappers
- **Agent-native**: Design for machine consumption first (structured output, predictable errors), human-readable second

## OpenSpec artifact validation

This repo uses OpenSpec for structured change management. Changes progress
through a defined artifact sequence:

    proposal → specs → design → tasks → implementation

When reviewing PRs that modify files under `openspec/changes/`, use the
`openspec-review` skill to evaluate artifact sequencing and quality.
Skip it entirely if the PR does not touch OpenSpec files.
