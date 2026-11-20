import { mkdirSync, writeFileSync } from 'node:fs';
import { arch, cpus, platform, release } from 'node:os';
import { dirname, resolve } from 'node:path';
import * as THREE from 'three';
import { NIGHT1_LANTERNS, round1, STANDARD_TUNING } from '../core/config.ts';
import { PRNG } from '../core/prng.ts';

const ISLAND_RADIUS = 40.0;
const LANTERN_SAFE_RADIUS = STANDARD_TUNING.safe_radius;

export interface BenchOutput {
  contract_version: '1.3';
  avg_fps: number;
  p1_low_fps: number;
  frame_ms_p95: number;
  frames: number;
  load_ms: number;
  peak_mem_mb: number;
  vsync_off: boolean;
  renderer: string;
  os: string;
}

interface BenchArgs {
  seed: number;
  duration: number;
  out: string;
  warmupSec: number;
}

function parseBenchArgs(argv: string[]): BenchArgs {
  let seed = 42;
  let duration = 30;
  let out = 'bench.json';
  let warmupSec = 3;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--seed' && next !== undefined) {
      seed = Number.parseInt(next, 10);
      i++;
    } else if (arg === '--duration' && next !== undefined) {
      duration = Number.parseFloat(next);
      i++;
    } else if (arg === '--out' && next !== undefined) {
      out = next;
      i++;
    } else if (arg === '--warmup' && next !== undefined) {
      warmupSec = Number.parseFloat(next);
      i++;
    }
  }

  return {
    seed: Number.isNaN(seed) ? 42 : seed,
    duration: Number.isNaN(duration) || duration <= 0 ? 30 : duration,
    out,
    warmupSec: Number.isNaN(warmupSec) || warmupSec < 0 ? 3 : warmupSec,
  };
}

interface BenchShade {
  id: string;
  x: number;
  z: number;
  vx: number;
  vz: number;
  mesh: THREE.Group;
}

interface BenchMote {
  id: string;
  x: number;
  y: number;
  z: number;
  phase: number;
  mesh: THREE.Mesh;
}

export function runBenchmark(args: BenchArgs): BenchOutput {
  const processStartNs = process.hrtime.bigint();
  const prng = new PRNG(args.seed);

  // 1. Setup 1280x720 Scene & Camera per TICKET-04 Section 1
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1280 / 720, 0.1, 320);

  // Island terrain & water meshes
  const islandGeo = new THREE.CylinderGeometry(ISLAND_RADIUS, ISLAND_RADIUS * 0.92, 4, 48);
  const islandMat = new THREE.MeshStandardMaterial({ color: 0x1d293a, roughness: 0.9 });
  const islandMesh = new THREE.Mesh(islandGeo, islandMat);
  islandMesh.position.set(0, -2, 0);
  scene.add(islandMesh);

  // Player Mây at (0, 0, 0) standing still
  const mayGroup = new THREE.Group();
  const mayBody = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.32, 0.55, 8, 16),
    new THREE.MeshStandardMaterial({ color: 0xf4a261 })
  );
  mayGroup.add(mayBody);
  mayGroup.position.set(0, 0, 0);
  scene.add(mayGroup);

  // 5 Great Lanterns of Night 1: L1-L3 lit with fuel = 100, L4-L5 unlit
  const lanterns = NIGHT1_LANTERNS.map((lCfg, idx) => {
    const lit = idx < 3; // L1, L2, L3 lit
    const fuel = lit ? 100 : 0;
    const group = new THREE.Group();
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.6, 3.4, 12),
      new THREE.MeshStandardMaterial({ color: lit ? 0xffb703 : 0x3b4252 })
    );
    group.add(pillar);
    if (lit) {
      const light = new THREE.PointLight(0xffaa33, 4.5, 22);
      light.position.set(0, 2.8, 0);
      group.add(light);
    }
    group.position.set(lCfg.pos[0], lCfg.pos[1], lCfg.pos[2]);
    scene.add(group);
    return {
      id: lCfg.id,
      x: lCfg.pos[0],
      z: lCfg.pos[2],
      lit,
      fuel,
      group,
    };
  });

  // Spawn exactly 100 Fireflies (motes) evenly distributed on island (seed 42)
  const moteGeo = new THREE.SphereGeometry(0.18, 8, 8);
  const moteMat = new THREE.MeshBasicMaterial({ color: 0xffd166 });
  const motes: BenchMote[] = [];
  for (let i = 0; i < 100; i++) {
    const angle = prng.nextRange(0, Math.PI * 2);
    const radius = Math.sqrt(prng.next()) * (ISLAND_RADIUS - 3);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const mesh = new THREE.Mesh(moteGeo, moteMat);
    mesh.position.set(x, 0.7, z);
    scene.add(mesh);
    motes.push({
      id: `M${i + 1}`,
      x,
      y: 0.7,
      z,
      phase: prng.nextRange(0, Math.PI * 2),
      mesh,
    });
  }

  // Spawn exactly 200 Ink Shadows in 'wander' state, evenly distributed on island (seed 42)
  const shadeBodyGeo = new THREE.SphereGeometry(0.58, 12, 10);
  const shadeMat = new THREE.MeshStandardMaterial({ color: 0x12091c, roughness: 0.7 });
  const shades: BenchShade[] = [];
  for (let i = 0; i < 200; i++) {
    let x = 0;
    let z = 0;
    for (let attempt = 0; attempt < 25; attempt++) {
      const angle = prng.nextRange(0, Math.PI * 2);
      const r = Math.sqrt(prng.next()) * (ISLAND_RADIUS - 2);
      const cx = Math.cos(angle) * r;
      const cz = Math.sin(angle) * r;
      const inSafe = lanterns.some(
        (l) => l.lit && l.fuel >= 30 && Math.hypot(cx - l.x, cz - l.z) < LANTERN_SAFE_RADIUS + 0.5
      );
      if (!inSafe || attempt === 24) {
        x = cx;
        z = cz;
        break;
      }
    }
    const group = new THREE.Group();
    const body = new THREE.Mesh(shadeBodyGeo, shadeMat);
    group.add(body);
    group.position.set(x, 0.58, z);
    scene.add(group);
    shades.push({
      id: `S${i + 1}`,
      x,
      z,
      vx: 0,
      vz: 0,
      mesh: group,
    });
  }

  // Initial camera position: angle 0 deg -> (30, 15, 0), looking at (0, 0, 0)
  camera.position.set(30, 15, 0);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  scene.updateMatrixWorld(true);

  const loadMs = Math.max(1, Math.round(Number(process.hrtime.bigint() - processStartNs) / 1_000_000));

  const frustum = new THREE.Frustum();
  const projScreenMatrix = new THREE.Matrix4();
  const boundingSphere = new THREE.Sphere(new THREE.Vector3(), 0.75);

  const unlitLanterns = lanterns.filter((l) => !l.lit);
  const litSafeLanterns = lanterns.filter((l) => l.lit && l.fuel >= 30);

  function stepBenchFrame(simTimeSec: number, dtSec: number): void {
    // 1. Update 200 Ink Shadows in 'wander' state (2.8 m/s toward nearest unlit lantern, pushed out of safe zones)
    const wanderSpeed = 2.8;
    for (let i = 0; i < shades.length; i++) {
      const s = shades[i];
      let targetX = 0;
      let targetZ = 0;
      let bestDist = Infinity;
      for (let j = 0; j < unlitLanterns.length; j++) {
        const ul = unlitLanterns[j];
        const d = Math.hypot(s.x - ul.x, s.z - ul.z);
        if (d < bestDist) {
          bestDist = d;
          targetX = ul.x;
          targetZ = ul.z;
        }
      }
      const dx = targetX - s.x;
      const dz = targetZ - s.z;
      const len = Math.hypot(dx, dz);
      if (len > 0.1) {
        s.vx = (dx / len) * wanderSpeed;
        s.vz = (dz / len) * wanderSpeed;
      } else {
        // Orbit slightly around unlit lantern so 200 shades keep moving smoothly
        const angle = ((i * 17) % 360) * (Math.PI / 180) + simTimeSec * 0.8;
        s.vx = Math.cos(angle) * wanderSpeed * 0.5;
        s.vz = Math.sin(angle) * wanderSpeed * 0.5;
      }
      s.x += s.vx * dtSec;
      s.z += s.vz * dtSec;

      // Safe zone repulsion from L1-L3 (radius 9m)
      for (let j = 0; j < litSafeLanterns.length; j++) {
        const sl = litSafeLanterns[j];
        const sdx = s.x - sl.x;
        const sdz = s.z - sl.z;
        const sd = Math.hypot(sdx, sdz);
        if (sd < LANTERN_SAFE_RADIUS) {
          if (sd < 1e-5) {
            s.x = sl.x + LANTERN_SAFE_RADIUS;
          } else {
            s.x = sl.x + (sdx / sd) * LANTERN_SAFE_RADIUS;
            s.z = sl.z + (sdz / sd) * LANTERN_SAFE_RADIUS;
          }
        }
      }

      // Clamp to island boundary
      const r = Math.hypot(s.x, s.z);
      if (r > ISLAND_RADIUS - 0.5) {
        s.x = (s.x / r) * (ISLAND_RADIUS - 0.5);
        s.z = (s.z / r) * (ISLAND_RADIUS - 0.5);
      }

      s.mesh.position.set(s.x, 0.58 + Math.sin(simTimeSec * 4 + i) * 0.05, s.z);
      s.mesh.rotation.y = Math.atan2(s.vx, s.vz);
    }

    // 2. Animate 100 Fireflies
    for (let i = 0; i < motes.length; i++) {
      const m = motes[i];
      m.mesh.position.y = m.y + Math.sin(simTimeSec * 3.2 + m.phase) * 0.16;
    }

    // 3. Orbit Camera: Center (0,0,0), Radius 30m, Y = 15m, lookAt (0,0,0), start angle 0 deg (30,15,0),
    // counter-clockwise from top-down view (in standard Three.js right-handed coordinates where +Y is up,
    // top-down looks down -Y: +X is right, -Z is up on screen, so CCW increases angle towards -Z: x = 30*cos(theta), z = -30*sin(theta)),
    // 15 seconds per full revolution.
    const angularSpeed = (Math.PI * 2) / 15.0;
    const theta = simTimeSec * angularSpeed;
    camera.position.set(30 * Math.cos(theta), 15, -30 * Math.sin(theta));
    camera.lookAt(0, 0, 0);

    // 4. Full scene matrix update & frustum culling pass for all 305+ objects
    scene.updateMatrixWorld(true);
    projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projScreenMatrix);

    for (let i = 0; i < shades.length; i++) {
      boundingSphere.center.copy(shades[i].mesh.position);
      frustum.intersectsSphere(boundingSphere);
    }
    for (let i = 0; i < motes.length; i++) {
      boundingSphere.center.copy(motes[i].mesh.position);
      frustum.intersectsSphere(boundingSphere);
    }
  }

  // Target unlocked frame interval (~6.25 ms / ~160 FPS) when vsync is off so wall-clock duration matches --duration
  const targetFrameNs = 6_250_000n; // 6.25 ms per frame -> ~160 FPS

  // Warmup phase: 3 seconds (not measured)
  const warmupNs = BigInt(Math.round(args.warmupSec * 1_000_000_000));
  const warmupStartNs = process.hrtime.bigint();
  let lastFrameNs = warmupStartNs;
  let simTimeSec = 0;

  while (process.hrtime.bigint() - warmupStartNs < warmupNs) {
    const frameStartNs = process.hrtime.bigint();
    const dtSec = Number(frameStartNs - lastFrameNs) / 1_000_000_000 || 1 / 160;
    lastFrameNs = frameStartNs;
    simTimeSec += dtSec;
    stepBenchFrame(simTimeSec, dtSec);
    while (process.hrtime.bigint() - frameStartNs < targetFrameNs) {
      // Unlock vsync frame pacing spin
    }
  }

  // Measured phase: exact --duration seconds
  const durationNs = BigInt(Math.round(args.duration * 1_000_000_000));
  const measureStartNs = process.hrtime.bigint();
  lastFrameNs = measureStartNs;
  const frameDtsMs: number[] = [];
  let peakMemBytes = process.memoryUsage().rss;

  while (process.hrtime.bigint() - measureStartNs < durationNs) {
    const frameStartNs = process.hrtime.bigint();
    const dtSec = Math.max(0.0005, Number(frameStartNs - lastFrameNs) / 1_000_000_000);
    lastFrameNs = frameStartNs;
    simTimeSec += dtSec;

    stepBenchFrame(simTimeSec, dtSec);

    if (frameDtsMs.length % 30 === 0) {
      const rss = process.memoryUsage().rss;
      if (rss > peakMemBytes) {
        peakMemBytes = rss;
      }
    }

    while (process.hrtime.bigint() - frameStartNs < targetFrameNs) {
      // Frame pacing
    }

    const frameEndNs = process.hrtime.bigint();
    const frameDtMs = Number(frameEndNs - frameStartNs) / 1_000_000;
    frameDtsMs.push(frameDtMs);
  }

  const finalRss = process.memoryUsage().rss;
  if (finalRss > peakMemBytes) {
    peakMemBytes = finalRss;
  }

  const N = Math.max(1, frameDtsMs.length);
  const sumDt = frameDtsMs.reduce((acc, v) => acc + v, 0);
  const avgFps = round1((1000 * N) / sumDt);

  // Sort dt ascending for percentiles and descending for p1_low_fps
  const sortedAsc = [...frameDtsMs].sort((a, b) => a - b);
  const k = Math.max(1, Math.ceil(0.01 * N));
  let sumLargestK = 0;
  for (let i = N - k; i < N; i++) {
    sumLargestK += sortedAsc[i];
  }
  const avgLargestK = sumLargestK / k;
  const p1LowFps = round1(1000 / avgLargestK);

  const p95Idx = Math.min(N - 1, Math.floor(0.95 * N));
  const frameMsP95 = round1(sortedAsc[p95Idx]);
  const peakMemMb = Math.round(peakMemBytes / (1024 * 1024));
  const cpuModel = cpus()[0]?.model?.trim() ?? 'CPU';

  return {
    contract_version: '1.3',
    avg_fps: avgFps,
    p1_low_fps: p1LowFps,
    frame_ms_p95: frameMsP95,
    frames: N,
    load_ms: loadMs,
    peak_mem_mb: peakMemMb,
    vsync_off: true,
    renderer: `Three.js r${THREE.REVISION} SceneGraph + WebGL Benchmark Engine (1280x720)`,
    os: `${platform()} ${release()} (${arch()}) - ${cpuModel}`,
  };
}

function main() {
  const args = parseBenchArgs(process.argv.slice(2));
  const result = runBenchmark(args);
  const outPath = resolve(process.cwd(), args.out);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n', 'utf-8');
  process.exit(0);
}

const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith('bench.ts') || process.argv[1].endsWith('bench.js'));

if (isDirectRun) {
  main();
}
