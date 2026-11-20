import * as THREE from 'three';
import { DT } from '../core/config.ts';
import {
  createDefaultInputState,
  createWorld,
  PersistentInputState,
  stepWorld,
} from '../core/engine.ts';
import { PRNG } from '../core/prng.ts';
import { InputFrame, SimWorld } from '../core/types.ts';
import { ProceduralAudio } from './audio.ts';
import { initMoteSlots, NIGHT_LORE, NIGHT_TITLES, updateHUD } from './hud.ts';
import {
  createCharmMesh,
  createDrifterMesh,
  createFireflyMesh,
  createGreatLanternMesh,
  createInkShadowMesh,
  createIslandMeshForNight,
  createMayCharacterMesh,
  createPulseWaveMesh,
  createStarfieldAndWindParticles,
} from './meshes.ts';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e1430);
scene.fog = new THREE.FogExp2(0x1b2350, 0.014);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 320);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffe9b0, 0.65);
dirLight.position.set(20, 45, 20);
scene.add(dirLight);

const skyFx = createStarfieldAndWindParticles();
scene.add(skyFx.stars);
scene.add(skyFx.windParticles);

const pulseWaveMesh = createPulseWaveMesh();
scene.add(pulseWaveMesh);
let pulseAnimTicks = 0;

const audio = new ProceduralAudio();

// Camera Orbit Controls State (Pointer Lock + Mouse Drag + Scroll Zoom)
let camYawDeg = 0; // 0 deg means looking along +Z
let camPitchDeg = 26; // vertical elevation angle in degrees
let camDistance = 17;
let mouseSensitivity = 5;
let isDraggingMouse = false;
let lastMouseX = 0;
let lastMouseY = 0;

// Load saved settings from localStorage
const savedVol = localStorage.getItem('dao_den_long_volume');
if (savedVol !== null) {
  audio.volume = Number(savedVol) / 100;
  const volSlider = document.getElementById('slider-volume') as HTMLInputElement | null;
  const valVol = document.getElementById('val-volume');
  if (volSlider) volSlider.value = savedVol;
  if (valVol) valVol.textContent = savedVol;
}

const savedSens = localStorage.getItem('dao_den_long_sens');
if (savedSens !== null) {
  mouseSensitivity = Number(savedSens);
  const sensSlider = document.getElementById('slider-sens') as HTMLInputElement | null;
  const valSens = document.getElementById('val-sens');
  if (sensSlider) sensSlider.value = savedSens;
  if (valSens) valSens.textContent = savedSens;
}

function applyMouseDelta(dx: number, dy: number) {
  const factor = mouseSensitivity * 0.065;
  camYawDeg = (camYawDeg - dx * factor) % 360;
  camPitchDeg = Math.max(10, Math.min(72, camPitchDeg + dy * factor * 0.75));
}

// 1. Click on canvas to request Pointer Lock (or drag smoothly)
canvas.addEventListener('mousedown', (e) => {
  isDraggingMouse = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  // Request Pointer Lock on left click so player can rotate camera without holding buttons
  if (e.button === 0 && document.pointerLockElement !== canvas) {
    canvas.requestPointerLock?.();
  }
});

window.addEventListener('mouseup', () => {
  isDraggingMouse = false;
});

window.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === canvas) {
    applyMouseDelta(e.movementX, e.movementY);
  } else if (isDraggingMouse) {
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    applyMouseDelta(dx, dy);
  }
});

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

canvas.addEventListener(
  'wheel',
  (e) => {
    camDistance = Math.max(8, Math.min(34, camDistance + e.deltaY * 0.012));
  },
  { passive: true }
);

document.addEventListener('pointerlockchange', () => {
  const hint = document.getElementById('cam-status-hint');
  if (hint) {
    hint.textContent =
      document.pointerLockElement === canvas
        ? 'Đã khóa chuột 360° (Nhấn Esc để hiện con trỏ chuột)'
        : 'Chuột: Click vào cảnh hoặc Kéo chuột để xoay 360°';
  }
});

let currentNight: 1 | 2 | 3 = 1;
let totalCampaignScore = 0;
let sim: { world: SimWorld; prng: PRNG } = createWorld({
  seed: 202603664,
  night: currentNight,
  contractVersion: '1.1',
});
let inputState: PersistentInputState = createDefaultInputState();
let lastCountdownSec = -1;

const worldGroup = new THREE.Group();
scene.add(worldGroup);

let mayObj = createMayCharacterMesh();
let islandAnimatedModels: THREE.Object3D[] = [];
const moteMeshes = new Map<string, THREE.Group>();
const lanternObjs = new Map<
  string,
  { group: THREE.Group; coreMesh: THREE.Mesh; light: THREE.PointLight; safeRing: THREE.Mesh }
>();
const shadeObjs = new Map<string, { group: THREE.Group; body: THREE.Mesh }>();
const drifterMeshes = new Map<string, THREE.Mesh>();
const charmMeshes = new Map<string, THREE.Mesh>();
const orbitMotes: THREE.Group[] = [];

function rebuildScene(w: SimWorld) {
  worldGroup.clear();
  moteMeshes.clear();
  lanternObjs.clear();
  shadeObjs.clear();
  drifterMeshes.clear();
  charmMeshes.clear();
  orbitMotes.length = 0;

  const islandBuilt = createIslandMeshForNight(w.night);
  worldGroup.add(islandBuilt.group);
  islandAnimatedModels = islandBuilt.animatedModels;

  mayObj = createMayCharacterMesh();
  worldGroup.add(mayObj.group);

  for (const l of w.lanterns) {
    const lObj = createGreatLanternMesh(w.tuning.safe_radius);
    lObj.group.position.set(l.pos[0], l.pos[1], l.pos[2]);
    worldGroup.add(lObj.group);
    lanternObjs.set(l.id, lObj);
  }

  for (const c of w.charms) {
    const cMesh = createCharmMesh();
    cMesh.position.set(c.pos[0], c.pos[1] + 1.0, c.pos[2]);
    worldGroup.add(cMesh);
    charmMeshes.set(c.id, cMesh);
  }
}

initMoteSlots();
rebuildScene(sim.world);

// Keyboard state & one-shot triggers
const keysPressed = new Set<string>();
let pendingJump = false;
let pendingInteract = false;
let pendingPulse = false;
let pendingDash = false;
let pendingPause = false;

window.addEventListener('keydown', (e) => {
  keysPressed.add(e.code);
  if (e.code === 'Space') pendingJump = true;
  if (e.code === 'KeyE') pendingInteract = true;
  if (e.code === 'KeyQ' || e.code === 'KeyF') pendingPulse = true;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') pendingDash = true;
  if (e.code === 'KeyP') {
    pendingPause = true;
    if (document.pointerLockElement === canvas) {
      document.exitPointerLock?.();
    }
  }
  if (e.code === 'KeyR') startNight(currentNight);
});

window.addEventListener('keyup', (e) => {
  keysPressed.delete(e.code);
});

function showIntroModalForNight(night: 1 | 2 | 3) {
  currentNight = night;
  const introModal = document.getElementById('intro-modal');
  const introTitle = document.getElementById('intro-title');
  const introLore = document.getElementById('intro-lore');
  const btnStart = document.getElementById('btn-start-night');
  if (introTitle) introTitle.textContent = NIGHT_TITLES[night];
  if (introLore) introLore.textContent = NIGHT_LORE[night];
  if (btnStart) btnStart.textContent = `Bắt đầu ${NIGHT_TITLES[night]}`;
  if (introModal) introModal.style.display = 'flex';
  if (document.pointerLockElement === canvas) {
    document.exitPointerLock?.();
  }
}

function startNight(night: 1 | 2 | 3) {
  currentNight = night;
  camYawDeg = 0;
  sim = createWorld({
    seed: 202603664 + night * 17,
    night: currentNight,
    contractVersion: '1.1',
  });
  inputState = createDefaultInputState();
  lastCountdownSec = -1;
  pulseAnimTicks = 0;
  rebuildScene(sim.world);
  const introModal = document.getElementById('intro-modal');
  const pauseModal = document.getElementById('pause-modal');
  const endModal = document.getElementById('end-modal');
  if (introModal) introModal.style.display = 'none';
  if (pauseModal) pauseModal.style.display = 'none';
  if (endModal) endModal.style.display = 'none';
  updateHUD(sim.world, totalCampaignScore, camera, camYawDeg);
}

// UI Buttons
document.getElementById('btn-night-1')?.addEventListener('click', () => startNight(1));
document.getElementById('btn-night-2')?.addEventListener('click', () => startNight(2));
document.getElementById('btn-night-3')?.addEventListener('click', () => startNight(3));
document.getElementById('btn-menu')?.addEventListener('click', () => showIntroModalForNight(currentNight));
document.getElementById('btn-start-night')?.addEventListener('click', () => startNight(currentNight));
document.getElementById('btn-select-n2')?.addEventListener('click', () => startNight(2));
document.getElementById('btn-select-n3')?.addEventListener('click', () => startNight(3));

document.getElementById('btn-pause')?.addEventListener('click', () => {
  pendingPause = true;
});
document.getElementById('btn-resume')?.addEventListener('click', () => {
  pendingPause = true;
});
document.getElementById('btn-restart-night')?.addEventListener('click', () => startNight(currentNight));
document.getElementById('btn-back-menu')?.addEventListener('click', () => {
  const pauseModal = document.getElementById('pause-modal');
  if (pauseModal) pauseModal.style.display = 'none';
  showIntroModalForNight(currentNight);
});
document.getElementById('btn-play-again')?.addEventListener('click', () => startNight(currentNight));
document.getElementById('btn-next-night')?.addEventListener('click', () => {
  if (currentNight < 3) {
    showIntroModalForNight((currentNight + 1) as 1 | 2 | 3);
  } else {
    totalCampaignScore = 0;
    showIntroModalForNight(1);
  }
});

document.getElementById('slider-volume')?.addEventListener('input', (e) => {
  const val = Number((e.target as HTMLInputElement).value);
  audio.volume = val / 100;
  const el = document.getElementById('val-volume');
  if (el) el.textContent = String(val);
  localStorage.setItem('dao_den_long_volume', String(val));
});

document.getElementById('slider-sens')?.addEventListener('input', (e) => {
  const val = Number((e.target as HTMLInputElement).value);
  mouseSensitivity = val;
  const el = document.getElementById('val-sens');
  if (el) el.textContent = String(val);
  localStorage.setItem('dao_den_long_sens', String(val));
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function buildInputFrame(): Partial<InputFrame> {
  // Also allow ArrowLeft / ArrowRight to rotate camera yaw smoothly
  if (keysPressed.has('ArrowLeft')) camYawDeg = (camYawDeg + 2.2) % 360;
  if (keysPressed.has('ArrowRight')) camYawDeg = (camYawDeg - 2.2) % 360;

  let mx = 0;
  let mz = 0;
  // In engine.ts: theta = cam_yaw_deg * PI/180
  // worldDirX = x*cos(theta) + z*sin(theta)
  // worldDirZ = -x*sin(theta) + z*cos(theta)
  // When camera looks along angle theta (where 0 is +Z, 90 is +X):
  // Forward (+z) moves along [sin(theta), cos(theta)]
  // Right (-x) moves along [-cos(theta), sin(theta)]
  if (keysPressed.has('KeyW') || keysPressed.has('ArrowUp')) mz += 1;
  if (keysPressed.has('KeyS') || keysPressed.has('ArrowDown')) mz -= 1;
  if (keysPressed.has('KeyA')) mx += 1;
  if (keysPressed.has('KeyD')) mx -= 1;

  const frame: Partial<InputFrame> = {
    move: [mx, mz],
    cam_yaw_deg: camYawDeg,
    jump: pendingJump,
    interact: pendingInteract,
    pulse: pendingPulse,
    dash: pendingDash,
    pause: pendingPause,
  };

  pendingJump = false;
  pendingInteract = false;
  pendingPulse = false;
  pendingDash = false;
  pendingPause = false;

  return frame;
}

function syncSceneVisuals() {
  const w = sim.world;
  const t = w.simTick / 60;

  // Ambient light intensity formula from Ticket-02: 0.15 + 0.55 * (lit / total)
  const litCount = w.lanterns.filter((l) => l.lit).length;
  ambientLight.intensity = 0.15 + 0.55 * (litCount / Math.max(1, w.lanterns.length));

  // Sync Mây position, rotation & invulnerability blink effect
  mayObj.group.position.set(w.player.pos[0], w.player.pos[1], w.player.pos[2]);
  mayObj.group.rotation.y = Math.atan2(w.player.facingDir[0], w.player.facingDir[1]);
  mayObj.group.visible =
    w.player.respawnWaitTicks === 0 &&
    (w.player.invulnTicks === 0 || Math.floor(w.simTick / 4) % 2 === 0);

  // Animate Pulse Expanding Light Ring (5m radius)
  if (pulseAnimTicks > 0) {
    pulseAnimTicks -= 1;
    pulseWaveMesh.visible = true;
    const progress = 1 - pulseAnimTicks / 22;
    const scale = 0.5 + progress * w.tuning.pulse_radius;
    pulseWaveMesh.position.set(w.player.pos[0], w.player.pos[1] + 0.35, w.player.pos[2]);
    pulseWaveMesh.scale.set(scale, scale, 1);
    (pulseWaveMesh.material as THREE.MeshBasicMaterial).opacity = (1 - progress) * 0.85;
  } else {
    pulseWaveMesh.visible = false;
  }

  // Animate Spirit Bird GLB circling overhead
  for (const model of islandAnimatedModels) {
    const birdAngle = t * 0.35;
    model.position.set(Math.cos(birdAngle) * 22, 14 + Math.sin(t * 1.5) * 1.2, Math.sin(birdAngle) * 22);
    model.rotation.y = -birdAngle;
  }

  // Animate Wind Particles on Night 3
  const windMat = skyFx.windParticles.material as THREE.PointsMaterial;
  if (w.wind.warning || w.wind.active) {
    windMat.opacity = w.wind.active ? 0.85 : 0.4;
    const wRad = (w.wind.dirDeg * Math.PI) / 180;
    const posAttr = skyFx.windParticles.geometry.getAttribute('position') as THREE.BufferAttribute;
    const speed = w.wind.active ? 0.35 : 0.12;
    for (let i = 0; i < posAttr.count; i++) {
      let x = posAttr.getX(i) + Math.cos(wRad) * speed;
      let z = posAttr.getZ(i) + Math.sin(wRad) * speed;
      if (x > 45) x -= 90;
      if (x < -45) x += 90;
      if (z > 45) z -= 90;
      if (z < -45) z += 90;
      posAttr.setX(i, x);
      posAttr.setZ(i, z);
    }
    posAttr.needsUpdate = true;
  } else {
    windMat.opacity = 0;
  }

  // Creative Feature: Orbiting fireflies around Mây
  while (orbitMotes.length < w.player.carried) {
    const orb = createFireflyMesh(false);
    orb.scale.setScalar(0.75);
    mayObj.orbitGroup.add(orb);
    orbitMotes.push(orb);
  }
  while (orbitMotes.length > w.player.carried) {
    const removed = orbitMotes.pop();
    if (removed) mayObj.orbitGroup.remove(removed);
  }
  orbitMotes.forEach((orb, idx) => {
    const angle = t * 3.5 + (idx * Math.PI * 2) / Math.max(1, orbitMotes.length);
    orb.position.set(Math.cos(angle) * 0.9, Math.sin(t * 4 + idx) * 0.18, Math.sin(angle) * 0.9);
  });

  // Sync active motes on island
  const activeMoteIds = new Set(w.motes.map((m) => m.id));
  for (const [id, mesh] of moteMeshes.entries()) {
    if (!activeMoteIds.has(id)) {
      worldGroup.remove(mesh);
      moteMeshes.delete(id);
    }
  }
  for (const m of w.motes) {
    let mesh = moteMeshes.get(m.id);
    if (!mesh) {
      mesh = createFireflyMesh(m.kind === 'dropped');
      worldGroup.add(mesh);
      moteMeshes.set(m.id, mesh);
    }
    mesh.position.set(
      m.pos[0],
      m.pos[1] + 0.65 + Math.sin(t * 3 + m.pos[0]) * 0.2,
      m.pos[2]
    );
  }

  // Sync Great Lanterns
  for (const l of w.lanterns) {
    const lObj = lanternObjs.get(l.id);
    if (lObj) {
      const mat = lObj.coreMesh.material as THREE.MeshStandardMaterial;
      const ringMat = lObj.safeRing.material as THREE.MeshBasicMaterial;
      if (l.lit) {
        mat.color.setHex(0xffe9b0);
        mat.emissive.setHex(0xffb347);
        mat.emissiveIntensity = 1.6;
        lObj.light.intensity = 4.5;
        ringMat.opacity = 0.45;
      } else if (l.deposited > 0) {
        mat.color.setHex(0xffb347);
        mat.emissive.setHex(0xffb347);
        mat.emissiveIntensity = 0.7;
        lObj.light.intensity = 1.4;
        ringMat.opacity = 0.18;
      } else {
        mat.color.setHex(0x5b5f6e);
        mat.emissive.setHex(0x1b2350);
        mat.emissiveIntensity = 0.35;
        lObj.light.intensity = 0.25;
        ringMat.opacity = 0.08;
      }
      lObj.coreMesh.rotation.y = t * 1.2;
    }
  }

  // Sync Ink Shadows
  const activeShadeIds = new Set(w.shades.map((s) => s.id));
  for (const [id, obj] of shadeObjs.entries()) {
    if (!activeShadeIds.has(id)) {
      worldGroup.remove(obj.group);
      shadeObjs.delete(id);
    }
  }
  for (const s of w.shades) {
    let obj = shadeObjs.get(s.id);
    if (!obj) {
      obj = createInkShadowMesh();
      worldGroup.add(obj.group);
      shadeObjs.set(s.id, obj);
    }
    obj.group.position.set(s.pos[0], s.pos[1], s.pos[2]);
    obj.group.rotation.y = t * 2.0;
    const mat = obj.body.material as THREE.MeshStandardMaterial;
    if (s.state === 'stunned') {
      mat.color.setHex(0x3a3450);
      mat.emissive.setHex(0x3a3450);
    } else {
      mat.color.setHex(0x120a1a);
      mat.emissive.setHex(0x7a3cff);
    }
  }

  // Sync Drifters
  const activeDrifterIds = new Set(
    w.drifters.filter((d) => d.state !== 'removed').map((d) => d.id)
  );
  for (const [id, mesh] of drifterMeshes.entries()) {
    if (!activeDrifterIds.has(id)) {
      worldGroup.remove(mesh);
      drifterMeshes.delete(id);
    }
  }
  for (const d of w.drifters) {
    if (d.state === 'removed') continue;
    let mesh = drifterMeshes.get(d.id);
    if (!mesh) {
      mesh = createDrifterMesh();
      worldGroup.add(mesh);
      drifterMeshes.set(d.id, mesh);
    }
    mesh.position.set(d.pos[0], d.pos[1] + 1.3, d.pos[2]);
    mesh.rotation.y = t * 3.0;
  }

  // Sync Charms
  for (const c of w.charms) {
    const mesh = charmMeshes.get(c.id);
    if (mesh) {
      mesh.visible = c.available;
      mesh.rotation.y = t * 2.2;
    }
  }

  // Third-person Spherical Orbit Camera matching camYawDeg & camPitchDeg
  // Recall engine.ts forward (+Z when camYawDeg=0) is: [sin(yaw), cos(yaw)]
  // So camera sits BEHIND Mây at [-sin(yaw), -cos(yaw)]
  const yawRad = (camYawDeg * Math.PI) / 180;
  const pitchRad = (camPitchDeg * Math.PI) / 180;
  const horizDist = camDistance * Math.cos(pitchRad);
  const vertDist = camDistance * Math.sin(pitchRad);

  const targetCamX = w.player.pos[0] - Math.sin(yawRad) * horizDist;
  const targetCamY = w.player.pos[1] + 1.5 + vertDist;
  const targetCamZ = w.player.pos[2] - Math.cos(yawRad) * horizDist;

  camera.position.x += (targetCamX - camera.position.x) * 0.22;
  camera.position.y += (targetCamY - camera.position.y) * 0.22;
  camera.position.z += (targetCamZ - camera.position.z) * 0.22;
  camera.lookAt(w.player.pos[0], w.player.pos[1] + 1.4, w.player.pos[2]);
}

function handleEventsAndModals(events: ReturnType<typeof stepWorld>) {
  const w = sim.world;

  for (const ev of events) {
    if (ev.name === 'mote_picked' || ev.name === 'charm_picked') audio.playFireflyPickup();
    else if (ev.name === 'lantern_lit') audio.playLanternLit();
    else if (ev.name === 'pulse') {
      audio.playPulse();
      pulseAnimTicks = 22;
    } else if (ev.name === 'player_hit') audio.playShadowHit();
    else if (ev.name === 'dash') audio.playDash();
    else if (ev.name === 'shade_spawned') audio.playShadeSpawn();
    else if (ev.name === 'game_over') {
      if (document.pointerLockElement === canvas) {
        document.exitPointerLock?.();
      }
      if (ev.data.result === 'won') audio.playWin();
      else audio.playLose();
    }
  }

  const secLeft = Math.ceil(w.timeLeftTicks / 60);
  if (w.state === 'playing' && secLeft <= 10 && secLeft > 0 && secLeft !== lastCountdownSec) {
    lastCountdownSec = secLeft;
    audio.playCountdownTick();
  }

  const pauseModal = document.getElementById('pause-modal');
  if (pauseModal) {
    pauseModal.style.display = w.state === 'paused' ? 'flex' : 'none';
  }

  const endModal = document.getElementById('end-modal');
  const endTitle = document.getElementById('end-title');
  const endDesc = document.getElementById('end-desc');
  const btnNext = document.getElementById('btn-next-night');

  if (endModal && endTitle && endDesc && btnNext) {
    if (w.state === 'won' || w.state === 'lost') {
      endModal.style.display = 'flex';
      if (w.state === 'won') {
        if (currentNight === 3) {
          endTitle.textContent = 'Bình Minh Trên Đảo Đèn Lồng!';
          endDesc.textContent = `Mây đã xua tan toàn bộ sương đen qua cả 3 Đêm! Điểm Đêm 3: ${w.score} · Tổng điểm chiến dịch: ${totalCampaignScore}`;
          btnNext.textContent = 'Chơi lại từ Đêm 1';
        } else {
          endTitle.textContent = `Chiến Thắng ${NIGHT_TITLES[currentNight]}!`;
          endDesc.textContent = `Mây đã thắp sáng toàn bộ Đèn Lồng Lớn. Điểm Đêm ${currentNight}: ${w.score}`;
          btnNext.textContent = `Sang Đêm ${currentNight + 1}`;
        }
        btnNext.style.display = 'inline-block';
      } else {
        endTitle.textContent = 'Sương Đen Bao Phủ...';
        endDesc.textContent = `Mây chưa kịp thắp hết đèn trong Đêm ${currentNight}. Điểm đạt được: ${w.score}`;
        btnNext.style.display = 'none';
      }
    }
  }
}

// Fixed Timestep 60Hz Accumulator so game physics run at exact 60 ticks/sec regardless of monitor refresh rate
let lastTimeMs = performance.now();
let accumulatorS = 0;

function animate(nowMs: number) {
  requestAnimationFrame(animate);
  const deltaS = Math.min(0.1, (nowMs - lastTimeMs) / 1000);
  lastTimeMs = nowMs;
  accumulatorS += deltaS;

  const introModal = document.getElementById('intro-modal');
  const isIntroOpen = introModal && introModal.style.display === 'flex';

  while (accumulatorS >= DT) {
    accumulatorS -= DT;
    if (!isIntroOpen) {
      const frame = buildInputFrame();
      if (frame.jump && sim.world.player.grounded) {
        audio.playJump();
      }
      const prevState = sim.world.state;
      const events = stepWorld(sim.world, sim.prng, inputState, frame);
      if (prevState === 'playing' && sim.world.state === 'won') {
        totalCampaignScore += sim.world.score;
      }
      handleEventsAndModals(events);
    }
  }

  syncSceneVisuals();
  updateHUD(sim.world, totalCampaignScore, camera, camYawDeg);
  renderer.render(scene, camera);
}

updateHUD(sim.world, totalCampaignScore, camera, camYawDeg);
requestAnimationFrame(animate);
