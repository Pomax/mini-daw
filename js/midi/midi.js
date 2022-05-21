import { router } from "./router.js";

function run(err) {
  return true;
  // we don't really do anything else here
}

// router function for incoming MIDI messages
function getMIDIMessage(midiMessage) {
  var data = midiMessage.data;
  var status = data[0];
  var type = (status & 0xf0) >> 4;
  var channel = status & 0x0f;
  var data = data.slice(1);
  router.receive(type, channel, data);
}

// general bootstrapping
function onMidiSuccess(success) {
  let devices = [];
  for (let input of success.inputs.values()) {
    console.log(input);
    devices.push(input);
    input.close();
  }
  
  console.log(`MIDI access allowed (${devices.length} devices found)`);

  const htmlNode = document.getElementById(`mididevice`);
  htmlNode.append(document.createElement(`option`));
  devices.forEach((input) => {
    const option = document.createElement(`option`);
    option.value = option.textContent = input.name;
    htmlNode.append(option);
  });

  htmlNode.addEventListener(`change`, (evt) => {
    // close all ports
    devices.forEach((d) => d.close());
    // then bind to the indicated device
    const name = evt.target.value;
    const desired = devices.find((v) => v.name === name);
    desired
      .open()
      .then((d) => console.log(`Now using ${d.name}`))
      .catch((e) => alert(`Error connecting to ${name}`));
    desired.onmidimessage = getMIDIMessage;
  });

  if (devices.length === 0) {
    return alert(`No MIDI devices were found.`);
  } else {
    htmlNode.removeAttribute(`disabled`);
  }

  return run();
}

// even if midi device access fails, we still have a synth to play with
function onMidiFail() {
  if (navigator.requestMIDIAccess === JZZ.requestMIDIAccess) {
    alert(
      `While Web MIDI is available, MIDI device access failed. This site uses the Jazz MIDI plugin as fallback solution for browsers with bad/no native support, so head on over to https://jazz-soft.net to install it for your browser.`
    );
  } else {
    navigator.requestMIDIAccess = JZZ.requestMIDIAccess;
    return connectMIDI();
  }
}

// kick it all of.
async function connectMIDI() {
  if (!navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess = JZZ.requestMIDIAccess
  }
  try {
    const result = await navigator.requestMIDIAccess();
    return onMidiSuccess(result);
  } catch (e) {
    onMidiFail();
  }
}

// document level event for midi notes getting played
function midiNotePlay(note, velocity) {
  document.dispatchEvent(new CustomEvent(`midi:note:play`, { detail: { note, velocity }}));
}

// document level event for midi notes stopping
function midiNoteStop(note) {
  document.dispatchEvent(new CustomEvent(`midi:note:stop`, { detail: { note }}));
}

export { connectMIDI, midiNotePlay, midiNoteStop };
