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

#### Scenario: Login to unreachable backend

- **WHEN** a user runs `backstage-agent auth login --backend-url https://unreachable.example.com`
- **THEN** the command fails with an error envelope containing `CONNECTION_ERROR`
- **AND** the `recovery` field suggests checking the URL

### Requirement: No-browser login mode

The CLI SHALL support `backstage-agent auth login --backend-url <url> --no-browser` for environments without a local browser. The command SHALL print the authorization URL to stdout and accept the callback URL pasted by the user.

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
- **THEN** the command exits with code `1`
- **AND** the `hints` array suggests `backstage-agent auth login --backend-url <url>`

### Requirement: Auth logout

The CLI SHALL provide `backstage-agent auth logout` that removes stored credentials for the selected instance. An optional `--instance <name>` flag SHALL allow logging out a specific instance.

#### Scenario: Successful logout of selected instance

- **WHEN** a user runs `backstage-agent auth logout`
- **THEN** credentials for the selected instance are removed from storage
- **AND** the output envelope confirms the instance name that was logged out

#### Scenario: Logout specific instance

- **WHEN** a user runs `backstage-agent auth logout --instance staging`
- **THEN** credentials for the `staging` instance are removed from storage
- **AND** the selected instance remains unchanged (unless it was the one removed)

### Requirement: Shared credential storage

The CLI SHALL store and read credentials using the same paths and format as backstage-cli: `~/.config/backstage-cli/auth-instances.yaml` for instance metadata and `~/.local/share/backstage-cli/auth-secrets/` for tokens. Token retrieval and refresh SHALL be delegated to `CliAuth` from `@backstage/cli-node`.

#### Scenario: Credentials shared with backstage-cli

- **WHEN** a user has authenticated via `backstage-cli auth login`
- **THEN** `backstage-agent` commands authenticate using the same stored tokens without re-login

#### Scenario: Automatic token refresh

- **WHEN** a command executes with an expired access token and a valid refresh token
- **THEN** `CliAuth` automatically refreshes the token before making the API call

### Requirement: Auth login trust level

The `auth login` command SHALL be classified as trust level `reversible` because it writes credentials to local storage that can be removed via `auth logout`.

#### Scenario: Login trust level in help

- **WHEN** a user runs `backstage-agent auth login --help`
- **THEN** the help output includes `Trust level: reversible`
