import type { TrustLevel, OutputFormat } from '../output/formatter.js';
import { formatError } from '../output/formatter.js';
import { readConfig } from './config.js';
import { isTrustLevelAllowed } from './trust.js';
import { configSetTrustPolicyHint } from '../output/hints.js';

export function enforceTrustPolicy(
  commandName: string,
  trustLevel: TrustLevel,
  format: OutputFormat,
): void {
  const config = readConfig();

  if (!isTrustLevelAllowed(trustLevel, config.trustPolicy)) {
    return formatError(
      'TRUST_POLICY_VIOLATION',
      `Command requires trust level "${trustLevel}" but the current policy is "${config.trustPolicy}"`,
      `Change the trust policy with: backstage-agent config set-trust-policy <level>`,
      [configSetTrustPolicyHint()],
      format,
      1,
    );
  }
}
