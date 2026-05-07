import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { getSecretStore, getAuthInstanceService, resetSecretStore } from './secretStore.js';

let origHome: string;
let origXdg: string | undefined;
let tempHome: string;

beforeEach(() => {
  origHome = process.env.HOME!;
  origXdg = process.env.XDG_DATA_HOME;
  tempHome = mkdtempSync(join(tmpdir(), 'backstage-agent-test-'));
  process.env.HOME = tempHome;
  delete process.env.XDG_DATA_HOME;
  resetSecretStore();
});

afterEach(() => {
  process.env.HOME = origHome;
  if (origXdg !== undefined) {
    process.env.XDG_DATA_HOME = origXdg;
  } else {
    delete process.env.XDG_DATA_HOME;
  }
  rmSync(tempHome, { recursive: true, force: true });
});

describe('SecretStore', () => {
  it('returns undefined for a missing secret', async () => {
    const store = getSecretStore();
    const value = await store.get('service', 'account');
    expect(value).toBeUndefined();
  });

  it('stores and retrieves a secret', async () => {
    const store = getSecretStore();
    await store.set('service', 'account', 'my-secret-token');
    const value = await store.get('service', 'account');
    expect(value).toBe('my-secret-token');
  });

  it('overwrites an existing secret', async () => {
    const store = getSecretStore();
    await store.set('service', 'account', 'old-token');
    await store.set('service', 'account', 'new-token');
    const value = await store.get('service', 'account');
    expect(value).toBe('new-token');
  });

  it('writes secret files with restrictive permissions', async () => {
    const store = getSecretStore();
    await store.set('service', 'account', 'secret');
    const secretDir = join(tempHome, '.local', 'share', 'backstage-cli', 'auth-secrets');
    const files = rmSync; // just need the path
    const secretFile = join(secretDir, 'service', 'account.secret');
    const stat = statSync(secretFile);
    expect(stat.mode & 0o777).toBe(0o600);
  });

  it('deletes a stored secret', async () => {
    const store = getSecretStore();
    await store.set('service', 'account', 'token');
    await store.delete('service', 'account');
    const value = await store.get('service', 'account');
    expect(value).toBeUndefined();
  });

  it('does not throw when deleting a non-existent secret', async () => {
    const store = getSecretStore();
    await expect(store.delete('service', 'nonexistent')).resolves.toBeUndefined();
  });

  it('isolates secrets by service and account', async () => {
    const store = getSecretStore();
    await store.set('svc-a', 'acct-1', 'token-a1');
    await store.set('svc-a', 'acct-2', 'token-a2');
    await store.set('svc-b', 'acct-1', 'token-b1');

    expect(await store.get('svc-a', 'acct-1')).toBe('token-a1');
    expect(await store.get('svc-a', 'acct-2')).toBe('token-a2');
    expect(await store.get('svc-b', 'acct-1')).toBe('token-b1');
  });

  it('respects XDG_DATA_HOME', async () => {
    const xdgDir = join(tempHome, 'custom-data');
    process.env.XDG_DATA_HOME = xdgDir;
    resetSecretStore();

    const store = getSecretStore();
    await store.set('service', 'account', 'xdg-secret');

    const secretFile = join(xdgDir, 'backstage-cli', 'auth-secrets', 'service', 'account.secret');
    const content = readFileSync(secretFile, 'utf8');
    expect(content).toBe('xdg-secret');
  });
});

describe('getAuthInstanceService', () => {
  it('produces the correct service key format', () => {
    expect(getAuthInstanceService('my-instance')).toBe(
      'backstage-cli:auth-instance:my-instance',
    );
  });
});
