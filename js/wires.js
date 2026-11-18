// Every wire in the team's Wiring Checklist, routed between real pins on the model.
// Each wire is a TubeGeometry along a smoothed path; drawRange lets it "grow" during a step.
import * as THREE from 'three';
import { wireMat, M } from './materials.js';
import { pinWorld, TX, TZ } from './assembly.js';

const v = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = v(0, 1, 0), BACK = v(0, 0, -1), FRONT = v(0, 0, 1), RIGHT = v(1, 0, 0), LEFT = v(-1, 0, 0);
const BNORM = v(0, -0.707, -0.707);        // behind the reclined faceplate

// shared bundle routes (world coords)
const ROUTE = {
  front: [v(46, 14, 112), v(24, 11, 78), v(-40, 9, 52), v(-55, 9, 20), v(-56, 9, -40), v(-57, 10, -88), v(-58, 33, -103.5), v(-54, 38, -112)],
  tower: [v(-30, 9, -38), v(-55, 9, -48), v(-57, 10, -88), v(-58, 33, -103.5), v(-54, 38, -112)],
  towerHigh: [v(TX - 8, 66, TZ - 52), v(TX - 20, 30, -56), v(-55, 10, -62), v(-57, 10, -88), v(-58, 33, -103.5), v(-54, 38, -112)],
  probe: [v(TX - 10, 210, TZ - 22), v(TX - 30, 150, -60), v(-50, 60, -80), v(-58, 36, -103.5), v(-54, 40, -114)],
};

/* Wire spec: [id, colour, [partA, pinA, leadA], [partB, pinB, leadB], route, step, opts]
   opts.stub = [stepId, fraction]  -> grows partially (from end A) in an earlier step
   opts.twist = phase (radians) for twisted pairs; opts.r = radius */
export function wireSpecs(parts) {
  const rails = { bus5V: 0, busGND: 0, bus12V: 0, busGND2: 0 };
  const rail = (bus) => [bus, 'p' + (rails[bus]++ * 2 + 1) % 20, UP];
  const W = [];
  const add = (id, color, a, b, route, step, opts = {}) => W.push({ id, color, a, b, route, step, ...opts });

  // --- LCD faceplate: buttons, microSD, LCD I2C (steps 4-10, routed to the Mega in 70-72)
  add('btnBridge', 'bare', ['btnUp', 'gnd', BNORM], ['btnDown', 'gnd', BNORM], null, 'btnwires', { r: 0.45, via: [['btnSel', 'gnd']] });
  add('btnUpW', 'blue', ['btnUp', 'sig', BNORM], ['mega', 'D26', UP], 'front', 'wireFront', { stub: ['btnwires', 0.16] });
  add('btnSelW', 'white', ['btnSel', 'sig', BNORM], ['mega', 'D24', UP], 'front', 'wireFront', { stub: ['btnwires', 0.16] });
  add('btnDownW', 'green', ['btnDown', 'sig', BNORM], ['mega', 'D22', UP], 'front', 'wireFront', { stub: ['btnwires', 0.16] });
  add('btnGndW', 'black', ['btnDown', 'gnd', BNORM], rail('busGND'), 'front', 'wireFront', { stub: ['btnwires', 0.16] });
  [['CS', 'brown', 'D53'], ['SCK', 'pink', 'D52'], ['MOSI', 'orange', 'D51'], ['MISO', 'purple', 'D50']].forEach(([p, c, d]) =>
    add('sd' + p, c, ['sd', p, BNORM], ['mega', d, UP], 'front', 'wireFront', { stub: ['sd', 0.14] }));
  add('sdVCC', 'red', ['sd', 'VCC', BNORM], rail('bus5V'), 'front', 'wireFront', { stub: ['sd', 0.14] });
  add('sdGND', 'black', ['sd', 'GND', BNORM], rail('busGND'), 'front', 'wireFront', { stub: ['sd', 0.14] });
  add('lcdGND', 'black', ['lcd', 'GND', BNORM], rail('busGND'), 'front', 'wireFront', { stub: ['lcdi2c', 0.14] });
  add('lcdVCC', 'red', ['lcd', 'VCC', BNORM], rail('bus5V'), 'front', 'wireFront', { stub: ['lcdi2c', 0.14] });
  add('lcdSDA', 'yellow', ['lcd', 'SDA', BNORM], ['mux', 'SD0', UP], 'front', 'wireFront', { stub: ['lcdi2c', 0.14] });
  add('lcdSCL', 'green', ['lcd', 'SCL', BNORM], ['mux', 'SC0', UP], 'front', 'wireFront', { stub: ['lcdi2c', 0.14] });

  // --- stirrer base: fan, heater plate (4 x orange), heater thermistor
  add('fanP', 'orange', ['fan', '+', BACK], ['stirCtl', 'OUT2', UP], 'tower', 'stirCtl');
  add('fanN', 'black', ['fan', '-', BACK], ['stirCtl', 'OUT1', UP], 'tower', 'stirCtl');
  [['OUT1', 'a'], ['OUT2', 'a'], ['OUT3', 'b'], ['OUT4', 'b']].forEach(([o, h], i) =>
    add('htr' + o, 'orange', ['heater', h, BACK], ['heaterCtl', o, UP], 'tower', 'heaterCtl', { jit: i }));
  add('thSig', 'brown', ['thermHeater', 'S', BACK], ['mega', 'A9', UP], 'tower', 'wireSensors');
  add('thV', 'red', ['thermHeater', '+', BACK], rail('bus5V'), 'tower', 'wireSensors');
  add('thG', 'black', ['thermHeater', '-', BACK], rail('busGND'), 'tower', 'wireSensors');

  // --- power: converter, bus leads, rocker switch, barrel jack
  add('lead5V', 'red', ['bus5V', 'lead', BACK], ['converter', 'OUT+', RIGHT], null, 'converter');
  add('leadGND', 'black', ['busGND', 'lead', BACK], ['converter', 'OUT-', RIGHT], null, 'converter');
  add('convInP', 'orange', ['converter', 'IN+', LEFT], ['rocker', 'b', FRONT], null, 'powerSlots');
  add('convInN', 'black', ['converter', 'IN-', LEFT], ['jack', '-', FRONT], null, 'powerSlots');
  add('lead12V', 'orange', ['bus12V', 'lead', LEFT], ['rocker', 'b', FRONT], null, 'powerSlots');
  add('leadGND2', 'black', ['busGND2', 'lead', LEFT], ['jack', '-', FRONT], null, 'powerSlots');
  add('rockerJack', 'orange', ['rocker', 'a', FRONT], ['jack', '+', FRONT], null, 'jackSwitch');

  // --- 12 V consumers
  add('l298n12V', 'orange', ['heaterCtl', '12V', UP], rail('bus12V'), null, 'heaterCtl');
  add('l298nGND', 'black', ['heaterCtl', 'GND', UP], rail('busGND2'), null, 'heaterCtl');
  add('shieldP', 'orange', ['shield', 'PWR+', UP], rail('bus12V'), null, 'mega');
  add('shieldN', 'black', ['shield', 'PWR-', UP], rail('busGND2'), null, 'mega');
  add('drvP', 'orange', ['stirCtl', 'POWER+', UP], rail('bus12V'), null, 'pumpPower');
  add('drvN', 'black', ['stirCtl', 'POWER-', UP], rail('busGND2'), null, 'pumpPower');

  // --- pumps: twisted orange pairs to the motor shield (M1..M4, crossed as in step 69)
  const term = [['M1a', 'M1b'], ['M2a', 'M2b'], ['M3a', 'M3b'], ['M4a', 'M4b']];
  for (let i = 0; i < 4; i++) {
    add(`pump${i}P`, 'orange', ['pump' + i, '+', UP], ['shield', term[i][0], UP], null, 'pumpPower', { twist: 0, pair: i, lift: 34 });
    add(`pump${i}N`, 'orange', ['pump' + i, '-', UP], ['shield', term[i][1], UP], null, 'pumpPower', { twist: Math.PI, pair: i, lift: 34, mark: true });
  }

  // --- data jumpers inside the motherboard (steps 73-85)
  add('rtcSCL', 'green', ['rtc', 'SCL', UP], ['mux', 'SC1', UP], null, 'wireI2C');
  add('rtcSDA', 'yellow', ['rtc', 'SDA', UP], ['mux', 'SD1', UP], null, 'wireI2C');
  add('rtcV', 'red', ['rtc', 'VIN', UP], rail('bus5V'), null, 'wireI2C');
  add('rtcG', 'black', ['rtc', 'GND', UP], rail('busGND'), null, 'wireI2C');
  add('muxSDA', 'yellow', ['mux', 'SDA', UP], ['mega', 'SDA', UP], null, 'wireI2C', { lift: 26 });
  add('muxSCL', 'green', ['mux', 'SCL', UP], ['mega', 'SCL', UP], null, 'wireI2C', { lift: 28 });
  add('muxV', 'red', ['mux', 'VIN', UP], rail('bus5V'), null, 'wireI2C');
  add('muxG', 'black', ['mux', 'GND', UP], rail('busGND'), null, 'wireI2C');
  add('tlcG', 'black', ['ledCtl', 'GND', UP], rail('busGND'), null, 'wireLedStir');
  add('tlcV', 'red', ['ledCtl', 'V+', UP], rail('bus5V'), null, 'wireLedStir');
  add('tlcDIN', 'white', ['ledCtl', 'DIN', UP], ['mega', 'D25', UP], null, 'wireLedStir');
  add('tlcCLK', 'blue', ['ledCtl', 'CLK', UP], ['mega', 'D27', UP], null, 'wireLedStir');
  add('tlcLAT', 'green', ['ledCtl', 'LAT', UP], ['mega', 'D23', UP], null, 'wireLedStir');
  add('drvIN1', 'blue', ['stirCtl', 'IN1', UP], ['mega', 'D48', UP], null, 'wireLedStir');
  add('drvIN2', 'white', ['stirCtl', 'IN2', UP], ['mega', 'D46', UP], null, 'wireLedStir');
  [['ENA', 'pink', 'D44'], ['IN1', 'brown', 'D42'], ['IN2', 'purple', 'D40'], ['IN3', 'orange', 'D38'], ['IN4', 'white', 'D36'], ['ENB', 'blue', 'D34']].forEach(([p, c, d], i) =>
    add('htc' + p, c, ['heaterCtl', p, UP], ['mega', d, UP], null, 'wireHeater', { lift: 22 + i * 2 }));
  add('mega5V', 'red', ['mega', '5Vd', UP], rail('bus5V'), null, 'wireSensors');
  add('megaGND', 'black', ['mega', 'GNDd', UP], rail('busGND'), null, 'wireSensors');
  // thermistor needle (braided pink/red/black) - dangles until the probe goes into the cap
  add('prS', 'pink', ['thermoNeedle', 'S', UP], ['mega', 'A8', UP], 'probe', 'vialPrep', { twist: 0, braid: 3, stub: ['wireSensors', 0.42], fromB: true });
  add('prV', 'red', ['thermoNeedle', '+', UP], rail('bus5V'), 'probe', 'vialPrep', { twist: 2.09, braid: 3, stub: ['wireSensors', 0.42], fromB: true });
  add('prG', 'black', ['thermoNeedle', '-', UP], rail('busGND'), 'probe', 'vialPrep', { twist: 4.19, braid: 3, stub: ['wireSensors', 0.42], fromB: true });

  // --- optics (steps 103, 109)
  add('tslSDA', 'yellow', ['tsl', 'SDA', BACK], ['mux', 'SD2', UP], 'towerHigh', 'odInstall');
  add('tslSCL', 'green', ['tsl', 'SCL', BACK], ['mux', 'SC2', UP], 'towerHigh', 'odInstall');
  add('tslV', 'red', ['tsl', 'VIN', BACK], rail('bus5V'), 'towerHigh', 'odInstall');
  add('tslG', 'black', ['tsl', 'GND', BACK], rail('busGND'), 'towerHigh', 'odInstall');
  add('odP', 'white', ['odLed', '+', FRONT], ['ledCtl', 'ch0+', UP], [v(TX - 30, 60, TZ + 40), v(TX - 44, 30, TZ + 10), ...ROUTE.tower.slice(1)], 'odInstall', { mark: true });
  add('odN', 'white', ['odLed', '-', FRONT], ['ledCtl', 'ch0-', UP], [v(TX - 30, 60, TZ + 40), v(TX - 44, 30, TZ + 10), ...ROUTE.tower.slice(1)], 'odInstall');
  const sixC = ['purple', 'blue', 'white', 'green', 'yellow', 'red'];
  for (let i = 0; i < 6; i++) {
    const r = [v(TX + 52, 60, TZ - 10), v(TX + 30, 40, TZ - 50), v(-20, 10, -58), ...ROUTE.tower.slice(1)];
    add(`six${i}P`, sixC[i], ['sixLed' + i, '+', RIGHT], ['ledCtl', `ch${i + 1}+`, UP], r, 'sixPack', { mark: true, jit: i });
    add(`six${i}N`, sixC[i], ['sixLed' + i, '-', RIGHT], ['ledCtl', `ch${i + 1}-`, UP], r, 'sixPack', { jit: i + 6 });
  }
  return W;
}

function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return ((h >>> 0) % 1000) / 1000; }

// Build the path points for one wire
function wirePath(parts, w) {
  const A = pinWorld(parts, w.a[0], w.a[1]), Bp = pinWorld(parts, w.b[0], w.b[1]);
  const la = (w.a[2] || UP).clone().normalize(), lb = (w.b[2] || UP).clone().normalize();
  const pts = [A, A.clone().addScaledVector(la, 7), A.clone().addScaledVector(la, 15)];
  if (w.via) w.via.forEach(([p, n]) => { const q = pinWorld(parts, p, n); pts.push(q.clone().addScaledVector(la, 4), q, q.clone().addScaledVector(la, 4)); });
  const j1 = hash(w.id) - 0.5, j2 = hash(w.id + 'y') - 0.5;
  let route = typeof w.route === 'string' ? ROUTE[w.route] : w.route;
  if (route) route.forEach((p, i) => pts.push(p.clone().add(v(j1 * 7, j2 * 4 + (i > route.length - 3 ? 2 : 0), (w.jit || 0) * 0.6))));
  else if (!w.via) {
    // internal jumper: arc between the two lead points
    const a2 = pts[pts.length - 1], b2 = Bp.clone().addScaledVector(lb, 15);
    const lift = w.lift ?? 14;
    const mid = a2.clone().lerp(b2, 0.5); mid.y = Math.max(a2.y, b2.y) + lift * (0.6 + Math.min(1, a2.distanceTo(b2) / 120) * 0.6) + j2 * 4; mid.x += j1 * 6;
    pts.push(a2.clone().lerp(mid, 0.55).setY(mid.y - 3), mid, b2.clone().lerp(mid, 0.55).setY(mid.y - 3));
  }
  pts.push(Bp.clone().addScaledVector(lb, 15), Bp.clone().addScaledVector(lb, 7), Bp);
  // drop near-duplicate points
  const out = [pts[0]]; for (const p of pts.slice(1)) if (p.distanceTo(out[out.length - 1]) > 0.8) out.push(p);
  return { pts: out, A, B: Bp };
}

export function buildWires(parts, root) {
  const specs = wireSpecs(parts);
  const wires = [];
  const housingGeo = new THREE.BoxGeometry(2.6, 2.6, 13); housingGeo.translate(0, 0, -6.5);
  const shrinkGeo = new THREE.CylinderGeometry(1.35, 1.35, 9, 10); shrinkGeo.rotateX(Math.PI / 2); shrinkGeo.translate(0, 0, -4.5);
  for (const w of specs) {
    let { pts } = wirePath(parts, w);
    if (w.fromB) pts = pts.reverse();
    let curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
    const len = curve.getLength();
    if (w.twist !== undefined) {
      // offset along the Frenet frame to make twisted pairs / braids
      const n = Math.max(40, Math.round(len / 2));
      const fr = curve.computeFrenetFrames(n, false);
      const r = w.braid ? 1.25 : 1.0, pitch = w.braid ? 14 : 9;
      const tp = [];
      for (let i = 0; i <= n; i++) {
        const u = i / n, p = curve.getPointAt(u), ramp = Math.min(1, Math.min(u, 1 - u) * len / 12);
        const th = w.twist + u * len / pitch * Math.PI * 2;
        tp.push(p.addScaledVector(fr.normals[i], Math.cos(th) * r * ramp).addScaledVector(fr.binormals[i], Math.sin(th) * r * ramp));
      }
      curve = new THREE.CatmullRomCurve3(tp, false, 'centripetal', 0.5);
    }
    const tubular = Math.min(520, Math.max(16, Math.round(len / (w.twist !== undefined ? 1.7 : 3.2))));
    const radial = 5;
    const geo = new THREE.TubeGeometry(curve, tubular, w.r || 0.85, radial, false);
    const mesh = new THREE.Mesh(geo, wireMat(w.color)); mesh.castShadow = true;
    mesh.name = `${w.color} wire · ${w.id}`;
    const g = new THREE.Group(); g.add(mesh); g.name = mesh.name;
    // connector housings / heat-shrink at both ends
    const endA = new THREE.Mesh(w.color === 'bare' ? new THREE.SphereGeometry(0.01) : shrinkGeo, M.heatshrink);
    const endB = new THREE.Mesh(w.color === 'bare' ? new THREE.SphereGeometry(0.01) : housingGeo, M.header);
    g.add(endA, endB);
    const orient = (o, u, flip) => { const p = curve.getPointAt(u), t = curve.getTangentAt(u); if (flip) t.negate(); o.position.copy(p); o.lookAt(p.clone().add(t)); };
    orient(endA, 0.0, true);
    g.userData = { partId: 'wire:' + w.id, spec: w, curve, len, tubular, radial, mesh, endA, endB, orient };
    g.traverse(o => o.userData.partId = 'wire:' + w.id);
    g.userData.partId = 'wire:' + w.id;
    g.userData.setGrow = (f) => {
      f = Math.max(0, Math.min(1, f));
      const k = Math.round(f * tubular);
      geo.setDrawRange(0, k * radial * 6);
      g.visible = k > 0;
      endB.visible = f > 0.02;
      if (f > 0) orient(endB, Math.max(0.0005, f), false);
      endA.visible = f > 0;
    };
    g.userData.setGrow(0);
    root.add(g);
    wires.push(g);
  }
  return wires;
}
