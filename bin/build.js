import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/modular-matrix~.js'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'esnext',
  external: ['max-api'],
  banner: {
    js: `\
import {createRequire} from 'module';
const require = createRequire(import.meta.url);
    `,
  },
  outfile: 'modular-matrix/javascript/modular.matrix~.mjs',
});


await esbuild.build({
  entryPoints: ['src/modular-matrix.js'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'esnext',
  external: ['max-api'],
  banner: {
    js: `\
import {createRequire} from 'module';
const require = createRequire(import.meta.url);
    `,
  },
  outfile: 'modular-matrix/javascript/modular.matrix.mjs',
});



await esbuild.build({
  entryPoints: ['src/mc.modular-matrix~.js'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'esnext',
  external: ['max-api'],
  banner: {
    js: `\
import {createRequire} from 'module';
const require = createRequire(import.meta.url);
    `,
  },
  outfile: 'modular-matrix/javascript/mc.modular.matrix~.mjs',
});
