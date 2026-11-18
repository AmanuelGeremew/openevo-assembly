// Compiles the step list into per-part pose segments and evaluates the whole scene at time t.
//
// Every part rests in a "state" { frame, M }: M is its pose expressed as if its frame (the part it is
// built onto) sat at its own assembled pose. World pose = W(frame, t) * inv(Wfinal(frame)) * M, so a
// sub-assembly (buttons in Module B, the converter with its headers, everything on the robot when it is
// flipped) moves as one rigid piece. Wires follow the part they start from the same way.
import * as THREE from 'three';

const ease = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
const easeOut = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const D2R = Math.PI / 180;
const DUR = { in: 1.15, move: 1.7, out: 0.9, robot: 2.2, grow: 1.9, show: 0.5 };

export function compileTimeline({ steps, parts, wires, views, frames = {} }) {
  const ids = Object.keys(parts);
  const match = pat => {
    if (Array.isArray(pat)) return pat.flatMap(match);
    if (pat.endsWith('*')) return ids.filter(id => id.startsWith(pat.slice(0, -1)));
    return parts[pat] ? [pat] : [];
  };
  const P = {};
  for (const id of ids) {
    const o = parts[id].obj; o.updateMatrix();
    const bb = new THREE.Box3();
    o.traverse(m => { if (m.isMesh && m.geometry) { m.geometry.computeBoundingBox(); if (!m.geometry.boundingBox.isEmpty()) { m.updateMatrixWorld(true); bb.union(m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld)); } } });
    P[id] = { id, obj: o, finalW: o.matrix.clone(), finalInv: o.matrix.clone().invert(), frame0: id in frames ? frames[id] : parts[id].frame ?? null, bb, segs: [], firstStep: null, cur: null };
    o.matrixAutoUpdate = false;
  }
  const finalState = id => ({ frame: P[id].frame0, M: P[id].finalW });
  // ---- pose resolution
  function resolve(id, spec) {
    if (!spec || spec === 'final') return finalState(id);
    if (spec.frame !== undefined && spec.M) return spec;
    if (spec.off) {              // final pose shifted in its frame's coordinates (pre-mate poses, slide-on waypoints)
      const fr = spec.frame !== undefined ? spec.frame : P[id].frame0;
      return { frame: fr, M: new THREE.Matrix4().makeTranslation(...spec.off).multiply(P[id].finalW) };
    }
    if (spec.shift) return { frame: spec.relTo || null, M: new THREE.Matrix4().makeTranslation(...spec.shift).multiply(P[id].finalW) };
    if (spec.bench) {            // on the bench: rotate the part about its centre (world euler applied to its assembled orientation)
      const R = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...(spec.r || [0, 0, 0]).map(v => v * D2R), spec.order || 'XYZ'));
      const c = P[id].bb.getCenter(new THREE.Vector3());
      const M0 = R.clone().multiply(new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z)).multiply(P[id].finalW);
      const bb = P[id].bb.clone().applyMatrix4(new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z)).applyMatrix4(R);
      const y = spec.y != null ? spec.y : -bb.min.y + (spec.lift || 0);
      return { frame: spec.relTo || null, M: new THREE.Matrix4().makeTranslation(spec.bench[0], y, spec.bench[1]).multiply(M0) };
    }
    if (spec.world) return { frame: null, M: new THREE.Matrix4().compose(new THREE.Vector3(...spec.world), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(spec.r || [0, 0, 0]).map(v => v * D2R))), new THREE.Vector3(1, 1, 1)) };
    if (spec.like) {             // same relative pose another part has to its frame (e.g. ride on a holder)
      return { frame: spec.like, M: P[id].finalW };
    }
    throw new Error('bad pose for ' + id + ': ' + JSON.stringify(spec));
  }
  const W = wires.map(w => ({ w, spec: w.userData.spec, segs: [], follow: w.userData.follow }));
  const wireById = Object.fromEntries(W.map(x => [x.spec.id, x]));
  const out = { steps: [], parts: P, wires: W, total: 0, views };
  let t = 0;
  for (let si = 0; si < steps.length; si++) {
    const st = steps[si];
    const s = { ...st, index: si, t0: t, adds: [] };
    let cursor = t + (st.lead ?? 0.7);
    let end = cursor;
    const touch = id => { if (P[id].firstStep == null) P[id].firstStep = si; if (!s.adds.includes(id)) s.adds.push(id); };
    for (const act of st.do || []) {
      const [kind, pat, a = {}, b = {}] = act;
      const opts = kind === 'move' ? b : a;
      const list = kind === 'robot' || kind === 'wait' || kind === 'wires' ? [] : match(pat);
      const stag = opts.stag ?? (list.length > 1 ? Math.min(0.32, 2.6 / list.length) : 0);
      const start = cursor + (opts.delay || 0);
      let last = start;
      if (kind === 'wait') { last = start + (pat || 1); }
      else if (kind === 'robot') {
        const R = P.robot; const from = R.cur || finalState('robot');
        const to = { frame: null, M: pat };
        const d = opts.dur || DUR.robot;
        R.segs.push({ kind: 'move', t0: start, t1: start + d, from, to, arc: opts.arc ?? 70 }); R.cur = to; last = start + d;
      } else if (kind === 'wires') {
        const ws = (Array.isArray(pat) ? pat : [pat]).map(i => wireById[i]).filter(Boolean);
        ws.forEach((x, i) => { const g = (x.spec.grow || []).find(g => g[0] === st.id); const f1 = g ? g[1] : (opts.f ?? 1); const t0 = start + i * (opts.stag ?? 0.14); x.segs.push({ t0, t1: t0 + DUR.grow, f0: x.cur || 0, f1 }); x.cur = f1; x.done = x.done || new Set(); x.done.add(st.id); last = Math.max(last, t0 + DUR.grow); });
      } else list.forEach((id, i) => {
        const p = P[id], t0 = start + i * stag;
        let d = opts.dur;
        const pick = sp => typeof sp === 'function' ? sp(id, i) : (opts.row && sp === undefined ? { bench: [opts.row[0] + i * (opts.row[2] ?? 8), opts.row[1] + i * (opts.row[3] ?? 0)], r: opts.r } : sp);
        if (kind === 'in') {
          const to = resolve(id, pick(opts.to)); const off = opts.from || (to.frame ? [0, 70, 0] : [0, 80, 0]);
          const from = { frame: to.frame, M: new THREE.Matrix4().makeTranslation(...off).multiply(to.M) };
          d = d || DUR.in;
          p.segs.push({ kind: 'in', t0, t1: t0 + d, from, to, via: (opts.via || []).map(v => resolve(id, v)) }); p.cur = to; touch(id);
        } else if (kind === 'show') {
          const to = resolve(id, pick(opts.to)); d = d || DUR.show;
          p.segs.push({ kind: 'show', t0, t1: t0 + d, from: to, to }); p.cur = to; touch(id);
        } else if (kind === 'move') {
          const from = p.cur || finalState(id); const to = resolve(id, pick(a.to !== undefined ? a.to : a));
          d = d || DUR.move;
          p.segs.push({ kind: 'move', t0, t1: t0 + d, from, to, arc: opts.arc ?? 40, via: (opts.via || []).map(v => resolve(id, v)) }); p.cur = to; touch(id);
        } else if (kind === 'out') {
          const from = p.cur || finalState(id); d = d || DUR.out;
          p.segs.push({ kind: 'out', t0, t1: t0 + d, from, to: from, offW: new THREE.Vector3(...(opts.dir || [0, 110, 0])) }); p.cur = null;
        } else if (kind === 'glow') {
          const cur = p.cur || finalState(id); d = d || 1.2;
          p.segs.push({ kind: 'show', t0, t1: t0 + d, from: cur, to: cur }); touch(id);
        } else if (kind === 'hide') {
          const from = p.cur || finalState(id);
          p.segs.push({ kind: 'out', t0, t1: t0 + 0.01, from, to: from, offW: new THREE.Vector3() }); p.cur = null; d = 0.01;
        } else throw new Error('unknown action ' + kind);
        last = Math.max(last, t0 + d);
      });
      end = Math.max(end, last);
      cursor = opts.parallel ? cursor : (opts.overlap != null ? last - opts.overlap : last + 0.15);
    }
    // wires that reach their next growth stage in this step (and were not placed explicitly)
    const ws = W.filter(x => (x.spec.grow || []).some(g => g[0] === st.id) && !(x.done && x.done.has(st.id)));
    if (ws.length) {
      const w0 = Math.max(cursor, t + 0.8), stag = Math.min(0.16, 3.2 / ws.length);
      ws.forEach((x, i) => { const f1 = x.spec.grow.find(g => g[0] === st.id)[1]; const t0 = w0 + i * stag; x.segs.push({ t0, t1: t0 + DUR.grow, f0: x.cur || 0, f1 }); x.cur = f1; });
      end = Math.max(end, w0 + (ws.length - 1) * stag + DUR.grow);
    }
    s.wires = W.filter(x => (x.spec.grow || []).some(g => g[0] === st.id)).map(x => x.spec.id);
    s.dur = Math.max(st.dur || 0, st.minDur ?? 5.5, end - t + (st.tail ?? 1.6));
    out.steps.push(s);
    t += s.dur;
  }
  out.total = t;
  // a prepared loose wire leaves the bench when its real wire starts to grow
  for (const x of W) {
    const pp = P['prep:' + x.spec.id]; if (!pp || !x.segs.length || !pp.segs.length) continue;
    const g0 = x.segs[0].t0, last = pp.segs[pp.segs.length - 1];
    if (last.kind !== 'out' && pp.segs[0].t0 < g0) pp.segs.push({ kind: 'out', t0: g0, t1: g0 + 0.6, from: last.to, to: last.to, offW: new THREE.Vector3(0, 40, 0) });
  }
  for (const id in P) P[id].segs.sort((a, b) => a.t0 - b.t0);
  out.stepAt = time => { let k = 0; for (let i = 0; i < out.steps.length; i++) if (time >= out.steps[i].t0 - 1e-6) k = i; return k; };
  out.finalState = finalState;
  return out;
}

// ---- evaluation
const _pa = new THREE.Vector3(), _pb = new THREE.Vector3(), _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _sa = new THREE.Vector3(), _sb = new THREE.Vector3();
function makeEval(tl, tt) {
  const cache = new Map();
  function frameDelta(f) {
    if (!f) return null;
    const Wf = worldOf(f); if (!Wf) return null;
    return Wf.clone().multiply(tl.parts[f].finalInv);
  }
  function stateW(s) { const d = frameDelta(s.frame); return d ? d.multiply(s.M) : s.M.clone(); }
  function lerpW(A, B, e, arc, out) {
    A.decompose(_pa, _qa, _sa); B.decompose(_pb, _qb, _sb);
    _pa.lerp(_pb, e); if (arc) _pa.y += Math.sin(Math.PI * e) * arc; _qa.slerp(_qb, e); _sa.lerp(_sb, e);
    return out.compose(_pa, _qa, _sa);
  }
  function pathW(seg, e) {
    const pts = [seg.from, ...(seg.via || []), seg.to].map(stateW);
    if (pts.length === 2) return lerpW(pts[0], pts[1], e, seg.arc, new THREE.Matrix4());
    const pos = pts.map(m => new THREE.Vector3().setFromMatrixPosition(m));
    const L = []; let tot = 0; for (let i = 1; i < pos.length; i++) { const d = pos[i].distanceTo(pos[i - 1]) + 1e-3; L.push(d); tot += d; }
    let u = e * tot, i = 0; while (i < L.length - 1 && u > L[i]) { u -= L[i]; i++; }
    return lerpW(pts[i], pts[i + 1], Math.min(1, u / L[i]), 0, new THREE.Matrix4());
  }
  // returns world matrix or null when hidden
  function worldOf(id) {
    if (cache.has(id)) return cache.get(id);
    cache.set(id, null);      // guard against frame cycles
    const P = tl.parts[id]; const segs = P.segs; let res = null, info = { vis: false, moving: false, glow: 0 };
    let s = null; for (let i = segs.length - 1; i >= 0; i--) if (tt >= segs[i].t0) { s = segs[i]; break; }
    if (!s) {
      // never placed yet: frames that hold other parts fall back to their first state (or the assembled pose)
      res = null;
    } else if (tt >= s.t1) {
      if (s.kind !== 'out') { res = stateW(s.to); info.vis = true; }
    } else {
      const u = (tt - s.t0) / (s.t1 - s.t0);
      info.moving = true;
      if (s.kind === 'out') { res = stateW(s.from); const e = ease(u); res.elements[12] += s.offW.x * e; res.elements[13] += s.offW.y * e; res.elements[14] += s.offW.z * e; info.vis = u < 0.92; }
      else if (s.kind === 'show') { res = stateW(s.to); info.vis = true; }
      else { const e = s.kind === 'move' ? ease(u) : easeOut(u); res = pathW(s, e); info.vis = true; }
    }
    if (s && s.kind !== 'out') { const since = tt - s.t0, dur = s.t1 - s.t0; if (since >= 0 && since < dur + 1.4) info.glow = since < dur ? 1 : Math.max(0, 1 - (since - dur) / 1.4); }
    P.info = info;
    cache.set(id, res);
    return res;
  }
  return { worldOf, frameDelta };
}

// Apply the timeline at time `time`. Returns glow per part and whether anything moves.
export function applyTimeline(tl, time, opts = {}) {
  const intro = opts.introFinal && time < (tl.steps[1] ? tl.steps[1].t0 : 0);
  const tt = intro ? tl.total + 1 : time;
  const ev = makeEval(tl, tt);
  const glow = {}; let moving = false, vis = 0;
  for (const id in tl.parts) {
    const P = tl.parts[id], o = P.obj;
    const Wm = ev.worldOf(id);
    const info = P.info || { vis: false };
    if (!Wm || !info.vis) { o.visible = false; continue; }
    o.visible = true; o.matrix.copy(Wm); o.matrixWorldNeedsUpdate = true;
    if (info.moving) moving = true;
    vis++;
    if (!intro && info.glow > 0.01 && P.segs.length) glow[id] = info.glow;
  }
  for (const x of tl.wires) {
    let f = 0; const segs = x.segs;
    for (let i = segs.length - 1; i >= 0; i--) { const s = segs[i]; if (tt >= s.t0) { if (tt < s.t1) moving = true; f = tt >= s.t1 ? s.f1 : s.f0 + (s.f1 - s.f0) * easeOut((tt - s.t0) / (s.t1 - s.t0)); break; } }
    const g = x.w;
    g.userData.setGrow(opts.hideWires ? 0 : f);
    if (f > 0) {
      const d = ev.frameDelta(x.follow);
      g.matrixAutoUpdate = false; if (d) g.matrix.copy(d); else g.matrix.identity(); g.matrixWorldNeedsUpdate = true;
      vis++;
    }
  }
  return { glow, moving, vis, ev };
}

// Camera pose for time t: eased blend from the previous step's view
export function cameraAt(tl, time) {
  const k = tl.stepAt(time), s = tl.steps[k];
  const view = v => typeof v === 'string' ? tl.views[v] : v;
  const cur = view(s.cam || 'hero');
  const prev = k > 0 ? view(tl.steps[k - 1].cam || 'hero') : cur;
  const u = ease((time - s.t0) / 1.6);
  const pos = new THREE.Vector3().lerpVectors(new THREE.Vector3(...prev[0]), new THREE.Vector3(...cur[0]), u);
  const tgt = new THREE.Vector3().lerpVectors(new THREE.Vector3(...prev[1]), new THREE.Vector3(...cur[1]), u);
  if (u > 0 && u < 1) { const d = pos.clone().sub(tgt); d.multiplyScalar(1 + Math.sin(Math.PI * u) * 0.1); pos.copy(tgt).add(d); }
  return { pos, tgt, k };
}
