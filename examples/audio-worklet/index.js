import "core-js/stable";
import "regenerator-runtime/runtime";
import { resumeAudioContext } from '@ircam/resume-audio-context';
import noiseGeneratorWorlet from './noise-generator.worklet.js';

const audioContext = new AudioContext();
// application entry point
// ex. from https://github.com/GoogleChromeLabs/web-audio-samples/tree/main/audio-worklet/basic/noise-generator
(async function main() {
  resumeAudioContext(audioContext);

  await audioContext.audioWorklet.addModule(noiseGeneratorWorlet);

  const modulator = new OscillatorNode(audioContext);
  const modGain = new GainNode(audioContext);
  const noiseGenerator = new AudioWorkletNode(audioContext, 'noise-generator');
  // noiseGenerator.connect(audioContext.destination);

  // Connect the oscillator to 'amplitude' AudioParam.
  const paramAmp = noiseGenerator.parameters.get('amplitude');
  modulator.connect(modGain).connect(paramAmp);

  modulator.frequency.value = 0.5;
  modGain.gain.value = 0.75;
  modulator.start();
}());

