import { CliAuth } from '@backstage/cli-node';

export interface AuthenticatedContext {
  fetch: (url: string, init?: RequestInit) => Promise<Response>;
  baseUrl: string;
  instanceName: string;
}

export async function getAuthenticatedContext(
  instanceName?: string,
): Promise<AuthenticatedContext> {
  const auth = await CliAuth.create(
    instanceName ? { instanceName } : undefined,
  );

  const baseUrl = auth.getBaseUrl();
  const name = auth.getInstanceName();

  const authenticatedFetch = async (
    url: string,
    init?: RequestInit,
  ): Promise<Response> => {
    const token = await auth.getAccessToken();
    const headers = new Headers(init?.headers);
    headers.set('Authorization', `Bearer ${token}`);
    return fetch(url, { ...init, headers });
  };

  return {
    fetch: authenticatedFetch,
    baseUrl,
    instanceName: name,
  };
}
