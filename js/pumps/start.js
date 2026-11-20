// The machine at the end of the 3D Assembly Manual (index.html, after Function Testing step 21), taken
// from that model's timeline: the parts on the robot, their made states (trimmed leads, cut LED legs,
// soldered headers...) and the two things that are not at their assembled pose. Accessories that are put
// away after the build (moulds, bottle-top parts, light blockers, the blank sensor module) are left out.
export const START_KEEP = ['robot', 'modA', 'modB', 'modC', 'modD', 'modE', 'modF', 'modG', 'modL', 'modQ', 'modO', 'modN', 'modP', 'rodL', 'rodR',
  'footA0', 'footA1', 'footA2', 'footA3', 'footC0', 'footC1', 'footC2', 'footC3', 'footC4', 'footF0', 'footF1',
  'btnUp', 'btnUpNut', 'btnSel', 'btnSelNut', 'btnDown', 'btnDownNut', 'lcd', 'sdTape', 'sd', 'sdCard', 'fan', 'fanMag', 'heater',
  'thermHeater', 'thermNTC', 'thermRes', 'sealD0', 'sealD1', 'sealD2', 'thermoNeedle', 'needleHdr', 'needleNTC', 'needleRes',
  'pump0', 'pump1', 'pump2', 'pump3', 'converter', 'bus5V', 'busGND', 'bus12V', 'busGND2', 'jack', 'rocker', 'sealE0', 'sealE1',
  'rtc', 'coin', 'mux', 'ledCtl', 'res249', 'stirCtl', 'heaterCtl', 'mega', 'usbTape', 'shield',
  'so53_0', 'sc53_0', 'so53_1', 'sc53_1', 'so54_0', 'sc54_0', 'so54_1', 'sc54_1', 'so55_0', 'sc55_0', 'so55_1', 'sc55_1',
  'so56_0', 'sc56_0', 'so56_1', 'sc56_1', 'so56_2', 'sc56_2', 'so56_3', 'sc56_3', 'so56_4', 'sc56_4',
  'so57_0', 'sc57_0', 'so57_1', 'sc57_1', 'so57_2', 'sc57_2', 'so57_3', 'sc57_3',
  'bs_mux_0', 'bs_mux_1', 'bs_ledCtl_0', 'bs_ledCtl_1', 'bs_ledCtl_2', 'bs_ledCtl_3', 'bs_stirCtl_0', 'bs_stirCtl_1',
  'bs_heaterCtl_0', 'bs_heaterCtl_1', 'bs_heaterCtl_2', 'bs_mega_0', 'bs_mega_1', 'bs_mega_2', 'bs_mega_3',
  'magL0', 'magL1', 'magL2', 'magL3', 'magL4', 'magL5', 'magL6', 'magL7', 'magN0', 'magN1', 'magO0', 'magO1', 'magP0', 'magP1',
  'tsl', 'rtcHdr', 'muxHdr', 'ledHdr', 'ledFem', 'stirTerm', 'tslHdr', 'sealN', 'odLed', 'sealO',
  'sixLed0', 'sixLed1', 'sixLed2', 'sixLed3', 'sixLed4', 'sixLed5', 'sealP', 'vial', 'media', 'stirBar', 'cap',
  'needle0', 'needle1', 'needle2', 'needle3', 'needle4',
  'pumpTube0in', 'pumpLuer0in', 'pumpTube0out', 'pumpLuer0out', 'pumpTube1in', 'pumpLuer1in', 'pumpTube1out', 'pumpLuer1out',
  'pumpTube2in', 'pumpLuer2in', 'pumpTube2out', 'pumpLuer2out', 'pumpTube3in', 'pumpLuer3in', 'pumpTube3out', 'pumpLuer3out',
  'ntube0', 'ntubeLuer0a', 'ntubeLuer0b', 'filter', 'ntube1', 'ntubeLuer1a', 'ntubeLuer1b', 'ncap1', 'ntube2', 'ntubeLuer2a', 'ntubeLuer2b', 'ncap2',
  'ntube3', 'ntubeLuer3a', 'ntubeLuer3b', 'ncap3', 'ntube4', 'ntubeLuer4a', 'ntubeLuer4b', 'ncap4', 'psuCable', 'kitPSU'];

// made states at the end of the build (stage name -> shown)
export const START_STAGES = {
  fan: { raw: false, trimmed: true }, heater: { raw: false, trimmed: true }, thermHeater: { mark: true, shrinkBig: true },
  thermNTC: { raw: false, prepared: true, shrink: true }, thermRes: { straight: false, bent: true }, thermoNeedle: { seal1: true, seal2: true },
  needleHdr: { shrinkBig: true }, needleNTC: { raw: false, prepared: true, shrink: true }, needleRes: { straight: false, bent: true },
  converter: { raw: false, trimmed: true }, bus5V: { bus: true }, busGND: { bus: true }, bus12V: { bus: true }, busGND2: { bus: true },
  jack: { raw: false, trimmed: true }, ledCtl: { smdR: false }, res249: { straight: false, bent90: false, clipped: true }, tsl: { trace: false },
  odLed: { mark: true, raw: false, cut: true },
  sixLed0: { mark: true, raw: false, cut: true }, sixLed1: { mark: true, raw: false, cut: true }, sixLed2: { mark: true, raw: false, cut: true },
  sixLed3: { mark: true, raw: false, cut: true }, sixLed4: { mark: true, raw: false, cut: true }, sixLed5: { mark: true, raw: false, cut: true },
  cap: { flash: false }, kitPSU: { raw: false },
};

// the two kept parts that are not at their assembled pose: the stir bar in the vial and the power supply on the table
export const START_POSES = {
  stirBar: { frame: 'vial', M: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -3.66, 42.6, -5, 1] },
  kitPSU: { frame: null, M: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 205.9, 0, -232, 1] },
};
