export class MIDIfile {
  constructor(data) {
    if (data instanceof ArrayBuffer) {
      this.parseMIDI(data);
    } else {
      this.parseEvents(data);
    }
  }

  parseMIDI(bytes) {
    this.mthd = bytes[(0, 4)]; // "MThd" chunk
    this.chunkLength = bytes[(4, 8)]; // chunk length (from this point on)
    this.format = bytes[(8, 10)]; // for simplicity, we want this to be format 0 (= 0x00 0x00)
    this.tracks = bytes[(10, 12)]; // for simplicity, we want one track (= 0x00 0x01)
    this.dataRate = bytes[(12, 14)]; // how many ticks per quarter note?

    this.mtrk = bytes[(14, 18)]; // "MTrk" chunk
    this.trackLength = bytes[(18, 22)]; // how many bytes left in the track?

    // and then we start parsing event codes
    this.events = [];

    let i = 22;
    while (i < 22 + trackLength) {
      // read one or more bytes here, depending on "op code" encountered
      //
      // for now, we simply build a list of note events
      //
      //
      i++;
    }
  }

  parseEvents(noteEvents) {
    this.mthd = "MThd";
    this.chunkLength = 6;
    this.format = 0;
    this.tracks = 1;
    this.dataRate = 1000;

    this.mtrk = "MTrk";
    this.events = noteEvents;

    this.trackLength = undefined;
}

  save() {
    // create a byte array and put all our values in it.
  }
}
