import type { Command } from 'commander';
import type { TrustLevel } from '../output/formatter.js';

export function addDryRunOption(cmd: Command, trustLevel: TrustLevel): void {
  if (trustLevel === 'destructive') {
    cmd.option('--no-dry-run', 'Execute the command (destructive commands default to dry-run)');
  } else if (trustLevel === 'reversible') {
    cmd.option('--dry-run', 'Preview the operation without executing');
  }
}

export function isDryRun(cmd: Command, trustLevel: TrustLevel): boolean {
  const opts = cmd.opts();

  if (trustLevel === 'destructive') {
    return opts.dryRun !== false;
  }

  if (trustLevel === 'reversible') {
    return opts.dryRun === true;
  }

  return false;
}
