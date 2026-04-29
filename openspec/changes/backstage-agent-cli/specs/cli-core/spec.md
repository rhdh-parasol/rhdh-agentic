## ADDED Requirements

### Requirement: Structured JSON output envelope

All commands SHALL return a consistent JSON envelope on stdout containing a `data` field with the command-specific payload, a `hints` array with next-step command suggestions, and a `trustLevel` string classifying the operation as `read-only`, `reversible`, `destructive`, or `external`.

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

### Requirement: Next-step hints

Every command output SHALL include a `hints` array containing at least one suggested next command. Hints SHALL be concrete, runnable command strings.

#### Scenario: Hints suggest related commands

- **WHEN** `backstage-agent catalog list` returns a list of entities
- **THEN** the `hints` array includes a suggestion like `backstage-agent catalog get <ref>`

#### Scenario: Error hints suggest recovery

- **WHEN** a command fails with `NOT_FOUND`
- **THEN** the `hints` array includes a search command suggestion

### Requirement: Trust level classification

Every command SHALL declare its trust level in the output envelope. Trust levels are: `read-only` (no side effects), `reversible` (side effects that can be undone), `destructive` (irreversible side effects), `external` (calls external systems).

#### Scenario: Read commands are classified as read-only

- **WHEN** `backstage-agent catalog list` executes
- **THEN** the `trustLevel` field is `read-only`

#### Scenario: Template execution is classified as destructive

- **WHEN** `backstage-agent templates execute` executes
- **THEN** the `trustLevel` field is `destructive`

### Requirement: Help as protocol contract

Every command's `--help` output SHALL include the command signature, all flags with descriptions, output format description, trust level, example invocations, and related commands.

#### Scenario: Help includes trust level

- **WHEN** a user runs `backstage-agent catalog list --help`
- **THEN** the help output includes `Trust level: read-only`

#### Scenario: Help includes examples

- **WHEN** a user runs `backstage-agent catalog get --help`
- **THEN** the help output includes at least one example invocation

### Requirement: Global flags

The CLI SHALL support `--backend-url <url>` to override the Backstage backend URL and `--output json|text` to control output format. These flags SHALL be available on every command.

#### Scenario: Backend URL override

- **WHEN** a command is invoked with `--backend-url https://backstage.example.com`
- **THEN** the command uses that URL instead of the stored auth instance URL

#### Scenario: Backend URL from stored auth

- **WHEN** a command is invoked without `--backend-url` and a stored auth instance exists
- **THEN** the command uses the stored instance URL

### Requirement: Non-interactive operation

The CLI SHALL NOT prompt for stdin input during any command execution. All input MUST be provided via flags and arguments.

#### Scenario: No stdin prompts

- **WHEN** any command is invoked without required arguments
- **THEN** the CLI exits with a usage error (code `2`) rather than prompting for input
