// The build, step by step, following the OpenEVO Type D Mk4 Assembly Manual
// (manual step numbers in `manual`). Text is a summary of the manual for the viewer.
import { TX, TZ, BENCH } from './assembly.js';

export const CHAPTERS = [
  { id: 'intro', name: 'Overview', color: '#64748b' },
  { id: 'frame', name: 'Frame & console', color: '#2563eb' },
  { id: 'stir', name: 'Stirrer & heater', color: '#e2552f' },
  { id: 'power', name: 'Power & motherboard', color: '#d97706' },
  { id: 'boards', name: 'Circuit boards', color: '#7c3aed' },
  { id: 'mount', name: 'Mounting', color: '#0891b2' },
  { id: 'wiring', name: 'Wiring', color: '#db2777' },
  { id: 'optics', name: 'Sensor bay & optics', color: '#16a34a' },
  { id: 'cast', name: 'Silicone casting', color: '#4f46e5' },
  { id: 'test', name: 'Testing & first run', color: '#0d9488' },
];

// camera presets [position, target]
export const VIEWS = {
  hero: [[430, 300, 470], [0, 55, -40]],
  heroClose: [[330, 250, 360], [0, 70, -40]],
  bed: [[0, 860, 330], [0, 0, -30]],
  rods: [[300, 220, 360], [0, 20, -10]],
  front: [[150, 150, 360], [10, 40, 110]],
  lcdBack: [[200, 170, -10], [20, 45, 118]],
  under: [[280, -230, 330], [0, 0, 80]],
  railC: [[260, 170, 230], [0, 20, 30]],
  bench: [[BENCH.x + 160, 150, BENCH.z + 200], [BENCH.x - 10, 20, BENCH.z + 40]],
  benchHigh: [[BENCH.x + 110, 230, BENCH.z + 200], [BENCH.x - 20, 10, BENCH.z + 20]],
  stirBase: [[150, 130, -140], [TX, 30, TZ]],
  mobo: [[90, 330, -40], [0, 25, -168]],
  moboBack: [[-140, 260, -430], [0, 30, -168]],
  moboLeft: [[-260, 250, -70], [-20, 30, -160]],
  pumps: [[170, 150, 20], [0, 30, -90]],
  sideTop: [[330, 300, -60], [0, 35, -110]],
  tower: [[210, 170, 170], [TX, 80, TZ]],
  towerBack: [[-150, 180, -190], [TX, 80, TZ]],
  towerRight: [[230, 150, -40], [TX, 75, TZ]],
  cast: [[BENCH.x + 150, 200, BENCH.z + 190], [BENCH.x, 55, BENCH.z]],
  bottles: [[80, 360, 330], [-200, 50, 10]],
  test: [[230, 200, 260], [TX, 80, TZ - 10]],
  calib: [[150, 215, 25], [-5, 22, -82]],
  run: [[360, 280, 380], [-20, 75, -40]],
};

// where sub-assemblies sit on the workbench (to the right of the machine) before mounting
export const BENCH_POSES = {
  fan: { p: [160, 0, 70], r: [0, 0, 0] },
  heater: { p: [205, 0, 70], r: [0, 0, 0] },
  thermHeater: { p: [240, 3.2, 70], r: [0, 0, 0] },
  thermoNeedle: { p: [150, 4, 125], r: [0, 0, -90] },
  pump0: { p: [150, 0, -40], r: [0, 0, 0] }, pump1: { p: [178, 0, -40], r: [0, 0, 0] },
  pump2: { p: [206, 0, -40], r: [0, 0, 0] }, pump3: { p: [234, 0, -40], r: [0, 0, 0] },
  mux: { p: [160, 0, 40], r: [0, 0, 0] },
  ledCtl: { p: [215, 0, 40], r: [0, 0, 0] },
  stirCtl: { p: [160, 0, 85], r: [0, 0, 0] },
  cap: { p: [BENCH.x, 73, BENCH.z], r: [180, 0, 0] },
};

const T = (kind, text) => ({ kind, text });

export const STEPS = [
  { id: 'intro', ch: 'intro', title: 'Meet OpenEvo', manual: 'Overview', cam: 'hero',
    body: `<p>OpenEvo is an open-source <b>turbidostat</b>, a small robot that grows microbes continuously and keeps them at a set optical density by swapping in fresh media. Because the cells never stop dividing, it can run long <b>directed-evolution</b> experiments unattended.</p>
<p>This model is built from the team's own files: the real STL geometry of all 26 printed modules, plus the Type D Mk4 assembly manual, the bill of materials and the wiring checklist. Press <b>Play</b> to watch it get built from scratch, or pick any step on the right.</p>`,
    tips: [T('tip', 'Drag to orbit, scroll to zoom, right-drag to pan. Click any part to see what it is.')] },

  { id: 'print', ch: 'intro', title: '3D-print the 26 modules', manual: 'Before you start · 3D printed modules', cam: 'bed', special: 'bed',
    body: `<p>The robot's backbone is printed in matte black PLA. These are the actual print files from the repository, shown in their print orientation. Modules A–G form the frame and motherboard, H–K are the cap mold, L–Q make the sensor bay and reactor, and R–Z are light blockers and media-bottle accessories.</p>
<p>Remove any support material before assembly, especially around the bays of Module L.</p>`,
    tips: [T('tip', 'About 17 dollars of filament covers everything (one 1 kg spool of matte black PLA).')] },

  // ---------------------------------------------------------------- Frame & console
  { id: 'rods', ch: 'frame', title: 'Rails into Module A', manual: 'Step 1', cam: 'rods',
    add: ['modA', 'rodL', 'rodR'], fly: { rodL: [0, 0, -320], rodR: [0, 0, -320] },
    body: `<p>Push the two <b>5 × 300 mm steel rods</b> all the way into Module A, the LCD rail. They form the spine that every other module slides onto.</p>`,
    tips: [T('tip', 'The fit should be tight but removable. If the factory cut is rough, insert and remove the rods a few times to make a smooth friction fit.'), T('tip', 'Set it on a flat surface to check that both rods went fully home.')] },

  { id: 'buttons', ch: 'frame', title: 'Buttons into the faceplate', manual: 'Steps 2–3', cam: 'front',
    add: ['modB', 'btnUp', 'btnSel', 'btnDown'], fly: { modB: [0, 90, 40], btnUp: [0, 28, 28], btnSel: [0, 28, 28], btnDown: [0, 28, 28] },
    body: `<p>Fit two black and one blue <b>waterproof buttons</b> through Module B, the LCD faceplate, and tighten their nuts from behind. The order from top to bottom is <b>BLACK (UP) · BLUE (SELECT) · BLACK (DOWN)</b>, with the solder blades lined up vertically.</p>`,
    tips: [T('tip', 'Fit the button closest to the top rim first, flat side against the wall, then hold the nuts with needle-nose pliers while you turn the others.')] },

  { id: 'btnwires', ch: 'frame', title: 'Button wiring & common ground', manual: 'Steps 4–6', cam: 'lcdBack',
    body: `<p>Solder a bare, tinned wire across one blade of every button to make the <b>common ground</b>. Then solder the signal wires to the other blades:</p>
<ul><li><span class="sw blue"></span>Blue (38 cm) → UP</li><li><span class="sw white"></span>White (37 cm) → SELECT</li><li><span class="sw green"></span>Green (36 cm) → DOWN</li><li><span class="sw black"></span>Black (34 cm) → common ground</li></ul>`,
    tips: [T('tip', 'Route the loose ends through the small slot in Module A and keep them flat in the slot. Laying them blue-white-green-black from left to right gives a tidier fit.')] },

  { id: 'lcd', ch: 'frame', title: 'LCD into the faceplate', manual: 'Steps 5, 7', cam: 'lcdBack',
    add: ['lcd'], fly: { lcd: [0, -55, -55] },
    body: `<p>Press the <b>20×4 I²C LCD</b> into the back of Module B. It's a firm fit. Then seat the faceplate into the LCD rail's 45° slot, pulling the wires gently to take up slack so none get pinched.</p>`,
    tips: [T('warn', 'Check that Module B is pushed fully into Module A before moving on.')] },

  { id: 'sd', ch: 'frame', title: 'microSD module', manual: 'Steps 8–9', cam: 'lcdBack',
    add: ['sdTape', 'sd'], fly: { sdTape: [0, -30, -30], sd: [0, -40, -40] },
    body: `<p>Stick a 42 mm strip of double-sided tape to the flat back of the <b>microSD module</b> and mount it on the back of the LCD. Then connect six wires:</p>
<ul><li><span class="sw brown"></span>CS → brown</li><li><span class="sw pink"></span>SCK → pink</li><li><span class="sw orange"></span>MOSI → orange</li><li><span class="sw purple"></span>MISO → purple</li><li><span class="sw red"></span>VCC → red</li><li><span class="sw black"></span>GND → black</li></ul>`,
    tips: [T('tip', 'The pin labels are printed on the back of the module, so note them before you stick it down.')] },

  { id: 'lcdi2c', ch: 'frame', title: 'LCD I²C wires & rubber feet', manual: 'Steps 10–11', cam: 'under',
    add: ['footA*'], fly: { 'footA*': [0, -40, 0] },
    body: `<p>The LCD talks over I²C with just four wires: <span class="sw black"></span>GND, <span class="sw red"></span>VCC, <span class="sw yellow"></span>SDA and <span class="sw green"></span>SCL. Then flip the robot over and stick four <b>rubber feet</b> under Module A. They absorb vibration, level the robot and leave room for wiring underneath.</p>` },

  { id: 'railC', ch: 'frame', title: 'Stirrer rail (Module C)', manual: 'Step 12', cam: 'railC',
    add: ['modC', 'footC*'], fly: { modC: [0, 0, -260], 'footC*': [0, -40, 0] },
    body: `<p>Put five rubber feet on the underside of <b>Module C</b> and slide it onto the rails. The centre foot pushes back when you firmly mount the tube assembly later.</p>` },

  // ---------------------------------------------------------------- Stirrer & heater
  { id: 'fan', ch: 'stir', title: 'Magnetic stirrer fan', manual: 'Steps 13–15', cam: 'bench',
    bench: ['fan'],
    body: `<p>Glue two <b>12×6×3 mm neodymium magnets</b> to the face of a 40 mm PC fan with high-temp RTV silicone, centred end to end. As the fan spins, the magnets drag the stir bar inside the culture vial.</p>
<p>Trim the fan leads to 15 mm and extend them with 28 cm of <span class="sw orange"></span>orange (to red) and <span class="sw black"></span>black wire under marine heat-shrink.</p>`,
    tips: [T('warn', 'Alignment matters a lot here, so take your time centring the magnets. Cure for 1 h at 37 °C or overnight at room temperature.')] },

  { id: 'heaterPrep', ch: 'stir', title: 'Heater plate leads', manual: 'Steps 16–17', cam: 'bench',
    bench: ['heater'],
    body: `<p>Trim the <b>80 °C PTC heating plate's</b> leads to 15 mm, then strip and tin them. Solder a pair of 28 cm orange wires to each lead (four wires in total) and seal the joints with 2.4 mm heat-shrink.</p>` },

  { id: 'thermPrep', ch: 'stir', title: 'Heater thermistor', manual: 'Steps 18–21', cam: 'bench',
    bench: ['thermHeater'],
    body: `<p>Trim a <b>10 kΩ NTC thermistor</b> to 40 mm and scrape the enamel off the last 6 mm until it shows pink copper, then tin it. On a 3-pin header, solder a <b>10 kΩ precision resistor</b> across one outer pin and the centre pin, and the thermistor across the centre and the opposite pin. This makes a voltage divider.</p>`,
    tips: [T('tip', 'Mark the pin with no resistor on it. Seal the thermistor in 2.4 mm heat-shrink and cover all three joints with 6 mm heat-shrink.')] },

  { id: 'needleProbe', ch: 'stir', title: 'Thermometer needle probe', manual: 'Steps 22–25', cam: 'bench',
    bench: ['thermoNeedle'],
    body: `<p>Build a second thermistor divider, but keep the leads long and slide it into a <b>14-gauge 4″ luer-lock needle</b>. Fill the luer fitting and the needle tip with black silicone so the probe is sealed and waterproof.</p>
<p>This probe will measure the <b>media temperature</b> directly through the reactor cap.</p>`,
    tips: [T('tip', 'Cure for a few hours at room temperature, or 1 h at 37 °C.')] },

  { id: 'stirBase', ch: 'stir', title: 'Assemble the stirrer base (Module D)', manual: 'Steps 25–28', cam: 'stirBase',
    add: ['modD', 'sealD*'], move: ['heater', 'thermHeater', 'fan'],
    body: `<p>Run sealant along the groove inside <b>Module D</b>, then slide the heater plate all the way into its slot. Push the thermistor into the small slot underneath until it bottoms out. Finally, slide the stirrer fan into the bottom channel, magnets up.</p>
<p>Module D sits in the raised frame on Module C, right under the culture vial.</p>`,
    tips: [T('warn', 'If the heat-shrink makes the thermistor too fat for its slot, reheat and squeeze it. It will be very hot.')] },

  // ---------------------------------------------------------------- Power & motherboard
  { id: 'pumpPrep', ch: 'power', title: 'Peristaltic pump motors', manual: 'Steps 29–30', cam: 'bench',
    bench: ['pump0', 'pump1', 'pump2', 'pump3'],
    body: `<p>Solder a 20 cm orange wire to each terminal of the four <b>DC peristaltic pumps</b> and seal with heat-shrink. Mark the <b>negative</b> lead with a black marker (the positive terminal has a red dot), then twist each pair into a tight braid.</p>`,
    tips: [T('tip', 'Ease off your grip as you twist so the braid does not buckle.')] },

  { id: 'converter', ch: 'power', title: '12 V → 5 V converter & bus headers', manual: 'Steps 31–34', cam: 'mobo',
    add: ['modE', 'converter', 'bus5V', 'busGND', 'bus12V', 'busGND2'], fly: { modE: [0, 140, 0] },
    body: `<p>The power system has four <b>bus headers</b>: 20-pin female headers with a bare wire soldered along every pin. They make 12 V, 5 V and two ground rails that every board plugs into.</p>
<p>Solder the 5 V red header and the long black header to the converter's <b>output</b>, and the orange 12 V and short black headers to its <b>input</b>.</p>`,
    tips: [T('warn', 'Every pin must be soldered to its bus wire. These rails power the whole robot, so if a joint fails, redo it.')] },

  { id: 'jackSwitch', ch: 'power', title: 'Barrel jack & rocker switch', manual: 'Steps 35–37', cam: 'moboBack',
    add: ['jack', 'rocker'], fly: { jack: [0, 0, -45], rocker: [0, 0, -45] },
    body: `<p>Trim the flat ground lead of the <b>5.5×2.1 mm barrel jack</b>, screw it into the round hole in the back of Module E and turn the ground lead toward the nearest wall. Clip the <b>rocker switch</b> into the rectangular hole with "O" on the right, and join it to the jack's centre pin with 5 cm of orange wire.</p>` },

  { id: 'powerSlots', ch: 'power', title: 'Power headers into the motherboard', manual: 'Steps 38–42', cam: 'mobo',
    add: ['sealE*'],
    body: `<p>Slot the 5 V headers into the two slots along the side wall and the 12 V headers beside the switch, with orange nearest the wall. Solder the joined orange 12 V wires to the free rocker blade and the joined black grounds to the jack's ground flap.</p>
<p>Coat every exposed joint with black RTV silicone and let it cure overnight before applying power.</p>`,
    tips: [T('tip', 'The manual calls this the hardest part of the build. Everything after it is easier soldering.')] },

  // ---------------------------------------------------------------- Circuit boards
  { id: 'rtc', ch: 'boards', title: 'Real-time clock', manual: 'Steps 43–44', cam: 'moboLeft',
    add: ['rtc'],
    body: `<p>Solder a right-angle header to the <b>DS3231 real-time clock</b> and clean off the flux with 95% isopropanol. Insert a <b>CR1220</b> coin cell and slot the clock upright into its holder in Module E. It timestamps every data point, even after power loss.</p>` },

  { id: 'muxHdr', ch: 'boards', title: 'I²C multiplexer headers', manual: 'Step 45', cam: 'benchHigh',
    bench: ['mux'],
    body: `<p>Solder male headers to the <b>TCA9548A I²C multiplexer</b>. It lets the LCD, clock and light sensor share one I²C bus, each on its own channel.</p>` },

  { id: 'ledCtlPrep', ch: 'boards', title: 'LED controller board', manual: 'Steps 46–51', cam: 'benchHigh',
    bench: ['ledCtl'],
    body: `<p>On the <b>TLC5947 24-channel PWM driver</b>, desolder the built-in current-limiting resistor and replace it with a <b>2.49 kΩ precision resistor</b>. Then solder 16 sets of 3-pin headers and two 6-pin female headers at the ends.</p>`,
    tips: [T('warn', 'Use plenty of flux and don\'t flood the neighbouring holes. Unclogging them is no fun.')] },

  { id: 'drvPrep', ch: 'boards', title: 'Stirring motor controller', manual: 'Step 52', cam: 'benchHigh',
    bench: ['stirCtl'],
    body: `<p>Solder the two screw terminals, facing outward, and the 4-pin header onto the <b>DRV8871 motor driver</b>. It drives the stirrer fan with PWM speed control.</p>` },

  { id: 'moboRail', ch: 'boards', title: 'Motherboard rail & standoffs', manual: 'Steps 53–57', cam: 'sideTop',
    add: ['modF', 'so*'], fly: { modF: [0, -10, 140], 'so*': [0, 60, 0] },
    body: `<p>Bolt <b>Module F</b> to the underside of Module E with 20 mm M3 and M2.5 screws, then add <b>10 mm brass standoffs</b> on top. The rest of the holes take 10 mm screws with standoffs.</p>`,
    tips: [T('warn', 'Some holes are M3 and some are M2.5, because the boards\' manufacturers chose different screw sizes. Check each hole before you drive a screw.')] },

  { id: 'mountMux', ch: 'boards', title: 'Mount the multiplexer & LED controller', manual: 'Step 58', cam: 'mobo',
    move: ['mux', 'ledCtl'],
    body: `<p>Screw the I²C multiplexer down with 4 mm M2.5 screws, VIN pin toward the left wall. Mount the LED controller with its <b>INPUT</b> header facing the rocker switch. The labels are on its underside.</p>` },

  // ---------------------------------------------------------------- Mounting
  { id: 'mountRails', ch: 'mount', title: 'Pump rail & motherboard onto the rails', manual: 'Step 59', cam: 'pumps',
    add: ['modG', 'footG*', 'footF*'], move: ['pump0', 'pump1', 'pump2', 'pump3'], fly: { modG: [0, 120, 0], 'footG*': [0, -40, 0], 'footF*': [0, -40, 0] },
    body: `<p>Mount <b>Module G</b> (the DC motor rail) and the motherboard on the rails, then add rubber feet. The four pumps clip into G's cradles. Route the orange heater and stirrer wires through the left slot of Module E.</p>
<p>Viewed from the LCD, the pumps are <b>NEU · WST · POS · NEG</b> (M1–M4).</p>` },

  { id: 'stirCtl', ch: 'mount', title: 'Mount the stirring controller', manual: 'Step 60', cam: 'mobo',
    move: ['stirCtl'],
    body: `<p>Screw the DRV8871 down with 4 mm M2.5 screws. Connect the fan's positive lead to <b>OUT2</b> and its ground to <b>OUT1</b>, routing the wires between the standoffs.</p>` },

  { id: 'heaterCtl', ch: 'mount', title: 'Heater controller (L298N)', manual: 'Steps 61–64', cam: 'mobo',
    add: ['heaterCtl'],
    body: `<p>Wire the heater plate's four leads to the <b>L298N</b>: the top pair to OUT1/OUT2 and the bottom pair to OUT3/OUT4. Polarity doesn't matter for a resistive heater. Mount the board with 4 mm M3 screws, then run 11 cm orange/black leads from the 12 V and ground rails to its power terminals.</p>`,
    tips: [T('warn', 'The orange lead goes to the 12 V terminal, not 5 V.')] },

  { id: 'mega', ch: 'mount', title: 'Arduino Mega + Motor Shield', manual: 'Steps 65–67', cam: 'mobo',
    add: ['mega', 'usbTape', 'shield'], fly: { shield: [0, 70, 0] },
    body: `<p>Mount the <b>Arduino Mega 2560</b> with 4 mm M3 screws. Put tape over the USB-B port so the shield can't short against its metal case, then stack the <b>Motor Shield</b> on top. Its power terminals take 12 V for the pumps from the bus rails.</p>`,
    tips: [T('tip', 'One corner screw is a tight squeeze between the pin headers, but it won\'t damage the Arduino.')] },

  { id: 'pumpPower', ch: 'mount', title: 'Stirrer power & pump wiring', manual: 'Steps 68–69', cam: 'moboBack',
    body: `<p>Give the stirring controller 12 V from the rails. Then connect the pumps to the Motor Shield, <b>M1 to M4 from left to right</b>. The unmarked positive lead goes to the outer terminal of each pair, and the marked negative goes to the inner shared ground.</p>`,
    tips: [T('tip', 'Seen from behind, the connections cross over. Check the polarity printed on the board against your marker dots.')] },

  // ---------------------------------------------------------------- Wiring
  { id: 'wireFront', ch: 'wiring', title: 'LCD, buttons & SD card to the Arduino', manual: 'Steps 70–72', cam: 'moboLeft',
    body: `<p>Route the faceplate wires over the left cutout of the motherboard.</p>
<ul><li>LCD: <span class="sw red"></span>5 V rail · <span class="sw black"></span>GND rail · <span class="sw yellow"></span>SDA → mux SD0 · <span class="sw green"></span>SCL → mux SC0</li>
<li>Buttons: <span class="sw blue"></span>UP → D26 · <span class="sw white"></span>SEL → D24 · <span class="sw green"></span>DOWN → D22 · <span class="sw black"></span>GND rail</li>
<li>SD: <span class="sw brown"></span>CS → D53 · <span class="sw orange"></span>MOSI → D51 · <span class="sw pink"></span>SCK → D52 · <span class="sw purple"></span>MISO → D50</li></ul>` },

  { id: 'wireI2C', ch: 'wiring', title: 'Clock & multiplexer jumpers', manual: 'Steps 73–76', cam: 'moboLeft',
    body: `<p>The clock connects to multiplexer channel 1 (<span class="sw green"></span>SCL → SC1, <span class="sw yellow"></span>SDA → SD1). The multiplexer's own SDA/SCL go to the Arduino's main I²C pins, <b>D20 and D21</b>. Both boards take 5 V and GND from the rails.</p>` },

  { id: 'wireLedStir', ch: 'wiring', title: 'LED controller & stirrer control', manual: 'Steps 77–80', cam: 'mobo',
    body: `<ul><li>LED controller: <span class="sw white"></span>DIN → D25 · <span class="sw blue"></span>CLK → D27 · <span class="sw green"></span>LAT → D23, plus 5 V and GND</li>
<li>Stirring controller: <span class="sw blue"></span>IN1 → D48 · <span class="sw white"></span>IN2 → D46</li></ul>` },

  { id: 'wireHeater', ch: 'wiring', title: 'Heater controller to the Arduino', manual: 'Steps 81–83', cam: 'moboBack',
    body: `<p>If your L298N has jumpers on <b>ENA/ENB</b>, remove them so the Arduino can switch the heater off completely. Then run 14 cm jumpers:</p>
<ul><li><span class="sw pink"></span>ENA → D44 · <span class="sw brown"></span>IN1 → D42 · <span class="sw purple"></span>IN2 → D40</li><li><span class="sw orange"></span>IN3 → D38 · <span class="sw white"></span>IN4 → D36 · <span class="sw blue"></span>ENB → D34</li></ul>` },

  { id: 'wireSensors', ch: 'wiring', title: 'Arduino power & thermistors', manual: 'Steps 84–87', cam: 'moboLeft',
    body: `<p>Two short jumpers feed the Arduino directly from the 5 V and GND rails. The heater thermistor's signal goes to <b>A9</b>. The thermometer needle gets a loosely braided 38 cm pink/red/black cable, with signal to <b>A8</b>.</p>`,
    tips: [T('tip', 'You\'ll confirm each thermistor\'s polarity during the heater test. If a reading moves the wrong way, swap its red and black wires.')] },

  // ---------------------------------------------------------------- Optics
  { id: 'bay', ch: 'optics', title: 'Module bay & magnets', manual: 'Steps 88–93', cam: 'tower',
    add: ['modM', 'magM*', 'modL'], fly: { modL: [0, 110, 0] },
    body: `<p><b>Module M</b>, the blank module, is the magnetic master. Glue in two magnets of opposite polarity, tape over them and label one face "TOP". Use it to set the orientation of every magnet you embed in <b>Module L</b>, the module bay. Then mount L on top of the stirrer base.</p>`,
    tips: [T('warn', 'Keep every magnet\'s orientation exactly right. If one bay repels the blank module after curing, you have to reprint Module L.')] },

  { id: 'odSensor', ch: 'optics', title: 'OD sensor module', manual: 'Steps 94–98', cam: 'towerBack',
    add: ['modN', 'magN*', 'tsl'], fly: { modN: [0, 0, -80], tsl: [0, 0, -100] },
    body: `<p>This is the robot's eye. On the <b>TSL2591</b> light sensor, cut the trace to its power LED so stray light can't reach the culture. Solder its header, glue it flat inside <b>Module N</b> and seal the wire slot light-tight.</p>`,
    tips: [T('warn', 'Don\'t scratch or smudge the sensor window. Tiny blemishes change every future reading.')] },

  { id: 'odLed', ch: 'optics', title: '940 nm light module', manual: 'Steps 99–102', cam: 'tower',
    add: ['modO', 'magO*', 'odLed'], fly: { modO: [0, 0, 90], odLed: [0, 0, 110] },
    body: `<p>Solder two 38 cm white wires to a <b>940 nm infrared LED</b>, marking the long positive leg. Press it into <b>Module O</b> and fill the back with black silicone. The IR beam shines through the culture into the sensor opposite, which is how OpenEvo measures optical density.</p>` },

  { id: 'odInstall', ch: 'optics', title: 'Install optics & reactor top', manual: 'Step 103', cam: 'towerBack',
    add: ['modQ'], fly: { modQ: [0, 120, 0] },
    body: `<p>Clip the OD sensor into the <b>back</b> bay and the IR light into the <b>front</b> bay, then fit <b>Module Q</b>, the reactor top. Wire the sensor to multiplexer channel 2 (<span class="sw yellow"></span>SDA2 / <span class="sw green"></span>SCL2) and the LED to LED-driver channel 0.</p>` },

  { id: 'sixPack', ch: 'optics', title: 'LED six-pack (optogenetics)', manual: 'Steps 104–109', cam: 'towerRight',
    add: ['modP', 'magP*', 'sixLed*'], fly: { modP: [90, 0, 0], 'sixLed*': [110, 0, 0] },
    body: `<p>Six LEDs of different colours go into <b>Module P</b>, wired to LED-driver channels 1–6. Light becomes a programmable stimulus, and the paper used it to drive an optogenetic selection for more than 4000 hours.</p>
<p>That completes the wiring.</p>` },

  // ---------------------------------------------------------------- Casting
  { id: 'capMold', ch: 'cast', title: 'Cast the reactor cap', manual: 'Steps 110–114', cam: 'cast',
    add: ['modH', 'moldNeedle*', 'modI', 'modJ', 'modK'], bench: ['cap'], fly: { 'moldNeedle*': [0, -60, 0], modI: [0, 70, 25], modJ: [0, 70, -25], modK: [0, 90, 0] },
    body: `<p>Push six 14-gauge needles up through <b>Module H</b>, add the two halves <b>I and J</b> and pour in 20 g + 20 g of two-part silicone (black mica powder makes it light-proof). Close it with <b>Module K</b> and cure overnight.</p>
<p>The needles leave six clean holes: one in the centre for the thermometer and five around it for the media lines.</p>`,
    tips: [T('warn', 'Push the needles out against a surface or with pliers. Never pull them by the glued-on luer hubs.')] },

  { id: 'bottleTop', ch: 'cast', title: 'Media bottle tops & light blockers', manual: 'Steps 115–118', cam: 'bottles',
    add: ['modT', 'modU', 'modW', 'modV', 'bottleTop', 'modX', 'modY', 'modZ', 'modR', 'modS'],
    body: `<p>Molds <b>T–W</b> cast silicone bottle tops with two luer-lock ports. They replace commercial caps that tend to leak and cost more. <b>X–Z</b> form a light-tight housing for light-sensitive media, and the lid halves snap together.</p>
<p>Modules R and S are optional top light blockers.</p>` },

  // ---------------------------------------------------------------- Testing
  { id: 'calPumps', ch: 'test', title: 'Calibrate the pumps', manual: 'Testing 1–7', cam: 'calib', fx: 'pumps',
    add: ['pumpTube*'], remove: ['modT', 'modU', 'modV', 'modW', 'modR', 'modS', 'bottleTop', 'modX', 'modY', 'modZ'],
    lcd: 'prime',
    body: `<p>Fit short silicone tubes to each pump and open <b>PRIME PUMPS</b>. UP/DOWN jogs a pump and SELECT moves to the next one. Each pump should pull in from the left and push out to the right.</p>
<p>Dispense 10 times into a 15 mL tube and adjust each pump's step value in the firmware until <b>1 dispense = 1 mL</b>.</p>`,
    tips: [T('tip', 'The waste pump (WST) runs twice as long as the others, so the robot never adds more media than it removes.')] },

  { id: 'heatTest', ch: 'test', title: 'Heater & stirrer test', manual: 'Testing 8–10', cam: 'test', fx: 'stir', ghost: 1,
    add: ['vial', 'media', 'stirBar'], fly: { vial: [0, 150, 0], media: [0, 150, 0], stirBar: [0, 170, 0] },
    lcd: 'heater',
    body: `<p>Pour 50 mL of water into the 90 mL vial with a stir bar and set it in the reactor well. Start <b>HEATER TEST</b>: the heater temperature and PID output should climb, and the stirrer should spin up a vortex in the vial.</p>`,
    tips: [T('tip', 'Dip the needle probe in ice water. Media temp should drop toward 0–2 °C. If it rises instead, swap the probe\'s red and black wires.')] },

  { id: 'optics', ch: 'test', title: 'Zero the optics', manual: 'Testing 11–12', cam: 'tower', fx: 'od', ghost: 1,
    lcd: 'incubate',
    body: `<p>Format a microSD card (industrial cards survive constant writes), boot into <b>INCUBATE</b> and tune <code>OD940LEDBrightness</code> in the firmware until the IR reading sits just under <b>37889</b>. That gives the TSL2591 its full range from clear to opaque.</p>` },

  { id: 'vialPrep', ch: 'test', title: 'Reactor vial assembly', manual: 'Testing 13–17', cam: 'heroClose', ghost: 0.6,
    remove: ['modH', 'modI', 'modJ', 'modK', 'moldNeedle*'], move: ['cap', 'thermoNeedle'], add: ['needle0', 'needle1', 'needle2', 'needle3', 'needle4', 'ntube*', 'filter'], fly: { 'needle*': [0, 80, 0], filter: [0, 100, 0] },
    lcd: 'incubate',
    body: `<p>Cap the vial with the cast silicone stopper and slide five 2″ needles, each with a 6 cm tube and luer fittings, into the ring of holes. Wrap it in foil and autoclave at 121 °C for 20 min. Sterilise the thermometer needle in 10% bleach, rinse it, and slide it into the centre hole.</p>
<p>Swap one luer cap for a <b>0.22 µm filter</b> to act as the air vent.</p>` },

  { id: 'run', ch: 'test', title: 'Run: grow & evolve', manual: 'Testing 18–21 · operation', cam: 'run', fx: 'run', ghost: 0.65,
    add: ['modX', 'modY', 'modZ', 'mediaPOS', 'mediaNEG', 'wasteBottle', 'line*'], fly: { modX: [0, 160, 0], modY: [0, 200, 0], modZ: [0, 200, 0] },
    lcd: 'run',
    body: `<p>Inoculate 50 mL of media and start the run. OpenEvo logs OD, temperature and uptime every second. When the culture reaches the OD threshold, it pumps out waste and pumps in fresh media, which gives the classic turbidostat <b>sawtooth</b>.</p>
<p>Switching between neutral, positive and negative selection media, or changing the light from the six-pack, keeps evolutionary pressure on the cells. In the paper, <i>Haloferax volcanii</i> evolved from 15% to 12% salt this way over about 1,000 hours.</p>` },
];
