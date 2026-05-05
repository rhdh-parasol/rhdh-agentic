import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';
import { getConfigRoot } from './paths.js';
import { formatError, type OutputFormat } from '../output/formatter.js';
import { loginHint, authStatusHint } from '../output/hints.js';

export interface StoredInstance {
  name: string;
  baseUrl: string;
  clientId: string;
  issuedAt: number;
  accessTokenExpiresAt: number;
  selected?: boolean;
  metadata?: Record<string, unknown>;
}

function getConfigDir(): string {
  return join(getConfigRoot(), 'backstage-cli');
}

function getInstancesPath(): string {
  return join(getConfigDir(), 'auth-instances.yaml');
}

export function readInstances(): StoredInstance[] {
  let content: string;
  try {
    content = readFileSync(getInstancesPath(), 'utf-8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw err;
  }

  if (!content.trim()) return [];
  const parsed = YAML.parse(content) as Record<string, unknown> | null;
  if (parsed === null || parsed === undefined) return [];
  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('auth-instances.yaml has invalid structure (expected YAML mapping with "instances" key)');
  }
  if (!Array.isArray(parsed.instances)) {
    throw new Error('auth-instances.yaml has invalid structure (expected "instances" to be an array)');
  }
  const malformed: string[] = [];
  const valid: StoredInstance[] = [];
  for (let index = 0; index < parsed.instances.length; index++) {
    const entry = parsed.instances[index] as unknown;
    if (typeof entry !== 'object' || entry === null) {
      malformed.push(`index ${index}: not an object`);
      continue;
    }
    const obj = entry as Record<string, unknown>;
    const missing: string[] = [];
    if (typeof obj.name !== 'string' || obj.name === '') missing.push('name');
    if (typeof obj.baseUrl !== 'string') missing.push('baseUrl');
    if (typeof obj.clientId !== 'string') missing.push('clientId');
    if (typeof obj.issuedAt !== 'number') missing.push('issuedAt');
    if (typeof obj.accessTokenExpiresAt !== 'number') missing.push('accessTokenExpiresAt');
    if (missing.length > 0) {
      malformed.push(`index ${index}: invalid fields: ${missing.join(', ')}`);
      continue;
    }
    valid.push(entry as StoredInstance);
  }
  if (malformed.length > 0) {
    throw new Error(
      `auth-instances.yaml contains malformed entries:\n${malformed.map(m => `  - ${m}`).join('\n')}`,
    );
  }
  return valid;
}

export function writeInstances(instances: StoredInstance[]): void {
  const dir = getConfigDir();
  mkdirSync(dir, { recursive: true });
  const filePath = getInstancesPath();
  const content = YAML.stringify({ instances }, { indentSeq: false });
  writeFileSync(filePath, content, { encoding: 'utf-8', mode: 0o600 });
}

export function upsertInstance(instance: StoredInstance): void {
  const instances = readInstances();
  if (instance.selected) {
    for (const inst of instances) {
      inst.selected = false;
    }
  }
  const idx = instances.findIndex(i => i.name === instance.name);
  if (idx === -1) {
    instances.push(instance);
  } else {
    instances[idx] = instance;
  }
  writeInstances(instances);
}

export function removeInstance(name: string): void {
  const instances = readInstances();
  const next = instances.filter(i => i.name !== name);
  if (next.length !== instances.length) {
    writeInstances(next);
  }
}

export function setSelectedInstance(name: string): void {
  const instances = readInstances();
  let found = false;
  const updated = instances.map(i => {
    if (i.name === name) {
      found = true;
      return { ...i, selected: true };
    }
    return { ...i, selected: false };
  });
  if (!found) {
    throw new Error(`Unknown instance '${name}'`);
  }
  writeInstances(updated);
}

export function getInstanceByName(name: string): StoredInstance | undefined {
  return readInstances().find(i => i.name === name);
}

export function resolveInstanceOrExit(
  flagValue: string | undefined,
  format: OutputFormat,
): string {
  const instances = readInstances();

  if (flagValue) {
    const found = instances.find(i => i.name === flagValue);
    if (!found) {
      const available = instances.map(i => i.name);
      return formatError(
        'INSTANCE_NOT_FOUND',
        `No stored instance named "${flagValue}"`,
        available.length > 0
          ? `Available instances: ${available.join(', ')}`
          : 'No instances configured',
        [authStatusHint(), loginHint()],
        format,
      );
    }
    return flagValue;
  }

  if (instances.length === 0) {
    return formatError(
      'NO_AUTH_INSTANCE',
      'No authenticated Backstage instance configured',
      'Run backstage-agent auth login to authenticate',
      [loginHint()],
      format,
    );
  }

  const selected = instances.find(i => i.selected);
  if (!selected) {
    return formatError(
      'NO_SELECTED_INSTANCE',
      'No instance is currently selected',
      'Run backstage-agent auth select <name> to select an instance',
      [authStatusHint()],
      format,
    );
  }

  return selected.name;
}
