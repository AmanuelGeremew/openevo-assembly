// Compiles the STEPS list into per-part keyframes and evaluates the whole scene at time t.
import * as THREE from 'three';

const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
const easeOut = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const FLIGHT = 1.15, CAM = 1.6;

export function compileTimeline({ steps, parts, wires, views, benchPoses, bedPoses, fxDur = {} }) {
  const ids = Object.keys(parts);
  const match = pat => pat.endsWith('*') ? ids.filter(id => id.startsWith(pat.slice(0, -1))) : (parts[pat] ? [pat] : []);
  const P = {};
  for (const id of ids) {
    const o = parts[id].obj;
    P[id] = { id, obj: o, final: { p: o.position.clone(), q: o.quaternion.clone() }, segs: [], firstStep: null };
  }
  const benchPose = id => {
    const b = benchPoses[id]; if (!b) return null;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(b.r[0] * Math.PI / 180, b.r[1] * Math.PI / 180, b.r[2] * Math.PI / 180));
    // keep part's own final orientation composed with the bench rotation
    const qq = q.multiply(P[id].final.q.clone());
    if (id === 'cap') qq.copy(q);   // cap pose is absolute (upside down in the mold)
    return { p: new THREE.Vector3(...b.p), q: qq };
  };
  const current = {};    // id -> current resting pose while compiling
  const W = wires.map(w => ({ w, spec: w.userData.spec, segs: [] }));
  const out = { steps: [], parts: P, wires: W, total: 0, views };
  let t = 0;
  for (let si = 0; si < steps.length; si++) {
    const st = steps[si];
    const s = { ...st, index: si, t0: t };
    const flyOf = id => { for (const k in (st.fly || {})) if (match(k).includes(id)) return new THREE.Vector3(...st.fly[k]); return null; };
    const items = [];
    let cursor = 0.9;
    if (st.special === 'bed') {
      const mods = ids.filter(id => parts[id].kind === 'printed');
      const stag = 3.6 / mods.length;
      mods.forEach((id, i) => {
        const b = bedPoses[id]; const t0 = t + 0.8 + i * stag;
        P[id].segs.push({ type: 'bed', t0, t1: t0 + 0.9, from: { p: b.p.clone().add(new THREE.Vector3(0, 70, 0)), q: b.q }, to: b });
      });
      s.dur = 9.5;
      mods.forEach(id => { const b = bedPoses[id]; P[id].segs.push({ type: 'remove', t0: t + s.dur - 1.0, t1: t + s.dur - 0.05, from: b, to: { p: b.p.clone().add(new THREE.Vector3(0, 30, 0)), q: b.q } }); });
      s.adds = []; out.steps.push(s); t += s.dur; continue;
    }
    (st.remove || []).forEach(pat => match(pat).forEach(id => items.push(['remove', id])));
    (st.move || []).forEach(pat => match(pat).forEach(id => items.push(['move', id])));
    (st.bench || []).forEach(pat => match(pat).forEach(id => items.push(['bench', id])));
    (st.add || []).forEach(pat => match(pat).forEach(id => items.push(['add', id])));
    const n = items.length;
    const stag = n ? Math.min(0.42, 3.4 / n) : 0;
    const adds = [];
    items.forEach(([kind, id], i) => {
      const p = P[id], t0 = t + cursor + i * stag, t1 = t0 + (kind === 'move' ? FLIGHT * 1.35 : FLIGHT);
      if (!p.firstStep && kind !== 'remove') p.firstStep = si;
      if (kind === 'add') {
        const off = flyOf(id) || new THREE.Vector3(0, 110, 0);
        if (p.obj.userData.setGrow) p.segs.push({ type: 'grow', t0, t1: t0 + 1.6, from: p.final, to: p.final });
        else p.segs.push({ type: 'add', t0, t1, from: { p: p.final.p.clone().add(off), q: p.final.q }, to: p.final });
        current[id] = p.final; adds.push(id);
      } else if (kind === 'bench') {
        const b = benchPose(id);
        p.segs.push({ type: 'add', t0, t1, from: { p: b.p.clone().add(new THREE.Vector3(0, 90, 0)), q: b.q }, to: b });
        current[id] = b; adds.push(id);
      } else if (kind === 'move') {
        const from = current[id] || benchPose(id) || p.final;
        p.segs.push({ type: 'move', t0, t1, from, to: p.final, arc: 70 });
        current[id] = p.final; adds.push(id);
      } else if (kind === 'remove') {
        const from = current[id] || p.final;
        p.segs.push({ type: 'remove', t0: t + 0.3 + i * 0.06, t1: t + 1.2 + i * 0.06, from, to: { p: from.p.clone().add(new THREE.Vector3(0, 140, 0)), q: from.q } });
      }
    });
    let end = n ? t + cursor + (n - 1) * stag + FLIGHT * 1.35 : t + cursor;
    // wires: stubs and full growth that belong to this step
    const ws = W.filter(x => x.spec.step === st.id || (x.spec.stub && x.spec.stub[0] === st.id));
    const wstag = ws.length ? Math.min(0.16, 3.0 / ws.length) : 0;
    const w0 = Math.max(end - 0.4, t + 1.0);
    ws.forEach((x, i) => {
      const t0 = w0 + i * wstag;
      const isStub = x.spec.stub && x.spec.stub[0] === st.id;
      const prev = x.segs.length ? x.segs[x.segs.length - 1].f1 : 0;
      x.segs.push({ t0, t1: t0 + (isStub ? 1.0 : 1.9), f0: prev, f1: isStub ? x.spec.stub[1] : 1 });
    });
    if (ws.length) end = Math.max(end, w0 + (ws.length - 1) * wstag + 1.9);
    s.adds = adds; s.wires = ws.map(x => x.spec.id);
    s.dur = Math.max(fxDur[st.id] || 0, 6.2, end - t + 1.8);
    out.steps.push(s);
    t += s.dur;
  }
  out.total = t;
  // each part's segments are already in time order; wire growth segments too.
  out.stepAt = time => { let k = 0; for (let i = 0; i < out.steps.length; i++) if (time >= out.steps[i].t0 - 1e-6) k = i; return k; };
  return out;
}

const _p = new THREE.Vector3(), _q = new THREE.Quaternion();
// Apply the timeline at time t. Returns per-part glow (0..1) for highlight.
export function applyTimeline(tl, time, opts = {}) {
  const introEnd = tl.steps[1] ? tl.steps[1].t0 : 0;
  const tt = time < introEnd ? tl.total + 1 : time;   // intro shows the finished machine
  const glow = {}; let moving = false, vis = 0;
  for (const id in tl.parts) {
    const P = tl.parts[id], o = P.obj, segs = P.segs;
    if (!segs.length) { o.visible = false; continue; }
    let s = null;
    for (let i = segs.length - 1; i >= 0; i--) if (tt >= segs[i].t0) { s = segs[i]; break; }
    if (!s) { o.visible = false; if (o.userData.setGrow) o.userData.setGrow(0); continue; }
    if (s.type === 'grow') {
      o.visible = true; o.position.copy(s.to.p); o.quaternion.copy(s.to.q);
      o.userData.setGrow(easeOut((tt - s.t0) / (s.t1 - s.t0)));
      if (tt < s.t1) moving = true; vis++;
      continue;
    }
    if (tt >= s.t1) {
      if (s.type === 'remove') { o.visible = false; continue; }
      o.visible = true; o.position.copy(s.to.p); o.quaternion.copy(s.to.q);
    } else {
      moving = true;
      const u = (tt - s.t0) / (s.t1 - s.t0);
      const e = s.type === 'move' ? ease(u) : easeOut(u);
      o.visible = !(s.type === 'remove' && u > 0.92);
      _p.lerpVectors(s.from.p, s.to.p, e);
      if (s.arc) _p.y += Math.sin(Math.PI * e) * s.arc;
      o.position.copy(_p);
      o.quaternion.slerpQuaternions(s.from.q, s.to.q, e);
    }
    if (o.userData.setGrow) o.userData.setGrow(1);
    if (o.visible) vis++;
    if (s.type !== 'remove' && s.type !== 'bed' && time >= introEnd) {
      const since = time - s.t0, dur = s.t1 - s.t0;
      if (since >= 0 && since < dur + 1.6) glow[id] = since < dur ? 1 : Math.max(0, 1 - (since - dur) / 1.6);
    }
  }
  for (const x of tl.wires) {
    let f = 0;
    const segs = x.segs;
    for (let i = segs.length - 1; i >= 0; i--) {
      const s = segs[i];
      if (tt >= s.t0) { if (tt < s.t1) moving = true; f = tt >= s.t1 ? s.f1 : s.f0 + (s.f1 - s.f0) * easeOut((tt - s.t0) / (s.t1 - s.t0)); break; }
    }
    x.w.userData.setGrow(opts.hideWires ? 0 : f);
    if (f > 0) vis++;
  }
  return { glow, moving, vis };
}

// Camera pose for time t: eased blend from the previous step's view
export function cameraAt(tl, time) {
  const k = tl.stepAt(time), s = tl.steps[k];
  const view = v => typeof v === 'string' ? tl.views[v] : v;
  const cur = view(s.cam || 'hero');
  const prev = k > 0 ? view(tl.steps[k - 1].cam || 'hero') : cur;
  const u = ease((time - s.t0) / CAM);
  const pos = new THREE.Vector3().lerpVectors(new THREE.Vector3(...prev[0]), new THREE.Vector3(...cur[0]), u);
  const tgt = new THREE.Vector3().lerpVectors(new THREE.Vector3(...prev[1]), new THREE.Vector3(...cur[1]), u);
  // swing out a little mid-transition so the camera arcs rather than cutting through parts
  if (u > 0 && u < 1) { const d = pos.clone().sub(tgt); d.multiplyScalar(1 + Math.sin(Math.PI * u) * 0.12); pos.copy(tgt).add(d); }
  return { pos, tgt, k };
}
