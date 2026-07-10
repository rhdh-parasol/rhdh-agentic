# Backstage Agent Workspace

This is a Backstage plugin workspace for agentic experimentation.

## Layout

- `packages/backend/` — dev server (`createBackend()`)
- `plugins/agent-common/` — shared types and constants for agent plugins

## Commands

All commands run from this directory (`workspaces/backstage-agent/`):

```bash
yarn install          # install deps (uses workspace-level lockfile)
yarn tsc              # typecheck all packages
yarn test             # run tests for all packages
yarn lint             # lint changed files
yarn build:all        # build all packages
```

## Rules

- Never run yarn install from the monorepo root for workspace work
- Scope tests to the affected package: `cd plugins/<name> && yarn test`
- After editing plugin source, run `yarn fix` and `yarn build:api-reports`
  to keep generated metadata in sync
