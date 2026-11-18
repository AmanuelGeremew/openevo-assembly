// Shared materials. Units are millimetres throughout the app.
import * as THREE from 'three';

const std = (color, roughness = 0.6, metalness = 0, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });

export const M = {
  pla:        std('#2b2e35', 0.66, 0.0),            // matte black PLA
  plaEdge:    new THREE.LineBasicMaterial({ color: '#6b7280', transparent: true, opacity: 0.42 }),
  steel:      std('#cfd3d8', 0.26, 1.0),
  steelDark:  std('#8d939b', 0.35, 1.0),
  nickel:     std('#c4c8ce', 0.3, 1.0),
  brass:      std('#c8a24c', 0.32, 1.0),
  gold:       std('#d9b44a', 0.28, 1.0),
  alu:        std('#c3c7cc', 0.42, 0.85),
  aluDark:    std('#3a3d42', 0.5, 0.7),
  screw:      std('#1d1f23', 0.45, 0.6),
  rubber:     std('#121214', 0.92, 0.0),
  black:      std('#141518', 0.5, 0.0),
  chip:       std('#18191c', 0.38, 0.0),
  header:     std('#141416', 0.55, 0.0),
  white:      std('#f1f1ee', 0.5, 0.0),
  ptfe:       std('#fbfbf8', 0.35, 0.0),
  pumpHead:   std('#f3f1ea', 0.38, 0.0),
  pcbArduino: std('#0b7f8c', 0.48, 0.05),
  pcbBlue:    std('#1f4f9e', 0.5, 0.05),
  pcbAda:     std('#22356f', 0.5, 0.05),
  pcbPurple:  std('#3b2f80', 0.5, 0.05),
  pcbRed:     std('#b8262c', 0.5, 0.05),
  pcbGreen:   std('#1d7a3c', 0.5, 0.05),
  pcbBlack:   std('#1b1c20', 0.5, 0.05),
  termBlue:   std('#2c6fd8', 0.45, 0.0),
  termGreen:  std('#2e9e4f', 0.45, 0.0),
  capBlack:   std('#1b1b1f', 0.4, 0.2),
  capBlue:    std('#2a63c9', 0.4, 0.0),
  btnBlack:   std('#18191c', 0.35, 0.0),
  btnBlue:    std('#1e73e8', 0.32, 0.0),
  potBlue:    std('#2f6fe0', 0.4, 0.0),
  copper:     std('#c98a5a', 0.35, 1.0),
  kapton:     std('#e09a2c', 0.4, 0.0, { transparent: true, opacity: 0.85 }),
  silBlack:   std('#1a1a1c', 0.86, 0.0),
  silBlue:    std('#2b5fd0', 0.55, 0.0),
  silYellow:  std('#e8c62a', 0.6, 0.0),
  heatshrink: std('#1a1b1e', 0.7, 0.0),
  sealant:    std('#101012', 0.75, 0.0),
  tape:       std('#f2efe6', 0.8, 0.0),
  label:      std('#2a6ad4', 0.5, 0.0),
  hubGreen:   std('#6f8f3a', 0.5, 0.0),       // 14 gauge luer hub (olive green)
  filterGreen:std('#3cae5c', 0.4, 0.0),
  luer:       new THREE.MeshPhysicalMaterial({ color: '#eef2f6', roughness: 0.3, transparent: true, opacity: 0.78, depthWrite: false }),
  glass:      new THREE.MeshPhysicalMaterial({ color: '#dfeefa', roughness: 0.04, metalness: 0, transparent: true, opacity: 0.2, envMapIntensity: 1.6, clearcoat: 1, clearcoatRoughness: 0.05, specularIntensity: 1, side: THREE.DoubleSide, depthWrite: false }),
  tubing:     new THREE.MeshPhysicalMaterial({ color: '#f4f6f2', roughness: 0.28, transparent: true, opacity: 0.62, clearcoat: 0.6, depthWrite: false }),
  media:      new THREE.MeshPhysicalMaterial({ color: '#f3dd92', roughness: 0.12, transparent: true, opacity: 0.55, clearcoat: 0.5, attenuationColor: new THREE.Color('#e8c15a'), depthWrite: false }),
  water:      new THREE.MeshPhysicalMaterial({ color: '#e8f3ff', roughness: 0.05, transparent: true, opacity: 0.35, depthWrite: false }),
  ghost:      new THREE.MeshBasicMaterial({ color: '#7aa2ff', transparent: true, opacity: 0.08, depthWrite: false }),
};

// Silicone 22 AWG hook-up wire colours from the team's Wiring Checklist.
export const WIRE_COLORS = {
  black: '#1c1c1f', red: '#d92b2b', orange: '#f07a1a', yellow: '#f2c81b', green: '#2fae4a',
  blue: '#2563eb', purple: '#8b46d9', pink: '#f28bb5', brown: '#7a4a24', white: '#f2f2ef',
  grey: '#9aa0a8', bare: '#c9ccd0',
};
const wireMats = {};
export function wireMat(name) {
  if (!wireMats[name]) {
    const c = WIRE_COLORS[name] || name;
    wireMats[name] = name === 'bare'
      ? std(c, 0.3, 1.0)
      : std(c, 0.52, 0.0);
  }
  return wireMats[name];
}

// LED colours for the optogenetic six-pack (violet -> NIR) and the 940 nm OD LED.
export const LED_COLORS = ['#7b2cff', '#2f6bff', '#18c8ff', '#2bd96b', '#ffb21f', '#ff2a2a'];
