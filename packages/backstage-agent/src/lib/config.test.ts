import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import yaml from 'js-yaml';
import { readConfig, writeConfig, isValidTrustPolicy } from './config.js';

let origHome: string;
let tempHome: string;

beforeEach(() => {
  origHome = process.env.HOME!;
  tempHome = mkdtempSync(join(tmpdir(), 'backstage-agent-test-'));
  process.env.HOME = tempHome;
});

afterEach(() => {
  process.env.HOME = origHome;
  rmSync(tempHome, { recursive: true, force: true });
});

describe('Config Management', () => {
  it('returns default config when no file exists', () => {
    const config = readConfig();
    expect(config.trustPolicy).toBe('all');
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
    const parsed = yaml.load(content) as { trustPolicy: string };
    expect(parsed.trustPolicy).toBe('reversible');
  });

  it('falls back to default for invalid trustPolicy in file', () => {
    writeConfig({ trustPolicy: 'bogus' as never });
    const config = readConfig();
    expect(config.trustPolicy).toBe('all');
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
