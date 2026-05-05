import { spawn } from 'node:child_process';

export function openBrowser(url: string): void {
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
