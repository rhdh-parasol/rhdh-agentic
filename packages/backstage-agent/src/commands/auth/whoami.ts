import { Command } from 'commander';
import { formatSuccess, formatError, CliError } from '../../output/formatter.js';
import { getGlobalOptions } from '../../lib/globals.js';
import { resolveInstance } from '../../lib/instance.js';
import { getAuthenticatedContext } from '../../lib/auth.js';
import { loginHint } from '../../output/hints.js';

export function createWhoamiCommand(): Command {
  return new Command('whoami')
    .description('Show the authenticated user identity')
    .action(async (_opts: unknown, cmd: Command) => {
      const { output, instance: instanceFlag } = getGlobalOptions(cmd);
      let instanceName: string;
      try {
        instanceName = resolveInstance(instanceFlag);
      } catch (err) {
        if (err instanceof CliError) {
          return formatError(err.code, err.message, err.recovery, err.hints, output);
        }
        throw err;
      }

      let ctx: Awaited<ReturnType<typeof getAuthenticatedContext>>;
      try {
        ctx = await getAuthenticatedContext(instanceName);
      } catch (err) {
        return formatError(
          'AUTH_ERROR',
          `Not authenticated: ${err instanceof Error ? err.message : String(err)}`,
          'Run backstage-agent auth login to authenticate',
          [loginHint()],
          output,
        );
      }

      try {
        const resp = await ctx.fetch(`${ctx.baseUrl}/api/auth/v1/userinfo`);
        if (!resp.ok) {
          const body = await resp.text();
          throw new Error(`HTTP ${resp.status}: ${body}`);
        }
        const body = await resp.json() as Record<string, unknown>;
        const claims = body?.claims as Record<string, unknown> | undefined;
        if (!claims || typeof claims.sub !== 'string') {
          throw new Error('Unexpected userinfo response: missing claims.sub field');
        }

        formatSuccess(
          {
            instance: ctx.instanceName,
            userEntityRef: claims.sub,
            ownershipEntityRefs: Array.isArray(claims.ent) ? claims.ent : [],
          },
          [],
          'read-only',
          output,
        );
      } catch (err) {
        return formatError(
          'AUTH_ERROR',
          `Failed to fetch user identity: ${err instanceof Error ? err.message : String(err)}`,
          'Your token may be expired. Try logging in again',
          [loginHint()],
          output,
        );
      }
    });
}
