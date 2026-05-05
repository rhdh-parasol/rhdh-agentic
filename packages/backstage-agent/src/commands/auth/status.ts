import { Command } from 'commander';
import { formatSuccess } from '../../output/formatter.js';
import { readInstances } from '../../lib/instance.js';
import { getGlobalOptions } from '../../lib/globals.js';
import { loginHint } from '../../output/hints.js';

export function createStatusCommand(): Command {
  return new Command('status')
    .description('Show authenticated Backstage instances')
    .action((_opts: unknown, cmd: Command) => {
      const { output } = getGlobalOptions(cmd);
      const instances = readInstances();

      const hints =
        instances.length === 0
          ? [loginHint()]
          : [];

      formatSuccess(
        {
          instances: instances.map(i => ({
            name: i.name,
            backendUrl: i.baseUrl,
            tokenExpiresAt: i.accessTokenExpiresAt
              ? new Date(i.accessTokenExpiresAt).toISOString()
              : null,
            selected: i.selected ?? false,
          })),
        },
        hints,
        'read-only',
        output,
      );
    });
}
