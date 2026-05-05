import { spawn } from 'node:child_process';

export function openBrowser(url: string): boolean {
  const spawnOpts = { detached: true, stdio: 'ignore' } as const;
  let child;
  try {
    if (process.platform === 'darwin') {
      child = spawn('open', [url], spawnOpts);
    } else if (process.platform === 'win32') {
      child = spawn('cmd', ['/c', 'start', '', url], spawnOpts);
    } else {
      child = spawn('xdg-open', [url], spawnOpts);
    }
    child.unref();
    child.on('error', (err) => {
      process.stderr.write(`Warning: failed to open browser: ${err.message}\n`);
    });
    return true;
  } catch (err) {
    process.stderr.write(
      `Warning: failed to launch browser: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    return false;
  }
}
