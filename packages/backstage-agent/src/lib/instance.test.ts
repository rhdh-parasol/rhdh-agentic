import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import yaml from 'js-yaml';
import { readInstances, writeInstances, upsertInstance, getInstanceByName, setSelectedInstance } from './instance.js';

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

function writeInstancesFile(instances: Array<Record<string, unknown>>): void {
  const dir = join(tempHome, '.config', 'backstage-cli');
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'auth-instances.yaml'),
    yaml.dump({ instances }),
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

describe('Instance Resolution', () => {
  it('returns empty array when no file exists', () => {
    expect(readInstances()).toEqual([]);
  });

  it('reads instances from file', () => {
    writeInstancesFile([
      makeInstance({ name: 'prod', baseUrl: 'https://prod.example.com', selected: true }),
      makeInstance({ name: 'staging', baseUrl: 'https://staging.example.com', selected: false }),
    ]);

    const instances = readInstances();
    expect(instances).toHaveLength(2);
    expect(instances[0].name).toBe('prod');
    expect(instances[0].selected).toBe(true);
    expect(instances[1].name).toBe('staging');
  });

  it('writes instances back to file', () => {
    writeInstances([
      {
        name: 'test',
        baseUrl: 'https://test.example.com',
        clientId: 'https://test.example.com/api/auth/.well-known/oauth-client/cli.json',
        issuedAt: Date.now(),
        accessTokenExpiresAt: Date.now() + 3600000,
        selected: true,
      },
    ]);

    const instances = readInstances();
    expect(instances).toHaveLength(1);
    expect(instances[0].name).toBe('test');
    expect(instances[0].clientId).toContain('well-known');
  });

  it('upserts new instance', () => {
    writeInstances([
      {
        name: 'existing',
        baseUrl: 'https://existing.example.com',
        clientId: 'cid',
        issuedAt: 1000,
        accessTokenExpiresAt: 2000,
        selected: true,
      },
    ]);

    upsertInstance({
      name: 'new-one',
      baseUrl: 'https://new.example.com',
      clientId: 'cid2',
      issuedAt: 3000,
      accessTokenExpiresAt: 4000,
    });

    const instances = readInstances();
    expect(instances).toHaveLength(2);
    expect(instances[1].name).toBe('new-one');
  });

  it('upserts existing instance', () => {
    writeInstances([
      {
        name: 'existing',
        baseUrl: 'https://existing.example.com',
        clientId: 'cid',
        issuedAt: 1000,
        accessTokenExpiresAt: 2000,
        selected: true,
      },
    ]);

    upsertInstance({
      name: 'existing',
      baseUrl: 'https://existing.example.com',
      clientId: 'cid',
      issuedAt: 5000,
      accessTokenExpiresAt: 6000,
      selected: true,
    });

    const instances = readInstances();
    expect(instances).toHaveLength(1);
    expect(instances[0].issuedAt).toBe(5000);
  });

  it('gets instance by name', () => {
    writeInstancesFile([
      makeInstance({ name: 'prod' }),
      makeInstance({ name: 'staging' }),
    ]);

    expect(getInstanceByName('prod')?.name).toBe('prod');
    expect(getInstanceByName('nonexistent')).toBeUndefined();
  });

  it('sets selected instance', () => {
    writeInstancesFile([
      makeInstance({ name: 'prod', selected: true }),
      makeInstance({ name: 'staging', selected: false }),
    ]);

    setSelectedInstance('staging');

    const instances = readInstances();
    expect(instances.find(i => i.name === 'prod')?.selected).toBe(false);
    expect(instances.find(i => i.name === 'staging')?.selected).toBe(true);
  });
});
