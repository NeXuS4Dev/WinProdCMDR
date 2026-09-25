/**
 * Bundles the Electron main & preload scripts with esbuild.
 * Output: CommonJS files in dist-electron/ (referenced by package.json "main").
 */

import { build } from 'esbuild';

const watch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const shared = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  sourcemap: 'inline',
  external: ['electron'],
  outdir: 'dist-electron',
  entryPoints: ['electron/main.ts', 'electron/preload.ts'],
  outExtension: { '.js': '.cjs' },
  logLevel: 'info',
};

if (watch) {
  const ctx = await build({ ...shared, sourcemap: true, watch: true });
  await ctx.watch();
  console.log('[esbuild] watching electron/ ...');
} else {
  await build(shared);
}
