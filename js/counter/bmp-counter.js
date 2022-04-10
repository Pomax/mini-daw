let startTime,
  tickData,
  prevTickData,
  BPM,
  intervals,
  intervalTimer,
  lastTickData = [...Array(32)].map(() => -1);

onmessage = async (e) => {
  const { start, position, stop, bpm } = e.data;

  if (bpm) {
    const { intervals } = setBPM(bpm);

    postMessage({ intervals });
  }

  if (start && !intervalTimer) {
    markStart(position);
    intervalTimer = setInterval(tryIncrement, 5);
  }

  if (stop) {
    intervalTimer = clearInterval(intervalTimer);
  }
};

function setBPM(bpm = 125) {
  BPM = bpm;
  intervals = [240000 / BPM, 60000 / BPM];
  return { intervals };
}

function markStart(position) {
  startTime = performance.now() - positionInMilliseconds(position);
  tickData = position ?? [0, 0];
  prevTickData = [-1, -1];
}

function tryIncrement() {
  tick(performance.now());
  if (tickData[1] !== lastTickData[1]) {
    lastTickData = tickData.slice();
    postMessage({ tickData, timestamp: Date.now() });
  }
}

function tick(time) {
  const runtime = time - startTime;
  // measure
  const m = (runtime / intervals[0]) | 0;
  tickData[0] = m;
  // quarter
  const mi = runtime - m * intervals[0];
  tickData[1] = (mi / intervals[1]) | 0;
  return tickData;
}

function positionInMilliseconds(tickData) {
  if (!tickData) return 0;
  const mms = intervals[0];
  const qms = intervals[1];
  return tickData[0] * mms + tickData[1] * qms;
}
