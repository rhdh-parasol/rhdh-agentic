import { spawn } from 'node:child_process';

export function openBrowser(url: string): boolean {
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
    child.on('error', () => {});
    return true;
  } catch {
    return false;
  }
}
