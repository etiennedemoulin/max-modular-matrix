import { html, svg, css, nothing } from 'lit';
import { range } from 'lit/directives/range.js';
import { map } from 'lit/directives/map.js';

import ScElement from './ScElement.js';
import KeyboardController from './controllers/keyboard-controller.js';

import './sc-speed-surface.js';
import './sc-dial.js';

import { getTime } from '@ircam/sc-gettime';
import getScale from './utils/get-scale.js';
import getTextWidth from './utils/get-text-width.js';
import { describeArc, polarToCartesian } from './utils/describe-arc.js';
import { dial } from './utils/dial-table.js';
import { isNumber } from './utils/isNumber.js';

/**
 * Given data follows a row-first convention with the 0 index
 * being displayed at the top of the matrix
 * ```
 * [
 *    [0, 0, 0, 1],`
 *    [0, 1, 0, 0],`
 *    // ...
 * ]
 */
class ScModularMatrix extends ScElement {
  static properties = {
    columns: {
      type: Number,
      reflect: true,
    },
    rows: {
      type: Number,
      reflect: true,
    },
    // @todo - updates values when updated
    states: {
      type: Array,
    },
    value: {
      type: Array,
    },
    // @todo - document live directive
    reset: {
      type: Boolean,
      reflect: true,
    },
    disabled: {
      type: Boolean,
      reflect: true,
    },
    cellSize: {
      type: Number,
    },
    matrix: {
      type: Array,
    },
  }

  static styles = css`
    :host {
      box-sizing: border-box;
      width: 300px;
      height: 150px;
      vertical-align: top;
      display: inline-block;
      background-color: var(--sc-color-primary-2);
      border: 1px solid var(--sc-color-primary-3);

      --sc-matrix-cell-color: #ffffff;
      --sc-matrix-cell-border: var(--sc-color-primary-4);
    }

    :host([hidden]) {
      display: none
    }

    :host([disabled]) {
      opacity: 0.7;
    }

    :host(:focus), :host(:focus-visible) {
      outline: none;
      border: 1px solid var(--sc-color-primary-4);
    }

    svg {
      box-sizing: border-box;
      width: 100%;
      height: 100%;
    }

    rect {
      fill: var(--sc-matrix-cell-color);
      shape-rendering: crispedges;
    }

    line {
      stroke: var(--sc-matrix-cell-border);
      shape-rendering: crispedges;
    }

    rect.keyboard-nav-cell {
      fill: var(--sc-color-secondary-5);
      shape-rendering: crispedges;
      pointer-events: none;
    }

    g {
      width:100%
      height:100%
    }

    .dial-line {
      stroke-width: 2px;
      stroke: #888888;
      stroke-linecap: butt;
    }

    path.bg {
      stroke: #fff;
      stroke-width: 2px;
      fill: transparent;
    }

    path.fg {
      stroke: #888888;
      stroke-width: 2px;
      fill: transparent;
    }

  `;

  set value(value) {

    this._value = value;

    // if we replace the internal data matrix with an external one, we want
    // to keep the matrix description consistent
    // this._rows = this._value.length;
    // this._columns = this._value[0].length;
    // `requestUpdate` because in many cases `value` might be the same instance
    this.requestUpdate();
  }

  get value() {
    return this._value;
  }

  set reset(value) {
    this._reset();
  }

  get reset() {
    return undefined;
  }

  get min() {
    return this._min;
  }

  set min(value) {
    // workaround weird display issue when min and max are equal
    if (value === this.max) {
      value -= 1e-10;
    }

    this._min = value;
    // clamp value
    this.value = this.value;
    // update scales
    this._updateScales();
    this.requestUpdate();
  }

  get max() {
    return this._max;
  }

  set matrix(matrix) {
    this.rows = matrix.inputs.length;
    this.columns = matrix.outputs.length;
    this._matrix = matrix;
    this._resizeMatrix();
    // this._resizeMatrix();
    this.requestUpdate();
  }

  set cellSize(value) {
    // this._resizeMatrix();
    // this.requestUpdate();
    // console.log(this._matrix);
    // this._width = this.borderWidth + this._matrix.outputs.length * value;
    // this._height = this.borderHeight + this._matrix.inputs.length * value;
    // this._resizeMatrix();
    // this.requestUpdate();
  }

  set max(value) {
    // workaround weird display issue when min and max are equal
    if (value === this.min) {
      value += 1e-10;
    }

    this._max = value;
    // clamp value
    this.value = this.value;
    // update scales
    this._updateScales();
    this.requestUpdate();
  }

  constructor() {
    super();

    this._value = [];
    this._states = [0, 1];
    this._min = 0;
    this._max = 0;
    this._width = 300; // these are the default from css
    this._height = 200;
    this._resizeObserver = null;
    this._matrix = [];

    this.borderWidth = 100;
    this.borderHeight = 100;
    this.columns = 0;
    this.rows = 0;
    this.disabled = false;
    this.max = 1;
    this.min = 0;

    // for keyboard controlled selection of cells
    this._keyboardHighlightCell = null;
    this._onFocus = this._onFocus.bind(this);
    this._onBlur = this._onBlur.bind(this);

    this._mouseMove = this._mouseMove.bind(this);
    this._mouseUp = this._mouseUp.bind(this);
    this._displayConnection = this._displayConnection.bind(this);

    this._propagateValues = this._propagateValues.bind(this);
    this._rafId = null;

    this._pointerId = null;
    this._lastPointer = null;
    this._lastTime = null;
    this._pointerPos = null;

    this._mousePointerPos = null;

    this._typedValue = null;

    this.keyboard = new KeyboardController(this, {
      filterCodes: [
        'Space', 'Enter', 'Escape', 'Backspace',
        'Digit0', 'Digit1', 'Digit2', 'Digit3',
        'Digit4', 'Digit5', 'Digit6', 'Digit7',
        'Digit8', 'Digit9', 'Equal', 'Comma'
      ],
      callback: this._onKeyboardEvent.bind(this),
      deduplicateEvents: true,
    });

    window.addEventListener('mousemove', this._displayConnection);

  }

  render() {
    // @note - For some reason setting the viewbox dynamically doesn't work.
    // Also the outline of each cell would be scaled too, which is not what we
    // want. Then we rely on the real element size in pixels.
    //
    // Relying on rect stroke or outline does not give a clean result neither
    // so we manually draw the lines.

    this.borderWidth = this._width * 0.2;
    this.borderHeight = this._height * 0.2;

    const cellWidth = (this._width - this.borderWidth) / this.columns;
    const cellHeight = (this._height - this.borderHeight) / this.rows;

    // should be removed
    const minValue = this._states[0];
    const maxValue = this._states[this._states.length - 1];

    // testing
    let highligthCell = null;

    if (this._keyboardHighlightCell !== null) {
      highligthCell = svg`
        <rect
          class="keyboard-nav-cell"
          width=${cellWidth}
          height=${cellHeight}
          x=${this._keyboardHighlightCell.x * cellWidth}
          y=${this._keyboardHighlightCell.y * cellHeight}
          opacity="0.4"
        ></rect>
      `;
    }

    // prevent default to prevent focus when disabled
    return html`
      <svg
        @mousedown=${e => e.preventDefault()}
        @touchstart=${e => e.preventDefault()}
      >
        <g>
          ${this.value.map((row, rowIndex) => {
            const y = this.borderHeight + (rowIndex * cellHeight);
            return row.map((value, columnIndex) => {
              const x = this.borderWidth + (columnIndex * cellWidth);
              const radius = Math.min(cellWidth, cellHeight) * 0.25;
              // console.log(cellWidth, cellHeight);
              const cx = (cellWidth  * 0.5);
              const cy = (cellHeight * 0.35);
              const angle = this._valueToAngleScale(this.value[rowIndex][columnIndex]); // computed from value
              const position = polarToCartesian(cx, cy, radius + 2, angle); // + 2  is half path stroke-width

              let displayValue = Math.round(dial[Math.round(value * 511)] * 10) / 10;
              if (displayValue === dial[0]) {
                displayValue = "-∞";
              }
              if (displayValue > 0) {
                displayValue = `+${displayValue}`;
              }

              // console.log(angle, position, this.value);

              return html`
                <svg
                  x=${x}
                  y=${y}
                  width=${cellWidth}
                  height=${cellHeight}
                >
                  <path
                    class="bg"
                    d="${describeArc(cx, cy, radius, Math.min(140, angle + 8), 140)}"
                  />
                  <path
                    class="fg"
                    d="${describeArc(cx, cy, radius, -140, angle)}"
                  />
                  <line class="dial-line" x1=${cx}px y1=${cy}px x2=${position.x}px y2=${position.y}px />
                  <foreignObject x=0 y="50%" width="100%" height="50%">
                  <p style="display: block;margin-block-start: 0;margin-block-end: 0;margin-inline-start: 0;margin-inline-end: 0;padding-block-start: 0;padding-block-end: 0px;font-size: 0.9rem;text-align: center;">${displayValue}</p>
                  </foreignObject>
                  <rect
                    width=100%
                    height=100%
                    x=0
                    y=0
                    style="fill-opacity: 0"
                    data-row-index=${rowIndex}
                    data-column-index=${columnIndex}
                    @mousedown=${this._onCellEvent}
                    @touchend=${this._onCellEvent}
                    @dblclick=${this._resetValue}
                  ></rect>
                </svg>
              `;
            });
          })}
        </g>
        <!-- keyboard controlled highligth cell -->
        ${highligthCell
          ? svg`<g>${highligthCell}</g>`
          : nothing
        }
        <!-- CENTRAL TEXT -->
        <g>
          <svg
            x=0
            y=0
            width=${this.borderWidth}
            height=${this.borderHeight}
          >
            <text
              x=50%
              y=40%
              dy="0"
              dominant-baseline="middle"
              text-anchor="middle"
              font-size="1em"
              style="fill:white"
            >
              <tspan x="50%" dy="1.2em">${this._mousePointerPos ? this._matrix.inputs[this._mousePointerPos.rowIndex] : ""}</tspan>
              <tspan x="50%" dy="1.2em">${this._mousePointerPos ? "->" : ""}</tspan>
              <tspan x="50%" dy="1.2em">${this._mousePointerPos ? this._matrix.outputs[this._mousePointerPos.columnIndex] : ""}</tspan>
            </text>
          </svg>
        </g>
        <g>
          <!-- horizontal lines -->
          ${map(range(0, this.value.length), i => {
            const y = this.borderHeight + (i * cellHeight);
            return html`
              <svg>
                <line
                  x1="0"
                  y1=${y}
                  x2=${this._width}
                  y2=${y}
                ></line>
              </svg>
              <svg
                x=0
                y=${y}
                width=${this.borderWidth}
                height=${cellHeight}
              >
                <text
                  x=50%
                  y=50%
                  dominant-baseline="middle"
                  text-anchor="middle"
                  font-size="1em"
                  style="fill:white"
                >${this._matrix.inputs[i]}</text>
              </svg>
            `;
          })}

          <!-- vertical lines -->
          ${map(range(0, this.value[0].length), i => {
            const x = this.borderWidth + (i * cellWidth);
            return html`
              <svg>
                <line
                  x1=${x}
                  y1="0"
                  x2=${x}
                  y2=${this._height}
                ></line>
              </svg>
              <svg
                x=${x}
                y=0
                width=${cellWidth}
                height=${this.borderHeight}
              >
                <text
                  x=${cellWidth/2}
                  y=${this.borderHeight/2}
                  width=100%
                  height=100%
                  style="fill:white"
                  font-size="1em"
                  transform="rotate(270, ${cellWidth/2}, ${this.borderHeight/2})"
                  dominant-baseline="central"
                  text-anchor="middle"
                >${this._matrix.outputs[i]}</text>
              </svg>
            `;
          })}
        </g>
      </svg>
    `;
  }

  updated(changedProperties) {
    if (changedProperties.has('disabled')) {
      const tabindex = this.disabled ? -1 : this._tabindex;
      this.setAttribute('tabindex', tabindex);

      if (this.disabled) { this.blur(); }
    }
  }


  connectedCallback() {
    super.connectedCallback();
    // @note - this is important if the compoent is e.g. embedded in another component
    this._tabindex = this.getAttribute('tabindex') || 0;

    this._resizeObserver = new ResizeObserver(entries => {
      const $svg = this.shadowRoot.querySelector('svg');
      const { width, height } = $svg.getBoundingClientRect();
      this._width = width;
      this._height = height;
      this.requestUpdate();
    });

    this._resizeObserver.observe(this);

    this.addEventListener('focus', this._onFocus);
    this.addEventListener('blur', this._onBlur);
  }

  disconnectedCallback() {
    this._resizeObserver.disconnect();

    this.removeEventListener('focus', this._onFocus);
    this.removeEventListener('blur', this._onBlur);

    super.disconnectedCallback();
  }

  _resizeMatrix() {
    const value = this.value;

    // remove additionnal rows
    for (let y = value.length - 1; y >= this.rows; y--) {
      value.splice(y, 1);
    }

    // remove additionnal columns
    value.forEach(row => {
      for (let x = row.length - 1; x >= this.columns; x--) {
        row.splice(x, 1);
      }
    });

    // add new rows and columns
    const currentNumRows = value.length;

    for (let y = 0; y < this.rows; y++) {
      if (y < currentNumRows) {

        // check _rows
        value.forEach(row => {
          for (let x = row.length; x < this.columns; x++) {
            row[x] = this._states[0];
          }
        });
      } else {
        // new row
        const row = new Array(this.columns).fill(this._states[0]);
        value[y] = row;
      }
    }

    this.requestUpdate();
  }

  _updateScales() {
    this._valueToAngleScale = getScale([this.min, this.max], [-140, 140]);
    this._pixelToDiffScale = getScale([0, 15], [0, this.max - this.min]);
  }

  _onKeyboardEvent(e) {
    const rowIndex = this._pointerPos.rowIndex;
    const columnIndex = this._pointerPos.columnIndex;
    if (e.type === 'keydown') {
      switch (e.key) {
        case 'Enter':
          if (isNumber(this._typedValue)) {
            // find the closest index in dial
            const dB = parseFloat(this._typedValue);
            const nearestdB = dial.reduce((a, b) => {
              return Math.abs(b - dB) < Math.abs(a - dB) ? b : a;
              });
            const index = dial.findIndex(e => e === nearestdB);
            const value = index / 511;

            this.value[rowIndex][columnIndex] = value;
            this.requestUpdate();
            this._typedValue = null;
          } else {
            this._typedValue = null;
          }
          break;
        case 'Escape':
          this._typedValue = null;
          break;
        default:
          if (this._typedValue === null) {
            this._typedValue = e.key;
          } else {
            this._typedValue += e.key;
          }
          break;
      }
    }
  }

  _onFocus() {
    this._keyboardHighlightCell = null;
    this.requestUpdate();
  }

  _onBlur() {
    this._keyboardHighlightCell = null;
    this.requestUpdate();
  }

  _reset() {
    this._value.forEach(row => {
      for (let i = 0; i < row.length; i++) {
        row[i] = this._states[0];
      }
    });

    this.requestUpdate();
    this._emitChange();
  }

  _onCellEvent(e) {

    window.addEventListener('mousemove', this._mouseMove);
    window.addEventListener('mouseup', this._mouseUp);

    // this._requestUserSelectNoneOnBody();

    e.preventDefault(); // important to prevent focus when disabled
    if (this.disabled) { return; }

    this.focus();

    this._pointerId = 'mouse';

    this._lastTime = getTime();
    this._lastPointer = e;
    const { rowIndex, columnIndex } = e.target.dataset;
    this._pointerPos = { rowIndex, columnIndex };
  }

  _resetValue(e) {
    const { rowIndex, columnIndex } = e.target.dataset;
    this.value[rowIndex][columnIndex] = 0;
    this.requestUpdate();
  }

  _mouseMove(e) {
    this._requestPropagateValues(e);
  }

  _displayConnection(e) {
    const cellWidth = (this._width - this.borderWidth) / this.columns;
    const cellHeight = (this._height - this.borderHeight) / this.rows;
    const columnIndex = Math.floor((e.offsetX - this.borderWidth) / cellWidth);
    const rowIndex = Math.floor((e.offsetY - this.borderHeight) / cellHeight);

    if ((!this._mousePointerPos || this._mousePointerPos.rowIndex !== rowIndex
      || this._mousePointerPos !== columnIndex) && this._pointerId === null ) {
      this._mousePointerPos = { rowIndex, columnIndex };
      this.requestUpdate();
    }
  }

  _mouseUp(e) {
    window.removeEventListener('mousemove', this._mouseMove);
    window.removeEventListener('mouseup', this._mouseUp);

    // this._cancelUserSelectNoneOnBody();
    this._requestPropagateValues(e);
    // we want to have { dx: 0, dy: 0 } on mouse up,
    // with 20ms, we should be in the next requestAnimationFrame
    setTimeout(() => {
      this._pointerId = null;
      this._requestPropagateValues(e);
    }, 20);

    // this._requestPropagateValues(e);
  }

  _requestPropagateValues(e) {
    window.cancelAnimationFrame(this._rafId);
    this._rafId = window.requestAnimationFrame(() => this._propagateValues(e));
  }

  _propagateValues(e) {
    const lastX = this._lastPointer.screenX;
    const lastY = this._lastPointer.screenY;
    const x = e.screenX;
    const y = e.screenY;

    const now = getTime();
    const dt = (this._lastTime - now) * 1000; // ms

    const dx = (x - lastX) / dt;
    const dy = (y - lastY) / dt;

    this._lastTime = now;
    this._lastPointer = e;
    // propagate outside the shadow DOM boundaries
    // cf. https://lit-element.polymer-project.org/guide/events#custom-events
    const event = new CustomEvent('input', {
      bubbles: true,
      composed: true,
      detail: { dx, dy, pointerId: this._pointerId },
    });

    const { rowIndex, columnIndex } = this._pointerPos;
    // console.log(dx, dy, rowIndex, columnIndex);
    this._updateCell(rowIndex, columnIndex, dx, dy);

    // this.dispatchEvent(event);
  }

  _updateCell(rowIndex, columnIndex, dx, dy) {
    // const currentIndex = this._states.indexOf(this.value[rowIndex][columnIndex]);
    // handle situations where _states as changed in between two interactions
    // const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % this._states.length;

    // console.log(this.value[rowIndex][columnIndex])
    // if (this.value[rowIndex][columnIndex] < 0) {
    //   this.value[rowIndex][columnIndex] = 0;
    // } else if (this.value[rowIndex][columnIndex] > 1) {
    //   this.value[rowIndex][columnIndex] = 1;
    // } else {
    //   this.value[rowIndex][columnIndex] += dy * 0.05;
    // }
    const diff = this._pixelToDiffScale(dy) * 0.32;
    this.value[rowIndex][columnIndex] += diff;
    const clamp = (min, max) => value => Math.max(Math.min(value, max), min);
    this.value[rowIndex][columnIndex] = clamp(this.min, this.max)(this.value[rowIndex][columnIndex]);

    this._emitChange();
    this.requestUpdate();
  }

  _emitChange() {
    const event = new CustomEvent('change', {
      bubbles: true,
      composed: true,
      detail: { value: this.value },
    });

    this.dispatchEvent(event);
  }

  _updateValue(e) {
    console.log(e);
  }

}

if (customElements.get('sc-modularmatrix') === undefined) {
  customElements.define('sc-modularmatrix', ScModularMatrix);
}

export default ScModularMatrix;
