import { Keyboard } from "./keyboard.js";

function laterThan(moment, tickData, timestamp) {
  for (let i = 0, e = moment.length; i < e; i++) {
    if (moment[i] > tickData[i]) return true;
  }
  return false;
}

function getTimeout(intervals, start, stop) {
  // measure in ms + quarter in ms
  let v1 = intervals[0] * start[0] + intervals[1] * (start[1] + start[2]);
  let v2 = intervals[0] * stop[0] + intervals[1] * (stop[1] + stop[2]);
  return v2 - v1;
}

class Recorder {
  constructor() {
    this.data = [];
    this.current = {};
    this.recording = false;
    this.playing = false;
    this.intervals = [];
    this.listeners = [];
  }

  addListener(l) {
    this.listeners.push(l);
  }

  removeListener(l) {
    const pos = this.listeners.findIndex((e) => e === l);
    this.listeners.splice(pos, 1);
  }

  tick(tickData, timestamp, quarterInterval) {
    this.tickData = tickData.slice();
    this.timestamp = timestamp;
    this.quarterInterval = quarterInterval;

    if (!this.playing) return;
    const events = this.getEvents();
    events.forEach((record) => {
      const { active } = Keyboard;
      // schedule the start based on quarter fraction
      setTimeout(() => {
        active.start(record.note, record.velocity);
        const timeout = getTimeout(this.intervals, record.start, record.stop);
        setTimeout(() => active.stop(record.note), timeout);
      }, quarterInterval * record.start[2]);
    });
  }

  getEvents() {
    const events = [];
    for (let i = this.head; i < this.data.length; i++) {
      const packet = this.data[i];
      if (laterThan(packet.start, this.tickData)) {
        return events;
      }
      events.push(packet);
      this.head = i + 1;
    }
    return events;
  }

  start() {
    this.recording = true;
  }

  stop() {
    Object.values(this.current).forEach((packet) => this.noteoff(packet.note));
    this.current = {};
    this.recording = false;
    this.playing = false;
    return this.data;
  }

  noteon(note, velocity) {
    const noteonTime = Date.now();

    if (!this.recording) return;

    // create a piano-roll entry
    //
    // TODO: do this in the piano roll based on event listening,
    // not in the recorder code itself. This should now need to
    // know anything about HTML/DOM elements.
    const record = document.createElement(`button`);

    const shift = (noteonTime - this.timestamp) / this.quarterInterval;
    const packet = {
      note,
      velocity,
      start: [...this.tickData, shift],
      record,
    };

    this.current[note] = packet;
    this.data.push(packet);
    this.listeners.forEach((l) => l.noteStarted(packet));

    record.setAttribute(`class`, `note`);
    record.setAttribute(`data-note`, note);
    record.setAttribute(`data-velocity`, velocity);
    record.setAttribute(`data-start`, packet.start.join(`,`));
    record.style.setProperty(`--l`, `${100 * shift}%`);
  }

  noteoff(note) {
    const noteoffTime = Date.now();

    const packet = this.current[note];
    if (!packet) return;

    const shift = (noteoffTime - this.timestamp) / this.quarterInterval;
    packet.stop = [...this.tickData, shift];
    packet.record.setAttribute(`data-stop`, packet.stop.join(`,`));
    if (this.recording) this.listeners.forEach((l) => l.noteStopped(packet));
    delete this.current[note];
  }

  playback(intervals) {
    this.head = 0;
    this.playing = true;
    this.intervals = intervals;
    console.log(intervals);
  }

  clear() {
    const cached = this.data.slice();
    this.data = [];
    return cached;
  }
}

const singleton = new Recorder();

export { Recorder, singleton as recorder };
