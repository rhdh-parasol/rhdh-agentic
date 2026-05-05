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
        formatError(
          'INSTANCE_NOT_FOUND',
          `No stored instance named "${name}"`,
          available.length > 0
            ? `Available instances: ${available.join(', ')}`
            : 'No instances configured',
          [authStatusHint()],
          output,
        );
      }

      for (const inst of instances) {
        inst.selected = inst.name === name;
      }
      writeInstances(instances);

      formatSuccess(
        { selected: name },
        [],
        'reversible',
        output,
      );
    });
}
