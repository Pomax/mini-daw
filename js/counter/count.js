let startTime, tickData, prevTickData, BPM, intervals;

export function setBPM(bpm = 125, MAX_DIVISION = 8) {
  BPM = bpm;
  intervals = [240000 / BPM, 60000 / BPM];
  for (let i = 0; i <= MAX_DIVISION - 2; i++) {
    intervals.push(60000 / (BPM * (i + 2)));
  }
  return { intervals };
}

export function markStart() {
  startTime = performance.now();
  tickData = intervals.map(() => 0);
  prevTickData = intervals.map(() => -1);
}

export function tick(time) {
    const runtime = time - startTime;

    // measure
    const m = (runtime / intervals[0]) | 0;
    const mi = runtime - m * intervals[0];

    // quarter
    const q = (mi / intervals[1]) | 0;
    const qi = mi - q * intervals[1];

    // divisions
    intervals.forEach((v, i) => (tickData[i] = (qi / v) | 0));
    tickData[0] = m;
    tickData[1] = q;

    return tickData;
}
