// We intentionally avoid @backstage/cli-node's CliAuth for token retrieval.
// CliAuth uses keytar (macOS Keychain) when available, but our login command
// writes tokens via FileSecretStore. This mismatch causes CliAuth to return
// stale tokens from keytar while fresh tokens sit in the file store.
// Using our own secretStore for both read and write keeps the paths consistent.
import { getSecretStore, getAuthInstanceService } from './secretStore.js';
import { readInstances } from './instance.js';

export interface AuthenticatedContext {
  fetch: (url: string, init?: RequestInit) => Promise<Response>;
  baseUrl: string;
  instanceName: string;
}

export async function getAuthenticatedContext(
  instanceName?: string,
): Promise<AuthenticatedContext> {
  const instances = readInstances();
  if (instances.length === 0) {
    throw new Error(
      'No instances found. Run "auth login" to authenticate first.',
    );
  }

  const instance = instanceName
    ? instances.find(i => i.name === instanceName)
    : instances.find(i => i.selected) ?? instances[0];

  if (!instance) {
    throw new Error(`Instance '${instanceName}' not found`);
  }

  const store = getSecretStore();
  const service = getAuthInstanceService(instance.name);

  const authenticatedFetch = async (
    url: string,
    init?: RequestInit,
  ): Promise<Response> => {
    const token = await store.get(service, 'accessToken');
    if (!token) {
      throw new Error(
        'No access token found. Run "auth login" to authenticate.',
      );
    }
    const headers = new Headers(init?.headers);
    headers.set('Authorization', `Bearer ${token}`);
    return fetch(url, { ...init, headers });
  };

  return {
    fetch: authenticatedFetch,
    baseUrl: instance.baseUrl,
    instanceName: instance.name,
  };
}
