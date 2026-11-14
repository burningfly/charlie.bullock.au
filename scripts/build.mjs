import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

await build({
  entryPoints: [resolve(root, 'src/game.js')],
  bundle: true,
  minify: true,
  sourcemap: false,
  target: ['es2020'],
  format: 'iife',
  outfile: resolve(root, 'public/reefkeeper-2d.js'),
  legalComments: 'none',
});

console.log('Built Phaser 2D game bundle.');
