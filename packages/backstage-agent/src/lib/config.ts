import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';
import { getConfigRoot } from './paths.js';

export const TRUST_POLICY_VALUES = ['read-only', 'reversible', 'all'] as const;

export type TrustPolicy = (typeof TRUST_POLICY_VALUES)[number];

interface Config {
  trustPolicy: TrustPolicy;
}

const DEFAULT_CONFIG: Config = {
  trustPolicy: 'read-only',
};

function getConfigDir(): string {
  return join(getConfigRoot(), 'backstage-agent');
}

function getConfigPath(): string {
  return join(getConfigDir(), 'config.yaml');
}

export function readConfig(): Config {
  let content: string;
  try {
    content = readFileSync(getConfigPath(), 'utf-8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { ...DEFAULT_CONFIG };
    }
    throw err;
  }

  const parsed = YAML.parse(content) as Partial<Config> | null;
  if (parsed?.trustPolicy !== undefined && !isValidTrustPolicy(parsed.trustPolicy)) {
    throw new Error(
      `Invalid trust policy "${parsed.trustPolicy}" in config.yaml. Valid values: ${TRUST_POLICY_VALUES.join(', ')}`,
    );
  }
  return {
    trustPolicy: isValidTrustPolicy(parsed?.trustPolicy)
      ? parsed.trustPolicy
      : DEFAULT_CONFIG.trustPolicy,
  };
}

export function writeConfig(config: Config): void {
  const dir = getConfigDir();
  mkdirSync(dir, { recursive: true });
  writeFileSync(getConfigPath(), YAML.stringify(config), { encoding: 'utf-8', mode: 0o600 });
}

export function isValidTrustPolicy(value: unknown): value is TrustPolicy {
  return typeof value === 'string' && (TRUST_POLICY_VALUES as readonly string[]).includes(value);
}
