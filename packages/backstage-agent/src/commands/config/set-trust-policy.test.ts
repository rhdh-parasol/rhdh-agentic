import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Command } from 'commander';
import { createSetTrustPolicyCommand } from './set-trust-policy.js';
import { readConfig, writeConfig } from '../../lib/config.js';

let origHome: string;
let origXdg: string | undefined;
let tempHome: string;
let stdoutWrite: ReturnType<typeof vi.spyOn>;
let stderrWrite: ReturnType<typeof vi.spyOn>;

function createProgram(): Command {
  const program = new Command();
  program.option('--output <format>', '', 'json');
  program.option('--instance <name>');
  program.exitOverride();
  program.configureOutput({ writeErr: () => {}, outputError: () => {} });

  const config = new Command('config');
  config.exitOverride();
  config.configureOutput({ writeErr: () => {}, outputError: () => {} });
  config.addCommand(createSetTrustPolicyCommand());
  program.addCommand(config);
  return program;
}

beforeEach(() => {
  origHome = process.env.HOME!;
  origXdg = process.env.XDG_CONFIG_HOME;
  tempHome = mkdtempSync(join(tmpdir(), 'backstage-agent-test-'));
  process.env.HOME = tempHome;
  delete process.env.XDG_CONFIG_HOME;
  stdoutWrite = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
  stderrWrite = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
  vi.spyOn(process, 'exit').mockImplementation(() => {
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
  vi.restoreAllMocks();
});

describe('config set-trust-policy', () => {
  it('sets a valid trust policy', () => {
    const program = createProgram();
    program.parse(['node', 'backstage-agent', 'config', 'set-trust-policy', 'read-only']);

    const output = JSON.parse(stdoutWrite.mock.calls[0][0] as string);
    expect(output.data.trustPolicy).toBe('read-only');

    const config = readConfig();
    expect(config.trustPolicy).toBe('read-only');
  });

  it('persists all valid policy values', () => {
    for (const level of ['read-only', 'reversible', 'all'] as const) {
      const program = createProgram();
      stdoutWrite.mockClear();
      program.parse(['node', 'backstage-agent', 'config', 'set-trust-policy', level]);

      const config = readConfig();
      expect(config.trustPolicy).toBe(level);
    }
  });

  it('rejects an invalid trust policy with USAGE_ERROR', () => {
    const program = createProgram();

    expect(() =>
      program.parse(['node', 'backstage-agent', 'config', 'set-trust-policy', 'bogus']),
    ).toThrow('process.exit called');

    const output = JSON.parse(stderrWrite.mock.calls[0][0] as string);
    expect(output.error.code).toBe('USAGE_ERROR');
    expect(output.error.message).toContain('bogus');
  });

  it('updates an existing trust policy', () => {
    writeConfig({ trustPolicy: 'all' });

    const program = createProgram();
    program.parse(['node', 'backstage-agent', 'config', 'set-trust-policy', 'read-only']);

    const config = readConfig();
    expect(config.trustPolicy).toBe('read-only');
  });

  it('outputs structured success envelope', () => {
    const program = createProgram();
    program.parse(['node', 'backstage-agent', 'config', 'set-trust-policy', 'reversible']);

    const output = JSON.parse(stdoutWrite.mock.calls[0][0] as string);
    expect(output.data).toEqual({ trustPolicy: 'reversible' });
    expect(output.trustLevel).toBe('reversible');
    expect(output.hints).toEqual([]);
  });
});
