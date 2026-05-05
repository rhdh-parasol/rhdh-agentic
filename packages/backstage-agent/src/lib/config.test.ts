import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import YAML from 'yaml';
import { readConfig, writeConfig, isValidTrustPolicy } from './config.js';

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

describe('Config Management', () => {
  it('returns default config when no file exists', () => {
    const config = readConfig();
    expect(config.trustPolicy).toBe('read-only');
  });

  it('reads trustPolicy from config file', () => {
    writeConfig({ trustPolicy: 'read-only' });
    const config = readConfig();
    expect(config.trustPolicy).toBe('read-only');
  });

  it('writes config file as YAML', () => {
    writeConfig({ trustPolicy: 'reversible' });

    const content = readFileSync(
      join(tempHome, '.config', 'backstage-agent', 'config.yaml'),
      'utf-8',
    );
    const parsed = YAML.parse(content) as { trustPolicy: string };
    expect(parsed.trustPolicy).toBe('reversible');
  });

  it('throws for invalid trustPolicy in file', () => {
    writeConfig({ trustPolicy: 'bogus' as never });
    expect(() => readConfig()).toThrow('Invalid trust policy "bogus"');
  });

  it('falls back to default when trustPolicy field is absent', () => {
    const dir = join(tempHome, '.config', 'backstage-agent');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'config.yaml'), 'someOtherField: true\n', 'utf-8');
    const config = readConfig();
    expect(config.trustPolicy).toBe('read-only');
  });

  it('respects XDG_CONFIG_HOME', () => {
    const xdgDir = join(tempHome, 'custom-config');
    process.env.XDG_CONFIG_HOME = xdgDir;

    writeConfig({ trustPolicy: 'read-only' });

    const content = readFileSync(
      join(xdgDir, 'backstage-agent', 'config.yaml'),
      'utf-8',
    );
    const parsed = YAML.parse(content) as { trustPolicy: string };
    expect(parsed.trustPolicy).toBe('read-only');

    const config = readConfig();
    expect(config.trustPolicy).toBe('read-only');
  });
});

describe('isValidTrustPolicy', () => {
  it('accepts valid policy values', () => {
    expect(isValidTrustPolicy('read-only')).toBe(true);
    expect(isValidTrustPolicy('reversible')).toBe(true);
    expect(isValidTrustPolicy('all')).toBe(true);
  });

  it('rejects invalid values', () => {
    expect(isValidTrustPolicy('bogus')).toBe(false);
    expect(isValidTrustPolicy('')).toBe(false);
    expect(isValidTrustPolicy(null)).toBe(false);
    expect(isValidTrustPolicy(undefined)).toBe(false);
  });
});
