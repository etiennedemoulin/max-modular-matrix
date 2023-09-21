import '@soundworks/helpers/polyfills.js';
import { Server } from '@soundworks/core/server.js';

import { loadConfig } from '../utils/load-config.js';
import '../utils/catch-unhandled-errors.js';

import pluginFilesystem from '@soundworks/plugin-filesystem/server.js';

import fs from 'fs-extra';
import path from 'path';
import JSON5 from 'json5';

import matrixSchema from './schemas/matrix.js';


// - General documentation: https://soundworks.dev/
// - API documentation:     https://soundworks.dev/api
// - Issue Tracker:         https://github.com/collective-soundworks/soundworks/issues
// - Wizard & Tools:        `npx soundworks`

const config = loadConfig(process.env.ENV, import.meta.url);

console.log(`
--------------------------------------------------------
- launching "${config.app.name}" in "${process.env.ENV || 'default'}" environment
- [pid: ${process.pid}]
--------------------------------------------------------
`);

/**
 * Create the soundworks server
 */
const server = new Server(config);
// configure the server for usage within this application template
server.useDefaultApplicationTemplate();

server.stateManager.registerSchema('matrix', matrixSchema);

server.pluginManager.register('filesystem', pluginFilesystem, {
  dirname: path.join(process.cwd(), '../help'),
});


/**
 * Launch application (init plugins, http server, etc.)
 */
await server.start();

const filesystem = await server.pluginManager.get('filesystem');
const schema = await server.stateManager.create('matrix');

// const filepath = filesystem.findInTree('2x2.json');
// console.log(filesystem.getTree());
const filename = 'matrix.json';
filesystem.getTree().children.forEach(file => {
  if (file.name === filename) {
    const matrix = JSON5.parse(fs.readFileSync(file.path).toString());
    schema.set({structure:matrix});
  }
})

schema.onUpdate(updates => {
  process.send(JSON.stringify(updates));
  // console.log(updates);
});
