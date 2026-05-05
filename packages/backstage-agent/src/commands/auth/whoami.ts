import { Command } from 'commander';
import { formatSuccess, formatError } from '../../output/formatter.js';
import { getGlobalOptions } from '../../lib/globals.js';
import { resolveInstanceOrExit } from '../../lib/instance.js';
import { getAuthenticatedContext } from '../../lib/auth.js';
import { loginHint } from '../../output/hints.js';

export function createWhoamiCommand(): Command {
  return new Command('whoami')
    .description('Show the authenticated user identity')
    .action(async (_opts: unknown, cmd: Command) => {
      const { output, instance: instanceFlag } = getGlobalOptions(cmd);
      const instanceName = resolveInstanceOrExit(instanceFlag, output);

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
        const userinfo = (await resp.json()) as {
          claims: { sub: string; ent?: string[] };
        };

        formatSuccess(
          {
            instance: ctx.instanceName,
            userEntityRef: userinfo.claims.sub,
            ownershipEntityRefs: userinfo.claims.ent ?? [],
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
