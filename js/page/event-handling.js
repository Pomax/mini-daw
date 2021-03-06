import { settings } from "../settings.js";
import { router } from "../midi/router.js";
import { recorder } from "../midi/recorder.js";
import { connectMIDI } from "../midi/midi.js";
import { generator } from "../midi/keyboard.js";
import { master, setReverb, setOverdrive } from "../audio/audio-context.js";
import { beeper } from "../audio/audio-generator.js";
import { slider } from "./slider.js";
import { find } from "./utils.js";
import * as pianoroll from "./pianoroll/pianoroll.js";
import { stopScrubber } from "./page-ui.js";

let startTime;
let currentTickData;

export function cacheTickData(tickData) {
  currentTickData = tickData;
}

export function listenForUser(counter) {
  const playButton = find(`button.play`);
  const pauseButton = find(`button.pause`);
  const stopButton = find(`button.stop`);
  const recordButton = find(`button.record`);

  find(`button.midi`).addEventListener(`click`, async (evt) => {
    evt.target.setAttribute(`disabled`, `disabled`);
    find(`button.record`).removeAttribute(`disabled`);
    find(`button.pause`).removeAttribute(`disabled`);
    const result = await connectMIDI();
    if (!result) {
      evt.target.removeAttribute(`disabled`);
    }

    router.addListener(
      {
        // control codes for my Novation LaunchKey 49 mk3
        onControl: (controller, value) => {
          if (controller === 102) {
            // track down
          }
          if (controller === 103) {
            // track up
          }
          if (controller === 104 && value === 127) {
            // "right arrow" pad, should probably cycle focus

            const keyboardfocusableElements = [
              ...find(
                'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), details, [tabindex]:not([tabindex="-1"])',
                find(`.controls`)
              ),
            ];
            const klen = keyboardfocusableElements.length;
            const cur = document.activeElement;
            let pos = keyboardfocusableElements.findIndex((v) => v === cur);
            if (pos < 0) pos = 0;
            const next = keyboardfocusableElements[(pos + 1) % klen];
            next.focus();
          }
          if (controller === 106) {
            if (value === 127)
              // todo: add key repeat
              document.activeElement.dispatchEvent(
                new KeyboardEvent(`keydown`, { key: `Arrow Up` })
              );
            if (value === 0)
              document.activeElement.dispatchEvent(
                new KeyboardEvent(`keyup`, { key: `Arrow Up` })
              );
          }
          if (controller === 107) {
            if (value === 127)
              // todo: add key repeat
              document.activeElement.dispatchEvent(
                new KeyboardEvent(`keydown`, { key: `Arrow Down` })
              );
            if (value === 0)
              document.activeElement.dispatchEvent(
                new KeyboardEvent(`keyup`, { key: `Arrow Down` })
              );
          }
          if (controller === 115 && value === 127) playButton.click();
          if (controller === 116 && value === 127) pauseButton.click();
          if (controller === 117 && value === 127) recordButton.click();
        },
      },
      `control`
    );
  });

  recordButton.addEventListener(`click`, () => {
    startTime = performance.now();
    // const old = recorder.clear();
    recorder.start();
    counter.postMessage({ start: true });
    pauseButton.disabled = false;
    stopButton.disabled = false;
    playButton.disabled = true;
    recordButton.disabled = true;
  });

  pauseButton.addEventListener(`click`, () => {
    const runtime = performance.now() - startTime;
    find(`span.runtime`).textContent = runtime.toFixed();
    counter.postMessage({ stop: true });
    recorder.stop(); // what do we want to do with the old data?
    generator.stopAll();
    pauseButton.disabled = true;
    stopButton.disabled = false;
    playButton.disabled = false;
    recordButton.disabled = false;
  });

  stopButton.addEventListener(`click`, () => {
    pauseButton.click();
    currentTickData = [0, 0];
    stopScrubber();
    find(`.scrubber`).style.setProperty(`--l`, `0px`);
    const viewport = find(`.pianoroll-container`);
    viewport.scroll(0, viewport.scrollTop);
    pauseButton.disabled = true;
    stopButton.disabled = true;
    playButton.disabled = false;
    recordButton.disabled = false;
  });

  playButton.addEventListener(`click`, ({ target }) => {
    recorder.playback(settings.intervalValues);
    counter.postMessage({ start: true, position: currentTickData });
    playButton.disabled = true;
    pauseButton.disabled = false;
    stopButton.disabled = false;
    recordButton.disabled = true;
  });

  find(`button.beep`).addEventListener(`click`, ({ target }) => {
    target.classList.toggle(`disabled`);
    if (target.classList.contains(`disabled`)) {
      beeper.mute();
    } else {
      beeper.unmute();
    }
  });

  document.addEventListener(`keypress`, (evt) => {
    if (evt.key === ` `) {
      if (playButton.disabled) {
        pauseButton.click();
      } else playButton.click();
    }
  });

  find(`#bpm`).addEventListener(`change`, (evt) => {
    counter.postMessage({ stop: true });
    settings.bpm = parseInt(evt.target.value);
    counter.postMessage(settings);
  });

  find(`#divisions`).addEventListener(`change`, (evt) => {
    counter.postMessage({ stop: true });
    settings.divisions = parseInt(evt.target.value);
    counter.postMessage(settings);
  });

  find(`#reverb`).addEventListener(`change`, (evt) => {
    setReverb(evt.target.value);
  });

  find(`#overdrive`).addEventListener(`input`, (evt) => {
    setOverdrive(0 - parseFloat(evt.target.value));
  });

  const pitch = find(`input.pitch`);
  router.addListener({ onPitch: (v) => (pitch.value = v) }, `pitch`);

  const mod = find(`input.mod`);
  router.addListener(
    { onModWheel: (value) => (mod.value = value) },
    `modwheel`
  );

  find(`button.load`).addEventListener(`click`, () => {
    console.log(`Load .mid file`);
    // const events = parseMidi(databuffer);
    // recorder.loadEvents(events);
  })

  find(`button.save`).addEventListener(`click`, () => {
    console.log(`Save current records as .mid file`);
    console.log(recorder.getEventDataCopy());
  })

  find(`button.chorus`).addEventListener(`click`, (evt) => {
    const btn = evt.target;
    btn.classList.toggle(`enabled`);
    btn.textContent = btn.classList.contains(`enabled`) ? `disable` : `enable`;
    generator.toggleChorus();
  });

  const masterVolume = find(`span.master`);
  masterVolume.textContent = ``;
  slider(
    {
      min: 0,
      max: 1,
      step: 0.01,
      value: 1,
      input: (evt) => (master.gain.value = parseFloat(evt.target.value)),
    },
    masterVolume
  );
}
