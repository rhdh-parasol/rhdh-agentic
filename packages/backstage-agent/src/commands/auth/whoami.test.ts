import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import YAML from 'yaml';
import { Command } from 'commander';
import { createWhoamiCommand } from './whoami.js';

vi.mock('../../lib/auth.js', () => ({
  getAuthenticatedContext: vi.fn(),
}));

let origHome: string;
let origXdg: string | undefined;
let tempHome: string;
let stdoutWrite: ReturnType<typeof vi.spyOn>;
let stderrWrite: ReturnType<typeof vi.spyOn>;
let processExit: ReturnType<typeof vi.spyOn>;

function createProgram(subCmd: Command): Command {
  const program = new Command();
  program.option('--output <format>', '', 'json');
  program.option('--instance <name>');
  program.exitOverride();
  program.configureOutput({ writeErr: () => {}, outputError: () => {} });

  const auth = new Command('auth');
  auth.exitOverride();
  auth.configureOutput({ writeErr: () => {}, outputError: () => {} });
  auth.addCommand(subCmd);
  program.addCommand(auth);
  return program;
}

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

beforeEach(() => {
  origHome = process.env.HOME!;
  origXdg = process.env.XDG_CONFIG_HOME;
  tempHome = mkdtempSync(join(tmpdir(), 'backstage-agent-whoami-test-'));
  process.env.HOME = tempHome;
  delete process.env.XDG_CONFIG_HOME;
  stdoutWrite = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
  stderrWrite = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
  processExit = vi.spyOn(process, 'exit').mockImplementation(() => {
    throw new Error('process.exit called');
  });
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

describe('auth whoami', () => {
  it('returns user identity on success', async () => {
    writeInstancesFile([
      makeInstance({ name: 'prod', baseUrl: 'https://prod.example.com', selected: true }),
    ]);

    const { getAuthenticatedContext } = await import('../../lib/auth.js');
    vi.mocked(getAuthenticatedContext).mockResolvedValue({
      instanceName: 'prod',
      baseUrl: 'https://prod.example.com',
      fetch: async () =>
        new Response(
          JSON.stringify({
            claims: {
              sub: 'user:default/alice',
              ent: ['group:default/team-a', 'group:default/team-b'],
            },
          }),
          { status: 200 },
        ),
    });

    const program = createProgram(createWhoamiCommand());
    await program.parseAsync(['node', 'test', 'auth', 'whoami']);

    const output = JSON.parse(stdoutWrite.mock.calls[0][0] as string);
    expect(output.data.instance).toBe('prod');
    expect(output.data.userEntityRef).toBe('user:default/alice');
    expect(output.data.ownershipEntityRefs).toEqual([
      'group:default/team-a',
      'group:default/team-b',
    ]);
    expect(output.trustLevel).toBe('read-only');
  });

  it('returns empty ownershipEntityRefs when claims.ent is missing', async () => {
    writeInstancesFile([
      makeInstance({ name: 'prod', baseUrl: 'https://prod.example.com', selected: true }),
    ]);

    const { getAuthenticatedContext } = await import('../../lib/auth.js');
    vi.mocked(getAuthenticatedContext).mockResolvedValue({
      instanceName: 'prod',
      baseUrl: 'https://prod.example.com',
      fetch: async () =>
        new Response(
          JSON.stringify({ claims: { sub: 'user:default/bob' } }),
          { status: 200 },
        ),
    });

    const program = createProgram(createWhoamiCommand());
    await program.parseAsync(['node', 'test', 'auth', 'whoami']);

    const output = JSON.parse(stdoutWrite.mock.calls[0][0] as string);
    expect(output.data.ownershipEntityRefs).toEqual([]);
  });

  it('errors when not authenticated', async () => {
    writeInstancesFile([
      makeInstance({ name: 'prod', baseUrl: 'https://prod.example.com', selected: true }),
    ]);

    const { getAuthenticatedContext } = await import('../../lib/auth.js');
    vi.mocked(getAuthenticatedContext).mockRejectedValue(
      new Error('No access token found'),
    );

    const program = createProgram(createWhoamiCommand());
    await expect(
      program.parseAsync(['node', 'test', 'auth', 'whoami']),
    ).rejects.toThrow('process.exit called');

    const output = JSON.parse(stderrWrite.mock.calls[0][0] as string);
    expect(output.error.code).toBe('AUTH_ERROR');
    expect(output.error.message).toContain('Not authenticated');
  });

  it('errors when userinfo fetch returns non-200', async () => {
    writeInstancesFile([
      makeInstance({ name: 'prod', baseUrl: 'https://prod.example.com', selected: true }),
    ]);

    const { getAuthenticatedContext } = await import('../../lib/auth.js');
    vi.mocked(getAuthenticatedContext).mockResolvedValue({
      instanceName: 'prod',
      baseUrl: 'https://prod.example.com',
      fetch: async () => new Response('Unauthorized', { status: 401 }),
    });

    const program = createProgram(createWhoamiCommand());
    await expect(
      program.parseAsync(['node', 'test', 'auth', 'whoami']),
    ).rejects.toThrow('process.exit called');

    const output = JSON.parse(stderrWrite.mock.calls[0][0] as string);
    expect(output.error.code).toBe('AUTH_ERROR');
    expect(output.error.message).toContain('Failed to fetch user identity');
  });

  it('errors when no instance is configured', async () => {
    const program = createProgram(createWhoamiCommand());
    await expect(
      program.parseAsync(['node', 'test', 'auth', 'whoami']),
    ).rejects.toThrow('process.exit called');

    const output = JSON.parse(stderrWrite.mock.calls[0][0] as string);
    expect(output.error.code).toBe('NO_AUTH_INSTANCE');
  });

  it('errors when --instance flag references unknown instance', async () => {
    writeInstancesFile([
      makeInstance({ name: 'prod', baseUrl: 'https://prod.example.com', selected: true }),
    ]);

    const program = createProgram(createWhoamiCommand());
    await expect(
      program.parseAsync(['node', 'test', 'auth', 'whoami', '--instance', 'nonexistent']),
    ).rejects.toThrow('process.exit called');

    const output = JSON.parse(stderrWrite.mock.calls[0][0] as string);
    expect(output.error.code).toBe('INSTANCE_NOT_FOUND');
  });
});
