import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import YAML from 'yaml';
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
  const root =
    process.env.XDG_CONFIG_HOME ||
    (process.platform === 'win32'
      ? process.env.APPDATA || join(homedir(), 'AppData', 'Roaming')
      : join(homedir(), '.config'));
  return join(root, 'backstage-cli');
}

function getInstancesPath(): string {
  return join(getConfigDir(), 'auth-instances.yaml');
}

export function readInstances(): StoredInstance[] {
  try {
    const content = readFileSync(getInstancesPath(), 'utf-8');
    if (!content.trim()) return [];
    const parsed = YAML.parse(content) as { instances?: StoredInstance[] } | null;
    return parsed?.instances ?? [];
  } catch {
    return [];
  }
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
): string | undefined {
  const instances = readInstances();

  if (flagValue) {
    const found = instances.find(i => i.name === flagValue);
    if (!found) {
      const available = instances.map(i => i.name);
      formatError(
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
    formatError(
      'NO_AUTH_INSTANCE',
      'No authenticated Backstage instance configured',
      'Run backstage-agent auth login to authenticate',
      [loginHint()],
      format,
    );
  }

  const selected = instances.find(i => i.selected);
  if (!selected) {
    formatError(
      'NO_SELECTED_INSTANCE',
      'No instance is currently selected',
      'Run backstage-agent auth select <name> to select an instance',
      [authStatusHint()],
      format,
    );
  }

  return selected.name;
}
