import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import YAML from 'yaml';
import { getAuthenticatedContext } from './auth.js';
import { resetSecretStore, getSecretStore, getAuthInstanceService } from './secretStore.js';

let origHome: string;
let origXdgConfig: string | undefined;
let origXdgData: string | undefined;
let tempHome: string;

function writeInstancesFile(instances: Array<Record<string, unknown>>): void {
  const dir = join(tempHome, '.config', 'backstage-cli');
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'auth-instances.yaml'),
    YAML.stringify({ instances }),
    'utf-8',
  );
}

function makeInstance(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    name: 'test',
    baseUrl: 'https://test.example.com',
    clientId: 'https://test.example.com/api/auth/.well-known/oauth-client/cli.json',
    issuedAt: Date.now(),
    accessTokenExpiresAt: Date.now() + 3600000,
    selected: true,
    ...overrides,
  };
}

beforeEach(() => {
  origHome = process.env.HOME!;
  origXdgConfig = process.env.XDG_CONFIG_HOME;
  origXdgData = process.env.XDG_DATA_HOME;
  tempHome = mkdtempSync(join(tmpdir(), 'backstage-agent-test-'));
  process.env.HOME = tempHome;
  delete process.env.XDG_CONFIG_HOME;
  delete process.env.XDG_DATA_HOME;
  resetSecretStore();
});

afterEach(() => {
  process.env.HOME = origHome;
  if (origXdgConfig !== undefined) {
    process.env.XDG_CONFIG_HOME = origXdgConfig;
  } else {
    delete process.env.XDG_CONFIG_HOME;
  }
  if (origXdgData !== undefined) {
    process.env.XDG_DATA_HOME = origXdgData;
  } else {
    delete process.env.XDG_DATA_HOME;
  }
  rmSync(tempHome, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe('getAuthenticatedContext', () => {
  it('throws when no instances exist', async () => {
    await expect(getAuthenticatedContext()).rejects.toThrow(
      /No instances found/,
    );
  });

  it('throws when named instance is not found', async () => {
    writeInstancesFile([makeInstance({ name: 'prod' })]);

    await expect(getAuthenticatedContext('nonexistent')).rejects.toThrow(
      /Instance 'nonexistent' not found/,
    );
  });

  it('throws when no instance is selected and no name provided', async () => {
    writeInstancesFile([
      makeInstance({ name: 'prod', selected: false }),
      makeInstance({ name: 'staging', selected: false }),
    ]);

    await expect(getAuthenticatedContext()).rejects.toThrow(
      /No instance is currently selected/,
    );
  });

  it('returns context for selected instance', async () => {
    writeInstancesFile([
      makeInstance({ name: 'prod', selected: true }),
    ]);

    const store = getSecretStore();
    const service = getAuthInstanceService('prod');
    await store.set(service, 'accessToken', 'test-token-123');

    const ctx = await getAuthenticatedContext();
    expect(ctx.instanceName).toBe('prod');
    expect(ctx.baseUrl).toBe('https://test.example.com');
  });

  it('returns context for explicitly named instance', async () => {
    writeInstancesFile([
      makeInstance({ name: 'prod', selected: true }),
      makeInstance({ name: 'staging', baseUrl: 'https://staging.example.com', selected: false }),
    ]);

    const store = getSecretStore();
    await store.set(getAuthInstanceService('staging'), 'accessToken', 'staging-token');

    const ctx = await getAuthenticatedContext('staging');
    expect(ctx.instanceName).toBe('staging');
    expect(ctx.baseUrl).toBe('https://staging.example.com');
  });

  it('authenticatedFetch attaches Authorization header', async () => {
    writeInstancesFile([makeInstance({ name: 'prod', selected: true })]);

    const store = getSecretStore();
    await store.set(getAuthInstanceService('prod'), 'accessToken', 'my-bearer-token');

    const ctx = await getAuthenticatedContext('prod');

    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{}', { status: 200 }),
    );

    await ctx.fetch('https://test.example.com/api/test');

    expect(mockFetch).toHaveBeenCalledOnce();
    const [, init] = mockFetch.mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(headers.get('Authorization')).toBe('Bearer my-bearer-token');
  });

  it('authenticatedFetch throws when no access token exists', async () => {
    writeInstancesFile([makeInstance({ name: 'prod', selected: true })]);

    const ctx = await getAuthenticatedContext('prod');

    await expect(
      ctx.fetch('https://test.example.com/api/test'),
    ).rejects.toThrow(/No access token found/);
  });

  it('authenticatedFetch applies default timeout signal', async () => {
    writeInstancesFile([makeInstance({ name: 'prod', selected: true })]);

    const store = getSecretStore();
    await store.set(getAuthInstanceService('prod'), 'accessToken', 'token');

    const ctx = await getAuthenticatedContext('prod');

    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{}', { status: 200 }),
    );

    await ctx.fetch('https://test.example.com/api/test');

    const [, init] = mockFetch.mock.calls[0];
    expect(init?.signal).toBeDefined();
  });

  it('authenticatedFetch preserves caller-provided signal', async () => {
    writeInstancesFile([makeInstance({ name: 'prod', selected: true })]);

    const store = getSecretStore();
    await store.set(getAuthInstanceService('prod'), 'accessToken', 'token');

    const ctx = await getAuthenticatedContext('prod');

    const controller = new AbortController();
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{}', { status: 200 }),
    );

    await ctx.fetch('https://test.example.com/api/test', {
      signal: controller.signal,
    });

    const [, init] = mockFetch.mock.calls[0];
    expect(init?.signal).toBe(controller.signal);
  });
});
