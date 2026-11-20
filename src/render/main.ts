import * as THREE from 'three';
import {
  createDefaultInputState,
  createWorld,
  PersistentInputState,
  stepWorld,
} from '../core/engine.ts';
import { PRNG } from '../core/prng.ts';
import { InputFrame, SimWorld } from '../core/types.ts';
import { ProceduralAudio } from './audio.ts';
import { initMoteSlots, updateHUD } from './hud.ts';
import {
  createCharmMesh,
  createDrifterMesh,
  createFireflyMesh,
  createGreatLanternMesh,
  createInkShadowMesh,
  createIslandMeshForNight,
  createMayCharacterMesh,
} from './meshes.ts';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e1430);
scene.fog = new THREE.FogExp2(0x1b2350, 0.018);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 260);
camera.position.set(0, 16, -20);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffe9b0, 0.55);
dirLight.position.set(20, 40, 20);
scene.add(dirLight);

const audio = new ProceduralAudio();

// Load saved settings from localStorage
const savedVol = localStorage.getItem('dao_den_long_volume');
if (savedVol !== null) {
  audio.volume = Number(savedVol) / 100;
  const volSlider = document.getElementById('slider-volume') as HTMLInputElement | null;
  if (volSlider) volSlider.value = savedVol;
}

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
const moteMeshes = new Map<string, THREE.Mesh>();
const lanternObjs = new Map<
  string,
  { group: THREE.Group; coreMesh: THREE.Mesh; light: THREE.PointLight; safeRing: THREE.Mesh }
>();
const shadeObjs = new Map<string, { group: THREE.Group; body: THREE.Mesh }>();
const drifterMeshes = new Map<string, THREE.Mesh>();
const charmMeshes = new Map<string, THREE.Mesh>();
const orbitMotes: THREE.Mesh[] = [];

function rebuildScene(w: SimWorld) {
  worldGroup.clear();
  moteMeshes.clear();
  lanternObjs.clear();
  shadeObjs.clear();
  drifterMeshes.clear();
  charmMeshes.clear();
  orbitMotes.length = 0;

  worldGroup.add(createIslandMeshForNight(w.night));

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
  if (e.code === 'Escape' || e.code === 'KeyP') pendingPause = true;
  if (e.code === 'KeyR') startNight(currentNight);
});

window.addEventListener('keyup', (e) => {
  keysPressed.delete(e.code);
});

function startNight(night: 1 | 2 | 3) {
  currentNight = night;
  sim = createWorld({
    seed: 202603664 + night * 17,
    night: currentNight,
    contractVersion: '1.1',
  });
  inputState = createDefaultInputState();
  lastCountdownSec = -1;
  rebuildScene(sim.world);
  const pauseModal = document.getElementById('pause-modal');
  const endModal = document.getElementById('end-modal');
  if (pauseModal) pauseModal.style.display = 'none';
  if (endModal) endModal.style.display = 'none';
  updateHUD(sim.world, totalCampaignScore);
}

// UI Buttons
document.getElementById('btn-night-1')?.addEventListener('click', () => startNight(1));
document.getElementById('btn-night-2')?.addEventListener('click', () => startNight(2));
document.getElementById('btn-night-3')?.addEventListener('click', () => startNight(3));
document.getElementById('btn-pause')?.addEventListener('click', () => {
  pendingPause = true;
});
document.getElementById('btn-resume')?.addEventListener('click', () => {
  pendingPause = true;
});
document.getElementById('btn-restart-night')?.addEventListener('click', () => startNight(currentNight));
document.getElementById('btn-play-again')?.addEventListener('click', () => startNight(currentNight));
document.getElementById('btn-next-night')?.addEventListener('click', () => {
  if (currentNight < 3) {
    startNight((currentNight + 1) as 1 | 2 | 3);
  } else {
    totalCampaignScore = 0;
    startNight(1);
  }
});

document.getElementById('slider-volume')?.addEventListener('input', (e) => {
  const val = Number((e.target as HTMLInputElement).value);
  audio.volume = val / 100;
  localStorage.setItem('dao_den_long_volume', String(val));
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function buildInputFrame(): Partial<InputFrame> {
  let mx = 0;
  let mz = 0;
  // Camera looks from -Z toward +Z, so W moves +Z, S moves -Z, A moves +X, D moves -X
  if (keysPressed.has('KeyW') || keysPressed.has('ArrowUp')) mz += 1;
  if (keysPressed.has('KeyS') || keysPressed.has('ArrowDown')) mz -= 1;
  if (keysPressed.has('KeyA') || keysPressed.has('ArrowLeft')) mx += 1;
  if (keysPressed.has('KeyD') || keysPressed.has('ArrowRight')) mx -= 1;

  const frame: Partial<InputFrame> = {
    move: [mx, mz],
    cam_yaw_deg: 0,
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

  // Sync Mây position & rotation
  mayObj.group.position.set(w.player.pos[0], w.player.pos[1], w.player.pos[2]);
  mayObj.group.rotation.y = Math.atan2(w.player.facingDir[0], w.player.facingDir[1]);

  // Creative Feature: Orbiting fireflies around Mây
  while (orbitMotes.length < w.player.carried) {
    const orb = createFireflyMesh();
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
      mesh = createFireflyMesh();
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

  // Third-person camera follow
  const targetCamX = w.player.pos[0];
  const targetCamY = w.player.pos[1] + 13;
  const targetCamZ = w.player.pos[2] - 16;
  camera.position.x += (targetCamX - camera.position.x) * 0.1;
  camera.position.y += (targetCamY - camera.position.y) * 0.1;
  camera.position.z += (targetCamZ - camera.position.z) * 0.1;
  camera.lookAt(w.player.pos[0], w.player.pos[1] + 1.2, w.player.pos[2]);
}

function handleEventsAndModals(events: ReturnType<typeof stepWorld>) {
  const w = sim.world;

  for (const ev of events) {
    if (ev.name === 'mote_picked' || ev.name === 'charm_picked') audio.playFireflyPickup();
    else if (ev.name === 'lantern_lit') audio.playLanternLit();
    else if (ev.name === 'pulse') audio.playPulse();
    else if (ev.name === 'player_hit') audio.playShadowHit();
    else if (ev.name === 'dash') audio.playDash();
    else if (ev.name === 'shade_spawned') audio.playShadeSpawn();
    else if (ev.name === 'game_over') {
      if (ev.data.result === 'won') audio.playWin();
      else audio.playLose();
    }
  }

  // 10-second final countdown beep
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
          endDesc.textContent = `Mây đã hoàn thành cả 3 Đêm! Điểm Đêm 3: ${w.score} · Tổng điểm chiến dịch: ${totalCampaignScore + w.score}`;
          btnNext.textContent = 'Chơi lại từ Đêm 1';
        } else {
          endTitle.textContent = `Chiến Thắng Đêm ${currentNight}!`;
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

function animate() {
  requestAnimationFrame(animate);
  const frame = buildInputFrame();
  if (frame.jump && sim.world.player.grounded) {
    audio.playJump();
  }
  const prevState = sim.world.state;
  const events = stepWorld(sim.world, sim.prng, inputState, frame);
  if (prevState === 'playing' && sim.world.state === 'won') {
    totalCampaignScore += sim.world.score;
  }
  syncSceneVisuals();
  updateHUD(sim.world, totalCampaignScore);
  handleEventsAndModals(events);
  renderer.render(scene, camera);
}

updateHUD(sim.world, totalCampaignScore);
animate();
