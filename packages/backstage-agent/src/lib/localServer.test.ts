import http from 'node:http';
import { describe, it, expect, afterEach } from 'vitest';
import { startCallbackServer } from './localServer.js';

let cleanup: (() => Promise<void>) | undefined;

afterEach(async () => {
  await cleanup?.();
  cleanup = undefined;
});

describe('startCallbackServer', () => {
  it('resolves when a valid callback arrives', async () => {
    const state = 'test-state-123';
    const callback = await startCallbackServer({ state });
    cleanup = callback.close;

    const url = new URL(callback.url);
    url.searchParams.set('code', 'auth-code-456');
    url.searchParams.set('state', state);

    const resp = await fetch(url.toString());
    expect(resp.status).toBe(200);

    const result = await callback.waitForCode();
    expect(result.code).toBe('auth-code-456');
    expect(result.state).toBe(state);
  });

  it('rejects after timeout', async () => {
    const callback = await startCallbackServer({
      state: 'test',
      timeoutMs: 100,
    });
    cleanup = callback.close;

    await expect(callback.waitForCode()).rejects.toThrow(/timed out/i);
  });

  it('returns 400 for state mismatch', async () => {
    const callback = await startCallbackServer({ state: 'expected-state' });
    cleanup = callback.close;

    const url = new URL(callback.url);
    url.searchParams.set('code', 'some-code');
    url.searchParams.set('state', 'wrong-state');

    const resp = await fetch(url.toString());
    expect(resp.status).toBe(400);
    expect(await resp.text()).toBe('State mismatch');
  });

  it('returns 400 when code is missing', async () => {
    const callback = await startCallbackServer({ state: 'test-state' });
    cleanup = callback.close;

    const url = new URL(callback.url);
    url.searchParams.set('state', 'test-state');

    const resp = await fetch(url.toString());
    expect(resp.status).toBe(400);
    expect(await resp.text()).toBe('Missing code');
  });

  it('returns 404 for non-callback paths', async () => {
    const callback = await startCallbackServer({ state: 'test-state' });
    cleanup = callback.close;

    const baseUrl = callback.url.replace('/callback', '/other-path');
    const resp = await fetch(baseUrl);
    expect(resp.status).toBe(404);
  });

  it('rejects with descriptive error when port is in use', async () => {
    const blockingServer = http.createServer();
    await new Promise<void>((resolve, reject) => {
      blockingServer.on('error', reject);
      blockingServer.listen(8055, '127.0.0.1', resolve);
    });

    try {
      await expect(
        startCallbackServer({ state: 'test' }),
      ).rejects.toThrow(/Port 8055 is already in use/);
    } finally {
      await new Promise<void>(resolve => blockingServer.close(() => resolve()));
    }
  });
});
