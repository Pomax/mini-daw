import { settings } from "../settings.js";
import { find, create } from "./utils.js";
import { Keyboard, getColor } from "../midi/keyboard.js";
import { midiNotePlay, midiNoteStop } from "../midi/midi.js";

function generateRollBackground(qs, w, h) {
  const cvs = create(`canvas`);
  cvs.width = w;
  cvs.height = h;
  const ctx = cvs.getContext(`2d`);
  const styles = {
    main: `#e0e0e0`,
    darker: `#d2d2d2`,
    lighter: `#efefef`,
    border: `#4144`,
  };

  ctx.resetTransform();

  const rect = (color, x, y, w, h) => {
    ctx.strokeStyle = ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
  };

  ctx.translate(-0.5, -0.5);
  rect(styles.main, 0, 0, w, h);
  rect(styles.lighter, w / 2, 0, w / 2, h / 2);
  rect(styles.darker, 0, h / 2, w / 2, h / 2);

  ctx.resetTransform();
  ctx.translate(0.5, 0.5);
  for (let i = 0, q = 2 * qs; i < q; i++) {
    ctx.strokeStyle = ctx.fillStyle = styles.border;
    ctx.fillRect((i * w) / q, 0, 1, h);
  }

  return cvs.toDataURL();
}

export function setup() {
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

  const roll = find(`.pianoroll-container .pianoroll .roll`);
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

  roll.addEventListener(`click`, (evt) => {
    let x = evt.offsetX;
    let y = evt.offsetY;
    let note = (128 - y / settings.barHeightInPixels) | 0;
    let q = (x / settings.quarterInPixels) | 0;
    let m = (q / settings.timeSignature[0]) | 0;
    q -= m * settings.timeSignature[0];
    console.log(x, y, note, m, q);
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
  record.addEventListener(`mousedown`, (evt) => {
    if (evt.button !== 0) return;
    record.classList.add(`playing`);
    Keyboard.active.start(note, velocity);
  });
  record.addEventListener(`mouseup`, (evt) => {
    record.classList.remove(`playing`);
    Keyboard.active.stop(note);
  });
  return record;
}
