// Every wire from the team's Wiring Checklist and the Assembly Manual, between the pins the manual
// names, with the connection types from the checklist (Solder / Male / Female). Routes follow the manual:
// button wires through Module A's slot, bundles "beneath the robot" and "over the left cutout on the
// Motherboard"; jumpers inside Module E arc clear of every component.
import * as THREE from 'three';
import { wireMat, M } from './materials.js';
import { TX, TZ } from './assembly.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UPV = V(0, 1, 0);

export function pinInfo(parts, id, name) {
  const p = parts[id]; if (!p) throw new Error('no part ' + id);
  const o = p.obj, v = o.userData.pins?.[name]; if (!v) throw new Error(`no pin ${id}.${name}`);
  const q = o.getWorldQuaternion(new THREE.Quaternion());
  const d = (o.userData.leads?.[name] || UPV).clone().applyQuaternion(q).normalize();
  return { p: o.localToWorld(v.clone()), d };
}
// where the wire leaves each connector type (distance along the lead from the pin point)
const START = { female: 7, male: 13, solder: 1, screw: 3, bare: 0 };

// ---------------------------------------------------------------------------- the wire list
export function wireSpecs() {
  const W = [];
  const add = (id, color, a, b, ends, route, grow, opt = {}) => W.push({ id, color, a, b, ends, route, grow, ...opt });
  const R = { bus5V: 19, busGND: 19, bus12V: 0, busGND2: 0 };
  const rail = (b, front = true) => [b, 'p' + (b === 'bus12V' || b === 'busGND2' ? R[b]++ : front ? R[b]-- : 19 - (R[b + 'back'] = (R[b + 'back'] ?? -1) + 1))];

  // steps 4-6 / 71: buttons
  add('btnBridge', 'bare', ['btnUp', 'gnd'], ['btnDown', 'gnd'], 'bare-bare', 'bridge', [['h4', 1]], { via: [['btnSel', 'gnd']], r: 0.45, cm: 8, propColor: 'black' });
  add('btnUP', 'blue', ['btnUp', 'sig'], ['mega', 'D26'], 'solder-male', 'faceBtn', [['h6', 0.17], ['h71', 1]], { cm: 38 });
  add('btnSEL', 'white', ['btnSel', 'sig'], ['mega', 'D24'], 'solder-male', 'faceBtn', [['h6', 0.17], ['h71', 1]], { cm: 37 });
  add('btnDOWN', 'green', ['btnDown', 'sig'], ['mega', 'D22'], 'solder-male', 'faceBtn', [['h6', 0.17], ['h71', 1]], { cm: 36 });
  add('btnGND', 'black', ['btnDown', 'gnd'], ['busGND', 'p19'], 'solder-male', 'faceBtn', [['h6', 0.17], ['h71', 1]], { cm: 34 });
  // step 9 / 72: microSD module
  add('sdCS', 'brown', ['sd', 'CS'], ['mega', 'D53'], 'female-male', 'faceLcd', [['h9', 0.13], ['h72', 1]], { cm: 38 });
  add('sdSCK', 'pink', ['sd', 'SCK'], ['mega', 'D52'], 'female-male', 'faceLcd', [['h9', 0.13], ['h72', 1]], { cm: 38 });
  add('sdMOSI', 'orange', ['sd', 'MOSI'], ['mega', 'D51'], 'female-male', 'faceLcd', [['h9', 0.13], ['h72', 1]], { cm: 38 });
  add('sdMISO', 'purple', ['sd', 'MISO'], ['mega', 'D50'], 'female-male', 'faceLcd', [['h9', 0.13], ['h72', 1]], { cm: 38 });
  add('sdVCC', 'red', ['sd', 'VCC'], ['bus5V', 'p19'], 'female-male', 'faceLcd', [['h9', 0.13], ['h72', 1]], { cm: 30 });
  add('sdGND', 'black', ['sd', 'GND'], ['busGND', 'p18'], 'female-male', 'faceLcd', [['h9', 0.13], ['h72', 1]], { cm: 30 });
  // step 10 / 70: LCD I2C board
  add('lcdGND', 'black', ['lcd', 'GND'], ['busGND', 'p17'], 'female-male', 'faceLcd', [['h10', 0.13], ['h70', 1]], { cm: 30 });
  add('lcdVCC', 'red', ['lcd', 'VCC'], ['bus5V', 'p18'], 'female-male', 'faceLcd', [['h10', 0.13], ['h70', 1]], { cm: 30 });
  add('lcdSDA', 'yellow', ['lcd', 'SDA'], ['mux', 'SD0'], 'female-female', 'faceLcd', [['h10', 0.13], ['h70', 1]], { cm: 38 });
  add('lcdSCL', 'green', ['lcd', 'SCL'], ['mux', 'SC0'], 'female-female', 'faceLcd', [['h10', 0.13], ['h70', 1]], { cm: 38 });

  // steps 15 / 59 / 60: stirring fan
  add('fanPos', 'orange', ['fan', '+'], ['stirCtl', 'OUT2'], 'solder-screw', 'towerD', [['h15', 0.12], ['h59', 0.8], ['h60', 1]], { cm: 28, shrink: 'a' });
  add('fanGnd', 'black', ['fan', '-'], ['stirCtl', 'OUT1'], 'solder-screw', 'towerD', [['h15', 0.12], ['h59', 0.8], ['h60', 1]], { cm: 28, shrink: 'a' });
  // steps 17 / 59 / 61: heater plate (two orange wires on each lead)
  add('htrTL', 'orange', ['heater', 'a'], ['heaterCtl', 'OUT1'], 'solder-screw', 'towerD', [['h17', 0.12], ['h59', 0.78], ['h61', 0.97], ['h62', 1]], { cm: 28, shrink: 'a' });
  add('htrTR', 'orange', ['heater', 'a'], ['heaterCtl', 'OUT2'], 'solder-screw', 'towerD', [['h17', 0.12], ['h59', 0.78], ['h61', 0.97], ['h62', 1]], { cm: 28, shrink: 'a' });
  add('htrBL', 'orange', ['heater', 'b'], ['heaterCtl', 'OUT3'], 'solder-screw', 'towerD', [['h17', 0.12], ['h59', 0.78], ['h61', 0.97], ['h62', 1]], { cm: 28, shrink: 'a' });
  add('htrBR', 'orange', ['heater', 'b'], ['heaterCtl', 'OUT4'], 'solder-screw', 'towerD', [['h17', 0.12], ['h59', 0.78], ['h61', 0.97], ['h62', 1]], { cm: 28, shrink: 'a' });
  // step 86: heater thermistor
  add('thBrown', 'brown', ['thermHeater', 'S'], ['mega', 'A9'], 'female-male', 'towerD', [['h86', 1]], { cm: 26 });
  add('thRed', 'red', ['thermHeater', '+'], ['bus5V', 'p3'], 'female-male', 'towerD', [['h86', 1]], { cm: 20 });
  add('thBlack', 'black', ['thermHeater', '-'], ['busGND', 'p3'], 'female-male', 'towerD', [['h86', 1]], { cm: 20 });

  // steps 29-30 / 69: pumps; + (unmarked) to the outer terminal, - (marked) to the shared ground
  const term = [['M1a', 'GND12'], ['M2b', 'GND12'], ['M3a', 'GND34'], ['M4b', 'GND34']];
  for (let i = 0; i < 4; i++) {
    add(`pump${i}P`, 'orange', ['pump' + i, '+'], ['shield', term[i][0]], 'solder-screw', 'arc', [['h29', 0.12], ['h69', 1]], { pair: 'pump' + i, phase: 0, cm: 20, lift: 26, shrink: 'a', twistAt: 'h30' });
    add(`pump${i}N`, 'orange', ['pump' + i, '-'], ['shield', term[i][1]], 'solder-screw', 'arc', [['h29', 0.12], ['h69', 1]], { pair: 'pump' + i, phase: Math.PI, cm: 20, lift: 26, mark: true, markAt: 'h30', shrink: 'a', twistAt: 'h30' });
  }

  // steps 31-40: power wiring (soldered)
  add('cvOutP', 'red', ['bus5V', 'lead'], ['converter', 'OUT+'], 'solder-solder', 'leftWall', [['h32', 0.3], ['h33', 1]], { cm: 20, shrink: 'b' });
  add('cvOutN', 'black', ['busGND', 'lead'], ['converter', 'OUT-'], 'solder-solder', 'leftWall', [['h32', 0.3], ['h33', 1]], { cm: 20, shrink: 'b' });
  add('cvInP', 'orange', ['converter', 'IN+'], ['rocker', 'b'], 'solder-solder', 'arc', [['h31', 0.35], ['h39', 1]], { cm: 5, shrink: 'a' });
  add('cvInN', 'black', ['converter', 'IN-'], ['jack', '-'], 'solder-solder', 'arc', [['h31', 0.3], ['h40', 1]], { cm: 8, shrink: 'a' });
  add('lead12V', 'orange', ['bus12V', 'lead'], ['rocker', 'b'], 'solder-solder', 'gap12', [['h32', 0.3], ['h34', 0.55], ['h39', 1]], { cm: 20 });
  add('leadGND2', 'black', ['busGND2', 'lead'], ['jack', '-'], 'solder-solder', 'gap12', [['h32', 0.3], ['h34', 0.55], ['h40', 1]], { cm: 20, lift: 2 });
  add('rockerJack', 'orange', ['rocker', 'a'], ['jack', '+'], 'solder-solder', 'arc', [['h36', 0.4], ['h37', 1]], { cm: 5 });
  // steps 63-64, 67, 68: 12 V consumers
  add('htc12V', 'orange', ['heaterCtl', '12V'], ['bus12V', 'p0'], 'screw-male', 'underHtc', [['h64', 1]], { cm: 11 });
  add('htcGND', 'black', ['heaterCtl', 'GND'], ['busGND2', 'p0'], 'screw-male', 'underHtc', [['h64', 1]], { cm: 11 });
  add('shP', 'orange', ['shield', 'POWER+'], ['bus12V', 'p2'], 'screw-male', 'underHtc', [['h67', 1]], { cm: 12 });
  add('shN', 'black', ['shield', 'POWER-'], ['busGND2', 'p2'], 'screw-male', 'underHtc', [['h67', 1]], { cm: 12 });
  add('drvP', 'orange', ['stirCtl', 'POWER+'], ['bus12V', 'p4'], 'screw-male', 'arc', [['h68', 1]], { cm: 5 });
  add('drvN', 'black', ['stirCtl', 'POWER-'], ['busGND2', 'p4'], 'screw-male', 'arc', [['h68', 1]], { cm: 5 });

  // steps 73-85: jumpers on the motherboard
  add('rtcSCL', 'green', ['rtc', 'SCL'], ['mux', 'SC1'], 'female-female', 'arc', [['h74', 1]], { cm: 5 });
  add('rtcSDA', 'yellow', ['rtc', 'SDA'], ['mux', 'SD1'], 'female-female', 'arc', [['h74', 1]], { cm: 5 });
  add('rtcVIN', 'red', ['rtc', 'VIN'], ['bus5V', 'p1'], 'female-male', 'arc', [['h74', 1]], { cm: 11 });
  add('rtcGND', 'black', ['rtc', 'GND'], ['busGND', 'p1'], 'female-male', 'arc', [['h74', 1]], { cm: 11 });
  add('muxSDA', 'yellow', ['mux', 'SDA'], ['mega', 'D20'], 'female-male', 'arc', [['h76', 1]], { cm: 12 });
  add('muxSCL', 'green', ['mux', 'SCL'], ['mega', 'D21'], 'female-male', 'arc', [['h76', 1]], { cm: 12 });
  add('muxVIN', 'red', ['mux', 'VIN'], ['bus5V', 'p0'], 'female-male', 'arc', [['h76', 1]], { cm: 5 });
  add('muxGND', 'black', ['mux', 'GND'], ['busGND', 'p0'], 'female-male', 'arc', [['h76', 1]], { cm: 5 });
  add('ledGND', 'black', ['ledCtl', 'GND'], ['busGND', 'p5'], 'male-male', 'arc', [['h78', 1]], { cm: 6 });
  add('ledV', 'red', ['ledCtl', 'V+'], ['bus5V', 'p5'], 'male-male', 'arc', [['h78', 1]], { cm: 6 });
  add('ledDIN', 'white', ['ledCtl', 'DIN'], ['mega', 'D25'], 'male-male', 'arc', [['h78', 1]], { cm: 8 });
  add('ledCLK', 'blue', ['ledCtl', 'CLK'], ['mega', 'D27'], 'male-male', 'arc', [['h78', 1]], { cm: 8 });
  add('ledLAT', 'green', ['ledCtl', 'LAT'], ['mega', 'D23'], 'male-male', 'arc', [['h78', 1]], { cm: 8 });
  add('drvIN1', 'blue', ['stirCtl', 'IN1'], ['mega', 'D48'], 'female-male', 'arc', [['h80', 1]], { cm: 7 });
  add('drvIN2', 'white', ['stirCtl', 'IN2'], ['mega', 'D46'], 'female-male', 'arc', [['h80', 1]], { cm: 7 });
  [['ENA', 'pink', 'D44'], ['IN1', 'brown', 'D42'], ['IN2', 'purple', 'D40'], ['IN3', 'orange', 'D38'], ['IN4', 'white', 'D36'], ['ENB', 'blue', 'D34']].forEach(([p, c, d], i) =>
    add('htc' + p, c, ['heaterCtl', p], ['mega', d], 'female-male', 'arc', [['h83', 1]], { cm: 14, lift: 4 + i * 1.6 }));
  add('megaGND', 'black', ['mega', 'GND'], ['busGND', 'p7'], 'male-male', 'arc', [['h85', 1]], { cm: 10 });
  add('mega5V', 'red', ['mega', '5V'], ['bus5V', 'p7'], 'male-male', 'arc', [['h85', 1]], { cm: 10 });

  // step 87 / testing 17-18: thermistor needle cable, loosely braided; grows from the Arduino side
  add('probeS', 'pink', ['mega', 'A8'], ['needleHdr', 'S'], 'male-female', 'probe', [['h87', 1]], { braid: 'probe', phase: 0, cm: 38 });
  add('probeV', 'red', ['bus5V', 'p9'], ['needleHdr', '+'], 'male-female', 'probe', [['h87', 1]], { braid: 'probe', phase: 2.09, cm: 38 });
  add('probeG', 'black', ['busGND', 'p9'], ['needleHdr', '-'], 'male-female', 'probe', [['h87', 1]], { braid: 'probe', phase: 4.19, cm: 38 });

  // steps 97 / 103: OD sensor module
  add('tslSDA', 'yellow', ['tsl', 'SDA'], ['mux', 'SD2'], 'female-female', 'towerN', [['h97', 0.1], ['h103', 1]], { cm: 33 });
  add('tslSCL', 'green', ['tsl', 'SCL'], ['mux', 'SC2'], 'female-female', 'towerN', [['h97', 0.1], ['h103', 1]], { cm: 33 });
  add('tslVIN', 'red', ['tsl', 'VIN'], ['bus5V', 'p11'], 'female-male', 'towerN', [['h97', 0.1], ['h103', 1]], { cm: 25 });
  add('tslGND', 'black', ['tsl', 'GND'], ['busGND', 'p11'], 'female-male', 'towerN', [['h97', 0.1], ['h103', 1]], { cm: 25 });
  // steps 99-100 / 103: 940nm LED; marked wire = positive
  add('odPos', 'white', ['odLed', '+'], ['ledCtl', 'ch0+'], 'solder-female', 'towerO', [['h100', 0.1], ['h103', 1]], { cm: 38, mark: true, markAt: 'h100', leadA: 8, pair: 'od', phase: 0, twistAt: 'h103' });
  add('odNeg', 'white', ['odLed', '-'], ['ledCtl', 'ch0-'], 'solder-female', 'towerO', [['h100', 0.1], ['h103', 1]], { cm: 38, leadA: 8, pair: 'od', phase: Math.PI, twistAt: 'h103' });
  // steps 106-107 / 109: six-pack LEDs; marked wires to channel 1-6 positive pins
  ['yellow', 'orange', 'red', 'purple', 'blue', 'green'].forEach((c, i) => {
    add(`six${i}M`, c, ['sixLed' + i, '+'], ['ledCtl', `ch${i + 1}+`], 'solder-female', 'towerP', [['h107', 0.1], ['h109', 1]], { cm: 32, mark: true, markAt: 'h107', leadA: 9 });
    add(`six${i}U`, c, ['sixLed' + i, '-'], ['ledCtl', `ch${i + 1}-`], 'solder-female', 'towerP', [['h107', 0.1], ['h109', 1]], { cm: 32, leadA: 9 });
  });
  return W;
}

// ---------------------------------------------------------------------------- routing + meshes
export function buildWires(parts, root, ctx = {}) {
  const prims = (ctx.prims || []).map(b => ({ id: b.id, bb: new THREE.Box3(b.min.clone(), b.max.clone()).applyMatrix4(b.inv.clone().invert()) }));
  const Bm = ctx.printFrame?.B;
  const inB = (x, y, z) => Bm ? V(x, y, z).applyMatrix4(Bm) : V(x, y, z);
  const clearY = (x, z, ignore) => { let y = 0; for (const p of prims) { if (ignore.has(p.id)) continue; const b = p.bb; if (x > b.min.x - 2 && x < b.max.x + 2 && z > b.min.z - 2 && z < b.max.z + 2) y = Math.max(y, b.max.y); } return y; };
  const EF = 17.5;
  // ---- corridors, measured on the module STLs (tools/worldslice.py) and matched to the manual photos.
  // Rubber feet hold every module 3.5 mm off the table, so wires "beneath the robot" lie on the table in
  // two layers. They rise into Module E through the 4 mm gap between Module G (z -99) and Modules F/E
  // (z -102.9) and pass over the lowered part of E's front wall, the "left cutout" (x -76..-26, top y 30).
  const FEET = [[58, 100], [-58, 100], [-60, -26], [60, -26], [-60, 16], [60, 16], [TX, TZ], [-67.4, -140], [67.4, -140]];
  const LY = [0.85, 2.55], GZ = [-100.1, -101.85], WALL_IN = -108.4;
  const wallY = lay => lay === 1 ? 30.9 : 32.6;
  function avoidFeet(p, q, margin = 0) {
    const out = [], dx = q.x - p.x, dz = q.z - p.z, L2 = dx * dx + dz * dz; if (L2 < 1) return out;
    for (const [fx, fz] of FEET) {
      const t = ((fx - p.x) * dx + (fz - p.z) * dz) / L2; if (t <= 0.02 || t >= 0.98) continue;
      let cx = p.x + dx * t - fx, cz = p.z + dz * t - fz; const d = Math.hypot(cx, cz); if (d >= 10.5 + margin) continue;
      if (d < 0.01) { cx = -dz; cz = dx; } const s = (11.2 + margin) / Math.hypot(cx, cz);
      out.push({ t, v: V(fx + cx * s, p.y, fz + cz * s) });
    }
    return out.sort((a, b) => a.t - b.t).map(o => o.v);
  }
  const specs = wireSpecs();
  const endKind = (w, e) => w.ends.split('-')[e === 'a' ? 0 : 1];
  const leadLen = (w, e) => (e === 'a' ? w.leadA : w.leadB) ?? (/solder|screw/.test(endKind(w, e)) ? 3 : 5);
  // connector housings + straight leads of every wire end, so arcs pass above other wires' plugs
  for (const w of specs) {
    if (w.route === 'bridge') continue;
    for (const e of ['a', 'b']) {
      const kind = endKind(w, e); if (kind !== 'female' && kind !== 'male') continue;
      const pp = e === 'a' ? w.a : w.b, P = pinInfo(parts, pp[0], pp[1]);
      const q = P.p.clone().addScaledVector(P.d, START[kind] + leadLen(w, e));
      prims.push({ id: 'plug:' + w.id + e, bb: new THREE.Box3().setFromPoints([P.p, q]).expandByScalar(1.4) });
    }
  }
  const jitter = (id, k) => { let h = 7; for (const c of id + k) h = (h * 31 + c.charCodeAt(0)) >>> 0; return (h % 1000) / 1000 - 0.5; };
  function arc(a2, b2, ignore, extra = 0) {
    let top = Math.max(a2.y, b2.y);
    const n = Math.max(4, Math.ceil(a2.distanceTo(b2) / 2));
    for (let i = 0; i <= n; i++) { const u = i / n; top = Math.max(top, clearY(a2.x + (b2.x - a2.x) * u, a2.z + (b2.z - a2.z) * u, ignore) + 4); }
    const H = top + extra;
    return [a2.clone().setY(Math.max(a2.y, H - 4)), a2.clone().lerp(b2, 0.2).setY(H), a2.clone().lerp(b2, 0.8).setY(H), b2.clone().setY(Math.max(b2.y, H - 4))];
  }
  // ---- branches: from the wire's straight lead (a1) down to the table, in that group's own lane
  const grpIdx = {};
  const gi = w => { const g = grpIdx[w.route] || (grpIdx[w.route] = {}); if (!(w.id in g)) g[w.id] = Object.keys(g).length; return g[w.id]; };
  // step 6: in Module A's slot the black wire is furthest from the faceplate edge, blue nearest it
  const BTN_X = { btnGND: 46.4, btnDOWN: 48.15, btnSEL: 49.9, btnUP: 51.65 };
  const branch = {
    // blades -> down into the notch in Module A's front ridge -> flat under its rib -> along A's base -> off A's back edge
    faceBtn: (w, a1, lay) => { const x = BTN_X[w.id]; return [V(x, 15, 133.5), V(x, 10.6, 136.6), V(x, 8.6, 131.2), V(x, 7.6, 124), V(x, 7.6, 98), V(x - 0.5, 4.6, 93), V(x - 1.5, LY[lay], 88)]; },
    // LCD backpack / microSD headers point left: down outside Module A's left rod boss to the table
    faceLcd: (w, a1, lay) => { const x = Math.min(a1.x, -77) - (gi(w) % 2) * 1.75; return [V(x, a1.y - 4, a1.z), V(x, 9, a1.z - 2), V(x, LY[lay], a1.z - 7)]; },
    // Module D's leads leave its back face; drop in the open gap between Modules C (z -33) and G (z -63)
    towerD: (w, a1, lay) => [V(a1.x, a1.y - 3, a1.z - 3), V(a1.x, 8, a1.z - 4.5), V(a1.x, LY[lay], a1.z - 8)].map(p => { p.z = Math.max(p.z, -60); return p; }),
    // Module N: wires leave through its slot, then down in the same gap
    towerN: (w, a1, lay) => [V(a1.x, a1.y - 4, -58.5 - (gi(w) % 2) * 1.75), V(a1.x, 10, -59), V(a1.x, LY[lay], -61)],
    // Module O (front bay): down the front of the sensor bay, under Module C
    towerO: (w, a1, lay) => [V(a1.x, a1.y - 6, a1.z + 1.5), V(a1.x, 10, a1.z + 2), V(a1.x, LY[lay], a1.z - 3)],
    // Module P (side bay): out of the back of the LED holes, back past Module C, down in the C-G gap
    towerP: (w, a1, lay) => { const k = gi(w), x = 46 + (k % 4) * 1.75, r = Math.floor(k / 4) * 1.75; return [V(x, a1.y, a1.z - 4), V(x, a1.y - 2, -36 - r), V(x, 10, -40 - r), V(x - 3, LY[lay], -46)]; },
  };
  // ---- rise columns over the left cutout, ordered by destination so the bundle fans out cleanly.
  // The heater and fan wires go down to Module E's floor in the 4 mm channel between the LED Controller
  // Board and the Arduino, then under the boards (steps 60-62).
  const FLOOR = new Set(['fanPos', 'fanGnd', 'htrTL', 'htrTR', 'htrBL', 'htrBR']);
  const trunkWires = specs.filter(w => branch[w.route]);
  const destOf = w => pinInfo(parts, w.b[0], w.b[1]).p;
  const rise = {};
  trunkWires.filter(w => FLOOR.has(w.id)).forEach((w, i) => { rise[w.id] = { x: [-31.15, -32.9, -34.65][i >> 1], lay: i % 2, floorIdx: i }; });
  const rest = trunkWires.filter(w => !FLOOR.has(w.id)).sort((a, b) => destOf(b).x - destOf(a).x || destOf(a).z - destOf(b).z);
  const cols = []; for (let x = -28; x >= -63.1; x -= 1.75) if (x > -30 || x < -35.5) cols.push(x);
  rest.forEach((w, i) => { rise[w.id] = { x: cols[Math.floor(i / 2)], lay: i % 2 }; });
  // ---- each source's wires lie together as a flat two-layer ribbon on the table, ordered like their rise
  // columns, and only fan out under Module G just before rising
  const tinfo = {}, ribbons = {};
  for (const w of trunkWires) {
    const A = pinInfo(parts, w.a[0], w.a[1]);
    const a1 = A.p.clone().addScaledVector(A.d, START[endKind(w, 'a')] + leadLen(w, 'a'));
    tinfo[w.id] = branch[w.route](w, a1, rise[w.id].lay);
    (ribbons[w.route] || (ribbons[w.route] = { ws: [] })).ws.push(w);
  }
  for (const k in ribbons) {
    const R = ribbons[k];
    R.ws.sort((a, b) => rise[a.id].x - rise[b.id].x || rise[a.id].lay - rise[b.id].lay);
    R.rank = {}; R.ws.forEach((w, i) => { R.rank[w.id] = i; });
    R.half = (R.ws.length - 1) / 2;
    const c = R.ws.reduce((acc, w) => acc.add(tinfo[w.id][tinfo[w.id].length - 1]), V(0, 0, 0)).multiplyScalar(1 / R.ws.length);
    const mx = R.ws.reduce((acc, w) => acc + rise[w.id].x, 0) / R.ws.length;
    R.entry = V(c.x, 0, c.z + (c.z > -68 ? -6 : 0));
    R.pre = V(mx, 0, -70);
    R.mid = avoidFeet(R.entry, R.pre, R.half * 1.0 + 1);
  }
  function floorRoute(w, W, b1, r) {
    const k = r.floorIdx, cx = k % 2 ? -32.95 : -31.1, cz = -109.7 - Math.floor(k / 2) * 1.75, fy = 18.4 + (k % 2) * 1.7;
    const pts = [V(cx, W.y, cz), V(cx, 22, cz - 0.5), V(cx, fy, cz - 3)];
    const P = pinInfo(parts, w.b[0], w.b[1]);
    if (w.b[0] === 'stirCtl') {   // between the female standoffs, under the board, up behind it into OUT1/OUT2
      const x = 5.5 + k * 1.75;
      pts.push(V(x, fy, -160), V(x, fy, -171), V(x + 2, fy, -189), V(P.p.x, fy + 2, -190.5), V(P.p.x, 32, -190));
    } else {                      // inside the Heater Controller Board's footprint, up at its edge
      const left = P.d.x < 0, z = P.p.z;
      pts.push(V(36 + k * 1.75, fy, -161), V(38 + k * 1.75, fy, -172), V(left ? 30 : 60, fy, z), V(left ? 22.3 : 70.2, fy + 1.5, z), V(left ? 22.3 : 70.2, 32, z));
    }
    return pts;
  }
  const special = {
    leftWall: w => { const A = pinInfo(parts, w.a[0], w.a[1]); return [V(A.p.x, A.p.y + 0.3, -175), V(-69.5, EF + 4.5, -205), V(-69.5, EF + 4.5, -217), V(-69.8, EF + 5, -224)]; },
    gap12: w => w.id === 'lead12V' ? [V(18, EF + 2.5, -211.0), V(20.05, EF + 2.5, -213.3), V(20.05, EF + 2.5, -216.2), V(26, EF + 5, -217.5)] : [V(16, EF + 4, -206), V(20.05, EF + 5.5, -211), V(20.05, EF + 5.5, -216.3), V(35, EF + 10, -219.5), V(54, EF + 9, -219.5)],
    // steps 64 / 67: "snake ... underneath the Heater Controller Board" from its front edge to the rails behind it
    underHtc: w => {
      const A = pinInfo(parts, w.a[0], w.a[1]), Bp = pinInfo(parts, w.b[0], w.b[1]);
      const k = { htc12V: 0, htcGND: 1, shP: 2, shN: 3 }[w.id], fy = 18.4 + (k % 2) * 1.7, x0 = A.p.x - 1;
      const y1 = A.p.y + 5;
      const cz = -210.2 - Math.floor(k / 2) * 1.7;   // out of the footprint at the back edge, between its standoffs, then left in the channel in front of the interior wall
      return [V(x0, y1, -163.6), V(x0, 26, -163.6), V(x0 - 1, fy, -166.5), V(x0 - 3, fy, -172), V(42 - k * 1.75, fy, -205), V(38 - k * 1.75, fy, cz), V(18, fy + 0.5, cz), V(16.5, 31, cz), V(Bp.p.x + 4, 35, Bp.p.z)];
    },
    probe: () => [V(-6, 72, -112), V(-6, 74, -100), V(TX - 6, 120, TZ - 52), V(TX - 12, 215, TZ - 30), V(TX - 6, 232, TZ - 14)],
  };
  function makePath(w) {
    const A = pinInfo(parts, w.a[0], w.a[1]), Bp = pinInfo(parts, w.b[0], w.b[1]);
    const [ea, eb] = w.ends.split('-');
    if (w.route === 'bridge') { const s = pinInfo(parts, w.via[0][0], w.via[0][1]); return [A.p.clone().addScaledVector(A.d, 1.2), s.p.clone().addScaledVector(s.d, 1.2), Bp.p.clone().addScaledVector(Bp.d, 1.2)]; }
    const a0 = A.p.clone().addScaledVector(A.d, START[ea]), b0 = Bp.p.clone().addScaledVector(Bp.d, START[eb]);
    const a1 = a0.clone().addScaledVector(A.d, leadLen(w, 'a')), b1 = b0.clone().addScaledVector(Bp.d, leadLen(w, 'b'));
    const ignore = new Set([w.a[0], w.b[0], 'plug:' + w.id + 'a', 'plug:' + w.id + 'b']);
    let mid;
    if (w.route === 'arc') mid = arc(a1, b1, ignore, (w.lift || 0) + jitter(w.id, 'h') * 2);
    else if (special[w.route]) mid = special[w.route](w);
    else {
      const r = rise[w.id], lay = r.lay, gz = GZ[lay], ly = LY[lay], wy = wallY(lay);
      const bp = tinfo[w.id], R = ribbons[w.route], off = (R.rank[w.id] - R.half) * 1.0;
      const lane = q => V(q.x + off, ly, q.z);
      const tEnd = V(r.x, ly, gz + 7);
      const table = [lane(R.entry), ...R.mid.map(lane), lane(R.pre), tEnd];
      const up = [V(r.x, ly + 0.35, gz + 1.6), V(r.x, ly + 3, gz), V(r.x, 26, gz), V(r.x, wy, gz - 0.2), V(r.x, wy, -104), V(r.x, wy, WALL_IN)];
      const W = up[up.length - 1];
      const inside = FLOOR.has(w.id) ? floorRoute(w, W, b1, r) : arc(W, b1, ignore, 1.5 + jitter(w.id, 'h') * 2).slice(1);
      mid = [...bp, ...table, ...up, ...inside];
    }
    const pts = [a0, a1, ...mid, b1, b0];
    const clean = [pts[0]]; for (const p of pts.slice(1)) if (p.distanceTo(clean[clean.length - 1]) > 0.9) clean.push(p);
    return clean;
  }
  const paths = {};
  for (const w of specs) paths[w.id] = makePath(w);
  const groups = {};
  for (const w of specs) { const g = w.pair || w.braid; if (g) (groups[g] || (groups[g] = [])).push(w); }
  // curve for one wire; twisted pairs and braids wind around their group's centre line
  function curveFor(w) {
    const grp = w.pair || w.braid;
    if (!grp) return new THREE.CatmullRomCurve3(paths[w.id], false, 'centripetal', 0.5);
    const ws = groups[grp]; const n = 160;
    const curves = ws.map(x => new THREE.CatmullRomCurve3(paths[x.id], false, 'centripetal', 0.5));
    const centre = []; for (let i = 0; i <= n; i++) { const c = V(0, 0, 0); curves.forEach(cv => c.add(cv.getPointAt(i / n))); centre.push(c.multiplyScalar(1 / curves.length)); }
    const cc = new THREE.CatmullRomCurve3(centre, false, 'centripetal', 0.5);
    const fr = cc.computeFrenetFrames(n, false), own = curves[ws.indexOf(w)];
    const L = cc.getLength(), pitch = w.braid ? 16 : 10, r = w.braid ? 1.3 : 0.95, ramp = Math.min(0.25, 20 / L);
    const tp = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, e = Math.min(1, Math.min(u, 1 - u) / ramp), sm = e * e * (3 - 2 * e);
      const th = w.phase + u * L / pitch * Math.PI * 2;
      const tw = cc.getPointAt(u).addScaledVector(fr.normals[i], Math.cos(th) * r).addScaledVector(fr.binormals[i], Math.sin(th) * r);
      tp.push(own.getPointAt(u).lerp(tw, sm));
    }
    return new THREE.CatmullRomCurve3(tp, false, 'centripetal', 0.5);
  }

  const housing = new THREE.BoxGeometry(2.6, 2.6, 13); housing.translate(0, 0, 6.5);
  const shrink = new THREE.CylinderGeometry(1.35, 1.35, 13, 10); shrink.rotateX(Math.PI / 2); shrink.translate(0, 0, 6.5);
  const tin = new THREE.CylinderGeometry(0.55, 0.55, 5, 6); tin.rotateX(Math.PI / 2); tin.translate(0, 0, -2.5);
  const joint = new THREE.SphereGeometry(1.15, 10, 8);     // bare solder joint (no heat shrink in that step of the manual)
  const out = [];
  const byId = {};
  const straightCurve = w => new THREE.CatmullRomCurve3(paths[w.id], false, 'centripetal', 0.5);
  for (const w of specs) {
    const grp = w.pair || w.braid;
    const g = new THREE.Group(); g.name = `${w.color} wire`;
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), wireMat(w.color)); mesh.castShadow = true; g.add(mesh);
    // the part of a soldered wire that is not routed yet stays with it, coiled at its free end
    const coilMesh = new THREE.Mesh(new THREE.BufferGeometry(), wireMat(w.color)); coilMesh.visible = false; g.add(coilMesh);
    const [ea, eb] = w.ends.split('-');
    const sh = w.shrink || '';
    const endMesh = (kind, end) => kind === 'female' || kind === 'male' ? new THREE.Mesh(housing, M.header) : kind === 'solder' ? (sh.includes(end) ? new THREE.Mesh(shrink, M.heatshrink) : new THREE.Mesh(joint, M.steel)) : kind === 'screw' ? new THREE.Mesh(tin, M.steel) : null;
    const A = pinInfo(parts, w.a[0], w.a[1]);
    let Bp = pinInfo(parts, w.b[0], w.b[1]);
    const place = (m, kind, P, end) => { if (!m) return; const back = kind === 'female' ? -6 : kind === 'male' ? 0 : kind === 'solder' ? (sh.includes(end) ? -2 : 0.3) : 3; m.position.copy(P.p).addScaledVector(P.d, back); m.lookAt(m.position.clone().add(P.d)); };
    const endA = endMesh(ea, 'a'), endB = endMesh(eb, 'b');
    place(endA, ea, A, 'a'); place(endB, eb, Bp, 'b');
    if (endA) g.add(endA); if (endB) g.add(endB);
    let markBand = null;
    if (w.mark) { markBand = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 6, 8), M.black); g.add(markBand); }
    const ud = g.userData = { spec: w, curve: null, len: 0, tubular: 0, radial: 5, mesh, endA, endB, follow: w.a[0], partId: 'wire:' + w.id, f: 0, coilF: -1, markOn: !w.markAt, tw: !w.twistAt };
    ud.rebuild = (curve, endP) => {
      if (endP) Bp = endP;
      const len = curve.getLength(), tubular = Math.min(560, Math.max(10, Math.round(len / (grp ? 1.6 : 3))));
      mesh.geometry.dispose(); mesh.geometry = new THREE.TubeGeometry(curve, tubular, w.r || 0.85, 5, false);
      Object.assign(ud, { curve, len, tubular }); ud.coilF = -1;
      ud.setGrow(ud.f, true);
    };
    const updateCoil = f => {
      if (!(f > 0.001 && f < 0.995) || w.route === 'bridge' || w.route === 'probe') { coilMesh.visible = false; return null; }
      if (coilMesh.visible && Math.abs(f - ud.coilF) < 0.004) return ud.coilEnd;
      const rem = (1 - f) * ud.len, tip = ud.curve.getPointAt(f), tan = ud.curve.getTangentAt(f).normalize();
      const n1 = new THREE.Vector3().crossVectors(tan, Math.abs(tan.y) < 0.9 ? UPV : V(1, 0, 0)).normalize(), n2 = new THREE.Vector3().crossVectors(tan, n1);
      const R = 4.2 + (w.phase ? 1.7 : 0), pitch = 1.9, turns = rem / (2 * Math.PI * R), N = Math.max(10, Math.ceil(turns * 20));
      const pts = []; for (let i = 0; i <= N; i++) { const th = i / N * turns * Math.PI * 2; pts.push(tip.clone().addScaledVector(tan, pitch * th / (Math.PI * 2)).addScaledVector(n1, R * Math.cos(th) - R).addScaledVector(n2, R * Math.sin(th))); }
      const c = new THREE.CatmullRomCurve3(pts);
      coilMesh.geometry.dispose(); coilMesh.geometry = new THREE.TubeGeometry(c, N, w.r || 0.85, 5, false); coilMesh.visible = true;
      ud.coilF = f; ud.coilEnd = { p: c.getPointAt(1), t: c.getTangentAt(1) };
      return ud.coilEnd;
    };
    ud.setGrow = (f, force) => {
      f = Math.max(0, Math.min(1, f)); if (f === ud.f && !force) return; ud.f = f;
      const k = Math.round(f * ud.tubular);
      mesh.geometry.setDrawRange(0, k * 5 * 6); g.visible = k > 0;
      const ce = updateCoil(f);
      if (endA) endA.visible = f > 0;
      if (endB) {
        endB.visible = (eb === 'female' || eb === 'male') ? f > 0.02 : f > 0.999;
        if (f < 0.999) { const p = ce ? ce.p : ud.curve.getPointAt(Math.max(0.001, f)), t = ce ? ce.t : ud.curve.getTangentAt(Math.max(0.001, f)); endB.position.copy(p); endB.lookAt(p.clone().add(t)); } else place(endB, eb, Bp, 'b');
      }
      if (markBand) {
        markBand.visible = ud.markOn && f > 0;
        if (f >= 0.999 || !ce) { const u = Math.max(0, 1 - 22 / ud.len); markBand.position.copy(ud.curve.getPointAt(u)); markBand.quaternion.setFromUnitVectors(UPV, ud.curve.getTangentAt(u)); }
        else { markBand.position.copy(ce.p).addScaledVector(ce.t, -14); markBand.quaternion.setFromUnitVectors(UPV, ce.t); }
      }
    };
    ud.setMark = on => { if (on !== ud.markOn) { ud.markOn = on; ud.setGrow(ud.f, true); } };
    ud.setTwist = on => { if (on !== ud.tw && grp) { ud.tw = on; ud.rebuild(on ? curveFor(w) : straightCurve(w)); } };
    g.traverse(o => o.userData.partId = 'wire:' + w.id);
    root.add(g); out.push(g); byId[w.id] = g;
  }
  for (const g of out) { const sp = g.userData.spec; g.userData.rebuild(sp.twistAt ? straightCurve(sp) : curveFor(sp)); g.userData.setGrow(0, true); }

  // the thermistor needle cable is re-laid whenever the needle moves (testing steps)
  const probeIds = specs.filter(w => w.route === 'probe').map(w => w.id);
  const probeHead = {}, probeLocal = {};
  const needleInv = parts.needleHdr.obj.matrixWorld.clone().invert();
  for (const id of probeIds) {
    const pts = paths[id], k = pts.findIndex(p => p.y > 70 && p.z > -102);   // where the cable leaves Module E
    probeHead[id] = pts.slice(0, Math.max(3, k + 1));
    const w = specs.find(x => x.id === id); const P = pinInfo(parts, w.b[0], w.b[1]);
    probeLocal[id] = { p: P.p.clone().applyMatrix4(needleInv), d: P.d.clone().transformDirection(needleInv), b0: START[w.ends.split('-')[1]], b1: leadLen(w, 'b') };
  }
  out.retargetProbe = (needleW, robotInv) => {
    if (!probeIds.length) return;
    for (const id of probeIds) {
      const L = probeLocal[id];
      const p = L.p.clone().applyMatrix4(needleW).applyMatrix4(robotInv), d = L.d.clone().transformDirection(needleW).transformDirection(robotInv);
      const b0 = p.clone().addScaledVector(d, L.b0), b1 = b0.clone().addScaledVector(d, L.b1 + 10);
      const head = probeHead[id], h = head[head.length - 1];
      const span = h.distanceTo(b1), sag = Math.min(60, span * 0.18);
      const m1 = h.clone().lerp(b1, 0.33), m2 = h.clone().lerp(b1, 0.66);
      m1.y = Math.max(6, Math.min(h.y, b1.y) + (Math.max(h.y, b1.y) - Math.min(h.y, b1.y)) * 0.55 - sag);
      m2.y = Math.max(6, Math.min(h.y, b1.y) + (Math.max(h.y, b1.y) - Math.min(h.y, b1.y)) * 0.25 - sag * 0.8);
      paths[id] = [...head, m1, m2, b1, b0];
    }
    for (const id of probeIds) byId[id].userData.rebuild(curveFor(specs.find(x => x.id === id)), (() => { const L = probeLocal[id]; return { p: L.p.clone().applyMatrix4(needleW).applyMatrix4(robotInv), d: L.d.clone().transformDirection(needleW).transformDirection(robotInv) }; })());
  };
  return out;
}
