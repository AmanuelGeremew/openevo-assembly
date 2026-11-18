// The base materials: every Bill of Materials item (plus the printed modules once printed and the wires
// once prepared) laid out on the table before the build starts. Parts leave this layout at the step of
// the manual that first uses them; made parts (thermistor units, cast cap, cut tubing) come from the
// raw materials shown here.
import * as THREE from 'three';
import * as B from './builders.js';

// raw materials that are not otherwise modelled as parts of the robot (names are Bill of Materials rows)
export function buildBaseMaterials() {
  const out = {};
  const reg = (id, obj, bom, kind = 'material') => { obj.userData.partId = id; obj.traverse(o => o.userData.partId = id); obj.updateMatrixWorld(true); out[id] = { id, obj, name: obj.name, kind, frame: null, bom }; };
  reg('kitPLA', B.plaSpool(), 'Matte Black PLA Filament');
  reg('kitWire1', B.wireKitBox(['black', 'red', 'orange', 'yellow', 'green', 'blue'], '22AWG Silicone Wire Kit Box 1'), '22AWG Silicone Wire Kit Box 1');
  reg('kitWire2', B.wireKitBox(['white', 'brown', 'purple', 'pink', 'gray', 'black'], '22AWG Silicone Wire Kit Box 2'), '22AWG Silicone Wire Kit Box 2');
  reg('kitSealant', B.sealantTube(), 'Black High Temp Silicone Sealant');
  reg('kitTape', B.tapeRoll(), 'Double Sided Tape Heavy Duty');
  reg('kitSolder', B.solderSpool(), 'Lead-Free Solder');
  reg('kitFlux', B.fluxPen(), 'Smooth Flow Flux');
  reg('kitResin', B.resinKit(), 'Hard Silicone Rubber Casting Resin');
  reg('kitHdrF', B.headerStrip('female'), 'Female Pin Header Kit');
  reg('kitHdrM', B.headerStrip('male'), 'Male Pin Header Strips');
  reg('kitHdrRA', B.headerStrip('ra'), 'Male Pin Header Right Angle Strips');
  reg('kitPins', B.pinBag(), 'Pin Connector');
  reg('kitPSU', B.powerSupply(), '12v 5A Power Supply');
  reg('kitTubing', B.tubingCoil(), 'Silicone Tubing 1/8" ID x 1/4" OD');
  reg('kitFoil', B.foilRoll(), null, 'labware');
  reg('kitMedia', B.mediaBottle(), null, 'labware');
  reg('kitLuerM', B.luerPile('male'), 'Luer Lock Male to Barb 1/8" Cat# 51525K143');
  reg('kitLuerF', B.luerPile('female'), 'Luer Lock Female to Barb 1/8" Cat# 51525K293');
  reg('kitNeedle10G', B.needlePack(), '10 Pack - Dispensing Needle 10G x 5" - Blunt Tip, Luer Lock, All Metal (Stainless Steel)');
  reg('kitJumpers', B.jumperCaps(), '2.54mm Jumper Caps');
  reg('kitClearTape', B.clearTapeRoll(), null, 'labware');
  reg('kitBleach', B.bleachBottle(), null, 'labware');
  reg('kitAutoclaveTape', B.autoclaveTapeRoll(), null, 'labware');
  return out;
}

const D2R = Math.PI / 180;
const FLAT = [[0, 0, 0], [90, 0, 0], [-90, 0, 0], [0, 0, 90], [0, 0, -90], [-45, 0, 0], [135, 0, 0], [180, 0, 0]];
// table regions (world mm); the robot is built at the origin and sub-assemblies on the bench at +x
export const KIT_REGIONS = {
  printed: { x0: -930, x1: -330, z0: -1380, z1: -340 },
  electronics: { x0: -300, x1: 330, z0: -1380, z1: -340 },
  materials: { x0: 360, x1: 980, z0: -1380, z1: -340 },
  wires: { x0: -930, x1: -430, z0: -250, z1: 800 },
};

function ownBox(obj) {
  const bb = new THREE.Box3(); obj.updateMatrixWorld(true);
  obj.traverse(m => { if (m.isMesh && m.geometry) { m.geometry.computeBoundingBox(); if (!m.geometry.boundingBox.isEmpty()) bb.union(m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld)); } });
  return bb;
}
function footprint(bb, R) {
  const c = bb.getCenter(new THREE.Vector3()), out = new THREE.Box3();
  for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) out.expandByPoint(new THREE.Vector3(x, y, z).sub(c).applyMatrix4(R));
  return out.getSize(new THREE.Vector3());
}
const rotM = r => new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...r.map(v => v * D2R)));

// groups of part ids in the order they are laid out
export function kitGroups(parts) {
  const has = id => !!parts[id];
  const pick = (...ids) => ids.flat().filter(has);
  const seq = (pfx, n) => Array.from({ length: n }, (_, i) => pfx + i);
  const printed = Object.keys(parts).filter(id => parts[id].kind === 'printed');
  const electronics = pick('mega', 'shield', 'lcd', 'sd', 'sdCard', 'heaterCtl', 'ledCtl', 'mux', 'rtc', 'coin', 'stirCtl', 'tsl', 'converter', 'fan', 'heater',
    seq('pump', 4), 'jack', 'rocker', 'btnUp', 'btnSel', 'btnDown', 'odLed', seq('sixLed', 6), 'stirTerm', 'tslHdr',
    'thermNTC', 'needleNTC', 'thermRes', 'needleRes', 'res249');
  const hardware = pick('rodL', 'rodR', Object.keys(parts).filter(id => /^foot/.test(id)), seq('magL', 8), 'magN0', 'magN1', 'magO0', 'magO1', 'magP0', 'magP1', 'magM0', 'magM1', 'fanMag',
    Object.keys(parts).filter(id => /^(so|sc)\d/.test(id)), Object.keys(parts).filter(id => /^bs_/.test(id)), seq('moldNeedle', 6), 'thermoNeedle', seq('needle', 5), 'calNeedle');
  const materials = pick('kitPLA', 'kitWire1', 'kitWire2', 'kitSolder', 'kitFlux', 'kitSealant', 'kitTape', 'kitResin', 'kitHdrF', 'kitHdrM', 'kitHdrRA', 'kitPins', 'kitPSU', 'kitTubing', 'kitLuerM', 'kitLuerF', 'kitNeedle10G', 'kitJumpers', 'kitClearTape',
    seq('btLuer', 4), 'filter', seq('ncap', 5), 'vial', 'stirBar', 'calBeaker', 'calConical', 'tube50', 'iceBeaker', 'conBleach', 'conWater', 'kitMedia', 'kitFoil', 'kitBleach', 'kitAutoclaveTape');
  const wires = Object.keys(parts).filter(id => id.startsWith('prep:') && id !== 'prep:btnBridge');   // the Wire List; the step 4 bridge is cut at its step
  return { printed, electronics, hardware, materials, wires };
}
// parts that sit on another part in the box (nuts on their buttons, jumper caps on the Heater Controller Board)
const RIDES = { btnUpNut: 'btnUp', btnSelNut: 'btnSel', btnDownNut: 'btnDown', btnUpWasher: 'btnUp', btnSelWasher: 'btnSel', btnDownWasher: 'btnDown', jumperENA: 'heaterCtl', jumperENB: 'heaterCtl' };
const UPRIGHT = /^(kitBleach|kitAutoclaveTape|kitLuer.|kitNeedle10G|kitJumpers|kitClearTape|vial|calBeaker|calConical|tube50|iceBeaker|conBleach|conWater|kitMedia|kitPLA|kitWire\d|kitResin|kitFlux|kitTubing|kitPins|kitPSU|kitTape|kitSolder|kitSealant|kitFoil|kitHdr|pump\d|filter|ncap\d|btLuer\d)$/;

// kit poses: { id: { spec, show } } — show:false for things that only join the layout later (printed modules after printing, prepared wires)
export function kitPlan(parts, bedM = {}) {
  const groups = kitGroups(parts), plan = {};
  const place = (ids, region, opts = {}) => {
    const gap = opts.gap ?? 14;
    const items = ids.map(id => {
      const bb = ownBox(parts[id].obj);
      let r = opts.rot ? opts.rot(id) : null, R, q = null;
      if (!r && bedM[id]) { const qq = new THREE.Quaternion(); bedM[id].decompose(new THREE.Vector3(), qq, new THREE.Vector3()); q = qq.toArray(); R = new THREE.Matrix4().makeRotationFromQuaternion(qq); }
      else if (!r && !UPRIGHT.test(id)) { let best = null; for (const c of FLAT) { const s = footprint(bb, rotM(c)); if (!best || s.y < best.h - 0.6) best = { c, h: s.y }; } r = best.c; }
      r = r || [0, 0, 0]; R = R || rotM(r);
      const s = footprint(bb, R);
      return { id, r, q, w: s.x, d: s.z };
    });
    let x = region.x0, z = region.z0, rowD = 0;
    for (const it of items) {
      if (x + it.w > region.x1 && x > region.x0) { x = region.x0; z += rowD + gap; rowD = 0; }
      const spec = { bench: [x + it.w / 2, z + it.d / 2] }; if (it.q) spec.q = it.q; else spec.r = it.r;
      plan[it.id] = { spec, show: opts.show !== false };
      x += it.w + gap; rowD = Math.max(rowD, it.d);
    }
    if (z + rowD > region.z1) console.warn('kit region overflow', region, z + rowD);
  };
  place(groups.printed.sort((a, b) => ownBox(parts[b].obj).getSize(new THREE.Vector3()).length() - ownBox(parts[a].obj).getSize(new THREE.Vector3()).length()), KIT_REGIONS.printed, { show: false, gap: 16 });
  place([...groups.electronics, ...groups.hardware], KIT_REGIONS.electronics, { gap: 12, rot: id => /^rod/.test(id) ? [0, 90, 0] : /needle|^needle/i.test(id) ? [0, 0, 90] : null });
  place(groups.materials, KIT_REGIONS.materials, { gap: 18 });
  place(groups.wires, KIT_REGIONS.wires, { show: false, gap: 2.2, rot: () => [0, 90, 0] });
  for (const [id, host] of Object.entries(RIDES)) if (parts[id] && parts[host]) plan[id] = { spec: { on: host }, show: true };
  return plan;
}
