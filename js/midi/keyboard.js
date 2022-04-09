import { AudioGenerator } from "../audio/audio-generator.js";
import { getFrequency } from "../audio/get-frequency.js";
import { router } from "./router.js";
import { recorder } from "./recorder.js";

const voices = 12;
const pitchDistance = 2; // in semi-tones
const lfoFrequency = 4; // in Hz
const generator = new AudioGenerator(voices, lfoFrequency);

export function getColor(note) {
  return [1, 3, 6, 8, 10].indexOf(note % 12) > -1 ? `black` : `white`;
}

/**
 * individual key class
 */
class Key {
  oscillator;
  pressed = false;

  constructor(note) {
    this.note = note;
    this.frequency = getFrequency(note);
    this.e = this.createDOMnode(note);

    // note data
    router.addListener(this, `noteon`);
    router.addListener(this, `noteoff`);

    // pitch bend information
    this.lower = getFrequency(note - pitchDistance);
    this.higher = getFrequency(note + pitchDistance);
    router.addListener(this, `pitch`);
  }

  createDOMnode(note) {
    let e = document.createElement(`button`);
    e.dataset.key = note % 12;
    e.dataset.note = note;
    e.classList.add(getColor(note), `key`);
    if (note < 21 || note > 108) e.classList.add(`uncommon`);
    const inputPress = (evt) =>
      this.pressed ? undefined : evt.buttons ? this.start(64) : undefined;
    const inputRelease = (evt) => (this.pressed ? this.stop() : undefined);
    const passive = { passive: true };
    e.addEventListener(`mousedown`, inputPress, passive);
    e.addEventListener(`mouseover`, inputPress, passive);
    e.addEventListener(`touchstart`, inputPress, passive);
    document.addEventListener(`mouseup`, inputRelease, passive);
    document.addEventListener(`touchend`, inputRelease, passive);
    return e;
  }

  getDOMnode() {
    return this.e;
  }

  onNoteOn(note, velocity) {
    if (note === this.note) {
      this.start(velocity);
    }
  }

  start(velocity) {
    if (this.oscillator) return;

    this.pressed = true;
    this.e.classList.add(`pressed`);
    this.oscillator = generator.getOscillator(this.frequency);
    this.oscillator.start(velocity / 127);
    recorder.noteon(this.note, velocity);
    document.dispatchEvent(
      new CustomEvent(`midi:note:play`, { detail: { note: this.note } })
    );
  }

  onNoteOff(note) {
    if (note === this.note) {
      this.stop();
    }
  }

  stop() {
    if (!this.oscillator) return;

    this.pressed = false;
    this.e.classList.remove(`pressed`);
    this.oscillator = this.oscillator.stop();
    recorder.noteoff(this.note);
    document.dispatchEvent(
      new CustomEvent(`midi:note:stop`, { detail: { note: this.note } })
    );
  }

  onPitch(data) {
    const ratio = data / 8192;
    if (ratio < 0) {
      return this.oscillator?.tuneTowards(this.lower, -ratio);
    }
    this.oscillator?.tuneTowards(this.higher, ratio);
  }
}

/**
 * The full keyboard, but you only get to see 24 keys at a time.
 */
class Keyboard {
  constructor(makeActive = false) {
    const MIDI_KEYS = [...Array(128)].map((_, i) => i);
    this.keys = MIDI_KEYS.map((note) => new Key(note));
    this.keyNodes = this.keys.map((key) => key.getDOMnode());
    this.setupComputerKeyboard();
    if (makeActive || !Keyboard.active) Keyboard.active = this;
  }

  setupComputerKeyboard() {
    // computer keyboard mappings for "playing the keyboard"
    this.keyMapping = {};
    const getCodes = (keys, start) =>
      Object.fromEntries(keys.split(``).map((c, i) => [c, i + start]));

    // upper octave and a half
    Object.assign(this.keyMapping, getCodes(`q2w3er5t6y7ui9o0p[=]`, 60));

    // lower octave
    Object.assign(this.keyMapping, getCodes(`zsxdcvgbhnjm`, 48));

    // key event handling
    this.preprocessDown = (evt) => {
      if (evt.repeat) return;

      // are there any modifier keys active?
      const { shift, altKey, ctrlKey, metaKey } = evt;
      const modified = shift || altKey || ctrlKey || metaKey;

      this.handleKeyDown(
        evt.key,
        modified ? { shift, altKey, ctrlKey, metaKey } : undefined
      );
    };

    document.addEventListener(`keydown`, this.preprocessDown);

    this.preprocessUp = (evt) => {
      const { shift, altKey, ctrlKey, metaKey } = evt;
      const modified = shift || altKey || ctrlKey || metaKey;
      this.handleKeyUp(
        evt.key,
        modified ? { shift, altKey, ctrlKey, metaKey } : undefined
      );
    };

    document.addEventListener(`keyup`, this.preprocessUp);
  }

  getKeyNodes() {
    return this.keyNodes;
  }

  handleKeyDown(key, modifiers) {
    if (key === `<`) return this.changeOctave(-1);
    if (key === `>`) return this.changeOctave(1);
    if (modifiers) return;
    const code = this.keyMapping[key];
    if (code === undefined) return;
    this.start(code, 63);
  }

  start(code, velocity) {
    if (code < 0 || code > 127) return;
    this.keys[code].start(velocity);
  }

  handleKeyUp(key, modifiers) {
    if (modifiers) return;
    const code = this.keyMapping[key];
    if (code === undefined) return;
    this.stop(code);
  }

  stop(code) {
    if (code < 0 || code > 127) return;
    this.keys[code].stop();
  }

  changeOctave(shift) {
    const delta = shift * 12;
    Object.keys(this.keyMapping).forEach(
      (key) => (this.keyMapping[key] += delta)
    );
  }

  beep(note) {
    this.start(note, 64);
    setTimeout(() => this.stop(note), 200);
  }
}

export { Keyboard, generator };
