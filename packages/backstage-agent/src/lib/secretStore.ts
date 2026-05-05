import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export interface SecretStore {
  get(service: string, account: string): Promise<string | undefined>;
  set(service: string, account: string, secret: string): Promise<void>;
  delete(service: string, account: string): Promise<void>;
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

class FileSecretStore implements SecretStore {
  private readonly baseDir: string;
  constructor() {
    const root =
      process.env.XDG_DATA_HOME ||
      (process.platform === 'win32'
        ? process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
        : path.join(os.homedir(), '.local', 'share'));
    this.baseDir = path.join(root, 'backstage-cli', 'auth-secrets');
  }
  private filePath(service: string, account: string): string {
    return path.join(
      this.baseDir,
      encodeURIComponent(service),
      `${encodeURIComponent(account)}.secret`,
    );
  }
  async get(service: string, account: string): Promise<string | undefined> {
    const file = this.filePath(service, account);
    if (!(await pathExists(file))) {
      return undefined;
    }
    return await fs.readFile(file, 'utf8');
  }
  async set(service: string, account: string, secret: string): Promise<void> {
    const file = this.filePath(service, account);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, secret, { encoding: 'utf8', mode: 0o600 });
  }
  async delete(service: string, account: string): Promise<void> {
    const file = this.filePath(service, account);
    try {
      await fs.unlink(file);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }
  }
}

let singleton: SecretStore | undefined;

export function getSecretStore(): SecretStore {
  if (!singleton) {
    singleton = new FileSecretStore();
  }
  return singleton;
}

export function getAuthInstanceService(instanceName: string): string {
  return `backstage-cli:auth-instance:${instanceName}`;
}

export function resetSecretStore(): void {
  singleton = undefined;
}
