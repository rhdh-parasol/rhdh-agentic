import type { TrustLevel, OutputFormat } from '../output/formatter.js';
import { formatError } from '../output/formatter.js';
import { readConfig, type TrustPolicy } from './config.js';
import { isTrustLevelAllowed } from './trust.js';
import { configSetTrustPolicyHint } from '../output/hints.js';

const EXEMPT_COMMANDS = new Set([
  'config set-trust-policy',
  'auth login',
  'auth status',
  'auth select',
  'auth logout',
]);

export function enforceTrustPolicy(
  commandName: string,
  trustLevel: TrustLevel,
  format: OutputFormat,
): void {
  if (EXEMPT_COMMANDS.has(commandName)) {
    return;
  }

  const config = readConfig();

  if (!isTrustLevelAllowed(trustLevel, config.trustPolicy)) {
    formatError(
      'TRUST_POLICY_VIOLATION',
      `Command requires trust level "${trustLevel}" but the current policy is "${config.trustPolicy}"`,
      `Change the trust policy with: backstage-agent config set-trust-policy <level>`,
      [configSetTrustPolicyHint()],
      format,
      1,
    );
  }
}
