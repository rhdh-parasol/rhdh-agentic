import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import YAML from 'yaml';
import { readInstances, writeInstances, upsertInstance, getInstanceByName, setSelectedInstance, removeInstance, resolveInstance } from './instance.js';
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

  it('throws on malformed entries in instances file', () => {
    const dir = join(tempHome, '.config', 'backstage-cli');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 'auth-instances.yaml'),
      YAML.stringify({
        instances: [
          makeInstance({ name: 'valid' }),
          { name: '', baseUrl: 'https://empty-name.example.com' },
          { baseUrl: 'https://missing-name.example.com' },
          'not-an-object',
        ],
      }),
      'utf-8',
    );

    expect(() => readInstances()).toThrow('malformed entries');
  });

  it('throws when instances field is not an array', () => {
    const dir = join(tempHome, '.config', 'backstage-cli');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 'auth-instances.yaml'),
      'instances: not-an-array\n',
      'utf-8',
    );

    expect(() => readInstances()).toThrow('expected "instances" to be an array');
  });

  it('returns empty array for empty file', () => {
    const dir = join(tempHome, '.config', 'backstage-cli');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'auth-instances.yaml'), '', 'utf-8');

    expect(readInstances()).toEqual([]);
  });

  it('throws when file has non-object YAML structure', () => {
    const dir = join(tempHome, '.config', 'backstage-cli');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'auth-instances.yaml'), '"just a string"\n', 'utf-8');

    expect(() => readInstances()).toThrow('invalid structure');
  });

  it('removeInstance removes an existing instance', () => {
    writeInstances([
      {
        name: 'alpha',
        baseUrl: 'https://alpha.example.com',
        clientId: 'cid-a',
        issuedAt: 1000,
        accessTokenExpiresAt: 2000,
        selected: true,
      },
      {
        name: 'beta',
        baseUrl: 'https://beta.example.com',
        clientId: 'cid-b',
        issuedAt: 1000,
        accessTokenExpiresAt: 2000,
        selected: false,
      },
    ]);

    removeInstance('alpha');

    const instances = readInstances();
    expect(instances).toHaveLength(1);
    expect(instances[0].name).toBe('beta');
  });

  it('removeInstance is a no-op for nonexistent instance', () => {
    writeInstances([
      {
        name: 'alpha',
        baseUrl: 'https://alpha.example.com',
        clientId: 'cid-a',
        issuedAt: 1000,
        accessTokenExpiresAt: 2000,
        selected: true,
      },
    ]);

    removeInstance('nonexistent');

    const instances = readInstances();
    expect(instances).toHaveLength(1);
    expect(instances[0].name).toBe('alpha');
  });

  it('setSelectedInstance throws for unknown instance', () => {
    writeInstancesFile([makeInstance({ name: 'prod' })]);

    expect(() => setSelectedInstance('nonexistent')).toThrow("Unknown instance 'nonexistent'");
  });

  it('upsertInstance with selected: true deselects all others', () => {
    writeInstances([
      {
        name: 'alpha',
        baseUrl: 'https://alpha.example.com',
        clientId: 'cid-a',
        issuedAt: 1000,
        accessTokenExpiresAt: 2000,
        selected: true,
      },
      {
        name: 'beta',
        baseUrl: 'https://beta.example.com',
        clientId: 'cid-b',
        issuedAt: 1000,
        accessTokenExpiresAt: 2000,
        selected: false,
      },
    ]);

    upsertInstance({
      name: 'beta',
      baseUrl: 'https://beta.example.com',
      clientId: 'cid-b',
      issuedAt: 3000,
      accessTokenExpiresAt: 4000,
      selected: true,
    });

    const instances = readInstances();
    expect(instances.find(i => i.name === 'alpha')?.selected).toBe(false);
    expect(instances.find(i => i.name === 'beta')?.selected).toBe(true);
  });
});

describe('resolveInstance', () => {
  it('returns the flag value when instance exists', () => {
    writeInstancesFile([makeInstance({ name: 'prod', selected: true })]);

    const result = resolveInstance('prod');
    expect(result).toBe('prod');
  });

  it('returns the selected instance name when no flag given', () => {
    writeInstancesFile([makeInstance({ name: 'prod', selected: true })]);

    const result = resolveInstance(undefined);
    expect(result).toBe('prod');
  });

  it('throws CliError with INSTANCE_NOT_FOUND for unknown --instance flag', () => {
    writeInstancesFile([makeInstance({ name: 'prod', selected: true })]);

    try {
      resolveInstance('nonexistent');
      expect.unreachable('should throw');
    } catch (err) {
      expect(err).toBeInstanceOf(CliError);
      const cliErr = err as CliError;
      expect(cliErr.code).toBe('INSTANCE_NOT_FOUND');
      expect(cliErr.message).toContain('nonexistent');
      expect(cliErr.recovery).toContain('prod');
    }
  });

  it('throws CliError with NO_AUTH_INSTANCE when no instances configured', () => {
    try {
      resolveInstance(undefined);
      expect.unreachable('should throw');
    } catch (err) {
      expect(err).toBeInstanceOf(CliError);
      expect((err as CliError).code).toBe('NO_AUTH_INSTANCE');
    }
  });

  it('throws CliError with NO_SELECTED_INSTANCE when none selected', () => {
    writeInstancesFile([
      makeInstance({ name: 'prod', selected: false }),
      makeInstance({ name: 'staging', selected: false }),
    ]);

    try {
      resolveInstance(undefined);
      expect.unreachable('should throw');
    } catch (err) {
      expect(err).toBeInstanceOf(CliError);
      expect((err as CliError).code).toBe('NO_SELECTED_INSTANCE');
    }
  });
});
