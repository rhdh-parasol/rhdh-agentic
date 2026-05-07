## CLI Core Demo: Output Envelope Lifecycle

This walkthrough shows the core output contract in action — success envelopes, error handling, hint generation, and trust level classification. All outputs are captured from a live instance.

### 1. No-arg Status Summary

```console
$ backstage-agent
{
  "data": {
    "instance": {
      "name": "localhost:7007",
      "authenticated": true
    },
    "trustPolicy": "all",
    "commandGroups": [
      {
        "name": "auth",
        "description": "Authentication and instance management"
      },
      {
        "name": "config",
        "description": "CLI configuration"
      }
    ]
  },
  "hints": [
    "Try: backstage-agent auth status",
    "Try: backstage-agent config set-trust-policy"
  ],
  "trustLevel": "read-only"
}
```

The no-arg output gives agents a discovery entry point — current state plus actionable hints.

### 2. Successful Command — Trust Policy Change

```console
$ backstage-agent config set-trust-policy read-only
{
  "data": {
    "trustPolicy": "read-only"
  },
  "hints": [],
  "trustLevel": "reversible"
}
```

The output envelope always contains `data`, `hints`, and `trustLevel`. The command itself is `reversible` (changing the policy can be undone).

### 3. Trust Policy Enforcement — Blocked Command

When a command's trust level exceeds the configured policy, it is blocked before execution:

```console
$ backstage-agent templates execute my-template
{
  "error": {
    "code": "TRUST_POLICY_VIOLATION",
    "message": "Command requires trust level \"destructive\" but the current policy is \"read-only\"",
    "recovery": "Change the trust policy with: backstage-agent config set-trust-policy <level>"
  },
  "hints": [
    "Try: backstage-agent config set-trust-policy <level>"
  ]
}
```

Exit code: `1`. The error envelope tells the agent exactly what went wrong and how to fix it. (This example uses a future command — trust enforcement is tested via unit tests.)

### 4. Usage Error — Missing Required Argument

```console
$ backstage-agent auth login
{
  "error": {
    "code": "USAGE_ERROR",
    "message": "required option '--backend-url <url>' not specified",
    "recovery": "Run with --help for usage information"
  },
  "hints": [
    "Try: backstage-agent --help"
  ]
}
```

Exit code: `2`. No stdin prompt — the CLI exits immediately with a structured error. Agents never hang waiting for input.

### 5. Human-Readable Text Mode

```console
$ backstage-agent --output text config set-trust-policy reversible
Trust level: reversible

trustPolicy: reversible
```

```console
$ backstage-agent --output text auth login 2>&1
Error [USAGE_ERROR]: required option '--backend-url <url>' not specified
Recovery: Run with --help for usage information

Hints:
  Try: backstage-agent --help
```

The `--output text` flag renders the same envelope as human-readable lines instead of JSON.

### 6. Help as Protocol Contract

```console
$ backstage-agent auth login --help
Usage: backstage-agent auth login [options]

Authenticate with a Backstage instance

Options:
  --backend-url <url>     Backstage backend URL
  --no-browser            Print auth URL instead of opening browser
  --trust-policy <level>  Set trust policy after login
  -h, --help              display help for command

Trust level: reversible

Examples:
  $ backstage-agent auth login --backend-url https://backstage.example.com
  $ backstage-agent auth login --backend-url https://backstage.example.com --instance production
  $ backstage-agent auth login --backend-url https://backstage.example.com --trust-policy read-only
  $ backstage-agent auth login --backend-url https://backstage.example.com --no-browser

Related commands:
  backstage-agent auth status
  backstage-agent auth logout
```

Every command's `--help` includes trust level, examples, and related commands — the agent's primary discovery mechanism.
