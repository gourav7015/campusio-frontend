/**
 * The fine-line picture behind each sign-in page: one drawing per portal, made from simple maths (circles, squares, a honeycomb,
 * a rolling curve, the logo's own "A") in a single colour. It is drawn in currentColor, so the page sets the colour to the portal's tone.
 * The strings only contain numbers worked out here, never anything typed by a person.
 */
const APATH = 'M178 40 L212 40 L345 215 L288 215 L195 88 L100 215 L40 215 Z';
const STARP = 'M193 128 Q198 156 228 162 Q198 168 193 197 Q188 168 158 162 Q188 156 193 128 Z';
const f1 = (n) => Math.round(n * 10) / 10;
const pth = (pts, close) => pts.map((p, i) => `${i ? 'L' : 'M'}${f1(p[0])} ${f1(p[1])}`).join('') + (close ? 'Z' : '');
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const starAt = (x, y, r) => `<path transform="translate(${x} ${y}) scale(${r / 35}) translate(-193 -162)" d="${STARP}" fill="currentColor" stroke="none"/>`;
const CX = 470;
const CY = 590;

const student = () => {
  let o = '';
  let pl = '';
  for (let k = 0; k < 17; k++) { const rx = 84 + k * 22; o += `<ellipse cx="${CX}" cy="${CY}" rx="${rx}" ry="${f1(rx * 0.34)}" transform="rotate(${f1(k * 10.6)} ${CX} ${CY})" stroke-opacity="${(0.72 - k * 0.03).toFixed(2)}"/>`; }
  [[2, 0.7, 5], [6, 2.2, 7], [9, 4.0, 5], [12, 1.1, 8], [15, 3.3, 6]].forEach(([k, t, r]) => {
    const rx = 84 + k * 22; const ry = rx * 0.34; const a = (k * 10.6 * Math.PI) / 180;
    const x = CX + rx * Math.cos(t) * Math.cos(a) - ry * Math.sin(t) * Math.sin(a);
    const y = CY + rx * Math.cos(t) * Math.sin(a) + ry * Math.sin(t) * Math.cos(a);
    pl += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${r}" fill="currentColor" stroke="none"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${r + 7}" stroke-opacity=".5"/>`;
  });
  return `${o}<circle cx="${CX}" cy="${CY}" r="420" stroke-opacity=".28"/><circle cx="${CX}" cy="${CY}" r="10" fill="currentColor" stroke="none"/><circle cx="${CX}" cy="${CY}" r="26" stroke-opacity=".7"/>${pl}`;
};

const teacher = () => {
  let o = '';
  for (let i = 0; i < 44; i++) {
    const s = 330 * 0.945 ** i; const a = (i * 5.4 * Math.PI) / 180; const pts = [];
    for (let j = 0; j < 4; j++) { const th = a + (j * Math.PI) / 2 + Math.PI / 4; pts.push([CX + s * Math.SQRT2 * Math.cos(th), CY + s * Math.SQRT2 * Math.sin(th)]); }
    o += `<path d="${pth(pts, true)}" stroke-opacity="${(0.78 - i * 0.014).toFixed(2)}"/>`;
  }
  o += `<circle cx="${CX}" cy="${CY}" r="467" stroke-opacity=".3"/><circle cx="${CX}" cy="${CY}" r="330" stroke-opacity=".34"/><circle cx="${CX}" cy="${CY}" r="165" stroke-opacity=".3"/>`;
  for (let q = 0; q < 8; q++) { const t = (q * Math.PI) / 4; o += `<path d="M${f1(CX + 20 * Math.cos(t))} ${f1(CY + 20 * Math.sin(t))}L${f1(CX + 520 * Math.cos(t))} ${f1(CY + 520 * Math.sin(t))}" stroke-opacity=".16"/>`; }
  return `${o}<circle cx="${CX}" cy="${CY}" r="5" fill="currentColor" stroke="none"/>`;
};

const staff = () => {
  let o = '';
  const a = 40;
  const hx = [];
  for (let i = 0; i < 6; i++) { const th = ((-90 + i * 60) * Math.PI) / 180; hx.push([Math.cos(th), Math.sin(th)]); }
  for (let r = -2; r < 18; r++) {
    for (let c = -1; c < 20; c++) {
      const x = 30 + c * a * 1.732 + (r & 1 ? a * 0.866 : 0); const y = 70 + r * a * 1.5; const d = Math.hypot(x - CX, (y - CY) * 1.1);
      if (d > 470) continue;
      const op = Math.max(0.06, 0.62 - d / 800); const pts = hx.map((h) => [x + a * 0.94 * h[0], y + a * 0.94 * h[1]]);
      o += `<path d="${pth(pts, true)}M${f1(x)} ${f1(y)}L${f1(pts[1][0])} ${f1(pts[1][1])}M${f1(x)} ${f1(y)}L${f1(pts[3][0])} ${f1(pts[3][1])}M${f1(x)} ${f1(y)}L${f1(pts[5][0])} ${f1(pts[5][1])}" stroke-opacity="${op.toFixed(2)}"/>`;
      const h = Math.abs(Math.sin(r * 12.9898 + c * 78.233) * 43758.5453) % 1;
      if (h > 0.72) o += `<path d="${pth([[x, y], pts[5], pts[0], pts[1]], true)}" fill="currentColor" fill-opacity="${(op * 0.55).toFixed(2)}" stroke="none"/>`;
    }
  }
  return o;
};

const finance = () => {
  let o = '';
  const R = 300; const rr = 84; const k = rr / gcd(R, rr);
  for (let j = 0; j < 9; j++) {
    const d = 34 + j * 17; const pts = [];
    for (let i = 0; i <= 1500; i++) { const t = (i / 1500) * 2 * Math.PI * k; pts.push([CX + (R - rr) * Math.cos(t) + d * Math.cos(((R - rr) / rr) * t), CY + (R - rr) * Math.sin(t) - d * Math.sin(((R - rr) / rr) * t)]); }
    o += `<path d="${pth(pts, true)}" stroke-opacity="${(0.6 - j * 0.03).toFixed(2)}"/>`;
  }
  const p2 = [];
  for (let i = 0; i <= 900; i++) { const t = (i / 900) * 2 * Math.PI * 2; p2.push([CX + 150 * Math.cos(t) + 70 * Math.cos(5 * t), CY + 150 * Math.sin(t) - 70 * Math.sin(5 * t)]); }
  return `${o}<path d="${pth(p2, true)}" stroke-opacity=".7"/><circle cx="${CX}" cy="${CY}" r="318" stroke-opacity=".4"/><circle cx="${CX}" cy="${CY}" r="332" stroke-opacity=".22"/><circle cx="${CX}" cy="${CY}" r="52" stroke-opacity=".6"/>`;
};

const library = () => {
  let o = '';
  const yb = 800;
  for (let k = 0; k < 18; k++) {
    const w = 56 + k * 40; const h = 130 + k * 24; const x0 = CX - w / 2; const yt = yb - h + w / 2;
    o += `<path d="M${f1(x0)} ${yb}V${f1(yt)}A${w / 2} ${w / 2} 0 0 1 ${f1(x0 + w)} ${f1(yt)}V${yb}" stroke-opacity="${(0.78 - k * 0.033).toFixed(2)}"/>`;
  }
  for (let i = -3; i <= 3; i++) o += `<path d="M${CX + i * 9} ${yb}V${yb - 60 - Math.abs(i) * 4}" stroke-opacity=".5"/>`;
  for (let i = 0; i < 9; i++) { const yy = yb + i * 11; const hw = 260 + i * 70; o += `<path d="M${CX - hw} ${yy}H${CX + hw}" stroke-opacity="${(0.5 - i * 0.05).toFixed(2)}"/>`; }
  return `${o}<path d="M${CX - 420} ${yb}H${CX + 420}" stroke-opacity=".7"/>`;
};

const transport = () => {
  let o = '';
  for (let k = -11; k <= 11; k++) {
    const pts = [];
    for (let x = -60; x <= 1660; x += 20) pts.push([x, 610 + 120 * Math.sin(x / 255 + 0.6) + 44 * Math.sin(x / 105) * (0.35 + (0.65 * Math.abs(k)) / 11) + k * (8 + 6 * Math.sin(x / 330))]);
    o += `<path d="${pth(pts)}" stroke-opacity="${(0.2 + 0.5 * (1 - Math.abs(k) / 11)).toFixed(2)}"${k === 0 ? ' stroke-width="2.2" stroke-opacity=".95"' : ''}/>`;
  }
  [260, 520, 800].forEach((sx) => {
    const sy = 610 + 120 * Math.sin(sx / 255 + 0.6) + 44 * Math.sin(sx / 105) * 0.35;
    o += `<circle cx="${sx}" cy="${f1(sy)}" r="11" fill="rgb(var(--c-bg))" stroke-width="2.2"/><circle cx="${sx}" cy="${f1(sy)}" r="22" stroke-opacity=".5"/>`;
  });
  for (let r = 0; r < 10; r++) o += `<circle cx="1190" cy="250" r="${30 + r * 24}" stroke-opacity="${(0.4 - r * 0.035).toFixed(2)}"/>`;
  return o;
};

const admin = () => {
  let o = '';
  for (let k = 0; k < 32; k++) { const s = 2.15 - k * 0.058; o += `<path vector-effect="non-scaling-stroke" transform="translate(${CX} 810) scale(${f1(s * 100) / 100}) translate(-192.5 -215)" d="${APATH}" stroke-opacity="${(0.8 - k * 0.022).toFixed(2)}"/>`; }
  for (let i = 0; i < 10; i++) o += `<path d="M${CX - 300 - i * 40} ${810 + i * 10}H${CX + 300 + i * 40}" stroke-opacity="${(0.5 - i * 0.045).toFixed(2)}"/>`;
  return `${o}<g transform="translate(${CX} 725) scale(.7)">${starAt(0, 0, 40)}</g>`;
};

const platform = () => {
  const R = 320;
  let o = `<g transform="translate(0 125)"><circle cx="${CX}" cy="${CY}" r="${R}" stroke-opacity=".7"/>`;
  for (let i = -5; i <= 5; i++) { const ph = (i * 15 * Math.PI) / 180; const rx = R * Math.cos(ph); o += `<ellipse cx="${CX}" cy="${f1(CY + R * Math.sin(ph))}" rx="${f1(rx)}" ry="${f1(rx * 0.26)}" stroke-opacity="${(0.6 - Math.abs(i) * 0.05).toFixed(2)}"/>`; }
  for (let i = 0; i < 12; i++) { const rxl = R * Math.abs(Math.cos((i * 15 * Math.PI) / 180)); o += `<ellipse cx="${CX}" cy="${CY}" rx="${f1(rxl)}" ry="${R}" stroke-opacity=".34"/>`; }
  const nodes = [[-150, -170], [90, -250], [220, -60], [-240, 40], [20, 200], [250, 170], [-60, -40]];
  nodes.forEach((n, a) => { const m = nodes[(a + 2) % nodes.length]; o += `<path d="M${CX + n[0]} ${CY + n[1]}Q${f1(CX + (n[0] + m[0]) / 2)} ${f1(CY + (n[1] + m[1]) / 2 - 120)} ${CX + m[0]} ${CY + m[1]}" stroke-opacity=".9"/>`; });
  nodes.forEach((n) => { o += `<circle cx="${CX + n[0]}" cy="${CY + n[1]}" r="5" fill="currentColor" stroke="none"/><circle cx="${CX + n[0]}" cy="${CY + n[1]}" r="13" stroke-opacity=".55"/>`; });
  for (let i = 0; i < 6; i++) o += `<circle cx="${CX}" cy="${CY}" r="${R + 26 + i * 26}" stroke-opacity="${(0.24 - i * 0.035).toFixed(2)}"/>`;
  return `${o}</g>`;
};

const DRAW = { student, teacher, staff, finance, library, transport, admin, platform };
const cache = {};

/** The inside of the picture's <svg> for a portal (viewBox 0 0 1600 900). */
export const artFor = (portal) => (cache[portal] ||= (DRAW[portal] || admin)());
