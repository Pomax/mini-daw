import { settings } from "./settings.js";
import { buildCountingWheel } from "./page/metronome.js";
import { getDifference } from "./page/utils.js";
import { listenForUser } from "./page/event-handling.js";
import {
  bootstrapPianoRoll,
  listenForInitialPageInteraction,
  updatePageUI,
  updateScrubber,
  setupUI,
} from "./page/page-ui.js";
import { recorder } from "./midi/recorder.js";
import { AudioGenerator } from "./audio/audio-generator.js";
import { getFrequency } from "./audio/get-frequency.js";

const beep = new AudioGenerator();
const play = (note, millisecondsInTheFuture = 0) => {
  const Hz = getFrequency(note);
  const osc = beep.getOscillator(Hz);
  osc.play(settings.beepDuration, 64, millisecondsInTheFuture / 1000);
};

let prevTickData;
const counter = new Worker("js/counter/bmp-counter.js", { type: "module" });

counter.onmessage = async (e) => {
  const { tickData, timestamp, intervals } = e.data;

  if (intervals) {
    // special bootstrapping message in response to a "bpm=..., divisions=..." instruction
    buildCountingWheel(
      intervals.length,
      (d) => (settings.activeDivision = d),
      settings.activeDivision
    );
    settings.intervalValues = intervals;
    prevTickData = intervals.map(() => -1);
    bootstrapPianoRoll();
    return;
  }

  if (tickData) {
    // we should be on a new quarter now, but we might also be on a new measure
    const m = tickData[0] !== prevTickData[0];
    const q = tickData[1] !== prevTickData[1];

    if (m) play(84);
    else if (q) play(67);

    // schedule the more fine-grain ticks using the audio api
    const qint = settings.intervalValues[1];
    const div = settings.activeDivision;
    for (let i = 0, e = div; i < e; i++) {
      const future = (qint * i) / e;
      play(72, future);
    }

    recorder.tick(tickData, timestamp);
    updatePageUI(tickData, [m, q]);
    updateScrubber(tickData, qint);

    prevTickData = tickData;
  }
};

/**
 *
 * @param {*} tickData
 * @returns
 */
function updateTickData(tickData) {
  console.log(tickData);
  const flips = getDifference(tickData, prevTickData);
  const pos = flips.findIndex((v) => v);
  if (pos === -1) return;

  prevTickData = tickData;

  // let's beep some beeps!
  if (flips[0]) play(84);
  else if (flips[1]) play(67);
  if (flips[settings.activeDivision]) play(72);

  return flips;
}

// ========= startup bootstrap =========

setupUI();
listenForUser(counter);
listenForInitialPageInteraction();
counter.postMessage(settings);
