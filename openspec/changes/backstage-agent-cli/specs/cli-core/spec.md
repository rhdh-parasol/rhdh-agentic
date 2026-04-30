## ADDED Requirements

### Requirement: No-arg status summary

When invoked with no arguments, the CLI SHALL return a status summary containing the current auth instance (or `null` if unconfigured), the active trust policy, and a list of available command groups with descriptions. The output SHALL use the standard success envelope and include hints guiding the agent to useful next commands.

#### Scenario: No-arg with authenticated instance

- **WHEN** `backstage-agent` is invoked with no arguments
- **AND** an authenticated instance is configured
- **THEN** the output envelope `data` contains `instance` with `name` and `authenticated` fields, `trustPolicy`, and `commandGroups` array
- **AND** `hints` includes suggestions for available commands

#### Scenario: No-arg with no instance configured

- **WHEN** `backstage-agent` is invoked with no arguments
- **AND** no instance is configured
- **THEN** the output envelope `data.instance` is `null`
- **AND** `hints` includes `backstage-agent auth login --backend-url <url>`

### Requirement: Structured JSON output envelope

All commands SHALL return a consistent JSON envelope on stdout containing a `data` field with the command-specific payload, a `hints` array with next-step command suggestions, and a `trustLevel` string classifying the operation as `read-only`, `reversible`, or `destructive`.

#### Scenario: Successful command returns envelope

- **WHEN** a command executes successfully
- **THEN** stdout contains a JSON object with `data`, `hints`, and `trustLevel` fields
- **AND** exit code is `0`

#### Scenario: Default output format is JSON

- **WHEN** a command is invoked without `--output` flag
- **THEN** output is formatted as JSON

### Requirement: Human-readable output mode

The CLI SHALL support a `--output text` flag on every command that formats output as human-readable text instead of JSON.

#### Scenario: Text output mode

- **WHEN** a command is invoked with `--output text`
- **THEN** output is formatted as human-readable text

#### Scenario: Invalid output format

- **WHEN** a command is invoked with `--output xml`
- **THEN** the CLI exits with code `2`
- **AND** stderr contains an error envelope with a usage error

### Requirement: Structured error envelope

All commands SHALL return a consistent error envelope on stderr containing an `error` object with `code`, `message`, and `recovery` fields, plus a `hints` array with recovery command suggestions. Exit code SHALL be `1` for runtime errors and `2` for usage errors.

#### Scenario: Runtime error returns error envelope

- **WHEN** a command fails due to a runtime error (e.g., network failure, auth expired)
- **THEN** stderr contains a JSON object with `error.code`, `error.message`, `error.recovery`, and `hints`
- **AND** exit code is `1`

#### Scenario: Usage error returns error envelope

- **WHEN** a command is invoked with invalid arguments or flags
- **THEN** stderr contains a JSON object with `error.code` set to `USAGE_ERROR`
- **AND** exit code is `2`

#### Scenario: Error in text output mode

- **WHEN** a command fails with `--output text`
- **THEN** stderr contains a human-readable error message with the error code, message, recovery suggestion, and hints
- **AND** the error is NOT formatted as JSON

#### Scenario: Error in default JSON output mode

- **WHEN** a command fails without `--output` flag (or with `--output json`)
- **THEN** stderr contains the JSON error envelope

### Requirement: Next-step hints

Every command output SHALL include a `hints` array containing at least one suggested next command. Hints SHALL be concrete, runnable command strings.

#### Scenario: Hints suggest related commands

- **WHEN** `backstage-agent catalog list` returns a list of entities
- **THEN** the `hints` array includes a suggestion like `backstage-agent catalog get <ref>`

#### Scenario: Error hints suggest recovery

- **WHEN** a command fails with `NOT_FOUND`
- **THEN** the `hints` array includes a search command suggestion

### Requirement: Trust level classification

Every command SHALL declare its trust level in the output envelope. Trust levels are: `read-only` (no side effects), `reversible` (side effects that can be undone), `destructive` (irreversible side effects).

#### Scenario: Read commands are classified as read-only

- **WHEN** `backstage-agent catalog list` executes
- **THEN** the `trustLevel` field is `read-only`

#### Scenario: Config set-trust-policy is classified as reversible

- **WHEN** `backstage-agent config set-trust-policy` executes
- **THEN** the `trustLevel` field is `reversible`

#### Scenario: Template execution is classified as destructive

- **WHEN** `backstage-agent templates execute` executes
- **THEN** the `trustLevel` field is `destructive`

### Requirement: Trust policy enforcement

The CLI SHALL enforce a configurable trust policy that gates command execution based on trust level. The policy defines the maximum trust level allowed: `read-only`, `reversible`, or `all` (default). Commands whose trust level exceeds the policy SHALL be blocked before execution. The policy is stored in `~/.config/backstage-agent/config.yaml` and can only be changed via `backstage-agent config set-trust-policy <level>` or `backstage-agent auth login --trust-policy <level>`.

#### Scenario: Policy blocks destructive command

- **WHEN** the trust policy is set to `read-only`
- **AND** a user runs `backstage-agent templates execute`
- **THEN** the CLI exits with code `1`
- **AND** the error envelope contains `code: "TRUST_POLICY_VIOLATION"` with a message explaining the required trust level and current policy

#### Scenario: Policy allows matching trust level

- **WHEN** the trust policy is set to `reversible`
- **AND** a user runs a command with trust level `read-only`
- **THEN** the command executes normally

#### Scenario: Set trust policy via config command

- **WHEN** a user runs `backstage-agent config set-trust-policy read-only`
- **THEN** `~/.config/backstage-agent/config.yaml` is updated with `trustPolicy: read-only`
- **AND** the output envelope confirms the new policy
- **AND** the `trustLevel` field in the output envelope is `reversible`

#### Scenario: Set trust policy during login

- **WHEN** a user runs `backstage-agent auth login --backend-url https://example.com --trust-policy read-only`
- **THEN** authentication completes and the trust policy is set to `read-only`

#### Scenario: Default policy is all

- **WHEN** no trust policy has been configured
- **THEN** all commands are allowed regardless of trust level

### Requirement: Help as protocol contract

Every command's `--help` output SHALL include the command signature, all flags with descriptions, output format description, trust level, example invocations, and related commands.

#### Scenario: Help includes trust level

- **WHEN** a user runs `backstage-agent catalog list --help`
- **THEN** the help output includes `Trust level: read-only`

#### Scenario: Help includes examples

- **WHEN** a user runs `backstage-agent catalog get --help`
- **THEN** the help output includes at least one example invocation

### Requirement: Global flags

The CLI SHALL support `--instance <name>` to select a stored auth instance by name and `--output json|text` to control output format. These flags SHALL be available on every command.

#### Scenario: Instance selection by name

- **WHEN** a command is invoked with `--instance staging`
- **THEN** the command uses the backend URL and credentials from the stored instance named `staging`

#### Scenario: Default to selected instance

- **WHEN** a command is invoked without `--instance`
- **THEN** the command uses the instance marked `selected: true` in the credential storage

#### Scenario: No instance available

- **WHEN** a command is invoked without `--instance` and no stored auth instance exists
- **THEN** the CLI exits with code `1`
- **AND** the `hints` array suggests `backstage-agent auth login --backend-url <url>`

#### Scenario: Unknown instance name

- **WHEN** a command is invoked with `--instance nonexistent` and no stored instance has that name
- **THEN** the CLI exits with code `1`
- **AND** the error envelope lists available instance names
- **AND** `hints` suggests `backstage-agent auth status` to see configured instances

### Requirement: Dry-run preview for state-changing commands

Commands with trust level `destructive` SHALL default to dry-run mode, returning a preview of the operation without executing it. The `--no-dry-run` flag SHALL be required to actually execute destructive commands. Commands with trust level `reversible` SHALL support an opt-in `--dry-run` flag to preview the operation. Dry-run output SHALL use the standard success envelope with an additional `dryRun: true` field.

#### Scenario: Destructive command defaults to dry-run

- **WHEN** a destructive command is invoked without `--no-dry-run`
- **THEN** the command returns a success envelope with `dryRun: true` and a preview of the operation in `data`
- **AND** no state is modified
- **AND** `hints` includes the command with `--no-dry-run` to execute

#### Scenario: Destructive command executes with --no-dry-run

- **WHEN** a destructive command is invoked with `--no-dry-run`
- **THEN** the command executes normally and returns the standard success envelope without `dryRun`

#### Scenario: Reversible command with --dry-run

- **WHEN** a reversible command is invoked with `--dry-run`
- **THEN** the command returns a success envelope with `dryRun: true` and a preview of the operation in `data`
- **AND** no state is modified

#### Scenario: Reversible command executes by default

- **WHEN** a reversible command is invoked without `--dry-run`
- **THEN** the command executes normally

#### Scenario: Dry-run blocked by trust policy

- **WHEN** a destructive command is invoked (with or without `--no-dry-run`)
- **AND** the trust policy does not allow the command's trust level
- **THEN** the CLI exits with a `TRUST_POLICY_VIOLATION` error
- **AND** no preview is shown

#### Scenario: Read-only command ignores --dry-run

- **WHEN** a read-only command is invoked with `--dry-run`
- **THEN** the command executes normally (flag is ignored)

### Requirement: Non-interactive operation

The CLI SHALL NOT prompt for stdin input during any command execution. All input MUST be provided via flags and arguments.

#### Scenario: No stdin prompts

- **WHEN** any command is invoked without required arguments
- **THEN** the CLI exits with a usage error (code `2`) rather than prompting for input
