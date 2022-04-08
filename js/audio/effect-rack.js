import { context } from "./audio-context.js";

// see https://dinodini.wordpress.com/2010/04/05/normalized-tunable-sigmoid-functions/
function makeDriveCurve(k = 0, clipRatio = 0) {
  const n_samples = 44100;
  const interval = n_samples / 2;
  const curve = new Float32Array(n_samples);
  const f = 1 - k;
  for (let i = 0; i < interval; i++) {
    const x = i / interval;
    const y = (k * x - x) / (2 * k * x - k - 1);
    curve[interval - i] = -y * f;
    curve[interval + i] = y * f;
  }
  return curve;
}

export class EffectRack {
  constructor() {
    this.overdrive = context.createWaveShaper();
    this.setOverdrive(0);
    this.reverb = context.createConvolver();
    this.enabled = {
      reverb: false,
    };
    // Note that the chorus is set per oscillator,
    // in the audio-source.js file
  }

  setOverdrive(value) {
    this.overdrive.curve = makeDriveCurve(value);
  }

  setAudioSource(input) {
    this.input = input;
    this.patch();
  }

  connect(output) {
    this.output = output;
    const { reverb, overdrive } = this;
    reverb.connect(overdrive);
    overdrive.connect(output);
    this.patch();
  }

  patch() {
    const { input, output, enabled, reverb, overdrive } = this;

    if (!input || !output) return;

    if (enabled.reverb) {
      try {
        input.disconnect(overdrive);
      } catch (e) {}
      input.connect(reverb);
    } else {
      try {
        input.disconnect(reverb);
      } catch (e) {}
      input.connect(overdrive);
    }
  }

  async setReverbFromFile(filepath) {
    const { reverb } = this;
    const response = await fetch(`impulses/${filepath}.ogg`);
    const audioData = await response.arrayBuffer();
    reverb.buffer = await context.decodeAudioData(audioData);
  }

  async setReverb(filepath) {
    if (!filepath) {
      this.enabled.reverb = false;
    } else {
      this.enabled.reverb = true;
      await this.setReverbFromFile(filepath);
    }
    this.patch();
  }
}
