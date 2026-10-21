import { build } from 'esbuild';

// A classic self-contained script also works when index.html is opened via file://.
await build({
  entryPoints: ['assets/machine.js'],
  outfile: 'assets/machine.bundle.js',
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2022'],
  minify: true,
  legalComments: 'linked',
});
console.log('3D workshop bundled for local-file and hosted use.');
