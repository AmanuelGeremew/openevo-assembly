// Builds the complete OpenEVO Type D Mk4 at its assembled pose.
// Printed modules are the repository's STL files (Binomica-Labs/OpenEVO, "STL Files/"). Their placement
// comes from their own geometry: 5 mm rod holes 135 mm apart and 5.5 mm above each rail's underside,
// the matching screw patterns of Modules E and F, the Arduino's mounting holes in Module E, and the
// stacking bosses of Modules D -> L -> Q. Every part also records the part it is built onto ("frame"),
// following the manual's order, so sub-assemblies move as one piece.
// World frame: millimetres, +Y up, +Z toward the LCD (front), +X to the right seen from the front.
import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { M } from './materials.js';
import * as B from './builders.js';

export const FOOT = 3.5;
export const ROD_Y = FOOT + 5.5;
export const ROD_X = 67.4;
export const ROD_FRONT = 130, ROD_BACK = -170;
export const ZC = -5, ZG = -81;
export const TX = -3.66, TZ = ZC;
export const C_TOP = 6.5;
export const VIAL_FLOOR = C_TOP + 34.5;
export const CAP_Y = VIAL_FLOOR + 100.5;
export const E_FLOOR = FOOT + 14;
export const SO_TOP = E_FLOOR + 10;
export const BAY_Y = C_TOP + 62;

const d2r = Math.PI / 180;
const AX = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
export function rotMatrix(rot) { const m = new THREE.Matrix4(); for (const [a, deg] of rot) m.premultiply(new THREE.Matrix4().makeRotationAxis(AX[a], deg * d2r)); return m; }

export const STL = {
  A: { file: 'Module A - OEVO LCD Rail.stl', manual: 'Module A (LCD rail part)', rot: [['y', 180]], from: [-202.925, 10.5, 20], to: [0, ROD_Y, ROD_FRONT] },
  B: { file: 'Module B - OEVO LCD Faceplate.stl', manual: 'Module B (LCD Faceplate)', rot: [['y', 180], ['x', -45]], from: [-202.9, -102, 11], to: [0, 15.2, 148.6] },
  C: { file: 'Module C - OEVO Stirrer Rail.stl', manual: 'Module C (Stirring Rail part)', rot: [], from: [-202.84, -10.5, 28], to: [0, ROD_Y, ZC] },
  D: { file: 'Module D - OEVO Heater-Stirrer base.stl', manual: 'Module D (Stirrer Base part)', rot: [['x', -90], ['y', 180]], from: [-20, 0.5, 0], to: [TX, C_TOP, TZ] },
  E: { file: 'Module E - OEVO Mother Board.stl', manual: 'Module E (motherboard)', rot: [['x', -90]], from: [0, 0, 0], to: [285.05, FOOT + 11, 47.15] },
  F: { file: 'Module F - OEVO Mother Board Rail.stl', manual: 'Module F (motherboard rail part)', rot: [], from: [-203.4, 42.5, 6], to: [0, ROD_Y, ROD_BACK] },
  G: { file: 'Module G - OEVO DC Motor Rail.stl', manual: 'Module G (DC motor rail)', rot: [], from: [-212.925, -283.5, 18], to: [0, ROD_Y, ZG] },
  L: { file: 'Module L - OEVO Module Bay.stl', manual: 'Module L (Module Bay part)', rot: [['x', -90]], from: [-317, 9, 0], to: [TX, C_TOP + 47, TZ] },
  Q: { file: 'Module Q - OEVO Reactor Top.stl', manual: 'Module Q (reactor top)', rot: [['x', -90]], from: [-64, -71, 0], to: [TX, C_TOP + 77, TZ] },
  O: { file: 'Module O - OEVO OD Light Module.stl', manual: 'Module O (LED Module)', rot: [], from: [-391.5, -92.5, 0], to: [TX, BAY_Y, TZ + 26] },
  N: { file: 'Module N - OEVO OD Sensor Module', manual: 'Module N (OD Sensor Module part)', rot: [['y', 180]], from: [-391.5, -13.5, 0], to: [TX, BAY_Y, TZ - 26] },
  P: { file: 'Module P - OEVO LED SixPack Module.stl', manual: 'Module P (LED SixPack Module)', rot: [['y', 90]], from: [-391.5, -54.2, 0], to: [TX + 26, BAY_Y, TZ] },
  M: { file: 'Module M - OEVO Blank Module.stl', manual: 'Module M (Blank Sensor Module part)', rot: [], from: [-391.5, 28.5, 0], to: [255, 12.5, 30] },
  H: { file: 'Module H - OEVO Reactor Cap mold Bottom.stl', manual: 'Module H (reactor cap mold)', rot: [['x', -90]], from: [99, 59, 0], to: [215, 16, -15] },
  I: { file: 'Module I - OEVO Reactor Cap Mold Left.stl', manual: 'Module I (reactor cap mold)', rot: [['x', -90]], from: [99, -8, 0], to: [215, 48, -15] },
  J: { file: 'Module J - OEVO Reactor Cap Mold Right.stl', manual: 'Module J (reactor cap mold)', rot: [['x', -90]], from: [99, -4.7, 0], to: [215, 48, -15] },
  K: { file: 'Module K - OEVO Reactor Cap Mold Top.stl', manual: 'Module K (reactor cap mold top)', rot: [['x', 90]], from: [99, -72, 0], to: [215, 97, -15] },
  T: { file: 'Module T - OEVO Bottle Top Part 1.stl', manual: 'Module T', rot: [['x', -90]], from: [-78, 76, 0], to: [-218, 0, 125] },
  U: { file: 'Module U - OEVO Media Bottle Top Part 2.stl', manual: 'Module U (Bottle Top Model 2)', rot: [['x', -90]], from: [-78, -71, 0], to: [-218, 2, 125] },
  W: { file: 'Module W - OEVO Media Bottle Top Part 4.stl', manual: 'Module W', rot: [['x', -90]], from: [-78, -32.2, 0], to: [-218, 0, 125] },
  V: { file: 'Module V - OEVO Media Bottle Top Part 3.stl', manual: 'Module V (Bottle Top Model 3)', rot: [['x', 90]], from: [-78, 6, 0], to: [-218, 27, 125] },
  X: { file: 'Module X - OEVO Media Light Blocker Part 1.stl', manual: 'Module X', rot: [['x', -90]], from: [133, -107, 0], to: [300, 0, -330] },
  Y: { file: 'Module Y - OEVO Media Light Blocker Part 2.stl', manual: 'Module Y', rot: [['x', -90]], from: [-61, -173.5, 0], to: [300, 128, -330] },
  Z: { file: 'Module Z - OEVO Media Light Blocker Part 3.stl', manual: 'Module Z', rot: [['x', -90]], from: [-61, -181, 0], to: [300, 128, -330] },
  R: { file: 'Module R - OEVO top light blocker.stl', manual: 'Module R (Reactor Top Side)', rot: [['x', -90]], from: [4.4, 3.45, 0], to: [215, 0, -250] },
  S: { file: 'Module S - OEVO Top light blocker.stl', manual: 'Module S', rot: [['x', -90]], from: [11, -12, 0], to: [380, 0, -250] },
};
const STL_FRAME = { A: 'robot', B: 'robot', C: 'robot', D: 'robot', E: 'robot', F: 'modE', G: 'robot', L: 'robot', Q: 'robot', N: 'robot', O: 'robot', P: 'robot', M: null, H: null, I: 'modH', J: 'modH', K: 'modH', T: null, U: 'modT', W: 'modT', V: 'modT', X: null, Y: 'modX', Z: 'modX', R: null, S: null };

export const E_HOLES = {
  megaR1: [56.75, -110.29], megaR2: [58.02, -158.55], megaL1: [-18.18, -110.29], megaL2: [-24.53, -158.55],
  tlcF1: [-56.5, -111.7], tlcF2: [-36.2, -111.7], tlcB1: [-56.3, -156.6], tlcB2: [-36.2, -156.9],
  mux1: [-59.75, -180.05], mux2: [-34.35, -180.05],
  drv1: [-0.35, -168.25], drv2: [14.85, -168.35],
  l298a: [27.55, -168.95], l298b: [27.55, -205.75], l298c: [64.05, -205.45],
};
export const SCREW_STEPS = {
  53: { size: 'M3', len: 20, holes: ['megaR1', 'megaR2'] },
  54: { size: 'M2.5', len: 20, holes: ['tlcB1', 'tlcB2'] },
  55: { size: 'M2.5', len: 10, holes: ['mux1', 'mux2'] },
  56: { size: 'M3', len: 10, holes: ['megaL1', 'megaL2', 'l298a', 'l298b', 'l298c'] },
  57: { size: 'M2.5', len: 10, holes: ['tlcF1', 'tlcF2', 'drv1', 'drv2'] },
};
export const BOARD_SCREWS = { 58: [['mux', 'M2.5', ['mux1', 'mux2']], ['ledCtl', 'M2.5', ['tlcF1', 'tlcF2', 'tlcB1', 'tlcB2']]], 60: [['stirCtl', 'M2.5', ['drv1', 'drv2']]], 62: [['heaterCtl', 'M3', ['l298a', 'l298b', 'l298c']]], 65: [['mega', 'M3', ['megaR1', 'megaR2', 'megaL1', 'megaL2']]] };
const F_COVER = z => z <= -103 && z >= -176;

export async function buildAssembly(root, onProgress = () => {}, opts = {}) {
  const parts = {};
  const printFrame = {};
  const loader = new STLLoader();
  const letters = Object.keys(STL);
  let done = 0;
  const geos = await Promise.all(letters.map(L => loader.loadAsync(new URL(`../models/${L}.stl`, import.meta.url).href).then(g => { onProgress(++done / letters.length); return g; })));

  function add(id, obj, meta = {}) {
    obj.userData.partId = id;
    obj.traverse(o => { if (o.isMesh || o.isInstancedMesh) o.userData.partId = id; });
    root.add(obj);
    parts[id] = { id, obj, name: meta.name || obj.name || id, ...meta, frame: meta.frame === undefined ? 'robot' : meta.frame };
    return obj;
  }
  const robot = new THREE.Group(); robot.name = 'robot'; add('robot', robot, { name: 'OpenEVO robot', frame: null, kind: 'virtual' });
  const convGrp = new THREE.Group(); convGrp.name = 'convGrp'; add('convGrp', convGrp, { name: 'converter with bus headers', frame: null, kind: 'virtual' });

  letters.forEach((L, i) => {
    const s = STL[L], g = geos[i];
    const R = rotMatrix(s.rot);
    const from = new THREE.Vector3(...s.from).applyMatrix4(R);
    const Mw = R.clone().setPosition(new THREE.Vector3(...s.to).sub(from));
    printFrame[L] = Mw;
    g.applyMatrix4(Mw); g.computeBoundingBox();
    const c = g.boundingBox.getCenter(new THREE.Vector3());
    g.translate(-c.x, -c.y, -c.z); g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, M.pla); mesh.castShadow = mesh.receiveShadow = true; mesh.position.copy(c);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(g, 28), M.plaEdge); edges.raycast = () => {};
    mesh.add(edges); mesh.name = s.file.replace(/\.stl$/, '');
    add('mod' + L, mesh, { name: mesh.name, manualName: s.manual, kind: 'printed', module: L, stl: s.file, frame: STL_FRAME[L] });
  });
  function inPrint(L, obj, pos, rot = []) {
    const m = printFrame[L].clone().multiply(new THREE.Matrix4().makeTranslation(...pos)).multiply(rotMatrix(rot));
    m.decompose(obj.position, obj.quaternion, obj.scale); return obj;
  }
  const at = (obj, x, y, z, ry = 0, rx = 0, rz = 0) => { obj.position.set(x, y, z); obj.rotation.set(rx * d2r, ry * d2r, rz * d2r); return obj; };

  // ---- rails and rubber feet
  add('rodL', at(B.rod(300), -ROD_X, ROD_Y, (ROD_FRONT + ROD_BACK) / 2), { bom: '5mm x 300mm Steel Rod', kind: 'hardware' });
  add('rodR', at(B.rod(300), ROD_X, ROD_Y, (ROD_FRONT + ROD_BACK) / 2), { bom: '5mm x 300mm Steel Rod', kind: 'hardware' });
  [[-58, 100], [58, 100], [-58, 143], [58, 143]].forEach(([x, z], i) => add('footA' + i, at(B.rubberFoot(), x, 0, z), { bom: 'Square Adhesive Rubber Feet', kind: 'hardware' }));
  [[-60, -26], [60, -26], [-60, 16], [60, 16], [TX, ZC]].forEach(([x, z], i) => add('footC' + i, at(B.rubberFoot(), x, 0, z), { bom: 'Square Adhesive Rubber Feet', kind: 'hardware' }));
  [[-67.4, -140], [67.4, -140]].forEach(([x, z], i) => add('footF' + i, at(B.rubberFoot(), x, 0, z), { bom: 'Square Adhesive Rubber Feet', kind: 'hardware', frame: 'modF' }));

  // ---- Module B: buttons + nuts, LCD, microSD module
  const btnY = [-45.5, -64.0, -82.5];
  [['btnUp', M.btnBlack, 'BLACK (UP)'], ['btnSel', M.btnBlue, 'BLUE (SEL)'], ['btnDown', M.btnBlack, 'BLACK (DOWN)']].forEach(([id, mat, lbl], i) => {
    add(id, inPrint('B', B.pushButton(mat), [-253.9, btnY[i], 0], [['y', 180]]), { name: `Waterproof Button ${lbl}`, bom: 'Waterproof Button', kind: 'electronic', frame: 'modB' });
    add(id + 'Nut', inPrint('B', B.buttonNut(), [-253.9, btnY[i], 3.3], [['y', 180]]), { name: 'button nut', bom: 'Waterproof Button', kind: 'hardware', frame: 'modB' });
  });
  add('lcd', inPrint('B', B.lcd2004(), [-185.3, -69, 10], [['y', 180]]), { name: 'LCD', bom: 'Serial IIC I2C TWI 2004 204 20*4 English & Japanese Character LCD Module Display Panel Scr', kind: 'electronic', frame: 'modB' });
  add('sdTape', inPrint('B', B.tapeStrip(42, 22), [-160, -80, 17.3], [['x', 90]]), { name: '42mm strip of Double-sided Tape', bom: 'Double Sided Tape Heavy Duty', kind: 'consumable', frame: 'lcd' });
  add('sd', inPrint('B', B.sdModule(), [-160, -80, 19.5]), { name: 'microSD module', bom: 'MicroSD Card Module', kind: 'electronic', frame: 'lcd' });
  add('sdCard', inPrint('B', B.sdCard(), [-171, -80, 22.4], [['x', 90]]), { name: 'microSD card', bom: 'Industrial MicroSD Card 32Gb', kind: 'electronic', frame: 'sd' });

  // ---- Module D: fan + magnets, heater module, thermistor; thermistor needle
  add('fan', inPrint('D', B.stirFan(), [-20, 0.5, 3], [['x', 90]]), { name: '40mm PC fan', bom: 'PC Fan 40x20mm', kind: 'electronic', frame: 'modD' });
  add('fanMag', inPrint('D', B.fanMagnets(), [-20, 0.5, 3 + 19.05], [['x', 90]]), { name: 'two Neodymium Magnets 12x6x3mm', bom: 'Neodymium Magnets 12x6x3mm', kind: 'hardware', frame: 'fan' });
  add('heater', inPrint('D', B.heaterPlate(), [-20, -5, 29.5], [['x', 90]]), { name: 'heater module', bom: 'PTC Heating Plate 80C', kind: 'electronic', frame: 'modD' });
  add('thermHeater', inPrint('D', B.thermistorUnit(), [-20, -28.5, 28.3], [['x', 90]]), { name: 'thermistor unit', bom: 'Precision 10K Ohm NTC Thermistor', kind: 'electronic', frame: 'modD' });
  [[-30, -22, 30.5, 1], [-10, -22, 30.5, 2], [-20, -23, 31, 3]].forEach(([x, y, z, s], i) => add('sealD' + i, inPrint('D', B.sealantBlob(2.6, s), [x, y, z], [['x', 90]]), { name: 'silicone sealant', bom: 'Black High Temp Silicone Sealant', kind: 'consumable', frame: 'modD' }));
  add('thermoNeedle', at(B.thermoNeedle(), TX, CAP_Y + 21.5 - 101.6 + 3, TZ), { name: 'thermistor needle', bom: 'Dispensing Needle 14ga 4"', kind: 'electronic', frame: 'cap' });

  // ---- pumps in Module G (seen from the LCD: M1, M2, M3, M4 left to right)
  [-38.1, -13.4, 11.9, 36.9].forEach((x, i) => add('pump' + i, at(B.pump(), x, 6.5, ZG - 4), { name: `pump motor M${i + 1}`, bom: 'DC Motor Peristaltic Pump', kind: 'electronic', frame: 'modG' }));

  // ---- Module E contents
  add('converter', at(B.converter(), -28, E_FLOOR, -225.35), { name: '12V-to-5V converter', bom: '12v to 5v Converter', kind: 'electronic', frame: 'modE' });
  const bh = (id, color, x, z, ry, name) => add(id, at(B.busHeader(color), x, E_FLOOR, z, ry), { name, bom: 'Female Pin Header Kit', kind: 'electronic', frame: 'modE' });
  bh('bus5V', 'red', -63.6, -155.5, -90, 'red 5V header');
  bh('busGND', 'black', -69.5, -155.5, -90, 'black header (the long one)');
  bh('bus12V', 'orange', 11.0, -209.85, 180, 'orange 12V header');
  bh('busGND2', 'black', 11.0, -203.35, 180, 'short black header');
  add('jack', at(B.barrelJack(), 60.2, FOOT + 11 + 11, -238.85, 180), { name: 'barrel jack connector', bom: 'Barrel Jack Connector 5.5x2.1mm', kind: 'electronic', frame: 'modE' });
  add('rocker', at(B.rockerSwitch(), 32.6, FOOT + 11 + 9.4, -238.85, 180), { name: 'Rocker Switch', bom: 'Rocker Switch', kind: 'electronic', frame: 'modE' });
  [[60, 22, -231], [33, 22, -230]].forEach(([x, y, z], i) => add('sealE' + i, at(B.sealantBlob(6, 7 + i), x, y, z), { name: 'black RTV silicone sealant', bom: 'Black High Temp Silicone Sealant', kind: 'consumable', frame: 'modE' }));
  { const r = B.ds3231(); r.quaternion.setFromEuler(new THREE.Euler(90 * d2r, 90 * d2r, 0, 'YXZ')); r.position.set(-25.3, E_FLOOR + 8.9, -183.35); add('rtc', r, { name: 'Real-Time Clock', bom: 'Adafruit DS3231 Real-Time Clock', kind: 'electronic', frame: 'modE' }); }
  { const c = B.coinCell(); c.quaternion.setFromEuler(new THREE.Euler(0, 0, -90 * d2r)); c.position.set(-25.3 + 3.4, E_FLOOR + 8.9 - 1.8, -183.35 - 1.5); add('coin', c, { name: 'CR1220 battery', bom: 'CR1220 Lithium Battery', kind: 'electronic', frame: 'rtc' }); }
  add('mux', at(B.tca9548a(), -47.05, SO_TOP, -180.05, 0), { name: 'I2C Multiplexer', bom: 'TCA9548A I2C Multiplexer Module', kind: 'electronic', frame: 'modE' });
  add('ledCtl', at(B.tlc5947(), -46.35, SO_TOP, -134.3, -90), { name: 'LED Controller Board', bom: 'TLC5947 module 12-Bit 24-Channel PWM LED Driver Module', kind: 'electronic', frame: 'modE' });
  add('stirCtl', at(B.drv8871(), 7.25, SO_TOP, -175.9, 0), { name: 'DRV8871 Motor Controller Board', bom: 'Adafruit DRV8871 DC Motor Controller', kind: 'electronic', frame: 'modE' });
  add('heaterCtl', at(B.l298n(), 45.8, SO_TOP, -187.4, 0), { name: 'Heater Controller Board', bom: 'L298N Motor Controller', kind: 'electronic', frame: 'modE' });
  add('jumperENA', at(B.jumperCap(), 38.17, SO_TOP + 1.6 + 2.5, -167.8), { name: 'jumper short (ENA)', bom: '2.54mm Jumper Caps', kind: 'hardware', frame: 'heaterCtl' });
  add('jumperENB', at(B.jumperCap(), 53.41, SO_TOP + 1.6 + 2.5, -167.8), { name: 'jumper short (ENB)', bom: '2.54mm Jumper Caps', kind: 'hardware', frame: 'heaterCtl' });
  const megaO = new THREE.Vector3(71.99, SO_TOP, -161.09);
  add('mega', at(B.arduinoMega(), megaO.x, megaO.y, megaO.z, 180), { name: 'Arduino MEGA 2560 Board', bom: 'Arduino MEGA 2560 R3', kind: 'electronic', frame: 'modE' });
  add('usbTape', at(B.tapeStrip(14, 14), megaO.x - 4, SO_TOP + 12.6, megaO.z + 38.1), { name: 'double-sided tape over the USB-B port', bom: 'Double Sided Tape Heavy Duty', kind: 'consumable', frame: 'mega' });
  add('shield', at(B.motorShield(), megaO.x, SO_TOP + 1.6 + 8.5 + 3.1, megaO.z, 180), { name: 'Motor Shield', bom: 'IC I2C TB6612 Mosfet Stepper Motor PCA9685 Servo Driver Shield V2 For Robot PWM Mega R3', kind: 'electronic', frame: 'mega' });
  for (const [step, s] of Object.entries(SCREW_STEPS)) s.holes.forEach((h, i) => {
    const [x, z] = E_HOLES[h];
    add(`so${step}_${i}`, at(B.standoff(s.size), x, E_FLOOR, z), { name: `10mm ${s.size} female standoff`, bom: s.size === 'M3' ? 'M3 x 10mm Female Standoff' : 'M2.5 x 10mm Female Standoff', kind: 'hardware', frame: 'modE', step: +step });
    const headY = F_COVER(z) ? FOOT + 8 : FOOT + 11;
    add(`sc${step}_${i}`, at(B.screw(s.size, Math.min(s.len, SO_TOP - 2 - headY)), x, headY, z, 0, 180), { name: `${s.len}mm ${s.size} screw`, bom: s.size === 'M3' ? 'M3 Hex Screw Kit 4mm, 10mm, 20mm' : 'M2.5 Hex Screw Kit 4mm, 10mm', kind: 'hardware', frame: 'modE', step: +step });
  });
  for (const [step, list] of Object.entries(BOARD_SCREWS)) list.forEach(([owner, size, hs]) => hs.forEach((h, i) => {
    const [x, z] = E_HOLES[h];
    add(`bs_${owner}_${i}`, at(B.screw(size, 4), x, SO_TOP + 1.6, z), { name: `4mm ${size} screw`, bom: size === 'M3' ? 'M3 Hex Screw Kit 4mm, 10mm, 20mm' : 'M2.5 Hex Screw Kit 4mm, 10mm', kind: 'hardware', frame: owner, step: +step });
  }));

  // ---- Module L magnets; modules N/O/P/M with magnets and electronics
  const bayDirs = { O: [0, 0, 1], N: [0, 0, -1], P: [1, 0, 0], M: [-1, 0, 0] };
  let mi = 0;
  for (const k of ['O', 'N', 'P', 'M']) {
    const r = new THREE.Vector3(...bayDirs[k]), tg = new THREE.Vector3(0, 1, 0).cross(r).normalize();
    [-13.5, 13.5].forEach(o => {
      const mg = B.magnet(); mg.position.set(TX, BAY_Y, TZ).addScaledVector(r, 24.6).addScaledVector(tg, o);
      mg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), r); mg.rotateZ(Math.PI / 2);
      add('magL' + (mi++), mg, { bom: 'Neodymium Magnets 12x6x3mm', kind: 'hardware', frame: 'modL' });
    });
  }
  const modMag = (L, yc) => [-405, -378].forEach((x, k) => { const m = B.magnet(); inPrint(L, m, [x, yc, 1.5], [['z', 90]]); add(`mag${L}${k}`, m, { bom: 'Neodymium Magnets 12x6x3mm', kind: 'hardware', frame: 'mod' + L }); });
  modMag('N', -13.5); modMag('O', -92.5); modMag('P', -54.2); modMag('M', 28.5);
  [-405, -378].forEach((x, k) => { const m = B.magnet(); inPrint('M', m, [x, 28.5, -1.6], [['z', 90]]); add(`magMl${k}`, m, { name: 'loose magnet', bom: 'Neodymium Magnets 12x6x3mm', kind: 'hardware', frame: 'modM' }); });
  add('topLabel', inPrint('M', B.topLabel(), [-391.5, 41.2, 10], []), { name: 'clear tape labelled TOP', kind: 'consumable', frame: 'modM' });
  add('tsl', inPrint('N', B.tsl2591(), [-391.5, -13.5, 2.2], [['y', 180]]), { name: 'TSL2591 module', bom: 'TSL2591 Light Sensor', kind: 'electronic', frame: 'modN' });
  add('sealN', inPrint('N', B.sealantBlob(3, 11), [-391.5, -22, 19.5]), { name: 'black silicone sealant', bom: 'Black High Temp Silicone Sealant', kind: 'consumable', frame: 'modN' });
  add('odLed', inPrint('O', B.led5mm('#c0306a', true), [-391.5, -92.5, 9.5], [['y', 180]]), { name: '940nm LED', bom: 'Optional LEDs (100 UV-NIR, includes shipping)', kind: 'electronic', frame: 'modO' });
  add('sealO', inPrint('O', B.sealantBlob(3, 12), [-391.5, -92.5, 19.5]), { name: 'black silicone sealant', bom: 'Black High Temp Silicone Sealant', kind: 'consumable', frame: 'modO' });
  const SIX = [['yellow', '#ffd21a'], ['orange', '#ff8a1a'], ['red', '#ff2a2a'], ['purple', '#9b35ff'], ['blue', '#2f6bff'], ['green', '#2bd96b']];
  [[-398.5, -50.95], [-391.5, -50.95], [-384.5, -50.95], [-398.5, -57.45], [-391.5, -57.45], [-384.5, -57.45]].forEach(([x, y], i) =>
    add('sixLed' + i, inPrint('P', B.led5mm(SIX[i][1]), [x, y, 9.5], [['y', 180]]), { name: `${SIX[i][0]} LED`, bom: 'Optional LEDs (100 UV-NIR, includes shipping)', kind: 'electronic', frame: 'modP', ledColor: SIX[i][0] }));
  add('sealP', inPrint('P', B.sealantBlob(4, 13), [-391.5, -54.2, 19.5]), { name: 'black silicone sealant', bom: 'Black High Temp Silicone Sealant', kind: 'consumable', frame: 'modP' });
  add('supports', at(B.supportBits(5), 0, 0, 0), { name: '3D printed support material', kind: 'consumable', frame: null });

  // ---- vial and labware
  const vial = at(B.vial(), TX, VIAL_FLOOR, TZ); add('vial', vial, { name: '90mL glass vial', bom: '90mL Glass Vial', kind: 'labware' });
  const inner = vial.userData.inner;
  const media = B.liquid(inner.r, 46, M.media.clone()); media.position.set(TX, VIAL_FLOOR + inner.floor + 23, TZ);
  add('media', media, { name: '50mL', kind: 'labware', frame: 'vial' });
  add('stirBar', at(B.stirBar(), TX, VIAL_FLOOR + inner.floor, TZ), { name: 'magnetic stir bar', bom: '8mm x 20mm olive-shaped stir bar', kind: 'labware', frame: 'vial' });
  add('cap', at(B.siliconeCap(), TX, CAP_Y, TZ), { name: 'cast silicone rubber cap', bom: 'Hard Silicone Rubber Casting Resin', kind: 'labware', frame: 'vial' });
  const holesXZ = B.capHoles();
  holesXZ.slice(1).forEach(([x, z], i) => add('needle' + i, at(B.needle(50.8), TX + x, CAP_Y + 21.5 - 50.8 + 3, TZ + z), { name: '2" 14 Gauge Needle', bom: 'Dispensing Needle 14ga 1.5"', kind: 'labware', frame: 'cap' }));
  holesXZ.forEach(([x, z], i) => add('moldNeedle' + i, at(B.needle(101.6), 215 + x, 115.6, -15 + z, 0, 180), { name: '14-gauge 4" luer-lock dispensing needle', bom: 'Dispensing Needle 14ga 4"', kind: 'hardware', frame: 'modH' }));
  add('siliconeCup', at(B.cup('two-part silicone'), 268, 0, 25), { name: 'two-part silicone (20 g base + 20 g hardener)', bom: 'Hard Silicone Rubber Casting Resin', kind: 'consumable', frame: null });
  add('bottleTop', at(B.siliconeCap(M.silBlue, 'silicone media bottle top'), -160, 12, 132), { name: 'silicone media bottle top', bom: 'Hard Silicone Rubber Casting Resin', kind: 'labware', frame: null });
  parts.bottleTop.obj.scale.set(1.15, 0.6, 1.15);
  [-5, 5].forEach((dx, i) => add('btLuer' + i, at(B.luerFemale(), -160 + dx, 25, 132), { name: 'luer lock', bom: 'Luer Lock Female to Barb 1/8" Cat# 51525K293', kind: 'labware', frame: 'bottleTop' }));

  root.updateMatrixWorld(true);
  const prims = collectPrims(parts);
  if (!opts.noMerge) for (const id in parts) if (parts[id].kind !== 'printed' && parts[id].kind !== 'virtual') B.optimizePart(parts[id].obj);
  root.updateMatrixWorld(true);
  return { parts, printFrame, prims };
}

// oriented boxes of every procedural primitive at the assembled pose (used to route wires clear of parts)
function collectPrims(parts) {
  const out = [];
  for (const id in parts) {
    const p = parts[id]; if (p.kind === 'printed' || p.kind === 'virtual') continue;
    p.obj.traverse(m => {
      if (!m.isMesh || m.isInstancedMesh) return;
      const g = m.geometry; g.computeBoundingBox(); const bb = g.boundingBox;
      const sz = bb.getSize(new THREE.Vector3()); if (Math.min(sz.x, sz.y, sz.z) < 0.15) return;
      out.push({ id, inv: m.matrixWorld.clone().invert(), min: bb.min.clone(), max: bb.max.clone() });
    });
  }
  return out;
}

export function pinWorld(parts, id, pin) {
  const p = parts[id]; if (!p) throw new Error('no part ' + id);
  const v = p.obj.userData.pins?.[pin]; if (!v) throw new Error(`no pin ${id}.${pin}`);
  return p.obj.localToWorld(v.clone());
}
