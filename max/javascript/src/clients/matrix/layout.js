import { LitElement, html, render, css, nothing } from 'lit';

import '../components/sw-infos-button.js';
import '../components/sw-credits.js';

/**
 * This simple layout is provided for convenience, feel free to edit or even
 * remove it if you want to use you own logic.
 *
 * @example
 * const $layout = createLayout(client, $container);
 * const myComponent = {
 *   render() {
 *     return html`<h1>${Math.random()}</h1>`
 *   },
 * };
 * $layout.addComponent(myComponent);
 * setInterval(() => $layout.requestUpdate(), 1000);
 */
class SimpleLayout extends LitElement {
  constructor() {
    super();

    this._client = null;
    this._components = new Set();

    this._showCredits = false;
  }

  // no shadow DOM
  createRenderRoot() {
    return this;
  }

  // comp is anything that have a render method
  addComponent(comp) {
    this._components.add(comp);
    this.requestUpdate();
  }

  deleteComponent(comp) {
    this._components.delete(comp);
    this.requestUpdate();
  }

  toggleCredits() {
    this._showCredits = !this._showCredits;
    this.requestUpdate();
  }

  render() {
    return html`
      <div>
        ${Array.from(this._components).map(comp => comp.render ? comp.render() : comp)}

        <!-- credits -->
        ${this._showCredits ? html`<sw-credits .client="${this.client}"></sw-credits>` : nothing}
        <sw-infos-button @click="${this.toggleCredits}"></sw-infos-button>
      </div>
    `;
  }
}

customElements.define('simple-layout', SimpleLayout);

export default function createLayout(client, $container) {
  const layoutId = `${client.role}-${client.id}`;

  render(html`
    <simple-layout
      .client="${client}"
      id="${layoutId}"
    ></simple-layout>
  `, $container);

  const $layout = document.querySelector(`#${layoutId}`);

  return $layout;
}

