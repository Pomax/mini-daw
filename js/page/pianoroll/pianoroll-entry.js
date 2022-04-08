import { Keyboard } from "../../midi/keyboard.js";

class PianorollEntry extends HTMLButtonElement {
  constructor() {
    super();
    this.packet = {};
    this.down = false;
  }

  connectedCallback() {
    this.classList.add(`note`);
    this.setupListeners();
  }

  setupListeners() {
    this.addEventListener(`mousedown`, (evt) => {
      if (evt.button !== 0) return;
      this.classList.add(`playing`);
      const { packet } = this;
      Keyboard.active.start(packet.note, packet.velocity);
    });

    document.addEventListener(`mouseup`, (evt) => {
      if (evt.button !== 0) return;
      this.classList.remove(`playing`);
      Keyboard.active.stop(this.packet.note);
    });

    this.addEventListener(`mousedown`, (evt) => {
      const { x } = this.getXY(evt);
      this.down = {
        x: x,
        start: this.packet.start.slice(),
        stop: this.packet.stop.slice(),
      };
    });

    document.addEventListener(`mouseup`, () => {
      this.down = false;
      Keyboard.active.stop(this.packet.note);
    });
  }

  setOffset(offset) {
    this.style.setProperty(`--l`, `${offset}px`);
  }

  setNote(note) {
    this.packet.note = note;
    this.dataset.note = note;
    this.style.setProperty(`--t`, `calc(${127 - note} * var(--row-height))`);
  }

  setVelocity(velocity) {
    this.dataset.velocity = velocity;
    this.style.setProperty(`--v`, velocity);
  }

  setStart(start) {
    this.dataset.start = start;
  }

  setLength(length) {
    this.style.setProperty(`--w`, `${length}px`);
  }

  setPacket(p) {
    this.packet = p;
  }

  getXY(evt) {
    let x = evt.offsetX;
    let y = evt.offsetY;
    if (evt.target === this) {
      x += this.offsetLeft;
      y += this.offsetTop;
    }
    return { x, y };
  }
}

customElements.define(`pianoroll-entry`, PianorollEntry, { extends: `button` });

export { PianorollEntry };
