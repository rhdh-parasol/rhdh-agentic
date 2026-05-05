import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { enforceTrustPolicy } from './enforce.js';
import { writeConfig } from './config.js';
import { CliError } from '../output/formatter.js';

let origHome: string;
let origXdg: string | undefined;
let tempHome: string;

beforeEach(() => {
  origHome = process.env.HOME!;
  origXdg = process.env.XDG_CONFIG_HOME;
  tempHome = mkdtempSync(join(tmpdir(), 'backstage-agent-test-'));
  process.env.HOME = tempHome;
  delete process.env.XDG_CONFIG_HOME;
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

describe('Trust Policy Enforcement', () => {
  it('blocks reversible command under read-only policy', () => {
    writeConfig({ trustPolicy: 'read-only' });

    try {
      enforceTrustPolicy('reversible');
      expect.unreachable('should throw');
    } catch (err) {
      expect(err).toBeInstanceOf(CliError);
      const cliErr = err as CliError;
      expect(cliErr.code).toBe('TRUST_POLICY_VIOLATION');
      expect(cliErr.message).toContain('reversible');
      expect(cliErr.message).toContain('read-only');
    }
  });

  it('allows read-only command under read-only policy', () => {
    writeConfig({ trustPolicy: 'read-only' });
    expect(() => enforceTrustPolicy('read-only')).not.toThrow();
  });

  it('blocks destructive commands under default read-only policy', () => {
    try {
      enforceTrustPolicy('destructive');
      expect.unreachable('should throw');
    } catch (err) {
      expect(err).toBeInstanceOf(CliError);
      expect((err as CliError).code).toBe('TRUST_POLICY_VIOLATION');
    }
  });

  it('produces CliError with recovery info', () => {
    writeConfig({ trustPolicy: 'read-only' });

    try {
      enforceTrustPolicy('destructive');
      expect.unreachable('should throw');
    } catch (err) {
      expect(err).toBeInstanceOf(CliError);
      const cliErr = err as CliError;
      expect(cliErr.code).toBe('TRUST_POLICY_VIOLATION');
      expect(cliErr.recovery).toBeTruthy();
    }
  });
});
