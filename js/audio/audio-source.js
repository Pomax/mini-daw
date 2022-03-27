import { context } from "./audio-context.js";

class AudioSource {
  type = `triangle`;
  base = 1;
  detune = 1.012;

  constructor(owner, output) {
    this.owner = owner;

    // set up an oscillator.
    var oscillator = (this.oscillator = context.createOscillator());
    oscillator.type = this.type;
    oscillator.frequency.setValueAtTime(this.base, context.currentTime);

    // we use a gain to control attack/decay
    var volume = (this.volume = context.createGain());
    volume.gain.value = 0;
    volume.connect(output);
    oscillator.connect(volume);
    oscillator.start();
  }

  setFrequency(frequency) {
    this.base = frequency;
    this.oscillator.frequency.setValueAtTime(frequency, context.currentTime);
  }

  setLFO(lfo) {
    lfo.connect(this.oscillator.frequency);
  }

  tuneTowards(frequency, ratio) {
    const target = (1 - ratio) * this.base + ratio * frequency;
    this.oscillator.frequency.setValueAtTime(target, context.currentTime);
  }

  start(velocity, attack) {
    if (velocity > 1) {
      velocity /= 127;
    }
    this.sustained = true;
    if (this.timeout) this.__disable(0);
    this.__enable(velocity, attack);
  }

  __enable(velocity = 0.8, attack = 0.01) {
    // only add ourselves as new source if we weren't already active
    if (this.volume.gain.value === 0) this.owner.markActive(this);
    this.volume.gain.setTargetAtTime(velocity, context.currentTime, attack);
  }

  stop(decay) {
    this.__disable(decay);
    this.sustained = false;
  }

  __disable(decay = 0.01) {
    this.timeout = clearTimeout(this.timeout);
    this.volume.gain.setTargetAtTime(0, context.currentTime, decay);
    this.owner.markSuspended(this);
  }

  play(durationInSeconds, velocity) {
    if (this.sustained) return;
    if (velocity > 1) {
      velocity /= 128;
    }
    this.__enable(velocity);
    this.timeout = setTimeout(() => this.__disable(), 1000 * durationInSeconds);
  }

  // TODO: some ADSR control would be nice
}

export { AudioSource };
