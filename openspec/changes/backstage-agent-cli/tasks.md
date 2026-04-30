## 1. Project Scaffolding

- [ ] 1.1 Initialize `backstage-agent/` package with `package.json` (Commander.js, `@backstage/cli-node`, `js-yaml` deps), `tsconfig.json`, and `bin/backstage-agent` entry point
- [ ] 1.2 Create `src/` directory structure: `commands/auth/`, `commands/config/`, `lib/`, `output/`
- [ ] 1.3 Set up build script (tsc) and verify the CLI binary runs `backstage-agent --help` with a placeholder

## 2. Output Layer

- [ ] 2.1 Define TypeScript types for the success envelope (`data`, `hints`, `trustLevel`) and error envelope (`error.code`, `error.message`, `error.recovery`, `hints`) in `src/output/formatter.ts`
- [ ] 2.2 Implement JSON formatter that writes the success envelope to stdout and the error envelope to stderr with correct exit codes (`0` success, `1` runtime error, `2` usage error)
- [ ] 2.3 Implement human-readable text formatter (`--output text`) that renders envelopes as readable tables/lines
- [ ] 2.4 Implement `src/output/hints.ts` with helper functions for generating next-step hint strings

## 3. Config and Trust Policy

- [ ] 3.1 Implement config file reader/writer for `~/.config/backstage-agent/config.yaml` with `trustPolicy` field (values: `read-only`, `reversible`, `all`; default: `all`)
- [ ] 3.2 Implement trust level comparison logic: given a command's trust level and the configured policy, determine whether execution is allowed (each policy level includes all levels below it)
- [ ] 3.3 Implement trust policy enforcement as a pre-execution check that blocks commands exceeding the policy and emits a `TRUST_POLICY_VIOLATION` error envelope
- [ ] 3.4 Implement `backstage-agent config set-trust-policy <level>` command that updates the config file and returns a confirmation envelope

## 4. Auth Module

- [ ] 4.1 Implement `src/lib/auth.ts` wrapping `CliAuth` from `@backstage/cli-node` — expose `getAuthenticatedFetch(instanceName?)` that creates a `CliAuth` instance, calls `getAccessToken()`, and returns a fetch function with the Bearer token
- [ ] 4.2 Implement instance resolution logic: `--instance <name>` flag → selected instance from `~/.config/backstage-cli/auth-instances.yaml` → error with hint to run `auth login`
- [ ] 4.3 Implement `backstage-agent auth login --backend-url <url>` command: derive instance name from hostname (or accept `--instance`), invoke CliAuth OAuth PKCE flow, store credentials, mark instance as selected, optionally set trust policy via `--trust-policy <level>`
- [ ] 4.4 Implement `backstage-agent auth login --no-browser` mode: print authorization URL to stdout, accept pasted callback URL
- [ ] 4.5 Implement `backstage-agent auth status` command: list all stored instances with name, backendUrl, tokenExpiresAt, and selected flag
- [ ] 4.6 Implement `backstage-agent auth select <name>` command: switch the selected instance by flipping `selected: true` in credential storage without re-authenticating
- [ ] 4.7 Implement `backstage-agent auth logout` command: remove credentials for selected instance (or `--instance <name>` if specified)

## 5. CLI Core Integration

- [ ] 5.1 Set up root Commander program in `src/index.ts` with global options `--output json|text` (default: `json`) and `--instance <name>`
- [ ] 5.2 Implement custom help formatter that adds trust level, output schema summary, example invocations, and related commands to each command's `--help` output
- [ ] 5.3 Register `auth` and `config` command groups on the root program
- [ ] 5.4 Wire trust policy enforcement into Commander's hook system so every command is checked before execution
- [ ] 5.5 Wire the non-interactive constraint: override Commander's error handling so missing arguments exit with code `2` and an error envelope instead of prompting

## 6. Testing

- [ ] 6.1 Unit tests for output formatters: verify JSON envelope structure, text formatting, error envelopes, and exit codes
- [ ] 6.2 Unit tests for trust policy: verify comparison logic (read-only < reversible < all), enforcement blocks correctly, and TRUST_POLICY_VIOLATION envelope format
- [ ] 6.3 Unit tests for config file management: read/write/default behavior for `config.yaml`
- [ ] 6.4 Unit tests for instance resolution: flag override, selected instance fallback, missing instance error
- [ ] 6.5 Unit tests for auth commands: login stores credentials and marks selected, status lists instances, logout removes credentials (mock CliAuth)

## 7. Capability Demos

- [ ] 7.1 Create `openspec/changes/backstage-agent-cli/specs/cli-core/demo.md` with a worked example showing the full output envelope lifecycle: successful command, error handling, hint generation, and trust level classification
- [ ] 7.2 Create `openspec/changes/backstage-agent-cli/specs/auth/demo.md` with a scenario walkthrough covering login (with derived and explicit instance names), multi-instance status, trust policy setup during login, and logout
