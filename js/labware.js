// Testing labware from the manual's "Function Testing and Initializing" section (silicone tubing, luer
// adapters, needles, beakers, tubes, foil, syringe filter) and the loose prepared wires shown when a
// step says "Prepare wires" / "Cut ... wire".
import * as THREE from 'three';
import { M } from './materials.js';
import * as B from './builders.js';
import { pinWorld, TX, TZ } from './assembly.js';

const v = (x, y, z) => new THREE.Vector3(x, y, z);
const TUBE_R = 3.175;   // Silicone Tubing 1/8" ID x 1/4" OD

function tubeMesh(points, name) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5);
  const geo = new THREE.TubeGeometry(curve, Math.max(16, Math.round(curve.getLength() / 3)), TUBE_R, 10, false);
  const m = new THREE.Mesh(geo, M.tubing); m.renderOrder = 4;
  const g = new THREE.Group(); g.name = name; g.add(m); g.userData.curve = curve;
  return g;
}
function place(obj, p, dir) { obj.position.copy(p); obj.quaternion.setFromUnitVectors(v(0, 1, 0), dir.clone().normalize()); return obj; }

export function buildLabware(parts) {
  const out = {};
  const reg = (id, obj, name, meta = {}) => { obj.userData.partId = id; obj.traverse(o => { o.userData.partId = id; if (o.isMesh) { o.castShadow = true; } }); out[id] = { id, obj, name, kind: 'labware', frame: null, ...meta }; return obj; };
  // Testing 1: 60mm tube segments with Barb-To-Male Luer Lock Adapters on every pump nozzle
  const segEnd = {};
  for (let i = 0; i < 4; i++) for (const side of ['in', 'out']) {
    const p = pinWorld(parts, 'pump' + i, side);
    const sx = side === 'in' ? -1 : 1;
    const pts = [p.clone().add(v(0, 0, -2)), p.clone().add(v(0, 0, 8)), p.clone().add(v(sx * 3, 10, 20)), p.clone().add(v(sx * 6, 28, 24))];
    const g = tubeMesh(pts, 'Silicone Tubing 1/8" ID x 1/4" OD (60mm)');
    const c = g.userData.curve, e = c.getPointAt(1), d = c.getTangentAt(1);
    const l = place(B.luerMale(), e.clone().addScaledVector(d, -5), d.clone().negate()); g.add(l);
    segEnd[i + side] = { p: e.clone().addScaledVector(d, 8), d };
    reg(`pumpTube${i}${side}`, g, g.name, { bom: 'Silicone Tubing 1/8" ID x 1/4" OD', frame: 'pump' + i });
  }
  // Testing 4: two 38cm tubes with Barb-To-Female Luer Locks; the second ends in a Barb-to-Male Luer + 2" 14 Gauge needle
  const beakerP = v(-150, 0, -40), conP = v(-118, 0, -6);
  reg('calBeaker', place(B.beaker(34, 92, 'beaker of water'), beakerP, v(0, 1, 0)), 'beaker of water');
  { const w = B.liquid(32.2, 55, M.media.clone()); w.position.y += 1.4; out.calBeaker.obj.add(w); }
  reg('calConical', place(B.conical(15), conP, v(0, 1, 0)), '15mL conical tube');
  {
    const s = segEnd['0in'];
    const a = s.p.clone(), pts = [a, a.clone().addScaledVector(s.d, 10), a.clone().add(v(-30, 50, 0)), v(-110, 120, -45), beakerP.clone().add(v(-6, 110, 0)), beakerP.clone().add(v(-6, 12, 0))];
    const g = tubeMesh(pts, 'Silicone Tubing (38cm, no needle)');
    g.add(place(B.luerFemale(), a.clone().addScaledVector(s.d, -2), s.d));
    reg('calTubeIn', g, g.name, { bom: 'Silicone Tubing 1/8" ID x 1/4" OD' });
  }
  {
    const s = segEnd['0out'];
    const a = s.p.clone(), tip = conP.clone().add(v(0, 150, 0));
    const pts = [a, a.clone().addScaledVector(s.d, 10), a.clone().add(v(-10, 70, 10)), v(-90, 175, 10), tip.clone().add(v(10, 60, 0)), tip.clone().add(v(0, 30, 0))];
    const g = tubeMesh(pts, 'Silicone Tubing (38cm, with needle)');
    g.add(place(B.luerFemale(), a.clone().addScaledVector(s.d, -2), s.d));
    const c = g.userData.curve, e = c.getPointAt(1), d = c.getTangentAt(1);
    g.add(place(B.luerMale(), e.clone().addScaledVector(d, 4), d.clone().negate()));
    const n = B.needle(50.8); n.position.copy(e).add(v(0, -72, 0)); g.add(n);
    reg('calTubeOut', g, g.name, { bom: 'Silicone Tubing 1/8" ID x 1/4" OD' });
  }
  // Testing 8: 50mL centrifuge tube and a beaker of ice water
  reg('tube50', place(B.conical(50, M.capBlue), v(190, 0, 70), v(0, 1, 0)), '50mL centrifuge tube');
  { const w = B.liquid(13.2, 85, M.media.clone()); w.position.y += 18.5; out.tube50.obj.add(w); }
  const ice = place(B.beaker(34, 92, 'beaker of ice water'), v(-125, 0, -45), v(0, 1, 0));
  { const w = B.liquid(32.2, 50, M.media.clone()); w.position.y += 1.4; ice.add(w);
    let s = 5; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < 9; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(11, 9, 11), M.glass); c.position.set((rnd() - 0.5) * 36, 47 + rnd() * 5, (rnd() - 0.5) * 36); c.rotation.set(rnd() * 3, rnd() * 3, 0); ice.add(c); } }
  reg('iceBeaker', ice, 'beaker of ice water');
  // Testing 13: 6cm tubes with a Barb-To-Male Luer Lock on each end, one per edge needle; Luer Lock caps on the free ends
  for (let i = 0; i < 5; i++) {
    const n = parts['needle' + i].obj; const hub = pinWorld(parts, 'needle' + i, 'hub');
    const dir = v(n.position.x - TX, 0, n.position.z - TZ).normalize();
    const pts = [hub.clone().add(v(0, 9, 0)), hub.clone().add(v(0, 18, 0)), hub.clone().addScaledVector(dir, 10).add(v(0, 38, 0)), hub.clone().addScaledVector(dir, 15).add(v(0, 54, 0))];
    const g = tubeMesh(pts, 'Silicone Tubing (6cm)');
    g.add(place(B.luerMale(), hub.clone().add(v(0, 12, 0)), v(0, -1, 0)));
    const c = g.userData.curve, e = c.getPointAt(1), d = c.getTangentAt(1);
    g.add(place(B.luerMale(), e.clone().addScaledVector(d, -4), d.clone().negate()));
    reg('ntube' + i, g, g.name, { bom: 'Silicone Tubing 1/8" ID x 1/4" OD', frame: 'needle' + i });
    reg('ncap' + i, place(B.luerCap(), e.clone().addScaledVector(d, 10), d), 'Luer Lock cap', { frame: 'ntube' + i });
    if (i === 0) reg('filter', place(B.syringeFilter(), e.clone().addScaledVector(d, 8), d), '0.22 μm syringe filter', { bom: 'PES 0.22um Syringe Filter', frame: 'ntube0' });
  }
  // Testing 14: aluminum foil with autoclave tape over the tube assembly
  reg('foil', place(B.foilWrap(30, 205), v(TX, 0, TZ), v(0, 1, 0)), 'aluminum foil with autoclave tape', { frame: 'vial' });
  out.foil.obj.position.y = parts.vial.obj.position.y - 2;
  // Testing 15: 10% bleach and sterile distilled water in 15mL conical tubes
  const bl = place(B.conical(15), v(250, 0, 150), v(0, 1, 0)); { const w = B.liquid(7.3, 88, M.media.clone()); w.position.y += 21; bl.add(w); } reg('conBleach', bl, '15mL conical tube (10% bleach)');
  const dw = place(B.conical(15), v(275, 0, 150), v(0, 1, 0)); { const w = B.liquid(7.3, 88, M.media.clone()); w.position.y += 21; dw.add(w); } reg('conWater', dw, '15mL tube (sterile distilled water)');
  for (const id in out) out[id].obj.updateMatrixWorld(true);
  return out;
}

// One loose wire per Wiring Checklist entry, shown on the bench when the manual says to prepare it.
export function buildWireProps(specs) {
  const out = {};
  specs.forEach((w, i) => {
    if (!w.cm) return;
    const ends = w.ends.split('-').map(e => e === 'solder' || e === 'screw' ? 'tinned' : e).join('-');
    const g = B.looseWire(w.cm * 10, w.color, ends, i + 1);
    g.rotation.y = Math.PI / 2;          // lie along z, so a row of props stacks along x
    g.updateMatrixWorld(true);
    g.userData.partId = 'prep:' + w.id; g.traverse(o => o.userData.partId = 'prep:' + w.id);
    out['prep:' + w.id] = { id: 'prep:' + w.id, obj: g, name: g.name, kind: 'consumable', frame: null, bom: 'Silicone Wire' };
  });
  return out;
}
