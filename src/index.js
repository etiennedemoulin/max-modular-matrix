import { render, html } from 'lit/html.js';
import { matrix } from '../examples/configs/test2.js';
// import { resumeAudioContext } from '@ircam/resume-audio-context';
import './sc-modularmatrix.js';

console.info('> self.crossOriginIsolated', self.crossOriginIsolated);

// const AudioContext = window.AudioContext || window.webkitAudioContext;
// const audioContext = new AudioContext();


(async function main() {
  // await resumeAudioContext(audioContext);

  render(html`
    <sc-modularmatrix
      style="width:100%;height:100%;"
      @change=${e => console.log(e.detail.value)}
      .matrix=${matrix}
    ></sc-modularmatrix>
  `, document.body);
}());



