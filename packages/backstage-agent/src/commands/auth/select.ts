import { Command } from 'commander';
import { formatSuccess, formatError } from '../../output/formatter.js';
import { readInstances, writeInstances } from '../../lib/instance.js';
import { getGlobalOptions } from '../../lib/globals.js';
import { authStatusHint } from '../../output/hints.js';

export function createSelectCommand(): Command {
  return new Command('select')
    .description('Switch the selected Backstage instance')
    .argument('<name>', 'Instance name to select')
    .action((name: string, _opts: unknown, cmd: Command) => {
      const { output } = getGlobalOptions(cmd);
      const instances = readInstances();

      const target = instances.find(i => i.name === name);
      if (!target) {
        const available = instances.map(i => i.name);
        return formatError(
          'INSTANCE_NOT_FOUND',
          `No stored instance named "${name}"`,
          available.length > 0
            ? `Available instances: ${available.join(', ')}`
            : 'No instances configured',
          [authStatusHint()],
          output,
        );
      }

      try {
        for (const inst of instances) {
          inst.selected = inst.name === name;
        }
        writeInstances(instances);
      } catch (err) {
        return formatError(
          'STORAGE_ERROR',
          `Failed to update instance data: ${err instanceof Error ? err.message : String(err)}`,
          'Check filesystem permissions on the config directory',
          [],
          output,
        );
      }

      formatSuccess(
        { selected: name },
        [],
        'reversible',
        output,
      );
    });
}
