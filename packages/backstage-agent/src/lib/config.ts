import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import YAML from 'yaml';

export type TrustPolicy = 'read-only' | 'reversible' | 'all';

export const TRUST_POLICY_VALUES: TrustPolicy[] = ['read-only', 'reversible', 'all'];

interface Config {
  trustPolicy: TrustPolicy;
}

const DEFAULT_CONFIG: Config = {
  trustPolicy: 'all',
};

function getConfigDir(): string {
  const root =
    process.env.XDG_CONFIG_HOME ||
    (process.platform === 'win32'
      ? process.env.APPDATA || join(homedir(), 'AppData', 'Roaming')
      : join(homedir(), '.config'));
  return join(root, 'backstage-agent');
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
  return {
    trustPolicy: isValidTrustPolicy(parsed?.trustPolicy)
      ? parsed.trustPolicy
      : DEFAULT_CONFIG.trustPolicy,
  };
}

export function writeConfig(config: Config): void {
  const dir = getConfigDir();
  mkdirSync(dir, { recursive: true });
  writeFileSync(getConfigPath(), YAML.stringify(config), 'utf-8');
}

export function isValidTrustPolicy(value: unknown): value is TrustPolicy {
  return typeof value === 'string' && TRUST_POLICY_VALUES.includes(value as TrustPolicy);
}
