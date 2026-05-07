import { join } from 'node:path';
import { homedir } from 'node:os';

export function getConfigRoot(): string {
  return (
    process.env.XDG_CONFIG_HOME ||
    (process.platform === 'win32'
      ? process.env.APPDATA || join(homedir(), 'AppData', 'Roaming')
      : join(homedir(), '.config'))
  );
}
