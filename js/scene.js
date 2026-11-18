// Renderer, camera, studio lighting, ground and orbit controls.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export function createScene(canvas, { preserve = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: preserve, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(32, 1, 5, 6000);
  camera.position.set(420, 360, 520);

  // lights
  const hemi = new THREE.HemisphereLight('#ffffff', '#8a8f9c', 0.9); scene.add(hemi);
  const key = new THREE.DirectionalLight('#fff6ec', 2.4);
  key.position.set(260, 520, 300); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const sc = key.shadow.camera; sc.left = -380; sc.right = 380; sc.top = 380; sc.bottom = -380; sc.near = 50; sc.far = 1400;
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.6; key.shadow.radius = 4;
  scene.add(key); scene.add(key.target);
  const fill = new THREE.DirectionalLight('#dfe8ff', 0.8); fill.position.set(-400, 200, 150); scene.add(fill);
  const rim = new THREE.DirectionalLight('#ffffff', 1.0); rim.position.set(-150, 260, -480); scene.add(rim);

  // ground: soft shadow catcher + faded millimetre grid
  const ground = new THREE.Group(); ground.name = 'ground';
  const shadowMat = new THREE.ShadowMaterial({ color: '#1b2030', opacity: 0.22 });
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), shadowMat); sh.rotation.x = -Math.PI / 2; sh.receiveShadow = true; sh.position.y = -0.05;
  ground.add(sh);
  const gridMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uColor: { value: new THREE.Color('#5d6576') }, uFade: { value: 620 }, uAlpha: { value: 0.42 } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uFade; uniform float uAlpha; varying vec3 vW;
      float line(float c, float w){ float d = abs(fract(c-0.5)-0.5)/fwidth(c); return 1.-min(d/w,1.); }
      void main(){ vec2 p=vW.xz; float g1=line(p.x/10.,1.)*.35 + line(p.y/10.,1.)*.35; float g2=max(line(p.x/50.,1.2),line(p.y/50.,1.2));
        float a=max(g1,g2)*uAlpha*(1.-smoothstep(uFade*.35,uFade,length(p))); if(a<0.003) discard; gl_FragColor=vec4(uColor,a); }`,
  });
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), gridMat); grid.rotation.x = -Math.PI / 2; grid.position.y = -0.1; grid.renderOrder = -1;
  ground.add(grid);
  scene.add(ground);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = 60; controls.maxDistance = 2200;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.target.set(0, 60, -40);
  controls.zoomToCursor = true;

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize); resize();

  function setTheme(dark) {
    gridMat.uniforms.uColor.value.set(dark ? '#8a93a8' : '#5d6576');
    gridMat.uniforms.uAlpha.value = dark ? 0.34 : 0.42;
    shadowMat.opacity = dark ? 0.45 : 0.22;
    hemi.intensity = dark ? 0.75 : 0.9;
    scene.environmentIntensity = dark ? 0.7 : 0.55;
  }

  return { renderer, scene, camera, controls, resize, setTheme, lights: { hemi, key, fill, rim }, ground };
}
