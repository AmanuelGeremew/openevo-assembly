# OpenEvo · 3D Assembly Manual

The *OpenEVO Type D Mk4 Assembly Manual*, step by step, as a rotatable 3D model that builds itself from the first rod to the first INCUBATE run.

**Live:** https://amanuelgeremew.github.io/openevo-assembly/

## What's in it

- **Every step of the manual, in order.** The cover, *Before You Start: Material Preparation*, Hardware Mounting steps 1–118 and Function Testing and Initializing steps 1–21: 145 steps. Each step shows the manual's own text (extracted verbatim from the PDF into `js/manual.js`) and moves only the parts and wires that step names: sub-assemblies are built on the bench and carried to the robot as one piece, and the robot is flipped upside down or onto its side where the manual says so.
- **The repository's geometry.** All printed modules are the STL files from [Binomica-Labs/OpenEVO](https://github.com/Binomica-Labs/OpenEVO), placed from their own geometry: the 5 mm rod holes 135 mm apart, the screw patterns of Modules E and F, the Arduino Mega's holes in Module E, and the stacking bosses of Modules D → L → Q.
- **Every wire from the Wiring Checklist** in its colour, length and end types, between the pins the manual names. Routes follow the manual and its photos: the button wires through the slot in Module A, bundles beneath the robot that rise into Module E over its left cutout, the heater and fan wires between the standoffs under the boards. No wire passes through a printed part or a component (checked by a voxel and bounding-box scan in `debug/`).
- **Names from the sources.** Part names come from the manual and the Bill of Materials, LCD screens from the firmware (`easyEVOTypeD.ino`) and the manual's photos.
- **Material Sheet and Wire List** tabs from *2026 Updated Bill of Materials.xlsx* and *Wiring Checklist.xlsx*.

## Controls

| | |
|---|---|
| Drag / scroll / right-drag | orbit / zoom / pan |
| Space | play / pause |
| ← → or the step buttons | one step at a time |
| Click a part or wire | its name, Bill of Materials line, and the step that adds it |
| L · X · W · R · F | labels · X-ray · wires · re-centre · fullscreen |

Every step has a deep link: `#h12` is Hardware Mounting step 12, `#t9` is Function Testing step 9, `#pre1` is *3D Printed Modules*.

## Hosting it anywhere

A static site with no build step; Three.js r170 is vendored in `vendor/`. Copy this folder to any static host, or run it locally:

```bash
python -m http.server 8000
```

then open http://localhost:8000 (ES modules need HTTP, not `file://`).

## Files

- `index.html`, `css/style.css`: page and UI
- `js/manual.js`: the manual's text, verbatim
- `js/steps.js`: one entry per manual step: text, camera, and the actions on parts and wires
- `js/timeline.js`: compiles the steps into pose segments; parts ride on the part they are built onto
- `js/assembly.js`: places the STL modules and the components
- `js/builders.js`: boards, pumps, fan, glassware and other components
- `js/wires.js`: every Wiring Checklist wire with its route and pins
- `js/labware.js`: testing labware and the loose prepared wires
- `js/data.js`: Bill of Materials and Wiring Checklist rows
- `models/*.stl`: the printed modules

## Credits

OpenEvo hardware, firmware and documentation: Zane Chan, Pin-Che Huang, Phillip Kyriakakis (Binomica Labs), MIT License (see `LICENSE`).

3D model by Amanuel Geremew.
