## ADDED Requirements

### Requirement: OAuth login via browser

The CLI SHALL provide `backstage-agent auth login --backend-url <url>` that authenticates with a Backstage instance using OAuth 2.0 Authorization Code + PKCE flow. The command SHALL open a browser for authentication, receive the callback on a local HTTP server, exchange the code for tokens, and store both credentials and the backend URL as an instance in the shared backstage-cli credential storage. The newly authenticated instance SHALL be marked as selected (`selected: true`). The instance name defaults to the hostname from `--backend-url` (e.g., `backstage.example.com`) but can be overridden with `--instance <name>`. Multiple instances can be stored; subsequent commands use the selected instance by default.

#### Scenario: Successful browser login with derived instance name

- **WHEN** a user runs `backstage-agent auth login --backend-url https://backstage.example.com`
- **THEN** a browser opens to the Backstage OAuth authorization URL
- **AND** after the user authenticates, tokens and backend URL are stored as an instance named `backstage.example.com`
- **AND** the new instance is marked as `selected: true`
- **AND** the command outputs a success envelope with the instance name and backend URL

#### Scenario: Login with explicit instance name

- **WHEN** a user runs `backstage-agent auth login --backend-url https://backstage.example.com --instance production`
- **THEN** the instance is stored with the name `production` instead of the derived hostname

#### Scenario: Login with trust policy

- **WHEN** a user runs `backstage-agent auth login --backend-url https://backstage.example.com --trust-policy read-only`
- **THEN** authentication completes and `~/.config/backstage-agent/config.yaml` is updated with `trustPolicy: read-only`

#### Scenario: Re-login to existing instance

- **WHEN** a user runs `backstage-agent auth login --backend-url https://backstage.example.com`
- **AND** an instance for `backstage.example.com` already exists in credential storage
- **THEN** the existing instance's credentials are updated with new tokens
- **AND** the instance remains marked as `selected: true`

#### Scenario: Login to unreachable backend

- **WHEN** a user runs `backstage-agent auth login --backend-url https://unreachable.example.com`
- **THEN** the command fails with an error envelope containing `CONNECTION_ERROR`
- **AND** the `recovery` field suggests checking the URL

### Requirement: No-browser login mode

The CLI SHALL support `backstage-agent auth login --backend-url <url> --no-browser` for environments without a local browser. The command SHALL print the authorization URL to stderr (keeping stdout clean for the JSON result envelope) and accept the callback URL pasted by the user via stdin.

#### Scenario: No-browser login flow

- **WHEN** a user runs `backstage-agent auth login --backend-url https://backstage.example.com --no-browser`
- **THEN** the CLI prints the full authorization URL to stdout
- **AND** after the user pastes the callback URL, tokens are exchanged and stored

### Requirement: Auth status

The CLI SHALL provide `backstage-agent auth status` that displays all configured instances, indicating which one is currently selected, along with backend URL and token expiry for each.

#### Scenario: Authenticated status with single instance

- **WHEN** a user runs `backstage-agent auth status` with one stored instance
- **THEN** the output envelope `data` contains an `instances` array with one entry including `name`, `backendUrl`, `tokenExpiresAt`, and `selected: true`

#### Scenario: Authenticated status with multiple instances

- **WHEN** a user runs `backstage-agent auth status` with multiple stored instances
- **THEN** the output envelope `data.instances` lists all instances with their `name`, `backendUrl`, `tokenExpiresAt`, and `selected` fields

#### Scenario: No credentials stored

- **WHEN** a user runs `backstage-agent auth status` with no stored credentials
- **THEN** the output envelope `data.instances` is an empty array
- **AND** `hints` suggests `backstage-agent auth login --backend-url <url>`
- **AND** exit code is `0`

### Requirement: Auth select

The CLI SHALL provide `backstage-agent auth select <name>` that switches the selected instance by setting `selected: true` on the named instance in the credential storage. No re-authentication is performed.

#### Scenario: Select existing instance

- **WHEN** a user runs `backstage-agent auth select staging`
- **AND** an instance named `staging` exists in the credential storage
- **THEN** the `staging` instance is marked as `selected: true`
- **AND** the previously selected instance is marked as `selected: false`
- **AND** the output envelope confirms the newly selected instance

#### Scenario: Select unknown instance

- **WHEN** a user runs `backstage-agent auth select nonexistent`
- **AND** no instance named `nonexistent` exists in the credential storage
- **THEN** the CLI exits with code `1`
- **AND** the error envelope lists available instance names
- **AND** `hints` suggests `backstage-agent auth status`

### Requirement: Auth select trust level

The `auth select` command SHALL be classified as trust level `reversible` because it modifies the selected instance flag which can be changed back.

#### Scenario: Select trust level in help

- **WHEN** a user runs `backstage-agent auth select --help`
- **THEN** the help output includes `Trust level: reversible`

### Requirement: Auth logout

The CLI SHALL provide `backstage-agent auth logout` that removes stored credentials for the selected instance. An optional `--instance <name>` flag SHALL allow logging out a specific instance.

#### Scenario: Successful logout of selected instance

- **WHEN** a user runs `backstage-agent auth logout`
- **THEN** credentials for the selected instance are removed from storage
- **AND** the output envelope confirms the instance name that was logged out

#### Scenario: Logout specific instance

- **WHEN** a user runs `backstage-agent auth logout --instance staging`
- **AND** `staging` is not the selected instance
- **THEN** credentials for the `staging` instance are removed from storage
- **AND** the selected instance remains unchanged

#### Scenario: Logout selected instance when other instances exist

- **WHEN** a user runs `backstage-agent auth logout`
- **AND** the selected instance is removed
- **AND** other instances remain in storage
- **THEN** no instance is marked as `selected: true`
- **AND** `hints` suggests `backstage-agent auth select <name>` to select an instance

### Requirement: Auth whoami

The CLI SHALL provide `backstage-agent auth whoami` that calls the Backstage `/api/auth/v1/userinfo` endpoint with the stored access token and returns the authenticated user's identity.

#### Scenario: Successful whoami

- **WHEN** a user runs `backstage-agent auth whoami` with a valid token
- **THEN** the output envelope `data` contains `instance` (the instance name), `userEntityRef` (e.g., `user:default/guest`), and `ownershipEntityRefs` (array of ownership entity refs)
- **AND** trust level is `read-only`

#### Scenario: Whoami with expired or missing token

- **WHEN** a user runs `backstage-agent auth whoami` without a valid token
- **THEN** the CLI exits with code `1`
- **AND** the error envelope contains `AUTH_ERROR`
- **AND** `hints` suggests running `auth login`

### Requirement: Auth whoami trust level

The `auth whoami` command SHALL be classified as trust level `read-only` because it only reads user identity from the backend without modifying any state.

#### Scenario: Whoami trust level in help

- **WHEN** a user runs `backstage-agent auth whoami --help`
- **THEN** the help output includes `Trust level: read-only`

### Requirement: Shared credential storage
The CLI SHALL store and read credentials using the same paths and format as backstage-cli: `~/.config/backstage-cli/auth-instances.yaml` for instance metadata and `~/.local/share/backstage-cli/auth-secrets/` for tokens. Token storage uses a custom `FileSecretStore` instead of `CliAuth` from `@backstage/cli-node` to avoid a read/write mismatch when keytar is installed (CliAuth prefers keytar for reads while login writes to the file store).

#### Scenario: Credentials shared with backstage-cli

- **WHEN** a user has authenticated via `backstage-cli auth login`
- **THEN** `backstage-agent` commands authenticate using the same stored tokens without re-login

#### Scenario: Expired token requires re-login

- **WHEN** a command executes with an expired access token
- **THEN** the backend returns an auth error
- **AND** the CLI reports an `AUTH_ERROR` with a hint to run `auth login` again
- **NOTE** Automatic token refresh using refresh tokens is deferred to a future change
- **THEN** `CliAuth` automatically refreshes the token before making the API call

### Requirement: Auth status trust level

The `auth status` command SHALL be classified as trust level `read-only` because it only reads stored credential metadata without modifying any state.

#### Scenario: Status trust level in help

- **WHEN** a user runs `backstage-agent auth status --help`
- **THEN** the help output includes `Trust level: read-only`

### Requirement: Auth logout trust level

The `auth logout` command SHALL be classified as trust level `reversible` because it removes credentials that can be restored by running `auth login` again.

#### Scenario: Logout trust level in help

- **WHEN** a user runs `backstage-agent auth logout --help`
- **THEN** the help output includes `Trust level: reversible`

### Requirement: Auth login trust level

The `auth login` command SHALL be classified as trust level `reversible` because it writes credentials to local storage that can be removed via `auth logout`.

#### Scenario: Login trust level in help

- **WHEN** a user runs `backstage-agent auth login --help`
- **THEN** the help output includes `Trust level: reversible`
