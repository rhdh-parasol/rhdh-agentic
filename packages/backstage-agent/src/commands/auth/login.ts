import { Command } from 'commander';
import crypto from 'node:crypto';
import { createInterface } from 'node:readline';
import { formatSuccess, formatError } from '../../output/formatter.js';
import { readConfig, writeConfig, isValidTrustPolicy, TRUST_POLICY_VALUES } from '../../lib/config.js';
import { upsertInstance, getInstanceByName } from '../../lib/instance.js';
import { getGlobalOptions } from '../../lib/globals.js';
import { tryCommand } from '../../output/hints.js';
import { generateVerifier, challengeFromVerifier } from '../../lib/pkce.js';
import { startCallbackServer, type CallbackServer } from '../../lib/localServer.js';
import { openBrowser } from '../../lib/browser.js';
import { getSecretStore, getAuthInstanceService } from '../../lib/secretStore.js';

const TOKEN_EXCHANGE_TIMEOUT_MS = 30_000;

export function createLoginCommand(): Command {
  return new Command('login')
    .description('Authenticate with a Backstage instance')
    .requiredOption('--backend-url <url>', 'Backstage backend URL')
    .option('--no-browser', 'Print auth URL instead of opening browser')
    .option('--trust-policy <level>', 'Set trust policy after login')
    .action(async (_opts: Record<string, unknown>, cmd: Command) => {
      const { output, instance: instanceFlag } = getGlobalOptions(cmd);
      const opts = cmd.opts();
      let backendUrl: string;
      try {
        backendUrl = normalizeUrl(opts.backendUrl);
      } catch {
        return formatError(
          'USAGE_ERROR',
          `Invalid backend URL: "${opts.backendUrl}"`,
          'Provide a valid URL, e.g. --backend-url https://backstage.example.com',
          [],
          output,
          2,
        );
      }
      const useBrowser: boolean = opts.browser !== false;
      const trustPolicyOpt: string | undefined = opts.trustPolicy;

      if (trustPolicyOpt && !isValidTrustPolicy(trustPolicyOpt)) {
        return formatError(
          'USAGE_ERROR',
          `Invalid trust policy level: "${trustPolicyOpt}"`,
          `Valid levels are: ${TRUST_POLICY_VALUES.join(', ')}`,
          [],
          output,
          2,
        );
      }

      const instanceName = instanceFlag ?? deriveInstanceName(backendUrl);
      const authBaseUrl = `${backendUrl}/api/auth`;
      const clientConfigUrl = `${authBaseUrl}/.well-known/oauth-client/cli.json`;

      let clientId: string;
      try {
        const resp = await fetch(clientConfigUrl, {
          signal: AbortSignal.timeout(TOKEN_EXCHANGE_TIMEOUT_MS),
        });
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }
        const clientConfig = (await resp.json()) as { client_id?: string };
        clientId = clientConfig.client_id ?? clientConfigUrl;
      } catch (err) {
        return formatError(
          'CONNECTION_ERROR',
          `Failed to connect to ${backendUrl}: ${err instanceof Error ? err.message : String(err)}`,
          'Check the backend URL and ensure the Backstage instance is running',
          [],
          output,
        );
      }

      const verifier = generateVerifier();
      const challenge = challengeFromVerifier(verifier);
      const state = crypto.randomBytes(32).toString('hex');

      let code: string;
      let redirectUri: string;

      if (useBrowser) {
        let callback: CallbackServer;
        try {
          callback = await startCallbackServer({ state });
        } catch (err) {
          return formatError(
            'SERVER_ERROR',
            `Failed to start local OAuth callback server: ${err instanceof Error ? err.message : String(err)}`,
            'Ensure port 8055 is available and try again',
            [],
            output,
          );
        }
        try {
          redirectUri = callback.url;
          const authUrl = buildAuthorizeUrl({
            authBaseUrl,
            clientId,
            redirectUri,
            state,
            challenge,
          });
          process.stderr.write(`If a browser does not open, visit:\n\n${authUrl}\n\n`);
          if (!openBrowser(authUrl)) {
            process.stderr.write(
              'Could not open a browser automatically. Please visit the URL above manually.\n',
            );
          }
          const result = await callback.waitForCode();
          if (result.state !== state) {
            throw new Error('State mismatch');
          }
          code = result.code;
        } catch (err) {
          await callback.close();
          return formatError(
            'AUTH_ERROR',
            `OAuth callback failed: ${err instanceof Error ? err.message : String(err)}`,
            'Try logging in again',
            [tryCommand('auth login --backend-url ' + backendUrl)],
            output,
          );
        } finally {
          await callback.close();
        }
      } else {
        // Placeholder URI for manual paste-back flow — no server listens on this.
        redirectUri = 'http://localhost:0/callback';
        const authUrl = buildAuthorizeUrl({
          authBaseUrl,
          clientId,
          redirectUri,
          state,
          challenge,
        });

        process.stderr.write(`Open this URL in your browser:\n\n${authUrl}\n\n`);
        process.stderr.write(
          'After authenticating, paste the callback URL here:\n',
        );

        let callbackUrl: string;
        try {
          const rl = createInterface({ input: process.stdin, output: process.stderr });
          const MANUAL_PASTE_TIMEOUT_MS = 5 * 60 * 1000;
          callbackUrl = await new Promise<string>((resolve, reject) => {
            const timer = setTimeout(() => {
              rl.close();
              reject(new Error('Timed out waiting for callback URL input'));
            }, MANUAL_PASTE_TIMEOUT_MS);
            rl.question('> ', answer => {
              clearTimeout(timer);
              rl.close();
              resolve(answer.trim());
            });
          });
        } catch (err) {
          return formatError(
            'AUTH_ERROR',
            err instanceof Error ? err.message : 'Timed out waiting for callback URL input',
            'Try logging in again',
            [tryCommand('auth login --backend-url ' + backendUrl)],
            output,
          );
        }

        let parsed: URL;
        try {
          parsed = new URL(callbackUrl);
        } catch {
          return formatError(
            'USAGE_ERROR',
            'The pasted callback URL is not a valid URL',
            'Copy the full URL from your browser address bar after authenticating',
            [],
            output,
          );
        }
        const returnedCode = parsed.searchParams.get('code');
        const returnedState = parsed.searchParams.get('state');

        if (returnedState !== state) {
          return formatError(
            'AUTH_ERROR',
            'OAuth state mismatch — the callback does not match this login session',
            'Try logging in again',
            [tryCommand('auth login --backend-url ' + backendUrl)],
            output,
          );
        }
        if (!returnedCode) {
          return formatError(
            'AUTH_ERROR',
            'No authorization code found in callback URL',
            'Copy the full callback URL including the code parameter',
            [tryCommand('auth login --backend-url ' + backendUrl)],
            output,
          );
        }
        code = returnedCode;
      }

      let token: { access_token: string; refresh_token?: string; expires_in: number };
      try {
        const tokenResp = await fetch(`${authBaseUrl}/v1/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            code_verifier: verifier,
            client_id: clientId,
          }),
          signal: AbortSignal.timeout(TOKEN_EXCHANGE_TIMEOUT_MS),
        });
        if (!tokenResp.ok) {
          const body = await tokenResp.text();
          throw new Error(`Token exchange failed: ${tokenResp.status} ${body}`);
        }
        token = (await tokenResp.json()) as typeof token;
      } catch (err) {
        return formatError(
          'AUTH_ERROR',
          `Token exchange failed: ${err instanceof Error ? err.message : String(err)}`,
          'Try logging in again',
          [tryCommand('auth login --backend-url ' + backendUrl)],
          output,
        );
      }

      try {
        const secretStore = getSecretStore();
        const service = getAuthInstanceService(instanceName);
        await secretStore.set(service, 'accessToken', token.access_token);
        if (token.refresh_token) {
          await secretStore.set(service, 'refreshToken', token.refresh_token);
        }
      } catch (err) {
        return formatError(
          'STORAGE_ERROR',
          `Failed to store credentials: ${err instanceof Error ? err.message : String(err)}`,
          'Check filesystem permissions on the credentials directory',
          [],
          output,
        );
      }

      try {
        const existing = getInstanceByName(instanceName);

        upsertInstance({
          name: instanceName,
          baseUrl: backendUrl,
          clientId,
          issuedAt: Date.now(),
          accessTokenExpiresAt: Date.now() + token.expires_in * 1000,
          selected: true,
          metadata: existing?.metadata,
        });

        if (trustPolicyOpt && isValidTrustPolicy(trustPolicyOpt)) {
          const config = readConfig();
          config.trustPolicy = trustPolicyOpt;
          writeConfig(config);
        }
      } catch (err) {
        return formatError(
          'STORAGE_ERROR',
          `Failed to save instance data: ${err instanceof Error ? err.message : String(err)}`,
          'Check filesystem permissions on the config directory',
          [],
          output,
        );
      }

      formatSuccess(
        {
          instance: instanceName,
          backendUrl,
          ...(trustPolicyOpt ? { trustPolicy: trustPolicyOpt } : {}),
        },
        [tryCommand('auth status'), tryCommand('catalog list')],
        'reversible',
        output,
      );
    });
}

function normalizeUrl(u: string): string {
  try {
    const url = new URL(u);
    return url.toString().replace(/\/$/, '');
  } catch {
    throw new Error(`'${u}' is not a valid URL`);
  }
}

function deriveInstanceName(url: string): string {
  return new URL(url).host;
}

function buildAuthorizeUrl(options: {
  authBaseUrl: string;
  clientId: string;
  redirectUri: string;
  state: string;
  challenge: string;
}): string {
  const { authBaseUrl, clientId, redirectUri, state, challenge } = options;
  const authorize = new URL(`${authBaseUrl}/v1/authorize`);
  authorize.searchParams.set('client_id', clientId);
  authorize.searchParams.set('redirect_uri', redirectUri);
  authorize.searchParams.set('response_type', 'code');
  authorize.searchParams.set('scope', 'openid offline_access');
  authorize.searchParams.set('state', state);
  authorize.searchParams.set('code_challenge', challenge);
  authorize.searchParams.set('code_challenge_method', 'S256');
  return authorize.toString();
}
