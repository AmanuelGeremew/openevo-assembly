# OpenEvo · Interactive 3D Assembly

An interactive, rotatable 3D model of the **OpenEvo** open-source turbidostat (Type D Mk4) that builds itself step by step, from 3D-printing the modules to the first continuous-culture run.

**Live:** https://amanuelgeremew.github.io/openevo-assembly/

## What's in it

- **The team's real geometry.** All 26 printed modules (A–Z) are the STL files from [Binomica-Labs/OpenEVO](https://github.com/Binomica-Labs/OpenEVO). Their placement comes from the geometry itself: the 5 mm rod holes (135 mm apart), the matching M3/M2.5 screw patterns of Modules E and F, the Arduino Mega's mounting holes in Module E, and the stacking bosses of Modules D → L → Q.
- **46 build steps in 10 chapters** that follow the *OpenEVO Type D Mk4 Assembly Manual* (hardware steps 1–118 and testing steps 1–21). Each step has the manual's step numbers, a summary, tips and warnings, and the parts and wires it adds.
- **Every wire** from the team's *Wiring Checklist*, routed between the correct pins in the checklist colours. Wires grow along their path as they're connected.
- **Bill of materials** from *2026 Updated Bill of Materials.xlsx* ($306.76 for the first robot, $198.73 for each additional one), with vendor links.
- **A live run simulation:** stirring vortex, IR optical-density beam, LED six-pack, LCD screens from the manual, and a turbidostat OD sawtooth with pump dilutions.

## Controls

| | |
|---|---|
| Drag / scroll / right-drag | orbit / zoom / pan |
| Space | play / pause (continuous) |
| ← → or the step buttons | click through one step at a time |
| Click a part | name, purpose, BOM line, and the step where it's added |
| L · X · E · W · R · F | labels · X-ray · explode · wires · re-centre · fullscreen |

Deep links work for every step, e.g. `#stirBase`, `#wireFront`, `#run`.

## Hosting it anywhere

It's a static site with no build step and no external dependencies (Three.js r170 is vendored in `vendor/`). Copy this folder to any static host (GitHub Pages, Netlify, an S3 bucket, a lab server), or run it locally:

```bash
python -m http.server 8000
```

then open http://localhost:8000. It has to be served over HTTP, because ES modules don't load from `file://`.

## Files

- `index.html`, `css/style.css`: the page and UI
- `js/assembly.js`: places the STL modules and the procedural components
- `js/builders.js`: procedural boards, pumps, fan, glassware and so on
- `js/wires.js`: every wire with its route and pin endpoints
- `js/tubes.js`: tubing, bottles and media lines
- `js/steps.js`: the step-by-step text, chapters and camera views
- `js/timeline.js`: compiles the steps into keyframes, and the whole scene is a function of time
- `js/data.js`: BOM and wire list generated from the team's spreadsheets
- `models/A.stl … Z.stl`: the printed modules

## Credits

OpenEvo hardware, firmware and documentation: the OpenEvo authors / Binomica Labs, MIT License (see `LICENSE`). Paper: *OpenEvo: An Open-Source Platform for Automated Evolution and Analysis* ([bioRxiv](https://www.biorxiv.org/content/10.64898/2026.07.06.735356v1), [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC13370392/)).

Interactive 3D assembly by Amanuel Geremew.
