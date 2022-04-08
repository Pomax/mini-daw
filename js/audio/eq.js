import { create } from "../page/utils.js";
import { context } from "./audio-context.js";

function createFilter(band) {
  const filter = context.createBiquadFilter();
  filter.type = `peaking`;
  const f = (band[1] + band[2]) / 2;
  const w = band[2] - band[1];
  filter.frequency.value = f;
  filter.Q.value = f / w;
  filter.gain.value = 0;
  return { label: band[0], node: filter };
}

const SLIDER_PROPS = {
  type: `range`,
  min: -24,
  max: 24,
  value: 0,
  step: 0.1,
};

export class EQ {
  constructor(bandCount = 3) {
    // TODO: take bandCount into account
    const EQ = (this.EQ = [
      [`low`, 0, 400],
      [`mid`, 400, 4000],
      [`high`, 4000, 14000],
    ].map(createFilter));

    const balance = (this.balance = context.createGain());
    balance.gain.value = 1;

    this.setupConnections(EQ);
    this.setupUI();
  }

  get input() {
    return this.EQ[0].node;
  }

  connect(output) {
    this.balance.connect(output);
  }

  setupConnections(EQ) {
    const e = EQ.length - 2;
    EQ[e].node.connect(this.balance);
    for (let i = 0; i < e; i++) {
      let n1 = EQ[i].node;
      let n2 = EQ[i + 1].node;
      n1.connect(n2);
    }
  }

  setupUI() {
    this.EQcontrols = this.EQ.map(({ label, node }, pos) => {
      const slider = create(`input`);
      Object.entries(SLIDER_PROPS).forEach(([name, val]) =>
        slider.setAttribute(name, val)
      );
      slider.addEventListener(`input`, () => {
        this.setBand(node, parseFloat(slider.value));
      });
      slider.addEventListener(`mouseup`, (evt) => {
        evt.stopPropagation();
      }, true);
      return slider;
    });
  }

  setBand(node, value) {
    node.gain.value = value;
    this.rebalance();
  }

  rebalance() {
    let mix = this.EQ.reduce((t, e) => {
      let v = e.node.gain.value;
      // We only care about boosted signals,
      // ignoring attenuations even if they
      // *might* dampen the overall signal.
      return t + (v > 0 ? v / 24 : 0);
    }, 1);
    this.balance.gain.value = 1 / mix;
  }
}
