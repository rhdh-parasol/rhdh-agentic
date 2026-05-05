import type { TrustLevel } from '../output/formatter.js';
import { CliError } from '../output/formatter.js';
import { readConfig } from './config.js';
import { isTrustLevelAllowed } from './trust.js';

export function enforceTrustPolicy(
  trustLevel: TrustLevel,
): void {
  const config = readConfig();

  if (!isTrustLevelAllowed(trustLevel, config.trustPolicy)) {
    throw new CliError(
      'TRUST_POLICY_VIOLATION',
      `Command requires trust level "${trustLevel}" but the current policy is "${config.trustPolicy}"`,
      'Change the trust policy with: backstage-agent config set-trust-policy <level>',
    );
  }
}
