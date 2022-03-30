/**
 * This must be loaded as a web worker, and will post an object
 * whenever any value ticks over, of the form:
 *
 *   {
 *     tickData: [<measure count>, <quarter count>, ...]
 *   }
 *
 * The tick data array is at least two elements long, including
 * the current measure and quarter note, with subsequent elements
 * representing fractions of a quarter note. tickData[2] represents
 * half-divisions of the quarter note (i.e. eights), tickData[3]
 * represents thirds-divisions of the quarter note (i.e. eight
 * triplets), tickData[4] represents fourths-divisions of the
 * quarter note (i.e. sixteenth notes), and so on. Also note that
 * there is no "selection" mechanism: if you need 32nd note ticks,
 * `division` must be set to a value 8 or higher, and tickData will
 * include all quarter divisions up to 32nd notes.
 *
 * This counter accepts the following messages:
 *
 *    {
 *      bpm: <number>,
 *      division: <number>
 *    }
 *
 *  which is followed by a postMessage response of the form:
 *
 *    {
 *      intervals: [
 *        measure length in ms,
 *        quarter length in ms,
 *        quarter length in ms / 2,
 *            "    / 3,
 *        " / 4,
 *         ...
 *      ]
 *    }
 *
 *  Set the BPM and how many quarter-subdivisions should be tracked.
 *  Note: this message will currently stop the counter, rather than
 *  updating it in place. This will change to updating in place in
 *  the future.
 *
 *    { start: <truthy> }
 *
 *  Reset and start the counter.
 *
 *    { stop: <truthy> }
 *
 *  Stop the counter.
 */

import { markStart, setBPM, tick } from "./count.js";

let intervalTimer,
  lastTickData = [...Array(32)].map(() => -1);

function tryIncrement() {
  const now = performance.now();
  const tickData = tick(now);

  if (tickData[1] !== lastTickData[1]) {
    lastTickData = tickData.slice();
    postMessage({ tickData, timestamp: Date.now() });
  }
}

onmessage = async (e) => {
  const { start, stop, bpm, divisions } = e.data;

  if (bpm) {
    const { intervals } = setBPM(bpm, divisions);
    postMessage({ intervals });
  }

  if (start) {
    markStart();
    intervalTimer = setInterval(tryIncrement, 5);
  }

  if (stop) clearInterval(intervalTimer);
};
