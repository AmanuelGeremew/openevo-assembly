// Replacing the DC peristaltic pump motors on an assembled OpenEvo. The Assembly Manual has no replacement
// procedure, so these steps undo and repeat its pump steps (Hardware Mounting 29, 30 and 69; Function
// Testing 1-5, with the firmware's calibration menu in place of steps 6-7). Steps taken from the manual
// carry its text word for word (js/manual.js); everything else is marked as not in the manual.
// `sel` is the list of pumps being replaced (0-3 = M1-M4).
import { MANUAL } from '../manual.js';

export const CHAPTERS = [
  { id: 'start', name: 'Before you start', color: '#64748b' },
  { id: 'out', name: 'Take the old pump out', color: '#dc2626' },
  { id: 'prep', name: 'Prepare the new pump', color: '#2563eb' },
  { id: 'in', name: 'Install the new pump', color: '#7c3aed' },
  { id: 'test', name: 'Test and recalibrate', color: '#0d9488' },
];

// camera presets [position, target] (world mm; the robot's LCD faces +z)
export const VIEWS = {
  hero: [[420, 320, 420], [10, 50, -50]],
  back: [[330, 230, -560], [70, 30, -235]],
  pumpFront: [[190, 250, 30], [-5, 40, -72]],
  tubesBench: [[330, 300, 150], [130, 15, -40]],
  identify: [[-200, 360, 110], [0, 25, -90]],
  shield: [[60, 230, -390], [0, 40, -120]],
  lift: [[360, 380, 170], [70, 85, -95]],
  bench: [[360, 220, 280], [215, 20, 85]],
  seat: [[-140, 430, 330], [40, 80, -60]],
  lcd: [[90, 120, 330], [0, 40, 125]],
  calibL: [[-380, 260, 190], [-95, 70, -45]],
  calibR: [[380, 260, 190], [95, 70, -45]],
};

// Pump wires on the Motor Shield, as the step 69 photo shows them: each motor across its own pair of
// terminals, the unmarked (+) wire in the outer hole and the marked wire in the inner hole; the GND
// position between M1 and M2 (and between M3 and M4) stays empty.
export const TERM = [['M1a', 'M1b'], ['M2b', 'M2a'], ['M3a', 'M3b'], ['M4b', 'M4a']];
// the screwdriver works outer hole first when loosening and inner hole first when tightening, so it never leans over a wire still in place
const LOOSEN_ORDER = ['M1a', 'M1b', 'M2b', 'M2a', 'M3a', 'M3b', 'M4b', 'M4a'], TIGHTEN_ORDER = ['M1b', 'M1a', 'M2a', 'M2b', 'M3b', 'M3a', 'M4a', 'M4b'];
export const TERM_LABEL = { M1a: 'M1 +', M1b: 'M1 −', M2a: 'M2 −', M2b: 'M2 +', M3a: 'M3 +', M3b: 'M3 −', M4a: 'M4 −', M4b: 'M4 +' };
// speeds in the repository's CONFIG.TXT (pumpOneSpeed ... pumpFourSpeed)
export const CONFIG_SPEED = [1161, 1140, 1140, 1160];
// timing of the calibration step (seconds): priming in PRIME PUMPS, then CALIBRATE PUMP n (firmware: SELECT
// steps to the next pump, DOWN runs the pump for 1 s, holding SELECT leaves a state, DOWN on the menu scrolls)
export function calTimes(p, from) {
  const presses = (p - from + 4) % 4, runAt = presses * 0.5 + 0.4, runEnd = runAt + 4.2;
  const scroll = (4 + p) * 0.5, openAt = 1.0 + scroll + 0.4, dispAt = openAt + 1.2;
  return { presses, runAt, runEnd, primeDur: runEnd + 0.5, scroll, openAt, dispAt, menuDur: dispAt + 11 + 1.5 };
}

const OLD = i => 'pump' + i, NEW = i => 'newPump' + i;
const mark = (name, delay = 0) => ['stage', 'tmark', { name, at: 0, parallel: true, delay }];

export function makeSteps(sel, ctx) {
  const one = sel.length === 1, p0 = sel[0];
  const Mn = i => `M${i + 1}`;
  const tubes = sel.flatMap(i => [`pumpTube${i}in`, `pumpTube${i}out`]);
  const used = t => sel.some(i => TERM[i].includes(t)), terms = LOOSEN_ORDER.filter(used), termsIn = TIGHTEN_ORDER.filter(used);
  const wiresAt = t => sel.flatMap(i => [TERM[i][0] === t ? `${i}P` : null, TERM[i][1] === t ? `${i}N` : null]).filter(Boolean);
  const props = sel.flatMap(i => [`prep:new_pump${i}P`, `prep:new_pump${i}N`]);
  const side = p0 >= 2 ? 'R' : 'L';
  const rig = ctx.rigIds(p0);
  const termLabels = terms.map(t => ({ at: ctx.screw[t], text: TERM_LABEL[t] }));
  const aside = ctx.aside || { probe: false, braids: [] };
  const ct = calTimes(p0, sel[sel.length - 1]);
  const pumpOf = id => +id.match(/\d/)[0];

  // screwdriver over the Motor Shield terminals; dir +1 loosens (counter-clockwise from above), -1 tightens
  function screwRun(dir, perTerm, order) {
    const A = []; let yaw = 0;
    const pose = (t, up) => ctx.screwPose(t, up, yaw);
    A.push(['in', 'screwdriver', { to: pose(order[0], true), from: [0, 90, 0], dur: 1.0 }]);
    order.forEach((t, k) => {
      if (k > 0) A.push(['move', 'screwdriver', pose(t, true), { dur: 0.5, arc: 0 }]);
      if (perTerm.before) A.push(...perTerm.before(t));
      A.push(['move', 'screwdriver', pose(t, false), { dur: 0.4, arc: 0 }]);
      for (let j = 0; j < 3; j++) { yaw += dir * 110; A.push(['move', 'screwdriver', pose(t, false), { dur: 0.34, arc: 0 }]); }
      if (perTerm.after) A.push(...perTerm.after(t));
      A.push(['move', 'screwdriver', pose(t, true), { dur: 0.36, arc: 0 }]);
    });
    A.push(['out', 'screwdriver', { dir: [0, 120, 0] }]);
    return A;
  }
  // a tube segment worked off (or onto) its nozzle: slid along the nozzle while tipped back, then lifted
  const offPath = (id, frame) => [ctx.tilt(id, frame, 4, -7, 0), ctx.tilt(id, frame, 8, -20, 0), ctx.tilt(id, frame, 8, -20, 100)];
  const benchTube = k => ({ bench: [182 + k * 17, -24], r: [90, 0, 0] }), benchTubeHigh = k => ({ ...benchTube(k), y: 205 });
  // pump M2's outlet segment comes off after its inlet (it drifts toward the inlet's place, away from the wires in front of it)
  const tubeDelay = (id, k) => k * 0.22 + (id === 'pumpTube1out' && sel.includes(1) ? 1.6 : 0);

  const S = [];
  const add = st => S.push({ minDur: 6, ...st });
  const asideNames = [aside.probe ? 'the thermistor needle cable' : null, ...aside.braids.map(j => `pump ${Mn(j)}’s braided wires`)].filter(Boolean);

  // ------------------------------------------------------------ Before you start
  add({ id: 'start', ch: 'start', title: 'The machine as it is', cam: 'hero', fx: { lcd: 'menu' },
    note: `This shows how to replace ${one ? `pump ${Mn(p0)}` : 'the DC peristaltic pump motors'} on an OpenEvo that is already built. The Assembly Manual has no replacement procedure, so these steps undo and repeat its pump steps: Hardware Mounting 29, 30 and 69, and Function Testing 1–5. The firmware’s calibration menu takes the place of Function Testing 6–7.\n\nSteps from the manual show its text word for word. Everything else is marked “Not in the manual”.`,
    do: [['glow', sel.map(OLD), { stag: 0.2, dur: 2 }]], labels: sel.map(i => ({ part: OLD(i), text: Mn(i) })) });

  // ------------------------------------------------------------ Take the old pump out
  add({ id: 'power', ch: 'out', title: 'Turn it off and unplug it', cam: 'back', notIn: true, fx: { lcd: 'menu' },
    note: 'Turn off the Rocker Switch, then unplug the 12v 5A Power Supply from the barrel jack at the back of Module E (motherboard). Keep it unplugged until the new pump is wired in.',
    do: [['glow', 'rocker', { dur: 1.2 }], mark('t|lcdOff'), ['move', 'psuCable', { shift: [0, 0, -34] }, { arc: 0, dur: 1.3 }]],
    labels: [{ part: 'rocker', text: 'Rocker Switch' }, { part: 'jack', text: 'barrel jack' }] });

  add({ id: 'identify', ch: 'out', title: one ? `Find pump ${Mn(p0)}` : 'Which pump is which', cam: 'identify', minDur: 7,
    src: [{ ref: 'Hardware Mounting step 69 (first sentences)', text: MANUAL.hardware[69].split('. ').slice(0, 2).join('. ') + '.' }],
    note: 'Not in the manual: in the firmware in the repository (easyEVOTypeD.ino), pump 1 is the neutral media line, 2 the positive selection line, 3 the negative selection line and 4 the waste line (wastePumpNumber = 4). Function Testing step 3 lists them left to right as NEU, WST, POS, NEG instead. Either way, a new pump in the same place, with the same tubing back on it, changes nothing.',
    do: [['glow', sel.map(OLD), { stag: 0.25, dur: 2 }]], labels: [0, 1, 2, 3].map(i => ({ part: OLD(i), text: Mn(i), badge: true })) });

  add({ id: 'tubing', ch: 'out', title: one ? 'Take the tubing off the pump' : 'Take the tubing off the pumps', cam: 'pumpFront', cam2: 'tubesBench', notIn: true, minDur: 7,
    note: `${aside.probe ? 'The thermistor needle cable runs over pump M2: unplug it from the needle first (Function Testing step 18 plugs it back in) and lay it back over the motherboard. ' : ''}Work the 60mm tube segments off the ${one ? 'pump’s two nozzles' : 'nozzles of all four pumps'}. If media lines are connected to their luer locks, unscrew those first and note which line went to which pump. Keep the segments with their Barb-To-Male Luer Lock Adapters: they go back on the new ${one ? 'pump' : 'pumps'}.`,
    do: [...(aside.probe ? [mark('t|probeUp'), ['wait', 1.4]] : []),
      ...tubes.map((id, k) => ['move', id, benchTube(k), { delay: tubeDelay(id, k), parallel: k < tubes.length - 1, arc: 0, dur: 2.6, via: [...offPath(id, OLD(pumpOf(id))), benchTubeHigh(k)] }])] });

  add({ id: 'unscrew', ch: 'out', title: 'Disconnect it from the Motor Shield', cam: 'shield', notIn: true,
    src: [{ ref: 'Hardware Mounting step 69 (where the wires go)', text: MANUAL.hardware[69].split('. ').slice(2, 5).join('. ') + '.' }],
    note: `Loosen the ${one ? 'two screw terminals' : 'eight screw terminals'} that hold the pump wires and pull the wires out. Each pump has its own pair. Step 69 calls the inner holes “the shared ground”, but its photo shows each pump’s two wires in that pump’s own pair and the GND hole between the M1 and M2 pairs (and between M3 and M4) empty. This model follows the photo. A small flathead screwdriver fits these terminals.`,
    labels: termLabels,
    do: screwRun(+1, { after: t => wiresAt(t).map((w, k) => mark(`w|pump${w}|0.12|1.3`, k * 0.15)) }, terms) });

  add({ id: 'lift', ch: 'out', title: one ? 'Lift the pump out of Module G' : 'Lift the pumps out of Module G', cam: 'lift', notIn: true,
    note: `${aside.braids.length ? `Push ${aside.braids.map(j => `pump ${Mn(j)}’s braided wires`).join(' and ')} back, out of the way. ` : ''}Lift ${one ? 'the pump' : 'each pump'} straight up out of Module G (DC motor rail), bringing ${one ? 'its' : 'their'} braided wires with ${one ? 'it' : 'them'}, and set ${one ? 'it' : 'them'} aside.`,
    do: [...(aside.braids.length ? [mark('t|pushOn'), ['wait', 1.2]] : []),
      ['move', sel.map(OLD), { off: [0, 70, 0] }, { arc: 0, dur: 1.2, stag: 0.3 }], ['wait', 0.6], ['out', sel.map(OLD), { dir: [0, 140, 0], stag: 0.15, dur: 1.2 }]] });

  // ------------------------------------------------------------ Prepare the new pump (Hardware Mounting 29-30)
  add({ id: 'solder', ch: 'prep', title: 'Wire the new pump', cam: 'bench', minDur: 8,
    src: [{ ref: 'Hardware Mounting step 29', text: MANUAL.hardware[29] }],
    note: `Not in the manual: ${one ? 'for one pump you need two of these wires, not eight. ' : ''}Instead of new wires you could desolder the old pump’s braid and solder it onto the new pump, with the marked wire on the terminal that has no red dot.`,
    do: [mark('t|switch'), ...sel.flatMap(i => [mark(`w|pump${i}P|0|0.001`), mark(`w|pump${i}N|0|0.001`)]),
      ['in', ['kitWire1', 'kitSolder'], { to: id => id === 'kitWire1' ? { bench: [300, 222] } : { bench: [392, 150] }, stag: 0.3 }],
      ['in', sel.map(NEW), { to: id => ({ bench: [182 + pumpOf(id) * 28, 118] }), stag: 0.25 }],
      ['in', props, { row: [98, 22, 7, 0], src: 'kitWire1', stag: 0.12 }],
      ['stage', props, { name: 'stripS', on: false, stag: 0.05, at: 0.3 }], ['stage', props, { name: 'tin', stag: 0.05, at: 0.35 }],
      ['glow', 'kitSolder'],
      ...sel.flatMap((i, k) => [mark(`w|pump${i}P|0.12|1.9`, k * 0.3), mark(`w|pump${i}N|0.12|1.9`, k * 0.3 + 0.12)]),
      ['out', props, { dir: [0, 25, 0], stag: 0.15 }], ['wait', 1.4]] });

  add({ id: 'braid', ch: 'prep', title: 'Mark and braid the wires', cam: 'bench', minDur: 7,
    src: [{ ref: 'Hardware Mounting step 30', text: MANUAL.hardware[30] }],
    do: [mark('t|braidOn', 2.0), ['glow', sel.map(NEW), { stag: 0.2, dur: 2.5 }]] });

  // ------------------------------------------------------------ Install the new pump
  add({ id: 'seat', ch: 'in', title: one ? 'Put the new pump in Module G' : 'Put the new pumps in Module G', cam: 'seat', notIn: true,
    note: `Seat ${one ? 'the new pump where the old one was' : 'each new pump where an old one was'}, with the nozzles facing the same way as the other pumps.${aside.braids.length ? ' Then let the other wires back into place.' : ''}`,
    do: [...sel.map((i, k) => ['move', NEW(i), 'final', { delay: k * 0.35, parallel: k < sel.length - 1, arc: 0, dur: 3.0, via: [{ bench: [182 + i * 28, 118], y: 240 }, { off: [0, 190, 0] }, { off: [0, 70, 0] }] }]), ['out', ['kitWire1', 'kitSolder'], { stag: 0.2 }],
      ...(aside.braids.length ? [mark('t|pushOff'), ['wait', 1.2]] : [])] });

  add({ id: 'connect', ch: 'in', title: 'Connect it to the Motor Shield', cam: 'shield', minDur: 8,
    src: [{ ref: 'Hardware Mounting step 69', text: MANUAL.hardware[69] }],
    note: `Not in the manual: use the same terminals the old ${one ? 'pump' : 'pumps'} used (each pump in its own pair, as in the step 69 photo), tighten each screw and give each wire a light tug.`,
    labels: termLabels,
    do: screwRun(-1, { before: t => [...wiresAt(t).map((w, k) => mark(`w|pump${w}|1|1.4`, k * 0.15)), ['wait', 1.55]] }, termsIn) });

  add({ id: 'tubes', ch: 'in', title: 'Put the tubing back on', cam: 'tubesBench', cam2: 'pumpFront', minDur: 7,
    src: [{ ref: 'Function Testing step 1', text: MANUAL.testing[1] }],
    note: `Not in the manual: the segments you took off can go straight back on; cut new ones only if they are damaged.${aside.probe ? ' Then plug the thermistor needle cable back into the needle.' : ''}`,
    do: [...tubes.map((id, k) => { const i = pumpOf(id); return ['move', id, ctx.onPump(id, NEW(i), [0, 0, 0]), { delay: k * 0.22 + (id === 'pumpTube1in' && sel.includes(1) ? 2.0 : 0), parallel: k < tubes.length - 1, dur: 2.6, via: [benchTubeHigh(k), ...offPath(id, NEW(i)).reverse()] }]; }),
      ...(aside.probe ? [['wait', sel.includes(1) ? 2.2 : 0.2], mark('t|probeDown'), ['wait', 1.6]] : [])] });

  // ------------------------------------------------------------ Test and recalibrate
  add({ id: 'poweron', ch: 'test', title: 'Power on: PRIME PUMPS', cam: 'back', cam2: 'lcd', minDur: 8, fx: { lcd: 'boot' },
    src: [{ ref: 'Function Testing step 2', text: MANUAL.testing[2] }],
    note: 'Not in the manual: first plug the 12v 5A Power Supply back into the barrel jack and turn on the Rocker Switch.',
    do: [['move', 'psuCable', 'final', { arc: 0, dur: 1.3 }], ['glow', 'rocker', { dur: 1.2 }], mark('t|lcdOn')] });

  add({ id: 'prime', ch: 'test', title: 'Check the pump turns the right way', cam: 'pumpFront', minDur: 5 + sel.length * 3, fx: { lcd: 'prime', jog: sel },
    src: [{ ref: 'Function Testing step 3', text: MANUAL.testing[3] }],
    note: 'Not in the manual: this build has no CNC Shield. If a new pump runs backward, turn it off, unplug it, and swap that pump’s two wires between its two terminals on the Motor Shield: swapping a DC motor’s two wires reverses the way it turns. In the repository’s firmware, DOWN runs the current pump BACKWARD (dispense) for 1 second and UP runs it FORWARD (remove) for 2 seconds, whichever pump it is.',
    do: [] });

  add({ id: 'calib', ch: 'test', title: one ? `Recalibrate pump ${Mn(p0)}` : 'Recalibrate the new pumps', cam: 'calib' + side, minDur: 10, fx: { lcd: 'cal', pump: p0, from: sel[sel.length - 1] },
    src: [{ ref: 'Function Testing step 4', text: MANUAL.testing[4] }, { ref: 'Function Testing step 5', text: MANUAL.testing[5] }],
    note: `Function Testing step 7 says you only need to calibrate once “(unless you alter the electronics)”. Not in the manual: a new motor counts as such a change. ${one ? '' : 'Shown here for M1; repeat it for M2, M3 and M4. '}\n\nPrime the pump in PRIME PUMPS first, as step 5 says. Not in the manual: then, instead of editing the code as steps 6–7 describe, use the firmware’s own menu. Hold SELECT to go back to the menu, scroll down to CALIBRATE PUMP ${one ? p0 + 1 : 'n'} and press SELECT to open it, then press SELECT again: the pump dispenses 10 times. UP and DOWN change its Motor Speed by 1. Repeat until 10 dispensations read 10mL.`,
    do: [['in', rig.beaker, { from: [0, 60, 0] }], ['in', [rig.tin, rig.tout], { from: [0, 60, 0], stag: 0.4 }], ['in', [rig.lf0, rig.lf1], { from: [0, 20, 0], stag: 0.3 }],
      ['in', rig.lm, { to: ctx.rigPose(p0, 'prime', 'lm'), from: [0, -20, 0] }], ['in', rig.needle, { to: ctx.rigPose(p0, 'prime', 'needle'), from: [0, -30, 0] }],
      // prime with the needle over the beaker, then hold it in the 15mL conical tube (Function Testing 5)
      mark('t|calStart'), ['wait', ct.primeDur],
      mark('t|toHover'), ['move', [rig.lm, rig.needle], id => ctx.rigPose(p0, 'hover', id === rig.lm ? 'lm' : 'needle'), { arc: 0, dur: 1.4, stag: 0 }],
      ['in', rig.conical, { from: [0, 0, 60] }],
      mark('t|toFinal'), ['move', [rig.lm, rig.needle], 'final', { arc: 0, dur: 1.0, stag: 0 }],
      mark('t|menu'), ['wait', ct.menuDur]] });

  add({ id: 'save', ch: 'test', title: 'Save the calibration', cam: 'lcd', notIn: true, minDur: 9, fx: { lcd: 'save', pump: p0 },
    note: `Hold SELECT to leave CALIBRATE PUMP ${one ? p0 + 1 : 'n'}. The firmware then writes the new Motor Speed to CONFIG.TXT on the microSD card, and reads it back at every start.\n\nFunction Testing steps 11 and 18 format the card. Copy CONFIG.TXT and CYCLER.CSV off it first and put both back afterwards: without CONFIG.TXT the robot stops with “CONFIG READ ERROR!”, and without CYCLER.CSV with “CYCLE PRGM READ ERROR!”.\n\nKeep the Motor Speed between 1024 and 1279. The firmware passes it to the Adafruit Motor Shield library, which only takes 0–255, so only the remainder after dividing by 256 counts: 1140 runs at 116, and 1023 would run at full speed. The repository’s CONFIG.TXT uses 1140–1161.`,
    do: [['wait', 2.5], ['out', [rig.conical, rig.needle, rig.lm, rig.lf1, rig.tout, rig.lf0, rig.tin, rig.beaker], { stag: 0.12 }]] });

  return S;
}
