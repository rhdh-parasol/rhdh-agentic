## ADDED Requirements

### Requirement: OAuth login via browser

The CLI SHALL provide `backstage-agent auth login --backend-url <url>` that authenticates with a Backstage instance using OAuth 2.0 Authorization Code + PKCE flow. The command SHALL open a browser for authentication, receive the callback on a local HTTP server, exchange the code for tokens, and store credentials in the shared backstage-cli credential storage.

#### Scenario: Successful browser login

- **WHEN** a user runs `backstage-agent auth login --backend-url https://backstage.example.com`
- **THEN** a browser opens to the Backstage OAuth authorization URL
- **AND** after the user authenticates, tokens are stored to `~/.config/backstage-cli/auth-instances.yaml`
- **AND** the command outputs a success envelope with the authenticated instance name

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

The CLI SHALL provide `backstage-agent auth status` that displays the current authentication state including the active instance, backend URL, and token expiry.

#### Scenario: Authenticated status

- **WHEN** a user runs `backstage-agent auth status` with valid stored credentials
- **THEN** the output envelope `data` contains `instance`, `backendUrl`, and `tokenExpiresAt` fields

#### Scenario: No credentials stored

- **WHEN** a user runs `backstage-agent auth status` with no stored credentials
- **THEN** the command exits with code `1`
- **AND** the `hints` array suggests `backstage-agent auth login --backend-url <url>`

### Requirement: Auth logout

The CLI SHALL provide `backstage-agent auth logout` that removes stored credentials for the active instance.

#### Scenario: Successful logout

- **WHEN** a user runs `backstage-agent auth logout`
- **THEN** credentials for the active instance are removed from storage
- **AND** the output envelope confirms the instance that was logged out

### Requirement: Shared credential storage

The CLI SHALL store and read credentials using the same paths and format as backstage-cli: `~/.config/backstage-cli/auth-instances.yaml` for instance metadata and `~/.local/share/backstage-cli/auth-secrets/` for tokens. Token retrieval and refresh SHALL be delegated to `CliAuth` from `@backstage/cli-node`.

#### Scenario: Credentials shared with backstage-cli

- **WHEN** a user has authenticated via `backstage-cli auth login`
- **THEN** `backstage-agent` commands authenticate using the same stored tokens without re-login

#### Scenario: Automatic token refresh

- **WHEN** a command executes with an expired access token and a valid refresh token
- **THEN** `CliAuth` automatically refreshes the token before making the API call

### Requirement: Auth login trust level

The `auth login` command SHALL be classified as trust level `external` because it initiates a browser-based OAuth flow with an external Backstage instance.

#### Scenario: Login trust level in help

- **WHEN** a user runs `backstage-agent auth login --help`
- **THEN** the help output includes `Trust level: external`
