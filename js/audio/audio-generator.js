import { router } from "./../midi/router.js";
import { AudioSource } from "./audio-source.js";
import { context, master } from "./audio-context.js";

class AudioGenerator {
  constructor(polyphony = 12, lfoFrequency = 3, lfoStrength = 0) {
    this.polyphony = polyphony;

    let output = (this.output = context.createGain());
    output.gain.value = 1.0;
    output.connect(master);

    this.sources = [];
    for (let i = 0; i < polyphony; i++) {
      this.sources.push(new AudioSource(this, output));
    }
    this.inactive = [...this.sources];
    this.active = [];

    this.setupLFO(lfoFrequency, lfoStrength);
  }

  setupLFO(frequency, amplitude) {
    // set up the low frequency oscillator
    const LFO = context.createOscillator();
    LFO.type = "sine";
    LFO.frequency.value = frequency;
    this.lfo = LFO;

    // set a gain on this LFO
    const LFOGain = context.createGain();
    LFOGain.gain.value = amplitude;
    this.lfoGain = LFOGain;

    // hook it up and start the LFO
    LFO.connect(LFOGain);
    LFO.start();

    // hook up this LFO to all our oscillators
    this.sources.forEach((oscillator) => oscillator.setLFO(LFOGain));

    // and listen for the MIDI "mod wheel" event
    router.addListener(this, `modwheel`);
  }

  onModWheel(value) {
    this.setLFOStrength(value / 127);
  }

  setLFOFrequency(frequency) {
    this.lfo.frequency.setTargetAtTime(frequency, context.currentTime, 0.02);
  }

  setLFOStrength(amplitude) {
    this.lfoGain.gain.setTargetAtTime(amplitude, context.currentTime, 0.02);
  }

  getOscillator(frequency) {
    let source = this.inactive.shift();
    if (!source) source = this.active.shift();
    if (source.sustained) source.stop();
    source.setFrequency(frequency);
    return source;
  }

  toggleChorus() {
    this.sources.forEach((source) => source.toggleChorus());
  }

  setADSR(a, d, s, r) {
    this.sources.forEach((source) => source.setADSR(a, d, s, r));
  }

  setWaveForm(name) {
    this.sources.forEach((source) => source.setWaveForm(name));
  }

  markActive(source) {
    this.active.push(source);
    this.updatePolyphonyVolume();
  }

  markSuspended(source) {
    const pos = this.active.findIndex((v) => v === source);
    this.active.splice(pos, 1);
    this.inactive.push(source);
    this.updatePolyphonyVolume();
  }

  updatePolyphonyVolume() {
    const mix = 1 / (this.active.length || 1) ** 0.5;
    this.output.gain.setValueAtTime(mix, context.currentTime);
  }

  stopAll() {
    this.sources.forEach((source) => source.stop());
  }
}

const beeper = new AudioGenerator(4);
beeper.setADSR(0, 0, 1, 0);

export { AudioGenerator, beeper };
