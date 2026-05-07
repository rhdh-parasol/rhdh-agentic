import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import YAML from 'yaml';

let origHome: string;
let origXdg: string | undefined;
let tempHome: string;

function makeInstance(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    name: 'test',
    baseUrl: 'https://test.example.com',
    clientId: 'https://test.example.com/api/auth/.well-known/oauth-client/cli.json',
    issuedAt: Date.now(),
    accessTokenExpiresAt: Date.now() + 3600000,
    selected: false,
    ...overrides,
  };
}

function writeInstancesFile(instances: Array<Record<string, unknown>>): void {
  const dir = join(tempHome, '.config', 'backstage-cli');
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'auth-instances.yaml'),
    YAML.stringify({ instances }),
    'utf-8',
  );
}

function runCli(): Record<string, unknown> {
  const entrypoint = join(import.meta.dirname, 'index.ts');
  const stdout = execFileSync('npx', ['tsx', entrypoint], {
    env: {
      ...process.env,
      HOME: tempHome,
      XDG_CONFIG_HOME: undefined,
    },
    encoding: 'utf-8',
    timeout: 10_000,
  });
  return JSON.parse(stdout) as Record<string, unknown>;
}

beforeEach(() => {
  origHome = process.env.HOME!;
  origXdg = process.env.XDG_CONFIG_HOME;
  tempHome = mkdtempSync(join(tmpdir(), 'backstage-agent-test-'));
});

afterEach(() => {
  process.env.HOME = origHome;
  if (origXdg !== undefined) {
    process.env.XDG_CONFIG_HOME = origXdg;
  } else {
    delete process.env.XDG_CONFIG_HOME;
  }
  rmSync(tempHome, { recursive: true, force: true });
});

describe('No-arg status summary (CLI entrypoint)', () => {
  it('returns status with authenticated instance', () => {
    writeInstancesFile([
      makeInstance({ name: 'prod', baseUrl: 'https://prod.example.com', selected: true }),
    ]);

    const output = runCli();
    const data = output.data as Record<string, unknown>;
    expect(data.instance).toEqual({ name: 'prod', authenticated: true });
    expect(data.trustPolicy).toBe('read-only');
    expect(data.commandGroups).toHaveLength(2);
    expect(output.trustLevel).toBe('read-only');
  });

  it('returns null instance when no credentials configured', () => {
    const output = runCli();
    const data = output.data as Record<string, unknown>;
    expect(data.instance).toBeNull();
    expect((output.hints as string[])).toContain(
      'Try: backstage-agent auth login --backend-url <url>',
    );
  });
});
