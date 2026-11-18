import * as THREE from 'three';
import { createScene } from './scene.js';
import { buildAssembly, STL, TX, TZ, C_TOP } from './assembly.js';
import { buildWires } from './wires.js';
import { buildLabware, buildWireProps } from './labware.js';
import { buildBaseMaterials, kitPlan, kitGroups } from './kit.js';
import { makeSteps, CHAPTERS, VIEWS, FRAMES } from './steps.js';
import { compileTimeline, applyTimeline, cameraAt } from './timeline.js';
import { DATA } from './data.js';
import { M, WIRE_COLORS } from './materials.js';

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
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ------------------------------------------------------------------ theme
let dark = store.get('dark', window.matchMedia?.('(prefers-color-scheme: dark)').matches || false);
function applyTheme() { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; S?.setTheme(dark); $('[data-tool="theme"]').classList.toggle('on', dark); setTimeout(() => window.__chartColors?.(), 0); }

// ------------------------------------------------------------------ scene
const S = createScene($('#view'));
applyTheme();
const root = new THREE.Group(); root.name = 'OpenEvo'; S.scene.add(root);
{ const k = S.lights.key, sc = k.shadow.camera; k.target.position.set(0, 0, -420); k.position.set(260, 520, -120); sc.left = -1250; sc.right = 1250; sc.top = 1250; sc.bottom = -1250; sc.far = 1900; sc.updateProjectionMatrix(); k.shadow.mapSize.set(4096, 4096);
  S.ground.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.geometry = new THREE.PlaneGeometry(6000, 6000); } if (o.material?.uniforms?.uFade) o.material.uniforms.uFade.value = 2300; }); }
const ldFill = $('#ldFill'), ldText = $('#ldText');
const T0 = performance.now();
const { parts, printFrame, prims } = await buildAssembly(root, p => { ldFill.style.width = (p * 75).toFixed(0) + '%'; });
const T1 = performance.now();
ldText.textContent = 'Routing the wires from the Wiring Checklist…';
await new Promise(r => setTimeout(r, 20));
const wires = buildWires(parts, root, { prims, printFrame });
const lab = buildLabware(parts); for (const id in lab) { root.add(lab[id].obj); parts[id] = lab[id]; }
const props = buildWireProps(wires.map(w => w.userData.spec)); for (const id in props) { root.add(props[id].obj); parts[id] = props[id]; }
const raw = buildBaseMaterials(); for (const id in raw) { root.add(raw[id].obj); parts[id] = raw[id]; }
const bed = buildPrintBed(parts);
const T2 = performance.now();
ldFill.style.width = '90%';

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
const odGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#ff3d6e', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
odGlow.scale.setScalar(14); odGlow.renderOrder = 10; root.add(odGlow);
const odGlowLocal = new THREE.Vector3(0, 0, 6);
const beamMat = new THREE.MeshBasicMaterial({ color: '#ff2d6a', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 41, 16, 1, true), beamMat); beam.rotation.x = Math.PI / 2; beam.position.set(TX, C_TOP + 62, TZ); beam.renderOrder = 9; root.add(beam);
const slugMat = new THREE.MeshStandardMaterial({ color: '#cfe6ff', emissive: '#7fb8ff', emissiveIntensity: 0.25, roughness: 0.2 });
const slugs = []; for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(2.2, 12, 8), slugMat); m.visible = false; root.add(m); slugs.push(m); }

// ------------------------------------------------------------------ timeline
const bedM = {}; for (const id in bed.poses) bedM[id] = new THREE.Matrix4().compose(bed.poses[id].p, bed.poses[id].q, new THREE.Vector3(1, 1, 1));
// the base materials laid out on the table: everything starts here
const kit = kitPlan(parts, bedM);
const kitG = kitGroups(parts);
const wireColor = Object.fromEntries(wires.map(w => ['prep:' + w.userData.spec.id, w.userData.spec.color]));
const BOX1 = ['black', 'red', 'orange', 'yellow', 'green', 'blue'];
const crimped = kitG.wires.filter(id => /female|male/.test(wires.find(w => 'prep:' + w.userData.spec.id === id)?.userData.spec.ends || ''));
const STEPS = makeSteps({ bedPoses: bedM, purchased: [...kitG.electronics, ...kitG.hardware, ...kitG.materials], wireBox: id => BOX1.includes(wireColor[id]) ? 'kitWire1' : 'kitWire2', prepIds: kitG.wires, crimped });
const tl = compileTimeline({ steps: STEPS, parts, wires, views: VIEWS, frames: FRAMES, kit });
const stepIndex = id => tl.steps.findIndex(s => s.id === id);
const growthCurve = simulateIncubation();

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
// cut-away of the reactor tower so the vial and the stir bar are visible in the test steps
const GHOST_IDS = ['modD', 'modL', 'modQ', 'modN', 'modO', 'modP'];
const ghostMat = M.pla.clone(); ghostMat.transparent = true; ghostMat.depthWrite = false; ghostMat.opacity = 0.2;
let ghostAmt = 0;
function applyGhost(target, dt) {
  ghostAmt += (target - ghostAmt) * Math.min(1, dt * 3);
  if (Math.abs(ghostAmt - target) < 0.002) ghostAmt = target;
  ghostMat.opacity = 1 - ghostAmt * 0.84;
  for (const id of GHOST_IDS) { const m = parts[id].obj; if (ghostAmt > 0.01) { if (!m.userData.baseMat) m.userData.baseMat = m.material; m.material = ghostMat; } else if (m.material === ghostMat) m.material = m.userData.baseMat || M.pla; }
}

// ------------------------------------------------------------------ state
let t = 0, playing = false, speed = 1, stopAt = null, lastStep = -1, userCam = false, orbitAng = 0;
let tools = { labels: true, xray: false, wires: true, rotate: false };
let camTween = null, pinned = null;
S.controls.addEventListener('start', () => { userCam = true; camTween = null; });

// ------------------------------------------------------------------ names, all in the manual's / checklist's words
const PART_NAME = { mega: 'Arduino MEGA', bus5V: '5V rail', busGND: 'GND Rail', bus12V: '12V rail', busGND2: 'Ground Rail', mux: 'I2C Multiplexer', ledCtl: 'LED Controller Board',
  stirCtl: 'Stirring Motor Controller', heaterCtl: 'Heater Controller Board', shield: 'Motor Shield', btnUp: 'Button UP', btnSel: 'Button SEL', btnDown: 'Button DOWN', lcd: 'LCD Screen’s I2C board',
  sd: 'microSD module', fan: 'stirring fan', heater: 'Heater Plate', thermHeater: 'Heater Module thermistor', needleHdr: 'thermistor needle', converter: '12V-to-5V converter', rocker: 'Rocker Switch',
  jack: 'Barrel Jack', rtc: 'Real-Time Clock', tsl: 'TSL2591', odLed: '940nm LED' };
const NUM = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'];
function pinName(id, pin) {
  if (/^bus/.test(id)) return PART_NAME[id];
  if (/^pump\d/.test(id)) return `pump motor M${+id[4] + 1} ${pin === '+' ? 'positive' : 'negative'} terminal`;
  if (/^sixLed\d/.test(id)) return `${parts[id].ledColor} LED ${pin === '+' ? 'longer leg' : 'shorter leg'}`;
  const base = PART_NAME[id] || parts[id]?.name || id;
  let p = pin;
  if (id === 'mega') p = /^D\d+$/.test(pin) ? 'Digital Pin ' + pin.slice(1) : /^A\d+$/.test(pin) ? pin + ' analog pin' : pin + ' header';
  else if (id === 'mux') p = pin.replace(/^SD(\d)$/, 'SDA$1').replace(/^SC(\d)$/, 'SCL$1');
  else if (id === 'ledCtl' && /^ch\d[+-]$/.test(pin)) p = `Channel ${NUM[+pin[2]]} ${pin[3] === '+' ? 'positive' : 'negative'} pin`;
  else if (id === 'shield') p = { GND12: 'shared ground (M1/M2)', GND34: 'shared ground (M3/M4)', 'POWER+': 'Power(+)', 'POWER-': 'Power(-)' }[pin] || pin.slice(0, 2);
  else if (id === 'fan') p = pin === '+' ? 'red lead' : 'black lead';
  else if (id === 'heater') p = 'lead';
  else if (id === 'thermHeater' || id === 'needleHdr') p = pin === 'S' ? 'middle pin' : 'flanking pin';
  else if (id === 'converter') p = { 'IN+': 'positive 12V input', 'IN-': 'negative input (IN)', 'OUT+': '5V output positive', 'OUT-': '5V output negative' }[pin] || pin;
  else if (id === 'rocker') p = pin === 'a' ? 'rightmost blade' : 'opposite blade';
  else if (id === 'jack') p = pin === '+' ? 'center pin' : 'ground flap';
  else if (/^btn/.test(id)) p = pin === 'sig' ? 'blade' : 'ground blade';
  else if (id === 'odLed') p = pin === '+' ? 'positive leg' : 'negative leg';
  return `${base} ${p}`;
}
const wireTitle = sp => `${sp.cm ? sp.cm + 'cm ' : ''}${sp.color} wire`;
const wireEnds = sp => `${pinName(sp.a[0], sp.a[1])} → ${pinName(sp.b[0], sp.b[1])}`;
const partLabel = id => { const p = parts[id]; return p.manualName || p.name; };

// ------------------------------------------------------------------ UI: step list, timeline bar
const stepCard = $('#stepCard'), stepList = $('#stepList');
const firstSentence = s => { let src = s || ''; const gap = src.indexOf('\n\n'); if (/^\s*Prepare wires:/.test(src) && gap > 0) src = src.slice(gap); const x = src.replace(/\s+/g, ' ').trim(); const m = x.match(/^(.{12,}?[.!?:])\s/); const f = m ? m[1] : x; return f.length > 70 ? f.slice(0, 68).replace(/\s\S*$/, '') + '…' : f; };
const stepNo = s => s.ch === 'hw' || s.ch === 'test' ? String(s.n) : '';
function buildStepList() {
  let html = '', lastCh = null;
  tl.steps.forEach((s, i) => {
    if (s.ch !== lastCh) { const c = chapterOf(s.ch); html += `<li class="chap" style="--c:${c.color}">${esc(c.name)}</li>`; lastCh = s.ch; }
    const label = s.ch === 'hw' || s.ch === 'test' ? firstSentence(s.text) : s.title;
    html += `<li class="s" data-i="${i}"><span class="n">${stepNo(s)}</span><span>${esc(label)}</span></li>`;
  });
  stepList.innerHTML = html;
  stepList.querySelectorAll('li.s').forEach(li => li.addEventListener('click', () => goStep(+li.dataset.i, true)));
}
const track = $('#tlTrack'), fill = $('#tlFill');
function buildTimeline() { track.innerHTML = tl.steps.map(s => `<i style="flex:${s.dur} 1 0;--c:${chapterOf(s.ch).color}"></i>`).join(''); layoutFill(); }
function layoutFill() { const segs = [...track.children]; fill.innerHTML = segs.map((el, i) => `<i style="width:${el.offsetWidth}px;--c:${chapterOf(tl.steps[i].ch).color}"></i>`).join(''); }
window.addEventListener('resize', () => { layoutFill(); });
const timeline = $('#timeline'), tlHover = $('#tlHover');
function timeFromX(x) { const r = timeline.getBoundingClientRect(); return clamp((x - r.left) / r.width, 0, 1) * tl.total; }
let scrubbing = false;
timeline.addEventListener('pointerdown', e => { scrubbing = true; timeline.setPointerCapture(e.pointerId); setTime(timeFromX(e.clientX)); stopAt = null; userCam = false; });
timeline.addEventListener('pointermove', e => {
  const tt = timeFromX(e.clientX), k = tl.stepAt(tt), r = timeline.getBoundingClientRect(), s = tl.steps[k];
  tlHover.textContent = s.ch === 'hw' || s.ch === 'test' ? `${chapterOf(s.ch).name} · Step ${s.n}` : s.title; tlHover.style.left = clamp(e.clientX - r.left, 80, r.width - 80) + 'px';
  if (scrubbing) setTime(tt);
});
timeline.addEventListener('pointerup', () => { scrubbing = false; });
timeline.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { nextStep(); e.preventDefault(); } if (e.key === 'ArrowLeft') { prevStep(); e.preventDefault(); } });

// ------------------------------------------------------------------ step card: the manual's text, verbatim
const KIND_COL = { printed: '#334155', electronic: '#2563eb', hardware: '#94a3b8', consumable: '#d97706', labware: '#0d9488', fixture: '#64748b' };
function manualHTML(text) { return esc(text).split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join(''); }
function renderCard(k) {
  const s = tl.steps[k], c = chapterOf(s.ch);
  const seen = new Set(), chips = [];
  for (const id of s.adds || []) { const p = parts[id]; if (!p || p.kind === 'virtual' || id.startsWith('prep:')) continue; const key = partLabel(id); if (seen.has(key)) continue; seen.add(key); chips.push(`<button class="pchip" data-part="${id}" style="--k:${KIND_COL[p.kind] || '#475569'}"><i></i>${esc(key)}</button>`); }
  const ws = (s.wires || []).map(id => wires.find(w => w.userData.spec.id === id)?.userData.spec).filter(Boolean);
  const wl = ws.map(w => { const g = w.grow.find(x => x[0] === s.id); const part = g && g[1] < 1; return `<div class="wrow"><span class="sw ${w.color}"></span><span><b>${esc(wireTitle(w))}</b> · ${esc(wireEnds(w))}${part ? ' <span class="muted">(one end now, the other later)</span>' : ''}</span></div>`; }).join('');
  const link = s.link === 'bom' ? `<div class="nav2"><button data-tabgo="parts">Open the Material Sheet</button></div>` : s.link === 'wires' ? `<div class="nav2"><button data-tabgo="wiring">Open the Wire List</button></div>` : '';
  const head = s.ch === 'hw' || s.ch === 'test' ? `Step ${s.n}` : s.title;
  stepCard.innerHTML = `
    <div class="meta"><span class="chip" style="--c:${c.color}">${esc(c.name)}</span><span class="stepno">${k} / ${tl.steps.length - 1}</span></div>
    <h2>${esc(head)}</h2>
    <div class="body manual-text">${manualHTML(s.text)}</div>
    ${link}
    ${chips.length ? `<div class="sub">Parts in this step</div><div class="pchips">${chips.join('')}</div>` : ''}
    ${ws.length ? `<div class="sub">Wires (${ws.length})</div>${wl}` : ''}
    <div class="nav2"><button data-nav="prev" ${k === 0 ? 'disabled' : ''}>← Previous</button><button data-nav="next" class="primary" ${k === tl.steps.length - 1 ? 'disabled' : ''}>${k === 0 ? 'Start →' : 'Next step →'}</button></div>`;
  stepCard.querySelectorAll('.pchip').forEach(b => b.addEventListener('click', () => focusPart(b.dataset.part)));
  stepCard.querySelector('[data-nav="prev"]').addEventListener('click', prevStep);
  stepCard.querySelector('[data-nav="next"]').addEventListener('click', nextStep);
  stepCard.querySelector('[data-tabgo]')?.addEventListener('click', e => $(`.tabs button[data-tab="${e.target.dataset.tabgo}"]`).click());
  stepList.querySelectorAll('li.s').forEach(li => { const i = +li.dataset.i; li.classList.toggle('cur', i === k); li.classList.toggle('done', i < k); });
  const box = stepCard.closest('.tab'); if (playing && box.scrollTop > 40) box.scrollTo({ top: 0, behavior: 'smooth' });
  $('#tpChapter').textContent = c.name; $('#tpChapter').style.setProperty('--c', c.color);
  $('#tpTitle').textContent = head;
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
  if (playing) { playing = false; } else { if (t >= tl.total - 0.05 || tl.stepAt(t) === 0) setTime(tl.steps[1].t0); playing = true; stopAt = null; userCam = false; }
  syncPlay();
}
function syncPlay() { document.body.classList.toggle('playing', playing); $('#btnPlay').setAttribute('aria-label', playing ? 'Pause' : 'Play'); }
$('#btnPlay').addEventListener('click', togglePlay);
$('#btnNext').addEventListener('click', nextStep);
$('#btnPrev').addEventListener('click', prevStep);
$$('.tp-speed button').forEach(b => b.addEventListener('click', () => { speed = +b.dataset.speed; $$('.tp-speed button').forEach(x => x.classList.toggle('on', x === b)); }));
$$('.tabs button').forEach(b => b.addEventListener('click', () => {
  $$('.tabs button').forEach(x => x.classList.toggle('active', x === b));
  $$('.tab').forEach(x => x.classList.toggle('active', x.dataset.tab === b.dataset.tab));
  document.body.classList.remove('sheet-min');
}));
$('.sheet-handle').addEventListener('click', () => { document.body.classList.toggle('sheet-min'); setTimeout(() => { S.resize(); layoutFill(); }, 320); });
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
  else if (k === 'l') setTool('labels'); else if (k === 'x') setTool('xray'); else if (k === 'w') setTool('wires');
  else if (k === 'r') { userCam = false; camTween = null; } else if (k === 'f') $('[data-tool="fullscreen"]').click();
  else if (k === 'home') goStep(0, false); else if (k === 'end') goStep(tl.steps.length - 1, true);
});

// ------------------------------------------------------------------ parts tab (Material Sheet, modules) and wiring tab (Wire List)
$('#costTotal').textContent = '$' + DATA.total.toFixed(2);
$('#costSecond').textContent = '$' + DATA.secondBotTotal.toFixed(2);
$('#moduleGrid').innerHTML = Object.keys(STL).map(L => `<button data-part="mod${L}" title="${esc(STL[L].file)}"><b>${L}</b><span>${esc(STL[L].file.replace(/^Module . - (OEVO )?/, '').replace(/\.stl$/, ''))}</span></button>`).join('');
$$('#moduleGrid button').forEach(b => b.addEventListener('click', () => focusPart(b.dataset.part)));
const shortName = n => n.length > 64 ? n.slice(0, 62) + '…' : n;
$('#bomTable').innerHTML = `<tr><th>Part</th><th>Qty</th><th>Cost</th></tr>` + DATA.bom.map(b => `<tr class="click" data-url="${esc(b.url || '')}"><td>${esc(shortName(b.name))}<div class="muted small">${esc(b.vendor || '')}</div></td><td class="num">${b.qty}</td><td class="num">${b.price != null ? '$' + b.price.toFixed(2) : ''}</td></tr>`).join('') +
  `<tr><td><b>Total (first robot)</b></td><td></td><td class="num"><b>$${DATA.total.toFixed(2)}</b></td></tr>`;
$('#equipTable').innerHTML = `<tr><th>Tool / optional</th><th>Cost</th></tr>` + DATA.equipment.map(b => `<tr class="click" data-url="${esc(b.url || '')}"><td>${esc(shortName(b.name))}</td><td class="num">${b.price != null ? '$' + b.price.toFixed(2) : (b.unit != null ? '$' + Number(b.unit).toFixed(2) : '')}</td></tr>`).join('');
$$('#bomTable tr.click, #equipTable tr.click').forEach(tr => tr.addEventListener('click', () => { if (tr.dataset.url) window.open(tr.dataset.url, '_blank', 'noopener'); }));
// Wiring Checklist rows matched to model wires by colour, length and the endpoints they name
function matchWire(row) {
  const txt = (row.from + ' ' + row.to).toLowerCase();
  const nums = (txt.match(/arduino (\d+)|port (\d+)|pin (\d+)/g) || []).map(s => s.replace(/\D/g, ''));
  let best = null, bestScore = 0;
  for (const w of wires) {
    const sp = w.userData.spec; let sc = 0;
    if (sp.color === row.color.toLowerCase() || (row.color === 'naked' && sp.color === 'bare')) sc += 2;
    if (sp.cm && +row.cm === sp.cm) sc += 2;
    const ends = [sp.a, sp.b].map(e => (e[0] + ' ' + e[1]).toLowerCase()).join(' ');
    nums.forEach(n => { if (ends.includes('d' + n + ' ') || ends.endsWith('d' + n)) sc += 3; });
    [['button', 'btn'], ['heater controller', 'heaterctl'], ['stirr', 'stirctl'], ['multiplexer', 'mux'], ['real-time', 'rtc'], ['sd card', 'sd '], ['lcd', 'lcd'], ['led pwm', 'ledctl'], ['od940 light', 'odled'], ['sensor', 'tsl'], ['thermistor heater', 'thermheater'], ['thermistor media', 'thermoneedle'], ['pump', 'pump'], ['converter', 'converter'], ['rocker', 'rocker'], ['barrel', 'jack'], ['heater pad', 'heater '], ['fan', 'fan'], ['shield', 'shield'], ['six', 'sixled'], ['arduino 5v', 'mega 5v'], ['arduino gnd', 'mega gnd']]
      .forEach(([a, b]) => { if (txt.includes(a) && ends.includes(b.trim())) sc += 2; });
    if (sc > bestScore) { bestScore = sc; best = w; }
  }
  return bestScore >= 5 ? best : null;
}
const wireRows = DATA.wires.map(r => ({ ...r, model: matchWire(r) }));
function renderWires(filter = '') {
  const f = filter.toLowerCase();
  $('#wireTable').innerHTML = `<tr><th></th><th>From → to</th><th>cm</th></tr>` + wireRows.map((r, i) => ({ r, i })).filter(({ r }) => !f || (r.from + ' ' + r.to + ' ' + r.color + ' ' + r.type).toLowerCase().includes(f))
    .map(({ r, i }) => `<tr class="${r.model ? 'click' : ''}" data-i="${i}"><td><span class="sw ${r.color === 'naked' ? 'bare' : esc(r.color)}"></span></td><td>${esc(r.from)} → ${esc(r.to)}<div class="muted small">${esc(r.color)} · ${esc(r.type)}</div></td><td class="num">${esc(r.cm)}</td></tr>`).join('');
  $$('#wireTable tr.click').forEach(tr => tr.addEventListener('click', () => { const w = wireRows[+tr.dataset.i].model; if (w) focusWire(w); $$('#wireTable tr').forEach(x => x.classList.toggle('hl', x === tr)); }));
}
renderWires(); $('#wireFilter').addEventListener('input', e => renderWires(e.target.value));

// ------------------------------------------------------------------ part info, picking, focus
const bomFor = name => name ? DATA.bom.find(b => b.name.toLowerCase().includes(name.toLowerCase().slice(0, 18))) : null;
const pop = document.createElement('div'); pop.id = 'pop'; Object.assign(pop.style, { position: 'fixed', zIndex: 25, display: 'none' }); document.body.appendChild(pop);
pop.className = 'card'; pop.style.cssText += ';background:var(--panel);border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow);padding:12px 14px;width:290px;';
const lastGrowStep = sp => sp.grow[sp.grow.length - 1][0];
function showInfo(id, x, y) {
  let html = '';
  if (id.startsWith('wire:')) {
    const sp = wires.find(w => w.userData.partId === id).userData.spec; const k = stepIndex(lastGrowStep(sp)); const st = tl.steps[k];
    html = `<div class="meta"><span class="chip" style="--c:${WIRE_COLORS[sp.color] || '#888'}">${esc(wireTitle(sp))}</span><span class="stepno">${esc(sp.ends.replace(/solder/g, 'solid'))}</span></div><h4 style="margin:2px 0 6px;font-size:15px">${esc(wireEnds(sp))}</h4>
      ${st ? `<div class="nav2" style="margin-top:8px"><button data-go="${k}">Show ${esc(chapterOf(st.ch).name)} step ${st.n}</button></div>` : ''}`;
  } else {
    const p = parts[id]; const b = bomFor(p.bom); const k = tl.parts[id]?.firstStep; const st = k != null ? tl.steps[k] : null;
    html = `<div class="meta"><span class="chip" style="--c:${KIND_COL[p.kind] || '#475569'}">${esc(p.kind || 'part')}</span>${p.stl ? `<span class="stepno">${esc(p.stl)}</span>` : ''}</div>
      <h4 style="margin:2px 0 6px;font-size:15px">${esc(partLabel(id))}</h4>
      ${b ? `<div class="small muted">Bill of Materials: ${esc(shortName(b.name))} · ${b.qty} · <b>$${b.price?.toFixed(2)}</b> ${b.url ? `· <a href="${esc(b.url)}" target="_blank" rel="noopener">vendor</a>` : ''}</div>` : ''}
      ${st ? `<div class="nav2" style="margin-top:10px"><button data-go="${k}">Show ${st.ch === 'hw' || st.ch === 'test' ? `${esc(chapterOf(st.ch).name)} step ${st.n}` : esc(st.title)}</button></div>` : ''}`;
  }
  pop.innerHTML = html; pop.style.display = 'block';
  const W = window.innerWidth, H = window.innerHeight;
  pop.style.left = clamp(x + 14, 8, W - 300) + 'px'; pop.style.top = clamp(y + 14, 8, H - pop.offsetHeight - 8) + 'px';
  pop.querySelector('[data-go]')?.addEventListener('click', e => { const kk = +e.target.dataset.go; goStep(kk, false); setTime(tl.steps[kk].t0 + tl.steps[kk].dur - 0.06); pop.style.display = 'none'; });
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
    const dr = h.object.geometry?.drawRange; if (dr && dr.count !== Infinity && h.faceIndex != null && h.faceIndex * 3 >= dr.count) continue;
    const id = o.userData.partId; if (id && id !== 'printBed') return id;
  }
  return null;
}
let downAt = null, hoverT = 0;
canvas.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', e => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return;
  const id = pick(e); if (id) { showInfo(id, e.clientX, e.clientY); if (!id.startsWith('wire:')) flash(id); } else { pop.style.display = 'none'; pinned = null; }
});
canvas.addEventListener('pointermove', e => {
  if (e.buttons || performance.now() - hoverT < 60) return; hoverT = performance.now();
  const id = pick(e); canvas.style.cursor = id ? 'pointer' : '';
  if (id) {
    const label = id.startsWith('wire:') ? (() => { const sp = wires.find(w => w.userData.partId === id).userData.spec; return `${esc(wireTitle(sp))}<small>${esc(wireEnds(sp))}</small>`; })() : `${esc(partLabel(id))}<small>click for details</small>`;
    tip.innerHTML = label; tip.style.left = e.clientX + 'px'; tip.style.top = e.clientY + 'px'; tip.style.opacity = 1;
  } else tip.style.opacity = 0;
});
canvas.addEventListener('pointerleave', () => { tip.style.opacity = 0; });
let flashes = {};
function flash(id) { flashes[id] = performance.now(); }
function worldCenter(id) { const o = parts[id].obj; o.updateMatrixWorld(true); return new THREE.Box3().setFromObject(o); }
function focusPart(id) {
  const p = parts[id]; if (!p) return;
  if (!p.obj.visible) { const k = tl.parts[id]?.firstStep; if (k != null) { goStep(k, false); setTime(tl.steps[k].t0 + tl.steps[k].dur - 0.06); frameBody(0.016, true); } }
  const bb = worldCenter(id); if (bb.isEmpty()) return;
  const c = bb.getCenter(new THREE.Vector3()), size = bb.getSize(new THREE.Vector3()).length();
  const dist = clamp(size * 2.4, 90, 700);
  const dir = S.camera.position.clone().sub(S.controls.target).normalize();
  camTween = { p0: S.camera.position.clone(), t0: S.controls.target.clone(), p1: c.clone().addScaledVector(dir, dist), t1: c, s: performance.now(), d: 900 };
  userCam = true; flash(id);
}
function focusWire(w) {
  const k = stepIndex(lastGrowStep(w.userData.spec)); if (k >= 0 && t < tl.steps[k].t0 + tl.steps[k].dur) { setTime(tl.steps[k].t0 + tl.steps[k].dur - 0.06); playing = false; syncPlay(); frameBody(0.016, true); }
  const c = w.userData.curve.getPointAt(0.85).applyMatrix4(w.matrix);
  const dir = S.camera.position.clone().sub(S.controls.target).normalize();
  camTween = { p0: S.camera.position.clone(), t0: S.controls.target.clone(), p1: c.clone().addScaledVector(dir, 260), t1: c, s: performance.now(), d: 900 };
  userCam = true; wireFlash = { w, s: performance.now() };
}
let wireFlash = null;

// ------------------------------------------------------------------ labels
const labelsEl = $('#labels'); const labelPool = [];
function updateLabels(k) {
  const s = tl.steps[k]; const list = [];
  if (tools.labels && k > 0) {
    const seen = new Set();
    for (const id of s.adds || []) {
      const p = parts[id]; if (!p || !p.obj.visible || p.kind === 'virtual' || id.startsWith('prep:') || /^(sc|so|bs_)/.test(id)) continue;
      const key = partLabel(id);
      if (seen.has(key)) continue; seen.add(key); list.push([id, key]); if (list.length >= 6) break;
    }
  }
  const W = labelsEl.clientWidth, H = labelsEl.clientHeight;
  while (labelPool.length < list.length) { const d = document.createElement('div'); d.className = 'lbl'; d.innerHTML = '<i></i><span></span>'; labelsEl.appendChild(d); labelPool.push(d); }
  const placed = [];
  labelPool.forEach((d, i) => {
    if (i >= list.length) { d.style.opacity = 0; return; }
    const [id, key] = list[i]; const bb = worldCenter(id);
    const v = new THREE.Vector3((bb.min.x + bb.max.x) / 2, bb.max.y + 6, (bb.min.z + bb.max.z) / 2); v.project(S.camera);
    if (v.z > 1) { d.style.opacity = 0; return; }
    const x = (v.x + 1) / 2 * W; let y = (1 - v.y) / 2 * H - 16;
    const w = key.length * 6.6 + 30, h = 25;
    for (let pass = 0; pass < 6; pass++) { let hit = false; for (const r of placed) if (Math.abs(r.x - x) < (r.w + w) / 2 && Math.abs(r.y - y) < h) { y = r.y - h; hit = true; } if (!hit) break; }
    placed.push({ x, y, w });
    d.querySelector('span').textContent = key; d.style.opacity = 1;
    d.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
    d.querySelector('i').style.background = parts[id].kind === 'printed' ? 'var(--accent)' : KIND_COL[parts[id].kind] || '#475569';
  });
}

// ------------------------------------------------------------------ effects: LCD (firmware strings), pumps, stirring, optics, incubation
// batch growth curve for the INCUBATE run (Testing 19-21): no inputs or outputs
function simulateIncubation() {
  const n = 600, od = new Float32Array(n), hours = 16;
  for (let i = 0; i < n; i++) { const h = i / (n - 1) * hours; od[i] = 0.0001 + 0.85 / (1 + Math.exp(-(h - 6.5) * 0.95)); }
  return { od, hours };
}
const lcd = parts.lcd.obj.userData;
const chart = $('#chart'), cx = chart.getContext('2d'), readout = $('#readout');
let stirAngle = 0, lastLcdTick = -1;
let chartInk = '#64748b', chartAcc = '#0d9488';
function chartColors() { const css = getComputedStyle(document.documentElement); chartInk = css.getPropertyValue('--muted').trim() || chartInk; chartAcc = css.getPropertyValue('--accent').trim() || chartAcc; }
const clearCol = new THREE.Color('#eef6ff'), mediaCol = new THREE.Color('#f1df9a'), turbCol = new THREE.Color('#cfae5c');
const MENU = ['TURBIDOSTAT', 'INCUBATE', 'PRIME PUMPS', 'HEATER TEST'];
function menuScreen(target, local) { const i = Math.min(MENU.indexOf(target), Math.floor(local / 0.9)); return ['EasyEVO Type D', '>' + MENU[Math.max(0, i)], '', '']; }
const probeMode = k => { for (let i = k; i >= 0; i--) if (tl.steps[i].fx?.probe) return tl.steps[i].fx.probe; return 'needle'; };
const _m4 = new THREE.Matrix4(), _inv = new THREE.Matrix4();
const restNeedle = new THREE.Matrix4().compose(new THREE.Vector3(-120, 6, 40), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)), new THREE.Vector3(1, 1, 1));
let lastProbeKey = '';
function updateProbe(k, ev, intro) {
  const mode = intro ? 'needle' : probeMode(k);
  const nW = mode === 'needle' ? (ev.worldOf('needleHdr') || parts.needleHdr.obj.matrix) : restNeedle;
  const rW = ev.worldOf('robot') || _m4.identity();
  const key = nW.elements.map(v => v.toFixed(2)).join() + rW.elements.map(v => v.toFixed(2)).join();
  if (key === lastProbeKey) return; lastProbeKey = key;
  _inv.copy(rW).invert();
  wires.retargetProbe(nW, _inv);
}
function effects(k, local, dt, ev) {
  const s = tl.steps[k], fx = s.fx || {};
  const lcdTick = Math.floor(performance.now() / 250) !== lastLcdTick; if (lcdTick) lastLcdTick = Math.floor(performance.now() / 250);
  // grow curve progress (Testing 19 runs the night; 20-21 show the finished curve)
  const gu = fx.grow ? clamp(local / Math.max(1, s.dur - 2), 0, 1) : fx.chart ? 1 : k === 0 ? 0.62 : 0;
  const gi = Math.floor(gu * (growthCurve.od.length - 1)), OD = growthCurve.od[gi];
  if (lcdTick) {
    const sc = fx.lcd;
    const pumpNo = fx.pumps === 'jog' ? (local < 1 ? 1 : 1 + Math.floor(jogPhase(local).i)) : 1;
    if (!sc || !parts.lcd.obj.visible) lcd.setText(['', '', '', ''], false);
    else if (sc === 'menuPrime') lcd.setText(menuScreen('PRIME PUMPS', local), true);
    else if (sc === 'menuHeater') lcd.setText(menuScreen('HEATER TEST', local), true);
    else if (sc === 'menuIncubate') lcd.setText(menuScreen('INCUBATE', local), true);
    else if (sc === 'prime') lcd.setText(['UP or DOWN to pump', 'SEL for next pump', 'Hold SEL to Exit', 'Current Pump:' + pumpNo], true);
    else if (sc === 'heater') { const u = clamp(local / 8, 0, 1); lcd.setText(['HEATER TEST', 'Ambient Temp:' + (22.5 + Math.sin(local) * 0.03).toFixed(2), 'Media Temp:' + (22.1 - u * 20.9).toFixed(2), 'PID:' + Math.round(40 + u * 180) + ' HTR:' + (24 + u * 9).toFixed(2)], true); }
    else if (sc === 'incubate') { const up = 28 + Math.floor(k === 0 ? performance.now() / 1000 % 60 : local); const ir = Math.round(37883 * Math.pow(10, -OD)); lcd.setText(['UPTIME:' + up, 'Amb:22.50 Med:23.44', 'Heater:30.87 PWM:17', `IR:${ir} OD:${OD.toFixed(4)}`], true); }
  }
  // stirring (fan + stir bar) and the vortex
  if (fx.stir) stirAngle += dt * 14;
  parts.fan.obj.userData.rotor && (parts.fan.obj.userData.rotor.rotation.y = stirAngle);
  parts.stirBar.obj.children[0] && (parts.stirBar.obj.rotation.y = 0);
  if (parts.stirBar.obj.visible) { const m = parts.stirBar.obj.matrix; const r = new THREE.Matrix4().makeRotationY(-stirAngle); const p = new THREE.Vector3().setFromMatrixPosition(m); m.copy(r).setPosition(p); }
  media.geometry = fx.stir && parts.media.obj.visible ? vortexGeo : flatGeo;
  const mm = media.material;
  const look = fx.media || (k === 0 ? 'culture' : 'water');
  if (look === 'culture') { const kk = clamp(OD / 0.85, 0, 1); mm.color.copy(mediaCol).lerp(turbCol, kk); mm.opacity = 0.4 + kk * 0.5; mm.roughness = 0.1 + kk * 0.45; }
  else if (look === 'media') { mm.color.copy(mediaCol); mm.opacity = 0.42; mm.roughness = 0.08; }
  else { mm.color.copy(clearCol); mm.opacity = 0.3; mm.roughness = 0.05; }
  // 940nm LED and the light path to the TSL2591
  const odOn = !!fx.od && parts.odLed.obj.visible;
  parts.odLed.obj.userData.setOn(odOn ? 1 : 0);
  odGlow.material.opacity = odOn ? 0.75 : 0; if (odOn) odGlow.position.copy(odGlowLocal).applyMatrix4(parts.odLed.obj.matrix);
  beamMat.opacity = odOn ? 0.3 * Math.exp(-OD * 1.6) : 0;
  for (let i = 0; i < 6; i++) parts['sixLed' + i].obj.userData.setOn(0);
  // pumps: PRIME PUMPS jogs each pump in turn (WST runs twice as long); calibration dispenses from pump NEU
  const active = new Set();
  if (fx.pumps === 'jog' && local > 1) active.add(jogPhase(local).i);
  if (fx.pumps === 'cal' && local > 0.8) active.add(0);
  for (let i = 0; i < 4; i++) {
    const o = parts['pump' + i].obj; if (!o.visible || !active.has(i)) continue;
    o.matrix.elements[12] += Math.sin(performance.now() * 0.09 + i) * 0.22;
  }
  let si = 0;
  if (fx.pumps === 'cal' && active.has(0)) for (const id of ['calTubeIn', 'calTubeOut']) {
    const tube = parts[id]?.obj; if (!tube?.visible) continue; const c = tube.children[0] && tube.userData.curve;
    if (!c) continue;
    for (let j = 0; j < 5 && si < slugs.length; j++) { const u = (local * 0.18 + j / 5) % 1; slugs[si].position.copy(c.getPointAt(id === 'calTubeIn' ? 1 - u : u)).applyMatrix4(tube.matrix); slugs[si].visible = true; si++; }
  }
  for (; si < slugs.length; si++) slugs[si].visible = false;
  // readout + charts (Testing 19-21)
  const showRo = !!(fx.grow || fx.chart);
  readout.hidden = !showRo;
  if (showRo && lcdTick) { drawChart(fx.chart === 'temp' ? 'temp' : 'od', gu); $('#roOD').textContent = OD.toFixed(4); $('#roT').textContent = '30.0°'; $('#roPump').textContent = (gu * growthCurve.hours).toFixed(1) + ' h'; $('#roCycle').textContent = Math.round(37883 * Math.pow(10, -OD)); }
}
function jogPhase(local) { const per = [2.3, 4.6, 2.3, 2.3], tot = per.reduce((a, b) => a + b); let u = (local - 1) % tot, i = 0; while (u > per[i]) { u -= per[i]; i++; } return { i, u }; }
function drawChart(kind, gu) {
  const W = chart.width, H = chart.height, pad = 34; cx.clearRect(0, 0, W, H);
  const ink = chartInk, acc = chartAcc, n = growthCurve.od.length, upto = Math.max(2, Math.floor(gu * (n - 1)));
  const X = i => pad + (W - pad - 8) * i / (n - 1);
  cx.strokeStyle = ink; cx.globalAlpha = 0.25; cx.lineWidth = 1; cx.beginPath();
  for (let g = 0; g <= 4; g++) { const yy = 10 + (H - 34) * g / 4; cx.moveTo(pad, yy); cx.lineTo(W - 8, yy); } cx.stroke(); cx.globalAlpha = 1;
  cx.fillStyle = ink; cx.font = '600 14px Inter, sans-serif';
  if (kind === 'od') {
    const Y = v => H - 24 - (H - 34) * v / 1.0;
    for (let g = 0; g <= 4; g += 2) cx.fillText((g * 0.25).toFixed(1), 0, Y(g * 0.25) + 5);
    cx.strokeStyle = acc; cx.lineWidth = 3; cx.lineJoin = 'round'; cx.beginPath();
    for (let i = 0; i <= upto; i += 2) { const xx = X(i), yy = Y(growthCurve.od[i]); i ? cx.lineTo(xx, yy) : cx.moveTo(xx, yy); } cx.stroke();
    cx.fillText('OD940 vs UPTIME', W - 150, 20);
  } else {
    const Y = v => H - 24 - (H - 34) * (v - 15) / 30;
    for (const v of [15, 30, 45]) cx.fillText(v + '°', 0, Y(v) + 5);
    const series = [['#ef4444', i => 22 + 18 * (1 - Math.exp(-i / 25)) + Math.sin(i * 0.4) * 0.6, 'heater plate'], [acc, i => 22 + 8 * (1 - Math.exp(-i / 45)) + Math.sin(i * 0.3) * 0.15, 'media'], [ink, i => 22.5 + Math.sin(i * 0.02) * 0.3, 'ambient']];
    series.forEach(([col, f, name], j) => { cx.strokeStyle = col; cx.lineWidth = 2.5; cx.beginPath(); for (let i = 0; i <= upto; i += 3) { const xx = X(i), yy = Y(f(i)); i ? cx.lineTo(xx, yy) : cx.moveTo(xx, yy); } cx.stroke(); cx.fillStyle = col; cx.fillText(name, W - 120, 20 + j * 16); });
  }
}

// ------------------------------------------------------------------ main loop
buildStepList(); buildTimeline();
const startId = (location.hash || '').slice(1);
const startK = Math.max(0, stepIndex(startId));
if (startK > 0) setTime(tl.steps[startK].t0 + tl.steps[startK].dur - 0.06);
renderCard(tl.stepAt(t)); lastStep = tl.stepAt(t);
window.addEventListener('hashchange', () => {
  const k = stepIndex(location.hash.slice(1));
  if (k >= 0 && k !== tl.stepAt(t)) { goStep(k, false); setTime(tl.steps[k].t0 + (k ? tl.steps[k].dur - 0.06 : 0)); }
});
setTool('rotate', false);
const clock = new THREE.Clock();
const head = $('#tlHead');
S.renderer.shadowMap.autoUpdate = false; let lastVis = -1, shadowKick = 3;
const baseDpr = S.renderer.getPixelRatio(); let dpr = baseDpr, fpsAcc = 0, fpsN = 0, fpsT = 0, slowRuns = 0;
function adapt(dt) { if (document.hidden || dt > 0.25) { fpsAcc = fpsN = fpsT = 0; return; } fpsAcc += dt; fpsN++; fpsT += dt; if (fpsT < 2) return; const fps = fpsN / fpsAcc; fpsAcc = fpsN = fpsT = 0;
  slowRuns = fps < 26 ? slowRuns + 1 : 0;
  let nd = dpr; if (slowRuns >= 2 && dpr > 0.85) { nd = Math.max(0.85, dpr - 0.15); slowRuns = 0; } else if (fps > 52 && dpr < baseDpr) nd = Math.min(baseDpr, dpr + 0.15);
  if (nd !== dpr) { dpr = nd; S.renderer.setPixelRatio(dpr); S.resize(); } }
function frame() { frameBody(clock.getDelta()); requestAnimationFrame(frame); }
function camFor(k) {
  const s = tl.steps[k]; if (!s.cam2) return cameraAt(tl, t);
  const local = t - s.t0, at = s.dur * 0.55;
  if (local < at) return cameraAt(tl, t);
  const a = cameraAt(tl, t), v = typeof s.cam2 === 'string' ? tl.views[s.cam2] : s.cam2, u = clamp((local - at) / 1.6, 0, 1), e = u * u * (3 - 2 * u);
  return { pos: a.pos.clone().lerp(new THREE.Vector3(...v[0]), e), tgt: a.tgt.clone().lerp(new THREE.Vector3(...v[1]), e), k };
}
function frameBody(rawDt, noRender = false) {
  const dt = Math.min(0.05, rawDt); adapt(rawDt);
  if (playing) {
    t += dt * speed;
    if (stopAt != null && t >= stopAt) { t = stopAt; playing = false; stopAt = null; syncPlay(); }
    if (t >= tl.total) { t = tl.total; playing = false; syncPlay(); }
  }
  const k = tl.stepAt(t), s = tl.steps[k];
  if (k !== lastStep) { renderCard(k); lastStep = k; if (!scrubbing) userCam = false; camTween = null; }
  const res = applyTimeline(tl, t, { hideWires: !tools.wires }); const glow = res.glow;
  if (res.moving || res.vis !== lastVis || shadowKick > 0) { S.renderer.shadowMap.needsUpdate = true; shadowKick = Math.max(0, shadowKick - 1); }
  lastVis = res.vis;
  const local = k === 0 ? clock.elapsedTime : t - s.t0;
  if (wires.some(w => w.userData.spec.route === 'probe' && w.userData.f > 0)) updateProbe(k, res.ev, k === 0);
  effects(k, local, dt, res.ev);
  const now = performance.now();
  for (const id in flashes) { const a = (now - flashes[id]) / 1400; if (a > 1) delete flashes[id]; else glow[id] = Math.max(glow[id] || 0, Math.sin(a * Math.PI * 3) * 0.5 + 0.5); }
  const next = new Set(Object.keys(glow).filter(id => glow[id] > 0.01 && parts[id].obj.visible));
  for (const id of glowing) if (!next.has(id)) setGlow(id, 0);
  for (const id of next) setGlow(id, glow[id]);
  glowing = next;
  applyGhost(tools.xray ? 0 : (s.fx?.ghost || 0), dt);
  if (wireFlash) { const a = (now - wireFlash.s) / 2000; if (a > 1) wireFlash = null; else { wireFlash.w.visible = true; wireFlash.w.userData.setGrow(Math.min(1, a * 3)); } }
  if (camTween) {
    const u = clamp((now - camTween.s) / camTween.d, 0, 1), e = u * u * (3 - 2 * u);
    S.camera.position.lerpVectors(camTween.p0, camTween.p1, e); S.controls.target.lerpVectors(camTween.t0, camTween.t1, e);
    if (u >= 1) camTween = null;
  } else if (!userCam) {
    const cam = camFor(k);
    if (tools.rotate) orbitAng += dt * 0.12; else orbitAng *= 0.96;
    const off = cam.pos.clone().sub(cam.tgt).applyAxisAngle(new THREE.Vector3(0, 1, 0), orbitAng);
    S.camera.position.copy(cam.tgt).add(off); S.controls.target.copy(cam.tgt);
  } else if (tools.rotate) { const off = S.camera.position.clone().sub(S.controls.target).applyAxisAngle(new THREE.Vector3(0, 1, 0), dt * 0.12); S.camera.position.copy(S.controls.target).add(off); }
  S.controls.update();
  updateLabels(k);
  const pct = t / tl.total * 100; head.style.left = pct + '%'; fill.style.width = pct + '%';
  $('#tpTime').textContent = `${fmtTime(t)} / ${fmtTime(tl.total)}`;
  if (!noRender) S.renderer.render(S.scene, S.camera);
}
ldFill.style.width = '100%';
frameBody(0.016);
setTimeout(() => { $('#loader').classList.add('done'); document.body.classList.add('ready'); }, 120);
requestAnimationFrame(frame);
window.__chartColors = chartColors; chartColors();
// dev helpers: render the 3D view and post it to the local dev server
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
window.openevo = { scan, shot, capture, timing: { assembly: T1 - T0, wires: T2 - T1, total: performance.now() - T0 }, S, parts, tl, wires, setTime: x => setTime(x), goStep, frameBody, get t() { return t; } };

// ------------------------------------------------------------------ print bed layout ("3D Printed Modules")
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
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d');
  g.fillStyle = '#2a2d33'; g.fillRect(0, 0, 256, 256); g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 2;
  for (let i = 0; i <= 256; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); }
  const tex = new THREE.CanvasTexture(cv); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set((totalW + 50) / 100, (totalD + 50) / 100); tex.colorSpace = THREE.SRGBColorSpace;
  const plate = new THREE.Mesh(new THREE.BoxGeometry(totalW + 50, top, totalD + 50), [M.aluDark, M.aluDark, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }), M.aluDark, M.aluDark, M.aluDark]);
  plate.receiveShadow = true; plate.name = 'Print bed';
  const grp = new THREE.Group(); grp.add(plate); grp.position.set(0, top / 2, oz + totalD / 2); grp.name = 'Print bed';
  grp.userData.partId = 'printBed'; grp.traverse(o => o.userData.partId = 'printBed'); root.add(grp); grp.updateMatrixWorld(true);
  parts.printBed = { id: 'printBed', obj: grp, name: 'Print bed', kind: 'fixture', frame: null };
  return { poses };
}
