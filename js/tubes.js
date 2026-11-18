// Silicone tubing (1/8" ID x 1/4" OD), luer fittings and media/waste bottles.
import * as THREE from 'three';
import { M } from './materials.js';
import * as B from './builders.js';
import { pinWorld, TX, TZ } from './assembly.js';

const v = (x, y, z) => new THREE.Vector3(x, y, z);

function tube(points, r = 3.175, withLuerAtEnd = true) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5);
  const len = curve.getLength();
  const tubular = Math.max(16, Math.round(len / 3.5)), radial = 9;
  const geo = new THREE.TubeGeometry(curve, tubular, r, radial, false);
  const mesh = new THREE.Mesh(geo, M.tubing); mesh.renderOrder = 4;
  const g = new THREE.Group(); g.add(mesh); g.name = 'Silicone tubing';
  const ends = [];
  if (withLuerAtEnd) {
    const l = B.luerBarb(); const p = curve.getPointAt(1), t = curve.getTangentAt(1);
    l.position.copy(p).addScaledVector(t, -6); l.quaternion.setFromUnitVectors(v(0, 1, 0), t.clone().negate()); g.add(l); ends.push(l);
  }
  g.userData = { curve, len };
  g.userData.setGrow = f => {
    f = Math.max(0, Math.min(1, f)); const k = Math.round(f * tubular);
    geo.setDrawRange(0, k * radial * 6); g.visible = k > 0; ends.forEach(e => e.visible = f > 0.97);
  };
  return g;
}

function bottle(liquidMat, label) {
  const g = new THREE.Group(); g.name = label;
  const R = 28, H = 112;
  const prof = [new THREE.Vector2(0, 0), new THREE.Vector2(R - 4, 0), new THREE.Vector2(R, 4), new THREE.Vector2(R, H - 22), new THREE.Vector2(15, H - 6), new THREE.Vector2(15, H),
    new THREE.Vector2(13.5, H), new THREE.Vector2(13.5, H - 6), new THREE.Vector2(R - 1.5, H - 22), new THREE.Vector2(R - 1.5, 5), new THREE.Vector2(0, 1.5)];
  const glass = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), M.glass); glass.renderOrder = 3; g.add(glass);
  if (liquidMat) { const l = B.liquid(R - 2, 70, liquidMat); l.position.y = 36.5; g.add(l); }
  const top = B.siliconeCap(M.silBlue); top.scale.set(0.95, 0.5, 0.95); top.position.y = H + 0.5; g.add(top);
  [-5, 5].forEach(x => { const lb = B.luerBarb(); lb.position.set(x, H + 11, 0); g.add(lb); });
  g.userData.top = v(0, H + 28, 0);
  return B.shadow(g);
}

export function buildTubes(parts) {
  const out = {};
  const reg = (id, obj, name, kind = 'labware', extra = {}) => { obj.userData.partId = id; obj.traverse(o => o.userData.partId = id); out[id] = { id, obj, name, kind, ...extra }; };
  // short calibration tubes on every pump nozzle (testing step 1)
  const pumpTop = {};
  for (let i = 0; i < 4; i++) for (const side of ['in', 'out']) {
    const p = pinWorld(parts, 'pump' + i, side);
    const t = tube([p, p.clone().add(v(0, 0, 7)), p.clone().add(v(0, 9, 15)), p.clone().add(v(side === 'in' ? -1 : 1, 31, 18))]);
    reg(`pumpTube${i}${side}`, t, `60 mm tube · pump ${['NEU', 'WST', 'POS', 'NEG'][i]} ${side}`, 'labware', { bom: 'Silicone Tubing 1/8" ID x 1/4" OD' });
    pumpTop[i + side] = t.userData.curve.getPointAt(1).clone().add(v(0, 14, 0));
  }
  // 6 cm tubes on each cap needle (testing step 13)
  const needleTop = {};
  for (let i = 0; i < 5; i++) {
    const n = parts['needle' + i].obj;
    const hub = n.position.clone().add(v(0, 50.8 + 11.6, 0));
    const dir = v(n.position.x - TX, 0, n.position.z - TZ).normalize();
    const pts = i === 4 ? [hub, hub.clone().add(v(0, 14, 0)), hub.clone().add(v(0, 34, 0))]
      : [hub, hub.clone().add(v(0, 12, 0)), hub.clone().add(dir.clone().multiplyScalar(9)).add(v(0, 32, 0)), hub.clone().add(dir.clone().multiplyScalar(16)).add(v(0, 48, 0))];
    const t = tube(pts, 3.175, i !== 4);
    reg('ntube' + i, t, '6 cm needle tube', 'labware', { bom: 'Silicone Tubing 1/8" ID x 1/4" OD' });
    needleTop[i] = t.userData.curve.getPointAt(1).clone().add(v(0, i === 4 ? 0 : 14, 0));
  }
  // vent filter sits on the 5th needle's tube
  parts.filter.obj.position.copy(needleTop[4]).add(v(0, 2, 0));
  // bottles
  const mk = (id, mat, name, x, z) => { const b = bottle(mat, name); b.position.set(x, 0, z); b.updateMatrixWorld(true); B.optimizePart(b); reg(id, b, name, 'labware', { bom: 'Hard Silicone Rubber Casting Resin' }); return b; };
  const posMat = M.media.clone(); posMat.color.set('#cfe9b0'); posMat.attenuationColor.set('#9fd36a');
  const negMat = M.media.clone(); negMat.color.set('#f5c6d6'); negMat.attenuationColor.set('#e98aa9');
  const bPos = mk('mediaPOS', posMat, 'Positive-selection media bottle', -140, -240);
  const bNeg = mk('mediaNEG', negMat, 'Negative-selection media bottle', -140, -168);
  const bWaste = mk('wasteBottle', null, 'Waste bottle', 135, -205);
  const top = b => b.position.clone().add(b.userData.top);
  const housingTop = v(-240, 236, -150);
  // long run lines
  const arc = (a, b, lift, side = 0) => {
    const m = a.clone().lerp(b, 0.5); m.y = Math.max(a.y, b.y) + lift; m.x += side;
    return [a, a.clone().add(v(0, 22, 0)), a.clone().lerp(m, 0.6).setY(m.y - 8), m, b.clone().lerp(m, 0.6).setY(m.y - 8), b.clone().add(v(0, 26, 0)), b];
  };
  const lines = [
    ['line0', arc(pumpTop['0out'], needleTop[0], 18, -20), 'Neutral media line (pump NEU → reactor)'],
    ['line1', arc(needleTop[1], pumpTop['1in'], 24, -30), 'Waste line (reactor → pump WST)'],
    ['line2', arc(pumpTop['2out'], needleTop[2], 20, 20), 'Positive-selection line (pump POS → reactor)'],
    ['line3', arc(pumpTop['3out'], needleTop[3], 28, 30), 'Negative-selection line (pump NEG → reactor)'],
    ['line4', arc(housingTop, pumpTop['0in'], 12, 30), 'Neutral media feed (light-tight bottle → pump)'],
    ['line5', arc(top(bPos), pumpTop['2in'], 40, 0), 'Positive media feed (bottle → pump POS)'],
    ['line6', arc(top(bNeg), pumpTop['3in'], 55, 0), 'Negative media feed (bottle → pump NEG)'],
    ['line7', arc(pumpTop['1out'], top(bWaste), 30, -10), 'Waste out (pump WST → waste bottle)'],
  ];
  lines.forEach(([id, pts, name]) => { const t = tube(pts, 3.175, false); reg(id, t, name, 'labware', { bom: 'Silicone Tubing 1/8" ID x 1/4" OD', line: true }); });
  return out;
}
