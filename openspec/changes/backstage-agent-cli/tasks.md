## 1. Project Scaffolding

- [x] 1.1 Initialize `backstage-agent/` package with `package.json` (Commander.js, `@backstage/cli-node`, `js-yaml` deps), `tsconfig.json`, and `bin/backstage-agent` entry point
- [x] 1.2 Create `src/` directory structure: `commands/auth/`, `commands/config/`, `lib/`, `output/`
- [x] 1.3 Set up build script (tsc) and verify the CLI binary runs `backstage-agent --help` with a placeholder

## 2. Output Layer

- [x] 2.1 Define TypeScript types for the success envelope (`data`, `hints`, `trustLevel`) and error envelope (`error.code`, `error.message`, `error.recovery`, `hints`) in `src/output/formatter.ts`
- [x] 2.2 Implement JSON formatter that writes the success envelope to stdout and the error envelope to stderr with correct exit codes (`0` success, `1` runtime error, `2` usage error)
- [x] 2.3 Implement human-readable text formatter (`--output text`) that renders envelopes as readable tables/lines
- [x] 2.4 Implement `src/output/hints.ts` with helper functions for generating next-step hint strings

## 3. Config and Trust Policy

- [x] 3.1 Implement config file reader/writer for `~/.config/backstage-agent/config.yaml` with `trustPolicy` field (values: `read-only`, `reversible`, `all`; default: `all`)
- [x] 3.2 Implement trust level comparison logic: given a command's trust level and the configured policy, determine whether execution is allowed (each policy level includes all levels below it)
- [x] 3.3 Implement trust policy enforcement as a pre-execution check that blocks commands exceeding the policy and emits a `TRUST_POLICY_VIOLATION` error envelope. Exempt `config set-trust-policy` and all `auth` commands from enforcement (they manage CLI state, not Backstage state)
- [x] 3.4 Implement `backstage-agent config set-trust-policy <level>` command that updates the config file and returns a confirmation envelope

## 4. Auth Module

- [x] 4.1 Implement `src/lib/auth.ts` wrapping `CliAuth` from `@backstage/cli-node` — expose `getAuthenticatedFetch(instanceName?)` that creates a `CliAuth` instance, calls `getAccessToken()`, and returns a fetch function with the Bearer token
- [x] 4.2 Implement instance resolution logic: `--instance <name>` flag → selected instance from `~/.config/backstage-cli/auth-instances.yaml` → error with hint to run `auth login`
- [x] 4.3 Implement `backstage-agent auth login --backend-url <url>` command: derive instance name from hostname (or accept `--instance`), run OAuth 2.0 Authorization Code + PKCE flow using `oauth4webapi` (CliAuth does not expose a login method — only token read/refresh), write credentials to backstage-cli storage paths, mark instance as selected, update existing instance on re-login, optionally set trust policy via `--trust-policy <level>`. Declare trust level: `reversible`
- [x] 4.4 Implement `backstage-agent auth login --no-browser` mode: print authorization URL to stdout, accept pasted callback URL
- [x] 4.5 Implement `backstage-agent auth status` command: list all stored instances with name, backendUrl, tokenExpiresAt, and selected flag. Return success envelope with empty `instances` array (not an error) when no credentials are stored. Declare trust level: `read-only`
- [x] 4.6 Implement `backstage-agent auth select <name>` command: switch the selected instance by flipping `selected: true` in credential storage without re-authenticating. Declare trust level: `reversible`
- [x] 4.7 Implement `backstage-agent auth logout` command: remove credentials for selected instance (or `--instance <name>` if specified). When the selected instance is removed and other instances remain, clear the `selected` flag (require `auth select` before next command). Declare trust level: `reversible`
- [x] 4.8 Implement `backstage-agent auth whoami` command: call `/api/auth/v1/userinfo` with stored Bearer token, return `userEntityRef` and `ownershipEntityRefs` from claims. Declare trust level: `read-only`

## 5. CLI Core Integration

- [x] 5.1 Set up root Commander program in `src/index.ts` with global options `--output json|text` (default: `json`) and `--instance <name>`
- [x] 5.2 Implement custom help formatter that adds trust level, output schema summary, example invocations, and related commands to each command's `--help` output
- [x] 5.3 Register `auth` and `config` command groups on the root program
- [x] 5.4 Wire trust policy enforcement into Commander's hook system so every command is checked before execution
- [x] 5.5 Wire the non-interactive constraint: override Commander's error handling so missing arguments exit with code `2` and an error envelope instead of prompting
- [x] 5.6 Implement no-arg status summary: when `backstage-agent` is invoked with no arguments, return a success envelope containing the current auth instance (or `null`), active trust policy, list of available command groups with descriptions, and next-step hints
- [x] 5.7 Implement dry-run framework: add `--dry-run`/`--no-dry-run` flag support to the command framework. Destructive commands default to dry-run (require `--no-dry-run` to execute). Reversible commands support opt-in `--dry-run`. Read-only commands ignore the flag. Dry-run output includes `dryRun: true` in the success envelope. Trust policy enforcement runs before dry-run evaluation

## 6. Testing

- [x] 6.1 Unit tests for output formatters: verify JSON envelope structure, text formatting, error envelopes, and exit codes
- [x] 6.2 Unit tests for trust policy: verify comparison logic (read-only < reversible < all), enforcement blocks correctly, and TRUST_POLICY_VIOLATION envelope format
- [x] 6.3 Unit tests for config file management: read/write/default behavior for `config.yaml`
- [x] 6.4 Unit tests for instance resolution: flag override, selected instance fallback, missing instance error
- [x] 6.5 Unit tests for auth commands: login stores credentials and marks selected, status lists instances, select switches instance, logout removes credentials (mock CliAuth)
- [x] 6.6 Unit tests for no-arg status summary: verify envelope structure with authenticated instance, with no instance configured, and hint content
- [x] 6.7 Unit tests for dry-run framework: verify destructive commands default to dry-run (use stub command — no real destructive command in initial scope), reversible commands support opt-in dry-run, read-only commands ignore the flag, trust policy blocks before dry-run evaluation, `dryRun: true` field present in dry-run responses and omitted in normal responses

## 7. Capability Demos

- [x] 7.1 Create `openspec/changes/backstage-agent-cli/specs/cli-core/demo.md` with a worked example showing the full output envelope lifecycle: successful command, error handling, hint generation, and trust level classification
- [x] 7.2 Create `openspec/changes/backstage-agent-cli/specs/auth/demo.md` with a scenario walkthrough covering login (with derived and explicit instance names), multi-instance status, trust policy setup during login, and logout
