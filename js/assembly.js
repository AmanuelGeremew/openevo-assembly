// Builds the complete OpenEvo Type D Mk4 at its assembled pose.
// The 26 printed modules are the team's real STL files (site/models/A..Z.stl). Their
// placement was derived from the geometry itself: rod holes (5 mm, 135 mm apart, 5.5 mm above
// each rail's underside), the matching M3/M2.5 screw patterns of Modules E and F, the Arduino
// Mega's four mounting holes in Module E, and the stacking bosses of Modules D -> L -> Q.
// World frame: millimetres, +Y up, +Z toward the LCD (front), +X to the operator's right.
import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { M } from './materials.js';
import * as B from './builders.js';

export const FOOT = 3.5;                 // rubber feet
export const ROD_Y = FOOT + 5.5;         // rod centreline height
export const ROD_X = 67.4;
export const ROD_FRONT = 130, ROD_BACK = -170;   // 300 mm rods, bottomed in A and F
export const ZC = -5;                    // stirrer rail (C) centre
export const ZG = -81;                   // DC motor rail (G) centre
export const TX = -3.66;                 // tower axis X (C's frame is offset from the rods)
export const TZ = ZC;
export const C_TOP = 6.5;                // top of C's plate = underside of D
export const VIAL_FLOOR = C_TOP + 34.5;  // seat of the vial in D
export const CAP_Y = VIAL_FLOOR + 100.5; // vial rim = top of Q's boss
export const BENCH = new THREE.Vector3(215, 0, -15);   // workbench area for sub-assemblies

const d2r = Math.PI / 180;
const AX = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
function rotMatrix(rot) { const m = new THREE.Matrix4(); for (const [a, deg] of rot) m.premultiply(new THREE.Matrix4().makeRotationAxis(AX[a], deg * d2r)); return m; }

// Placement of each printed module: rotations (applied in order to the print-bed coords),
// a reference point in print coords, and where that point lands in the world.
export const STL = {
  A: { name: 'Module A · LCD Rail', rot: [['y', 180]], from: [-202.925, 10.5, 20], to: [0, ROD_Y, ROD_FRONT] },
  B: { name: 'Module B · LCD Faceplate', rot: [['y', 180], ['x', -45]], from: [-202.9, -102, 11], to: [0, 15.2, 148.6] },
  C: { name: 'Module C · Stirrer Rail', rot: [], from: [-202.84, -10.5, 28], to: [0, ROD_Y, ZC] },
  D: { name: 'Module D · Heater-Stirrer Base', rot: [['x', -90], ['y', 180]], from: [-20, 0.5, 0], to: [TX, C_TOP, TZ] },
  E: { name: 'Module E · Motherboard', rot: [['x', -90]], from: [0, 0, 0], to: [285.05, FOOT + 11, 47.15] },
  F: { name: 'Module F · Motherboard Rail', rot: [], from: [-203.4, 42.5, 6], to: [0, ROD_Y, ROD_BACK] },
  G: { name: 'Module G · DC Motor Rail', rot: [], from: [-212.925, -283.5, 18], to: [0, ROD_Y, ZG] },
  L: { name: 'Module L · Module Bay', rot: [['x', -90]], from: [-317, 9, 0], to: [TX, C_TOP + 47, TZ] },
  Q: { name: 'Module Q · Reactor Top', rot: [['x', -90]], from: [-64, -71, 0], to: [TX, C_TOP + 77, TZ] },
  // sensor / LED modules in the four bays (inner face 26 mm from the vial axis)
  O: { name: 'Module O · 940 nm OD Light Module', rot: [], from: [-391.5, -92.5, 0], to: [TX, C_TOP + 62, TZ + 26] },
  N: { name: 'Module N · OD Sensor Module', rot: [['y', 180]], from: [-391.5, -13.5, 0], to: [TX, C_TOP + 62, TZ - 26] },
  P: { name: 'Module P · LED Six-Pack Module', rot: [['y', 90]], from: [-391.5, -54.2, 0], to: [TX + 26, C_TOP + 62, TZ] },
  M: { name: 'Module M · Blank Module', rot: [['y', -90]], from: [-391.5, 28.5, 0], to: [TX - 26, C_TOP + 62, TZ] },
  // cap mold on the workbench (H bottom, I/J halves, K top flipped)
  H: { name: 'Module H · Reactor Cap Mold (bottom)', rot: [['x', -90]], from: [99, 59, 0], to: [BENCH.x, 16, BENCH.z] },
  I: { name: 'Module I · Reactor Cap Mold (left)', rot: [['x', -90]], from: [99, -8, 0], to: [BENCH.x, 48, BENCH.z] },
  J: { name: 'Module J · Reactor Cap Mold (right)', rot: [['x', -90]], from: [99, -4.7, 0], to: [BENCH.x, 48, BENCH.z] },
  K: { name: 'Module K · Reactor Cap Mold (top)', rot: [['x', 90]], from: [99, -72, 0], to: [BENCH.x, 97, BENCH.z] },
  // media bottle top mold + light-tight media bottle housing (left of the robot)
  T: { name: 'Module T · Bottle Top Mold (base)', rot: [['x', -90]], from: [-78, 76, 0], to: [-218, 0, 125] },
  U: { name: 'Module U · Bottle Top Mold (cavity)', rot: [['x', -90]], from: [-78, -71, 0], to: [-218, 2, 125] },
  W: { name: 'Module W · Bottle Top Mold (hole pins)', rot: [['x', -90]], from: [-78, -32.2, 0], to: [-218, 0, 125] },
  V: { name: 'Module V · Bottle Top Mold (lid)', rot: [['x', 90]], from: [-78, 6, 0], to: [-218, 27, 125] },
  X: { name: 'Module X · Media Light Blocker (sleeve)', rot: [['x', -90]], from: [133, -107, 0], to: [-240, 0, -150] },
  Y: { name: 'Module Y · Media Light Blocker (lid half)', rot: [['x', -90]], from: [-61, -173.5, 0], to: [-240, 128, -150] },
  Z: { name: 'Module Z · Media Light Blocker (lid half)', rot: [['x', -90]], from: [-61, -181, 0], to: [-240, 128, -150] },
  R: { name: 'Module R · Reactor Top Side / light blocker (optional)', rot: [['x', -90]], from: [4.4, 3.45, 0], to: [-222, 0, 205] },
  S: { name: 'Module S · Top Light Blocker (optional)', rot: [['x', -90]], from: [11, -12, 0], to: [-160, 0, 205] },
};

export async function buildAssembly(root, onProgress = () => {}) {
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
    parts[id] = { id, obj, name: meta.name || obj.name || id, ...meta };
    return obj;
  }

  // ---- printed modules
  letters.forEach((L, i) => {
    const s = STL[L], g = geos[i];
    const R = rotMatrix(s.rot);
    const from = new THREE.Vector3(...s.from).applyMatrix4(R);
    const t = new THREE.Vector3(...s.to).sub(from);
    const Mw = R.clone().setPosition(t);
    printFrame[L] = Mw;
    g.applyMatrix4(Mw); g.computeBoundingBox();
    const c = g.boundingBox.getCenter(new THREE.Vector3());
    g.translate(-c.x, -c.y, -c.z); g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, M.pla); mesh.castShadow = mesh.receiveShadow = true; mesh.position.copy(c);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(g, 28), M.plaEdge); edges.raycast = () => {};
    mesh.add(edges); mesh.name = s.name;
    add('mod' + L, mesh, { name: s.name, kind: 'printed', module: L, stl: `models/${L}.stl` });
  });

  // place an object in a printed module's print-bed frame
  function inPrint(L, obj, pos, rot = []) {
    const m = printFrame[L].clone().multiply(new THREE.Matrix4().makeTranslation(...pos)).multiply(rotMatrix(rot));
    m.decompose(obj.position, obj.quaternion, obj.scale); return obj;
  }
  const at = (obj, x, y, z, ry = 0, rx = 0, rz = 0) => { obj.position.set(x, y, z); obj.rotation.set(rx * d2r, ry * d2r, rz * d2r); return obj; };

  // ---- frame
  add('rodL', at(B.rod(300), -ROD_X, ROD_Y, (ROD_FRONT + ROD_BACK) / 2), { name: 'Steel rod (left)', kind: 'hardware', bom: '5mm x 300mm Steel Rod' });
  add('rodR', at(B.rod(300), ROD_X, ROD_Y, (ROD_FRONT + ROD_BACK) / 2), { name: 'Steel rod (right)', kind: 'hardware', bom: '5mm x 300mm Steel Rod' });
  const feet = { A: [[-58, 100], [58, 100], [-58, 143], [58, 143]], C: [[-60, -26], [60, -26], [-60, 16], [60, 16], [TX, ZC]], G: [[-58, ZG], [58, ZG]], F: [[-60, -140], [60, -140]] };
  for (const k in feet) feet[k].forEach(([x, z], i) => add(`foot${k}${i}`, at(B.rubberFoot(), x, 0, z), { name: 'Rubber foot', kind: 'hardware', bom: 'Square Adhesive Rubber Feet' }));

  // ---- LCD faceplate (Module B): buttons, LCD, microSD
  const btnY = [-45.5, -64.0, -82.5];
  [['btnUp', M.btnBlack, 'UP'], ['btnSel', M.btnBlue, 'SEL'], ['btnDown', M.btnBlack, 'DOWN']].forEach(([id, mat, lbl], i) => {
    const b = B.pushButton(mat); b.scale.setScalar(0.78);
    inPrint('B', b, [-253.9, btnY[i], 0], [['y', 180]]); b.scale.setScalar(0.78);
    add(id, b, { name: `Waterproof button (${lbl})`, kind: 'electronic', bom: 'Waterproof Button' });
  });
  const lcd = B.lcd2004(); inPrint('B', lcd, [-185.3, -69, 10], [['y', 180]]);
  add('lcd', lcd, { name: '20x4 I²C LCD display', kind: 'electronic', bom: 'Serial IIC I2C TWI 2004 LCD' });
  const sd = B.sdModule(); inPrint('B', sd, [-160, -80, 19.5], [['y', 0]]);
  add('sd', sd, { name: 'MicroSD card module', kind: 'electronic', bom: 'MicroSD Card Module' });
  const tape = B.tapeStrip(42, 22); inPrint('B', tape, [-160, -80, 17.3], [['x', 90]]);
  add('sdTape', tape, { name: 'Double-sided tape (42 mm)', kind: 'consumable', bom: 'Double Sided Tape Heavy Duty' });

  // ---- stirrer base internals (in Module D print frame)
  const fan = B.stirFan(); inPrint('D', fan, [-20, 0.5, 3], [['x', 90]]);
  add('fan', fan, { name: '40 mm PC fan + 2× N52 magnets (stirrer)', kind: 'electronic', bom: 'PC Fan 40x20mm' });
  const heater = B.heaterPlate(); inPrint('D', heater, [-20, -5, 29.5], [['x', 90]]);
  add('heater', heater, { name: 'PTC heating plate (80 °C)', kind: 'electronic', bom: 'PTC Heating Plate 80C' });
  const therm = B.thermistorUnit(); inPrint('D', therm, [-20, -28.5, 28.3], [['x', 90]]);
  add('thermHeater', therm, { name: 'Heater-plate thermistor (NTC 10k + 10k resistor)', kind: 'electronic', bom: 'Precision 10K Ohm NTC Thermistor' });
  [[-30, -26, 31, 1], [-10, -26, 31, 2], [-20, -26, 26, 3]].forEach(([x, y, z, s], i) => {
    const b = B.sealantBlob(3.2, s); inPrint('D', b, [x, y, z], [['x', 90]]);
    add('sealD' + i, b, { name: 'Black RTV silicone sealant', kind: 'consumable', bom: 'Black High Temp Silicone Sealant' });
  });

  // ---- pumps in Module G cradles (left->right from the front: NEU, WST, POS, NEG = M1..M4)
  const pumpLabels = ['NEU', 'WST', 'POS', 'NEG'];
  [-38.1, -13.4, 11.9, 36.9].forEach((x, i) => add('pump' + i, at(B.pump(pumpLabels[i]), x, 6.5, ZG - 4), { name: `Peristaltic pump M${i + 1} · ${pumpLabels[i]}`, kind: 'electronic', bom: 'DC Motor Peristaltic Pump', pumpIndex: i }));

  // ---- motherboard (Module E). Floor top at y = FOOT+11+3.
  const FLOOR = FOOT + 14, SO = FLOOR + 10; // standoff tops
  const megaO = new THREE.Vector3(71.99, SO, -161.09);
  const mega = at(B.arduinoMega(), megaO.x, megaO.y, megaO.z, 180);
  add('mega', mega, { name: 'Arduino Mega 2560 R3', kind: 'electronic', bom: 'Arduino MEGA 2560 R3' });
  const shield = at(B.motorShield(), megaO.x, SO + 1.6 + 8.5 + 1.5, megaO.z, 180);
  add('shield', shield, { name: 'Motor Shield V2 (PCA9685 + TB6612)', kind: 'electronic', bom: 'Motor Shield V2 For Mega R3' });
  add('heaterCtl', at(B.l298n(), 45.8, SO, -187.4, 0), { name: 'L298N heater controller', kind: 'electronic', bom: 'L298N Motor Controller' });
  add('mux', at(B.tca9548a(), -47.0, SO, -180.2, 0), { name: 'TCA9548A I²C multiplexer', kind: 'electronic', bom: 'TCA9548A I2C Multiplexer' });
  add('stirCtl', at(B.drv8871(), 7.25, SO, -175.8, 0), { name: 'DRV8871 stirring motor controller', kind: 'electronic', bom: 'Adafruit DRV8871 DC Motor Controller' });
  add('ledCtl', at(B.tlc5947(), -46.4, SO, -134.3, -90), { name: 'TLC5947 24-channel LED controller', kind: 'electronic', bom: 'TLC5947 LED Driver Module' });
  { const r = B.ds3231(); r.rotation.set(-90 * d2r, 0, 0); r.rotateOnWorldAxis(AX.y, 90 * d2r); r.position.set(-22.95, FLOOR + 31, -183.4); add('rtc', r, { name: 'DS3231 real-time clock (+ CR1220)', kind: 'electronic', bom: 'Adafruit DS3231 Real-Time Clock' }); }
  // bus header strips: 5 V + GND along the left wall, 12 V + GND at the back
  const bh = (id, color, x, z, ry, name) => add(id, at(B.busHeader(color), x, FLOOR + 3.5, z, ry), { name, kind: 'electronic', bom: 'Female Pin Header Kit' });
  bh('bus5V', 'red', -63.6, -154.8, -90, '5 V bus header');
  bh('busGND', 'black', -69.5, -154.8, -90, 'GND bus header (5 V side)');
  bh('bus12V', 'orange', -36, -210.2, 0, '12 V bus header');
  bh('busGND2', 'black', -36, -203.5, 0, 'GND bus header (12 V side)');
  add('converter', at(B.converter(), -22, FLOOR + 13.5, -225, 0, 0, 90), { name: '12 V → 5 V converter', kind: 'electronic', bom: '12v to 5v Converter' });
  parts.converter.obj.rotation.set(90 * d2r, 0, 0);
  add('jack', at(B.barrelJack(), 60.2, FOOT + 11 + 11, -238.85, 180), { name: 'Barrel jack 5.5×2.1 mm', kind: 'electronic', bom: 'Barrel Jack Connector 5.5x2.1mm' });
  add('rocker', at(B.rockerSwitch(), 32.6, FOOT + 11 + 9.4, -238.85, 180), { name: 'Rocker switch', kind: 'electronic', bom: 'Rocker Switch' });
  [[60, FOOT + 11 + 4, -233], [36, FOOT + 11 + 3.5, -233]].forEach(([x, y, z], i) => add('sealE' + i, at(B.sealantBlob(5, 7 + i), x, y + 2, z), { name: 'Black RTV silicone sealant', kind: 'consumable', bom: 'Black High Temp Silicone Sealant' }));
  // standoffs (10 mm) under the boards
  const so = [];
  [[15.24, 50.8], [90.17, 50.8], [13.97, 2.54], [96.52, 2.54]].forEach(([x, y]) => so.push(['mega', megaO.x - x, megaO.z + y]));
  [[-56.5, -111.7], [-36.2, -111.7], [-56.3, -156.6], [-36.2, -156.9]].forEach(([x, z]) => so.push(['ledCtl', x, z]));
  [[-0.4, -168.4], [14.8, -168.5]].forEach(([x, z]) => so.push(['stirCtl', x, z]));
  [[27.5, -169.1], [27.3, -205.8], [64.0, -205.5]].forEach(([x, z]) => so.push(['heaterCtl', x, z]));
  [[-59.75, -180.05], [-34.35, -180.05]].forEach(([x, z]) => so.push(['mux', x, z]));
  so.forEach(([owner, x, z], i) => add('so' + i, at(B.standoff(10), x, FLOOR, z), { name: 'M3 / M2.5 brass standoff + screw', kind: 'hardware', bom: 'M3 x 10mm Female Standoff', owner }));
  add('usbTape', at(B.tapeStrip(14, 14), megaO.x - 4, SO + 12.8, megaO.z + 38.1), { name: 'Insulating tape over USB-B', kind: 'consumable', bom: 'Double Sided Tape Heavy Duty' });

  // ---- sensor modules: TSL2591 in N, 940 nm LED in O, six LEDs in P
  const tsl = B.tsl2591(); inPrint('N', tsl, [-391.5, -13.5, 2.2], [['y', 180]]);
  add('tsl', tsl, { name: 'TSL2591 light sensor (OD detector)', kind: 'electronic', bom: 'TSL2591 Light Sensor' });
  const odLed = B.led5mm('#c0306a'); inPrint('O', odLed, [-391.5, -92.5, 9.5], [['y', 180]]);
  add('odLed', odLed, { name: '940 nm IR LED (OD light source)', kind: 'electronic', bom: 'Optional LEDs (UV-NIR)' });
  const sixPos = [[-398.5, -50.95], [-391.5, -50.95], [-384.5, -50.95], [-398.5, -57.45], [-391.5, -57.45], [-384.5, -57.45]];
  const ledCols = ['#7b2cff', '#2f6bff', '#16c6ff', '#2bd96b', '#ffb21f', '#ff2a2a'];
  sixPos.forEach(([x, y], i) => { const l = B.led5mm(ledCols[i]); inPrint('P', l, [x, y, 9.5], [['y', 180]]); add('sixLed' + i, l, { name: `Optogenetic LED ${i + 1}`, kind: 'electronic', bom: 'Optional LEDs (UV-NIR)', ledIndex: i }); });
  // magnets glued into the module faces (two per module, plus the bay)
  const magFaces = [['M', 28.5], ['N', -13.5], ['O', -92.5], ['P', -54.2]];
  magFaces.forEach(([L, yc]) => [-405, -378].forEach((x, k) => { const m = B.magnet(); inPrint(L, m, [x, yc, 1.4], []); m.scale.set(1, 0.98, 0.95); add(`mag${L}${k}`, m, { name: 'Neodymium magnet 12×6×3', kind: 'hardware', bom: 'Neodymium Magnets 12x6x3mm' }); }));

  // ---- reactor: vial, media, stir bar, cap, needles, tubing (assembled at the end)
  const vial = at(B.vial(), TX, VIAL_FLOOR, TZ); add('vial', vial, { name: '90 mL glass reactor vial', kind: 'labware', bom: '90mL Glass Vial' });
  const inner = vial.userData.inner;
  const media = B.liquid(inner.r, 46, M.media.clone()); media.position.set(TX, VIAL_FLOOR + inner.floor + 23, TZ);
  add('media', media, { name: 'Culture medium (50 mL)', kind: 'labware' });
  add('stirBar', at(B.stirBar(), TX, VIAL_FLOOR + inner.floor, TZ), { name: 'Olive stir bar 8×20 mm', kind: 'labware', bom: '8mm x 20mm olive-shaped stir bar' });
  add('cap', at(B.siliconeCap(), TX, CAP_Y, TZ), { name: 'Cast silicone reactor cap', kind: 'labware', bom: 'Hard Silicone Rubber Casting Resin' });
  const holes = B.capHoles();
  const needleNames = ['NEU in', 'WST out', 'POS in', 'NEG in', 'Air vent (0.22 µm)'];
  holes.slice(1).forEach(([x, z], i) => add('needle' + i, at(B.needle(50.8), TX + x, CAP_Y + 21.5 - 50.8 + 3, TZ + z), { name: `2" 14 ga needle · ${needleNames[i]}`, kind: 'labware', bom: 'Dispensing Needle 14ga 1.5"' }));
  add('thermoNeedle', at(B.thermoNeedle(), TX, CAP_Y + 21.5 - 101.6 + 3, TZ), { name: 'Thermistor needle probe (media temperature)', kind: 'electronic', bom: 'Dispensing Needle 14ga 4"' });
  add('filter', at(B.syringeFilter(), TX + holes[5][0], CAP_Y + 21.5 + 3 + 12 + 22, TZ + holes[5][1]), { name: '0.22 µm PES syringe filter (air vent)', kind: 'labware', bom: 'PES 0.22um Syringe Filters' });

  // cast cap inside the mold on the bench + mold needles
  holes.forEach(([x, z], i) => add('moldNeedle' + i, at(B.needle(101.6), BENCH.x + x, 115.6, BENCH.z + z, 0, 180), { name: '14 ga needle (hole former)', kind: 'hardware', bom: '10 Pack - Dispensing Needle 10G x 5"' }));

  // media bottles (light-tight housing on the left) and a blue silicone bottle top
  const bottleTop = at(B.siliconeCap(M.silBlue), -160, 12, 132, 0, 0); bottleTop.scale.set(1.15, 0.6, 1.15);
  add('bottleTop', bottleTop, { name: 'Cast silicone media-bottle top', kind: 'labware', bom: 'Hard Silicone Rubber Casting Resin' });

  root.updateMatrixWorld(true);
  for (const id in parts) if (parts[id].kind !== 'printed') B.optimizePart(parts[id].obj);
  root.updateMatrixWorld(true);
  return { parts, printFrame };
}

// world-space location of a named pin on a part
export function pinWorld(parts, id, pin) {
  const p = parts[id]; if (!p) throw new Error('no part ' + id);
  const v = p.obj.userData.pins?.[pin]; if (!v) throw new Error(`no pin ${id}.${pin}`);
  return p.obj.localToWorld(v.clone());
}
