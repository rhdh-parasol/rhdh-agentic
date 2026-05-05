import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { enforceTrustPolicy } from './enforce.js';
import { writeConfig } from './config.js';

let origHome: string;
let tempHome: string;
let stderrWrite: ReturnType<typeof vi.spyOn>;
let processExit: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  origHome = process.env.HOME!;
  tempHome = mkdtempSync(join(tmpdir(), 'backstage-agent-test-'));
  process.env.HOME = tempHome;
  stderrWrite = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
  processExit = vi.spyOn(process, 'exit').mockImplementation(() => {
    throw new Error('process.exit called');
  });
});

afterEach(() => {
  process.env.HOME = origHome;
  rmSync(tempHome, { recursive: true, force: true });
});

describe('Trust Policy Enforcement', () => {
  it('blocks reversible command under read-only policy', () => {
    writeConfig({ trustPolicy: 'read-only' });

    expect(() => enforceTrustPolicy('catalog update', 'reversible', 'json'))
      .toThrow('process.exit called');

    const output = JSON.parse(stderrWrite.mock.calls[0][0] as string);
    expect(output.error.code).toBe('TRUST_POLICY_VIOLATION');
    expect(output.error.message).toContain('reversible');
    expect(output.error.message).toContain('read-only');
  });

  it('allows read-only command under read-only policy', () => {
    writeConfig({ trustPolicy: 'read-only' });
    expect(() => enforceTrustPolicy('catalog list', 'read-only', 'json')).not.toThrow();
  });

  it('exempts config set-trust-policy from enforcement', () => {
    writeConfig({ trustPolicy: 'read-only' });
    expect(() => enforceTrustPolicy('config set-trust-policy', 'reversible', 'json')).not.toThrow();
  });

  it('exempts auth commands from enforcement', () => {
    writeConfig({ trustPolicy: 'read-only' });
    expect(() => enforceTrustPolicy('auth login', 'reversible', 'json')).not.toThrow();
    expect(() => enforceTrustPolicy('auth status', 'read-only', 'json')).not.toThrow();
    expect(() => enforceTrustPolicy('auth select', 'reversible', 'json')).not.toThrow();
    expect(() => enforceTrustPolicy('auth logout', 'reversible', 'json')).not.toThrow();
  });

  it('allows all commands under default policy', () => {
    expect(() => enforceTrustPolicy('templates execute', 'destructive', 'json')).not.toThrow();
  });

  it('produces TRUST_POLICY_VIOLATION error envelope', () => {
    writeConfig({ trustPolicy: 'read-only' });

    expect(() => enforceTrustPolicy('templates execute', 'destructive', 'json'))
      .toThrow('process.exit called');

    const output = JSON.parse(stderrWrite.mock.calls[0][0] as string);
    expect(output.error.code).toBe('TRUST_POLICY_VIOLATION');
    expect(output.error.recovery).toBeTruthy();
    expect(output.hints.length).toBeGreaterThan(0);
    expect(processExit).toHaveBeenCalledWith(1);
  });
});
