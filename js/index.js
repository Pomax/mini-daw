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
import { play } from "./audio/audio-generator.js";
import { recorder } from "./midi/recorder.js";

let prevTickData;
const counter = new Worker("js/counter/bmp-counter.js");
counter.onmessage = async (e) => {
  const { tickData, midi24, intervals, ticks, bad } = e.data;

  if (intervals) {
    // special bootstrapping message in response to a "bpm=..., divisions=..." instruction
    buildCountingWheel(
      intervals.length,
      (d) => (settings.activeDivision = d),
      settings.activeDivision
    );
    prevTickData = intervals.map(() => -1);
    prevTickData[0] = -1;
    settings.intervalValues = intervals;
    bootstrapPianoRoll();
    return;
  }

  if (ticks) {
    // special "how many ticks happened?" message in response to a "stop" instruction
    document.querySelector(
      `span.tick-count`
    ).textContent = `${ticks} (${bad} bad)`;
    return;
  }

  // Which parts of the measure (if any) just ticked over?
  const flips = updateTickData(tickData);
  if (flips !== undefined) {
    recorder.tick(tickData, flips);
    updatePageUI(tickData, flips);
  }

  updateScrubber(tickData, midi24);
};

/**
 *
 * @param {*} tickData
 * @returns
 */
function updateTickData(tickData) {
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
