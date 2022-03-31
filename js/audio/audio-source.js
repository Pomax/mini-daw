import { context } from "./audio-context.js";

class AudioSource {
  type = `sawtooth`;
  base = 1;
  detune = 1.012;
  chorus = false;

  constructor(owner, output) {
    this.owner = owner;

    // set up an oscillator.
    let oscillator = (this.oscillator = context.createOscillator());
    oscillator.type = this.type;
    oscillator.frequency.setValueAtTime(this.base, context.currentTime);

    // set up a detuned second oscillator for "chorus"
    let oscillator2 = (this.oscillator2 = context.createOscillator());
    oscillator2.type = this.type;
    oscillator2.frequency.setValueAtTime(
      this.base * this.detune,
      context.currentTime
    );

    // we use a gain to control attack/decay
    let volume = (this.volume = context.createGain());
    volume.gain.value = 0;
    volume.connect(output);
    oscillator.connect(volume);
    oscillator.start();

    let volume2 = (this.volume2 = context.createGain());
    volume2.gain.value = 0;
    volume2.connect(output);
    oscillator2.connect(volume2);
    oscillator2.start();
  }

  toggleChorus() {
    this.chorus = !this.chorus;
    const val = this.volume.gain.value;
    if (val > 0) {
      if (this.chorus) {
        this.volume.gain.setValueAtTime(val / 2, context.currentTime);
        this.volume2.gain.setValueAtTime(val / 2, context.currentTime);
      } else {
        this.volume.gain.setValueAtTime(val * 2, context.currentTime);
        this.volume2.gain.setValueAtTime(0, context.currentTime);
      }
    }
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
    if (this.volume.gain.value === 0) this.owner.markActive(this);
    if (!this.chorus) {
      this.volume.gain.setTargetAtTime(
        velocity,
        context.currentTime + secondsInTheFuture,
        attack
      );
    } else {
      this.volume.gain.setTargetAtTime(
        velocity / 2,
        context.currentTime + secondsInTheFuture,
        attack
      );
      this.volume2.gain.setTargetAtTime(
        velocity / 2,
        context.currentTime + secondsInTheFuture,
        attack
      );
    }
  }

  stop(decay) {
    this.__disable(decay);
    this.sustained = false;
  }

  __disable(decay = 0.01) {
    this.timeout = clearTimeout(this.timeout);
    this.volume.gain.setTargetAtTime(0, context.currentTime, decay);
    if (this.chorus) {
      this.volume2.gain.setTargetAtTime(0, context.currentTime, decay);
    }
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
