import { settings } from "../settings.js";
import { context, EQcontrols } from "../audio/audio-context.js";
import { IMPULSES } from "../../impulses/impulses.js";
import { Keyboard, generator } from "../midi/keyboard.js";
import { recorder } from "../midi/recorder.js";
import { create, find } from "./utils.js";
import * as pianoroll from "./pianoroll/pianoroll.js";

const scrubber = document.querySelector(`.pianoroll-container .scrubber`);

// We want to make this user-controllable, of course
let timeSignature = settings.timeSignature;

/**
 *
 * @param {*} n
 */
export async function addMeasure(n = 1) {
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
export async function updatePageUI(tickData, flips) {
  //startTheWheel(tickData);
  runTicker(tickData);
}

function runTicker(tickData) {
  const [m, q] = tickData;

  find(`.ticker .m`).textContent = `${m | 0}`.padStart(3, `0`);
  find(`.ticker .q`).textContent = `${q | 0}`.padStart(2, `0`);

  const qint = settings.intervalValues[1];
  const qNow = Date.now();

  (function updateTicker() {
    const diff = Date.now() - qNow;
    const f = diff / qint;
    if (f >= 1) return;
    find(`.ticker .f`).textContent = `${(f * 1000) | 0}`.padStart(4, `0`);
    setTimeout(updateTicker, 30);
  })();
}

// helper: round a value to its respective (floored) step
function step(val, total, steps) {
  const slice = total / steps;
  const f = (val / slice) | 0;
  return f * slice;
}

/**
 * ...
 * @param {*} q
 */
function startTheWheel([m, q]) {
  const qint = settings.intervalValues[1];
  const qNow = Date.now();
  const circles = [...new Array(settings.divisions)].map((_, i) =>
    find(`g.d${i + 1}`)
  );

  // update the wheel for the duration of the quarter
  (function updateWheel() {
    const diff = Date.now() - qNow;
    const f = diff / qint;
    if (f >= 1) return;

    circles.forEach((circle, i) => {
      const angle = q * 90 + step(f * 90, 90, i + 1);
      circle.style.setProperty(`--angle`, `${angle}deg`);
    });

    setTimeout(updateWheel, 30);
  })();
}

/**
 *
 * @param {*} tickData
 */
export async function updateScrubber(tickData) {
  const [m, q] = tickData;
  const qint = settings.intervalValues[1];
  const qNow = Date.now();

  const container = find(`.pianoroll-container`);

  // update the scrubber for the duration of the quarter
  (function updateScrubber() {
    const diff = Date.now() - qNow;
    const f = diff / qint;
    if (f >= 1) return;
    const left = pianoroll.toPixels(m, q, f);
    scrubber.style.setProperty(`--l`, `${left}px`);

    const cw2 = scrubber.parentNode.parentNode.clientWidth / 2;
    if (left > cw2) {
      container.scroll(left - cw2, container.scrollTop);
    } else {
      container.scroll(0, container.scrollTop);
    }

    requestAnimationFrame(updateScrubber);
  })();
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

function setupWavePicker() {
  const w = find(`#wave`);
  w.addEventListener(`change`, (evt) => {
    generator.setWaveForm(w.value);
  });
}

/**
 *
 */
function setupADSR() {
  const a = find(`#attack`);
  const d = find(`#decay`);
  const s = find(`#sustain`);
  const r = find(`#release`);
  const update = () =>
    generator.setADSR(+a.value, +d.value, +s.value, +r.value);
  [a, d, s, r].forEach((e) => e.addEventListener(`input`, update));
  update();
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
  const listener = {
    noteStarted: (packet) => {
      listener.noteUpdated(packet);
    },

    noteStopped: (packet) => {
      listener.noteUpdated(packet);
    },

    noteUpdated: ({ note, velocity, start, stop, record }) => {
      record.setNote(note);
      record.setVelocity(velocity);

      const [m1, q1, f1] = start;
      if (!stop) {
        stop = [m1, q1 + 1, f1];
        if (stop[1] === settings.timeSignature[0]) {
          stop = [m1 + 1, 0, f1];
        }
      }
      const [m2, q2, f2] = stop;
      const offset = pianoroll.toPixels(m1, q1, f1);
      const w = pianoroll.toPixels(m2 - m1, q2 - q1, f2 - f1);

      record.setOffset(offset);
      record.setLength(w);

      find(`.pianoroll-container .pianoroll .roll`).appendChild(record);
    },
  };

  recorder.addListener(listener);
}

export function bootstrapPianoRoll() {
  pianoroll.setup();
}

/**
 *
 */
export function listenForInitialPageInteraction() {
  const initialPageInteraction = (evt) => {
    // console.log(`resuming context`);
    document.removeEventListener(`mousedown`, initialPageInteraction, true);
    document.removeEventListener(`keydown`, initialPageInteraction, true);
    context.resume();
  };

  document.addEventListener(`mousedown`, initialPageInteraction, true);
  document.addEventListener(`keydown`, initialPageInteraction, true);
}

export function setupUI() {
  buildKeyboard();
  setupWavePicker();
  setupADSR();
  buildEQcontrols();
  setupRecorder();
  buildImpulseSelector();
}
