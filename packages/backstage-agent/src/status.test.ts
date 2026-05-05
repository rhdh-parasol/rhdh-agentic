import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import yaml from 'js-yaml';

let origHome: string;
let origXdg: string | undefined;
let tempHome: string;
let stdoutWrite: ReturnType<typeof vi.spyOn>;

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
    yaml.dump({ instances }),
    'utf-8',
  );
}

beforeEach(() => {
  origHome = process.env.HOME!;
  origXdg = process.env.XDG_CONFIG_HOME;
  tempHome = mkdtempSync(join(tmpdir(), 'backstage-agent-test-'));
  process.env.HOME = tempHome;
  delete process.env.XDG_CONFIG_HOME;
  stdoutWrite = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
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

describe('No-arg status summary', () => {
  it('returns status with authenticated instance', async () => {
    writeInstancesFile([
      makeInstance({ name: 'prod', baseUrl: 'https://prod.example.com', selected: true }),
    ]);

    const { readInstances } = await import('./lib/instance.js');
    const { readConfig } = await import('./lib/config.js');
    const { formatSuccess } = await import('./output/formatter.js');
    const { tryCommand } = await import('./output/hints.js');

    const instances = readInstances();
    const selected = instances.find(i => i.selected);
    const config = readConfig();

    const data = {
      instance: selected ? { name: selected.name, authenticated: true } : null,
      trustPolicy: config.trustPolicy,
      commandGroups: [
        { name: 'auth', description: 'Authentication and instance management' },
        { name: 'config', description: 'CLI configuration' },
      ],
    };

    formatSuccess(data, [tryCommand('auth status')], 'read-only', 'json');

    const output = JSON.parse(stdoutWrite.mock.calls[0][0] as string);
    expect(output.data.instance).toEqual({ name: 'prod', authenticated: true });
    expect(output.data.trustPolicy).toBe('all');
    expect(output.data.commandGroups).toHaveLength(2);
    expect(output.trustLevel).toBe('read-only');
  });

  it('returns null instance when no credentials configured', async () => {
    const { readInstances } = await import('./lib/instance.js');
    const { readConfig } = await import('./lib/config.js');
    const { formatSuccess } = await import('./output/formatter.js');
    const { loginHint } = await import('./output/hints.js');

    const instances = readInstances();
    const selected = instances.find(i => i.selected);
    const config = readConfig();

    const data = {
      instance: selected ? { name: selected.name, authenticated: true } : null,
      trustPolicy: config.trustPolicy,
      commandGroups: [
        { name: 'auth', description: 'Authentication and instance management' },
        { name: 'config', description: 'CLI configuration' },
      ],
    };

    const hints = selected ? [] : [loginHint()];
    formatSuccess(data, hints, 'read-only', 'json');

    const output = JSON.parse(stdoutWrite.mock.calls[0][0] as string);
    expect(output.data.instance).toBeNull();
    expect(output.hints).toContain('Try: backstage-agent auth login --backend-url <url>');
  });
});
