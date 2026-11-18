import * as THREE from 'three';
import { createScene } from './scene.js';
import { buildAssembly, STL, TX, TZ, C_TOP } from './assembly.js';
import { buildWires } from './wires.js';
import { buildTubes } from './tubes.js';
import { STEPS, CHAPTERS, VIEWS, BENCH_POSES } from './steps.js';
import { compileTimeline, applyTimeline, cameraAt } from './timeline.js';
import { DATA } from './data.js';
import { M, WIRE_COLORS } from './materials.js';
import * as B from './builders.js';

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const QS = new URLSearchParams(location.search);
if (QS.get('zoom')) document.documentElement.style.zoom = QS.get('zoom');
function updateLayout() { const f = QS.get('layout'); document.body.classList.toggle('mobile', f ? f === 'mobile' : window.innerWidth <= 820); }
updateLayout(); window.addEventListener('resize', updateLayout);
const store = { get(k, d) { try { const v = localStorage.getItem('openevo.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('openevo.' + k, JSON.stringify(v)); } catch {} } };
const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const chapterOf = id => CHAPTERS.find(c => c.id === id);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// ------------------------------------------------------------------ theme
let dark = store.get('dark', window.matchMedia?.('(prefers-color-scheme: dark)').matches || false);
function applyTheme() { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; S?.setTheme(dark); $('[data-tool="theme"]').classList.toggle('on', dark); setTimeout(() => window.__chartColors?.(), 0); }

// ------------------------------------------------------------------ scene
const S = createScene($('#view'));
applyTheme();
const root = new THREE.Group(); root.name = 'OpenEvo'; S.scene.add(root);
const ldFill = $('#ldFill'), ldText = $('#ldText');

const T0 = performance.now();
const { parts } = await buildAssembly(root, p => { ldFill.style.width = (p * 80).toFixed(0) + '%'; });
const T1 = performance.now();
ldText.textContent = 'Routing 85 wires and tubing…';
await new Promise(r => setTimeout(r, 20));
// tubing + bottles
const tubes = buildTubes(parts);
for (const id in tubes) { root.add(tubes[id].obj); parts[id] = tubes[id]; }
// print bed for the "print the modules" step
const bed = buildPrintBed(parts);
// wires
const wires = buildWires(parts, root);
const T2 = performance.now();
ldFill.style.width = '92%';

// ------------------------------------------------------------------ effects objects
const media = parts.media.obj;
const flatGeo = media.geometry;
const vortexGeo = (() => {
  const r = flatGeo.parameters.radiusTop, h = flatGeo.parameters.height, pts = [new THREE.Vector2(0, -h / 2), new THREE.Vector2(r, -h / 2)];
  for (let i = 0; i <= 16; i++) { const x = r * (1 - i / 16); pts.push(new THREE.Vector2(x, h / 2 - 11 * Math.pow(1 - x / r, 2.2))); }
  return new THREE.LatheGeometry(pts, 48);
})();
const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
function glowSprite(color, size) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })); s.scale.setScalar(size); s.renderOrder = 10; root.add(s); return s; }
const ledGlows = [];
for (let i = 0; i < 6; i++) { const l = parts['sixLed' + i].obj; const p = l.localToWorld(new THREE.Vector3(0, 0, 6)); const s = glowSprite(l.userData.mat.color, 16); s.position.copy(p); ledGlows.push(s); }
const odGlow = glowSprite('#ff3d6e', 14); odGlow.position.copy(parts.odLed.obj.localToWorld(new THREE.Vector3(0, 0, 6)));
const beamMat = new THREE.MeshBasicMaterial({ color: '#ff2d6a', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
const beamFront = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 6, 16, 1, true), beamMat); beamFront.rotation.x = Math.PI / 2; beamFront.position.set(TX, C_TOP + 62, TZ + 23.5);
const beamMatBack = beamMat.clone();
const beamIn = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 41, 16, 1, true), beamMatBack); beamIn.rotation.x = Math.PI / 2; beamIn.position.set(TX, C_TOP + 62, TZ);
root.add(beamFront, beamIn); beamFront.renderOrder = beamIn.renderOrder = 9;
const slugMat = new THREE.MeshStandardMaterial({ color: '#f5d77a', emissive: '#f0c040', emissiveIntensity: 0.35, roughness: 0.3 });
const slugs = [];
for (let i = 0; i < 16; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(2.3, 12, 8), slugMat); m.visible = false; root.add(m); slugs.push(m); }

// ------------------------------------------------------------------ timeline
const FX_DUR = { calPumps: 11, heatTest: 10, optics: 9, vialPrep: 9, run: 26, intro: 9 };
const tl = compileTimeline({ steps: STEPS, parts, wires, views: VIEWS, benchPoses: BENCH_POSES, bedPoses: bed.poses, fxDur: FX_DUR });
// print bed fixture visible only during the print step
{ const ps = tl.steps.find(s => s.id === 'print'); const P = tl.parts.printBed; const f = P.final;
  P.segs = [{ type: 'add', t0: ps.t0 + 0.2, t1: ps.t0 + 1.0, from: { p: f.p.clone().add(new THREE.Vector3(0, -30, 0)), q: f.q }, to: f },
    { type: 'remove', t0: ps.t0 + ps.dur - 0.9, t1: ps.t0 + ps.dur - 0.05, from: f, to: { p: f.p.clone().add(new THREE.Vector3(0, -40, 0)), q: f.q } }]; }
const runStep = tl.steps.find(s => s.id === 'run');
const sim = simulateTurbidostat(runStep.dur);

// part anchors for labels / focus (from the assembled pose)
const anchors = {};
for (const id in parts) {
  const o = parts[id].obj; const bb = new THREE.Box3().setFromObject(o);
  if (bb.isEmpty()) continue;
  const c = bb.getCenter(new THREE.Vector3()), sz = bb.getSize(new THREE.Vector3());
  anchors[id] = { top: new THREE.Vector3(c.x, bb.max.y, c.z).sub(o.position), center: c.clone().sub(o.position), size: sz.length() };
}
// exploded-view offsets
const EXP_C = new THREE.Vector3(0, 30, -40);
const explodeOff = {};
for (const id in parts) {
  const a = anchors[id]; if (!a) continue;
  const c = a.center.clone().add(parts[id].obj.position);
  if (parts[id].kind === 'labware' && !/^(vial|media|stirBar|cap)$/.test(id)) continue;
  if (/^(mod[HIJKTUVWXYZRS]|printBed)$/.test(id)) continue;
  const d = c.clone().sub(EXP_C); d.y *= 0.4;
  const off = d.multiplyScalar(0.55);
  if (/^(modL|mod[MNOP]|mag[MNOP]|tsl|odLed|sixLed)/.test(id)) off.y += 45;
  if (/^(modQ)/.test(id)) off.y += 90;
  if (/^(vial|media|stirBar)/.test(id)) off.y += 150;
  if (/^(cap|needle|thermoNeedle|filter)/.test(id)) off.y += 210;
  if (['mega', 'heaterCtl', 'mux', 'stirCtl', 'ledCtl', 'rtc', 'converter'].includes(id) || id.startsWith('bus')) off.y += 50;
  if (id === 'shield') off.y += 95;
  if (/^modF|^foot/.test(id)) off.y -= 25;
  explodeOff[id] = off;
}

// ------------------------------------------------------------------ highlight (emissive glow)
const ACCENT = new THREE.Color('#19c6b3');
const hiCache = new Map(); const plaClones = [];
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
// cut-away: ghost the reactor tower so the vial, stir bar and IR beam are visible in the test steps
const GHOST_IDS = ['modD', 'modL', 'modQ', 'modM', 'modN', 'modO', 'modP'];
const ghostMat = M.pla.clone(); ghostMat.transparent = true; ghostMat.depthWrite = false; ghostMat.opacity = 0.2;
let ghostAmt = 0;
function applyGhost(target, dt) {
  ghostAmt += (target - ghostAmt) * Math.min(1, dt * 3);
  if (Math.abs(ghostAmt - target) < 0.002) ghostAmt = target;
  ghostMat.opacity = 1 - ghostAmt * 0.84;
  for (const id of GHOST_IDS) { const m = parts[id].obj; if (ghostAmt > 0.01) m.material = ghostMat; else if (m.material === ghostMat) m.material = m.userData.baseMat || M.pla; }
}

// ------------------------------------------------------------------ state
let t = 0, playing = false, speed = 1, stopAt = null, lastStep = -1, userCam = false, orbitAng = 0;
let tools = { labels: true, xray: false, explode: false, wires: true, rotate: false };
let explodeAmt = 0, camTween = null, pinned = null;
S.controls.addEventListener('start', () => { userCam = true; camTween = null; });

// ------------------------------------------------------------------ UI: step list, timeline bar
const stepCard = $('#stepCard'), stepList = $('#stepList');
function buildStepList() {
  let html = '', lastCh = null;
  tl.steps.forEach((s, i) => {
    if (s.ch !== lastCh) { const c = chapterOf(s.ch); html += `<li class="chap" style="--c:${c.color}">${c.name}</li>`; lastCh = s.ch; }
    html += `<li class="s" data-i="${i}"><span class="n">${String(i).padStart(2, '0')}</span><span>${s.title}</span><span class="m">${s.id === 'print' ? 'prep' : s.id === 'intro' ? '' : s.manual.replace(/^Steps? /, '').replace(/^Testing /, 'T').replace(/ ·.*/, '')}</span></li>`;
  });
  stepList.innerHTML = html;
  stepList.querySelectorAll('li.s').forEach(li => li.addEventListener('click', () => goStep(+li.dataset.i, true)));
}
const track = $('#tlTrack'), fill = $('#tlFill');
function buildTimeline() {
  track.innerHTML = tl.steps.map(s => `<i style="flex:${s.dur} 1 0;--c:${chapterOf(s.ch).color}"></i>`).join('');
  layoutFill();
}
function layoutFill() {
  const segs = [...track.children]; fill.innerHTML = segs.map((el, i) => `<i style="width:${el.offsetWidth}px;--c:${chapterOf(tl.steps[i].ch).color}"></i>`).join('');
}
window.addEventListener('resize', () => { layoutFill(); });
const timeline = $('#timeline'), tlHover = $('#tlHover');
function timeFromX(x) { const r = timeline.getBoundingClientRect(); return clamp((x - r.left) / r.width, 0, 1) * tl.total; }
let scrubbing = false;
timeline.addEventListener('pointerdown', e => { scrubbing = true; timeline.setPointerCapture(e.pointerId); setTime(timeFromX(e.clientX)); stopAt = null; userCam = false; });
timeline.addEventListener('pointermove', e => {
  const tt = timeFromX(e.clientX), k = tl.stepAt(tt), r = timeline.getBoundingClientRect();
  tlHover.textContent = `${k}. ${tl.steps[k].title}`; tlHover.style.left = clamp(e.clientX - r.left, 60, r.width - 60) + 'px';
  if (scrubbing) setTime(tt);
});
timeline.addEventListener('pointerup', () => { scrubbing = false; });
timeline.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { nextStep(); e.preventDefault(); } if (e.key === 'ArrowLeft') { prevStep(); e.preventDefault(); } });

// ------------------------------------------------------------------ step card
const NAMES = { mega: 'Arduino', mux: 'Multiplexer', ledCtl: 'LED controller', heaterCtl: 'Heater ctrl', stirCtl: 'Stirring ctrl', bus5V: '5 V rail', busGND: 'GND rail', bus12V: '12 V rail', busGND2: 'GND rail', btnUp: 'Button UP', btnSel: 'Button SEL', btnDown: 'Button DOWN',
  lcd: 'LCD', sd: 'microSD', fan: 'Stirrer fan', heater: 'Heater plate', thermHeater: 'Heater thermistor', converter: 'Converter', rocker: 'Rocker switch', jack: 'Barrel jack', shield: 'Motor shield', rtc: 'Clock', tsl: 'OD sensor', odLed: '940 nm LED', thermoNeedle: 'Needle probe' };
const nm = (id, pin) => { const base = NAMES[id] || (id.startsWith('pump') ? 'Pump ' + ['NEU', 'WST', 'POS', 'NEG'][+id[4]] : id.startsWith('sixLed') ? 'LED ' + (+id[6] + 1) : id);
  return /^p\d+$|^lead$/.test(pin) ? base : `${base} ${pin === 'SDA' && id === 'mega' ? 'D20/SDA' : pin === 'SCL' && id === 'mega' ? 'D21/SCL' : pin.replace(/^GNDd$|^5Vd$/, s => s === 'GNDd' ? 'GND' : '5V')}`; };
const KIND_COL = { printed: '#334155', electronic: '#2563eb', hardware: '#94a3b8', consumable: '#d97706', labware: '#0d9488', fixture: '#64748b' };
const ICON_TIP = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg>';
const ICON_WARN = '<svg viewBox="0 0 24 24"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>';
function renderCard(k) {
  const s = tl.steps[k], c = chapterOf(s.ch);
  const seen = new Set(), chips = [];
  for (const id of s.adds || []) { const p = parts[id]; if (!p) continue; const key = p.name.replace(/ \(.*\)$/, '').replace(/^Optogenetic LED \d/, 'Optogenetic LEDs'); if (seen.has(key)) continue; seen.add(key); chips.push(`<button class="pchip" data-part="${id}" style="--k:${KIND_COL[p.kind] || '#475569'}"><i></i>${key}</button>`); }
  const ws = (s.wires || []).map(id => wires.find(w => w.userData.spec.id === id)?.userData.spec).filter(Boolean);
  const stubNote = ws.some(w => w.stub && w.stub[0] === s.id);
  const wl = ws.map(w => `<div class="wrow"><span class="sw ${w.color}"></span><span>${nm(w.a[0], w.a[1])} → ${nm(w.b[0], w.b[1])}${w.stub && w.stub[0] === s.id ? ' <span class="muted">(prepared, connected later)</span>' : ''}</span></div>`).join('');
  stepCard.innerHTML = `
    <div class="meta"><span class="chip" style="--c:${c.color}">${c.name}</span><span class="stepno">STEP ${k} / ${tl.steps.length - 1}</span></div>
    <h2>${s.title}</h2>
    <span class="manual"><svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/></svg>Manual · ${s.manual}</span>
    <div class="body">${s.body}</div>
    ${(s.tips || []).map(tp => `<div class="callout ${tp.kind}">${tp.kind === 'warn' ? ICON_WARN : ICON_TIP}<span>${tp.text}</span></div>`).join('')}
    ${chips.length ? `<div class="sub">Parts in this step</div><div class="pchips">${chips.join('')}</div>` : ''}
    ${ws.length ? `<div class="sub">Wires (${ws.length})</div>${wl}` : ''}
    <div class="nav2"><button data-nav="prev" ${k === 0 ? 'disabled' : ''}>← Previous</button><button data-nav="next" class="primary" ${k === tl.steps.length - 1 ? 'disabled' : ''}>${k === 0 ? 'Start building →' : 'Next step →'}</button></div>`;
  stepCard.querySelectorAll('.pchip').forEach(b => b.addEventListener('click', () => focusPart(b.dataset.part)));
  stepCard.querySelector('[data-nav="prev"]').addEventListener('click', prevStep);
  stepCard.querySelector('[data-nav="next"]').addEventListener('click', nextStep);
  stepList.querySelectorAll('li.s').forEach(li => { const i = +li.dataset.i; li.classList.toggle('cur', i === k); li.classList.toggle('done', i < k); });
  const box = stepCard.closest('.tab'); if (playing && box.scrollTop > 40) box.scrollTo({ top: 0, behavior: 'smooth' });
  $('#tpChapter').textContent = c.name; $('#tpChapter').style.setProperty('--c', c.color);
  $('#tpTitle').textContent = `${k}. ${s.title}`;
  try { history.replaceState(null, '', '#' + s.id); } catch {}
}

// ------------------------------------------------------------------ navigation
function setTime(x) { t = clamp(x, 0, tl.total); }
function goStep(k, play = true) {
  k = clamp(k, 0, tl.steps.length - 1); const s = tl.steps[k];
  setTime(s.t0 + 0.001); userCam = false; camTween = null;
  if (play && k > 0) { playing = true; stopAt = s.t0 + s.dur - 0.05; } else { playing = false; stopAt = null; }
  syncPlay();
}
function nextStep() { const k = tl.stepAt(t); goStep(k + 1, true); }
function prevStep() { const k = tl.stepAt(t); const s = tl.steps[k]; goStep(t - s.t0 > 1.2 && !playing ? k : k - 1, true); }
function togglePlay() {
  if (playing) { playing = false; } else { if (t >= tl.total - 0.05) setTime(tl.steps[1].t0); if (tl.stepAt(t) === 0) setTime(tl.steps[1].t0); playing = true; stopAt = null; userCam = false; }
  syncPlay();
}
function syncPlay() { document.body.classList.toggle('playing', playing); $('#btnPlay').setAttribute('aria-label', playing ? 'Pause' : 'Play'); }
$('#btnPlay').addEventListener('click', togglePlay);
$('#btnNext').addEventListener('click', nextStep);
$('#btnPrev').addEventListener('click', prevStep);
$$('.tp-speed button').forEach(b => b.addEventListener('click', () => { speed = +b.dataset.speed; $$('.tp-speed button').forEach(x => x.classList.toggle('on', x === b)); }));

// tabs
$$('.tabs button').forEach(b => b.addEventListener('click', () => {
  $$('.tabs button').forEach(x => x.classList.toggle('active', x === b));
  $$('.tab').forEach(x => x.classList.toggle('active', x.dataset.tab === b.dataset.tab));
  document.body.classList.remove('sheet-min');
}));
$('.sheet-handle').addEventListener('click', () => { document.body.classList.toggle('sheet-min'); setTimeout(() => { S.resize(); layoutFill(); }, 320); });

// toolbar
function setTool(name, on) {
  tools[name] = on ?? !tools[name];
  $(`[data-tool="${name}"]`)?.classList.toggle('on', !!tools[name]);
  if (name === 'xray') {
    for (const m of [M.pla, ...plaClones]) { m.transparent = tools.xray; m.opacity = tools.xray ? 0.14 : 1; m.depthWrite = !tools.xray; m.needsUpdate = true; }
    M.plaEdge.opacity = tools.xray ? 0.55 : 0.42;
  }
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
  if (k === ' ') { togglePlay(); e.preventDefault(); }
  else if (k === 'arrowright') nextStep(); else if (k === 'arrowleft') prevStep();
  else if (k === 'l') setTool('labels'); else if (k === 'x') setTool('xray'); else if (k === 'e') setTool('explode'); else if (k === 'w') setTool('wires');
  else if (k === 'r') { userCam = false; camTween = null; } else if (k === 'f') $('[data-tool="fullscreen"]').click();
  else if (k === 'home') goStep(0, false); else if (k === 'end') goStep(tl.steps.length - 1, true);
});

// ------------------------------------------------------------------ parts tab (BOM, modules, wires)
$('#costTotal').textContent = '$' + DATA.total.toFixed(2);
$('#costSecond').textContent = '$' + DATA.secondBotTotal.toFixed(2);
$('#moduleGrid').innerHTML = Object.keys(STL).map(L => `<button data-part="mod${L}"><b>${L}</b><span>${STL[L].name.split('· ')[1]}</span></button>`).join('');
$$('#moduleGrid button').forEach(b => b.addEventListener('click', () => focusPart(b.dataset.part)));
const shortName = n => n.length > 64 ? n.slice(0, 62) + '…' : n;
$('#bomTable').innerHTML = `<tr><th>Part</th><th>Qty</th><th>Cost</th></tr>` + DATA.bom.map(b => `<tr class="click" data-url="${b.url || ''}"><td>${shortName(b.name)}<div class="muted small">${b.vendor || ''}</div></td><td class="num">${b.qty}</td><td class="num">${b.price != null ? '$' + b.price.toFixed(2) : ''}</td></tr>`).join('') +
  `<tr><td><b>Total (first robot)</b></td><td></td><td class="num"><b>$${DATA.total.toFixed(2)}</b></td></tr>`;
$('#equipTable').innerHTML = `<tr><th>Tool / optional</th><th>Cost</th></tr>` + DATA.equipment.map(b => `<tr class="click" data-url="${b.url || ''}"><td>${shortName(b.name)}</td><td class="num">${b.price != null ? '$' + b.price.toFixed(2) : (b.unit != null ? '$' + Number(b.unit).toFixed(2) : '')}</td></tr>`).join('');
$$('#bomTable tr.click, #equipTable tr.click').forEach(tr => tr.addEventListener('click', () => { if (tr.dataset.url) window.open(tr.dataset.url, '_blank', 'noopener'); }));
// wire checklist -> model wire matching (best effort by colour + endpoint keywords)
function matchWire(row) {
  const txt = (row.from + ' ' + row.to).toLowerCase();
  const nums = (txt.match(/arduino (\d+)|port (\d+)/g) || []).map(s => s.replace(/\D/g, ''));
  let best = null, bestScore = 0;
  for (const w of wires) {
    const sp = w.userData.spec; let sc = 0;
    if (sp.color === row.color.toLowerCase() || (row.color === 'rainbow' && sp.id.startsWith('six')) || (row.color === 'naked' && sp.color === 'bare')) sc += 2;
    const ends = [sp.a, sp.b].map(e => (e[0] + ' ' + e[1]).toLowerCase()).join(' ');
    nums.forEach(n => { if (ends.includes('d' + n) || (n === '20' && ends.includes('sda')) || (n === '21' && ends.includes('scl'))) sc += 3; });
    [['button', 'btn'], ['heater controller', 'heaterctl'], ['stirr', 'stirctl'], ['multiplexer', 'mux'], ['real-time', 'rtc'], ['sd card', 'sd '], ['lcd', 'lcd'], ['led pwm', 'ledctl'], ['od940 light', 'odled'], ['sensor', 'tsl'], ['thermistor heater', 'thermheater'], ['thermistor media', 'thermoneedle'], ['pump', 'pump'], ['converter', 'converter'], ['rocker', 'rocker'], ['barrel', 'jack'], ['heater pad', 'heater '], ['fan', 'fan'], ['cnc shield', 'shield'], ['six', 'sixled'], ['arduino 5v', 'mega 5vd'], ['arduino gnd', 'mega gndd']]
      .forEach(([a, b]) => { if (txt.includes(a) && ends.includes(b.trim())) sc += 2; });
    if (sc > bestScore) { bestScore = sc; best = w; }
  }
  return bestScore >= 4 ? best : null;
}
const wireRows = DATA.wires.map(r => ({ ...r, model: matchWire(r) }));
function renderWires(filter = '') {
  const f = filter.toLowerCase();
  $('#wireTable').innerHTML = `<tr><th></th><th>From → to</th><th>cm</th></tr>` + wireRows.map((r, i) => ({ r, i })).filter(({ r }) => !f || (r.from + ' ' + r.to + ' ' + r.color + ' ' + r.type).toLowerCase().includes(f))
    .map(({ r, i }) => `<tr class="${r.model ? 'click' : ''}" data-i="${i}"><td><span class="sw ${r.color === 'naked' ? 'bare' : r.color}"></span></td><td>${r.from} → ${r.to}<div class="muted small">${r.color} · ${r.type}</div></td><td class="num">${r.cm}</td></tr>`).join('');
  $$('#wireTable tr.click').forEach(tr => tr.addEventListener('click', () => { const w = wireRows[+tr.dataset.i].model; if (w) focusWire(w); $$('#wireTable tr').forEach(x => x.classList.toggle('hl', x === tr)); }));
}
renderWires(); $('#wireFilter').addEventListener('input', e => renderWires(e.target.value));

// ------------------------------------------------------------------ part info, picking, focus
const DESC = {
  modA: 'Front rail that holds the two steel rods and cradles the LCD faceplate in a 45° slot.', modB: 'Holds the 20×4 LCD, three buttons and the microSD module.',
  modC: 'Rail with a raised frame that locates the heater/stirrer base under the vial.', modD: 'Houses the stirrer fan (bottom), PTC heater plate and heater thermistor. The vial sits in its well.',
  modE: 'Tray for all the electronics: the Arduino, motor shield, controllers, bus headers, clock, converter, switch and jack.', modF: 'Rail screwed under the motherboard. The rods bottom out in its blind holes.',
  modG: 'Four vertical cradles that hold the peristaltic pumps.', modL: 'Four magnetic bays around the vial for sensors and light sources.', modQ: 'Light-blocking reactor top around the upper vial. The cap sits on its boss.',
  modM: 'Blank module: the magnetic reference used to orient every other module, and a light-proof plug for a spare bay.', modN: 'Holds the TSL2591 light sensor facing the vial (back bay).',
  modO: 'Holds the 940 nm IR LED that shines through the culture (front bay).', modP: 'Six LEDs from violet to red for optogenetic or light selection (side bay).',
  modH: 'Cap mold base. Six needles pass through it to form the cap\'s holes.', modI: 'Cap mold half.', modJ: 'Cap mold half.', modK: 'Cap mold lid.',
  mega: 'The brain: ATmega2560 running the OpenEvo firmware, with the serial link to the browser interface.', shield: 'Drives the four DC pumps (PCA9685 PWM + TB6612 H-bridges).',
  heaterCtl: 'L298N H-bridge switching 12 V into the heater plate under PID control.', stirCtl: 'DRV8871 that drives the stirrer fan with PWM speed control and ramp-up.',
  ledCtl: 'TLC5947 24-channel 12-bit PWM driver for the OD LED and the six-pack.', mux: 'TCA9548A, which puts the LCD, clock and light sensor on separate I²C channels.',
  rtc: 'DS3231 battery-backed real-time clock for timestamps.', tsl: 'High-dynamic-range light sensor that measures the IR light transmitted through the culture (OD).',
  odLed: '940 nm infrared LED, the light source for optical density.', converter: 'Steps the 12 V supply down to 5 V for the logic.', vial: '90 mL glass culture vessel; the culture is 50 mL.',
  cap: 'Autoclavable silicone stopper cast in Modules H–K, with six needle holes.', thermoNeedle: 'NTC thermistor sealed in a 14 ga needle. It measures media temperature directly.',
  fan: '40 mm fan with two N52 magnets that spins the stir bar through the glass.', heater: '80 °C self-limiting PTC heater plate under the vial.',
};
const bomFor = name => name ? DATA.bom.find(b => b.name.toLowerCase().includes(name.toLowerCase().slice(0, 18))) : null;
const pop = document.createElement('div'); pop.id = 'pop'; Object.assign(pop.style, { position: 'fixed', zIndex: 25, display: 'none' }); document.body.appendChild(pop);
pop.className = 'card'; pop.style.cssText += ';background:var(--panel);border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow);padding:12px 14px;width:290px;';
function showInfo(id, x, y) {
  let html = '';
  if (id.startsWith('wire:')) {
    const sp = wires.find(w => w.userData.partId === id).userData.spec; const st = STEPS.find(s => s.id === sp.step);
    html = `<div class="meta"><span class="chip" style="--c:${WIRE_COLORS[sp.color] || '#888'}">${sp.color} wire</span></div><h4 style="margin:2px 0 6px;font-size:15px">${nm(sp.a[0], sp.a[1])} → ${nm(sp.b[0], sp.b[1])}</h4>
      <div class="muted small">22 AWG silicone · connected in “${st?.title || ''}”</div>`;
  } else {
    const p = parts[id]; const b = bomFor(p.bom); const k = tl.parts[id]?.firstStep;
    html = `<div class="meta"><span class="chip" style="--c:${KIND_COL[p.kind] || '#475569'}">${p.kind || 'part'}</span>${p.module ? `<span class="stepno">STL · ${p.module}.stl</span>` : ''}</div>
      <h4 style="margin:2px 0 6px;font-size:15px">${p.name}</h4>
      ${DESC[id] ? `<div class="small" style="color:var(--ink2);margin-bottom:6px">${DESC[id]}</div>` : ''}
      ${b ? `<div class="small muted">BOM: ${shortName(b.name)} · ${b.qty} needed · <b>$${b.price?.toFixed(2)}</b> ${b.url ? `· <a href="${b.url}" target="_blank" rel="noopener">vendor</a>` : ''}</div>` : ''}
      ${k != null ? `<div class="nav2" style="margin-top:10px"><button data-go="${k}">Show step ${k}: ${tl.steps[k].title}</button></div>` : ''}`;
  }
  pop.innerHTML = html; pop.style.display = 'block';
  const W = window.innerWidth, H = window.innerHeight;
  pop.style.left = clamp(x + 14, 8, W - 300) + 'px'; pop.style.top = clamp(y + 14, 8, H - pop.offsetHeight - 8) + 'px';
  pop.querySelector('[data-go]')?.addEventListener('click', e => { goStep(+e.target.dataset.go, true); pop.style.display = 'none'; });
  pinned = id;
}
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), canvas = $('#view'), tip = $('#tooltip');
function pick(e) {
  const r = canvas.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
  ray.setFromCamera(ndc, S.camera);
  const hits = ray.intersectObject(root, true);
  for (const h of hits) {
    let o = h.object, vis = true; for (let q = o; q; q = q.parent) if (!q.visible) { vis = false; break; }
    if (!vis) continue;
    if (h.object.isMesh && h.object.geometry.drawRange && h.object.geometry.drawRange.count !== Infinity && h.faceIndex != null && h.faceIndex * 3 >= h.object.geometry.drawRange.count) continue;
    const id = o.userData.partId; if (id && id !== 'printBed') return id;
  }
  return null;
}
let downAt = null, hoverId = null, hoverT = 0;
canvas.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', e => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return;
  const id = pick(e); if (id) { showInfo(id, e.clientX, e.clientY); if (!id.startsWith('wire:')) { flash(id); } } else { pop.style.display = 'none'; pinned = null; }
});
canvas.addEventListener('pointermove', e => {
  if (e.buttons || performance.now() - hoverT < 60) return; hoverT = performance.now();
  const id = pick(e); hoverId = id; canvas.style.cursor = id ? 'pointer' : '';
  if (id) {
    const nmx = id.startsWith('wire:') ? (() => { const sp = wires.find(w => w.userData.partId === id).userData.spec; return `${sp.color} wire<small>${nm(sp.a[0], sp.a[1])} → ${nm(sp.b[0], sp.b[1])}</small>`; })() : `${parts[id].name}<small>click for details</small>`;
    tip.innerHTML = nmx; tip.style.left = e.clientX + 'px'; tip.style.top = e.clientY + 'px'; tip.style.opacity = 1;
  } else tip.style.opacity = 0;
});
canvas.addEventListener('pointerleave', () => { tip.style.opacity = 0; });
let flashes = {};
function flash(id) { flashes[id] = performance.now(); }
function focusPart(id) {
  const p = parts[id], a = anchors[id]; if (!p || !a) return;
  if (!p.obj.visible) { const k = tl.parts[id]?.firstStep; if (k != null) { goStep(k, false); setTime(tl.steps[k].t0 + tl.steps[k].dur - 0.06); } }
  const c = p.obj.position.clone().add(a.center);
  const dist = clamp(a.size * 2.4, 90, 700);
  const dir = S.camera.position.clone().sub(S.controls.target).normalize();
  camTween = { p0: S.camera.position.clone(), t0: S.controls.target.clone(), p1: c.clone().addScaledVector(dir, dist), t1: c, s: performance.now(), d: 900 };
  userCam = true; flash(id);
}
function focusWire(w) {
  const k = STEPS.findIndex(s => s.id === w.userData.spec.step); if (k >= 0 && t < tl.steps[k].t0 + tl.steps[k].dur) { setTime(tl.steps[k].t0 + tl.steps[k].dur - 0.06); playing = false; syncPlay(); }
  const c = w.userData.curve.getPointAt(0.85);
  const dir = S.camera.position.clone().sub(S.controls.target).normalize();
  camTween = { p0: S.camera.position.clone(), t0: S.controls.target.clone(), p1: c.clone().addScaledVector(dir, 260), t1: c, s: performance.now(), d: 900 };
  userCam = true; wireFlash = { w, s: performance.now() };
}
let wireFlash = null;

// ------------------------------------------------------------------ labels
const labelsEl = $('#labels'); const labelPool = [];
function updateLabels(k) {
  const s = tl.steps[k]; const list = [];
  if (tools.labels && s.special === 'bed') {
    for (const id in parts) if (parts[id].kind === 'printed' && parts[id].obj.visible) list.push([id, parts[id].module]);
  } else if (tools.labels && k > 0 && explodeAmt < 0.05) {
    const seen = new Set();
    for (const id of s.adds || []) {
      const p = parts[id]; if (!p || !p.obj.visible || !anchors[id]) continue;
      const key = p.name.replace(/ \(.*\)$/, '').replace(/^Optogenetic LED \d/, 'Optogenetic LEDs');
      if (seen.has(key)) continue; seen.add(key); list.push([id, key]); if (list.length >= 7) break;
    }
  }
  const W = labelsEl.clientWidth, H = labelsEl.clientHeight;
  while (labelPool.length < list.length) { const d = document.createElement('div'); d.className = 'lbl'; d.innerHTML = '<i></i><span></span>'; labelsEl.appendChild(d); labelPool.push(d); }
  const placed = [];
  labelPool.forEach((d, i) => {
    if (i >= list.length) { d.style.opacity = 0; return; }
    const [id, key] = list[i]; const o = parts[id].obj;
    const bedMode = s.special === 'bed';
    const v = bedMode ? o.position.clone().add(new THREE.Vector3(0, 22, 0)) : o.position.clone().add(anchors[id].top); v.y += 6; v.project(S.camera);
    if (v.z > 1) { d.style.opacity = 0; return; }
    const x = (v.x + 1) / 2 * W; let y = (1 - v.y) / 2 * H - (bedMode ? 4 : 16);
    if (!bedMode) { // push labels apart so they never overlap
      const w = list[i][1].length * 6.6 + 30, h = 25;
      for (let pass = 0; pass < 6; pass++) { let hit = false; for (const r of placed) if (Math.abs(r.x - x) < (r.w + w) / 2 && Math.abs(r.y - y) < h) { y = r.y - h; hit = true; } if (!hit) break; }
      placed.push({ x, y, w });
    }
    d.classList.toggle('badge', bedMode);
    d.querySelector('span').textContent = key; d.style.opacity = 1;
    d.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
    d.querySelector('i').style.background = KIND_COL[parts[id].kind] === '#334155' ? 'var(--accent)' : KIND_COL[parts[id].kind];
  });
}

// ------------------------------------------------------------------ effects (LCD, stirring, optics, run simulation)
function simulateTurbidostat(dur) {
  const dt = 0.05, n = Math.ceil(dur / dt) + 2, od = new Float32Array(n), pump = new Uint8Array(n), cyc = new Uint16Array(n);
  let x = 0.12, p = 0, c = 1, media = 0;
  const mu = Math.log(2) / 2.6, TH = 0.62, LO = 0.32;
  for (let i = 0; i < n; i++) {
    if (p > 0) { x -= (x - LO * 0.98) * 0.12; p--; if (p === 0) { c++; media = (media + 1) % 3; } }
    else { x *= Math.exp(mu * dt) * (1 - 0.06 * x * dt); if (x >= TH) p = Math.round(1.6 / dt); }
    od[i] = x; pump[i] = p > 0 ? 1 : 0; cyc[i] = c;
  }
  return { dt, od, pump, cyc, TH };
}
const lcd = parts.lcd.obj.userData;
const PUMPN = ['NEU', 'WST', 'POS', 'NEG'];
const chart = $('#chart'), cx = chart.getContext('2d'), readout = $('#readout');
let stirAngle = 0, lastLcdTick = -1, lastScreen = null;
let chartInk = '#64748b', chartAcc = '#0d9488';
function chartColors() { const css = getComputedStyle(document.documentElement); chartInk = css.getPropertyValue('--muted').trim() || chartInk; chartAcc = css.getPropertyValue('--accent').trim() || chartAcc; }
const clearCol = new THREE.Color('#eef6ff'), cultCol = new THREE.Color('#f1df9a'), turbCol = new THREE.Color('#d9c179');
function effects(k, local, dt) {
  const s = tl.steps[k], id = s.id;
  const intro = k === 0;
  const after = name => k >= tl.steps.findIndex(x => x.id === name);
  // LCD
  let screen = null;
  if (intro || id === 'run') screen = 'run'; else if (s.lcd) screen = s.lcd;
  const tau = intro ? (local * 1.0 + 6) % runStep.dur : id === 'run' ? local : 0;
  const lcdTick = Math.floor(performance.now() / 220) !== lastLcdTick; if (lcdTick) lastLcdTick = Math.floor(performance.now() / 220);
  const si = Math.min(sim.od.length - 1, Math.floor(tau / sim.dt));
  const OD = sim.od[si], pumping = sim.pump[si] === 1;
  if (!screen) lcd.setText(['', '', '', ''], false);
  else if (!lcdTick && screen === lastScreen) {}
  else if (screen === 'prime') {
    if (local < 1.6) lcd.setText(['  EasyEVO Type D', '>PRIME PUMPS', ' HEATER TEST', ' INCUBATE'], true);
    else lcd.setText(['UP or DOWN to Pump', 'SEL for next Pump', 'Hold SEL to Exit', 'Current Pump:' + PUMPN[Math.floor((local - 1.6) / 2.3) % 4]], true);
  } else if (screen === 'heater') {
    const u = clamp(local / 9, 0, 1);
    lcd.setText(['HEATER TEST', 'Ambient Temp:' + (22.4 + Math.sin(local) * 0.05).toFixed(2), 'Media Temp:' + (22.1 + u * 7.6).toFixed(2), 'PID:' + Math.round(255 - u * 205) + ' HTR:' + (24 + u * 13.6).toFixed(2)], true);
  } else if (screen === 'incubate') {
    lcd.setText(['UPTIME:' + Math.floor(28 + local), 'Amb:22.50 Med:' + (23.44 + local * 0.02).toFixed(2), 'Heater:30.87 PWM:17', 'IR:3788' + (3 + Math.floor(local * 3) % 4) + ' OD:0.0001'], true);
  } else if (screen === 'run') {
    const ir = Math.round(37800 * Math.exp(-OD * 1.6));
    lcd.setText([`Cycle:${sim.cyc[si]} Step:${(sim.cyc[si] % 9) + 1}/9`, `OD:${OD.toFixed(3)} IR:${ir}`, `Media:${['NEU', 'POS', 'NEG'][sim.cyc[si] % 3]} LED${(sim.cyc[si] % 6) + 1}:${Math.round(40 + 40 * Math.sin(tau))}%`, `Media Temp:${(30 + Math.sin(tau * 0.7) * 0.15).toFixed(1)}C`], true);
  }
  lastScreen = screen;
  // stirring
  const stirring = intro || ['heatTest', 'optics', 'vialPrep', 'run'].includes(id);
  if (stirring) stirAngle += dt * 14;
  parts.fan.obj.userData.rotor.rotation.y = stirAngle;
  parts.stirBar.obj.rotation.y = -stirAngle;
  media.geometry = stirring && parts.media.obj.visible ? vortexGeo : flatGeo;
  // media appearance
  const mm = media.material;
  if (id === 'run' || intro) {
    const kk = clamp((OD - 0.12) / 0.55, 0, 1);
    mm.color.copy(cultCol).lerp(turbCol, kk); mm.attenuationColor.set('#d8b04a');
    mm.opacity = 0.34 + kk * 0.6; mm.roughness = 0.08 + kk * 0.5;
  } else { mm.color.copy(clearCol); mm.opacity = 0.32; mm.roughness = 0.05; }
  // optics
  const odOn = intro || ['optics', 'vialPrep', 'run'].includes(id);
  parts.odLed.obj.userData.setOn(odOn ? 1 : 0); odGlow.material.opacity = odOn ? 0.75 : 0;
  beamMat.opacity = odOn ? 0.32 : 0; beamMatBack.opacity = odOn ? 0.28 * Math.exp(-((id === 'run' || intro) ? OD : 0) * 2.2) : 0;
  // LED six-pack: chase pattern during runs
  const six = intro || id === 'run';
  for (let i = 0; i < 6; i++) {
    const v = six ? Math.pow(0.5 + 0.5 * Math.sin(tau * 1.3 - i * 1.05), 3) : 0;
    parts['sixLed' + i].obj.userData.setOn(v); ledGlows[i].material.opacity = v * 0.9;
  }
  // pumps: calibration cycles through pumps; run pumps WST + NEU during dilution
  const active = new Set();
  if (id === 'calPumps' && local > 1.6) active.add(Math.floor((local - 1.6) / 2.3) % 4);
  if ((id === 'run' || intro) && pumping) { active.add(1); active.add([0, 2, 3][sim.cyc[si] % 3]); }
  for (let i = 0; i < 4; i++) {
    const o = parts['pump' + i].obj; if (!o.visible) continue;
    if (active.has(i)) { o.position.x += Math.sin(performance.now() * 0.09 + i) * 0.25; o.rotation.y += Math.sin(performance.now() * 0.13) * 0.01; }
  }
  // fluid slugs travelling along the lines while pumping
  let si2 = 0;
  if ((id === 'run' || intro) && pumping) {
    const ln = { 0: ['line4', 'line0'], 1: ['line1', 'line7'], 2: ['line5', 'line2'], 3: ['line6', 'line3'] };
    for (const pi of active) for (const L of ln[pi]) {
      const tube = parts[L]?.obj; if (!tube?.visible) continue;
      for (let j = 0; j < 4 && si2 < slugs.length; j++) { const u = (tau * 0.35 + j / 4) % 1; slugs[si2].position.copy(tube.userData.curve.getPointAt(u)); slugs[si2].visible = true; si2++; }
    }
  }
  for (; si2 < slugs.length; si2++) slugs[si2].visible = false;
  // readout panel
  const showRo = id === 'run' || intro;
  readout.hidden = !showRo;
  if (showRo && lcdTick) {
    drawChart(si);
    $('#roOD').textContent = OD.toFixed(3); $('#roT').textContent = (30 + Math.sin(tau * 0.7) * 0.15).toFixed(1) + '°';
    $('#roPump').textContent = pumping ? 'diluting' : 'idle'; $('#roPump').style.color = pumping ? 'var(--accent)' : '';
    $('#roCycle').textContent = sim.cyc[si];
  }
}
function drawChart(si) {
  const W = chart.width, H = chart.height, pad = 26; cx.clearRect(0, 0, W, H);
  const ink = chartInk, acc = chartAcc;
  const n = Math.max(2, si), maxOD = 0.8, x = i => pad + (W - pad - 6) * i / (sim.od.length - 1), y = v => H - 18 - (H - 30) * v / maxOD;
  cx.strokeStyle = ink; cx.globalAlpha = 0.25; cx.lineWidth = 1; cx.beginPath();
  for (let g = 0; g <= 4; g++) { const yy = y(g * 0.2); cx.moveTo(pad, yy); cx.lineTo(W - 6, yy); } cx.stroke(); cx.globalAlpha = 1;
  cx.fillStyle = ink; cx.font = '600 15px Inter, sans-serif'; for (let g = 0; g <= 4; g += 2) cx.fillText((g * 0.2).toFixed(1), 0, y(g * 0.2) + 5);
  cx.setLineDash([6, 5]); cx.strokeStyle = '#ef4444'; cx.globalAlpha = 0.8; cx.beginPath(); cx.moveTo(pad, y(sim.TH)); cx.lineTo(W - 6, y(sim.TH)); cx.stroke(); cx.setLineDash([]); cx.globalAlpha = 1;
  cx.fillStyle = 'rgba(13,148,136,.12)';
  for (let i = 0; i < n; i++) if (sim.pump[i]) cx.fillRect(x(i), 6, Math.max(1, x(i + 1) - x(i)) + 0.5, H - 24);
  cx.strokeStyle = acc; cx.lineWidth = 3; cx.lineJoin = 'round'; cx.beginPath();
  for (let i = 0; i <= n; i += 2) { const xx = x(i), yy = y(sim.od[Math.min(i, sim.od.length - 1)]); i ? cx.lineTo(xx, yy) : cx.moveTo(xx, yy); } cx.stroke();
  const lx = x(n), ly = y(sim.od[n]); cx.fillStyle = acc; cx.beginPath(); cx.arc(lx, ly, 5, 0, Math.PI * 2); cx.fill();
  cx.fillStyle = ink; cx.font = '600 14px Inter, sans-serif'; cx.fillText('threshold', W - 80, y(sim.TH) - 6);
}

// ------------------------------------------------------------------ main loop
buildStepList(); buildTimeline();
const startId = (location.hash || '').slice(1);
const startK = Math.max(0, tl.steps.findIndex(s => s.id === startId));
if (startK > 0) { setTime(tl.steps[startK].t0 + tl.steps[startK].dur - 0.06); }
renderCard(tl.stepAt(t)); lastStep = tl.stepAt(t);
window.addEventListener('hashchange', () => {
  const id = location.hash.slice(1), k = tl.steps.findIndex(s => s.id === id);
  if (k >= 0 && k !== tl.stepAt(t)) { goStep(k, false); setTime(tl.steps[k].t0 + (k ? tl.steps[k].dur - 0.06 : 0)); }
});
setTool('rotate', startK === 0);
const clock = new THREE.Clock();
const head = $('#tlHead');
S.renderer.shadowMap.autoUpdate = false; let lastVis = -1, shadowKick = 3;
// adaptive resolution: keep the frame rate smooth on integrated GPUs
const baseDpr = S.renderer.getPixelRatio(); let dpr = baseDpr, fpsAcc = 0, fpsN = 0, fpsT = 0;
let slowRuns = 0;
function adapt(dt) { if (document.hidden || dt > 0.25) { fpsAcc = fpsN = fpsT = 0; return; } fpsAcc += dt; fpsN++; fpsT += dt; if (fpsT < 2) return; const fps = fpsN / fpsAcc; fpsAcc = fpsN = fpsT = 0;
  slowRuns = fps < 26 ? slowRuns + 1 : 0;
  let nd = dpr; if (slowRuns >= 2 && dpr > 0.85) { nd = Math.max(0.85, dpr - 0.15); slowRuns = 0; } else if (fps > 52 && dpr < baseDpr) nd = Math.min(baseDpr, dpr + 0.15);
  if (nd !== dpr) { dpr = nd; S.renderer.setPixelRatio(dpr); S.resize(); } }
function frame() { frameBody(clock.getDelta()); requestAnimationFrame(frame); }
function frameBody(rawDt, noRender = false) {
  const dt = Math.min(0.05, rawDt); adapt(rawDt);
  if (playing) {
    t += dt * speed;
    if (stopAt != null && t >= stopAt) { t = stopAt; playing = false; stopAt = null; syncPlay(); }
    if (t >= tl.total) { t = tl.total; playing = false; syncPlay(); }
  }
  const k = tl.stepAt(t), s = tl.steps[k];
  if (k !== lastStep) { renderCard(k); lastStep = k; if (!scrubbing) userCam = false; camTween = null; }
  // scene state
  explodeAmt += ((tools.explode ? 1 : 0) - explodeAmt) * Math.min(1, dt * 5);
  const res = applyTimeline(tl, t, { hideWires: !tools.wires || explodeAmt > 0.02 }); const glow = res.glow;
  const expMoving = Math.abs((tools.explode ? 1 : 0) - explodeAmt) > 0.002;
  if (res.moving || res.vis !== lastVis || expMoving || shadowKick > 0) { S.renderer.shadowMap.needsUpdate = true; shadowKick = Math.max(0, shadowKick - 1); }
  lastVis = res.vis;
  if (explodeAmt > 0.001) for (const id in explodeOff) { const o = parts[id].obj; if (o.visible) o.position.addScaledVector(explodeOff[id], explodeAmt); }
  const local = k === 0 ? clock.elapsedTime : t - s.t0;
  effects(k, local, dt);
  // highlight
  const now = performance.now();
  for (const id in flashes) { const a = (now - flashes[id]) / 1400; if (a > 1) delete flashes[id]; else glow[id] = Math.max(glow[id] || 0, Math.sin(a * Math.PI * 3) * 0.5 + 0.5); }
  const next = new Set(Object.keys(glow).filter(id => glow[id] > 0.01));
  for (const id of glowing) if (!next.has(id)) setGlow(id, 0);
  for (const id of next) setGlow(id, glow[id]);
  glowing = next;
  applyGhost(tools.xray ? 0 : ((k === 0 ? tl.steps.find(x => x.id === 'run').ghost : s.ghost) || 0), dt);
  if (wireFlash) { const a = (now - wireFlash.s) / 2000; wireFlash.w.userData.mesh.scale.setScalar(1); if (a > 1) wireFlash = null; else { wireFlash.w.visible = true; wireFlash.w.userData.setGrow(Math.min(1, a * 3)); } }
  // camera
  if (camTween) {
    const u = clamp((now - camTween.s) / camTween.d, 0, 1), e = u * u * (3 - 2 * u);
    S.camera.position.lerpVectors(camTween.p0, camTween.p1, e); S.controls.target.lerpVectors(camTween.t0, camTween.t1, e);
    if (u >= 1) camTween = null;
  } else if (!userCam) {
    const cam = cameraAt(tl, t);
    if (tools.rotate) orbitAng += dt * 0.12; else orbitAng *= 0.96;
    const off = cam.pos.clone().sub(cam.tgt).applyAxisAngle(new THREE.Vector3(0, 1, 0), orbitAng);
    S.camera.position.copy(cam.tgt).add(off); S.controls.target.copy(cam.tgt);
  } else if (tools.rotate) { const off = S.camera.position.clone().sub(S.controls.target).applyAxisAngle(new THREE.Vector3(0, 1, 0), dt * 0.12); S.camera.position.copy(S.controls.target).add(off); }
  S.controls.update();
  updateLabels(k);
  // transport UI
  const pct = t / tl.total * 100; head.style.left = pct + '%'; fill.style.width = pct + '%';
  $('#tpTime').textContent = `${fmtTime(t)} / ${fmtTime(tl.total)}`;
  if (!noRender) S.renderer.render(S.scene, S.camera);
}
ldFill.style.width = '100%';
frameBody(0.016);
setTimeout(() => { $('#loader').classList.add('done'); document.body.classList.add('ready'); }, 120);
requestAnimationFrame(frame);
window.__chartColors = chartColors; chartColors();
// dev helper: render the 3D view at a given size and post it to the local dev server
async function capture(name, w = 1600, h = 1000) {
  const r = S.renderer, c = r.domElement, pw = c.style.width, ph = c.style.height, pr = r.getPixelRatio();
  r.setPixelRatio(1); r.setSize(w, h, false); S.camera.aspect = w / h; S.camera.updateProjectionMatrix(); S.renderer.shadowMap.needsUpdate = true;
  const bg = S.scene.background; S.scene.background = new THREE.Color(dark ? '#10151d' : '#e9ecf1');
  r.render(S.scene, S.camera); const url = c.toDataURL('image/png'); S.scene.background = bg;
  r.setPixelRatio(pr); S.resize();
  await fetch('/__save/' + name, { method: 'POST', body: url }); return url.length;
}
async function shot(name, time, opts = {}) {
  setTime(time); playing = false; userCam = !!opts.cam; if (opts.cam) { S.camera.position.set(...opts.cam[0]); S.controls.target.set(...opts.cam[1]); }
  for (let i = 0; i < (opts.n || 60); i++) frameBody(0.02, true);
  if (opts.cam) { S.camera.position.set(...opts.cam[0]); S.controls.target.set(...opts.cam[1]); S.camera.lookAt(...opts.cam[1]); }
  return capture(name, opts.w || 1600, opts.h || 1000);
}
function scan(step = 0.2) { const errs = []; const t0 = t; for (let x = 0; x <= tl.total; x += step) { try { setTime(x); frameBody(step, true); } catch (e) { errs.push([x.toFixed(1), tl.steps[tl.stepAt(x)].id, String(e)]); if (errs.length > 5) break; } } setTime(t0); return errs; }
window.openevo = { scan, shot, capture, timing: { assembly: T1 - T0, wires: T2 - T1, total: performance.now() - T0 }, S, parts, tl, wires, setTime: x => setTime(x), goStep, get t() { return t; } };

// ------------------------------------------------------------------ print bed layout
function buildPrintBed(parts) {
  const qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  const items = [];
  for (const id in parts) {
    const p = parts[id]; if (p.kind !== 'printed') continue;
    const s = STL[p.module];
    const R = new THREE.Matrix4(); for (const [a, deg] of s.rot) R.premultiply(new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(a === 'x' ? 1 : 0, a === 'y' ? 1 : 0, a === 'z' ? 1 : 0), deg * Math.PI / 180));
    const q = qx.clone().multiply(new THREE.Quaternion().setFromRotationMatrix(R).invert());
    const pos = p.obj.geometry.attributes.position, v = new THREE.Vector3(), mn = new THREE.Vector3(1e9, 1e9, 1e9), mx = new THREE.Vector3(-1e9, -1e9, -1e9);
    for (let i = 0; i < pos.count; i += 1) { v.fromBufferAttribute(pos, i).applyQuaternion(q); mn.min(v); mx.max(v); }
    items.push({ id, q, mn, mx, w: mx.x - mn.x, d: mx.z - mn.z });
  }
  items.sort((a, b) => b.d - a.d);
  const WMAX = 620, gap = 10; let x = 0, z = 0, rowD = 0; const placed = [];
  for (const it of items) { if (x + it.w > WMAX) { x = 0; z += rowD + gap; rowD = 0; } placed.push({ it, x, z }); x += it.w + gap; rowD = Math.max(rowD, it.d); }
  const totalW = Math.max(...placed.map(p => p.x + p.it.w)), totalD = z + rowD;
  const ox = -totalW / 2, oz = -totalD / 2 - 20, top = 4;
  const poses = {};
  for (const { it, x, z } of placed) poses[it.id] = { p: new THREE.Vector3(ox + x - it.mn.x, top - it.mn.y, oz + z - it.mn.z), q: it.q };
  // bed plate
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d');
  g.fillStyle = '#2a2d33'; g.fillRect(0, 0, 256, 256); g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 2;
  for (let i = 0; i <= 256; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); }
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`; g.fillRect(Math.random() * 256, Math.random() * 256, 1, 1); }
  const tex = new THREE.CanvasTexture(cv); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set((totalW + 50) / 100, (totalD + 50) / 100); tex.colorSpace = THREE.SRGBColorSpace;
  const plate = new THREE.Mesh(new THREE.BoxGeometry(totalW + 50, top, totalD + 50), [M.aluDark, M.aluDark, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }), M.aluDark, M.aluDark, M.aluDark]);
  plate.position.set(0, top / 2, oz + totalD / 2); plate.receiveShadow = true; plate.name = 'Print bed';
  const grp = new THREE.Group(); grp.add(plate); grp.position.copy(plate.position); plate.position.set(0, 0, 0); grp.name = 'Print bed';
  grp.userData.partId = 'printBed'; root.add(grp);
  parts.printBed = { id: 'printBed', obj: grp, name: 'Print bed', kind: 'fixture' };
  return { poses };
}
