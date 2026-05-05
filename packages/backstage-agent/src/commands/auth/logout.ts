import { Command } from 'commander';
import { formatSuccess, formatError } from '../../output/formatter.js';
import { readInstances, writeInstances } from '../../lib/instance.js';
import { getGlobalOptions } from '../../lib/globals.js';
import { loginHint, authSelectHint } from '../../output/hints.js';
import { getSecretStore, getAuthInstanceService } from '../../lib/secretStore.js';

export function createLogoutCommand(): Command {
  return new Command('logout')
    .description('Remove stored credentials for a Backstage instance')
    .action(async (_opts: unknown, cmd: Command) => {
      const { output, instance: instanceFlag } = getGlobalOptions(cmd);
      const instances = readInstances();

      let targetName: string;

      if (instanceFlag) {
        const target = instances.find(i => i.name === instanceFlag);
        if (!target) {
          formatError(
            'INSTANCE_NOT_FOUND',
            `No stored instance named "${instanceFlag}"`,
            'Check available instances',
            [loginHint()],
            output,
          );
        }
        targetName = instanceFlag;
      } else {
        const selected = instances.find(i => i.selected);
        if (!selected) {
          formatError(
            'NO_SELECTED_INSTANCE',
            'No instance is currently selected',
            'Specify an instance with --instance <name>',
            [],
            output,
          );
        }
        targetName = selected.name;
      }

      const secretStore = getSecretStore();
      const service = getAuthInstanceService(targetName);
      await secretStore.delete(service, 'accessToken');
      await secretStore.delete(service, 'refreshToken');

      const remaining = instances.filter(i => i.name !== targetName);

      const wasSelected = instances.find(i => i.name === targetName)?.selected;
      if (wasSelected && remaining.length > 0) {
        for (const inst of remaining) {
          inst.selected = false;
        }
      }

      writeInstances(remaining);

      const hints: string[] = [];
      if (remaining.length === 0) {
        hints.push(loginHint());
      } else if (wasSelected) {
        hints.push(authSelectHint());
      }

      formatSuccess(
        { loggedOut: targetName },
        hints,
        'reversible',
        output,
      );
    });
}
