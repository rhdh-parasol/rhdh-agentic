## Auth Demo: Multi-Instance Authentication Lifecycle

This walkthrough covers the complete auth lifecycle — login, identity verification, multi-instance management, error handling, and logout. All outputs are captured from a live Backstage instance at `http://localhost:7007`.

### 1. Status with No Credentials

```console
$ backstage-agent auth status
{
  "data": {
    "instances": []
  },
  "hints": [
    "Try: backstage-agent auth login --backend-url <url>"
  ],
  "trustLevel": "read-only"
}
```

Empty array (not an error) with a hint to log in. Exit code `0` — having no credentials is a valid state, not a failure.

### 2. Whoami Before Login

```console
$ backstage-agent auth whoami
{
  "error": {
    "code": "NO_AUTH_INSTANCE",
    "message": "No authenticated Backstage instance configured",
    "recovery": "Run backstage-agent auth login to authenticate"
  },
  "hints": [
    "Try: backstage-agent auth login --backend-url <url>"
  ]
}
```

Exit code `1`. The error tells the agent exactly what to do next.

### 3. Login to Unreachable Backend

```console
$ backstage-agent auth login --backend-url http://localhost:9999
{
  "error": {
    "code": "CONNECTION_ERROR",
    "message": "Failed to connect to http://localhost:9999: fetch failed",
    "recovery": "Check the backend URL and ensure the Backstage instance is running"
  },
  "hints": []
}
```

Exit code `1`. The CLI validates connectivity before starting the OAuth flow.

### 4. Initial Login

```console
$ backstage-agent auth login --backend-url http://localhost:7007
{
  "data": {
    "instance": "localhost:7007",
    "backendUrl": "http://localhost:7007"
  },
  "hints": [
    "Try: backstage-agent auth status",
    "Try: backstage-agent catalog list"
  ],
  "trustLevel": "reversible"
}
```

The CLI opens a browser for OAuth authentication. After the user authenticates, the callback is received on `http://127.0.0.1:8055/callback` and tokens are exchanged. The instance name is derived from the host (`localhost:7007`) and automatically marked as selected.

### 5. Status After Login

```console
$ backstage-agent auth status
{
  "data": {
    "instances": [
      {
        "name": "localhost:7007",
        "backendUrl": "http://localhost:7007",
        "tokenExpiresAt": "2026-05-04T15:24:13.185Z",
        "selected": true
      }
    ]
  },
  "hints": [],
  "trustLevel": "read-only"
}
```

The instance is listed with its token expiry. `tokenExpiresAt` tells agents when to expect token refresh.

### 6. Verifying Identity

```console
$ backstage-agent auth whoami
{
  "data": {
    "instance": "localhost:7007",
    "userEntityRef": "user:development/guest",
    "ownershipEntityRefs": [
      "user:development/guest"
    ]
  },
  "hints": [],
  "trustLevel": "read-only"
}
```

Calls `/api/auth/v1/userinfo` with the stored Bearer token. Returns the user's entity reference and ownership claims — useful for verifying authentication worked and understanding what permissions the token carries.

### 7. Login with Explicit Instance Name and Trust Policy

```console
$ backstage-agent auth login --backend-url https://staging.internal.dev --instance staging --trust-policy read-only
{
  "data": {
    "instance": "staging",
    "backendUrl": "https://staging.internal.dev",
    "trustPolicy": "read-only"
  },
  "hints": [
    "Try: backstage-agent auth status",
    "Try: backstage-agent catalog list"
  ],
  "trustLevel": "reversible"
}
```

The `--instance` flag overrides the derived name. The `--trust-policy` flag sets the trust policy during login — a common workflow for initial setup. The newly logged-in instance becomes selected.

### 8. Multi-Instance Status

```console
$ backstage-agent auth status
{
  "data": {
    "instances": [
      {
        "name": "localhost:7007",
        "backendUrl": "http://localhost:7007",
        "tokenExpiresAt": "2026-05-04T15:24:13.185Z",
        "selected": false
      },
      {
        "name": "staging",
        "backendUrl": "https://staging.internal.dev",
        "tokenExpiresAt": "2026-05-04T16:00:00.000Z",
        "selected": true
      }
    ]
  },
  "hints": [],
  "trustLevel": "read-only"
}
```

Both instances are listed. The most recently logged-in instance (`staging`) is selected.

### 9. Switching Instances

```console
$ backstage-agent auth select localhost:7007
{
  "data": {
    "selected": "localhost:7007"
  },
  "hints": [],
  "trustLevel": "reversible"
}
```

No re-authentication. The `selected` flag flips in credential storage. All subsequent commands use this instance unless `--instance` overrides.

### 10. Selecting Unknown Instance

```console
$ backstage-agent auth select nonexistent
{
  "error": {
    "code": "INSTANCE_NOT_FOUND",
    "message": "No stored instance named \"nonexistent\"",
    "recovery": "Available instances: localhost:7007"
  },
  "hints": [
    "Try: backstage-agent auth status"
  ]
}
```

Exit code `1`. The error lists available instance names so the agent can self-correct.

### 11. Using --instance Flag for One-Off Commands

```console
backstage-agent --instance staging auth whoami
```

The `--instance` flag targets a specific instance without switching the default selection.

### 12. Logout — Selected Instance

```console
$ backstage-agent auth logout
{
  "data": {
    "loggedOut": "localhost:7007"
  },
  "hints": [
    "Try: backstage-agent auth select <name>"
  ],
  "trustLevel": "reversible"
}
```

The selected instance is removed along with its stored tokens. Since another instance remains, the hint suggests selecting one. No instance is auto-selected — the agent must explicitly run `auth select`.

### 13. No-Browser Login (Headless Environments)

```console
$ backstage-agent auth login --backend-url http://localhost:7007 --no-browser
Open this URL in your browser:

http://localhost:7007/api/auth/v1/authorize?client_id=http%3A%2F%2Flocalhost%3A7007%2Fapi%2Fauth%2F.well-known%2Foauth-client%2Fcli.json&redirect_uri=http%3A%2F%2Flocalhost%3A0%2Fcallback&response_type=code&scope=openid+offline_access&state=...&code_challenge=...&code_challenge_method=S256

After authenticating, paste the callback URL here:
> http://localhost:0/callback?code=abc123&state=xyz
{
  "data": {
    "instance": "localhost:7007",
    "backendUrl": "http://localhost:7007"
  },
  "hints": [
    "Try: backstage-agent auth status",
    "Try: backstage-agent catalog list"
  ],
  "trustLevel": "reversible"
}
```

For SSH sessions or environments without a local browser. The user opens the URL manually, authenticates, and pastes the callback URL back.

### 14. Text Output Mode

```console
$ backstage-agent --output text auth status
Trust level: read-only

instances:
  name: localhost:7007
  backendUrl: http://localhost:7007
  tokenExpiresAt: 2026-05-04T15:24:13.185Z
  selected: true
```

```console
$ backstage-agent --output text auth whoami
Trust level: read-only

instance: localhost:7007
userEntityRef: user:development/guest
ownershipEntityRefs:
  - user:development/guest
```

The `--output text` flag renders the same envelope as human-readable lines instead of JSON.
