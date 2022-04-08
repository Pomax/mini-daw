import { EffectRack } from "./effect-rack.js";
import { EQ } from "./eq.js";

// master audio context. We only want to build one, not constantly build new ones.
const context = new AudioContext();

// compressor
const compressor = context.createDynamicsCompressor();
compressor.threshold.value = -6;
compressor.knee.value = 40;
compressor.ratio.value = 12;
compressor.attack.value = 0.1;
compressor.release.value = 0.1;
compressor.connect(context.destination);

// 3-band equalization
const eq = new EQ();
const { EQcontrols } = eq;
eq.connect(compressor);

// effects like reverb and distortion
const effectRack = new EffectRack();
const setReverb = (path) => effectRack.setReverb(path);
const setOverdrive = (value) => effectRack.setOverdrive(parseFloat(value));
effectRack.connect(eq.input);

// master volume control
const master = context.createGain();
master.gain.value = 1.0;
effectRack.setAudioSource(master);

export { context, master, setReverb, setOverdrive, EQcontrols };
