import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const GLOW = 0xF2A9BE;
const PEARL_COLOR = 0xF7EBEC;

/* Mirrors the CSS fallback's right/top % placement + px size (desktop),
   and the shrunk/relocated mobile layout from pearl.css. */
const LAYOUT = {
  desktop: [
    { rightPct: 0.14, topPct: 0.34, sizePx: 190, speed: 0.22, phase: 0 },
    { rightPct: 0.30, topPct: 0.62, sizePx: 64, speed: 0.33, phase: 2.1 },
    { rightPct: 0.09, topPct: 0.20, sizePx: 26, speed: 0.4, phase: 4.2 },
  ],
  mobile: [
    { rightPct: 0.02, topPct: 0.06, sizePx: 96, speed: 0.22, phase: 0 },
    { rightPct: 0.20, topPct: 0.20, sizePx: 44, speed: 0.33, phase: 2.1 },
    { rightPct: 0.30, topPct: 0.02, sizePx: 16, speed: 0.4, phase: 4.2 },
  ],
};

export function initHeroScene(canvas, heroEl) {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canTrackPointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 8);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const hemi = new THREE.HemisphereLight(0xffffff, 0x2b1a1f, 0.6);
  scene.add(hemi);

  const rim = new THREE.PointLight(GLOW, 10, 20, 2);
  rim.position.set(3, 1.5, 4);
  scene.add(rim);

  const key = new THREE.DirectionalLight(0xffffff, 0.4);
  key.position.set(-2, 3, 5);
  scene.add(key);

  const geometry = new THREE.SphereGeometry(1, 48, 48);
  const material = new THREE.MeshPhysicalMaterial({
    color: PEARL_COLOR,
    roughness: 0.28,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    iridescence: 0.6,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [100, 400],
    sheen: 0.6,
    sheenColor: new THREE.Color(GLOW),
    sheenRoughness: 0.4,
  });

  const pearls = LAYOUT.desktop.map((cfg) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = { ...cfg, baseY: 0 };
    return mesh;
  });

  const group = new THREE.Group();
  pearls.forEach((p) => group.add(p));
  scene.add(group);

  const depthZ = 0;

  function ndcToWorld(ndcX, ndcY, z) {
    const vec = new THREE.Vector3(ndcX, ndcY, 0).unproject(camera);
    const dir = vec.sub(camera.position).normalize();
    const distance = (z - camera.position.z) / dir.z;
    return camera.position.clone().add(dir.multiplyScalar(distance));
  }

  function layout() {
    const w = heroEl.clientWidth;
    const h = heroEl.clientHeight;
    if (w === 0 || h === 0) return;

    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    const cfgSet = w <= 560 ? LAYOUT.mobile : LAYOUT.desktop;
    const worldUnitsPerPixel =
      (2 * Math.tan((camera.fov * Math.PI) / 360) * Math.abs(camera.position.z - depthZ)) / h;

    pearls.forEach((mesh, i) => {
      const cfg = cfgSet[i];
      const xFrac = 1 - cfg.rightPct - (cfg.sizePx / w) / 2;
      const yFrac = cfg.topPct + (cfg.sizePx / h) / 2;
      const ndcX = xFrac * 2 - 1;
      const ndcY = 1 - yFrac * 2;
      const pos = ndcToWorld(ndcX, ndcY, depthZ);
      const radius = (cfg.sizePx / 2) * worldUnitsPerPixel;

      mesh.position.set(pos.x, pos.y, depthZ);
      mesh.scale.setScalar(radius);
      mesh.userData.baseY = pos.y;
      mesh.userData.speed = cfg.speed;
      mesh.userData.phase = cfg.phase;
      mesh.userData.amplitude = radius * 0.5;
    });
  }

  layout();

  let ro;
  if ('ResizeObserver' in window) {
    ro = new ResizeObserver(layout);
    ro.observe(heroEl);
  } else {
    window.addEventListener('resize', layout);
  }

  /* Subtle cursor tilt, desktop only. */
  const pointerTarget = { x: 0, y: 0 };
  function onPointerMove(e) {
    const rect = heroEl.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    pointerTarget.x = (px - 0.5) * 0.25;
    pointerTarget.y = (py - 0.5) * 0.18;
  }
  if (canTrackPointer && !prefersReducedMotion) {
    heroEl.addEventListener('pointermove', onPointerMove);
  }

  /* Pause when off-screen or tab hidden. */
  let visible = true;
  let frameId = null;
  const clock = new THREE.Clock();

  function renderOnce() {
    renderer.render(scene, camera);
  }

  function animate() {
    if (!visible || document.hidden) {
      frameId = null;
      return;
    }
    const t = clock.getElapsedTime();
    pearls.forEach((mesh) => {
      const d = mesh.userData;
      mesh.position.y = d.baseY + Math.sin(t * d.speed + d.phase) * d.amplitude;
      mesh.rotation.y += 0.0015;
      mesh.rotation.x += 0.0008;
    });
    group.rotation.y += (pointerTarget.x - group.rotation.y) * 0.05;
    group.rotation.x += (pointerTarget.y - group.rotation.x) * 0.05;
    renderOnce();
    frameId = requestAnimationFrame(animate);
  }

  function start() {
    if (frameId === null) {
      clock.start();
      frameId = requestAnimationFrame(animate);
    }
  }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
    }, { threshold: 0 });
    io.observe(heroEl);
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && visible) start();
  });

  if (prefersReducedMotion) {
    renderOnce();
  } else {
    renderOnce();
    start();
  }

  return Promise.resolve();
}
