import * as esbuild from 'esbuild'

await esbuild.build({
  entryPoints: ['./src/index.ts'],
  bundle: true,
  outfile: './dist/index.js',
  format: 'esm',
  platform: 'node',
  target: 'node22',
  packages: 'external',
})
