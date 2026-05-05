import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import YAML from 'yaml';
import { Command } from 'commander';
import { createLoginCommand } from './login.js';
import { resetSecretStore } from '../../lib/secretStore.js';

vi.mock('node:readline', () => ({
  createInterface: vi.fn(() => ({
    question: (_prompt: string, cb: (answer: string) => void) => {
      const writes = vi.mocked(process.stdout.write).mock.calls;
      const authUrlLine = writes
        .map(c => String(c[0]))
        .find(s => s.includes('/v1/authorize'));
      const match = authUrlLine!.match(/(https?:\/\/\S+)/);
      const url = new URL(match![1]);
      const state = url.searchParams.get('state')!;
      cb(`http://localhost:0/callback?code=test-auth-code&state=${state}`);
    },
    close: vi.fn(),
  })),
}));

let origHome: string;
let origXdg: string | undefined;
let origXdgData: string | undefined;
let tempHome: string;
let stdoutWrite: ReturnType<typeof vi.spyOn>;
let stderrWrite: ReturnType<typeof vi.spyOn>;
let processExit: ReturnType<typeof vi.spyOn>;
let fetchSpy: ReturnType<typeof vi.spyOn>;

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

function readInstancesFile(): Array<Record<string, unknown>> {
  const content = readFileSync(
    join(tempHome, '.config', 'backstage-cli', 'auth-instances.yaml'),
    'utf-8',
  );
  const parsed = YAML.parse(content) as { instances: Array<Record<string, unknown>> };
  return parsed.instances;
}

function readSecretFile(instanceName: string, account: string): string {
  const service = `backstage-cli:auth-instance:${instanceName}`;
  return readFileSync(
    join(
      tempHome,
      '.local',
      'share',
      'backstage-cli',
      'auth-secrets',
      encodeURIComponent(service),
      `${encodeURIComponent(account)}.secret`,
    ),
    'utf-8',
  );
}

beforeEach(() => {
  origHome = process.env.HOME!;
  origXdg = process.env.XDG_CONFIG_HOME;
  origXdgData = process.env.XDG_DATA_HOME;
  tempHome = mkdtempSync(join(tmpdir(), 'backstage-agent-login-test-'));
  process.env.HOME = tempHome;
  delete process.env.XDG_CONFIG_HOME;
  process.env.XDG_DATA_HOME = join(tempHome, '.local', 'share');
  resetSecretStore();
  stdoutWrite = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
  stderrWrite = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
  processExit = vi.spyOn(process, 'exit').mockImplementation(() => {
    throw new Error('process.exit called');
  });

  fetchSpy = vi.spyOn(globalThis, 'fetch');
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

function mockFetchForLogin(overrides?: {
  clientConfigStatus?: number;
  tokenStatus?: number;
  tokenBody?: Record<string, unknown>;
}): void {
  const clientConfigStatus = overrides?.clientConfigStatus ?? 200;
  const tokenStatus = overrides?.tokenStatus ?? 200;
  const tokenBody = overrides?.tokenBody ?? {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
  };

  fetchSpy.mockImplementation(async (url: string | URL | Request) => {
    const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;

    if (urlStr.includes('.well-known/oauth-client/cli.json')) {
      return new Response(JSON.stringify({ client_id: 'test-client' }), {
        status: clientConfigStatus,
      });
    }
    if (urlStr.includes('/v1/token')) {
      return new Response(JSON.stringify(tokenBody), {
        status: tokenStatus,
        statusText: tokenStatus === 200 ? 'OK' : 'Bad Request',
      });
    }
    return new Response('Not found', { status: 404 });
  });
}

describe('auth login', () => {
  it('completes login flow successfully', async () => {
    mockFetchForLogin();

    const program = createProgram(createLoginCommand());
    await program.parseAsync([
      'node', 'test', 'auth', 'login',
      '--backend-url', 'https://backstage.example.com',
      '--no-browser',
    ]);

    const output = JSON.parse(stdoutWrite.mock.calls.at(-1)![0] as string);
    expect(output.data.instance).toBe('backstage.example.com');
    expect(output.data.backendUrl).toBe('https://backstage.example.com');
    expect(output.trustLevel).toBe('reversible');

    const instances = readInstancesFile();
    expect(instances).toHaveLength(1);
    expect(instances[0].name).toBe('backstage.example.com');
    expect(instances[0].selected).toBe(true);

    const accessToken = readSecretFile('backstage.example.com', 'accessToken');
    expect(accessToken).toBe('test-access-token');
    const refreshToken = readSecretFile('backstage.example.com', 'refreshToken');
    expect(refreshToken).toBe('test-refresh-token');
  });

  it('uses --instance flag as instance name', async () => {
    mockFetchForLogin();

    const program = createProgram(createLoginCommand());
    await program.parseAsync([
      'node', 'test', 'auth', 'login',
      '--backend-url', 'https://backstage.example.com',
      '--instance', 'my-prod',
      '--no-browser',
    ]);

    const output = JSON.parse(stdoutWrite.mock.calls.at(-1)![0] as string);
    expect(output.data.instance).toBe('my-prod');

    const instances = readInstancesFile();
    expect(instances[0].name).toBe('my-prod');
  });

  it('errors when backend is unreachable', async () => {
    fetchSpy.mockImplementation(async () => {
      throw new Error('fetch failed');
    });

    const program = createProgram(createLoginCommand());
    await expect(
      program.parseAsync([
        'node', 'test', 'auth', 'login',
        '--backend-url', 'https://unreachable.example.com',
        '--no-browser',
      ]),
    ).rejects.toThrow('process.exit called');

    const output = JSON.parse(stderrWrite.mock.calls[0][0] as string);
    expect(output.error.code).toBe('CONNECTION_ERROR');
    expect(output.error.message).toContain('Failed to connect');
  });

  it('errors when client config returns non-200', async () => {
    mockFetchForLogin({ clientConfigStatus: 404 });

    const program = createProgram(createLoginCommand());
    await expect(
      program.parseAsync([
        'node', 'test', 'auth', 'login',
        '--backend-url', 'https://backstage.example.com',
        '--no-browser',
      ]),
    ).rejects.toThrow('process.exit called');

    const output = JSON.parse(stderrWrite.mock.calls[0][0] as string);
    expect(output.error.code).toBe('CONNECTION_ERROR');
  });

  it('errors when token exchange fails', async () => {
    mockFetchForLogin({ tokenStatus: 400, tokenBody: { error: 'invalid_grant' } });

    const program = createProgram(createLoginCommand());
    await expect(
      program.parseAsync([
        'node', 'test', 'auth', 'login',
        '--backend-url', 'https://backstage.example.com',
        '--no-browser',
      ]),
    ).rejects.toThrow('process.exit called');

    const output = JSON.parse(stderrWrite.mock.calls[0][0] as string);
    expect(output.error.code).toBe('AUTH_ERROR');
    expect(output.error.message).toContain('Token exchange failed');
  });

  it('errors for invalid trust policy value', async () => {
    const program = createProgram(createLoginCommand());
    await expect(
      program.parseAsync([
        'node', 'test', 'auth', 'login',
        '--backend-url', 'https://backstage.example.com',
        '--trust-policy', 'invalid-level',
        '--no-browser',
      ]),
    ).rejects.toThrow('process.exit called');

    const output = JSON.parse(stderrWrite.mock.calls[0][0] as string);
    expect(output.error.code).toBe('USAGE_ERROR');
    expect(output.error.message).toContain('Invalid trust policy');
  });

  it('sets trust policy when --trust-policy is provided', async () => {
    mockFetchForLogin();

    const program = createProgram(createLoginCommand());
    await program.parseAsync([
      'node', 'test', 'auth', 'login',
      '--backend-url', 'https://backstage.example.com',
      '--trust-policy', 'read-only',
      '--no-browser',
    ]);

    const output = JSON.parse(stdoutWrite.mock.calls.at(-1)![0] as string);
    expect(output.data.trustPolicy).toBe('read-only');

    const configContent = readFileSync(
      join(tempHome, '.config', 'backstage-agent', 'config.yaml'),
      'utf-8',
    );
    const config = YAML.parse(configContent) as Record<string, unknown>;
    expect(config.trustPolicy).toBe('read-only');
  });

  it('stores access token without refresh token when not provided', async () => {
    mockFetchForLogin({
      tokenBody: { access_token: 'only-access', expires_in: 3600 },
    });

    const program = createProgram(createLoginCommand());
    await program.parseAsync([
      'node', 'test', 'auth', 'login',
      '--backend-url', 'https://backstage.example.com',
      '--no-browser',
    ]);

    const accessToken = readSecretFile('backstage.example.com', 'accessToken');
    expect(accessToken).toBe('only-access');
  });
});
