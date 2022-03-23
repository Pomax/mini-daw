import { settings } from "../settings.js";
import { context, EQcontrols } from "../audio/audio-context.js";
import { IMPULSES } from "../../impulses/impulses.js";
import { Keyboard, getColor } from "../midi/keyboard.js";
import { recorder } from "../midi/recorder.js";
import { create } from "./utils.js";

// We want to make this user-controllable, of course
let timeSignature = settings.timeSignature;

/**
 *
 * @param {*} n
 */
export function addMeasure(n = 1) {
  while (n--) {
    document.querySelectorAll(`.pianoroll tr`).forEach((row) => {
      const measure = create(`td`);
      measure.classList.add(`m`);
      const inner = create(`div`);
      inner.classList.add(`flex`);
      measure.appendChild(inner);
      for (let i = 0; i < timeSignature[0]; i++) {
        const q = create(`span`);
        q.classList.add(`q`);
        inner.appendChild(q);
      }
      row.appendChild(measure);
    });
  }
}

/**
 *
 */
function buildImpulseSelector() {
  const reverb = document.getElementById(`reverb`);
  reverb.innerHTML = ``;
  reverb.append(create(`option`, { value: `` }, `none`));
  IMPULSES.forEach((name) => {
    reverb.append(create(`option`, { value: name }, name));
  });
}

/**
 *
 * @param {*} tickData
 * @param {*} flips
 */
export async function updatePageUI(tickData, flips, midi24) {
  const q = tickData[1];

  document
    .querySelectorAll(`.highlight`)
    .forEach((e) => e.classList.remove(`highlight`));

  let last, f;
  tickData.forEach((v, i) => {
    if (i === 0) return;
    const n = i > 1 ? `${q * i + v + 1}` : `${(v % 16) + 1}`;
    const qs = `.d${i} *:nth-child(${n})`;
    document.querySelector(qs)?.classList.add(`highlight`);
    last = v;
    f = i;
  });

  if (flips[1]) {
    document
      .querySelectorAll(`path.active`)
      .forEach((e) => e.classList.remove(`active`));
    document
      .querySelectorAll(`path.q${q}`)
      .forEach((e) => e.classList.add(`active`));
  }

  const mCount = document.querySelectorAll(`.pianoroll tr:first-child th ~ .m`).length;
  const threshold = mCount - startingMeasureCount;
  if (flips[0] && tickData[0] > threshold) addMeasure();
}

let prevMidi24 = -1;

/**
 *
 * @param {*} tickData
 * @param {*} midi24
 */
export async function updateScrubber(tickData, midi24) {
  if (prevMidi24 !== midi24) {
    // Update the scrubber position, but only if the current midi24 value
    // (that is, the smallest division of a quarter note that MIDI devices
    // count off when running a MIDI clock) is different from the one we
    // saw on the previous tick. As typical q/24 values are in the tens of
    // milliseconds range, we don't want to run code that won't do anything
    // 90% or even 95% of the time.
    const scrubber = document.querySelector(`.pianoroll-container .scrubber`);
    const qs = [
      `.pianoroll`,
      `tr:first-child`,
      `th ~ .m:nth-child(${tickData[0] + 2})`, // that th throws everything off =()
      `.q:nth-child(${tickData[1] + 1})`,
    ].join(` `);
    const newPos = document.querySelector(qs);
    newPos.appendChild(scrubber);
    scrubber.style.setProperty(`--l`, `${(100 * midi24) / 24}%`);
    prevMidi24 = midi24;
  }
}

/**
 *
 */
function buildKeyboard() {
  const keyboard = new Keyboard();
  const kdiv = document.querySelector(`div.keyboard`);
  const white = kdiv.querySelector(`.white`);
  white.innerHTML = ``;
  const black = kdiv.querySelector(`.black`);
  black.innerHTML = ``;
  keyboard.keyNodes.forEach((k, i) => {
    if (k.classList.contains(`black`)) {
      black.append(k);
    } else {
      white.append(k);
    }
  });
}

/**
 *
 */
function buildEQcontrols() {
  const eq = document.querySelector(`span.eq`);
  eq.textContent = ``;
  EQcontrols.forEach((e) => {
    const l = create(`label`);
    l.textContent = e.getAttribute(`label`);
    eq.append(l, e);
  });
}

/**
 *
 */
function setupRecorder() {
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
    const key = document.querySelector(`tr.n${detail.note} th`);
    key.classList.add(`highlight`);
  });

  document.addEventListener(`midi:note:stop`, ({ detail }) => {
    const key = document.querySelector(`tr.n${detail.note} th`);
    key.classList.remove(`highlight`);
  });

  recorder.addListener({
    noteStarted: ({ note, velocity, start, e }) => {
      const f = start.length - 1;
      const [m, q, ..._] = start;
      const quarter = document.querySelector(
        `.pianoroll tr.n${note} .m:nth-child(${m + 2}) .q:nth-child(${q + 1})`
      );
      quarter.appendChild(e);
      e.style.left = `${(100 * start[f]) / f}%`;
      // e.addEventListener(`mousedown`, () => beeps.get(note).start(velocity));
      // document.addEventListener(`mouseup`, () => beeps.get(note).stop());
    },

    noteStopped: ({ note, start, stop, e }) => {
      const f = start.length - 1;
      const [m1, q1, ..._] = start;
      const [m2, q2, ...__] = stop;
      const d1 = start[f];
      const d2 = stop[f];
      const v = (d2 - d1) / f + (q2 - q1) + timeSignature[0] * (m2 - m1);
      e.style.width = `${100 * v}%`;
    },
  });
}

let startingMeasureCount = 0;

export function bootstrapPianoRoll() {
  const p = document.querySelector(`.pianoroll-container`);
  const t = document.querySelector(`.pianoroll`);
  while (t.clientWidth < p.clientWidth) {
    addMeasure();
    startingMeasureCount++;
  }
}

/**
 *
 */
export function listenForInitialPageInteraction() {
  const initialPageInteraction = (evt) => {
    console.log(`resuming context`);
    document.removeEventListener(`mousedown`, initialPageInteraction, true);
    document.removeEventListener(`keydown`, initialPageInteraction, true);
    context.resume();
  };

  document.addEventListener(`mousedown`, initialPageInteraction, true);
  document.addEventListener(`keydown`, initialPageInteraction, true);
}

export function setupUI() {
  buildKeyboard();
  buildEQcontrols();
  setupRecorder();
  buildImpulseSelector();
}
