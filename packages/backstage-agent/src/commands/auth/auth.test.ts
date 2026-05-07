import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import YAML from 'yaml';
import { Command } from 'commander';
import { createStatusCommand } from './status.js';
import { createSelectCommand } from './select.js';
import { createLogoutCommand } from './logout.js';
import { resetSecretStore } from '../../lib/secretStore.js';

let origHome: string;
let origXdg: string | undefined;
let origXdgData: string | undefined;
let tempHome: string;
let stdoutWrite: ReturnType<typeof vi.spyOn>;
let stderrWrite: ReturnType<typeof vi.spyOn>;
let processExit: ReturnType<typeof vi.spyOn>;

function instancesPath(): string {
  return join(tempHome, '.config', 'backstage-cli', 'auth-instances.yaml');
}

function writeInstancesFile(instances: Array<Record<string, unknown>>): void {
  const dir = join(tempHome, '.config', 'backstage-cli');
  mkdirSync(dir, { recursive: true });
  writeFileSync(instancesPath(), YAML.stringify({ instances }), 'utf-8');
}

function readInstancesFile(): Array<Record<string, unknown>> {
  const content = readFileSync(instancesPath(), 'utf-8');
  const parsed = YAML.parse(content) as { instances: Array<Record<string, unknown>> };
  return parsed.instances;
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

beforeEach(() => {
  origHome = process.env.HOME!;
  origXdg = process.env.XDG_CONFIG_HOME;
  origXdgData = process.env.XDG_DATA_HOME;
  tempHome = mkdtempSync(join(tmpdir(), 'backstage-agent-test-'));
  process.env.HOME = tempHome;
  delete process.env.XDG_CONFIG_HOME;
  process.env.XDG_DATA_HOME = join(tempHome, '.local', 'share');
  resetSecretStore();
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
  if (origXdgData !== undefined) {
    process.env.XDG_DATA_HOME = origXdgData;
  } else {
    delete process.env.XDG_DATA_HOME;
  }
  resetSecretStore();
  rmSync(tempHome, { recursive: true, force: true });
});

describe('auth status', () => {
  it('returns empty instances array when no credentials stored', () => {
    const program = createProgram(createStatusCommand());
    program.parse(['node', 'test', 'auth', 'status']);

    const output = JSON.parse(stdoutWrite.mock.calls[0][0] as string);
    expect(output.data.instances).toEqual([]);
    expect(output.trustLevel).toBe('read-only');
    expect(output.hints.length).toBeGreaterThan(0);
  });

  it('lists all stored instances', () => {
    const expiresAt = Date.now() + 3600000;
    writeInstancesFile([
      makeInstance({ name: 'prod', baseUrl: 'https://prod.example.com', selected: true, accessTokenExpiresAt: expiresAt }),
      makeInstance({ name: 'staging', baseUrl: 'https://staging.example.com', selected: false }),
    ]);

    const program = createProgram(createStatusCommand());
    program.parse(['node', 'test', 'auth', 'status']);

    const output = JSON.parse(stdoutWrite.mock.calls[0][0] as string);
    expect(output.data.instances).toHaveLength(2);
    expect(output.data.instances[0].name).toBe('prod');
    expect(output.data.instances[0].selected).toBe(true);
    expect(output.data.instances[0].tokenExpiresAt).toBe(new Date(expiresAt).toISOString());
    expect(output.data.instances[1].name).toBe('staging');
  });
});

describe('auth select', () => {
  it('switches the selected instance', () => {
    writeInstancesFile([
      makeInstance({ name: 'prod', baseUrl: 'https://prod.example.com', selected: true }),
      makeInstance({ name: 'staging', baseUrl: 'https://staging.example.com', selected: false }),
    ]);

    const program = createProgram(createSelectCommand());
    program.parse(['node', 'test', 'auth', 'select', 'staging']);

    const output = JSON.parse(stdoutWrite.mock.calls[0][0] as string);
    expect(output.data.selected).toBe('staging');

    const instances = readInstancesFile();
    expect(instances.find((i: Record<string, unknown>) => i.name === 'staging')?.selected).toBe(true);
    expect(instances.find((i: Record<string, unknown>) => i.name === 'prod')?.selected).toBe(false);
  });

  it('errors for unknown instance name', () => {
    writeInstancesFile([
      makeInstance({ name: 'prod', baseUrl: 'https://prod.example.com', selected: true }),
    ]);

    const program = createProgram(createSelectCommand());
    expect(() => program.parse(['node', 'test', 'auth', 'select', 'nonexistent']))
      .toThrow('process.exit called');

    const output = JSON.parse(stderrWrite.mock.calls[0][0] as string);
    expect(output.error.code).toBe('INSTANCE_NOT_FOUND');
  });
});

describe('auth logout', () => {
  it('removes the selected instance', async () => {
    writeInstancesFile([
      makeInstance({ name: 'prod', baseUrl: 'https://prod.example.com', selected: true }),
    ]);

    const program = createProgram(createLogoutCommand());
    await program.parseAsync(['node', 'test', 'auth', 'logout']);

    const output = JSON.parse(stdoutWrite.mock.calls[0][0] as string);
    expect(output.data.loggedOut).toBe('prod');

    const instances = readInstancesFile();
    expect(instances).toHaveLength(0);
  });

  it('clears selected flag when other instances remain', async () => {
    writeInstancesFile([
      makeInstance({ name: 'prod', baseUrl: 'https://prod.example.com', selected: true }),
      makeInstance({ name: 'staging', baseUrl: 'https://staging.example.com', selected: false }),
    ]);

    const program = createProgram(createLogoutCommand());
    await program.parseAsync(['node', 'test', 'auth', 'logout']);

    const instances = readInstancesFile();
    expect(instances).toHaveLength(1);
    expect(instances[0].name).toBe('staging');
    expect(instances[0].selected).toBe(false);
  });

  it('logs out a specific instance via --instance flag', async () => {
    writeInstancesFile([
      makeInstance({ name: 'prod', baseUrl: 'https://prod.example.com', selected: true }),
      makeInstance({ name: 'staging', baseUrl: 'https://staging.example.com', selected: false }),
    ]);

    const program = createProgram(createLogoutCommand());
    await program.parseAsync(['node', 'test', '--instance', 'staging', 'auth', 'logout']);

    const output = JSON.parse(stdoutWrite.mock.calls[0][0] as string);
    expect(output.data.loggedOut).toBe('staging');

    const instances = readInstancesFile();
    expect(instances).toHaveLength(1);
    expect(instances[0].name).toBe('prod');
    expect(instances[0].selected).toBe(true);
  });

  it('errors when --instance references nonexistent instance', async () => {
    writeInstancesFile([
      makeInstance({ name: 'prod', baseUrl: 'https://prod.example.com', selected: true }),
    ]);

    const program = createProgram(createLogoutCommand());
    await expect(
      program.parseAsync(['node', 'test', '--instance', 'nonexistent', 'auth', 'logout']),
    ).rejects.toThrow('process.exit called');

    const output = JSON.parse(stderrWrite.mock.calls[0][0] as string);
    expect(output.error.code).toBe('INSTANCE_NOT_FOUND');
  });

  it('errors when no instance is selected and no --instance flag', async () => {
    writeInstancesFile([
      makeInstance({ name: 'prod', baseUrl: 'https://prod.example.com', selected: false }),
      makeInstance({ name: 'staging', baseUrl: 'https://staging.example.com', selected: false }),
    ]);

    const program = createProgram(createLogoutCommand());
    await expect(
      program.parseAsync(['node', 'test', 'auth', 'logout']),
    ).rejects.toThrow('process.exit called');

    const output = JSON.parse(stderrWrite.mock.calls[0][0] as string);
    expect(output.error.code).toBe('NO_SELECTED_INSTANCE');
  });
});
