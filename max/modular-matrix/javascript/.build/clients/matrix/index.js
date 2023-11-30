import '@soundworks/helpers/polyfills.js';
import { Client } from '@soundworks/core/client.js';
import launcher from '@soundworks/helpers/launcher.js';
import createLayout from './layout.js';
import { render, html } from 'lit/html.js';
import '../../../../../src/sc-modularmatrix.js';

// - General documentation: https://soundworks.dev/
// - API documentation:     https://soundworks.dev/api
// - Issue Tracker:         https://github.com/collective-soundworks/soundworks/issues
// - Wizard & Tools:        `npx soundworks`

/**
 * Grab the configuration object written by the server in the `index.html`
 */
const config = window.SOUNDWORKS_CONFIG;

/**
 * If multiple clients are emulated you might to want to share some resources
 */
// const audioContext = new AudioContext();

async function main($container) {
  /**
   * Create the soundworks client
   */
  const client = new Client(config);
  launcher.register(client, {
    initScreensContainer: $container
  });

  /**
   * Launch application
   */
  await client.start();
  const schema = await client.stateManager.attach('matrix');
  const matrix = schema.get('structure');
  render(html`
    <sc-modularmatrix
      style="width:100%;height:100%"
      @change=${e => schema.set({
    state: e.detail
  })}
      .matrix=${matrix}
    ></sc-modularmatrix>
  `, document.body);

  // do your own stuff!
}

// The launcher enables instanciation of multiple clients in the same page to
// facilitate development and testing.
// e.g. `http://127.0.0.1:8000?emulate=10` to run 10 clients side-by-side
launcher.execute(main, {
  numClients: parseInt(new URLSearchParams(window.location.search).get('emulate')) || 1
});
//# sourceMappingURL=./index.js.map