import { settings } from "../../settings.js";
import { create } from "../utils.js";

export function generateRollBackground(qs, w, h) {
  const cvs = create(`canvas`);
  cvs.width = w;
  cvs.height = h;
  const ctx = cvs.getContext(`2d`);
  const styles = {
    main: `#e0e0e0`,
    darker: `#d2d2d2`,
    lighter: `#efefef`,
    border: `#4144`,
    lightBorder: `#4141`,
  };

  ctx.resetTransform();

  const rect = (color, x, y, w, h) => {
    ctx.strokeStyle = ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
  };

  // division coloring
  ctx.translate(-0.5, -0.5);
  rect(styles.main, 0, 0, w, h);
  rect(styles.lighter, 1 + w / 2, 0, w / 2, h / 2);
  rect(styles.darker, 0, 1 + h / 2, w / 2, h / 2);

  // grid lines
  ctx.resetTransform();
  ctx.translate(0.5, 0.5);
  const grid = settings.gridPerQuarter;
  const spacing = settings.quarterInPixels / grid;
  for (let i = 0, q = 2 * qs; i < q; i++) {
    const x = (i * w) / q;
    rect(styles.border, x, 0, 1, h);
    for (let s = 1; s < grid; s++) {
      rect(styles.lightBorder, x + s * spacing, 0, 1, h);
    }
  }

  return cvs.toDataURL();
}
