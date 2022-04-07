import { settings } from "../settings.js";
import { find, create } from "./utils.js";
import { Keyboard, getColor } from "../midi/keyboard.js";
import { midiNotePlay, midiNoteStop } from "../midi/midi.js";
import { recorder } from "../midi/recorder.js";

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
    console.log(x, y, note, m, q, f);
    const packet = recorder.recordEvent(note, 64, [m, q, f]);
    const stop = [m, q + 1, f];
    if (stop[1] === settings.timeSignature[0]) {
      stop[0]++;
      stop[1] = 0;
    }
    recorder.recordEventStop(packet, stop);
  });
}

export function buildRecord(note, velocity, start, shift) {
  const record = create(`button`, {
    class: `note`,
    "data-note": note,
    "data-velocity": velocity,
    "data-start": start.join(`,`),
  });

  let packet = { note };

  record.setNote = (note) => {
    packet.note = note;
    record.dataset.note = note;
    record.style.setProperty(`--t`, `calc(${127 - note} * var(--row-height))`);
  };

  record.setPacket = (p) => (packet = p);

  record.style.setProperty(`--l`, `${100 * shift}%`);

  record.addEventListener(`mousedown`, (evt) => {
    if (evt.button !== 0) return;
    record.classList.add(`playing`);
    Keyboard.active.start(packet.note, packet.velocity);
  });

  document.addEventListener(`mouseup`, (evt) => {
    if (evt.button !== 0) return;
    record.classList.remove(`playing`);
    Keyboard.active.stop(packet.note);
  });

  // move record around on click-drag
  let down = false;

  const getxy = (evt) => {
    let x = evt.offsetX;
    let y = evt.offsetY;
    if (evt.target === record) {
      x += record.offsetLeft;
      y += record.offsetTop;
    }
    return { x, y };
  };

  record.addEventListener(`mousedown`, (evt) => {
    const { x } = getxy(evt);
    down = {
      x: x,
      start: packet.start.slice(),
      stop: packet.stop.slice(),
    };
  });

  document.addEventListener(`mouseup`, () => {
    down = false;
    Keyboard.active.stop(packet.note);
  });

  roll.addEventListener(`mousemove`, (evt) => {
    if (!down) return;

    const { x, y } = getxy(evt);

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
    // turned on, we need to calculate the new end position as
    // "the new start in pixels, plus the note length, in pixels".
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
