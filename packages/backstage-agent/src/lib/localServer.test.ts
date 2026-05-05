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
});
