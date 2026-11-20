import * as THREE from 'three';
import { DT, FUEL_UNITS_PER_FUEL, MAX_FUEL_UNITS, NIGHT1_LANTERNS } from '../core/config.ts';
import {
  createDefaultInputState,
  createWorld,
  PersistentInputState,
  stepWorld,
} from '../core/engine.ts';
import {
  addLeaderboardEntry,
  isValidPlayerName,
  type LeaderboardData,
  type LeaderboardEntry,
  sortAndCapLeaderboard,
} from '../core/leaderboard.ts';
import { PRNG } from '../core/prng.ts';
import { InputFrame, SimWorld, Vec3Tuple } from '../core/types.ts';
import { ProceduralAudio } from './audio.ts';
import {
  DEFAULT_KEY_BINDINGS,
  formatKeyCode,
  initMoteSlots,
  KEY_ACTION_LABELS,
  type KeyBindings,
  NIGHT_LORE,
  NIGHT_TITLES,
  type SubtitleState,
  updateHUD,
} from './hud.ts';
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

const urlParams = new URLSearchParams(window.location.search);
const isWebBenchMode = urlParams.get('bench') === '1';

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

// Camera & Accessibility State
let camYawDeg = 0;
let camPitchDeg = 26;
let camDistance = 17;
let mouseSensitivity = 5;
let colorblindMode = false;
let reducedMotion = false;
let largeText = false;
let subtitlesEnabled = true;
let isDraggingMouse = false;
let lastMouseX = 0;
let lastMouseY = 0;
let hitShakeTicks = 0;

// Key Remapping State (Ticket-04 Section 4)
let keyBindings: KeyBindings = { ...DEFAULT_KEY_BINDINGS };
let awaitingKeyAction: keyof KeyBindings | null = null;

try {
  const savedKeys = localStorage.getItem('dao_den_long_keybinds');
  if (savedKeys) {
    const parsed = JSON.parse(savedKeys);
    keyBindings = { ...DEFAULT_KEY_BINDINGS, ...parsed };
  }
} catch {
  keyBindings = { ...DEFAULT_KEY_BINDINGS };
}

// Subtitle & Visual Indicator State (Ticket-04 Section 4)
const subtitleState: SubtitleState = {
  eventText: '',
  eventExpireMs: 0,
  lastSpawnedShadePos: null,
  lastSpawnedShadeId: '',
  shadeArrowExpireMs: 0,
};

function pushSubtitle(text: string, durationMs = 3200): void {
  subtitleState.eventText = text;
  subtitleState.eventExpireMs = performance.now() + durationMs;
}

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

const savedCb = localStorage.getItem('dao_den_long_colorblind');
if (savedCb === 'true') {
  colorblindMode = true;
  document.body.classList.add('colorblind');
  const chkCb = document.getElementById('chk-colorblind') as HTMLInputElement | null;
  if (chkCb) chkCb.checked = true;
}

const savedRm = localStorage.getItem('dao_den_long_reduced_motion');
if (savedRm === 'true') {
  reducedMotion = true;
  document.body.classList.add('reduced-motion');
  const chkRm = document.getElementById('chk-reduced-motion') as HTMLInputElement | null;
  if (chkRm) chkRm.checked = true;
}

const savedLt = localStorage.getItem('dao_den_long_large_text');
if (savedLt === 'true') {
  largeText = true;
  document.body.classList.add('large-text');
  const chkLt = document.getElementById('chk-large-text') as HTMLInputElement | null;
  if (chkLt) chkLt.checked = true;
}

const savedSub = localStorage.getItem('dao_den_long_subtitles');
if (savedSub === 'false') {
  subtitlesEnabled = false;
  const chkSub = document.getElementById('chk-subtitles') as HTMLInputElement | null;
  if (chkSub) chkSub.checked = false;
}

// Keybinding UI Builder & Duplicate Detection (Ticket-04 Section 4)
function renderKeybindGrid(): void {
  const grid = document.getElementById('keybind-grid');
  const warnEl = document.getElementById('keybind-warning');
  if (!grid) return;

  grid.innerHTML = '';
  const usedCounts = new Map<string, Array<keyof KeyBindings>>();
  (Object.keys(keyBindings) as Array<keyof KeyBindings>).forEach((action) => {
    const code = keyBindings[action];
    const list = usedCounts.get(code) ?? [];
    list.push(action);
    usedCounts.set(code, list);
  });

  const duplicateDescriptions: string[] = [];
  for (const [code, actions] of usedCounts.entries()) {
    if (actions.length > 1) {
      const names = actions.map((a) => KEY_ACTION_LABELS[a]).join(' & ');
      duplicateDescriptions.push(`Phím [${formatKeyCode(code)}] đang bị trùng giữa: ${names}`);
    }
  }

  if (warnEl) {
    warnEl.textContent =
      duplicateDescriptions.length > 0 ? `⚠ Cảnh báo: ${duplicateDescriptions.join(' | ')}` : '';
  }

  (Object.keys(KEY_ACTION_LABELS) as Array<keyof KeyBindings>).forEach((action) => {
    const row = document.createElement('div');
    row.className = 'keybind-row';

    const label = document.createElement('span');
    label.textContent = KEY_ACTION_LABELS[action];

    const btn = document.createElement('button');
    btn.className = 'hud-btn';
    const isDuplicate = (usedCounts.get(keyBindings[action])?.length ?? 0) > 1;
    if (awaitingKeyAction === action) {
      btn.textContent = 'Nhấn phím mới...';
      btn.style.borderColor = '#FF5A5F';
      btn.style.color = '#FF5A5F';
    } else {
      btn.textContent = formatKeyCode(keyBindings[action]);
      if (isDuplicate) {
        btn.style.borderColor = '#FF5A5F';
        btn.style.color = '#FF5A5F';
      }
    }

    btn.addEventListener('click', () => {
      awaitingKeyAction = action;
      renderKeybindGrid();
    });

    row.appendChild(label);
    row.appendChild(btn);
    grid.appendChild(row);
  });
}

renderKeybindGrid();

document.getElementById('btn-reset-keys')?.addEventListener('click', () => {
  keyBindings = { ...DEFAULT_KEY_BINDINGS };
  awaitingKeyAction = null;
  localStorage.setItem('dao_den_long_keybinds', JSON.stringify(keyBindings));
  renderKeybindGrid();
});

// Local Leaderboard Sync (localStorage + /api/leaderboard disk sync)
const LOCAL_LB_KEY = 'dao_den_long_leaderboard_v1_3';

async function fetchLeaderboard(): Promise<LeaderboardData> {
  let localEntries: LeaderboardEntry[] = [];
  try {
    const raw = localStorage.getItem(LOCAL_LB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.entries)) {
        localEntries = parsed.entries;
      }
    }
  } catch {
    localEntries = [];
  }

  try {
    const res = await fetch('/api/leaderboard');
    if (res.ok) {
      const diskData = (await res.json()) as LeaderboardData;
      const merged = sortAndCapLeaderboard([...(diskData.entries ?? []), ...localEntries]);
      localStorage.setItem(LOCAL_LB_KEY, JSON.stringify({ entries: merged }));
      return { entries: merged };
    }
  } catch {
    // Fallback to localStorage if static preview
  }

  if (localEntries.length === 0) {
    localEntries = [
      {
        name: 'May',
        score: 4820,
        nights_won: 3,
        achieved_at: '2026-04-20T14:32:10+07:00',
        seed: 1842901,
      },
    ];
  }
  const sorted = sortAndCapLeaderboard(localEntries);
  return { entries: sorted };
}

async function submitLeaderboardRecord(entry: LeaderboardEntry): Promise<LeaderboardData> {
  const current = await fetchLeaderboard();
  const updated = addLeaderboardEntry(current, entry);
  localStorage.setItem(LOCAL_LB_KEY, JSON.stringify(updated));

  try {
    const res = await fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    if (res.ok) {
      const diskUpdated = (await res.json()) as LeaderboardData;
      localStorage.setItem(LOCAL_LB_KEY, JSON.stringify(diskUpdated));
      return diskUpdated;
    }
  } catch {
    // Saved in localStorage when static
  }
  return updated;
}

async function openLeaderboardModal(): Promise<void> {
  const modal = document.getElementById('leaderboard-modal');
  const tbody = document.getElementById('leaderboard-tbody');
  if (!modal || !tbody) return;

  modal.style.display = 'flex';
  tbody.innerHTML = '<tr><td colspan="6">Đang tải...</td></tr>';

  const data = await fetchLeaderboard();
  if (data.entries.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6">Chưa có kỷ lục nào.</td></tr>';
    return;
  }

  tbody.innerHTML = data.entries
    .map((e, idx) => {
      const shortDate = e.achieved_at.replace('T', ' ').slice(0, 19);
      return `<tr>
        <td><b>#${idx + 1}</b></td>
        <td style="color:#FFE9B0;font-weight:700">${e.name}</td>
        <td style="color:#F2C14E;font-weight:800">${e.score}</td>
        <td>${e.nights_won} / 3</td>
        <td><code>${e.seed}</code></td>
        <td>${shortDate}</td>
      </tr>`;
    })
    .join('');
}

function applyMouseDelta(dx: number, dy: number) {
  const factor = mouseSensitivity * 0.065;
  camYawDeg = (camYawDeg - dx * factor) % 360;
  camPitchDeg = Math.max(10, Math.min(72, camPitchDeg + dy * factor * 0.75));
}

canvas.addEventListener('mousedown', (e) => {
  if (isWebBenchMode) return;
  isDraggingMouse = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  if (e.button === 0 && document.pointerLockElement !== canvas) {
    canvas.requestPointerLock?.();
  }
});

window.addEventListener('mouseup', () => {
  isDraggingMouse = false;
});

window.addEventListener('mousemove', (e) => {
  if (isWebBenchMode) return;
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
    if (isWebBenchMode) return;
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
        : 'Chuột: Click vào cảnh hoặc Kéo chuột xoay 360°';
  }
});

let currentNight: 1 | 2 | 3 = 1;
let totalCampaignScore = 0;
let nightsWonCount = 0;
let campaignBaseSeed = 202603664;
let hasSubmittedCurrentRunScore = false;

let sim: { world: SimWorld; prng: PRNG } = createWorld({
  seed: campaignBaseSeed,
  night: currentNight,
  contractVersion: '1.3',
});
let inputState: PersistentInputState = createDefaultInputState();
let lastCountdownSec = -1;

// Setup Web Benchmark Scene if ?bench=1 is passed (Ticket-04 Section 1)
if (isWebBenchMode) {
  const benchPrng = new PRNG(42);
  const benchMotes: Vec3Tuple[] = [];
  for (let i = 0; i < 100; i++) {
    const angle = benchPrng.nextRange(0, Math.PI * 2);
    const r = Math.sqrt(benchPrng.next()) * 37;
    benchMotes.push([Math.cos(angle) * r, 0, Math.sin(angle) * r]);
  }
  const benchShades: Array<{ id: string; pos: Vec3Tuple; state: 'wander' }> = [];
  for (let i = 0; i < 200; i++) {
    const angle = benchPrng.nextRange(0, Math.PI * 2);
    const r = Math.sqrt(benchPrng.next()) * 38;
    benchShades.push({
      id: `S${i + 1}`,
      pos: [Math.cos(angle) * r, 0, Math.sin(angle) * r],
      state: 'wander',
    });
  }
  sim = createWorld({
    seed: 42,
    night: 1,
    contractVersion: '1.3',
    scenario: {
      player: { pos: [0, 0, 0], carried: 0, flames: 3 },
      random_motes: false,
      random_shades: false,
      lanterns: NIGHT1_LANTERNS.map((l, idx) => ({
        id: l.id,
        pos: l.pos,
        lit: idx < 3,
        deposited: idx < 3 ? 10 : 0,
        fuel: idx < 3 ? 100 : 0,
      })),
      motes: benchMotes,
      shades: benchShades,
    },
  });
}

const worldGroup = new THREE.Group();
scene.add(worldGroup);

let mayObj = createMayCharacterMesh();
let islandAnimatedModels: THREE.Object3D[] = [];
const moteMeshes = new Map<string, THREE.Group>();
const lanternObjs = new Map<string, ReturnType<typeof createGreatLanternMesh>>();
const shadeObjs = new Map<string, ReturnType<typeof createInkShadowMesh>>();
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
  islandAnimatedModels = isWebBenchMode ? [] : islandBuilt.animatedModels;

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

initMoteSlots(10);
rebuildScene(sim.world);

// Keyboard state & one-shot triggers with custom KeyBindings support
const keysPressed = new Set<string>();
let pendingJump = false;
let pendingInteract = false;
let pendingPulse = false;
let pendingDash = false;
let pendingPause = false;

window.addEventListener('keydown', (e) => {
  // Don't trigger game binds when typing player name in input box
  if ((e.target as HTMLElement)?.tagName === 'INPUT') {
    return;
  }

  // Handle key rebinding capture mode
  if (awaitingKeyAction !== null) {
    e.preventDefault();
    if (e.code !== 'Escape') {
      keyBindings[awaitingKeyAction] = e.code;
      localStorage.setItem('dao_den_long_keybinds', JSON.stringify(keyBindings));
    }
    awaitingKeyAction = null;
    renderKeybindGrid();
    return;
  }

  keysPressed.add(e.code);
  if (e.code === keyBindings.jump) pendingJump = true;
  if (e.code === keyBindings.interact) pendingInteract = true;
  if (e.code === keyBindings.pulse) pendingPulse = true;
  if (
    e.code === keyBindings.dash ||
    (keyBindings.dash === 'ShiftLeft' && e.code === 'ShiftRight')
  ) {
    pendingDash = true;
  }
  if (e.code === keyBindings.pause) {
    pendingPause = true;
    if (document.pointerLockElement === canvas) {
      document.exitPointerLock?.();
    }
  }
  if (e.code === 'KeyR' && sim.world.state === 'playing') startNight(currentNight);
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
  if (night === 1 && (sim.world.state === 'lost' || (sim.world.state === 'won' && currentNight === 3))) {
    totalCampaignScore = 0;
    nightsWonCount = 0;
  }
  currentNight = night;
  camYawDeg = 0;
  hasSubmittedCurrentRunScore = false;
  const formMsg = document.getElementById('leaderboard-form-msg');
  if (formMsg) formMsg.textContent = '';
  const saveBtn = document.getElementById('btn-save-score') as HTMLButtonElement | null;
  if (saveBtn) saveBtn.disabled = false;

  sim = createWorld({
    seed: campaignBaseSeed + night * 17,
    night: currentNight,
    contractVersion: '1.3',
  });
  inputState = createDefaultInputState();
  lastCountdownSec = -1;
  pulseAnimTicks = 0;
  hitShakeTicks = 0;
  subtitleState.eventText = '';
  subtitleState.lastSpawnedShadePos = null;
  rebuildScene(sim.world);
  const introModal = document.getElementById('intro-modal');
  const pauseModal = document.getElementById('pause-modal');
  const endModal = document.getElementById('end-modal');
  if (introModal) introModal.style.display = 'none';
  if (pauseModal) pauseModal.style.display = 'none';
  if (endModal) endModal.style.display = 'none';
  updateHUD(
    sim.world,
    totalCampaignScore,
    camera,
    camYawDeg,
    colorblindMode,
    keyBindings,
    subtitlesEnabled,
    subtitleState
  );
}

// UI Buttons
document.getElementById('btn-night-1')?.addEventListener('click', () => {
  totalCampaignScore = 0;
  nightsWonCount = 0;
  startNight(1);
});
document.getElementById('btn-night-2')?.addEventListener('click', () => startNight(2));
document.getElementById('btn-night-3')?.addEventListener('click', () => startNight(3));
document.getElementById('btn-menu')?.addEventListener('click', () => showIntroModalForNight(currentNight));
document.getElementById('btn-start-night')?.addEventListener('click', () => startNight(currentNight));
document.getElementById('btn-select-n2')?.addEventListener('click', () => startNight(2));
document.getElementById('btn-select-n3')?.addEventListener('click', () => startNight(3));

document.getElementById('btn-open-leaderboard')?.addEventListener('click', () => {
  openLeaderboardModal();
});
document.getElementById('btn-menu-leaderboard')?.addEventListener('click', () => {
  openLeaderboardModal();
});
document.getElementById('btn-end-leaderboard')?.addEventListener('click', () => {
  openLeaderboardModal();
});
document.getElementById('btn-close-leaderboard')?.addEventListener('click', () => {
  const modal = document.getElementById('leaderboard-modal');
  if (modal) modal.style.display = 'none';
});

document.getElementById('btn-menu-settings')?.addEventListener('click', () => {
  const introModal = document.getElementById('intro-modal');
  const pauseModal = document.getElementById('pause-modal');
  if (introModal) introModal.style.display = 'none';
  if (pauseModal) pauseModal.style.display = 'flex';
});

document.getElementById('btn-pause')?.addEventListener('click', () => {
  pendingPause = true;
});
document.getElementById('btn-resume')?.addEventListener('click', () => {
  if (sim.world.state === 'paused') {
    pendingPause = true;
  } else {
    const pauseModal = document.getElementById('pause-modal');
    if (pauseModal) pauseModal.style.display = 'none';
  }
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
    nightsWonCount = 0;
    showIntroModalForNight(1);
  }
});

// Save Score to Leaderboard (Ticket-04 Section 3)
document.getElementById('btn-save-score')?.addEventListener('click', async () => {
  if (hasSubmittedCurrentRunScore) return;
  const inputEl = document.getElementById('input-player-name') as HTMLInputElement | null;
  const msgEl = document.getElementById('leaderboard-form-msg');
  const saveBtn = document.getElementById('btn-save-score') as HTMLButtonElement | null;
  if (!inputEl || !msgEl) return;

  const rawName = inputEl.value.trim();
  if (!isValidPlayerName(rawName)) {
    msgEl.style.color = '#FF5A5F';
    msgEl.textContent = '⚠ Tên phải dài 3–12 ký tự (chỉ dùng chữ cái, số hoặc dấu gạch dưới _).';
    return;
  }

  hasSubmittedCurrentRunScore = true;
  if (saveBtn) saveBtn.disabled = true;

  // Format ISO 8601 with local timezone offset (+07:00)
  const now = new Date();
  const tzOffsetMin = -now.getTimezoneOffset();
  const sign = tzOffsetMin >= 0 ? '+' : '-';
  const pad2 = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, '0');
  const isoLocal =
    `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}` +
    `T${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}` +
    `${sign}${pad2(tzOffsetMin / 60)}:${pad2(tzOffsetMin % 60)}`;

  const entry: LeaderboardEntry = {
    name: rawName,
    score: totalCampaignScore,
    nights_won: Math.min(3, nightsWonCount),
    achieved_at: isoLocal,
    seed: sim.world.seed,
  };

  await submitLeaderboardRecord(entry);
  msgEl.style.color = '#FFE58A';
  msgEl.textContent = `✔ Đã lưu kỷ lục của "${rawName}" (${entry.score} điểm, ${entry.nights_won} đêm thắng) vào leaderboard.json!`;
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

document.getElementById('chk-colorblind')?.addEventListener('change', (e) => {
  colorblindMode = (e.target as HTMLInputElement).checked;
  document.body.classList.toggle('colorblind', colorblindMode);
  localStorage.setItem('dao_den_long_colorblind', String(colorblindMode));
});

document.getElementById('chk-reduced-motion')?.addEventListener('change', (e) => {
  reducedMotion = (e.target as HTMLInputElement).checked;
  document.body.classList.toggle('reduced-motion', reducedMotion);
  localStorage.setItem('dao_den_long_reduced_motion', String(reducedMotion));
});

document.getElementById('chk-large-text')?.addEventListener('change', (e) => {
  largeText = (e.target as HTMLInputElement).checked;
  document.body.classList.toggle('large-text', largeText);
  localStorage.setItem('dao_den_long_large_text', String(largeText));
});

document.getElementById('chk-subtitles')?.addEventListener('change', (e) => {
  subtitlesEnabled = (e.target as HTMLInputElement).checked;
  localStorage.setItem('dao_den_long_subtitles', String(subtitlesEnabled));
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function buildInputFrame(): Partial<InputFrame> {
  if (keysPressed.has('ArrowLeft')) camYawDeg = (camYawDeg + 2.2) % 360;
  if (keysPressed.has('ArrowRight')) camYawDeg = (camYawDeg - 2.2) % 360;

  let mx = 0;
  let mz = 0;
  if (keysPressed.has(keyBindings.up) || keysPressed.has('ArrowUp')) mz += 1;
  if (keysPressed.has(keyBindings.down) || keysPressed.has('ArrowDown')) mz -= 1;
  if (keysPressed.has(keyBindings.left)) mx += 1;
  if (keysPressed.has(keyBindings.right)) mx -= 1;

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

function syncSceneVisuals(elapsedBenchSec = 0) {
  const w = sim.world;
  const t = w.simTick / 60;

  // Ambient light intensity formula: 0.15 + 0.55 * (lit / total)
  const litCount = w.lanterns.filter((l) => l.lit).length;
  ambientLight.intensity = 0.15 + 0.55 * (litCount / Math.max(1, w.lanterns.length));

  // Sync Mây
  mayObj.group.position.set(w.player.pos[0], w.player.pos[1], w.player.pos[2]);
  mayObj.group.rotation.y = Math.atan2(w.player.facingDir[0], w.player.facingDir[1]);
  mayObj.group.visible =
    w.player.respawnWaitTicks === 0 &&
    (w.player.invulnTicks === 0 || reducedMotion || Math.floor(w.simTick / 4) % 2 === 0);

  // Pulse wave (respect Reduced Motion setting)
  if (pulseAnimTicks > 0 && !reducedMotion) {
    pulseAnimTicks -= 1;
    pulseWaveMesh.visible = true;
    const progress = 1 - pulseAnimTicks / 22;
    const scale = 0.5 + progress * w.tuning.pulse_radius;
    pulseWaveMesh.position.set(w.player.pos[0], w.player.pos[1] + 0.35, w.player.pos[2]);
    pulseWaveMesh.scale.set(scale, scale, 1);
    (pulseWaveMesh.material as THREE.MeshBasicMaterial).opacity = (1 - progress) * 0.85;
  } else {
    pulseAnimTicks = 0;
    pulseWaveMesh.visible = false;
  }

  for (const model of islandAnimatedModels) {
    const birdAngle = t * 0.35;
    model.position.set(
      Math.cos(birdAngle) * 22,
      14 + Math.sin(t * 1.5) * 1.2,
      Math.sin(birdAngle) * 22
    );
    model.rotation.y = -birdAngle;
  }

  const windMat = skyFx.windParticles.material as THREE.PointsMaterial;
  if ((w.wind.warning || w.wind.active) && !isWebBenchMode) {
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

  // Orbiting fireflies around Mây
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

  // Sync active motes
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
      m.pos[1] + 0.65 + (reducedMotion ? 0 : Math.sin(t * 3 + m.pos[0]) * 0.2),
      m.pos[2]
    );
  }

  // Sync Great Lanterns (Ticket-03 Section 1 & 6: fuel bar, 1Hz blink when fuel < 30, 20% squashed + tear mark when unlit)
  const blink1Hz = reducedMotion ? true : Math.sin(t * Math.PI * 2) > 0;
  for (const l of w.lanterns) {
    const lObj = lanternObjs.get(l.id);
    if (lObj) {
      const mat = lObj.coreMesh.material as THREE.MeshStandardMaterial;
      const ringMat = lObj.safeRing.material as THREE.MeshBasicMaterial;
      const fillMat = lObj.fuelBarFill.material as THREE.MeshBasicMaterial;

      if (l.lit) {
        const fuelRatio = Math.max(0.01, l.fuelUnits / MAX_FUEL_UNITS);
        const isLowFuel = l.fuelUnits < w.tuning.low_fuel_threshold * FUEL_UNITS_PER_FUEL;

        lObj.coreMesh.scale.set(1, 1, 1);
        lObj.tearBand.visible = false;
        lObj.fuelBarBg.visible = true;
        lObj.fuelBarFill.visible = !isLowFuel || blink1Hz;
        lObj.fuelBarFill.scale.set(fuelRatio, 1, 1);
        lObj.fuelBarFill.position.x = -0.68 * (1 - fuelRatio);
        fillMat.color.setHex(
          isLowFuel ? (colorblindMode ? 0xffffff : 0xff5a5f) : 0xffb347
        );

        mat.color.setHex(0xffe9b0);
        mat.emissive.setHex(0xffb347);
        mat.emissiveIntensity = isLowFuel ? (blink1Hz ? 1.5 : 0.4) : 1.6;
        lObj.light.intensity = isLowFuel ? (blink1Hz ? 3.5 : 1.0) : 4.5;
        ringMat.opacity = isLowFuel ? 0.03 : 0.45;
      } else {
        lObj.coreMesh.scale.set(1, 0.8, 1);
        lObj.tearBand.visible = true;
        lObj.fuelBarBg.visible = false;
        lObj.fuelBarFill.visible = false;

        if (l.deposited > 0) {
          mat.color.setHex(0xffb347);
          mat.emissive.setHex(0xffb347);
          mat.emissiveIntensity = 0.7;
          lObj.light.intensity = 1.4;
          ringMat.opacity = 0.15;
        } else {
          mat.color.setHex(0x5b5f6e);
          mat.emissive.setHex(0x1b2350);
          mat.emissiveIntensity = 0.35;
          lObj.light.intensity = 0.25;
          ringMat.opacity = 0.06;
        }
      }
      lObj.coreMesh.rotation.y = t * 1.2;
    }
  }

  // Sync Ink Shadows
  const shadeAccentHex = colorblindMode ? 0x00b3ff : 0x7a3cff;
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
    const rimMat = obj.rim.material as THREE.MeshBasicMaterial;
    rimMat.color.setHex(shadeAccentHex);
    if (s.state === 'stunned') {
      mat.color.setHex(0x3a3450);
      mat.emissive.setHex(0x3a3450);
    } else if (s.state === 'drain') {
      mat.color.setHex(0x120a1a);
      mat.emissive.setHex(0xffb347);
    } else {
      mat.color.setHex(0x120a1a);
      mat.emissive.setHex(shadeAccentHex);
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

  // Camera Positioning: Benchmark Circular Orbit vs Player Spherical Orbit
  if (isWebBenchMode) {
    const theta = ((Math.PI * 2) / 15.0) * elapsedBenchSec;
    camera.position.set(30 * Math.cos(theta), 15, -30 * Math.sin(theta));
    camera.lookAt(0, 0, 0);
    return;
  }

  const yawRad = (camYawDeg * Math.PI) / 180;
  const pitchRad = (camPitchDeg * Math.PI) / 180;
  const horizDist = camDistance * Math.cos(pitchRad);
  const vertDist = camDistance * Math.sin(pitchRad);

  let shakeX = 0;
  let shakeY = 0;
  if (hitShakeTicks > 0) {
    hitShakeTicks--;
    if (!reducedMotion) {
      shakeX = Math.sin(hitShakeTicks * 1.9) * 0.35;
      shakeY = Math.cos(hitShakeTicks * 2.3) * 0.25;
    }
  }

  const targetCamX = w.player.pos[0] - Math.sin(yawRad) * horizDist + shakeX;
  const targetCamY = w.player.pos[1] + 1.5 + vertDist + shakeY;
  const targetCamZ = w.player.pos[2] - Math.cos(yawRad) * horizDist;

  camera.position.x += (targetCamX - camera.position.x) * 0.22;
  camera.position.y += (targetCamY - camera.position.y) * 0.22;
  camera.position.z += (targetCamZ - camera.position.z) * 0.22;
  camera.lookAt(w.player.pos[0], w.player.pos[1] + 1.4, w.player.pos[2]);
}

function handleEventsAndModals(events: ReturnType<typeof stepWorld>) {
  const w = sim.world;

  for (const ev of events) {
    if (ev.name === 'mote_picked' || ev.name === 'charm_picked' || ev.name === 'refuel') {
      audio.playFireflyPickup();
      if (ev.name === 'refuel') {
        pushSubtitle(`🏮 Đã châm thêm đom đóm vào đèn ${ev.data.lantern_id} (Dầu: ${ev.data.fuel}%)`);
      }
    } else if (ev.name === 'lantern_lit') {
      audio.playLanternLit();
      pushSubtitle(
        `✨ Đèn ${ev.data.lantern_id} đã tỏa sáng (${ev.data.relight ? 'Thắp lại +40đ' : 'Thắp mới +100đ'})! Sức chứa +2!`
      );
    } else if (ev.name === 'lantern_out') {
      audio.playShadowHit();
      pushSubtitle(`⚠ [Đèn tắt] Đèn ${ev.data.lantern_id} đã cạn sạch dầu và tắt!`, 4000);
    } else if (ev.name === 'fuel_drain') {
      pushSubtitle(`🖤 [Cảnh báo] Bóng Mực ${ev.data.shade_id} đang hút dầu đèn ${ev.data.lantern_id}!`);
    } else if (ev.name === 'pulse') {
      audio.playPulse();
      pulseAnimTicks = 22;
    } else if (ev.name === 'player_hit') {
      audio.playShadowHit();
      hitShakeTicks = 18;
      pushSubtitle(`🔥 [Trúng đòn] Mây bị mất 1 Ngọn Lửa (Còn ${ev.data.flames})!`);
    } else if (ev.name === 'dash') {
      audio.playDash();
    } else if (ev.name === 'shade_spawned') {
      audio.playShadeSpawn();
      const shadeId = String(ev.data.id ?? 'S');
      const pos = (ev.data.pos as Vec3Tuple) ?? [0, 0, 0];
      subtitleState.lastSpawnedShadeId = shadeId;
      subtitleState.lastSpawnedShadePos = pos;
      subtitleState.shadeArrowExpireMs = performance.now() + 3800;
      pushSubtitle(`⚠ [Bóng Mực xuất hiện] Bóng Mực ${shadeId} vừa trồi lên từ sương đen!`, 3500);
    } else if (ev.name === 'game_over') {
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
  const submitBox = document.getElementById('leaderboard-submit-box');

  if (endModal && endTitle && endDesc && btnNext) {
    if (w.state === 'won' || w.state === 'lost') {
      endModal.style.display = 'flex';
      const litCount = w.lanterns.filter((l) => l.lit).length;

      // Show Leaderboard name prompt at Dawn (Night 3 victory) or after losing any Night (Ticket-04 Section 3)
      const showLeaderboardForm = w.state === 'lost' || (w.state === 'won' && currentNight === 3);
      if (submitBox) {
        submitBox.style.display = showLeaderboardForm ? 'block' : 'none';
      }

      if (w.state === 'won') {
        if (currentNight === 3) {
          endTitle.textContent = '🌅 Bình Minh Trên Đảo Đèn Lồng!';
          endDesc.textContent = `Mây đã giữ đảo sáng tới bình minh qua cả 3 Đêm (${litCount}/${w.lanterns.length} đèn sáng)! Điểm Đêm 3: ${w.score} · Tổng điểm 3 Đêm thắng: ${totalCampaignScore}`;
          btnNext.textContent = 'Chơi chiến dịch mới (Đêm 1)';
        } else {
          endTitle.textContent = `🌅 Bình Minh Đêm ${currentNight} (${litCount}/${w.lanterns.length} Đèn Sáng)!`;
          endDesc.textContent = `Mây đã giữ đảo sáng tới lúc bình minh! Điểm Đêm ${currentNight}: ${w.score} · Tổng điểm tích lũy: ${totalCampaignScore}`;
          btnNext.textContent = `Sang Đêm ${currentNight + 1}`;
        }
        btnNext.style.display = 'inline-block';
      } else {
        endTitle.textContent = '🌑 Sương Đen Bao Phủ...';
        endDesc.textContent = `Mây đã dừng bước ở Đêm ${currentNight} (${litCount}/${w.lanterns.length} đèn sáng). Số đêm đã thắng: ${nightsWonCount} · Tổng điểm các đêm đã thắng: ${totalCampaignScore}`;
        btnNext.style.display = 'none';
      }
    }
  }
}

let lastTimeMs = performance.now();
let accumulatorS = 0;
let benchElapsedSec = 0;

function animate(nowMs: number) {
  requestAnimationFrame(animate);
  const deltaS = Math.min(0.1, (nowMs - lastTimeMs) / 1000);
  lastTimeMs = nowMs;

  if (isWebBenchMode) {
    benchElapsedSec += deltaS;
    // In benchmark mode: disable fuel decay, spawning, damage, pickup, end conditions; only move 200 shades in wander
    for (const s of sim.world.shades) {
      const target = sim.world.lanterns[3]; // Unlit L4
      const dx = target.pos[0] - s.pos[0];
      const dz = target.pos[2] - s.pos[2];
      const len = Math.hypot(dx, dz) || 1;
      s.pos[0] += (dx / len) * 2.8 * deltaS;
      s.pos[2] += (dz / len) * 2.8 * deltaS;
    }
    sim.world.simTick += 1;
    syncSceneVisuals(benchElapsedSec);
    renderer.render(scene, camera);
    return;
  }

  accumulatorS += deltaS;

  const introModal = document.getElementById('intro-modal');
  const isIntroOpen = introModal && introModal.style.display === 'flex';
  const lbModal = document.getElementById('leaderboard-modal');
  const isLbOpen = lbModal && lbModal.style.display === 'flex';

  while (accumulatorS >= DT) {
    accumulatorS -= DT;
    if (!isIntroOpen && !isLbOpen) {
      const frame = buildInputFrame();
      if (frame.jump && sim.world.player.grounded) {
        audio.playJump();
      }
      const prevState = sim.world.state;
      const events = stepWorld(sim.world, sim.prng, inputState, frame);
      if (prevState === 'playing' && sim.world.state === 'won') {
        totalCampaignScore += sim.world.score;
        nightsWonCount = Math.min(3, nightsWonCount + 1);
      }
      handleEventsAndModals(events);
    }
  }

  syncSceneVisuals();
  updateHUD(
    sim.world,
    totalCampaignScore,
    camera,
    camYawDeg,
    colorblindMode,
    keyBindings,
    subtitlesEnabled,
    subtitleState
  );
  renderer.render(scene, camera);
}

updateHUD(
  sim.world,
  totalCampaignScore,
  camera,
  camYawDeg,
  colorblindMode,
  keyBindings,
  subtitlesEnabled,
  subtitleState
);
requestAnimationFrame(animate);
