import http from 'node:http';
import { URL } from 'node:url';

const CALLBACK_PORT = 8055;
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

export interface CallbackServer {
  url: string;
  waitForCode: () => Promise<{ code: string; state?: string }>;
  close: () => Promise<void>;
}

export async function startCallbackServer(options: {
  state: string;
  timeoutMs?: number;
}): Promise<CallbackServer> {
  const server = http.createServer();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let resolveResult:
    | ((v: { code: string; state?: string }) => void)
    | undefined;
  let rejectResult: ((err: Error) => void) | undefined;

  const resultPromise = new Promise<{ code: string; state?: string }>(
    (resolve, reject) => {
      resolveResult = resolve;
      rejectResult = reject;
    },
  );

  const timer = setTimeout(() => {
    rejectResult?.(
      new Error(
        `OAuth callback timed out after ${Math.round(timeoutMs / 1000)} seconds`,
      ),
    );
  }, timeoutMs);

  server.on('request', (req, res) => {
    if (!req.url) {
      res.statusCode = 400;
      res.end('Bad Request');
      return;
    }
    const u = new URL(req.url, 'http://127.0.0.1');
    if (u.pathname !== '/callback') {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }
    const code = u.searchParams.get('code') ?? undefined;
    const state = u.searchParams.get('state') ?? undefined;
    if (!code) {
      res.statusCode = 400;
      res.end('Missing code');
      process.stderr.write(
        'Warning: received OAuth callback without authorization code. Waiting for valid callback...\n',
      );
      return;
    }
    if (state !== options.state) {
      res.statusCode = 400;
      res.end('State mismatch');
      process.stderr.write(
        'Warning: received OAuth callback with mismatched state parameter. Waiting for valid callback...\n',
      );
      return;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('You may now close this window.');
    clearTimeout(timer);
    resolveResult?.({ code, state });
  });

  const port = await new Promise<number>((resolve, reject) => {
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        reject(
          new Error(
            `Port ${CALLBACK_PORT} is already in use. Close the application using it and try again.`,
          ),
        );
      } else {
        reject(err);
      }
    });
    server.listen(CALLBACK_PORT, '127.0.0.1', () => {
      const address = server.address();
      if (typeof address === 'object' && address && 'port' in address) {
        resolve(address.port);
      } else {
        reject(new Error('Failed to bind local server'));
      }
    });
  });

  return {
    url: `http://127.0.0.1:${port}/callback`,
    waitForCode: () => resultPromise,
    close: async () => {
      clearTimeout(timer);
      server.closeAllConnections();
      return new Promise<void>(resolve => server.close(() => resolve()));
    },
  };
}
