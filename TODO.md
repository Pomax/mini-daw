Fix oscillator count:
- [x] don't preallocate all MIDI key oscillators
- [x] create them on the fly, and reuse them with `osc.frequency.value.setValueAtTime`
- [ ] legato vs. polyphonic using `setTargetAtTime`?

Make time signature user-manipulable

- [x] add to settings
- [x] add HTML controls
- [ ] update timing wheel to use settings
- [ ] update piano roll to use settings
- add listeners for html controls
  - [ ] update timing wheel
  - [ ] update piano roll

Playback vs. recording:

- [ ] auto-stop playback when we've run out of measures
- [ ] only add new measures when recording
  - [ ] only add new measures once we start running out of measures
  - [ ] trim measures when recording stops


Most important:
- [x] update pianoroll measure/scrubber to be a background image with CSS sizing/repeat, and position notes absolutely.
- [x] make pianoroll a CSS grid
