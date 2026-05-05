import { Command } from 'commander';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { formatSuccess, formatError } from '../../output/formatter.js';
import { readConfig, writeConfig, isValidTrustPolicy, TRUST_POLICY_VALUES, type TrustPolicy } from '../../lib/config.js';
import { upsertInstance, getInstanceByName } from '../../lib/instance.js';
import { getGlobalOptions } from '../../lib/globals.js';
import { tryCommand } from '../../output/hints.js';
import { generateVerifier, challengeFromVerifier } from '../../lib/pkce.js';
import { startCallbackServer } from '../../lib/localServer.js';
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
      const backendUrl: string = normalizeUrl(opts.backendUrl);
      const useBrowser: boolean = opts.browser !== false;
      const trustPolicyOpt: string | undefined = opts.trustPolicy;

      if (trustPolicyOpt && !isValidTrustPolicy(trustPolicyOpt)) {
        formatError(
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
      const clientId = `${authBaseUrl}/.well-known/oauth-client/cli.json`;

      try {
        const resp = await fetch(clientId, {
          signal: AbortSignal.timeout(TOKEN_EXCHANGE_TIMEOUT_MS),
        });
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }
      } catch (err) {
        formatError(
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
        const callback = await startCallbackServer({ state });
        try {
          redirectUri = callback.url;
          const authUrl = buildAuthorizeUrl({
            authBaseUrl,
            clientId,
            redirectUri,
            state,
            challenge,
          });
          openBrowser(authUrl);
          const result = await callback.waitForCode();
          if (result.state !== state) {
            throw new Error('State mismatch');
          }
          code = result.code;
        } finally {
          await callback.close();
        }
      } else {
        redirectUri = 'http://localhost:0/callback';
        const authUrl = buildAuthorizeUrl({
          authBaseUrl,
          clientId,
          redirectUri,
          state,
          challenge,
        });

        process.stdout.write(`Open this URL in your browser:\n\n${authUrl}\n\n`);
        process.stdout.write(
          'After authenticating, paste the callback URL here:\n',
        );

        const rl = createInterface({ input: process.stdin, output: process.stdout });
        const callbackUrl = await new Promise<string>(resolve => {
          rl.question('> ', answer => {
            rl.close();
            resolve(answer.trim());
          });
        });

        const parsed = new URL(callbackUrl);
        const returnedCode = parsed.searchParams.get('code');
        const returnedState = parsed.searchParams.get('state');

        if (returnedState !== state) {
          throw new Error('OAuth state mismatch');
        }
        if (!returnedCode) {
          throw new Error('No authorization code in callback URL');
        }
        code = returnedCode;
      }

      let token: { access_token: string; refresh_token?: string; expires_in: number };
      try {
        const tokenResp = await fetch(`${authBaseUrl}/v1/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            code_verifier: verifier,
          }),
          signal: AbortSignal.timeout(TOKEN_EXCHANGE_TIMEOUT_MS),
        });
        if (!tokenResp.ok) {
          const body = await tokenResp.text();
          throw new Error(`Token exchange failed: ${tokenResp.status} ${body}`);
        }
        token = (await tokenResp.json()) as typeof token;
      } catch (err) {
        formatError(
          'AUTH_ERROR',
          `Token exchange failed: ${err instanceof Error ? err.message : String(err)}`,
          'Try logging in again',
          [tryCommand('auth login --backend-url ' + backendUrl)],
          output,
        );
      }

      const secretStore = getSecretStore();
      const service = getAuthInstanceService(instanceName);
      await secretStore.set(service, 'accessToken', token.access_token);
      if (token.refresh_token) {
        await secretStore.set(service, 'refreshToken', token.refresh_token);
      }

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

      if (trustPolicyOpt) {
        const config = readConfig();
        config.trustPolicy = trustPolicyOpt as TrustPolicy;
        writeConfig(config);
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

function openBrowser(url: string): void {
  const handleError = (error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    process.stderr.write(
      `Warning: Failed to open browser automatically: ${message}\n`,
    );
    process.stderr.write(`Please open this URL manually: ${url}\n`);
  };

  const spawnOpts = { detached: true, stdio: 'ignore' } as const;
  let child;
  try {
    if (process.platform === 'darwin') {
      child = spawn('open', [url], spawnOpts);
    } else if (process.platform === 'win32') {
      child = spawn(
        'powershell',
        ['-Command', `Start-Process '${url.replace(/'/g, "''")}'`],
        spawnOpts,
      );
    } else {
      child = spawn('xdg-open', [url], spawnOpts);
    }
    child.unref();
    child.on('error', handleError);
  } catch (error) {
    handleError(error);
  }
}
