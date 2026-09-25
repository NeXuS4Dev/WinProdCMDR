/**
 * Development orchestrator:
 *   1. starts the Vite dev server for the renderer,
 *   2. starts esbuild in watch mode for the Electron main/preload,
 *   3. launches Electron pointing at the dev server (HMR inside the app windows).
 */

import { spawn } from 'node:child_process';
import { build, context } from 'esbuild';
import { createServer } from 'vite';

const vite = await createServer({
  configFile: 'vite.config.ts',
  server: { strictPort: false },
});
await vite.listen();
const resolved = vite.resolvedUrls?.local?.[0] ?? 'http://localhost:5173/';
console.log(`[vite] renderer dev server: ${resolved}`);

const shared = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  external: ['electron'],
  outdir: 'dist-electron',
  entryPoints: ['electron/main.ts', 'electron/preload.ts'],
  outExtension: { '.js': '.cjs' },
  logLevel: 'warning',
};

const esctx = await build({ ...shared, sourcemap: true, watch: true });
await esctx.watch();
console.log('[esbuild] watching electron/ ...');

const electronBin = process.platform === 'win32' ? '.\\node_modules\\.bin\\electron.cmd' : 'node_modules/.bin/electron';
const electron = spawn(electronBin, ['.'], {
  stdio: 'inherit',
  env: { ...process.env, VITE_DEV_SERVER_URL: resolved.replace(/\/$/, '') },
  shell: process.platform !== 'win32',
});
electron.on('exit', async (code) => {
  await Promise.all([esctx.dispose(), vite.close()]).catch(() => {});
  process.exit(code ?? 0);
});
