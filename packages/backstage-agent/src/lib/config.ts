import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import yaml from 'js-yaml';

export type TrustPolicy = 'read-only' | 'reversible' | 'all';

export const TRUST_POLICY_VALUES: TrustPolicy[] = ['read-only', 'reversible', 'all'];

interface Config {
  trustPolicy: TrustPolicy;
}

const DEFAULT_CONFIG: Config = {
  trustPolicy: 'all',
};

function getConfigDir(): string {
  return join(homedir(), '.config', 'backstage-agent');
}

function getConfigPath(): string {
  return join(getConfigDir(), 'config.yaml');
}

export function readConfig(): Config {
  try {
    const content = readFileSync(getConfigPath(), 'utf-8');
    const parsed = yaml.load(content) as Partial<Config> | null;
    return {
      trustPolicy: isValidTrustPolicy(parsed?.trustPolicy)
        ? parsed.trustPolicy
        : DEFAULT_CONFIG.trustPolicy,
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function writeConfig(config: Config): void {
  const dir = getConfigDir();
  mkdirSync(dir, { recursive: true });
  writeFileSync(getConfigPath(), yaml.dump(config), 'utf-8');
}

export function isValidTrustPolicy(value: unknown): value is TrustPolicy {
  return typeof value === 'string' && TRUST_POLICY_VALUES.includes(value as TrustPolicy);
}
