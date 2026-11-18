// Models of the off-the-shelf components listed in the OpenEvo bill of materials, shaped after
// the photographs in the OpenEVO Type D Mk4 Assembly Manual. Each builder returns a THREE.Group in a
// documented local frame; named connection points live in group.userData.pins (local coords).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { M, wireMat } from './materials.js';

const V2 = (x, y) => new THREE.Vector2(x, y);
export function shadow(o) { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; }
export function box(w, h, d, mat, x = 0, y = 0, z = 0, r = 0) {
  const g = r > 0 ? new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2.01, h / 2.01, d / 2.01)) : new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); return m;
}
export function cyl(r, h, mat, x = 0, y = 0, z = 0, axis = 'y', seg = 24, rt = null) {
  const g = new THREE.CylinderGeometry(rt ?? r, r, h, seg);
  if (axis === 'x') g.rotateZ(-Math.PI / 2); else if (axis === 'z') g.rotateX(Math.PI / 2);
  const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); return m;
}
function group(name, ...kids) { const g = new THREE.Group(); g.name = name; g.userData.pins = {}; kids.forEach(k => g.add(k)); return g; }
function pin(g, name, x, y, z, lead) { g.userData.pins[name] = new THREE.Vector3(x, y, z); if (lead) (g.userData.leads || (g.userData.leads = {}))[name] = new THREE.Vector3(...lead).normalize(); }
function pinField(pts, len, mat = M.gold, w = 0.64, axis = 'y') {
  const g = axis === 'y' ? new THREE.BoxGeometry(w, len, w) : axis === 'z' ? new THREE.BoxGeometry(w, w, len) : new THREE.BoxGeometry(len, w, w);
  const im = new THREE.InstancedMesh(g, mat, pts.length); const o = new THREE.Object3D();
  pts.forEach((p, i) => { o.position.set(p[0], p[1], p[2]); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
  im.castShadow = true; return im;
}
// straight male header: n pins along +X from 0 (rows along +z); plastic y 0..2.5
function maleHeader(n, rows = 1, up = 6, down = 3) {
  const p = 2.54, g = group('male header');
  g.add(box(n * p, 2.5, rows * p, M.header, (n - 1) * p / 2, 1.25, (rows - 1) * p / 2));
  const pts = []; for (let r = 0; r < rows; r++) for (let i = 0; i < n; i++) pts.push([i * p, (2.5 + up - down) / 2, r * p]);
  g.add(pinField(pts, up + down + 2.5));
  return g;
}
function femaleHeader(n, rows = 1, h = 8.5) {
  const p = 2.54, g = group('female header');
  g.add(box(n * p, h, rows * p, M.header, (n - 1) * p / 2, h / 2, (rows - 1) * p / 2));
  const pts = []; for (let r = 0; r < rows; r++) for (let i = 0; i < n; i++) pts.push([i * p, h + 0.02, r * p]);
  const holes = pinField(pts, 0.05, M.chip, 1.0); holes.castShadow = false; g.add(holes);
  return g;
}
// screw terminal block: n positions along X from 0; wire entries face +z, screws on top
function screwTerminal(n, mat = M.termBlue, pitch = 5.08, h = 10, d = 7.6) {
  const g = group('screw terminal');
  g.add(box(n * pitch, h, d, mat, (n - 1) * pitch / 2, h / 2, 0, 0.6));
  for (let i = 0; i < n; i++) { g.add(cyl(1.5, 0.6, M.steelDark, i * pitch, h + 0.1, -1.0, 'y', 12)); g.add(box(3.2, 3.2, 0.5, M.chip, i * pitch, h * 0.42, d / 2 + 0.05)); }
  return g;
}
function chip(w, d, h = 1.2, legs = true) { const g = group('chip'); g.add(box(w, h, d, M.chip, 0, h / 2, 0, 0.2)); if (legs) g.add(box(w * 0.92, 0.25, d + 1.6, M.steel, 0, 0.15, 0)); return g; }
function smd(x, z, mat = M.chip, w = 1.6, d = 0.8, y = 1.9) { return box(w, 0.6, d, mat, x, y, z); }
function pcb(w, d, mat, t = 1.6, r = 1.2) { return box(w, t, d, mat, 0, t / 2, 0, r); }
function capacitor(r, h, mat = M.capBlack) { const g = group('capacitor'); g.add(cyl(r, h, mat, 0, h / 2, 0, 'y', 20)); g.add(cyl(r * 0.92, 0.3, M.alu, 0, h + 0.1, 0, 'y', 20)); return g; }
function holes(g, pts, y = 1.62, r = 1.7) { pts.forEach(([x, z]) => g.add(cyl(r + 0.6, 0.05, M.gold, x, y, z, 'y', 16))); pts.forEach(([x, z]) => g.add(cyl(r, 0.06, M.chip, x, y + 0.01, z, 'y', 16))); }

// ---------------------------------------------------------------- Arduino MEGA 2560 R3
// Local: PCB in XZ, top y=1.6. Arduino coords (x from the USB end, y from the power/analog edge) -> (x, -y).
export function arduinoMega() {
  const g = group('Arduino MEGA 2560 R3');
  const W = 101.6, D = 53.3;
  const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(W - 2.5, 0); s.lineTo(W, 2.5); s.lineTo(W, D - 2.5); s.lineTo(W - 2.5, D); s.lineTo(0, D); s.lineTo(0, 0);
  [[13.97, 2.54], [15.24, 50.8], [66.04, 7.62], [66.04, 35.56], [90.17, 50.8], [96.52, 2.54]].forEach(([x, y]) => { const h = new THREE.Path(); h.absarc(x, y, 1.6, 0, Math.PI * 2, true); s.holes.push(h); });
  const geo = new THREE.ExtrudeGeometry(s, { depth: 1.6, bevelEnabled: false }); geo.rotateX(-Math.PI / 2);
  g.add(new THREE.Mesh(geo, M.pcbArduino));
  const P = (x, y) => [x, -y];
  { const [x, z] = P(4, 38.1); g.add(box(16, 11, 12, M.steel, x, 1.6 + 5.5, z, 0.6)); g.add(box(1, 7, 8, M.chip, x - 7.6, 1.6 + 5.5, z)); }
  { const [x, z] = P(5, 7.6); g.add(box(13.5, 11, 9, M.black, x, 1.6 + 5.5, z, 0.8)); g.add(cyl(3.1, 1, M.steelDark, x - 6.9, 1.6 + 5.5, z, 'x', 16)); }
  const fh = (n, rows, x, y) => { const h = femaleHeader(n, rows); const [lx, lz] = P(x, y); h.position.set(lx, 1.6, lz); g.add(h); };
  fh(10, 1, 17.0, 50.8); fh(8, 1, 44.45, 50.8); fh(8, 1, 66.04, 50.8); fh(8, 1, 27.94, 2.54); fh(8, 1, 50.8, 2.54); fh(8, 1, 73.66, 2.54);
  { const h = femaleHeader(18, 2); h.rotation.y = Math.PI / 2; const [lx, lz] = P(93.98, 4.32); h.position.set(lx, 1.6, lz); g.add(h); }
  { const c = chip(14, 14, 1.4); c.rotation.y = Math.PI / 4; const [x, z] = P(55, 27); c.position.set(x, 1.6, z); g.add(c); }
  { const c = chip(5, 5, 1.0); const [x, z] = P(22, 30); c.position.set(x, 1.6, z); g.add(c); }
  { const [x, z] = P(30, 12); g.add(box(11, 3.5, 4.5, M.alu, x, 1.6 + 1.75, z, 1.5)); }
  { const [x, z] = P(9, 50); g.add(box(6, 3, 6, M.steel, x, 3.1, z)); g.add(cyl(1.6, 1.2, M.pcbRed, x, 4.8, z, 'y', 12)); }
  [[22, 18], [26, 18], [36, 20], [38, 36], [76, 22], [80, 36], [45, 44], [70, 44]].forEach(([x, y], i) => { const [lx, lz] = P(x, y); g.add(smd(lx, lz, i % 2 ? M.chip : M.copper)); });
  { const c = capacitor(3.2, 6.5); const [x, z] = P(9, 12); c.position.set(x, 1.6, z); g.add(c); }
  { const c = capacitor(3.2, 6.5); const [x, z] = P(17, 7.5); c.position.set(x, 1.6, z); g.add(c); }
  const top = 10.1, setPin = (n, x, y) => { const [lx, lz] = P(x, y); pin(g, n, lx, top, lz); };
  for (let k = 0; k < 8; k++) setPin('D' + (14 + k), 66.04 + k * 2.54, 50.8);
  for (let k = 0; k < 8; k++) setPin('A' + (8 + k), 73.66 + k * 2.54, 2.54);
  // double-row header: odd pins on the outer column (board edge), even pins inner; rows from the top edge
  for (let r = 0; r < 18; r++) {
    const y = 47.5 - r * 2.54;
    if (r === 0) { setPin('5V', 93.98, y); setPin('5V_2', 96.52, y); }
    else if (r === 17) { setPin('GND', 93.98, y); setPin('GND_2', 96.52, y); }
    else { setPin('D' + (20 + 2 * r), 93.98, y); setPin('D' + (21 + 2 * r), 96.52, y); }
  }
  return shadow(g);
}

// ---------------------------------------------------------------- Motor Shield V2 (Uno footprint)
// Same local convention as the Mega. M1/M2 5-pos block along the USB-end short edge, M3/M4 along the far
// short edge, motor power 2-pos near the DC-jack corner. Wire entries face outward.
export function motorShield() {
  const g = group('Motor Shield V2');
  const W = 68.6, D = 53.3;
  const b = pcb(W, D, M.pcbBlue); b.position.set(W / 2, 0, -D / 2); g.add(b);
  const P = (x, y) => [x, -y];
  [[17.0, 50.8, 10], [44.45, 50.8, 8], [27.94, 2.54, 8], [50.8, 2.54, 6]].forEach(([x, y, n]) => { const h = maleHeader(n, 1, 3, 9); const [lx, lz] = P(x, y); h.position.set(lx, -2.5, lz); g.add(h); });
  // 5-position blocks along the short edges, wire entries facing outward; pins generated from the same layout
  const blk = (x, y0, rot) => { const t = screwTerminal(5, M.termGreen, 3.5, 8.5, 7); t.rotation.y = rot; const [lx, lz] = P(x, y0); t.position.set(lx, 1.6, lz); g.add(t); };
  blk(4.2, 40.3, -Math.PI / 2);   // positions at board y 40.3, 36.8 ... 26.3
  blk(64.4, 26.3, Math.PI / 2);   // positions at board y 26.3, 29.8 ... 40.3
  { const t = screwTerminal(2, M.termGreen, 3.5, 8.5, 7); const [lx, lz] = P(10.0, 4.2); t.position.set(lx, 1.6, lz); g.add(t); }
  [[32, 26, 7, 7], [47, 32, 6, 4], [47, 20, 6, 4], [56, 44, 6, 4]].forEach(([x, y, w, d]) => { const c = chip(w, d, 1.2); const [lx, lz] = P(x, y); c.position.set(lx, 1.6, lz); g.add(c); });
  { const c = capacitor(4, 8); const [x, z] = P(23, 13); c.position.set(x, 1.6, z); g.add(c); }
  const dots = []; for (let i = 0; i < 12; i++) for (let j = 0; j < 4; j++) dots.push([22 + i * 2.54, 1.62, -(40 + j * 2.54)]);
  const pf = pinField(dots, 0.04, M.gold, 1.2); pf.castShadow = false; g.add(pf);
  const tp = (n, x, y, lead) => { const [lx, lz] = P(x, y); pin(g, n, lx, 10.5, lz, lead); };
  ['M1a', 'M1b', 'GND12', 'M2a', 'M2b'].forEach((n, i) => tp(n, 4.2, 40.3 - i * 3.5, [-0.5, 1, 0]));
  ['M3a', 'M3b', 'GND34', 'M4a', 'M4b'].forEach((n, i) => tp(n, 64.4, 26.3 + i * 3.5, [0.5, 1, 0]));
  tp('POWER+', 13.5, 4.2, [0, 1, 0.5]); tp('POWER-', 10.0, 4.2, [0, 1, 0.5]);
  return shadow(g);
}

// ---------------------------------------------------------------- L298N Motor Controller (Heater Controller Board)
// Local: centred, top y=1.6. Input header (+z edge): ENA5V ENA IN1 IN2 IN3 IN4 ENB ENB5V.
export function l298n() {
  const g = group('L298N Motor Controller');
  g.add(pcb(43, 43, M.pcbRed));
  holes(g, [[-18.5, -18.5], [18.5, -18.5], [-18.5, 18.5], [18.5, 18.5]]);
  const hs = group('heatsink'); hs.add(box(24, 4, 15, M.aluDark, 0, 2, 0));
  for (let i = 0; i < 7; i++) hs.add(box(1.6, 20, 15, M.aluDark, -10.5 + i * 3.5, 12, 0));
  hs.position.set(0, 1.6, -9); g.add(hs);
  g.add(box(20, 8, 3, M.chip, 0, 5.6, 0));
  const tL = screwTerminal(2); tL.rotation.y = -Math.PI / 2; tL.position.set(-18, 1.6, -11); g.add(tL);
  const tR = screwTerminal(2); tR.rotation.y = Math.PI / 2; tR.position.set(18, 1.6, -6); g.add(tR);
  const tP = screwTerminal(3); tP.position.set(-11.08, 1.6, 15.5); g.add(tP);
  const c1 = capacitor(4, 11); c1.position.set(-14, 1.6, 4); g.add(c1);
  const c2 = capacitor(4, 11); c2.position.set(14, 1.6, 6); g.add(c2);
  g.add(box(10, 9, 4.5, M.chip, 13, 6, 14));
  const hdr = maleHeader(8, 1, 6, 0); hdr.position.set(-8.9, 1.6, 19.6); g.add(hdr);
  const tp = (n, x, z, y = 11.6) => pin(g, n, x, y, z);
  pin(g, 'OUT1', -18, 11.6, -11, [-0.5, 1, 0]); pin(g, 'OUT2', -18, 11.6, -6, [-0.5, 1, 0]); pin(g, 'OUT3', 18, 11.6, -6, [0.5, 1, 0]); pin(g, 'OUT4', 18, 11.6, -11, [0.5, 1, 0]);
  pin(g, '12V', -11.08, 11.6, 15.5, [0, 1, 0.5]); pin(g, 'GND', -6.0, 11.6, 15.5, [0, 1, 0.5]); pin(g, '5V', -0.92, 11.6, 15.5, [0, 1, 0.5]);
  ['ENA5V', 'ENA', 'IN1', 'IN2', 'IN3', 'IN4', 'ENB', 'ENB5V'].forEach((n, i) => tp(n, -8.9 + i * 2.54, 19.6, 10.1));
  return shadow(g);
}
export function jumperCap() { return shadow(group('2.54mm Jumper Cap', box(5.0, 6, 2.6, M.black, 0, 3, 0, 0.3))); }

// ---------------------------------------------------------------- TLC5947 LED Controller Board (24-channel)
// Local: centred, long axis X (INPUT header at -x), top y=1.6. Channel pins in 2x3 groups along both long
// edges: outer row = V+, inner row = channel; channels 0-11 on the +z edge, 23..12 on the -z edge.
export function tlc5947() {
  const g = group('TLC5947 LED Controller Board');
  g.add(pcb(48.3, 24.1, M.pcbBlue));
  holes(g, [[-22.5, -10.15], [22.5, -10.15], [-22.5, 10.15], [22.5, 10.15]], 1.62, 1.35);
  const c = chip(11, 6.5, 1.1); c.position.set(-1, 1.6, 0); g.add(c);
  g.add(box(6.5, 2.3, 6, M.chip, 9.5, 2.75, 0, 0.3)); g.add(box(4, 0.4, 6.6, M.steel, 9.5, 1.8, 0));
  g.add(cyl(4.4, 0.08, M.pcbAda, -12, 1.65, 0, 'y', 32));
  const colX = k => -17.78 + (k % 3) * 2.54 + Math.floor(k / 3) * 10.16;
  const pts = [];
  for (let k = 0; k < 12; k++) for (const z of [10.4, 7.86, -10.4, -7.86]) pts.push([colX(k), 1.6 + 2.5 + 1.5, z]);
  for (let gI = 0; gI < 4; gI++) for (const z of [10.4, 7.86, -10.4, -7.86]) g.add(box(3 * 2.54, 2.5, 2.54, M.header, colX(gI * 3 + 1), 2.85, z));
  g.add(pinField(pts, 11.5));
  const fIn = femaleHeader(6); fIn.rotation.y = -Math.PI / 2; fIn.position.set(-22.0, 1.6, -6.35); g.add(fIn);
  const fOut = femaleHeader(6); fOut.rotation.y = -Math.PI / 2; fOut.position.set(22.0, 1.6, -6.35); g.add(fOut);
  g.add(cyl(1.15, 6.3, M.capBlue, -18.5, 4.2, -2.5, 'z', 12));
  ['LAT', '/OE', 'CLK', 'DIN', 'GND', 'V+'].forEach((n, i) => pin(g, n, -22.0, 10.1, -6.35 + i * 2.54));
  for (let k = 0; k < 24; k++) { const x = k < 12 ? colX(k) : colX(23 - k), s = k < 12 ? 1 : -1; pin(g, `ch${k}+`, x, 10.6, s * 10.4); pin(g, `ch${k}-`, x, 10.6, s * 7.86); }
  return shadow(g);
}

// ---------------------------------------------------------------- TCA9548A I2C Multiplexer Module (purple)
export function tca9548a() {
  const g = group('TCA9548A I2C Multiplexer Module');
  g.add(pcb(33, 20.3, M.pcbPurple));
  holes(g, [[-12.7, 0], [12.7, 0]], 1.62, 1.3);
  const c = chip(7, 4.5); c.position.set(0, 1.6, 0); g.add(c);
  const h1 = maleHeader(12, 1, 6, 2.5); h1.position.set(-13.97, 1.6, 8.6); g.add(h1);
  const h2 = maleHeader(12, 1, 6, 2.5); h2.position.set(-13.97, 1.6, -8.6); g.add(h2);
  ['VIN', 'GND', 'SDA', 'SCL', 'RST', 'A0', 'A1', 'A2', 'SD0', 'SC0', 'SD1', 'SC1'].forEach((n, i) => pin(g, n, -13.97 + i * 2.54, 10.1, 8.6));
  ['SD2', 'SC2', 'SD3', 'SC3', 'SD4', 'SC4', 'SD5', 'SC5', 'SD6', 'SC6', 'SD7', 'SC7'].forEach((n, i) => pin(g, n, -13.97 + i * 2.54, 10.1, -8.6));
  return shadow(g);
}

// ---------------------------------------------------------------- Adafruit DS3231 Real-Time Clock (black)
// Local: board in XZ (top +y), CR1220 holder on top, right-angle header along the -z edge, legs pointing -z.
export function ds3231() {
  const g = group('Adafruit DS3231 Real-Time Clock');
  g.add(pcb(22.9, 17.8, M.pcbBlack));
  g.add(cyl(7.0, 3.6, M.steel, 1.5, 3.4, 1.8, 'y', 32));
  const c = chip(7.5, 5, 1.6); c.position.set(-7, 1.6, 4.5); c.rotation.y = Math.PI / 2; g.add(c);
  g.add(box(7 * 2.54, 2.5, 2.5, M.header, 0, 2.85, -10.2));
  const pts = []; for (let i = 0; i < 7; i++) pts.push([-7.62 + i * 2.54, 2.85, -14.2]);
  g.add(pinField(pts, 9, M.gold, 0.64, 'z'));
  ['VIN', 'GND', 'SCL', 'SDA', 'BAT', '32K', 'SQW'].forEach((n, i) => pin(g, n, -7.62 + i * 2.54, 2.85, -18.7, [0, 0, -1]));
  return shadow(g);
}
export function coinCell() { return shadow(group('CR1220 Lithium Battery', cyl(6.1, 2.0, M.nickel, 0, 1, 0, 'y', 32))); }

// ---------------------------------------------------------------- Adafruit DRV8871 DC Motor Controller
// Local centred. Black terminal blocks on the -z edge (POWER -,+ | OUT 1,2), header on +z: GND VM IN1 IN2.
export function drv8871() {
  const g = group('Adafruit DRV8871 DC Motor Controller');
  g.add(pcb(25.4, 20.3, M.pcbAda));
  holes(g, [[-7.62, 7.6], [7.62, 7.6]], 1.62, 1.3);
  const c = chip(5, 4, 1); c.position.set(2, 1.6, -0.5); g.add(c);
  const t1 = screwTerminal(2, M.black, 3.5, 8.5, 7); t1.rotation.y = Math.PI; t1.position.set(-9.2, 1.6, -6.2); g.add(t1);
  const t2 = screwTerminal(2, M.black, 3.5, 8.5, 7); t2.rotation.y = Math.PI; t2.position.set(9.2, 1.6, -6.2); g.add(t2);
  const cp = capacitor(3, 7); cp.position.set(-5, 1.6, 3); g.add(cp);
  const h = maleHeader(4, 1, 6, 2.5); h.position.set(-1.4, 1.6, 7.9); g.add(h);
  pin(g, 'POWER+', -9.2, 10.5, -6.2, [0, 1, -0.5]); pin(g, 'POWER-', -12.7, 10.5, -6.2, [0, 1, -0.5]);
  pin(g, 'OUT2', 9.2, 10.5, -6.2, [0, 1, -0.5]); pin(g, 'OUT1', 5.7, 10.5, -6.2, [0, 1, -0.5]);
  ['GND', 'VM', 'IN1', 'IN2'].forEach((n, i) => pin(g, n, -1.4 + i * 2.54, 10.1, 7.9));
  return shadow(g);
}

// ---------------------------------------------------------------- 12v to 5v Converter
// Local: centred, long axis X, lies flat. Input pigtails at +x, output pigtails at -x (trimmed to 15 mm).
export function converter() {
  const g = group('12v to 5v Converter');
  g.add(box(44, 13, 20, M.alu, 0, 6.5, 0, 1.2));
  for (let i = 0; i < 5; i++) g.add(box(30, 0.4, 1.0, M.aluDark, 0, 13.1, -6 + i * 3));
  g.add(box(2.2, 6, 12, M.black, 23, 5, 0)); g.add(box(2.2, 6, 12, M.black, -23, 5, 0));
  [[1, -2.5, 'red'], [1, 2.5, 'black'], [-1, -2.5, 'red'], [-1, 2.5, 'black']].forEach(([s, z, c]) => g.add(cyl(0.9, 15, wireMat(c), s * 31.5, 5, z, 'x', 8)));
  pin(g, 'IN+', 39, 5, -2.5, [1, 0, 0]); pin(g, 'IN-', 39, 5, 2.5, [1, 0, 0]); pin(g, 'OUT+', -39, 5, -2.5, [-1, 0, 0]); pin(g, 'OUT-', -39, 5, 2.5, [-1, 0, 0]);
  return shadow(g);
}

// ---------------------------------------------------------------- 20-pin female header bus (step 32)
export function busHeader(color) {
  const g = group(`20-pin female header (${color})`);
  g.add(femaleHeader(20));
  g.add(cyl(0.65, 50.8, wireMat('bare'), 24.13, 2.0, 1.95, 'x', 8));
  for (let i = 0; i < 20; i++) g.add(box(1.2, 1.4, 1.2, M.steel, i * 2.54, 1.8, 1.6));
  for (let i = 0; i < 20; i++) pin(g, 'p' + i, i * 2.54, 8.5, 0);
  pin(g, 'lead', -1.0, 2.0, 1.95, [-1, 0, 0]);
  return shadow(g);
}

// ---------------------------------------------------------------- Serial IIC I2C TWI 2004 LCD Module
export function lcd2004() {
  const g = group('Serial IIC I2C TWI 2004 LCD Module');
  g.add(box(98, 60, 1.6, M.pcbGreen, 0, 0, -0.8));
  g.add(box(97, 40, 7.5, M.aluDark, 0, 0, 3.75, 0.6));
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 352;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 0.0, roughness: 0.3 });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(77, 26.4), mat); scr.position.set(0, 0, 7.66); scr.userData.keep = true; g.add(scr);
  g.add(box(86, 33, 0.3, M.chip, 0, 0, 7.4));
  g.add(box(41.5, 19, 1.6, M.pcbBlack, -14, 15, -11.8));
  g.add(box(16 * 2.54, 2.5, 8.5, M.header, -14, 23.5, -5.5));
  g.add(cyl(3.5, 3, M.potBlue, -24, 16, -14.1, 'z', 16));
  { const c = chip(8, 5, 1.2); c.rotation.x = -Math.PI / 2; c.position.set(-6, 13, -12.6); g.add(c); }
  g.add(box(2.5, 4 * 2.54, 2.5, M.header, -36.0, 13.8, -13.85));
  const pts = []; for (let i = 0; i < 4; i++) pts.push([-38.5, 10.0 + i * 2.54, -13.85]);
  g.add(pinField(pts, 6, M.gold, 0.64, 'x'));
  ['GND', 'VCC', 'SDA', 'SCL'].forEach((n, i) => pin(g, n, -41.5, 10.0 + i * 2.54, -13.85, [-1, 0, 0]));
  let lastKey = '';
  const draw = (lines, on) => {
    const key = lines.join('|') + on; if (key === lastKey) return; lastKey = key;
    const x = cv.getContext('2d');
    x.fillStyle = on ? '#1a4fe0' : '#0d1f55'; x.fillRect(0, 0, cv.width, cv.height);
    const cw = (cv.width - 28) / 20, ch = (cv.height - 24) / 4;
    for (let r = 0; r < 4; r++) for (let k = 0; k < 20; k++) { x.fillStyle = on ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.035)'; x.fillRect(14 + k * cw + 2, 12 + r * ch + 4, cw - 5, ch - 8); }
    if (on) {
      x.fillStyle = '#f2f6ff'; x.shadowColor = 'rgba(200,220,255,0.6)'; x.shadowBlur = 6;
      x.font = `600 ${Math.floor(ch * 0.74)}px "JetBrains Mono", Consolas, monospace`; x.textBaseline = 'middle'; x.textAlign = 'center';
      lines.forEach((l, r) => { for (let k = 0; k < Math.min(20, l.length); k++) x.fillText(l[k], 14 + k * cw + cw / 2, 12 + r * ch + ch / 2 + 2); });
      x.shadowBlur = 0;
    }
    tex.needsUpdate = true;
  };
  draw(['', '', '', ''], false);
  g.userData.setText = (lines, on = true) => { draw(lines, on); mat.emissiveIntensity = on ? 0.85 : 0.0; };
  return shadow(g);
}

// ---------------------------------------------------------------- MicroSD Card Module
// Local: PCB in XY, components +z. Header at the +x edge (pins point +x): CS SCK MOSI MISO VCC GND (top->bottom).
export function sdModule() {
  const g = group('MicroSD Card Module');
  g.add(box(42, 24, 1.6, M.pcbBlue, 0, 0, 0.8));
  g.add(box(14, 15, 2, M.steel, -11, 0, 2.6));
  g.add(box(5, 4, 1.5, M.chip, 6, 4, 2.4)); g.add(box(4, 4, 1.2, M.chip, 6, -4, 2.2));
  g.add(box(2.5, 6 * 2.54, 2.5, M.header, 18.5, 0, 2.85));
  const pts = []; for (let i = 0; i < 6; i++) pts.push([21.5, 6.35 - i * 2.54, 2.85]);
  g.add(pinField(pts, 6, M.gold, 0.64, 'x'));
  ['CS', 'SCK', 'MOSI', 'MISO', 'VCC', 'GND'].forEach((n, i) => pin(g, n, 24.5, 6.35 - i * 2.54, 2.85, [1, 0, 0]));
  return shadow(g);
}
export function sdCard() { return shadow(group('Industrial MicroSD Card', box(11, 0.8, 15, M.chip, 0, 0.4, 0, 0.3))); }

// ---------------------------------------------------------------- Waterproof Button (12 mm hole)
// Local: axis +z out of the panel; panel front face at z=0. Solder blades behind.
export function pushButton(capMat) {
  const g = group('Waterproof Button');
  g.add(cyl(7.2, 1.8, M.steel, 0, 0, 0.9, 'z', 32));
  g.add(cyl(4.6, 2.2, capMat, 0, 0, 2.9, 'z', 32));
  g.add(cyl(5.9, 18, M.steelDark, 0, 0, -9, 'z', 24));
  g.add(box(0.5, 2.6, 4.5, M.steel, -2.3, 0, -20.2)); g.add(box(0.5, 2.6, 4.5, M.steel, 2.3, 0, -20.2));
  pin(g, 'sig', -2.3, 0, -22.2, [0, 0, -1]); pin(g, 'gnd', 2.3, 0, -22.2, [0, 0, -1]);
  return shadow(g);
}
// the button's nut (separate part: removed and refitted in steps 2-3). Local: axis z.
export function buttonNut() { const n = cyl(7.4, 2.2, M.steel, 0, 0, 0, 'z', 6); n.rotation.z = Math.PI / 6; return shadow(group('Button nut', n)); }

// ---------------------------------------------------------------- PC Fan 40x20mm (stirrer)
export function stirFan() {
  const g = group('PC Fan 40x20mm');
  const s = new THREE.Shape(); s.moveTo(-20, -20); s.lineTo(20, -20); s.lineTo(20, 20); s.lineTo(-20, 20); s.lineTo(-20, -20);
  const h = new THREE.Path(); h.absarc(0, 0, 19, 0, Math.PI * 2, true); s.holes.push(h);
  [[-16, -16], [16, -16], [16, 16], [-16, 16]].forEach(([x, y]) => { const p = new THREE.Path(); p.absarc(x, y, 1.7, 0, Math.PI * 2, true); s.holes.push(p); });
  const fl = new THREE.ExtrudeGeometry(s, { depth: 3, bevelEnabled: false }); fl.rotateX(-Math.PI / 2);
  g.add(new THREE.Mesh(fl, M.black)); const f2 = new THREE.Mesh(fl, M.black); f2.position.y = 17; g.add(f2);
  const shroud = new THREE.Mesh(new THREE.CylinderGeometry(19.6, 19.6, 14, 40, 1, true), M.black); shroud.position.y = 10; g.add(shroud);
  [[-18, -18], [18, -18], [18, 18], [-18, 18]].forEach(([x, z]) => g.add(box(4, 14, 4, M.black, x, 10, z)));
  const rotor = new THREE.Group(); rotor.name = 'rotor';
  rotor.add(cyl(12.5, 17, M.black, 0, 10, 0, 'y', 32)); rotor.add(cyl(11, 0.3, M.label, 0, 18.6, 0, 'y', 32));
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; const b = box(7, 0.8, 9, M.black); b.position.set(Math.cos(a) * 15.5, 10, Math.sin(a) * 15.5); b.rotation.y = -a; b.rotateX(0.55); rotor.add(b); }
  g.add(rotor); g.userData.rotor = rotor;
  g.add(cyl(0.7, 15, wireMat('red'), 19.5, 6, 27.5, 'z', 8)); g.add(cyl(0.7, 15, wireMat('black'), 17, 6, 27.5, 'z', 8));
  pin(g, '+', 19.5, 6, 35, [0, 0, 1]); pin(g, '-', 17, 6, 35, [0, 0, 1]);
  return shadow(g);
}
export function fanMagnets() { const g = group('Neodymium Magnets 12x6x3mm (x2)'); g.add(box(12, 3, 6, M.nickel, -6.05, 1.5, 0, 0.3)); g.add(box(12, 3, 6, M.nickel, 6.05, 1.5, 0, 0.3)); return shadow(g); }

// ---------------------------------------------------------------- PTC Heating Plate 80C
export function heaterPlate() {
  const g = group('PTC Heating Plate 80C');
  g.add(box(21, 5, 35, M.alu, 0, 2.5, 0, 0.6));
  g.add(box(16, 5.4, 6, M.kapton, 0, 2.5, 18.5));
  [-4, 4].forEach(x => { g.add(cyl(1.4, 15, M.pcbRed, x, 2.5, 29, 'z', 10)); g.add(cyl(0.8, 6, M.steel, x, 2.5, 39, 'z', 8)); });
  pin(g, 'a', -4, 2.5, 42, [0, 0, 1]); pin(g, 'b', 4, 2.5, 42, [0, 0, 1]);
  return shadow(g);
}

// ---------------------------------------------------------------- NTC thermistor assembly (steps 18-21)
export function thermistorUnit() {
  const g = group('NTC thermistor assembly');
  g.add(cyl(3.2, 16, M.heatshrink, 0, 0, 0, 'z', 16));
  g.add(cyl(1.1, 22, M.heatshrink, 0, 0, -18, 'z', 10));
  g.add(cyl(0.9, 2.2, M.capBlue, 0, 0, -30, 'z', 10));
  g.add(pinField([[-2.54, 0, 10.5], [0, 0, 10.5], [2.54, 0, 10.5]], 6, M.gold, 0.64, 'z'));
  pin(g, 'S', 0, 0, 13.6, [0, 0, 1]); pin(g, '+', -2.54, 0, 13.6, [0, 0, 1]); pin(g, '-', 2.54, 0, 13.6, [0, 0, 1]);
  return shadow(g);
}

// ---------------------------------------------------------------- 5 mm LEDs
export function led5mm(color, clear = false) {
  const g = group('LED');
  const mat = new THREE.MeshStandardMaterial({ color: clear ? '#e9eef2' : color, roughness: 0.18, emissive: color, emissiveIntensity: 0, transparent: clear, opacity: clear ? 0.8 : 1 });
  g.add(cyl(2.5, 5.6, mat, 0, 0, 2.8, 'z', 20));
  const dome = new THREE.Mesh(new THREE.SphereGeometry(2.5, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat); dome.rotation.x = Math.PI / 2; dome.position.z = 5.6; g.add(dome);
  g.add(cyl(2.95, 1, mat, 0, 0, 0.5, 'z', 20));
  g.add(cyl(0.25, 5, M.steel, -1.27, 0, -2.5, 'z', 6)); g.add(cyl(0.25, 5, M.steel, 1.27, 0, -2.5, 'z', 6));
  g.userData.setOn = v => { mat.emissiveIntensity = v * 3.5; }; g.userData.mat = mat;
  pin(g, '+', -1.27, 0, -5, [0, 0, -1]); pin(g, '-', 1.27, 0, -5, [0, 0, -1]);
  return shadow(g);
}

// ---------------------------------------------------------------- TSL2591 Light Sensor (black, STEMMA QT)
// Local: PCB in XY, sensor faces +z, 6-pin header on the -y edge, pins pointing -z.
export function tsl2591() {
  const g = group('TSL2591 Light Sensor');
  g.add(box(25.4, 17.8, 1.6, M.pcbBlack, 0, 0, -0.8, 0.8));
  g.add(box(2.2, 2.2, 0.9, M.chip, 0, 2, 0.45)); g.add(box(1.0, 1.0, 0.1, new THREE.MeshStandardMaterial({ color: '#5a3416', roughness: 0.1 }), 0, 2, 0.95));
  [-9, 9].forEach(x => g.add(box(4, 3.2, 3, M.white, x, 0.5, 1.5)));
  g.add(box(6 * 2.54, 2.5, 2.5, M.header, 0, -7.1, -2.85));
  const pts = []; for (let i = 0; i < 6; i++) pts.push([-6.35 + i * 2.54, -7.1, -6.6]);
  g.add(pinField(pts, 6, M.gold, 0.64, 'z'));
  ['VIN', 'GND', '3Vo', 'INT', 'SDA', 'SCL'].forEach((n, i) => pin(g, n, -6.35 + i * 2.54, -7.1, -9.6, [0, 0, -1]));
  return shadow(g);
}

// ---------------------------------------------------------------- DC Motor Peristaltic Pump (standing)
export function pump() {
  const g = group('DC Motor Peristaltic Pump');
  g.add(cyl(10.6, 21, M.pumpHead, 0, 10.5, 0, 'y', 32));
  g.add(cyl(8.5, 0.6, M.luer, 0, 21.3, 0, 'y', 24));
  [-4.2, 4.2].forEach(x => { g.add(cyl(1.7, 9, M.pumpHead, x, 5, 13.5, 'z', 14)); g.add(cyl(2.1, 1.6, M.pumpHead, x, 5, 17, 'z', 14)); });
  const can = new THREE.CylinderGeometry(10, 10, 26, 32); can.scale(1, 1, 0.76);
  const m = new THREE.Mesh(can, M.steel); m.position.y = 35; g.add(m);
  g.add(cyl(5, 1.5, M.pumpHead, 0, 48.6, 0, 'y', 20));
  g.add(box(1.5, 3, 0.4, M.copper, -4.5, 49.5, 0)); g.add(box(1.5, 3, 0.4, M.copper, 4.5, 49.5, 0));
  g.add(cyl(1.0, 0.3, M.pcbRed, -4.5, 49.0, 2.4, 'y', 8));
  pin(g, '+', -4.5, 51.2, 0); pin(g, '-', 4.5, 51.2, 0); pin(g, 'in', -4.2, 5, 17.8); pin(g, 'out', 4.2, 5, 17.8);
  return shadow(g);
}

export function rubberFoot() { const geo = new THREE.CylinderGeometry(6.6, 9, 3.5, 4, 1); geo.rotateY(Math.PI / 4); geo.translate(0, 1.75, 0); return shadow(group('Square Adhesive Rubber Feet', new THREE.Mesh(geo, M.rubber))); }
export function rod(len = 300) { return shadow(group('5mm x 300mm Steel Rod', cyl(2.5, len, M.steel, 0, 0, 0, 'z', 20))); }
export function magnet() { return shadow(group('Neodymium Magnets 12x6x3mm', box(12, 6, 3, M.nickel, 0, 0, 0, 0.4))); }
export function standoff(size = 'M3', h = 10) { const g = group(`${size} x ${h}mm Female Standoff`); g.add(cyl(size === 'M3' ? 2.9 : 2.5, h, M.brass, 0, h / 2, 0, 'y', 6)); return shadow(g); }
// hex screw: head at y=0..2.5, shank pointing -y
export function screw(size = 'M3', len = 10) {
  const g = group(`${len}mm ${size} screw`); const r = size === 'M3' ? 1.5 : 1.25;
  g.add(cyl(r * 1.7, 2.5, M.screw, 0, 1.25, 0, 'y', 16)); g.add(cyl(r * 0.8, 0.2, M.chip, 0, 2.55, 0, 'y', 6)); g.add(cyl(r, len, M.steelDark, 0, -len / 2, 0, 'y', 10));
  return shadow(g);
}
export function barrelJack() {
  const g = group('Barrel Jack Connector 5.5x2.1mm');
  g.add(cyl(5.6, 12, M.steel, 0, 0, -3, 'z', 24)); g.add(cyl(7.4, 2.2, M.steel, 0, 0, -4.2, 'z', 6));
  g.add(cyl(3.2, 12.2, M.chip, 0, 0, -2.9, 'z', 20)); g.add(cyl(1.0, 12.4, M.gold, 0, 0, -2.9, 'z', 12));
  g.add(box(1, 3, 6, M.steel, 4, 0, -11)); g.add(box(1, 3, 6, M.steel, 0, 0, -11));
  pin(g, '+', 0, 0, -14, [0, 0, -1]); pin(g, '-', 4, 0, -14, [0, 0, -1]);
  return shadow(g);
}
export function rockerSwitch() {
  const g = group('Rocker Switch');
  g.add(box(21, 15, 2, M.black, 0, 0, 1, 0.8)); const r = box(15, 10, 4, M.btnBlack, 0, 0, 3.2, 1); r.rotation.x = 0.18; g.add(r);
  g.add(box(18, 12, 14, M.black, 0, 0, -7)); g.add(box(1, 4, 6, M.steel, -5, 0, -16)); g.add(box(1, 4, 6, M.steel, 5, 0, -16));
  pin(g, 'a', -5, 0, -19, [0, 0, -1]); pin(g, 'b', 5, 0, -19, [0, 0, -1]);
  return shadow(g);
}

// ---------------------------------------------------------------- labware
export function vial() {
  const g = group('90mL Glass Vial');
  const R = 20.3, H = 100.5, t = 1.6, pts = [V2(0, 0)];
  for (let i = 0; i <= 6; i++) { const a = i / 6 * Math.PI / 2; pts.push(V2(R - 3 + 3 * Math.sin(a), 3 - 3 * Math.cos(a))); }
  pts.push(V2(R, H - 3), V2(R + 0.6, H - 2.5), V2(R + 0.6, H), V2(R - t, H), V2(R - t, 3 + t), V2(R - t - 2, t), V2(0, t));
  const glass = new THREE.Mesh(new THREE.LatheGeometry(pts, 64), M.glass); glass.renderOrder = 3; g.add(glass);
  g.userData.inner = { r: R - t - 0.15, floor: t, height: H };
  return g;
}
export function liquid(r, h, mat) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 48), mat); m.position.y = h / 2; m.renderOrder = 2; return m; }
export function stirBar() { const c = new THREE.Mesh(new THREE.CapsuleGeometry(4, 12, 6, 16), M.ptfe); c.rotation.z = Math.PI / 2; c.position.y = 4; return shadow(group('8mm x 20mm olive-shaped stir bar', c)); }
export function capHoles() { const h = [[0, 0]]; for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + Math.PI / 2; h.push([Math.cos(a) * 11, Math.sin(a) * 11]); } return h; }
export function siliconeCap(mat = M.silBlack, name = 'Cast silicone rubber cap') {
  const g = group(name);
  const prof = [V2(0, -20), V2(16.5, -20), V2(17.5, -19), V2(17.5, 0), V2(22.5, 0), V2(22.5, 20.5), V2(21.5, 21.5), V2(0, 21.5)];
  g.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 48), mat));
  capHoles().forEach(([x, z]) => g.add(cyl(1.25, 0.2, M.chip, x, 21.6, z, 'y', 12)));
  return shadow(g);
}
export function needle(len = 50.8, name) {
  const g = group(name || `14 Gauge Dispensing Needle (${len > 60 ? '4"' : '2"'})`);
  g.add(cyl(1.05, len, M.steel, 0, len / 2, 0, 'y', 12));
  g.add(cyl(3.0, 9, M.hubGreen, 0, len + 4.5, 0, 'y', 16, 2.0)); g.add(cyl(4.0, 3, M.hubGreen, 0, len + 10, 0, 'y', 16)); g.add(box(10, 1, 2, M.hubGreen, 0, len + 11, 0));
  pin(g, 'hub', 0, len + 11.6, 0);
  return shadow(g);
}
export function thermoNeedle() {
  const g = group('Thermistor needle');
  g.add(needle(101.6));
  g.add(cyl(4.8, 20, M.heatshrink, 0, 101.6 + 23, 0, 'y', 20)); g.add(cyl(1.3, 1.2, M.sealant, 0, -0.4, 0, 'y', 10));
  g.add(box(2.5, 3 * 2.54, 2.5, M.header, 0, 101.6 + 34.2, 0));
  g.add(pinField([[0, 101.6 + 38, -2.54], [0, 101.6 + 38, 0], [0, 101.6 + 38, 2.54]], 6));
  pin(g, 'S', 0, 101.6 + 41, 0); pin(g, '+', 0, 101.6 + 41, -2.54); pin(g, '-', 0, 101.6 + 41, 2.54);
  return shadow(g);
}
export function luerMale() { const g = group('Barb-To-Male Luer Lock Adapter'); g.add(cyl(3.3, 9, M.luer, 0, 4.5, 0, 'y', 16)); g.add(cyl(2.0, 8, M.luer, 0, 13, 0, 'y', 12, 1.6)); g.add(box(9, 1.2, 1.8, M.luer, 0, 2, 0)); return g; }
export function luerFemale() { const g = group('Barb-To-Female Luer Lock Adapter'); g.add(cyl(3.6, 8, M.luer, 0, 4, 0, 'y', 16)); g.add(cyl(2.0, 8, M.luer, 0, 12, 0, 'y', 12, 1.6)); g.add(box(8, 1.2, 1.4, M.luer, 0, 7.5, 0)); return g; }
export function luerCap() { return shadow(group('Luer Lock cap', cyl(3.4, 6, M.white, 0, 3, 0, 'y', 16), cyl(2.2, 2, M.white, 0, 7, 0, 'y', 12))); }
export function syringeFilter() {
  const g = group('PES 0.22um Syringe Filter');
  g.add(cyl(12.5, 3.5, M.white, 0, 6, 0, 'y', 32)); g.add(cyl(12.6, 1.2, M.filterGreen, 0, 8.3, 0, 'y', 32)); g.add(cyl(12.6, 1.2, M.filterGreen, 0, 3.7, 0, 'y', 32));
  g.add(cyl(2.4, 6, M.luer, 0, 0, 0, 'y', 12)); g.add(cyl(1.8, 5, M.luer, 0, 11.5, 0, 'y', 12));
  return shadow(g);
}
export function beaker(r = 34, h = 92, name = 'Beaker') {
  const g = group(name);
  const pts = [V2(0, 0), V2(r - 2, 0), V2(r, 2), V2(r, h), V2(r + 2.5, h + 1.5), V2(r - 1.4, h), V2(r - 1.4, 3), V2(r - 3, 1.4), V2(0, 1.4)];
  const glass = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), M.glass); glass.renderOrder = 3; g.add(glass);
  g.userData.inner = { r: r - 1.6, floor: 1.4 };
  return g;
}
export function conical(ml = 15, capMat = M.capBlue) {
  const r = ml === 15 ? 8.5 : 14.5, h = ml === 15 ? 118 : 115, cone = ml === 15 ? 20 : 18;
  const g = group(`${ml}mL ${ml === 15 ? 'conical' : 'centrifuge'} tube`);
  const pts = [V2(0, 0), V2(1.5, 0), V2(r, cone), V2(r, h), V2(r - 1, h), V2(r - 1, cone + 1), V2(0.5, 1.2), V2(0, 1.2)];
  const glass = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), M.glass); glass.renderOrder = 3; g.add(glass);
  g.add(cyl(r + 1.2, 12, capMat, 0, h + 5, 0, 'y', 32));
  for (let i = 1; i <= 5; i++) g.add(box(r * 0.8, 0.3, 0.3, M.chip, r * 0.5, cone + i * (h - cone) / 6, r - 0.2));
  g.userData.inner = { r: r - 1.2, floor: cone, height: h };
  return g;
}
export function cup(name = 'Plastic cup') { const g = group(name); const pts = [V2(0, 0), V2(22, 0), V2(27, 55), V2(26, 55), V2(21, 1.2), V2(0, 1.2)]; g.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 32), M.luer)); return g; }
export function foilWrap(r = 34, h = 175) {
  const geo = new THREE.CylinderGeometry(r, r * 1.05, h, 40, 14, false); const p = geo.attributes.position;
  let s = 7; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < p.count; i++) { const k = 1 + (rnd() - 0.5) * 0.08; p.setXYZ(i, p.getX(i) * k, p.getY(i), p.getZ(i) * k); }
  geo.computeVertexNormals(); geo.translate(0, h / 2, 0);
  const g = group('Aluminum foil + autoclave tape', new THREE.Mesh(geo, M.alu));
  g.add(box(16, 40, 0.6, M.tape, 0, h * 0.55, r + 0.8));
  return shadow(g);
}
export function sealantBlob(r = 4, seed = 1) {
  const geo = new THREE.IcosahedronGeometry(r, 2); const p = geo.attributes.position;
  let s = seed * 9301 + 7; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < p.count; i++) { const k = 0.8 + rnd() * 0.35; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.6, p.getZ(i) * k); }
  geo.computeVertexNormals();
  return shadow(group('Black High Temp Silicone Sealant', new THREE.Mesh(geo, M.sealant)));
}
export function solderBlob(r = 1.2) { return shadow(group('Solder joint', new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), M.steel))); }
export function tapeStrip(w, h, name = 'Double Sided Tape Heavy Duty') { return group(name, box(w, 0.8, h, M.tape, 0, 0.4, 0)); }
export function topLabel() {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 96; const x = cv.getContext('2d');
  x.fillStyle = '#e9e6dc'; x.fillRect(0, 0, 256, 96); x.fillStyle = '#111'; x.font = 'bold 64px Inter, Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('TOP', 128, 52);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.BoxGeometry(30, 0.3, 11), [M.tape, M.tape, new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }), M.tape, M.tape, M.tape]);
  m.userData.keep = true;
  return group('Clear tape labelled TOP', m);
}
export function supportBits(seed = 3) { const g = group('3D printed support material'); let s = seed; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280; for (let i = 0; i < 9; i++) { const b = box(2 + rnd() * 5, 0.8 + rnd(), 1 + rnd() * 3, M.pla, (rnd() - 0.5) * 40, 0.5, (rnd() - 0.5) * 30); b.rotation.y = rnd() * 3; g.add(b); } return shadow(g); }

// Loose prepared wire laid flat on the bench (the manual's "Prepare wires" photos). Local: along x on y=0.
export function looseWire(lengthMM, color, ends = 'female-male', seed = 1) {
  let s = seed * 77 + 3; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const pts = []; const n = 9, L = Math.max(30, lengthMM * 0.92);
  for (let i = 0; i <= n; i++) { const u = i / n; pts.push(new THREE.Vector3(u * L - L / 2, 0.9, Math.sin(u * Math.PI) * (4 + rnd() * 6) * (seed % 2 ? 1 : -1))); }
  const curve = new THREE.CatmullRomCurve3(pts);
  const g = group(`${(lengthMM / 10).toFixed(lengthMM % 10 ? 1 : 0)}cm ${color} wire (${ends})`, new THREE.Mesh(new THREE.TubeGeometry(curve, 50, 0.85, 6, false), wireMat(color)));
  const [a, b] = ends.split('-');
  const endPiece = (kind, u) => {
    const p = curve.getPointAt(u), t = curve.getTangentAt(u).multiplyScalar(u < 0.5 ? -1 : 1);
    const m = new THREE.Group();
    if (kind === 'female') m.add(box(2.6, 2.6, 13, M.header, 0, 0, -6.5));
    else if (kind === 'male') { m.add(box(2.6, 2.6, 13, M.header, 0, 0, -6.5)); m.add(box(0.64, 0.64, 6, M.gold, 0, 0, 3)); }
    else m.add(cyl(0.55, 6, M.steel, 0, 0, 0, 'z', 6));
    m.position.copy(p); m.lookAt(p.clone().add(t)); g.add(m);
  };
  endPiece(a, 0); endPiece(b, 1);
  return shadow(g);
}

// Merge a part's static child meshes by material to cut draw calls.
export function optimizePart(group) {
  if (!group.isGroup) return group;
  group.updateMatrixWorld(true);
  const inv = group.matrixWorld.clone().invert();
  const buckets = new Map(), victims = [];
  group.traverse(o => {
    if (o === group || !o.isMesh || o.isInstancedMesh || o.userData.keep) return;
    for (let q = o.parent; q && q !== group; q = q.parent) if (q.name === 'rotor' || q.userData.keep) return;
    const m = o.material; if (Array.isArray(m)) return;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.applyMatrix4(inv.clone().multiply(o.matrixWorld));
    if (!buckets.has(m)) buckets.set(m, []); buckets.get(m).push(g); victims.push(o);
  });
  if (victims.length < 3) return group;
  victims.forEach(o => o.parent.remove(o));
  const empties = []; group.traverse(o => { if (o !== group && o.isGroup && o.children.length === 0 && o.name !== 'rotor') empties.push(o); }); empties.forEach(o => o.parent && o.parent.remove(o));
  for (const [mat, geos] of buckets) { const merged = mergeGeometries(geos, false); if (!merged) continue; merged.computeBoundingSphere(); const mesh = new THREE.Mesh(merged, mat); mesh.castShadow = merged.boundingSphere.radius > 3; mesh.receiveShadow = true; group.add(mesh); }
  return group;
}
