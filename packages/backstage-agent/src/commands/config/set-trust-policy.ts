import { Command } from 'commander';
import { formatSuccess, formatError } from '../../output/formatter.js';
import { readConfig, writeConfig, isValidTrustPolicy, TRUST_POLICY_VALUES, type TrustPolicy } from '../../lib/config.js';
import { getGlobalOptions } from '../../lib/globals.js';

export function createSetTrustPolicyCommand(): Command {
  return new Command('set-trust-policy')
    .description('Set the trust policy for command execution')
    .argument('<level>', `Trust policy level (${TRUST_POLICY_VALUES.join(', ')})`)
    .action((level: string, _opts: unknown, cmd: Command) => {
      const { output } = getGlobalOptions(cmd);

      if (!isValidTrustPolicy(level)) {
        return formatError(
          'USAGE_ERROR',
          `Invalid trust policy level: "${level}"`,
          `Valid levels are: ${TRUST_POLICY_VALUES.join(', ')}`,
          [],
          output,
          2,
        );
      }

      try {
        const config = readConfig();
        config.trustPolicy = level as TrustPolicy;
        writeConfig(config);
      } catch (err) {
        return formatError(
          'STORAGE_ERROR',
          `Failed to save config: ${err instanceof Error ? err.message : String(err)}`,
          'Check filesystem permissions on the config directory',
          [],
          output,
        );
      }

      formatSuccess(
        { trustPolicy: level },
        [],
        'reversible',
        output,
      );
    });
}
