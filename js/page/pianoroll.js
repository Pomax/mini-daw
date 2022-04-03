import { find, create } from "./utils.js";
import { Keyboard, getColor } from "../midi/keyboard.js";
import { midiNotePlay, midiNoteStop } from "../midi/midi.js";

export function setup() {
  const parent = document.querySelector(`.pianoroll`);

  // pianoroll rows
  for (let i = 128; i > 0; i--) {
    const row = create(`tr`);
    const color = getColor(i);
    row.classList.add(`n${i}`, color);
    const key = create(`th`);
    key.classList.add(`key`, `midi${i}`);
    row.appendChild(key);
    parent.appendChild(row);
  }

  document.addEventListener(`midi:note:play`, ({ detail }) => {
    const key = find(`tr.n${detail.note} th`);
    key.classList.add(`highlight`);
  });

  document.addEventListener(`midi:note:stop`, ({ detail }) => {
    const key = find(`tr.n${detail.note} th`);
    key.classList.remove(`highlight`);
  });
}

export function buildRecord(note, velocity, start, shift) {
  const record = create(`button`, {
    class: `note`,
    "data-note": note,
    "data-velocity": velocity,
    "data-start": start.join(`,`),
  });
  record.style.setProperty(`--l`, `${100 * shift}%`);
  const data = record.dataset;
  record.addEventListener(`mousedown`, () => {
    record.classList.add(`playing`);
    Keyboard.active.start(note, velocity);
  });
  record.addEventListener(`mouseup`, () => {
    record.classList.remove(`playing`);
    Keyboard.active.stop(note);
  });
  return record;
}
