// Procedural models of the off-the-shelf components (boards, pumps, fan, glassware...).
// Every builder returns a THREE.Group in a documented local frame. Named connection
// points live in group.userData.pins (local coordinates) so wires can find them.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { M, wireMat } from './materials.js';

const V2 = (x, y) => new THREE.Vector2(x, y);
export function shadow(o) { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; }
export function box(w, h, d, mat, x = 0, y = 0, z = 0, r = 0) {
  const g = r > 0 ? new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2.01, h / 2.01, d / 2.01)) : new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); return m;
}
// cylinder centred at (x,y,z) along an axis
export function cyl(r, h, mat, x = 0, y = 0, z = 0, axis = 'y', seg = 24, rt = null) {
  const g = new THREE.CylinderGeometry(rt ?? r, r, h, seg);
  if (axis === 'x') g.rotateZ(-Math.PI / 2); else if (axis === 'z') g.rotateX(Math.PI / 2);
  const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); return m;
}
function group(name, ...kids) { const g = new THREE.Group(); g.name = name; g.userData.pins = {}; kids.forEach(k => g.add(k)); return g; }
function pin(g, name, x, y, z) { g.userData.pins[name] = new THREE.Vector3(x, y, z); }

// Instanced square pins (male header pins / holes). pts: array of [x,y,z]
function pinField(pts, len, mat = M.gold, w = 0.64) {
  const g = new THREE.BoxGeometry(w, len, w);
  const im = new THREE.InstancedMesh(g, mat, pts.length);
  const o = new THREE.Object3D();
  pts.forEach((p, i) => { o.position.set(p[0], p[1], p[2]); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
  im.castShadow = true; return im;
}
// Male header strip along X: n pins x rows (rows go +z), plastic base on y=0..2.5
function maleHeader(n, rows = 1, up = 6, down = 3) {
  const p = 2.54, g = group('maleHeader');
  g.add(box(n * p, 2.5, rows * p, M.header, (n - 1) * p / 2, 1.25, (rows - 1) * p / 2));
  const pts = [];
  for (let r = 0; r < rows; r++) for (let i = 0; i < n; i++) pts.push([i * p, 2.5 + (up - down) / 2 - 1.25, r * p]);
  g.add(pinField(pts, up + down + 2.5));
  return g;
}
// Female header strip along X (n x rows), h tall, with dark holes on top
function femaleHeader(n, rows = 1, h = 8.5) {
  const p = 2.54, g = group('femaleHeader');
  g.add(box(n * p, h, rows * p, M.header, (n - 1) * p / 2, h / 2, (rows - 1) * p / 2));
  const pts = [];
  for (let r = 0; r < rows; r++) for (let i = 0; i < n; i++) pts.push([i * p, h + 0.02, r * p]);
  const holes = pinField(pts, 0.05, M.chip, 1.0); holes.castShadow = false; g.add(holes);
  return g;
}
// screw terminal block: n positions along X from 0, wire entries face +z
function screwTerminal(n, mat = M.termBlue) {
  const p = 5.08, g = group('terminal');
  g.add(box(n * p, 10, 7.6, mat, (n - 1) * p / 2, 5, 0, 0.6));
  for (let i = 0; i < n; i++) {
    g.add(cyl(1.6, 0.6, M.steelDark, i * p, 10.1, -1.2, 'y', 12));
    g.add(box(3.4, 3.4, 0.5, M.chip, i * p, 4.2, 3.85));
  }
  return g;
}
function chip(w, d, h = 1.2, legs = true) {
  const g = group('chip'); g.add(box(w, h, d, M.chip, 0, h / 2, 0, 0.2));
  if (legs) g.add(box(w * 0.92, 0.25, d + 1.6, M.steel, 0, 0.15, 0));
  return g;
}
function smd(x, z, mat = M.chip, w = 1.6, d = 0.8) { return box(w, 0.6, d, mat, x, 1.9, z); }
function pcb(w, d, mat, t = 1.6, r = 1.2) { return box(w, t, d, mat, 0, t / 2, 0, r); }
function capacitor(r, h, mat = M.capBlack) {
  const g = group('cap'); g.add(cyl(r, h, mat, 0, h / 2, 0, 'y', 20));
  g.add(cyl(r * 0.92, 0.3, M.alu, 0, h + 0.1, 0, 'y', 20)); return g;
}
function mountHoles(g, pts, y = 1.62) { pts.forEach(([x, z]) => g.add(cyl(1.7, 0.05, M.gold, x, y, z, 'y', 16))); }

// ---------------------------------------------------------------- Arduino Mega 2560
// Local frame: PCB in XZ plane, top surface y = 1.6. Arduino board coordinates (x along the
// long edge from the USB end, y from the power/analog edge) map to local (x, -y).
export function arduinoMega() {
  const g = group('Arduino Mega 2560 R3');
  const W = 101.6, D = 53.3;
  const shape = new THREE.Shape();
  shape.moveTo(0, 0); shape.lineTo(W - 2.5, 0); shape.lineTo(W, 2.5); shape.lineTo(W, D - 2.5); shape.lineTo(W - 2.5, D); shape.lineTo(0, D); shape.lineTo(0, 0);
  [[13.97, 2.54], [15.24, 50.8], [66.04, 7.62], [66.04, 35.56], [90.17, 50.8], [96.52, 2.54]].forEach(([x, y]) => { const h = new THREE.Path(); h.absarc(x, y, 1.6, 0, Math.PI * 2, true); shape.holes.push(h); });
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 1.6, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2); // shape y -> -z, extrusion depth -> +y (0..1.6)
  g.add(new THREE.Mesh(geo, M.pcbArduino));
  const P = (x, y) => [x, -y];
  { const [x, z] = P(4, 38.1); g.add(box(16, 11, 12, M.steel, x, 1.6 + 5.5, z, 0.6)); g.add(box(1, 7, 8, M.chip, x - 7.6, 1.6 + 5.5, z)); }
  { const [x, z] = P(3, 7.6); g.add(box(14, 11, 9, M.black, x, 1.6 + 5.5, z, 0.8)); g.add(cyl(3.1, 1, M.steelDark, x - 7.1, 1.6 + 5.5, z, 'x', 16)); }
  const fh = (n, rows, x, y) => { const h = femaleHeader(n, rows); const [lx, lz] = P(x, y); h.position.set(lx, 1.6, lz); g.add(h); return h; };
  fh(10, 1, 17.0, 50.8); fh(8, 1, 44.45, 50.8); fh(8, 1, 66.04, 50.8);
  fh(8, 1, 27.94, 2.54); fh(8, 1, 50.8, 2.54); fh(8, 1, 73.66, 2.54);
  { const h = femaleHeader(18, 2); h.rotation.y = Math.PI / 2; const [lx, lz] = P(93.98, 4.32); h.position.set(lx, 1.6, lz); g.add(h); }
  { const c = chip(14, 14, 1.4); c.rotation.y = Math.PI / 4; const [x, z] = P(55, 27); c.position.set(x, 1.6, z); g.add(c); }
  { const c = chip(5, 5, 1.0); const [x, z] = P(22, 30); c.position.set(x, 1.6, z); g.add(c); }
  { const [x, z] = P(30, 12); g.add(box(11, 3.5, 4.5, M.alu, x, 1.6 + 1.75, z, 1.5)); }
  { const [x, z] = P(9, 50); g.add(box(6, 3, 6, M.steel, x, 3.1, z)); g.add(cyl(1.6, 1.2, M.pcbRed, x, 4.8, z, 'y', 12)); }
  [[22, 18], [26, 18], [36, 20], [38, 36], [76, 22], [80, 36], [45, 44], [70, 44]].forEach(([x, y], i) => { const [lx, lz] = P(x, y); g.add(smd(lx, lz, i % 2 ? M.chip : M.copper)); });
  { const c = capacitor(3.2, 6.5); const [x, z] = P(9, 12); c.position.set(x, 1.6, z); g.add(c); }
  { const c = capacitor(3.2, 6.5); const [x, z] = P(17, 7.5); c.position.set(x, 1.6, z); g.add(c); }
  const top = 10.1;
  const setPin = (name, x, y) => { const [lx, lz] = P(x, y); pin(g, name, lx, top, lz); };
  for (let k = 0; k < 8; k++) setPin('D' + (14 + k), 66.04 + k * 2.54, 50.8);
  setPin('SDA', 66.04 + 6 * 2.54, 50.8); setPin('SCL', 66.04 + 7 * 2.54, 50.8);
  for (let k = 0; k < 8; k++) setPin('A' + (8 + k), 73.66 + k * 2.54, 2.54);
  setPin('5V', 27.94 + 4 * 2.54, 2.54); setPin('GNDp', 27.94 + 5 * 2.54, 2.54);
  for (let r = 0; r < 18; r++) {
    const y = 47.5 - r * 2.54;
    if (r === 0) { setPin('5Vd', 93.98, y); setPin('5Vd2', 96.52, y); }
    else if (r === 17) { setPin('GNDd', 93.98, y); setPin('GNDd2', 96.52, y); }
    else { setPin('D' + (20 + 2 * r), 93.98, y); setPin('D' + (21 + 2 * r), 96.52, y); }
  }
  return shadow(g);
}

// Motor Shield V2 (Uno footprint, PCA9685 + TB6612). Same local convention as the Mega.
export function motorShield() {
  const g = group('Motor Shield V2');
  const W = 68.6, D = 53.3;
  const b = pcb(W, D, M.pcbBlue); b.position.set(W / 2, 0, -D / 2); g.add(b);
  const P = (x, y) => [x, -y];
  [[17.0, 50.8, 10], [44.45, 50.8, 8], [27.94, 2.54, 8], [50.8, 2.54, 6]].forEach(([x, y, n]) => {
    const h = maleHeader(n, 1, 3, 9); const [lx, lz] = P(x, y); h.position.set(lx, -2.5, lz); g.add(h);
  });
  const t1 = screwTerminal(5, M.termGreen); t1.rotation.y = Math.PI / 2; { const [x, z] = P(4.5, 44); t1.position.set(x, 1.6, z); } g.add(t1);
  const t2 = screwTerminal(5, M.termGreen); t2.rotation.y = -Math.PI / 2; { const [x, z] = P(64, 24); t2.position.set(x, 1.6, z); } g.add(t2);
  const t3 = screwTerminal(2, M.termGreen); { const [x, z] = P(12, 6); t3.position.set(x, 1.6, z); } g.add(t3);
  [[32, 26, 7, 7], [46, 32, 6, 4], [46, 20, 6, 4], [56, 38, 6, 4]].forEach(([x, y, w, d]) => { const c = chip(w, d, 1.2); const [lx, lz] = P(x, y); c.position.set(lx, 1.6, lz); g.add(c); });
  { const c = capacitor(4, 8); const [x, z] = P(22, 14); c.position.set(x, 1.6, z); g.add(c); }
  const dots = []; for (let i = 0; i < 12; i++) for (let j = 0; j < 4; j++) dots.push([22 + i * 2.54, 1.62, -(40 + j * 2.54)]);
  const pf = pinField(dots, 0.04, M.gold, 1.2); pf.castShadow = false; g.add(pf);
  const tp = (name, x, y) => { const [lx, lz] = P(x, y); pin(g, name, lx, 12, lz); };
  ['M1a', 'M1b', 'GNDm12', 'M2a', 'M2b'].forEach((n, i) => tp(n, 4.5, 44 - i * 5.08));
  ['M3a', 'M3b', 'GNDm34', 'M4a', 'M4b'].forEach((n, i) => tp(n, 64, 24 + i * 5.08));
  tp('PWR+', 12, 6); tp('PWR-', 12 + 5.08, 6);
  return shadow(g);
}

// L298N dual H-bridge (heater controller), red board with heatsink. Local: centred, top y=1.6.
export function l298n() {
  const g = group('L298N Heater Controller');
  g.add(pcb(43, 43, M.pcbRed));
  mountHoles(g, [[-18.5, -18.5], [18.5, -18.5], [-18.5, 18.5], [18.5, 18.5]]);
  const hs = group('heatsink');
  hs.add(box(24, 4, 15, M.aluDark, 0, 2, 0));
  for (let i = 0; i < 7; i++) hs.add(box(1.6, 20, 15, M.aluDark, -10.5 + i * 3.5, 12, 0));
  hs.position.set(0, 1.6, -6); g.add(hs);
  g.add(box(20, 8, 3, M.chip, 0, 5.6, 2.5));
  const tL = screwTerminal(2); tL.rotation.y = Math.PI / 2; tL.position.set(-17.5, 1.6, -2.5); g.add(tL);
  const tR = screwTerminal(2); tR.rotation.y = -Math.PI / 2; tR.position.set(17.5, 1.6, -7.5); g.add(tR);
  const tP = screwTerminal(3); tP.rotation.y = Math.PI; tP.position.set(5.08, 1.6, 17); g.add(tP);
  const c1 = capacitor(4, 11); c1.position.set(-13, 1.6, 9); g.add(c1);
  const c2 = capacitor(4, 11); c2.position.set(13, 1.6, 7); g.add(c2);
  g.add(box(10, 9, 4.5, M.chip, -12, 6, 16));
  const hdr = maleHeader(6, 1, 6, 0); hdr.position.set(-6.35 + 4, 1.6, 19.5); g.add(hdr);
  const tp = (n, x, z) => pin(g, n, x, 12, z);
  tp('OUT1', -17.5, -2.5); tp('OUT2', -17.5, -7.58); tp('OUT3', 17.5, -7.5); tp('OUT4', 17.5, -2.42);
  tp('12V', 5.08, 17); tp('GND', 0, 17); tp('5V', -5.08, 17);
  ['ENA', 'IN1', 'IN2', 'IN3', 'IN4', 'ENB'].forEach((n, i) => pin(g, n, -2.35 + i * 2.54, 10.6, 19.5));
  return shadow(g);
}

// TLC5947 24-ch PWM LED driver. Local: centred, long axis X, top y=1.6.
export function tlc5947() {
  const g = group('TLC5947 LED Controller');
  g.add(pcb(52, 28, M.pcbAda));
  const c = chip(11, 6.5, 1.1); c.position.set(0, 1.6, 6); g.add(c);
  const hdr = maleHeader(16, 3, 6, 2.5); hdr.position.set(-19.05, 1.6, -10.5); g.add(hdr);
  const fIn = femaleHeader(6); fIn.rotation.y = Math.PI / 2; fIn.position.set(-23.6, 1.6, 7.2); g.add(fIn);
  const fOut = femaleHeader(6); fOut.rotation.y = Math.PI / 2; fOut.position.set(23.6, 1.6, 7.2); g.add(fOut);
  g.add(box(6.3, 2.4, 2.4, M.tape, -8, 2.8, 11));
  ['GND', 'V+', 'DIN', 'CLK', 'LAT', 'OE'].forEach((n, i) => pin(g, n, -23.6, 10.1, 7.2 - i * 2.54));
  for (let k = 0; k < 16; k++) {
    pin(g, `ch${k}+`, -19.05 + k * 2.54, 10.6, -10.5);
    pin(g, `ch${k}-`, -19.05 + k * 2.54, 10.6, -10.5 + 2.54);
  }
  return shadow(g);
}

// TCA9548A I2C multiplexer. Local centred, long axis X.
export function tca9548a() {
  const g = group('TCA9548A I2C Multiplexer');
  g.add(pcb(32, 18, M.pcbPurple));
  mountHoles(g, [[-12.7, 0], [12.7, 0]]);
  const c = chip(7, 4.5); c.position.set(0, 1.6, 0); g.add(c);
  const h1 = maleHeader(12, 1, 6, 2.5); h1.position.set(-13.97, 1.6, -7.6); g.add(h1);
  const h2 = maleHeader(12, 1, 6, 2.5); h2.position.set(-13.97, 1.6, 7.6); g.add(h2);
  ['VIN', 'GND', 'SDA', 'SCL', 'RST', 'A0', 'A1', 'A2', 'SD0', 'SC0', 'SD1', 'SC1'].forEach((n, i) => pin(g, n, -13.97 + i * 2.54, 10.6, 7.6));
  ['SD2', 'SC2', 'SD3', 'SC3', 'SD4', 'SC4', 'SD5', 'SC5', 'SD6', 'SC6', 'SD7', 'SC7'].forEach((n, i) => pin(g, n, -13.97 + i * 2.54, 10.6, -7.6));
  return shadow(g);
}

// DS3231 RTC with right-angle header along one edge (pins point -z). Local: board flat.
export function ds3231() {
  const g = group('DS3231 Real-Time Clock');
  g.add(pcb(23, 18, M.pcbAda));
  const c = chip(10, 7.5, 2); c.position.set(-2, 1.6, 1); g.add(c);
  g.add(cyl(6.6, 3.2, M.steel, 3, -1.6, 1, 'y', 28));
  g.add(cyl(6.2, 0.4, M.nickel, 3, -3.3, 1, 'y', 28));
  g.add(box(6 * 2.54, 2.5, 2.5, M.header, 0, 2.9, -8.8));
  const pts = []; for (let i = 0; i < 6; i++) pts.push([-6.35 + i * 2.54, 2.9, -12.5]);
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.64, 0.64, 8), M.gold, 6);
  const o = new THREE.Object3D(); pts.forEach((p, i) => { o.position.set(...p); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }); g.add(im);
  ['32K', 'SQW', 'SCL', 'SDA', 'VIN', 'GND'].forEach((n, i) => pin(g, n, -6.35 + i * 2.54, 2.9, -16));
  return shadow(g);
}

// DRV8871 brushed DC motor driver (stirrer). Local centred.
export function drv8871() {
  const g = group('DRV8871 Stirring Motor Controller');
  g.add(pcb(25, 20, M.pcbAda));
  mountHoles(g, [[-7.6, 7.5], [7.6, 7.5]]);
  const c = chip(5, 4, 1); c.position.set(2, 1.6, 0); g.add(c);
  const t1 = screwTerminal(2); t1.position.set(-9.5, 1.6, -6.0); g.add(t1);
  const t2 = screwTerminal(2); t2.position.set(4.5, 1.6, -6.0); g.add(t2);
  const cp = capacitor(3, 7); cp.position.set(-5, 1.6, 4); g.add(cp);
  const h = maleHeader(4, 1, 6, 2.5); h.position.set(2.0, 1.6, 7.8); g.add(h);
  pin(g, 'POWER+', -9.5, 12, -6); pin(g, 'POWER-', -4.42, 12, -6);
  pin(g, 'OUT1', 4.5, 12, -6); pin(g, 'OUT2', 9.58, 12, -6);
  ['IN1', 'IN2', 'GND', 'VM'].forEach((n, i) => pin(g, n, 2.0 + i * 2.54, 10.6, 7.8));
  return shadow(g);
}

// 12 V -> 5 V buck converter (potted aluminium case). Local: centred, long axis X.
export function converter() {
  const g = group('12V-to-5V Converter');
  g.add(box(46, 14, 27, M.alu, 0, 7, 0, 1.5));
  g.add(box(30, 0.3, 16, M.label, 0, 14.05, 0));
  g.add(box(2, 6, 18, M.black, -23.5, 5, 0)); g.add(box(2, 6, 18, M.black, 23.5, 5, 0));
  pin(g, 'IN+', -24.5, 5, -4); pin(g, 'IN-', -24.5, 5, 4); pin(g, 'OUT+', 24.5, 5, -4); pin(g, 'OUT-', 24.5, 5, 4);
  return shadow(g);
}

// 20-pin female header soldered to a bus wire. Local: along X from 0, base y=0.
export function busHeader(color) {
  const g = group(`Bus header (${color})`);
  g.add(femaleHeader(20));
  g.add(box(50.8, 1.3, 1.3, wireMat('bare'), 24.13, 2.0, 1.95));
  for (let i = 0; i < 20; i++) pin(g, 'p' + i, i * 2.54, 8.5, 0);
  pin(g, 'lead', -1.5, 2.0, 1.95);
  return shadow(g);
}

// 20x4 character LCD with I2C backpack. Local: screen faces +z, centred on the bezel.
export function lcd2004() {
  const g = group('20x4 LCD Display');
  g.add(box(98, 60, 1.6, M.pcbGreen, 0, 0, -0.8));
  g.add(box(97, 40, 7.5, M.aluDark, 0, 0, 3.75, 0.6));
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 352;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 0.0, roughness: 0.3 });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(77, 26.4), mat); scr.position.set(0, 0, 7.66); scr.userData.keep = true; g.add(scr);
  g.add(box(86, 33, 0.3, M.chip, 0, 0, 7.4));
  g.add(box(41.5, 19, 1.6, M.pcbBlack, -14, 16, -12));
  g.add(box(16 * 2.54, 2.5, 8.5, M.header, -14, 23, -6));
  g.add(cyl(3.5, 3, M.potBlue, -24, 16, -14.3, 'z', 16));
  { const c = chip(8, 5, 1.2); c.rotation.x = -Math.PI / 2; c.position.set(-6, 14, -12.8); g.add(c); }
  ['GND', 'VCC', 'SDA', 'SCL'].forEach((n, i) => pin(g, n, -38, 10 + i * 2.54, -13.5));
  g.add(box(3, 4 * 2.54, 2.5, M.header, -36.4, 13.8, -13.2));
  let lastKey = '';
  const draw = (lines, on) => {
    const key = lines.join('|') + on; if (key === lastKey) return; lastKey = key;
    const x = cv.getContext('2d');
    x.fillStyle = on ? '#1a4fe0' : '#0d1f55'; x.fillRect(0, 0, cv.width, cv.height);
    const cw = (cv.width - 28) / 20, ch = (cv.height - 24) / 4;
    for (let r = 0; r < 4; r++) for (let k = 0; k < 20; k++) {
      x.fillStyle = on ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.035)';
      x.fillRect(14 + k * cw + 2, 12 + r * ch + 4, cw - 5, ch - 8);
    }
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

// microSD breakout. Local: PCB in XY plane, components face +z.
export function sdModule() {
  const g = group('MicroSD Card Module');
  g.add(box(42, 24, 1.6, M.pcbBlue, 0, 0, 0.8));
  g.add(box(14, 15, 2, M.steel, -11, 0, 2.6));
  g.add(box(5, 4, 1.5, M.chip, 6, 4, 2.4)); g.add(box(4, 4, 1.2, M.chip, 6, -4, 2.2));
  g.add(box(2.5, 6 * 2.54, 2.5, M.header, 18.5, 0, 2.85));
  ['GND', 'VCC', 'MISO', 'MOSI', 'SCK', 'CS'].forEach((n, i) => pin(g, n, 22, -6.35 + i * 2.54, 2.85));
  return shadow(g);
}

// 16 mm waterproof push button. Local: axis +z out of the panel; panel front face at z=0.
export function pushButton(capMat) {
  const g = group('Waterproof Push Button');
  g.add(cyl(9.2, 2.2, M.steel, 0, 0, 1.1, 'z', 32));
  g.add(cyl(6.6, 2.8, capMat, 0, 0, 3.6, 'z', 32));
  g.add(cyl(7.6, 20, M.steelDark, 0, 0, -10, 'z', 24));
  g.add(cyl(9.6, 2.4, M.steel, 0, 0, -4.2, 'z', 6));
  g.add(box(0.5, 3, 5, M.steel, -2.5, 0, -22.4)); g.add(box(0.5, 3, 5, M.steel, 2.5, 0, -22.4));
  pin(g, 'sig', -2.5, 0, -24.5); pin(g, 'gnd', 2.5, 0, -24.5);
  return shadow(g);
}

// 40x40x20 PC fan used as the magnetic stirrer. Local: axis +y, base y=0. Rotor in userData.rotor.
export function stirFan() {
  const g = group('40 mm Stirrer Fan + Magnets');
  const s = new THREE.Shape(); s.moveTo(-20, -20); s.lineTo(20, -20); s.lineTo(20, 20); s.lineTo(-20, 20); s.lineTo(-20, -20);
  const h = new THREE.Path(); h.absarc(0, 0, 19, 0, Math.PI * 2, true); s.holes.push(h);
  [[-16, -16], [16, -16], [16, 16], [-16, 16]].forEach(([x, y]) => { const p = new THREE.Path(); p.absarc(x, y, 1.7, 0, Math.PI * 2, true); s.holes.push(p); });
  const fl = new THREE.ExtrudeGeometry(s, { depth: 3, bevelEnabled: false }); fl.rotateX(-Math.PI / 2);
  g.add(new THREE.Mesh(fl, M.black)); const f2 = new THREE.Mesh(fl, M.black); f2.position.y = 17; g.add(f2);
  const shroud = new THREE.Mesh(new THREE.CylinderGeometry(19.6, 19.6, 14, 40, 1, true), M.black); shroud.position.y = 10; g.add(shroud);
  [[-18, -18], [18, -18], [18, 18], [-18, 18]].forEach(([x, z]) => g.add(box(4, 14, 4, M.black, x, 10, z)));
  const rotor = new THREE.Group(); rotor.name = 'rotor';
  rotor.add(cyl(12.5, 17, M.black, 0, 10, 0, 'y', 32));
  rotor.add(cyl(11, 0.3, M.label, 0, 18.6, 0, 'y', 32));
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2; const b = box(7, 0.8, 9, M.black);
    b.position.set(Math.cos(a) * 15.5, 10, Math.sin(a) * 15.5); b.rotation.y = -a; b.rotateX(0.55); rotor.add(b);
  }
  const mg = new THREE.Group(); mg.name = 'magnets';
  mg.add(box(12, 3, 6, M.nickel, -6.05, 20.25, 0, 0.3)); mg.add(box(12, 3, 6, M.nickel, 6.05, 20.25, 0, 0.3));
  rotor.add(mg); g.add(rotor);
  g.userData.rotor = rotor; g.userData.magnets = mg;
  pin(g, '+', 18, 6, 21); pin(g, '-', 15, 6, 21);
  return shadow(g);
}

// PTC heater plate (35 x 21 x 5). Local: centred, long axis z, leads exit +z.
export function heaterPlate() {
  const g = group('PTC Heater Plate 80°C');
  g.add(box(21, 5, 35, M.alu, 0, 2.5, 0, 0.6));
  g.add(box(16, 5.4, 6, M.kapton, 0, 2.5, 18.5));
  g.add(cyl(0.9, 14, wireMat('blue'), -4, 2.5, 27, 'z', 8)); g.add(cyl(0.9, 14, wireMat('blue'), 4, 2.5, 27, 'z', 8));
  pin(g, 'a', -4, 2.5, 34); pin(g, 'b', 4, 2.5, 34);
  return shadow(g);
}

// NTC thermistor + 10k precision resistor on a 3-pin header, sealed in heat-shrink. Local along z.
export function thermistorUnit() {
  const g = group('Heater Thermistor Unit');
  g.add(cyl(3.2, 16, M.heatshrink, 0, 0, 0, 'z', 16));
  g.add(cyl(1.4, 14, M.heatshrink, 0, 0, -14, 'z', 12));
  g.add(cyl(1.0, 2.5, M.capBlue, 0, 0, -22, 'z', 12));
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.64, 0.64, 6), M.gold, 3);
  const o = new THREE.Object3D(); [-2.54, 0, 2.54].forEach((x, i) => { o.position.set(x, 0, 10.5); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }); g.add(im);
  pin(g, 'S', 0, 0, 13.5); pin(g, '+', -2.54, 0, 13.5); pin(g, '-', 2.54, 0, 13.5);
  return shadow(g);
}

// 5 mm LED. Local: emits along +z, dome tip at z=8.1. userData.setOn(intensity)
export function led5mm(color) {
  const g = group('5 mm LED');
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.2, emissive: color, emissiveIntensity: 0 });
  g.add(cyl(2.5, 5.6, mat, 0, 0, 2.8, 'z', 20));
  const dome = new THREE.Mesh(new THREE.SphereGeometry(2.5, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat); dome.rotation.x = Math.PI / 2; dome.position.z = 5.6; g.add(dome);
  g.add(cyl(2.95, 1, mat, 0, 0, 0.5, 'z', 20));
  g.add(cyl(0.25, 6, M.steel, -1.27, 0, -3, 'z', 6)); g.add(cyl(0.25, 6, M.steel, 1.27, 0, -3, 'z', 6));
  g.userData.setOn = v => { mat.emissiveIntensity = v * 3.5; };
  g.userData.mat = mat;
  pin(g, '+', -1.27, 0, -6); pin(g, '-', 1.27, 0, -6);
  return shadow(g);
}

// TSL2591 light sensor breakout. Local: PCB in XY plane, sensor faces +z.
export function tsl2591() {
  const g = group('TSL2591 Light Sensor');
  g.add(box(19, 19, 1.6, M.pcbBlack, 0, 0, -0.8, 0.8));
  g.add(box(2.2, 2.2, 0.9, M.chip, 0, 2, 0.45));
  g.add(box(1.0, 1.0, 0.1, new THREE.MeshStandardMaterial({ color: '#5a3416', roughness: 0.1 }), 0, 2, 0.95));
  g.add(box(6 * 2.54, 2.5, 2.5, M.header, 0, -7.6, -2.85));
  ['VIN', 'GND', '3V', 'INT', 'SDA', 'SCL'].forEach((n, i) => pin(g, n, -6.35 + i * 2.54, -7.6, -6));
  return shadow(g);
}

// Small DC peristaltic pump standing upright: white head (y 0..22) then motor can (22..48).
// Hose barbs point +z out of the head. Local origin: bottom-centre.
export function pump(label = '') {
  const g = group('DC Peristaltic Pump' + (label ? ' (' + label + ')' : ''));
  g.add(cyl(10.6, 21, M.pumpHead, 0, 10.5, 0, 'y', 32));
  g.add(box(18, 4, 18, M.pumpHead, 0, 2, -1, 1.2));
  g.add(cyl(8.5, 0.6, M.luer, 0, 21.3, 0, 'y', 24));
  [-4.2, 4.2].forEach(x => { g.add(cyl(1.7, 9, M.pumpHead, x, 5, 13.5, 'z', 14)); g.add(cyl(2.1, 1.6, M.pumpHead, x, 5, 17, 'z', 14)); });
  const can = new THREE.CylinderGeometry(10, 10, 26, 32); can.scale(1, 1, 0.76);
  const m = new THREE.Mesh(can, M.steel); m.position.y = 35; g.add(m);
  g.add(cyl(5, 1.5, M.pumpHead, 0, 48.6, 0, 'y', 20));
  g.add(box(1.5, 3, 0.4, M.copper, -4.5, 49.5, 0)); g.add(box(1.5, 3, 0.4, M.copper, 4.5, 49.5, 0));
  g.add(cyl(1.5, 3, M.pcbRed, -6.5, 47, 4, 'y', 8));
  pin(g, '+', -4.5, 51.5, 0); pin(g, '-', 4.5, 51.5, 0); pin(g, 'in', -4.2, 5, 18); pin(g, 'out', 4.2, 5, 18);
  return shadow(g);
}

export function rubberFoot() {
  const geo = new THREE.CylinderGeometry(6.6, 9, 3.5, 4, 1); geo.rotateY(Math.PI / 4); geo.translate(0, 1.75, 0);
  return shadow(group('Rubber foot', new THREE.Mesh(geo, M.rubber)));
}
export function rod(len = 300) { return shadow(group('5 x 300 mm steel rod', cyl(2.5, len, M.steel, 0, 0, 0, 'z', 20))); }
export function magnet() { return shadow(group('Neodymium magnet 12x6x3', box(12, 6, 3, M.nickel, 0, 0, 0, 0.4))); }
export function standoff(h = 10) {
  const g = group('Brass standoff + screw');
  g.add(cyl(2.9, h, M.brass, 0, h / 2, 0, 'y', 6));
  g.add(cyl(2.7, 2.6, M.screw, 0, -4.3, 0, 'y', 16));
  return shadow(g);
}

// Barrel jack (panel mount 5.5x2.1). Local: axis +z points out of the wall; wall outer face at z=0.
export function barrelJack() {
  const g = group('Barrel Jack 5.5x2.1');
  g.add(cyl(5.6, 12, M.steel, 0, 0, -3, 'z', 24));
  g.add(cyl(7.4, 2.2, M.steel, 0, 0, -4.2, 'z', 6));
  g.add(cyl(3.2, 12.2, M.chip, 0, 0, -2.9, 'z', 20));
  g.add(cyl(1.0, 12.4, M.gold, 0, 0, -2.9, 'z', 12));
  g.add(box(1, 3, 6, M.steel, 4, 0, -11)); g.add(box(1, 3, 6, M.steel, 0, 0, -11));
  pin(g, '+', 0, 0, -14); pin(g, '-', 4, 0, -14);
  return shadow(g);
}
export function rockerSwitch() {
  const g = group('Rocker Switch');
  g.add(box(21, 15, 2, M.black, 0, 0, 1, 0.8));
  const r = box(15, 10, 4, M.btnBlack, 0, 0, 3.2, 1); r.rotation.x = 0.18; g.add(r);
  g.add(box(18, 12, 14, M.black, 0, 0, -7));
  g.add(box(1, 4, 6, M.steel, -5, 0, -16)); g.add(box(1, 4, 6, M.steel, 5, 0, -16));
  pin(g, 'a', -5, 0, -19); pin(g, 'b', 5, 0, -19);
  return shadow(g);
}

// Glass reactor vial, 90 mL: OD ~41, height 100.5. Local base y=0.
export function vial() {
  const g = group('90 mL Glass Reactor Vial');
  const R = 20.3, H = 100.5, t = 1.6, pts = [V2(0, 0)];
  for (let i = 0; i <= 6; i++) { const a = i / 6 * Math.PI / 2; pts.push(V2(R - 3 + 3 * Math.sin(a), 3 - 3 * Math.cos(a))); }
  pts.push(V2(R, H - 3), V2(R + 0.6, H - 2.5), V2(R + 0.6, H), V2(R - t, H), V2(R - t, 3 + t), V2(R - t - 2, t), V2(0, t));
  const glass = new THREE.Mesh(new THREE.LatheGeometry(pts, 64), M.glass); glass.renderOrder = 3; g.add(glass);
  g.userData.inner = { r: R - t - 0.15, floor: t, height: H };
  return g;
}
export function liquid(r, h, mat) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 48), mat); m.position.y = h / 2; m.renderOrder = 2; return m; }
export function stirBar() { const c = new THREE.Mesh(new THREE.CapsuleGeometry(4, 12, 6, 16), M.ptfe); c.rotation.z = Math.PI / 2; c.position.y = 4; return shadow(group('Olive stir bar 8x20 mm', c)); }

// Cast silicone reactor cap: plug (r 17.5, 20 tall, goes into the vial) + flange (r 22.5, 21.5 tall).
// Local: y=0 at the flange underside. Six needle holes: centre + five on a ring.
export function capHoles() { const h = [[0, 0]]; for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + Math.PI / 2; h.push([Math.cos(a) * 11, Math.sin(a) * 11]); } return h; }
export function siliconeCap(mat = M.silBlack) {
  const g = group('Cast Silicone Reactor Cap');
  const prof = [V2(0, -20), V2(16.5, -20), V2(17.5, -19), V2(17.5, 0), V2(22.5, 0), V2(22.5, 20.5), V2(21.5, 21.5), V2(0, 21.5)];
  g.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 48), mat));
  capHoles().forEach(([x, z]) => g.add(cyl(1.25, 0.2, M.chip, x, 21.6, z, 'y', 12)));
  return shadow(g);
}

// Luer-lock blunt dispensing needle; local: tip at y=0, hub at top.
export function needle(len = 50.8, hubMat = M.hubGreen) {
  const g = group(`14 ga dispensing needle (${(len / 25.4).toFixed(len > 60 ? 0 : 1)}")`);
  g.add(cyl(1.05, len, M.steel, 0, len / 2, 0, 'y', 12));
  g.add(cyl(3.0, 9, hubMat, 0, len + 4.5, 0, 'y', 16, 2.0));
  g.add(cyl(4.0, 3, hubMat, 0, len + 10, 0, 'y', 16));
  g.add(box(10, 1, 2, hubMat, 0, len + 11, 0));
  return shadow(g);
}
// Thermometer needle (14 ga 4" needle + NTC thermistor, heat-shrink and 3-pin header). Tip at y=0.
export function thermoNeedle() {
  const g = group('Thermistor Needle Probe');
  g.add(needle(101.6, M.hubGreen));
  g.add(cyl(4.8, 20, M.heatshrink, 0, 101.6 + 23, 0, 'y', 20));
  g.add(cyl(1.3, 1.2, M.sealant, 0, -0.4, 0, 'y', 10));
  g.add(box(2.5, 2.5, 3 * 2.54, M.header, 0, 101.6 + 35, 0));
  pin(g, 'S', 0, 101.6 + 38, 0); pin(g, '+', 0, 101.6 + 38, -2.54); pin(g, '-', 0, 101.6 + 38, 2.54);
  return shadow(g);
}
export function luerBarb() { const g = group('Luer-lock barb adapter'); g.add(cyl(3.3, 9, M.luer, 0, 4.5, 0, 'y', 16)); g.add(cyl(2.0, 8, M.luer, 0, 13, 0, 'y', 12, 1.6)); g.add(box(9, 1.2, 1.8, M.luer, 0, 2, 0)); return g; }
export function syringeFilter() {
  const g = group('0.22 µm PES syringe filter');
  g.add(cyl(12.5, 3.5, M.white, 0, 6, 0, 'y', 32));
  g.add(cyl(12.6, 1.2, M.filterGreen, 0, 8.3, 0, 'y', 32)); g.add(cyl(12.6, 1.2, M.filterGreen, 0, 3.7, 0, 'y', 32));
  g.add(cyl(2.4, 6, M.luer, 0, 0, 0, 'y', 12)); g.add(cyl(1.8, 5, M.luer, 0, 11.5, 0, 'y', 12));
  return shadow(g);
}
export function sealantBlob(r = 4, seed = 1) {
  const geo = new THREE.IcosahedronGeometry(r, 2); const p = geo.attributes.position;
  let s = seed * 9301 + 7; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < p.count; i++) { const k = 0.8 + rnd() * 0.35; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.6, p.getZ(i) * k); }
  geo.computeVertexNormals();
  return shadow(group('RTV silicone sealant', new THREE.Mesh(geo, M.sealant)));
}
export function tapeStrip(w, h) { return group('Double-sided tape', box(w, 0.8, h, M.tape, 0, 0.4, 0)); }

// Merge a part's static child meshes by material to cut draw calls (keeps rotors, LEDs'
// material sharing, InstancedMeshes and anything flagged userData.keep separate).
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
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
    if (!buckets.has(m)) buckets.set(m, []);
    buckets.get(m).push(g); victims.push(o);
  });
  if (victims.length < 3) return group;
  victims.forEach(o => o.parent.remove(o));
  // drop now-empty helper groups
  const empties = []; group.traverse(o => { if (o !== group && o.isGroup && o.children.length === 0 && o.name !== 'rotor') empties.push(o); }); empties.forEach(o => o.parent && o.parent.remove(o));
  for (const [mat, geos] of buckets) {
    const merged = mergeGeometries(geos, false); if (!merged) continue;
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, mat); mesh.castShadow = merged.boundingSphere.radius > 3; mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}
