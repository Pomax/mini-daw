import { settings } from "../../settings.js";
import { find, create } from "../utils.js";
import { Keyboard, getColor } from "../../midi/keyboard.js";
import { recorder } from "../../midi/recorder.js";
import { generateRollBackground } from "./pianoroll-bg.js";
import { midiNotePlay, midiNoteStop } from "../../midi/midi.js";

export function toPixels(m, q, f) {
  return (m * settings.timeSignature[0] + q + f) * settings.quarterInPixels;
}

// `quantize` is a a fraction-of-a-quarter value
export function toQuarter(pixels, quantize = 1) {
  let f = pixels / settings.quarterInPixels;
  let q = f | 0;
  let m = (q / settings.timeSignature[0]) | 0;
  q -= m * settings.timeSignature[0];
  f = f % 1;
  let p = (f / quantize) | 0;
  f = p * quantize;
  return [m, q, f];
}

let roll;

export function setup() {
  roll = find(`.pianoroll-container .pianoroll .roll`);

  const qs = settings.timeSignature[0];
  const qlen = settings.quarterInPixels;
  const w = qlen * qs * 2;
  const h = settings.barHeightInPixels * 2;
  find(`.pianoroll-container`).style.setProperty(
    `--row-height`,
    `${settings.barHeightInPixels}px`
  );
  const proll = find(`.pianoroll-container .pianoroll`);
  proll.style.height = `${64 * h}px`;

  roll.style.height = `${64 * h}px`;
  roll.style.background = `url(${generateRollBackground(qs, w, h)})`;
  roll.style.backgroundSize = `${w}px ${h}px`;

  // pianoroll keys
  const pkeys = find(`.pianoroll-container .keys`);

  for (let i = 127; i >= 0; i--) {
    const key = create(`div`);
    key.classList.add(getColor(i), `key`, `midi${i}`);
    key.style.height = `${settings.barHeightInPixels}px`;
    pkeys.appendChild(key);
  }

  const note = (n) => `.pianoroll-container .keys .key.midi${n}`;

  document.addEventListener(`midi:note:play`, ({ detail }) => {
    const key = find(note(detail.note));
    key.classList.add(`highlight`);
  });

  document.addEventListener(`midi:note:stop`, ({ detail }) => {
    const key = find(note(detail.note));
    key.classList.remove(`highlight`);
  });

  // create note events by clicking on the piano roll
  roll.addEventListener(`mousedown`, (evt) => {
    if (evt.target !== roll) return;

    let x = evt.offsetX;
    let y = evt.offsetY;
    let note = (128 - y / settings.barHeightInPixels) | 0;
    let f = x / settings.quarterInPixels;
    let q = f | 0;
    let m = (q / settings.timeSignature[0]) | 0;
    q -= m * settings.timeSignature[0];
    f %= 1;
    const packet = recorder.recordEvent(note, 64, [m, q, f]);
    const stop = [m, q + 1, f];
    if (stop[1] === settings.timeSignature[0]) {
      stop[0]++;
      stop[1] = 0;
    }
    recorder.recordEventStop(packet, stop);
  });
}

export function buildRecord(note, velocity, start) {
  const record = create(`pianoroll-entry`);

  record.setNote(note);
  record.setVelocity(velocity);
  record.setStart(start);

  roll.addEventListener(`mousemove`, (evt) => {
    if (!record.down) return;

    const { down, packet } = record;
    const { x, y } = record.getXY(evt);

    // up/down movement
    const note = (128 - y / settings.barHeightInPixels) | 0;

    if (note !== packet.note) {
      Keyboard.active.stop(packet.note);
      record.setNote(note);
      Keyboard.active.start(packet.note, packet.velocity);
    }

    // left/right movement
    //
    // Note: in order to preserve the note length with quantization
    // turned on, we need to calculate the new end position as "the
    // new start in pixels, plus the original note length, in pixels".
    //
    const diff = x - down.x;
    const quantize = 1 / settings.divisions; // TODO: make this user-controllable separately
    const spix = toPixels(...down.start);
    const epix = toPixels(...down.stop);
    const len = epix - spix;
    const newstart = toQuarter(spix + diff, quantize);
    const nspix = toPixels(...newstart);
    const newstop = toQuarter(nspix + len, quantize);
    recorder.updateEvent(packet, { start: newstart, stop: newstop });
  });

  return record;
}
