import { render, html } from 'lit/html.js';
import { matrix } from '../examples/configs/test1.js';
// import { resumeAudioContext } from '@ircam/resume-audio-context';
import './sc-modularmatrix.js';

console.info('> self.crossOriginIsolated', self.crossOriginIsolated);

// const AudioContext = window.AudioContext || window.webkitAudioContext;
// const audioContext = new AudioContext();


(async function main() {
  // await resumeAudioContext(audioContext);

  render(html`
    <h2>Matrix</h2>
    <sc-modularmatrix
      rows=${matrix.inputs.length}
      columns=${matrix.outputs.length}
      style="width:${matrix.outputs.length * 30}px;height:${matrix.inputs.length * 30}px;"
    ></sc-modularmatrix>
  `, document.body);
}());
