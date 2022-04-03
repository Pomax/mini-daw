import { context } from "./audio-context.js";

const DEFAULT_ADSR_VALUES = {
  attack: 0.1,
  decay: 0.1,
  sustain: 0.6,
  release: 0.5,
};

/**
 * ......
 */
class ADSR {
  constructor(output, attack, decay, sustain, release) {
    this.setValues(attack, decay, sustain, release);
    this.sources = [];
    this.mix = 1;
    const envelope = (this.envelope = context.createGain());
    envelope.gain.value = 0;
    envelope.connect(output);
  }

  setValues(attack=0.02, decay=0.02, sustain=1, release=0.02) {
    this.attack = attack;
    this.decay = decay;
    this.sustain = sustain;
    this.release = release;
  }

  get value() {
    return this.envelope.gain.value;
  }

  attach(oscillator) {
    oscillator.connect(this.envelope);
    this.sources.push(oscillator);
    this.mix = 1 / (this.sources.length || 1);
  }

  detach(oscillator) {
    const pos = this.sources.findIndex((v) => v === oscillator);
    if (pos === -1) return false;

    this.sources.splice(pos, 1);
    this.mix = 1 / (this.sources.length || 1);
    oscillator.disconnect();
    return true;
  }

  play(velocity = 0.8, secondsInTheFuture = 0) {
    const { gain } = this.envelope;
    gain.setTargetAtTime(
      velocity * this.mix,
      context.currentTime + secondsInTheFuture,
      this.attack
    );
    gain.setTargetAtTime(
      velocity * this.sustain * this.mix,
      context.currentTime + this.attack + secondsInTheFuture,
      this.decay
    );
  }

  stop(secondsInTheFuture = 0) {
    const { gain } = this.envelope;
    gain.cancelScheduledValues(context.currentTime);
    gain.setTargetAtTime(
      0,
      context.currentTime + secondsInTheFuture,
      this.release
    );
  }
}

/**
 * ......
 */
class AudioSource {
  type = `sawtooth`;
  base = 1;
  detune = 1.012;
  chorus = false;

  constructor(owner, output) {
    this.owner = owner;

    // set up an ADSR envelope
    const adsr = (this.adsr = new ADSR(output));

    // set up an oscillator.
    const oscillator = (this.oscillator = context.createOscillator());
    oscillator.type = this.type;
    oscillator.frequency.setValueAtTime(this.base, context.currentTime);
    oscillator.start();

    // set up a detuned second oscillator for "chorus"
    const oscillator2 = (this.oscillator2 = context.createOscillator());
    oscillator2.type = this.type;
    oscillator2.frequency.setValueAtTime(
      this.base * this.detune,
      context.currentTime
    );
    oscillator2.start();

    // We initially only bind the regular oscillator. The second, detuned
    // oscillator gets attached/detached when we toggle chorus.
    adsr.attach(oscillator);
  }

  toggleChorus() {
    const { adsr, oscillator2 } = this;
    if (!adsr.detach(oscillator2)) {
      adsr.attach(oscillator2);
    }
  }

  setADSR(a, d, s, r) {
    this.adsr.setValues(a, d, s, r);
  }

  setWaveForm(name) {
    this.type = name;
    this.oscillator.type = name;
    this.oscillator2.type = name;
  }

  setFrequency(frequency) {
    this.base = frequency;
    this.oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    this.oscillator2.frequency.setValueAtTime(
      frequency * this.detune,
      context.currentTime
    );
  }

  setLFO(lfo) {
    lfo.connect(this.oscillator.frequency);
  }

  tuneTowards(frequency, ratio) {
    const target = (1 - ratio) * this.base + ratio * frequency;
    this.oscillator.frequency.setValueAtTime(target, context.currentTime);
    this.oscillator2.frequency.setValueAtTime(
      target * this.detune,
      context.currentTime
    );
  }

  start(velocity, attack) {
    if (velocity > 1) {
      velocity /= 127;
    }
    this.sustained = true;
    if (this.timeout) this.__disable(0);
    this.__enable(velocity, attack);
  }

  __enable(velocity = 0.8, attack = 0.01, secondsInTheFuture = 0) {
    // only add ourselves as new source if we weren't already active
    if (this.adsr.value === 0) this.owner.markActive(this);
    this.adsr.play(velocity, secondsInTheFuture);
  }

  stop(release) {
    this.__disable(release);
    this.sustained = false;
  }

  __disable(release = 0.01) {
    this.timeout = clearTimeout(this.timeout);
    this.adsr.stop();
    this.owner.markSuspended(this);
  }

  play(durationInSeconds, velocity = 64, secondsInTheFuture = 0) {
    if (this.sustained) return;
    if (velocity > 1) {
      velocity /= 128;
    }
    this.__enable(velocity, 0.01, secondsInTheFuture);
    this.timeout = setTimeout(
      () => this.__disable(),
      1000 * (durationInSeconds + secondsInTheFuture)
    );
  }

  // TODO: some ADSR control would be nice
}

export { AudioSource };
