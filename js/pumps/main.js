// Replacing the pumps on an assembled OpenEvo: a separate page that reuses the 3D Assembly Manual's parts,
// wires and timeline engine (js/assembly.js, wires.js, labware.js, timeline.js) without changing them.
import * as THREE from 'three';
import { createScene } from '../scene.js';
import { buildAssembly } from '../assembly.js';
import { buildWires } from '../wires.js';
import { buildLabware, buildWireProps } from '../labware.js';
import { FRAMES } from '../steps.js';
import { compileTimeline, applyTimeline, cameraAt } from '../timeline.js';
import { M } from '../materials.js';
import * as B from '../builders.js';
import { pinWorld } from '../assembly.js';
import { START_KEEP, START_STAGES, START_POSES } from './start.js';
import { makeSteps, CHAPTERS, VIEWS, CONFIG_SPEED, TERM, calTimes } from './steps.js';

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const QS = new URLSearchParams(location.search);
function updateLayout() { const f = QS.get('layout'); document.body.classList.toggle('mobile', f ? f === 'mobile' : window.innerWidth <= 820); }
updateLayout(); window.addEventListener('resize', updateLayout);
const store = { get(k, d) { try { const v = localStorage.getItem('openevo.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('openevo.' + k, JSON.stringify(v)); } catch {} } };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const chapterOf = id => CHAPTERS.find(c => c.id === id);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ------------------------------------------------------------------ theme + scene
let dark = store.get('dark', window.matchMedia?.('(prefers-color-scheme: dark)').matches || false);
const S = createScene($('#view'));
function applyTheme() { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; S.setTheme(dark); $('[data-tool="theme"]').classList.toggle('on', dark); }
applyTheme();
const root = new THREE.Group(); root.name = 'OpenEvo'; S.scene.add(root);
{ const k = S.lights.key, sc = k.shadow.camera; k.target.position.set(90, 0, -40); k.position.set(350, 560, 160); sc.left = -560; sc.right = 560; sc.top = 560; sc.bottom = -560; sc.far = 1600; sc.updateProjectionMatrix(); k.shadow.mapSize.set(4096, 4096); }
const ldFill = $('#ldFill'), ldText = $('#ldText');
const { parts, printFrame, prims } = await buildAssembly(root, p => { ldFill.style.width = (p * 70).toFixed(0) + '%'; });
ldText.textContent = 'Routing the wires…';
await new Promise(r => setTimeout(r, 20));
const wires = buildWires(parts, root, { prims, printFrame });   // keeps .retargetProbe; its pump wires are replaced below
const lab = buildLabware(parts); for (const id in lab) { root.add(lab[id].obj); parts[id] = lab[id]; }
const sstep = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
const UP = V(0, 1, 0);
const catmull = pts => new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);

// ------------------------------------------------------------------ parts this page adds
function reg(id, obj, meta) {
  obj.userData.partId = id; obj.traverse(o => { o.userData.partId = id; if (o.isMesh) o.castShadow = true; });
  root.add(obj); obj.updateMatrixWorld(true);
  parts[id] = { id, obj, name: obj.name, frame: null, ...meta };
}
// new pumps: the same Bill of Materials part, as bought, assembled where the old one sits
for (let i = 0; i < 4; i++) {
  const src = parts['pump' + i].obj, o = B.pump();
  o.position.copy(src.position); o.quaternion.copy(src.quaternion); o.scale.copy(src.scale); o.updateMatrixWorld(true);
  B.optimizePart(o); o.name = `new pump motor M${i + 1}`;
  reg('newPump' + i, o, { name: `new pump motor M${i + 1}`, bom: 'DC Motor Peristaltic Pump', kind: 'electronic', frame: 'modG' });
}
reg('kitWire1', B.wireKitBox(['black', 'red', 'orange', 'yellow', 'green', 'blue'], '22AWG Silicone Wire Kit Box 1'), { bom: '22AWG Silicone Wire Kit Box 1', kind: 'material' });
reg('kitSolder', B.solderSpool(), { bom: 'Lead-Free Solder', kind: 'material' });
reg('kitPSU', B.powerSupply(), { bom: '12v 5A Power Supply', kind: 'material' });
reg('screwdriver', (() => {
  const g = new THREE.Group(); g.name = 'small flathead screwdriver';
  const handleMat = new THREE.MeshStandardMaterial({ color: '#d4402f', roughness: 0.45 });
  g.add(B.box(2.4, 5, 0.5, M.steel, 0, 2.5, 0));
  g.add(B.cyl(1.3, 52, M.steel, 0, 5 + 26, 0, 'y', 12));
  g.add(B.cyl(3.4, 7, M.steelDark, 0, 60, 0, 'y', 16));
  g.add(B.cyl(6.6, 72, handleMat, 0, 99, 0, 'y', 8));
  g.add(B.cyl(6.0, 4, handleMat, 0, 137, 0, 'y', 8, 4.6));
  return g;
})(), { kind: 'tool' });
{ const g = new THREE.Group(); g.name = 'timing marks'; reg('tmark', g, { kind: 'virtual' }); }

// 60mm tube segments as the Function Testing step 1 photo shows them: off the nozzle and straight up, with the
// Barb-To-Male Luer Lock Adapter's barb in the tube and its luer end on top
const TUBE_R = 3.175, NOZ = {}, SEG = {}, SEG_DX = { '1in': -5.4, '1out': -6.8, '2in': 1.5, '2out': 1.5 };
for (let i = 0; i < 4; i++) for (const side of ['in', 'out']) {
  const id = `pumpTube${i}${side}`, q = pinWorld(parts, 'pump' + i, side); NOZ[id] = q.clone();
  const dx = SEG_DX[i + side] || 0;   // M2's and M3's segments bend sideways at the nozzle, clear of the wires that drop between Modules C and G
  const curve = catmull([q.clone().add(V(0, 0, -2)), q.clone().add(V(0, 0, 2)), q.clone().add(V(dx * 0.6, 1, 4.6)), q.clone().add(V(dx, 4, 6.5)), q.clone().add(V(dx, 12, 7.8)), q.clone().add(V(dx, 30, 7.8)), q.clone().add(V(dx, 54, 7.8))]);
  const g = parts[id].obj, m = g.children[0]; m.geometry.dispose(); m.geometry = new THREE.TubeGeometry(curve, 48, TUBE_R, 10, false); g.userData.curve = curve;
  const e = curve.getPointAt(1), lu = parts[`pumpLuer${i}${side}`].obj;
  lu.position.copy(e).addScaledVector(UP, 9); lu.quaternion.setFromUnitVectors(UP, V(0, -1, 0)); lu.updateMatrix(); lu.updateMatrixWorld(true);
  SEG[i + side] = { e, a: e.clone().addScaledVector(UP, 14) };   // a: where a tube pushed onto the next adapter's barb starts
}
// calibration set-up for each pump (Function Testing 4: two 38cm tubes, luer locks, a 2" 14 Gauge needle,
// a beaker of water, a 15mL conical tube). The tubes rise behind the reactor tower, go out to the side and droop
// behind the beaker before reaching it. While priming (Function Testing 5) the needle is held over the beaker;
// it then moves over the conical tube and down into it.
const RIG_N = 170;
function tubeGeo(curve) { return new THREE.TubeGeometry(curve, 150, TUBE_R, 10, false); }
function tubeMesh(points, name) {
  const curve = catmull(points), m = new THREE.Mesh(tubeGeo(curve), M.tubing); m.renderOrder = 4;
  const g = new THREE.Group(); g.name = name; g.add(m); g.userData.curve = curve; return g;
}
const placeAlong = (obj, p, dir) => { obj.position.copy(p); obj.quaternion.setFromUnitVectors(UP, dir.clone().normalize()); obj.updateMatrixWorld(true); return obj; };
const alongM = (p, dir) => new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize()), V(1, 1, 1));
const rigLiquid = {}, RIG = {};
const rigIds = p => ({ beaker: `rig${p}Beaker`, tin: `rig${p}In`, tout: `rig${p}Out`, lf0: `rig${p}LF0`, lf1: `rig${p}LF1`, lm: `rig${p}LM`, needle: `rig${p}Needle`, conical: `rig${p}Conical` });
for (let p = 0; p < 4; p++) {
  const ids = rigIds(p), L = p >= 2 ? 1 : -1;            // M1/M2 on the left of the robot (as in the manual's set-up), M3/M4 on the right
  const beakerP = V(150 * L, 0, -40), conP = V(118 * L, 0, -6), tip = conP.clone().add(V(0, 150, 0)), tipP = beakerP.clone().add(V(-12 * L, 150, 10));
  const bk = placeAlong(B.beaker(34, 92, 'beaker of water'), beakerP, UP); { const w = B.liquid(32.2, 55, M.media.clone()); w.position.y += 1.4; bk.add(w); }
  reg(ids.beaker, bk, { name: 'beaker of water', kind: 'labware' });
  const cn = placeAlong(B.conical(15), conP, UP);
  cn.traverse(m => { if (m.isMesh && m.material === M.capBlue) m.visible = false; });          // cap off: the needle goes into the tube
  { const geo = new THREE.CylinderGeometry(7.3, 7.3, 58, 32); geo.translate(0, 29, 0); const w = new THREE.Mesh(geo, M.media.clone()); w.position.y = 21; w.renderOrder = 2; w.visible = false; cn.add(w); rigLiquid[p] = w; }
  reg(ids.conical, cn, { name: '15mL conical tube', kind: 'labware' });
  // the tube that crosses behind the other one's riser runs further back: it turns back early and droops furthest back;
  // the front tube carries on outward in front of it, then droops
  const front = L < 0 ? 'in' : 'out';
  const route0 = side => { const a = SEG[p + side].a.clone(), z = a.z, rear = side !== front;
    return rear ? [a, a.clone().add(V(0, 8, 0)), V(a.x, 88, z), V(a.x + L * 6, 92, z - 11), V(L * 74, 94, z - 11), V(L * 90, 84, -90), V(L * 104, 74, -108), V(L * 128, 76, -114)]
      : [a, a.clone().add(V(0, 8, 0)), V(a.x, 96, z), V(a.x + L * 6, 101, z), V(L * 64, 102, z), V(L * 112, 98, z - 1), V(L * 126, 70, -78), V(L * 132, 52, -92)]; };
  const d = side => side === front ? -92 : -112;
  const inPts = [...route0('in'), V(L * 148, 70, d('in') + 6), V(L * 154, 116, -68), beakerP.clone().add(V(L * 6, 110, 0)), beakerP.clone().add(V(L * 6, 12, 0))];
  const outMid = [...route0('out'), V(L * 166, 98, d('out') + 12), V(L * 176, 128, -78)];
  const outFinal = [...outMid, V(L * 150, 178, -40), tip.clone().add(V(0, 60, 0)), tip.clone().add(V(0, 30, 0))];
  const outHover = [...outMid, V(L * 150, 192, -40), tip.clone().add(V(0, 85, 0)), tip.clone().add(V(0, 55, 0))];
  const outPrime = [...outMid, V(L * 160, 182, -52), tipP.clone().add(V(0, 60, 0)), tipP.clone().add(V(0, 30, 0))];
  { const a = SEG[p + 'in'].a, g = tubeMesh(inPts, 'Silicone Tubing (38cm, no needle)');
    reg(ids.tin, g, { name: g.name, bom: 'Silicone Tubing 1/8" ID x 1/4" OD', kind: 'labware' });
    reg(ids.lf0, placeAlong(B.luerFemale(), a.clone().addScaledVector(UP, -8), UP), { name: 'Barb-To-Female Luer Lock connector', kind: 'hardware', frame: ids.tin }); }
  { const a = SEG[p + 'out'].a, g = tubeMesh(outFinal, 'Silicone Tubing (38cm, with needle)');
    reg(ids.tout, g, { name: g.name, bom: 'Silicone Tubing 1/8" ID x 1/4" OD', kind: 'labware' });
    reg(ids.lf1, placeAlong(B.luerFemale(), a.clone().addScaledVector(UP, -8), UP), { name: 'Barb-To-Female Luer Lock connector', kind: 'hardware', frame: ids.tout });
    // Barb-to-Male Luer Lock in the tube end, the needle's hub on its luer end (placed for the final shape; prime/hover poses below)
    const ends = {}, curves = {};
    for (const [k, pts] of Object.entries({ prime: outPrime, hover: outHover, final: outFinal })) {
      const c = catmull(pts), e = c.getPointAt(1), d = c.getTangentAt(1).normalize();
      curves[k] = c.getSpacedPoints(RIG_N);
      ends[k] = { lm: alongM(e.clone().addScaledVector(d, 9), d.clone().negate()), needle: alongM(e.clone().addScaledVector(d, 9 + 62.4), d.clone().negate()) };
    }
    const lm = B.luerMale(); lm.matrix.copy(ends.final.lm); lm.matrix.decompose(lm.position, lm.quaternion, lm.scale); reg(ids.lm, lm, { name: 'Barb-to-Male Luer Lock connector', kind: 'hardware', frame: ids.tout });
    const n = B.needle(50.8, '2" 14 Gauge Dispensing Needle'); n.matrix.copy(ends.final.needle); n.matrix.decompose(n.position, n.quaternion, n.scale); reg(ids.needle, n, { name: n.name, kind: 'hardware', frame: ids.tout });
    RIG[p] = { curves, ends, shape: 'final', amt: -1 };
    g.children[0].geometry.dispose(); g.children[0].geometry = tubeGeo(catmull(curves.prime)); g.userData.curve = catmull(curves.prime); RIG[p].key = 'prime';
  }
}
// the needle tube's shape follows the needle: over the beaker (prime) -> over the conical tube (hover) -> into it (final)
function updateRig() {
  const M_ = tl.marks || {}, e = u => u * u * (3 - 2 * u), ramp = (a, d) => a == null ? 0 : clamp((t - a) / d, 0, 1);
  const p = (tl.steps.find(s => s.id === 'calib')?.fx || {}).pump; if (p == null) return false;
  const R = RIG[p], a1 = e(ramp(M_.toHover, 1.4)), a2 = e(ramp(M_.toFinal, 1.0));
  const [A, Bc, u] = a2 > 0 ? [R.curves.hover, R.curves.final, a2] : [R.curves.prime, R.curves.hover, a1];
  const key = (a2 > 0 ? 'h' : 'p') + Math.round(u * 40);
  if (key === R.key) return false; R.key = key;
  const pts = A.map((q, i) => q.clone().lerp(Bc[i], u)), g = parts[rigIds(p).tout].obj, c = catmull(pts);
  g.children[0].geometry.dispose(); g.children[0].geometry = tubeGeo(c); g.userData.curve = c;
  return true;
}
// pump wires as in the step 69 photo: each motor across its own pair (+ outer hole, marked wire inner hole).
// wires.js routes the marked wire to the GND position, so the routing is run with that pin moved to the pair's inner hole.
ldText.textContent = 'Wiring the pumps…';
await new Promise(r => setTimeout(r, 20));
function wirePass(map) {
  const ud = parts.shield.obj.userData, save = {};
  for (const k in map) { save[k] = [ud.pins[k], ud.leads?.[k]]; ud.pins[k] = ud.pins[map[k]].clone(); if (ud.leads?.[map[k]]) ud.leads[k] = ud.leads[map[k]].clone(); }
  const out = buildWires(parts, root, { prims, printFrame });
  for (const k in map) { ud.pins[k] = save[k][0]; if (ud.leads) { if (save[k][1]) ud.leads[k] = save[k][1]; else delete ud.leads[k]; } }
  return out;
}
const dropWire = g => { root.remove(g); g.traverse(o => o.geometry?.dispose()); };
const PW = [];
for (const [map, keep] of [[{ GND12: 'M1b', GND34: 'M3b' }, /^pump[02][PN]$/], [{ GND12: 'M2a', GND34: 'M4a' }, /^pump[13][PN]$/]]) {
  for (const g of wirePass(map)) { if (keep.test(g.userData.spec.id)) PW.push(g); else dropWire(g); }
}
for (const g of wires) if (/^pump\d[PN]$/.test(g.userData.spec.id)) dropWire(g);
const others = wires.filter(g => !/^pump\d[PN]$/.test(g.userData.spec.id));
for (const g of PW) { const sp = g.userData.spec; g.userData.spec = { ...sp, grow: [], markAt: undefined, twistAt: undefined, term: ['M1a', 'M1b', 'M2b', 'M2a', 'M3a', 'M3b', 'M4b', 'M4a'][+sp.id[4] * 2 + (sp.id.endsWith('N') ? 1 : 0)] }; }
PW.sort((a, b) => a.userData.spec.id.localeCompare(b.userData.spec.id));
const props = buildWireProps(PW.map(g => ({ ...g.userData.spec, id: 'new_' + g.userData.spec.id }))); for (const id in props) { root.add(props[id].obj); parts[id] = props[id]; }
const allWires = [...others, ...PW];
// the black mark sits on the coil while a wire is coiled at its free end
for (const g of PW) g.userData.band = g.children.find(c => c.isMesh && c.geometry?.parameters?.radiusTop === 0.95 && c.geometry.parameters.height === 6);

// the four braids arch over the motherboard at the same height; their arches are spread apart (M2's a little lower, under the thermistor cable) so they don't pass through each other
const ARCH = [[0, 5], [0, -4], [4, 10], [0, 16]];   // [dx, dy] per pump M1-M4
for (const g of PW) {
  const ud = g.userData, orig = ud.setTwist, [dx, dy] = ARCH[+ud.spec.id[4]];
  const lift = () => ud.rebuild(catmull(ud.curve.getPoints(240).map(p => { const w = sstep(56, 74, p.y); return p.clone().setY(p.y + dy * w).setX(p.x + dx * w); })));
  ud.setTwist = on => { const was = ud.tw; orig(on); if (ud.tw !== was && ud.tw) lift(); };
}

// ------------------------------------------------------------------ the machine as it is: made states and braided, marked wires
for (const id in START_STAGES) parts[id]?.obj.traverse(o => { const st = o.userData.stage; if (st && st in START_STAGES[id]) o.visible = START_STAGES[id][st]; });
for (const g of allWires) { const sp = g.userData.spec; if (sp.twistAt || /^pump\d[PN]$/.test(sp.id)) g.userData.setTwist(true); if (sp.markAt || sp.mark) g.userData.setMark(true); }
{ const mm = parts.media.obj.material; mm.color.set('#f1df9a'); mm.opacity = 0.42; mm.roughness = 0.08; }
const START = {};
for (const id of START_KEEP) if (parts[id]) START[id] = { spec: START_POSES[id] ? { frame: START_POSES[id].frame, M: new THREE.Matrix4().fromArray(START_POSES[id].M) } : 'final', show: true };

// screw heads of the Motor Shield terminals (screw terminal blocks along its short edges: the screw sits 1mm inboard of the wire entry)
const SCREW = {};
{ const sh = parts.shield.obj; sh.updateMatrixWorld(true);
  for (const n of ['M1a', 'M1b', 'GND12', 'M2a', 'M2b', 'M3a', 'M3b', 'GND34', 'M4a', 'M4b']) { const v = sh.userData.pins[n].clone(); v.x += /^(M1|M2|GND12)/.test(n) ? 1 : -1; SCREW[n] = sh.localToWorld(v).toArray(); } }
// the screwdriver leans 18 degrees away from the wire that leaves the terminal beside the screw, and toward its own pump's end
// of the terminal block (away from the neighbouring pump's wires)
const SCREW_TILT = {};
{ const sh = parts.shield.obj, q = sh.getWorldQuaternion(new THREE.Quaternion());
  for (const n in SCREW) {
    const d = (sh.userData.leads?.[n] || UP).clone().applyQuaternion(q); d.y = 0; d.normalize();
    const out = V(0, 0, /^(M1|M4)/.test(n) ? -1 : 1).applyQuaternion(q);
    const lean = d.negate().addScaledVector(out, 0.8).normalize();
    SCREW_TILT[n] = new THREE.Quaternion().setFromUnitVectors(UP, UP.clone().addScaledVector(lean, Math.tan(18 * Math.PI / 180)).normalize());
  } }
const screwPose = (n, up, yaw) => { const L = SCREW_TILT[n], dir = UP.clone().applyQuaternion(L), p = V(...SCREW[n]).addScaledVector(dir, up ? 72 : 0.2);
  return { frame: null, M: new THREE.Matrix4().compose(p, L.clone().multiply(new THREE.Quaternion().setFromAxisAngle(UP, yaw * Math.PI / 180)), V(1, 1, 1)) }; };
const TUBE_DRIFT = { pumpTube1out: -6 };   // worked off its nozzle slightly sideways, clear of the wires in front of it
const finalOf = id => { const o = parts[id].obj; return new THREE.Matrix4().compose(o.position, o.quaternion, o.scale); };
const ctx = {
  screw: SCREW, screwPose, rigIds,
  rigPose: (p, which, part) => ({ on: rigIds(p).tout, M: RIG[p].ends[which][part].clone() }),
  onPump: (id, frame, off) => ({ on: frame, M: new THREE.Matrix4().makeTranslation(...off).multiply(finalOf(id)) }),
  // a tube segment slid dz along its nozzle while tipped back by deg (pivot at the nozzle tip), lifted dy
  tilt: (id, frame, dz, deg, dy) => { const q = NOZ[id], dx = (TUBE_DRIFT[id] || 0) * Math.min(1, dz / 3); return { on: frame, M: new THREE.Matrix4().makeTranslation(q.x + dx, q.y + dy, q.z + dz).multiply(new THREE.Matrix4().makeRotationX(deg * Math.PI / 180)).multiply(new THREE.Matrix4().makeTranslation(-q.x, -q.y, -q.z)).multiply(finalOf(id)) }; },
};

// ------------------------------------------------------------------ wires moved out of the way while pumps come out
// The thermistor needle cable runs up over pump M2 to the needle; when M2 (or its tubing) comes out it is lifted
// up out of the way. A neighbour's braid that arches over a pump being lifted is pushed back.
const I4 = new THREE.Matrix4(), HDR0 = parts.needleHdr.obj.matrixWorld.clone();
wires.retargetProbe(HDR0, I4);                       // as index.html lays it when the needle is in the cap
const HDR_REST = (() => {                           // cable end unplugged and laid back over the motherboard, plugs facing back
  const c = V(0, 0, 0); for (const n of ['S', '+', '-']) c.add(parts.needleHdr.obj.localToWorld(parts.needleHdr.obj.userData.pins[n].clone())); c.multiplyScalar(1 / 3);
  return new THREE.Matrix4().makeTranslation(-22, 96, -135).multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2)).multiply(new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z)).multiply(HDR0);
})();
let probeAmt = 0;
const _pa = V(0, 0, 0), _pb = V(0, 0, 0), _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _s1 = V(1, 1, 1), _s2 = V(1, 1, 1);
function layProbe(a) { HDR0.decompose(_pa, _qa, _s1); HDR_REST.decompose(_pb, _qb, _s2); wires.retargetProbe(new THREE.Matrix4().compose(_pa.lerp(_pb, a), _qa.slerp(_qb, a), _s1), I4); }
const BASE = new Map(); for (const g of allWires) BASE.set(g, g.userData.curve);
const ASIDE = new Map();   // wire -> { kind, pts0, pts1, amt }
const PUMPXZ = i => { const o = parts['pump' + i].obj; return [o.position.x, o.position.z]; };
function computeAside(sel) {
  for (const [g, A] of ASIDE) if (A.amt) g.userData.rebuild(BASE.get(g));
  ASIDE.clear();
  const cols = sel.map(PUMPXZ), tubeCols = sel.flatMap(i => ['in', 'out'].map(s => { const q = NOZ[`pumpTube${i}${s}`]; return [q.x, q.z + 6]; }));
  const near = (p, cs, R) => cs.some(([x, z]) => Math.hypot(p.x - x, p.z - z) < R);
  const out = { probe: false, braids: [] };
  for (const g of allWires) {
    const sp = g.userData.spec, pts = BASE.get(g).getPoints(260);
    if (sp.route === 'probe') { if (pts.some(p => p.y > 40 && (near(p, cols, 16) || near(p, tubeCols, 13)))) out.probe = true; }
    else if (/^pump\d[PN]$/.test(sp.id) && !sel.includes(+sp.id[4])) {
      // shift needed to clear every lifted pump's column (pushing toward -z), spread smoothly along the wire
      const need = pts.map(p => { if (p.y < 45) return 0; let s = 0; for (const [x, z] of cols) { const dx = p.x - x, R = 16.5; if (Math.abs(dx) < R) { const zz = z - Math.sqrt(R * R - dx * dx); if (p.z > zz && p.z < z + Math.sqrt(R * R - dx * dx)) s = Math.min(s, zz - p.z); } } return s; });
      if (!need.some(s => s < 0)) continue;
      const K = 18, sh = need.map((_, i) => { let m = 0; for (let j = Math.max(0, i - K); j <= Math.min(need.length - 1, i + K); j++) m = Math.min(m, need[j] * (0.5 + 0.5 * Math.cos(Math.PI * (i - j) / K))); return m; });
      const j = +sp.id[4]; if (!out.braids.includes(j)) out.braids.push(j);
      ASIDE.set(g, { kind: 'braid', pts0: pts, pts1: pts.map((p, i) => p.clone().setZ(p.z + sh[i])), amt: 0 });
    }
  }
  return out;
}
function updateAside() {
  let changed = false;
  const M_ = tl.marks || {}, ramp = (a, d = 1.2) => a == null ? 0 : clamp((t - a) / d, 0, 1);
  let aP = ramp(M_.probeUp, 1.6) * (1 - ramp(M_.probeDown, 1.6)); aP = Math.round(aP * aP * (3 - 2 * aP) * 24) / 24;
  if (aP !== probeAmt) { probeAmt = aP; layProbe(aP); changed = true; }
  const aB = ramp(M_.pushOn, 1.0) * (1 - ramp(M_.pushOff, 1.0));
  for (const [g, A] of ASIDE) {
    let a = aB; a = Math.round(a * a * (3 - 2 * a) * 16) / 16;
    if (a === A.amt) continue; A.amt = a; changed = true;
    g.userData.rebuild(a === 0 ? BASE.get(g) : catmull(A.pts0.map((p, i) => p.clone().lerp(A.pts1[i], a))));
  }
  return changed;
}

// ------------------------------------------------------------------ timeline for the chosen pumps
const SEL_KEY = { all: [0, 1, 2, 3], 1: [0], 2: [1], 3: [2], 4: [3] };
const validSel = k => Object.prototype.hasOwnProperty.call(SEL_KEY, k);
let selKey = validSel(QS.get('pump')) ? QS.get('pump') : store.get('pumpSel', 'all'); if (!validSel(selKey)) selKey = 'all';
let tl = null, t = 0;
function compile() {
  const sel = SEL_KEY[selKey];
  for (const g of PW) { g.userData.setTwist(true); g.userData.setMark(true); }
  ctx.aside = computeAside(sel);
  for (const id in parts) { const o = parts[id].obj; o.updateMatrix(); o.updateMatrixWorld(true); }
  const T = compileTimeline({ steps: makeSteps(sel, ctx), parts, wires: allWires, views: VIEWS, frames: FRAMES, kit: START });
  // every wire is in place from the start; timing marks move wire ends in and out of terminals
  const byId = Object.fromEntries(T.wires.map(x => [x.spec.id, x]));
  for (const x of T.wires) { x.segs = [{ t0: 0, t1: 0.001, f0: 1, f1: 1 }]; x.f = 1; }
  for (const s of T.steps) s.fxT = {};
  T.marks = {};
  for (const e of T.parts.tmark.stages.slice().sort((a, b) => a.t - b.t)) {
    const [k, a, f, dur] = e.name.split('|');
    if (k === 'w') { const x = byId[a]; x.segs.push({ t0: e.t, t1: e.t + +dur, f0: x.f, f1: +f }); x.f = +f; }
    else if (k === 't') { const s = T.steps[T.stepAt(e.t)]; s.fxT[a] = e.t - s.t0; T.marks[a] = e.t; }
  }
  T.parts.tmark.stages = [];
  // a replaced pump's wire pair is the old pump's until that pump is set aside, then the new pump's (unbraided until step 30)
  for (const x of T.wires) {
    const m = x.spec.id.match(/^pump(\d)[PN]$/); if (!m || !sel.includes(+m[1])) continue;
    const i = +m[1], sw = T.marks.switch, br = T.marks.braidOn;
    Object.defineProperty(x, 'follow', { get: () => t < sw ? 'pump' + i : 'newPump' + i, configurable: true });
    x.braided = () => t < sw || t >= br;
  }
  return T;
}

// ------------------------------------------------------------------ highlight
const ACCENT = new THREE.Color('#19c6b3'); const hiCache = new Map(); const plaClones = [];
function setGlow(id, g) {
  const o = parts[id]?.obj; if (!o) return;
  o.traverse(m => {
    if (!m.isMesh || !m.material || !m.material.isMeshStandardMaterial) return;
    if (!m.userData.baseMat) m.userData.baseMat = m.material;
    if (g <= 0.01) { if (m.material !== m.userData.baseMat) m.material = m.userData.baseMat; return; }
    let hm = hiCache.get(m.userData.baseMat);
    if (!hm) { hm = m.userData.baseMat.clone(); hm.emissive = ACCENT.clone(); hiCache.set(m.userData.baseMat, hm); if (m.userData.baseMat === M.pla) plaClones.push(hm); }
    hm.emissiveIntensity = 0.12 + g * 0.5; m.material = hm;
  });
}
let glowing = new Set();

// ------------------------------------------------------------------ UI
let playing = false, speed = 1, stopAt = null, lastStep = -1, userCam = false, orbitAng = 0, camTween = null;
const tools = { labels: true, xray: false, wires: true, rotate: false };
S.controls.addEventListener('start', () => { userCam = true; camTween = null; });
const stepCard = $('#stepCard'), stepList = $('#stepList'), track = $('#tlTrack'), fill = $('#tlFill'), timeline = $('#timeline'), tlHover = $('#tlHover');
const KIND_COL = { printed: '#334155', electronic: '#2563eb', hardware: '#94a3b8', consumable: '#d97706', labware: '#0d9488', material: '#d97706', tool: '#dc2626' };
const paras = text => esc(text).split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
const partLabel = id => parts[id].manualName || parts[id].name;

function buildSelector() {
  $('#pumpSel').innerHTML = `<span>Pump to replace</span>` + [['all', 'All four'], ['1', 'M1'], ['2', 'M2'], ['3', 'M3'], ['4', 'M4']].map(([k, l]) => `<button data-k="${k}" class="${k === selKey ? 'on' : ''}">${l}</button>`).join('');
  $$('#pumpSel button').forEach(b => b.addEventListener('click', () => setSel(b.dataset.k)));
}
function setSel(k) {
  if (!validSel(k) || k === selKey) return;
  const id = tl.steps[tl.stepAt(t)].id;
  selKey = k; store.set('pumpSel', k);
  tl = compile(); buildSelector(); buildStepList(); buildTimeline();
  const kk = Math.max(0, tl.steps.findIndex(s => s.id === id));
  goStep(kk, false); lastStep = -1;
  try { const u = new URL(location.href); u.searchParams.set('pump', k); history.replaceState(null, '', u); } catch {}
}
function buildStepList() {
  let html = '', lastCh = null;
  tl.steps.forEach((s, i) => {
    if (s.ch !== lastCh) { const c = chapterOf(s.ch); html += `<li class="chap" style="--c:${c.color}">${esc(c.name)}</li>`; lastCh = s.ch; }
    html += `<li class="s" data-i="${i}"><span class="n">${i + 1}</span><span>${esc(s.title)}</span>${s.notIn ? '' : s.src ? '<span class="m">manual</span>' : ''}</li>`;
  });
  stepList.innerHTML = html;
  stepList.querySelectorAll('li.s').forEach(li => li.addEventListener('click', () => goStep(+li.dataset.i, true)));
}
function buildTimeline() { track.innerHTML = tl.steps.map(s => `<i style="flex:${s.dur} 1 0;--c:${chapterOf(s.ch).color}"></i>`).join(''); layoutFill(); }
function layoutFill() { const segs = [...track.children]; fill.innerHTML = segs.map((el, i) => `<i style="width:${el.offsetWidth}px;--c:${chapterOf(tl.steps[i].ch).color}"></i>`).join(''); }
window.addEventListener('resize', layoutFill);
function timeFromX(x) { const r = timeline.getBoundingClientRect(); return clamp((x - r.left) / r.width, 0, 1) * tl.total; }
let scrubbing = false;
timeline.addEventListener('pointerdown', e => { scrubbing = true; timeline.setPointerCapture(e.pointerId); setTime(timeFromX(e.clientX)); stopAt = null; userCam = false; });
timeline.addEventListener('pointermove', e => { const tt = timeFromX(e.clientX), s = tl.steps[tl.stepAt(tt)], r = timeline.getBoundingClientRect(); tlHover.textContent = s.title; tlHover.style.left = clamp(e.clientX - r.left, 80, r.width - 80) + 'px'; if (scrubbing) setTime(tt); });
timeline.addEventListener('pointerup', () => { scrubbing = false; });

function renderCard(k) {
  const s = tl.steps[k], c = chapterOf(s.ch);
  const seen = new Set(), chips = [];
  for (const id of s.adds || []) { const p = parts[id]; if (!p || p.kind === 'virtual' || id.startsWith('prep:')) continue; const key = partLabel(id); if (seen.has(key)) continue; seen.add(key); chips.push(`<button class="pchip" data-part="${id}" style="--k:${KIND_COL[p.kind] || '#475569'}"><i></i>${esc(key)}</button>`); }
  const src = (s.src || []).map(q => `<div class="mq"><div class="mq-h"><svg viewBox="0 0 24 24"><path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v16H5.5A1.5 1.5 0 0 0 4 20.5zM4 20.5A1.5 1.5 0 0 0 5.5 22H20v-3"/></svg>Assembly Manual · ${esc(q.ref)}</div><div class="manual-text">${paras(q.text)}</div></div>`).join('');
  stepCard.innerHTML = `
    <div class="meta"><span class="chip" style="--c:${c.color}">${esc(c.name)}</span><span class="stepno">${k + 1} / ${tl.steps.length}</span></div>
    <h2>${esc(s.title)}</h2>
    ${s.notIn ? '<div class="notin">This step is not in the manual</div>' : ''}
    ${src}
    ${s.note ? `<div class="body">${paras(s.note)}</div>` : ''}
    ${chips.length ? `<div class="sub">Parts in this step</div><div class="pchips">${chips.join('')}</div>` : ''}
    <div class="nav2"><button data-nav="prev" ${k === 0 ? 'disabled' : ''}>← Previous</button><button data-nav="next" class="primary" ${k === tl.steps.length - 1 ? 'disabled' : ''}>Next step →</button></div>`;
  stepCard.querySelectorAll('.pchip').forEach(b => b.addEventListener('click', () => focusPart(b.dataset.part)));
  stepCard.querySelector('[data-nav="prev"]').addEventListener('click', prevStep);
  stepCard.querySelector('[data-nav="next"]').addEventListener('click', nextStep);
  stepList.querySelectorAll('li.s').forEach(li => { const i = +li.dataset.i; li.classList.toggle('cur', i === k); li.classList.toggle('done', i < k); });
  const box = stepCard.closest('.tab'); if (box.scrollTop > 40) box.scrollTo({ top: 0, behavior: 'smooth' });
  $('#tpChapter').textContent = c.name; $('#tpChapter').style.setProperty('--c', c.color); $('#tpTitle').textContent = s.title;
  try { history.replaceState(null, '', location.pathname + location.search + '#' + s.id); } catch {}
}
function setTime(x) { t = clamp(x, 0, tl.total); }
function goStep(k, play = true) {
  k = clamp(k, 0, tl.steps.length - 1); const s = tl.steps[k];
  setTime(s.t0 + 0.001); userCam = false; camTween = null;
  if (play) { playing = true; stopAt = s.t0 + s.dur - 0.05; } else { playing = false; stopAt = null; }
  syncPlay();
}
function nextStep() { goStep(tl.stepAt(t) + 1, true); }
function prevStep() { const k = tl.stepAt(t), s = tl.steps[k]; goStep(t - s.t0 > 1.2 && !playing ? k : k - 1, true); }
function togglePlay() { if (playing) playing = false; else { if (t >= tl.total - 0.05) setTime(0); playing = true; stopAt = null; userCam = false; } syncPlay(); }
function syncPlay() { document.body.classList.toggle('playing', playing); $('#btnPlay').setAttribute('aria-label', playing ? 'Pause' : 'Play'); }
$('#btnPlay').addEventListener('click', togglePlay); $('#btnNext').addEventListener('click', nextStep); $('#btnPrev').addEventListener('click', prevStep);
$$('.tp-speed button').forEach(b => b.addEventListener('click', () => { speed = +b.dataset.speed; $$('.tp-speed button').forEach(x => x.classList.toggle('on', x === b)); }));
$$('.tabs button').forEach(b => b.addEventListener('click', () => { $$('.tabs button').forEach(x => x.classList.toggle('active', x === b)); $$('.tab').forEach(x => x.classList.toggle('active', x.dataset.tab === b.dataset.tab)); if (document.body.classList.contains('sheet-min')) { document.body.classList.remove('sheet-min'); setTimeout(() => { S.resize(); layoutFill(); }, 320); } }));
$('.sheet-handle').addEventListener('click', () => { document.body.classList.toggle('sheet-min'); setTimeout(() => { S.resize(); layoutFill(); }, 320); });
function setTool(name, on) {
  tools[name] = on ?? !tools[name];
  $(`[data-tool="${name}"]`)?.classList.toggle('on', !!tools[name]);
  if (name === 'xray') { for (const m of [M.pla, ...plaClones]) { m.transparent = tools.xray; m.opacity = tools.xray ? 0.14 : 1; m.depthWrite = !tools.xray; m.needsUpdate = true; } M.plaEdge.opacity = tools.xray ? 0.55 : 0.42; }
  if (name === 'labels') labelsEl.style.display = tools.labels ? '' : 'none';
}
$$('.toolbar button').forEach(b => b.addEventListener('click', () => {
  const n = b.dataset.tool;
  if (n === 'theme') { dark = !dark; store.set('dark', dark); applyTheme(); return; }
  if (n === 'fullscreen') { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.(); return; }
  if (n === 'camera') { userCam = false; camTween = null; return; }
  setTool(n);
}));
window.addEventListener('keydown', e => {
  if (e.target.matches('input, textarea')) return;
  const k = e.key.toLowerCase();
  if (k === ' ') { togglePlay(); e.preventDefault(); } else if (k === 'arrowright') nextStep(); else if (k === 'arrowleft') prevStep();
  else if (k === 'l') setTool('labels'); else if (k === 'x') setTool('xray'); else if (k === 'w') setTool('wires');
  else if (k === 'r') { userCam = false; camTween = null; } else if (k === 'f') $('[data-tool="fullscreen"]').click();
});

// picking + focus
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), canvas = $('#view'), tip = $('#tooltip');
function pick(e) {
  const r = canvas.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
  ray.setFromCamera(ndc, S.camera);
  for (const h of ray.intersectObject(root, true)) {
    let vis = true; for (let q = h.object; q; q = q.parent) if (!q.visible) { vis = false; break; }
    if (!vis) continue;
    const dr = h.object.geometry?.drawRange; if (dr && dr.count !== Infinity && h.faceIndex != null && h.faceIndex * 3 >= dr.count) continue;
    const id = h.object.userData.partId; if (id && id !== 'tmark') return id;
  }
  return null;
}
const wireName = id => { const g = allWires.find(w => w.userData.partId === id); const sp = g.userData.spec, i = +sp.id[4], neg = sp.id.endsWith('N'), isNew = SEL_KEY[selKey].includes(i) && t >= (tl.marks.switch ?? 1e9); return `${sp.cm}cm ${sp.color} wire · ${isNew ? 'new ' : ''}pump motor M${i + 1} ${neg ? 'negative (marked)' : 'positive'} → Motor Shield ${sp.term} (${neg ? 'inner' : 'outer'} hole)`; };
let hoverT = 0;
canvas.addEventListener('pointermove', e => {
  if (e.buttons || performance.now() - hoverT < 60) return; hoverT = performance.now();
  const id = pick(e); canvas.style.cursor = id ? 'pointer' : '';
  if (id) { let label; if (id.startsWith('wire:')) { try { label = /^wire:pump\d[PN]$/.test(id) ? esc(wireName(id)) : esc(allWires.find(w => w.userData.partId === id).name); } catch { label = 'wire'; } } else label = esc(partLabel(id));
    tip.innerHTML = label; tip.style.left = e.clientX + 'px'; tip.style.top = e.clientY + 'px'; tip.style.opacity = 1; }
  else tip.style.opacity = 0;
});
canvas.addEventListener('pointerleave', () => { tip.style.opacity = 0; });
let flashes = {};
function focusPart(id) {
  const o = parts[id]?.obj; if (!o || !o.visible) return;
  o.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(o); if (bb.isEmpty()) return;
  const c = bb.getCenter(new THREE.Vector3()), dist = clamp(bb.getSize(new THREE.Vector3()).length() * 2.4, 90, 700);
  const dir = S.camera.position.clone().sub(S.controls.target).normalize();
  camTween = { p0: S.camera.position.clone(), t0: S.controls.target.clone(), p1: c.clone().addScaledVector(dir, dist), t1: c, s: performance.now(), d: 900 };
  userCam = true; flashes[id] = performance.now();
}

// labels
const labelsEl = $('#labels'); const labelPool = [];
function updateLabels(k) {
  const s = tl.steps[k], list = [];
  if (tools.labels) {
    if (s.labels) for (const L of s.labels) { if (L.part) { const o = parts[L.part]?.obj; if (!o?.visible) continue; o.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(o); list.push([V((bb.min.x + bb.max.x) / 2, bb.max.y + 6, (bb.min.z + bb.max.z) / 2), L.text, L.badge, parts[L.part].kind]); } else list.push([V(...L.at).add(V(0, 4, 0)), L.text, L.badge, 'electronic']); }
    else { const seen = new Set(); for (const id of s.adds || []) { const p = parts[id]; if (!p || !p.obj.visible || p.kind === 'virtual' || id.startsWith('prep:')) continue; const key = partLabel(id); if (seen.has(key)) continue; seen.add(key); p.obj.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(p.obj); list.push([V((bb.min.x + bb.max.x) / 2, bb.max.y + 6, (bb.min.z + bb.max.z) / 2), key, false, p.kind]); if (list.length >= 6) break; } }
  }
  const W = labelsEl.clientWidth, H = labelsEl.clientHeight;
  while (labelPool.length < list.length) { const d = document.createElement('div'); d.className = 'lbl'; d.innerHTML = '<i></i><span></span>'; labelsEl.appendChild(d); labelPool.push(d); }
  const placed = [];
  labelPool.forEach((d, i) => {
    if (i >= list.length) { d.style.opacity = 0; return; }
    const [p, text, badge, kind] = list[i]; const v = p.clone().project(S.camera);
    if (v.z > 1) { d.style.opacity = 0; return; }
    const x = (v.x + 1) / 2 * W; let y = (1 - v.y) / 2 * H - 16; const w = text.length * 6.6 + 30, h = 25;
    for (let pass = 0; pass < 6; pass++) { let hit = false; for (const r of placed) if (Math.abs(r.x - x) < (r.w + w) / 2 && Math.abs(r.y - y) < h) { y = r.y - h; hit = true; } if (!hit) break; }
    placed.push({ x, y, w });
    d.classList.toggle('badge', !!badge); d.querySelector('span').textContent = text; d.style.opacity = 1;
    d.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
    d.querySelector('i').style.background = KIND_COL[kind] || 'var(--accent)';
  });
}

// ------------------------------------------------------------------ LCD (firmware strings, easyEVOTypeD.ino), pumps running, calibration
const lcd = parts.lcd.obj.userData;
const MENU = ['TURBIDOSTAT', 'INCUBATE', 'PRIME PUMPS', 'HEATER TEST', 'CALIBRATE STIRRING', 'CALIBRATE OPTICS', 'CALIBRATE PUMP 1', 'CALIBRATE PUMP 2', 'CALIBRATE PUMP 3', 'CALIBRATE PUMP 4'];
const menuLines = i => ['EasyEVO Type D', '>' + MENU[i], '', ''];
const primeLines = n => ['UP or DOWN to pump', 'SEL for next pump', 'Hold SEL to Exit', 'Current Pump:' + n];
const calLines = (p, extra = '') => ['CALIBRATE PUMP ' + (p + 1), 'Motor Speed:' + CONFIG_SPEED[p], extra, ''];
// PRIME PUMPS: SELECT steps to the next pump (0.5s per press), DOWN runs it for 1 second
function jogPlan(sel) { const out = []; let cur = 0, at = 1.2; for (const i of sel) { while (cur !== i) { cur = (cur + 1) % 4; at += 0.5; out.push({ at, cur, run: false }); } at += 0.7; out.push({ at, cur, run: true }); at += 1.0; out.push({ at, cur, run: false }); at += 0.6; } return out; }
const slugMat = new THREE.MeshStandardMaterial({ color: '#cfe6ff', emissive: '#7fb8ff', emissiveIntensity: 0.25, roughness: 0.2 });
const slugs = []; for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(2.2, 12, 8), slugMat); m.visible = false; root.add(m); slugs.push(m); }
let lastLcd = '';
function setLcd(lines, on) { const key = on + lines.join('|'); if (key === lastLcd) return; lastLcd = key; lcd.setText(lines, on); }
function effects(k, local) {
  const s = tl.steps[k], fx = s.fx || {}, T = s.fxT || {}, sel = SEL_KEY[selKey];
  let lines = ['', '', '', ''], on = false, run = -1, disp = -1, dispU = 0;
  if (fx.lcd === 'menu') { on = !(T.lcdOff != null && local >= T.lcdOff); lines = menuLines(0); }
  else if (fx.lcd === 'boot') { const u = local - (T.lcdOn ?? 1e9); if (u >= 0) { on = true; lines = u < 2.2 ? menuLines(Math.min(2, Math.floor(u / 0.6))) : primeLines(1); } }
  else if (fx.lcd === 'prime') { on = true; const plan = jogPlan(sel); let cur = 0; for (const e of plan) if (local >= e.at) { cur = e.cur; run = e.run ? e.cur : -1; } lines = primeLines(cur + 1); }
  else if (fx.lcd === 'cal') {
    // prime in PRIME PUMPS (Function Testing 5), then hold SELECT, scroll to CALIBRATE PUMP n, SELECT to open it, SELECT to dispense 10 times
    on = true; const p = fx.pump, c = calTimes(p, fx.from), u0 = local - (T.calStart ?? 1e9), u1 = local - (T.menu ?? 1e9);
    disp = p;
    if (u0 < 0) lines = primeLines(fx.from + 1);
    else if (u1 < 0) { const cur = (fx.from + Math.min(c.presses, Math.floor(u0 / 0.5))) % 4; lines = primeLines(cur + 1); if (u0 >= c.runAt && u0 < c.runEnd) run = p; }
    else if (u1 < 0.35) lines = primeLines((p + 1) % 4 + 1);
    else if (u1 < 1.0) lines = menuLines(2);
    else if (u1 < c.openAt) lines = menuLines(2 + Math.min(4 + p, Math.floor((u1 - 1.0) / 0.5)));
    else if (u1 < c.dispAt) lines = calLines(p);
    else if (u1 < c.dispAt + 10) { const d = u1 - c.dispAt, n = Math.floor(d); lines = n === 0 ? calLines(p) : ['', '', 'Dispensations: ' + n, '']; run = p; dispU = d / 10; }
    else { lines = calLines(p, 'Dispensations: 10'); dispU = 1; }
  }
  else if (fx.lcd === 'save') { on = true; lines = local < 3 ? calLines(fx.pump, 'Dispensations: 10') : menuLines(6 + fx.pump); disp = fx.pump; dispU = 1; }
  setLcd(on ? lines : ['', '', '', ''], on && parts.lcd.obj.visible);
  // a running pump shakes on its mount
  if (run >= 0) { const o = parts[(sel.includes(run) ? 'newPump' : 'pump') + run].obj; if (o.visible) o.matrix.elements[12] += Math.sin(performance.now() * 0.09) * 0.22; }
  // calibration: water through the set-up (and into the 15mL conical tube once it is in place)
  let si = 0;
  if (disp >= 0) {
    const ids = rigIds(disp); rigLiquid[disp].visible = dispU > 0.02 && parts[ids.conical].obj.visible; rigLiquid[disp].scale.y = Math.max(0.02, dispU);
    if (run >= 0) for (const id of [ids.tin, ids.tout]) { const tube = parts[id].obj; if (!tube.visible) continue; const c = tube.userData.curve;
      for (let j = 0; j < 5 && si < slugs.length; j++) { const uu = (local * 0.18 + j / 5) % 1; slugs[si].position.copy(c.getPointAt(id === ids.tin ? 1 - uu : uu)).applyMatrix4(tube.matrix); slugs[si].visible = true; si++; } }
  }
  for (let p = 0; p < 4; p++) if (p !== disp) rigLiquid[p].visible = false;
  for (; si < slugs.length; si++) slugs[si].visible = false;
}

// ------------------------------------------------------------------ main loop
tl = compile();
buildSelector(); buildStepList(); buildTimeline();
{ const k = Math.max(0, tl.steps.findIndex(s => s.id === (location.hash || '').slice(1))); setTime(tl.steps[k].t0 + (k ? tl.steps[k].dur - 0.06 : 0.001)); }
window.addEventListener('hashchange', () => { const k = tl.steps.findIndex(s => s.id === location.hash.slice(1)); if (k >= 0 && k !== tl.stepAt(t)) { goStep(k, false); setTime(tl.steps[k].t0 + (k ? tl.steps[k].dur - 0.06 : 0.001)); } });
const clock = new THREE.Clock(), head = $('#tlHead');
S.renderer.shadowMap.autoUpdate = false; let lastVis = -1, shadowKick = 3;
// camera: eases from the previous step's last view (its cam2 if it had one), then to this step's cam2 late in the step
function camFor(k) {
  const s = tl.steps[k], prev = tl.steps[k - 1], local = t - s.t0;
  let a = cameraAt(tl, t);
  if (prev?.cam2 && local < 1.6) {
    const u = clamp(local / 1.6, 0, 1), e = u * u * (3 - 2 * u), A = tl.views[prev.cam2], Bv = tl.views[s.cam || 'hero'];
    a = { pos: V(...A[0]).lerp(V(...Bv[0]), e), tgt: V(...A[1]).lerp(V(...Bv[1]), e), k };
  }
  if (!s.cam2) return a;
  const at = s.dur * 0.55; if (local < at) return a;
  const v = tl.views[s.cam2], u = clamp((local - at) / 1.6, 0, 1), e = u * u * (3 - 2 * u);
  return { pos: a.pos.clone().lerp(V(...v[0]), e), tgt: a.tgt.clone().lerp(V(...v[1]), e), k };
}
const _q = new THREE.Quaternion();
function frameBody(rawDt, noRender = false) {
  const dt = Math.min(0.05, rawDt);
  if (playing) { t += dt * speed; if (stopAt != null && t >= stopAt) { t = stopAt; playing = false; stopAt = null; syncPlay(); } if (t >= tl.total) { t = tl.total; playing = false; syncPlay(); } }
  const k = tl.stepAt(t), s = tl.steps[k];
  if (k !== lastStep) { renderCard(k); lastStep = k; if (!scrubbing) userCam = false; camTween = null; }
  for (const g of allWires) { const u = g.userData; g.visible = Math.round(u.f * u.tubular) > 0; }   // re-shown each frame; applyTimeline hides wires whose part is hidden
  let rebuilt = false;
  for (const x of tl.wires) if (x.braided) { const on = x.braided(), was = x.w.userData.tw; x.w.userData.setTwist(on); x.w.userData.setMark(on); if (x.w.userData.tw !== was) rebuilt = true; }
  if (updateAside()) rebuilt = true;
  if (updateRig()) rebuilt = true;
  const res = applyTimeline(tl, t, { hideWires: !tools.wires }), glow = res.glow;
  for (const g of PW) { const b = g.userData.band, coil = g.children[1]; if (!b || !b.visible || !coil.visible) continue; const path = coil.geometry.parameters?.path; if (!path) continue;
    const u = clamp(1 - 12 / path.getLength(), 0, 1); b.position.copy(path.getPointAt(u)); b.quaternion.copy(_q.setFromUnitVectors(UP, path.getTangentAt(u))); }
  if (res.moving || rebuilt || res.vis !== lastVis || shadowKick > 0) { S.renderer.shadowMap.needsUpdate = true; shadowKick = Math.max(0, shadowKick - 1); }
  lastVis = res.vis;
  effects(k, t - s.t0);
  const now = performance.now();
  for (const id in flashes) { const a = (now - flashes[id]) / 1400; if (a > 1) delete flashes[id]; else glow[id] = Math.max(glow[id] || 0, Math.sin(a * Math.PI * 3) * 0.5 + 0.5); }
  const next = new Set(Object.keys(glow).filter(id => glow[id] > 0.01 && parts[id].obj.visible && parts[id].kind !== 'virtual' && parts[id].kind !== 'tool'));
  for (const id of glowing) if (!next.has(id)) setGlow(id, 0);
  for (const id of next) setGlow(id, glow[id]);
  glowing = next;
  if (camTween) { const u = clamp((now - camTween.s) / camTween.d, 0, 1), e = u * u * (3 - 2 * u); S.camera.position.lerpVectors(camTween.p0, camTween.p1, e); S.controls.target.lerpVectors(camTween.t0, camTween.t1, e); if (u >= 1) camTween = null; }
  else if (!userCam) { const cam = camFor(k); if (tools.rotate) orbitAng += dt * 0.12; else orbitAng *= 0.96; const off = cam.pos.clone().sub(cam.tgt).applyAxisAngle(V(0, 1, 0), orbitAng); S.camera.position.copy(cam.tgt).add(off); S.controls.target.copy(cam.tgt); }
  else if (tools.rotate) { const off = S.camera.position.clone().sub(S.controls.target).applyAxisAngle(V(0, 1, 0), dt * 0.12); S.camera.position.copy(S.controls.target).add(off); }
  S.controls.update();
  updateLabels(k);
  const pct = t / tl.total * 100; head.style.left = pct + '%'; fill.style.width = pct + '%';
  $('#tpTime').textContent = `${fmtTime(t)} / ${fmtTime(tl.total)}`;
  if (!noRender) S.renderer.render(S.scene, S.camera);
}
function frame() { frameBody(clock.getDelta()); requestAnimationFrame(frame); }
ldFill.style.width = '100%';
frameBody(0.016);
setTimeout(() => { $('#loader').classList.add('done'); document.body.classList.add('ready'); }, 120);
requestAnimationFrame(frame);

// dev helpers: render the 3D view and post it to the local dev server (tools/devserver.py)
async function capture(name, w = 1600, h = 1000) {
  const r = S.renderer, c = r.domElement, pr = r.getPixelRatio();
  r.setPixelRatio(1); r.setSize(w, h, false); S.camera.aspect = w / h; S.camera.updateProjectionMatrix(); S.renderer.shadowMap.needsUpdate = true;
  const bg = S.scene.background; S.scene.background = new THREE.Color(dark ? '#10151d' : '#e9ecf1');
  r.render(S.scene, S.camera); const url = c.toDataURL('image/png'); S.scene.background = bg;
  r.setPixelRatio(pr); S.resize();
  await fetch('/__save/' + name, { method: 'POST', body: url }); return url.length;
}
async function shot(name, time, opts = {}) {
  setTime(time); playing = false; userCam = !!opts.cam; if (opts.cam) { S.camera.position.set(...opts.cam[0]); S.controls.target.set(...opts.cam[1]); }
  for (let i = 0; i < (opts.n || 40); i++) frameBody(0.02, true);
  if (opts.cam) { S.camera.position.set(...opts.cam[0]); S.controls.target.set(...opts.cam[1]); S.camera.lookAt(...opts.cam[1]); }
  return capture(name, opts.w || 1600, opts.h || 1000);
}
function scan(step = 0.25) { const errs = []; const t0 = t; for (let x = 0; x <= tl.total; x += step) { try { setTime(x); frameBody(step, true); } catch (e) { errs.push([x.toFixed(1), tl.steps[tl.stepAt(x)].id, String(e), e.stack?.split('\n')[1]]); if (errs.length > 5) break; } } setTime(t0); return errs; }
window.pumps = { scan, shot, capture, parts, wires: allWires, get tl() { return tl; }, setTime: x => setTime(x), goStep, setSel, frameBody, get t() { return t; } };
