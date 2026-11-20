import {
  DT,
  FUEL_UNITS_PER_FUEL,
  GRAVITY,
  JUMP_SPEED,
  MAX_FUEL_UNITS,
  NIGHT1_LANTERNS,
  NIGHT1_MOTE_SPAWNS,
  NIGHT1_SHADE_SPAWNS,
  NIGHT2_CHARMS,
  NIGHT2_LANTERNS,
  NIGHT2_MOTE_SPAWNS,
  NIGHT2_SHADE_SPAWNS,
  NIGHT3_CHARMS,
  NIGHT3_LANTERNS,
  NIGHT3_MOTE_SPAWNS,
  NIGHT3_SHADE_SPAWNS,
  round1,
  round3,
  roundVec3,
  STANDARD_TUNING,
  TICK_RATE,
} from './config.ts';
import { PRNG } from './prng.ts';
import {
  CharmSim,
  DrifterSim,
  InputFile,
  InputFrame,
  LanternSim,
  MoteSim,
  ScenarioFile,
  ShadeSim,
  SimEvent,
  SimWorld,
  Vec3Tuple,
} from './types.ts';

export function distXZ(a: Vec3Tuple, b: Vec3Tuple): number {
  const dx = a[0] - b[0];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dz * dz);
}

export function dist3D(a: Vec3Tuple, b: Vec3Tuple): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function getGroundHeight(night: 1 | 2 | 3, x: number, z: number, currentY = 0): number | null {
  if (night === 1) {
    const r = Math.sqrt(x * x + z * z);
    return r <= 40.0 ? 0 : null;
  }

  if (night === 2) {
    const rA = Math.sqrt(x * x + z * z);
    const rB = Math.sqrt((x - 70) * (x - 70) + z * z);
    const onBridge = x >= 26 && x <= 44 && z >= -2 && z <= 2;
    if (rA <= 28.0 || rB <= 28.0 || onBridge) {
      return 0;
    }
    return null;
  }

  // Night 3: Đảo Chuông
  const r = Math.sqrt(x * x + z * z);
  if (r > 45.0) return null;

  for (const deg of [30, 150]) {
    const rad = (deg * Math.PI) / 180;
    const ux = Math.cos(rad);
    const uz = Math.sin(rad);
    const proj = x * ux + z * uz;
    const perp = Math.abs(-x * uz + z * ux);
    if (proj >= 24.0 && proj <= 30.0 && perp <= 1.5) {
      const rampY = ((30.0 - proj) / 6.0) * 3.0;
      if (currentY >= rampY - 0.65) {
        return rampY;
      }
    }
  }

  if (r <= 8.0 && currentY >= 5.5) {
    return 6.0;
  }

  if (r >= 12.0 && r <= 24.0 && z > 0 && currentY >= 2.5) {
    return 3.0;
  }

  return 0.0;
}

export function getSpawnListsForNight(night: 1 | 2 | 3) {
  if (night === 1) {
    return {
      lanterns: NIGHT1_LANTERNS,
      moteSpawns: NIGHT1_MOTE_SPAWNS,
      shadeSpawns: NIGHT1_SHADE_SPAWNS,
      charms: [],
      durationS: STANDARD_TUNING.night1_duration_s,
      shadeIntervalTicks: 480, // 8s
      maxShades: 6,
      shadeSpeed: 4.0,
    };
  }
  if (night === 2) {
    return {
      lanterns: NIGHT2_LANTERNS,
      moteSpawns: NIGHT2_MOTE_SPAWNS,
      shadeSpawns: NIGHT2_SHADE_SPAWNS,
      charms: NIGHT2_CHARMS,
      durationS: STANDARD_TUNING.night2_duration_s,
      shadeIntervalTicks: 420, // 7s
      maxShades: 8,
      shadeSpeed: 4.0,
    };
  }
  return {
    lanterns: NIGHT3_LANTERNS,
    moteSpawns: NIGHT3_MOTE_SPAWNS,
    shadeSpawns: NIGHT3_SHADE_SPAWNS,
    charms: NIGHT3_CHARMS,
    durationS: STANDARD_TUNING.night3_duration_s,
    shadeIntervalTicks: 360, // 6s
    maxShades: 10,
    shadeSpeed: 4.5,
  };
}

/**
 * Checks whether a lantern currently provides an active 6m safe zone.
 * In Phase 3 (Contract v1.2), a lit lantern only provides a safe zone if fuel >= 30 (fuelUnits >= 1800).
 */
export function hasActiveSafeZone(l: LanternSim): boolean {
  return l.lit && l.fuelUnits >= STANDARD_TUNING.low_fuel_threshold * FUEL_UNITS_PER_FUEL;
}

export function computePlayerCapacity(successfulLights: number): number {
  return Math.min(STANDARD_TUNING.capacity_max, STANDARD_TUNING.carry_capacity + 2 * successfulLights);
}

export function createWorld(options: {
  seed: number;
  night?: 1 | 2 | 3;
  scenario?: ScenarioFile;
  contractVersion?: '1.0' | '1.1' | '1.2';
}): { world: SimWorld; prng: PRNG } {
  const night = options.night ?? 1;
  const contractVersion = options.contractVersion ?? '1.2';
  const prng = new PRNG(options.seed);
  const nightInfo = getSpawnListsForNight(night);
  const sc = options.scenario;

  const durationS = sc?.time_left_s !== undefined ? sc.time_left_s : nightInfo.durationS;
  const timeLeftTicks = Math.round(durationS * TICK_RATE);

  // Lanterns
  const lanterns: LanternSim[] = nightInfo.lanterns.map((l) => ({
    id: l.id,
    pos: [...l.pos] as Vec3Tuple,
    lit: false,
    deposited: 0,
    fuelUnits: 0,
    everLit: false,
    relitCount: 0,
    justLitTicks: 0,
  }));

  if (sc?.lanterns) {
    for (const override of sc.lanterns) {
      let target = lanterns.find((l) => l.id === override.id);
      if (!target && override.pos) {
        target = {
          id: override.id,
          pos: roundVec3(override.pos),
          lit: false,
          deposited: 0,
          fuelUnits: 0,
          everLit: false,
          relitCount: 0,
          justLitTicks: 0,
        };
        lanterns.push(target);
      }
      if (target) {
        if (override.pos) target.pos = roundVec3(override.pos);
        if (override.deposited !== undefined) target.deposited = override.deposited;
        if (override.lit !== undefined) {
          target.lit = override.lit;
        } else if (target.deposited >= STANDARD_TUNING.lantern_cost) {
          target.lit = true;
        }
        if (target.lit) {
          const fuelVal = override.fuel !== undefined ? override.fuel : 100;
          target.fuelUnits = Math.round(fuelVal * FUEL_UNITS_PER_FUEL);
          target.everLit = override.ever_lit !== undefined ? override.ever_lit : true;
        } else {
          target.fuelUnits =
            override.fuel !== undefined ? Math.round(override.fuel * FUEL_UNITS_PER_FUEL) : 0;
          target.everLit = override.ever_lit ?? false;
        }
        if (override.relit_count !== undefined) {
          target.relitCount = override.relit_count;
        }
      }
    }
  }

  // Motes
  const randomMotes = sc?.random_motes !== undefined ? sc.random_motes : true;
  const motes: MoteSim[] = [];
  let nextMoteId = 1;

  if (sc?.motes !== undefined) {
    for (const m of sc.motes) {
      if (Array.isArray(m)) {
        motes.push({
          id: `M${nextMoteId++}`,
          pos: roundVec3(m),
          kind: 'random',
          ttlTicks: null,
        });
      } else {
        motes.push({
          id: m.id ?? `M${nextMoteId++}`,
          pos: roundVec3(m.pos),
          kind: m.kind ?? 'random',
          ttlTicks: m.ttl_ticks ?? null,
        });
      }
    }
  } else if (randomMotes) {
    const indices = nightInfo.moteSpawns.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = prng.int(0, i);
      const tmp = indices[i];
      indices[i] = indices[j];
      indices[j] = tmp;
    }
    const chosen = indices.slice(0, Math.min(20, indices.length));
    for (const idx of chosen) {
      motes.push({
        id: `M${nextMoteId++}`,
        pos: [...nightInfo.moteSpawns[idx]] as Vec3Tuple,
        kind: 'random',
        ttlTicks: null,
        spawnPointIdx: idx,
      });
    }
  }

  // Shades
  const randomShades = sc?.random_shades !== undefined ? sc.random_shades : true;
  const shades: ShadeSim[] = [];
  let nextShadeId = 1;

  if (sc?.shades !== undefined) {
    for (const s of sc.shades) {
      const id = s.id ?? `S${nextShadeId++}`;
      const numMatch = /^S(\d+)$/.exec(id);
      if (numMatch) {
        nextShadeId = Math.max(nextShadeId, Number(numMatch[1]) + 1);
      }
      shades.push({
        id,
        pos: roundVec3(s.pos),
        state: s.state ?? 'wander',
        stateTicksLeft: s.state_ticks_left ?? 0,
        pushTicksLeft: 0,
        pushStepXZ: [0, 0],
        wanderAngle: Math.atan2(-s.pos[2], -s.pos[0]),
        targetLanternId: s.target_lantern_id ?? null,
        drainTicks: 0,
        wasDrainingTick: -10,
      });
    }
  }

  // Drifters (Night 2 & 3)
  const randomDrifters = sc?.random_drifters !== undefined ? sc.random_drifters : night >= 2;
  const drifters: DrifterSim[] = [];
  let nextDrifterId = 1;

  if (sc?.drifters !== undefined) {
    for (const d of sc.drifters) {
      const id = d.id ?? `D${nextDrifterId++}`;
      const numMatch = /^D(\d+)$/.exec(id);
      if (numMatch) {
        nextDrifterId = Math.max(nextDrifterId, Number(numMatch[1]) + 1);
      }
      drifters.push({
        id,
        pos: roundVec3(d.pos),
        state: d.state ?? 'idle',
        stolen: d.stolen ?? 0,
        hasStolenOnce: (d.stolen ?? 0) > 0,
        stateTicksLeft: d.state_ticks_left ?? (d.state === 'flee' ? 240 : 0),
        wanderAngle: Math.atan2(-d.pos[2], -d.pos[0]),
      });
    }
  }

  // Charms
  const charms: CharmSim[] =
    sc?.charms !== undefined
      ? sc.charms.map((c, idx) => ({
          id: c.id ?? `C${idx + 1}`,
          pos: roundVec3(c.pos ?? nightInfo.charms[idx]?.pos ?? [0, 0, 0]),
          available: c.available ?? true,
          respawnTicks: c.respawn_ticks ?? 0,
        }))
      : nightInfo.charms.map((c) => ({
          id: c.id,
          pos: [...c.pos] as Vec3Tuple,
          available: true,
          respawnTicks: 0,
        }));

  const playerPos: Vec3Tuple = sc?.player?.pos ? roundVec3(sc.player.pos) : [0, 0, 0];
  const successfulLights = sc?.player?.successful_lights ?? 0;

  const world: SimWorld = {
    contractVersion,
    seed: options.seed,
    night,
    tick: 0,
    simTick: 0,
    state: 'playing',
    initialDurationTicks: timeLeftTicks,
    timeLeftTicks,
    score: 0,
    tuning: {
      ...STANDARD_TUNING,
      shade_speed: nightInfo.shadeSpeed,
    },
    player: {
      pos: playerPos,
      vel: [0, 0, 0],
      facingDir: [0, 1],
      flames: sc?.player?.flames ?? STANDARD_TUNING.flames,
      carried: sc?.player?.carried ?? 0,
      capacity: computePlayerCapacity(successfulLights),
      successfulLights,
      grounded: true,
      invulnTicks: sc?.player?.invuln_ticks ?? 0,
      dashCdTicks: sc?.player?.dash_cd_ticks ?? 0,
      dashActiveTicks: 0,
      dashDir: [0, 1],
      pulseCdTicks: sc?.player?.pulse_cd_ticks ?? 0,
      charmTicks: sc?.player?.charm_ticks ?? 0,
      respawnWaitTicks: 0,
      jumpPadLocked: false,
      jumpPadVel: [0, 0],
    },
    lanterns,
    motes,
    shades,
    drifters,
    charms,
    wind: {
      enabled: sc?.wind_enabled !== undefined ? sc.wind_enabled : night === 3,
      active: false,
      warning: false,
      dirDeg: 0,
    },
    randomMotes,
    randomShades,
    randomDrifters,
    nextMoteId,
    nextShadeId,
    nextDrifterId,
    events: [],
  };

  return { world, prng };
}

export interface PersistentInputState {
  move: [number, number];
  cam_yaw_deg: number;
  jump: boolean;
  interact: boolean;
  pulse: boolean;
  dash: boolean;
  pause: boolean;
}

export function createDefaultInputState(): PersistentInputState {
  return {
    move: [0, 0],
    cam_yaw_deg: 0,
    jump: false,
    interact: false,
    pulse: false,
    dash: false,
    pause: false,
  };
}

/**
 * Helper to select target lantern for a wandering shade (Ticket-03 Section 2):
 * Priority 1: Nearest lit lantern with fuel < 30 (tie-breaker: smaller id).
 * Priority 2: Nearest unlit lantern (tie-breaker: smaller id).
 */
function findTargetLanternForShade(shade: ShadeSim, lanterns: LanternSim[]): LanternSim | null {
  const weakLit = lanterns.filter(
    (l) => l.lit && l.fuelUnits < STANDARD_TUNING.low_fuel_threshold * FUEL_UNITS_PER_FUEL
  );
  if (weakLit.length > 0) {
    weakLit.sort((a, b) => {
      const da = distXZ(shade.pos, a.pos);
      const db = distXZ(shade.pos, b.pos);
      if (Math.abs(da - db) > 1e-6) return da - db;
      return a.id.localeCompare(b.id);
    });
    return weakLit[0];
  }

  const unlit = lanterns.filter((l) => !l.lit);
  if (unlit.length > 0) {
    unlit.sort((a, b) => {
      const da = distXZ(shade.pos, a.pos);
      const db = distXZ(shade.pos, b.pos);
      if (Math.abs(da - db) > 1e-6) return da - db;
      return a.id.localeCompare(b.id);
    });
    return unlit[0];
  }

  return null;
}

/**
 * Executes a single tick k -> k+1 following the exact 12-step order in Ticket-02 & Ticket-03 (Contract v1.2).
 */
export function stepWorld(
  world: SimWorld,
  prng: PRNG,
  prevInput: PersistentInputState,
  frameUpdate?: Partial<InputFrame>
): SimEvent[] {
  if (world.state === 'won' || world.state === 'lost') {
    return [];
  }

  const tickEvents: SimEvent[] = [];
  const nextTick = world.tick + 1;

  // Apply frame delta and detect rising edges (false -> true)
  const nextMove: [number, number] = frameUpdate?.move
    ? [frameUpdate.move[0], frameUpdate.move[1]]
    : prevInput.move;
  const nextYaw = frameUpdate?.cam_yaw_deg !== undefined ? frameUpdate.cam_yaw_deg : prevInput.cam_yaw_deg;

  const jumpVal = frameUpdate?.jump !== undefined ? frameUpdate.jump : prevInput.jump;
  const interactVal = frameUpdate?.interact !== undefined ? frameUpdate.interact : prevInput.interact;
  const pulseVal = frameUpdate?.pulse !== undefined ? frameUpdate.pulse : prevInput.pulse;
  const dashVal = frameUpdate?.dash !== undefined ? frameUpdate.dash : prevInput.dash;
  const pauseVal = frameUpdate?.pause !== undefined ? frameUpdate.pause : prevInput.pause;

  const jumpTriggered = !prevInput.jump && jumpVal;
  const interactTriggered = !prevInput.interact && interactVal;
  const pulseTriggered = !prevInput.pulse && pulseVal;
  const dashTriggered = !prevInput.dash && dashVal;
  const pauseTriggered = !prevInput.pause && pauseVal;

  prevInput.move = nextMove;
  prevInput.cam_yaw_deg = nextYaw;
  prevInput.jump = jumpVal;
  prevInput.interact = interactVal;
  prevInput.pulse = pulseVal;
  prevInput.dash = dashVal;
  prevInput.pause = pauseVal;

  const emit = (name: string, data: Record<string, unknown>) => {
    const ev = { type: 'event' as const, tick: nextTick, name, data };
    tickEvents.push(ev);
    world.events.push(ev);
  };

  // Step 1: Read input & handle pause first
  world.tick = nextTick;
  if (pauseTriggered) {
    if (world.state === 'playing') {
      world.state = 'paused';
      if (world.contractVersion !== '1.0') {
        emit('paused', {});
      }
      return tickEvents;
    } else if (world.state === 'paused') {
      world.state = 'playing';
      if (world.contractVersion !== '1.0') {
        emit('resumed', {});
      }
    }
  }

  if (world.state === 'paused') {
    return tickEvents;
  }

  world.simTick += 1;

  // Step 2: Decrement timers (time, cooldowns, invuln, stun, charm, dropped mote TTL, charm respawn)
  // AND Ticket-03 addition: subtract lantern fuel (1/60 natural decay + 5/60 per draining shade);
  // immediately after Step 2, lanterns with fuel <= 0 turn off and emit lantern_out.
  if (world.timeLeftTicks > 0) world.timeLeftTicks -= 1;
  if (world.player.invulnTicks > 0) world.player.invulnTicks -= 1;
  if (world.player.dashCdTicks > 0) world.player.dashCdTicks -= 1;
  if (world.player.pulseCdTicks > 0) world.player.pulseCdTicks -= 1;
  if (world.player.charmTicks > 0) world.player.charmTicks -= 1;

  for (let i = world.motes.length - 1; i >= 0; i--) {
    const m = world.motes[i];
    if (m.ttlTicks !== null) {
      m.ttlTicks -= 1;
      if (m.ttlTicks <= 0) {
        world.motes.splice(i, 1);
      }
    }
  }

  for (const c of world.charms) {
    if (!c.available && c.respawnTicks > 0) {
      c.respawnTicks -= 1;
      if (c.respawnTicks <= 0) {
        c.available = true;
      }
    }
  }

  for (const l of world.lanterns) {
    if (l.justLitTicks > 0) l.justLitTicks -= 1;
  }

  // Ticket-03 Step 2 Fuel Decay & Shade Drain
  for (const l of world.lanterns) {
    if (!l.lit) continue;
    // Natural decay: 1.0 fuel/sec = 1 fuelUnit per tick
    l.fuelUnits = Math.max(0, l.fuelUnits - 1);

    // Check shades currently in 'drain' state targeting this lantern (within 2m XZ)
    const drainingShades = world.shades
      .filter((s) => s.state === 'drain' && distXZ(s.pos, l.pos) <= 2.0)
      .sort((a, b) => a.id.localeCompare(b.id));

    for (const s of drainingShades) {
      // 5 fuel/sec = 5 fuelUnits per tick
      l.fuelUnits = Math.max(0, l.fuelUnits - 5);
      s.drainTicks += 1;
      if (s.drainTicks % 60 === 0 && world.contractVersion === '1.2') {
        emit('fuel_drain', {
          lantern_id: l.id,
          shade_id: s.id,
          fuel: round1(l.fuelUnits / FUEL_UNITS_PER_FUEL),
        });
      }
    }

    // Immediately after Step 2: if fuel <= 0, lantern turns off
    if (l.fuelUnits <= 0) {
      l.fuelUnits = 0;
      l.lit = false;
      l.deposited = 0;
      l.everLit = true;
      l.justLitTicks = 0;
      if (world.contractVersion === '1.2') {
        emit('lantern_out', { lantern_id: l.id });
      }
    }
  }

  // Wind schedule on Night 3
  if (world.wind.enabled) {
    const cycle = world.simTick % 1800;
    if (cycle === 1800 - 120) {
      world.wind.warning = true;
      world.wind.dirDeg = round3(prng.range(0, 360));
    }
    if (cycle >= 0 && cycle < 300 && world.simTick >= 1800) {
      world.wind.active = true;
      world.wind.warning = false;
    } else {
      world.wind.active = false;
    }
  }

  // Step 3: Move Mây (jump, dash, jump pad, wind) and check fall off island
  const p = world.player;
  if (p.respawnWaitTicks > 0) {
    p.respawnWaitTicks -= 1;
    if (p.respawnWaitTicks === 0) {
      p.pos = [0, 0, 0];
      p.vel = [0, 0, 0];
      p.grounded = true;
      p.jumpPadLocked = false;
      p.invulnTicks = Math.round(world.tuning.invuln_s * TICK_RATE);
    }
  } else {
    let mx = Math.max(-1, Math.min(1, prevInput.move[0]));
    let mz = Math.max(-1, Math.min(1, prevInput.move[1]));
    const len = Math.sqrt(mx * mx + mz * mz);
    if (len > 1) {
      mx /= len;
      mz /= len;
    }
    const theta = (prevInput.cam_yaw_deg * Math.PI) / 180;
    const worldDirX = mx * Math.cos(theta) + mz * Math.sin(theta);
    const worldDirZ = -mx * Math.sin(theta) + mz * Math.cos(theta);
    const dirMag = Math.sqrt(worldDirX * worldDirX + worldDirZ * worldDirZ);

    if (dirMag > 0.0001) {
      p.facingDir = [worldDirX / dirMag, worldDirZ / dirMag];
    }

    if (dashTriggered && p.dashActiveTicks === 0 && (p.dashCdTicks === 0 || p.charmTicks > 0)) {
      p.dashActiveTicks = Math.round(world.tuning.dash_duration_s * TICK_RATE);
      p.dashCdTicks = p.charmTicks > 0 ? 0 : Math.round(world.tuning.dash_cooldown_s * TICK_RATE);
      p.dashDir = dirMag > 0.0001 ? [worldDirX / dirMag, worldDirZ / dirMag] : [...p.facingDir];
      p.jumpPadLocked = false;
      if (world.contractVersion !== '1.0') {
        emit('dash', {});
      }
    }

    if (jumpTriggered && p.grounded && p.dashActiveTicks === 0) {
      p.vel[1] = JUMP_SPEED;
      p.grounded = false;
    }

    const baseSpeed = p.charmTicks > 0 ? 7.2 : world.tuning.player_speed;

    if (p.dashActiveTicks > 0) {
      p.dashActiveTicks -= 1;
      p.vel[0] = p.dashDir[0] * world.tuning.dash_speed;
      p.vel[2] = p.dashDir[1] * world.tuning.dash_speed;
      p.vel[1] = 0;
    } else if (p.jumpPadLocked) {
      p.vel[0] = p.jumpPadVel[0];
      p.vel[2] = p.jumpPadVel[1];
      p.vel[1] += GRAVITY * DT;
    } else {
      p.vel[0] = worldDirX * baseSpeed;
      p.vel[2] = worldDirZ * baseSpeed;
      if (!p.grounded) {
        p.vel[1] += GRAVITY * DT;
      } else {
        p.vel[1] = 0;
      }
    }

    if (world.wind.active) {
      const wRad = (world.wind.dirDeg * Math.PI) / 180;
      p.vel[0] += 2.0 * Math.cos(wRad);
      p.vel[2] += 2.0 * Math.sin(wRad);
    }

    let nextX = p.pos[0] + p.vel[0] * DT;
    let nextY = p.pos[1] + p.vel[1] * DT;
    let nextZ = p.pos[2] + p.vel[2] * DT;

    if (world.night === 3 && nextY >= 5.5 && nextY <= 14.0) {
      const rCenter = Math.sqrt(nextX * nextX + nextZ * nextZ);
      if (rCenter < 2.0 && rCenter > 0.0001) {
        nextX = (nextX / rCenter) * 2.0;
        nextZ = (nextZ / rCenter) * 2.0;
      }
    }

    const groundY = getGroundHeight(world.night, nextX, nextZ, p.pos[1]);

    if (groundY !== null && groundY > p.pos[1] + 0.6 && p.grounded) {
      nextX = p.pos[0];
      nextZ = p.pos[2];
    } else if (groundY !== null) {
      if (nextY <= groundY) {
        nextY = groundY;
        p.vel[1] = 0;
        p.grounded = true;
        p.jumpPadLocked = false;
      } else {
        p.grounded = false;
      }
    } else {
      p.grounded = false;
      if (p.dashActiveTicks === 0 && p.vel[1] === 0) {
        p.vel[1] += GRAVITY * DT;
        nextY = p.pos[1] + p.vel[1] * DT;
      }
    }

    p.pos = roundVec3([nextX, nextY, nextZ]);
    p.vel = roundVec3(p.vel);

    // Jump pads
    if (world.night === 2 && p.grounded) {
      if (distXZ(p.pos, [20, 0, 18]) <= 1.0) {
        const dx = 70 - p.pos[0];
        const dz = 0 - p.pos[2];
        const d = Math.sqrt(dx * dx + dz * dz);
        p.jumpPadVel = [(dx / d) * 24.0, (dz / d) * 24.0];
        p.vel = roundVec3([p.jumpPadVel[0], 14.0, p.jumpPadVel[1]]);
        p.grounded = false;
        p.jumpPadLocked = true;
      } else if (distXZ(p.pos, [50, 0, -18]) <= 1.0) {
        const dx = 0 - p.pos[0];
        const dz = 0 - p.pos[2];
        const d = Math.sqrt(dx * dx + dz * dz);
        p.jumpPadVel = [(dx / d) * 24.0, (dz / d) * 24.0];
        p.vel = roundVec3([p.jumpPadVel[0], 14.0, p.jumpPadVel[1]]);
        p.grounded = false;
        p.jumpPadLocked = true;
      }
    } else if (world.night === 3 && p.grounded && Math.abs(p.pos[1] - 3.0) <= 0.2) {
      if (distXZ(p.pos, [0, 3, 13]) <= 1.0) {
        p.jumpPadVel = [0, -8.0];
        p.vel = [0, 12.0, -8.0];
        p.grounded = false;
        p.jumpPadLocked = true;
      }
    }

    // Fall off island (Y < -10)
    if (world.tuning.fall_enabled && p.pos[1] < -10.0) {
      const lost = p.carried;
      p.flames = Math.max(0, p.flames - 1);
      p.carried = 0;
      p.vel = [0, 0, 0];
      if (world.contractVersion !== '1.0') {
        emit('player_hit', { by: 'fall', flames: p.flames, dropped: 0, lost });
      } else {
        emit('player_hit', { by: 'fall', flames: p.flames, dropped: 0 });
      }
      if (p.flames > 0) {
        p.respawnWaitTicks = 60;
      }
    }
  }

  const playerActive = p.respawnWaitTicks === 0 && p.flames > 0;

  // Step 4: Pick up motes (respecting dynamic capacity) and charms
  if (playerActive) {
    for (let i = 0; i < world.motes.length; i++) {
      if (p.carried >= p.capacity) break;
      const m = world.motes[i];
      if (
        distXZ(p.pos, m.pos) <= world.tuning.pickup_radius &&
        Math.abs(p.pos[1] - m.pos[1]) <= 1.5
      ) {
        p.carried += 1;
        world.motes.splice(i, 1);
        i--;
        emit('mote_picked', { carried: p.carried });
      }
    }

    for (const c of world.charms) {
      if (
        c.available &&
        distXZ(p.pos, c.pos) <= world.tuning.pickup_radius &&
        Math.abs(p.pos[1] - c.pos[1]) <= 1.5
      ) {
        c.available = false;
        c.respawnTicks = 2700;
        p.charmTicks = 600;
        p.dashCdTicks = 0;
        if (world.contractVersion !== '1.0') {
          emit('charm_picked', { charm_id: c.id, charm_ticks: 600 });
        }
      }
    }
  }

  // Step 5: Interact with Great Lanterns (Ticket-03: deposit to unlit OR refuel lit lantern with fuel < 100)
  if (playerActive && interactTriggered && p.carried > 0) {
    // Only consider lanterns within 2.0m that can receive motes (unlit, or lit with fuelUnits < MAX_FUEL_UNITS)
    const candidates = world.lanterns.filter(
      (l) =>
        distXZ(p.pos, l.pos) <= world.tuning.interact_radius &&
        (!l.lit || l.fuelUnits < MAX_FUEL_UNITS)
    );

    if (candidates.length > 0) {
      candidates.sort((a, b) => {
        const da = distXZ(p.pos, a.pos);
        const db = distXZ(p.pos, b.pos);
        if (Math.abs(da - db) > 1e-6) return da - db;
        return a.id.localeCompare(b.id);
      });
      const target = candidates[0];

      if (!target.lit) {
        // Lighting an unlit lantern (first time needs 10, relight if everLit needs 5)
        const cost = target.everLit ? world.tuning.relight_cost : world.tuning.lantern_cost;
        const needed = cost - target.deposited;
        const amount = Math.min(p.carried, needed);
        if (amount > 0) {
          const isRelight = target.everLit;
          p.carried -= amount;
          target.deposited += amount;
          world.score += amount * world.tuning.score.per_mote;
          emit('deposit', {
            lantern_id: target.id,
            amount,
            deposited: target.deposited,
          });
          if (target.deposited >= cost) {
            target.lit = true;
            target.fuelUnits = MAX_FUEL_UNITS;
            target.everLit = true;
            target.justLitTicks = 30;
            if (isRelight) {
              target.relitCount += 1;
              world.score += world.tuning.score.per_relight;
            } else {
              world.score += world.tuning.score.per_lantern;
            }
            p.successfulLights += 1;
            p.capacity = computePlayerCapacity(p.successfulLights);
            emit('lantern_lit', { lantern_id: target.id, relight: isRelight });
          }
        }
      } else {
        // Refueling an already-lit lantern (fuelUnits < 6000)
        // used = min(carried, ceil((100 - fuel) / 10)) = min(carried, ceil((6000 - fuelUnits) / 600))
        const missingUnits = MAX_FUEL_UNITS - target.fuelUnits;
        const maxMotesNeeded = Math.ceil(missingUnits / (10 * FUEL_UNITS_PER_FUEL));
        const used = Math.min(p.carried, maxMotesNeeded);
        if (used > 0) {
          const wasLowFuel =
            target.fuelUnits < STANDARD_TUNING.low_fuel_threshold * FUEL_UNITS_PER_FUEL;
          p.carried -= used;
          target.fuelUnits = Math.min(
            MAX_FUEL_UNITS,
            target.fuelUnits + used * 10 * FUEL_UNITS_PER_FUEL
          );
          world.score += used * world.tuning.score.per_mote;
          const nowHasSafeZone =
            target.fuelUnits >= STANDARD_TUNING.low_fuel_threshold * FUEL_UNITS_PER_FUEL;
          if (wasLowFuel && nowHasSafeZone) {
            // Refueled to >= 30 while shades may be inside 6m -> push out over 30 ticks without dealing damage
            target.justLitTicks = 30;
          }
          emit('refuel', {
            lantern_id: target.id,
            amount: used,
            fuel: round1(target.fuelUnits / FUEL_UNITS_PER_FUEL),
          });
        }
      }
    }
  }

  // Step 6: Update safe zones (only lanterns with active safe zone: lit && fuel >= 30)
  for (const l of world.lanterns) {
    if (!hasActiveSafeZone(l)) continue;
    for (const s of world.shades) {
      const d = distXZ(s.pos, l.pos);
      if (d < world.tuning.safe_radius) {
        // If shade was draining this lantern and it got refueled >= 30, transition to wander
        if (s.state === 'drain') {
          s.state = 'wander';
          s.drainTicks = 0;
        }
        const dx = s.pos[0] - l.pos[0];
        const dz = s.pos[2] - l.pos[2];
        const len = Math.sqrt(dx * dx + dz * dz);
        const ux = len > 0.0001 ? dx / len : 1;
        const uz = len > 0.0001 ? dz / len : 0;
        if (l.justLitTicks > 0) {
          const pushStep = (world.tuning.safe_radius - d) / l.justLitTicks;
          s.pos = roundVec3([s.pos[0] + ux * pushStep, s.pos[1], s.pos[2] + uz * pushStep]);
        } else {
          s.pos = roundVec3([
            l.pos[0] + ux * world.tuning.safe_radius,
            s.pos[1],
            l.pos[2] + uz * world.tuning.safe_radius,
          ]);
        }
      }
    }
  }

  // Step 7: Pulse (Tỏa Sáng) — Ticket-03: +5 per shade stunned, +15 total if it was in 'drain' state right before
  if (
    playerActive &&
    pulseTriggered &&
    p.pulseCdTicks === 0 &&
    p.carried >= world.tuning.pulse_cost
  ) {
    p.carried -= world.tuning.pulse_cost;
    p.pulseCdTicks = Math.round(world.tuning.pulse_cooldown_s * TICK_RATE);
    const pulseCenter: Vec3Tuple = [p.pos[0], p.pos[1] + 0.8, p.pos[2]];
    const stunnedIds: string[] = [];

    for (const s of world.shades) {
      if (dist3D(pulseCenter, s.pos) <= world.tuning.pulse_radius) {
        const wasDraining =
          s.state === 'drain' || world.simTick - s.wasDrainingTick <= 15;
        s.state = 'stunned';
        s.drainTicks = 0;
        s.stateTicksLeft = Math.round(world.tuning.pulse_stun_s * TICK_RATE);
        s.pushTicksLeft = 15;
        const dx = s.pos[0] - p.pos[0];
        const dz = s.pos[2] - p.pos[2];
        const d = Math.sqrt(dx * dx + dz * dz);
        const ux = d > 0.0001 ? dx / d : 1.0;
        const uz = d > 0.0001 ? dz / d : 0.0;
        const stepDist = world.tuning.pulse_push_m / 15;
        s.pushStepXZ = [ux * stepDist, uz * stepDist];
        stunnedIds.push(s.id);
        world.score += wasDraining
          ? world.tuning.score.per_drain_stun
          : world.tuning.score.per_stun;
      }
    }

    for (const d of world.drifters) {
      if (d.state === 'removed') continue;
      if (dist3D(pulseCenter, d.pos) <= world.tuning.pulse_radius) {
        if (d.state === 'chase') {
          d.state = 'flee';
          d.stateTicksLeft = 240;
        } else if (d.state === 'flee' && d.stolen > 0) {
          const dropCount = d.stolen;
          for (let k = 0; k < dropCount; k++) {
            const angle = (k * Math.PI * 2) / dropCount;
            world.motes.push({
              id: `M${world.nextMoteId++}`,
              pos: roundVec3([
                d.pos[0] + Math.cos(angle) * 0.5,
                d.pos[1],
                d.pos[2] + Math.sin(angle) * 0.5,
              ]),
              kind: 'dropped',
              ttlTicks: 480,
            });
          }
          d.stolen = 0;
          d.stateTicksLeft = 120;
          if (world.contractVersion !== '1.0') {
            emit('drifter_drop', { drifter_id: d.id, amount: dropCount });
          }
        }
      }
    }

    emit('pulse', { stunned_ids: stunnedIds });
  }

  // Step 8: Move Ink Shadows (Bóng Mực — including Ticket-03 drain behavior) and Drifters (Gió Lạc)
  for (const s of world.shades) {
    if (s.state === 'spawning') {
      s.stateTicksLeft -= 1;
      if (s.stateTicksLeft <= 0) {
        s.state = 'wander';
      }
      continue;
    }

    if (s.state === 'stunned') {
      if (s.pushTicksLeft > 0) {
        s.pushTicksLeft -= 1;
        const candX = s.pos[0] + s.pushStepXZ[0];
        const candZ = s.pos[2] + s.pushStepXZ[1];
        if (getGroundHeight(world.night, candX, candZ, s.pos[1]) !== null) {
          s.pos = roundVec3([candX, s.pos[1], candZ]);
        }
      }
      s.stateTicksLeft -= 1;
      if (s.stateTicksLeft <= 0) {
        s.state = 'wander';
      }
      continue;
    }

    if (s.state === 'recoil') {
      if (s.pushTicksLeft > 0) {
        s.pushTicksLeft -= 1;
        const candX = s.pos[0] + s.pushStepXZ[0];
        const candZ = s.pos[2] + s.pushStepXZ[1];
        if (getGroundHeight(world.night, candX, candZ, s.pos[1]) !== null) {
          s.pos = roundVec3([candX, s.pos[1], candZ]);
        }
      }
      s.stateTicksLeft -= 1;
      if (s.stateTicksLeft <= 0) {
        s.state = 'wander';
      }
      continue;
    }

    const dToPlayer = distXZ(s.pos, p.pos);
    const playerInLitSafeZone = world.lanterns.some(
      (l) => hasActiveSafeZone(l) && distXZ(p.pos, l.pos) < world.tuning.safe_radius
    );

    // Handle 'drain' state transitions (Ticket-03 Section 2):
    // From drain -> chase if Mây enters within 6m; -> wander if lantern turns off, fuel >= 30, or dist > 2m.
    if (s.state === 'drain') {
      s.wasDrainingTick = world.simTick;
      if (playerActive && !playerInLitSafeZone && dToPlayer <= 6.0) {
        s.state = 'chase';
        s.drainTicks = 0;
      } else {
        const targetL =
          (s.targetLanternId
            ? world.lanterns.find((l) => l.id === s.targetLanternId)
            : null) ??
          world.lanterns.find(
            (l) =>
              l.lit &&
              l.fuelUnits < STANDARD_TUNING.low_fuel_threshold * FUEL_UNITS_PER_FUEL &&
              distXZ(s.pos, l.pos) <= 2.0
          );

        if (
          !targetL ||
          !targetL.lit ||
          targetL.fuelUnits >= STANDARD_TUNING.low_fuel_threshold * FUEL_UNITS_PER_FUEL ||
          distXZ(s.pos, targetL.pos) > 2.0
        ) {
          s.state = 'wander';
          s.drainTicks = 0;
        } else {
          // Stay still while draining
          continue;
        }
      }
    }

    // Standard detection / drop chase radius (12m / 18m)
    if (playerActive && !playerInLitSafeZone) {
      if (s.state === 'wander' && dToPlayer <= 12.0) {
        s.state = 'chase';
      } else if (s.state === 'chase' && dToPlayer > 18.0) {
        s.state = 'wander';
      }
    } else if (s.state === 'chase') {
      s.state = 'wander';
    }

    if (s.state === 'chase' && dToPlayer > 0.0001) {
      const ux = (p.pos[0] - s.pos[0]) / dToPlayer;
      const uz = (p.pos[2] - s.pos[2]) / dToPlayer;
      const candX = s.pos[0] + ux * world.tuning.shade_speed * DT;
      const candZ = s.pos[2] + uz * world.tuning.shade_speed * DT;
      const blockedBySafeZone = world.lanterns.some(
        (l) => hasActiveSafeZone(l) && distXZ([candX, s.pos[1], candZ], l.pos) < world.tuning.safe_radius
      );
      if (!blockedBySafeZone) {
        s.pos = roundVec3([candX, s.pos[1], candZ]);
      }
    } else if (s.state === 'wander') {
      // Ticket-03 Section 2: Only shades in 'wander' choose weak lanterns (fuel < 30 nearest, tie id smaller),
      // otherwise head toward nearest unlit lantern.
      const targetL = findTargetLanternForShade(s, world.lanterns);
      if (targetL) {
        s.targetLanternId = targetL.id;
        const isWeakLit =
          targetL.lit &&
          targetL.fuelUnits < STANDARD_TUNING.low_fuel_threshold * FUEL_UNITS_PER_FUEL;
        const distToL = distXZ(s.pos, targetL.pos);

        if (isWeakLit && distToL <= 2.0) {
          s.state = 'drain';
          s.drainTicks = 0;
        } else if (distToL > 0.0001) {
          const ux = (targetL.pos[0] - s.pos[0]) / distToL;
          const uz = (targetL.pos[2] - s.pos[2]) / distToL;
          const candX = s.pos[0] + ux * world.tuning.shade_speed * DT;
          const candZ = s.pos[2] + uz * world.tuning.shade_speed * DT;
          const blockedBySafeZone = world.lanterns.some(
            (l) =>
              hasActiveSafeZone(l) &&
              distXZ([candX, s.pos[1], candZ], l.pos) < world.tuning.safe_radius
          );
          if (!blockedBySafeZone) {
            s.pos = roundVec3([candX, s.pos[1], candZ]);
          }
          // Check if reached <= 2m of weak lit lantern after moving
          if (isWeakLit && distXZ(s.pos, targetL.pos) <= 2.0) {
            s.state = 'drain';
            s.drainTicks = 0;
          }
        }
      }
    }
  }

  for (const d of world.drifters) {
    if (d.state === 'removed') continue;
    const distP = distXZ(d.pos, p.pos);

    if (d.state === 'idle' || d.state === 'chase') {
      if (playerActive && p.carried >= 5 && distP <= 15.0) {
        d.state = 'chase';
      } else {
        d.state = 'idle';
      }
    }

    if (d.state === 'chase' && distP > 0.0001) {
      const ux = (p.pos[0] - d.pos[0]) / distP;
      const uz = (p.pos[2] - d.pos[2]) / distP;
      d.pos = roundVec3([d.pos[0] + ux * 7.0 * DT, d.pos[1], d.pos[2] + uz * 7.0 * DT]);
    } else if (d.state === 'idle') {
      const candX = d.pos[0] + Math.cos(d.wanderAngle) * 2.0 * DT;
      const candZ = d.pos[2] + Math.sin(d.wanderAngle) * 2.0 * DT;
      if (getGroundHeight(world.night, candX, candZ, d.pos[1]) !== null) {
        d.pos = roundVec3([candX, d.pos[1], candZ]);
      } else {
        d.wanderAngle += Math.PI * 0.8;
      }
    } else if (d.state === 'flee') {
      const dx = d.pos[0] - p.pos[0];
      const dz = d.pos[2] - p.pos[2];
      const len = Math.sqrt(dx * dx + dz * dz);
      const ux = len > 0.0001 ? dx / len : 1.0;
      const uz = len > 0.0001 ? dz / len : 0.0;
      d.pos = roundVec3([d.pos[0] + ux * 7.0 * DT, d.pos[1], d.pos[2] + uz * 7.0 * DT]);
      d.stateTicksLeft -= 1;
      if (d.stateTicksLeft <= 0) {
        d.state = 'removed';
      }
    }
  }

  // Step 9: Collisions — Drifters steal first, then Ink Shadows hit (sorted by id ascending)
  if (playerActive) {
    const sortedDrifters = [...world.drifters].sort((a, b) => a.id.localeCompare(b.id));
    for (const d of sortedDrifters) {
      if (d.state === 'removed' || d.state === 'flee' || d.hasStolenOnce) continue;
      if (distXZ(d.pos, p.pos) <= 1.2) {
        const stealAmt = Math.min(3, p.carried);
        p.carried -= stealAmt;
        d.stolen = stealAmt;
        d.hasStolenOnce = true;
        d.state = 'flee';
        d.stateTicksLeft = 240;
        if (world.contractVersion !== '1.0') {
          emit('drifter_steal', {
            drifter_id: d.id,
            amount: stealAmt,
            carried: p.carried,
          });
        }
      }
    }

    const sortedShades = [...world.shades].sort((a, b) => a.id.localeCompare(b.id));
    for (const s of sortedShades) {
      if (s.state === 'stunned' || s.state === 'recoil' || s.state === 'spawning') continue;
      const insidePushZone = world.lanterns.some(
        (l) => hasActiveSafeZone(l) && l.justLitTicks > 0 && distXZ(s.pos, l.pos) <= world.tuning.safe_radius
      );
      if (insidePushZone) continue;

      if (
        distXZ(s.pos, p.pos) <= world.tuning.shade_hit_radius &&
        Math.abs(s.pos[1] - p.pos[1]) <= 1.5
      ) {
        if (p.invulnTicks > 0) {
          continue;
        }
        p.flames = Math.max(0, p.flames - 1);
        const dropCount = Math.floor(p.carried * world.tuning.hit_drop_ratio);
        p.carried -= dropCount;

        for (let k = 0; k < dropCount; k++) {
          const angle = prng.range(0, Math.PI * 2);
          const rad = prng.range(1.5, 2.5);
          world.motes.push({
            id: `M${world.nextMoteId++}`,
            pos: roundVec3([
              p.pos[0] + Math.cos(angle) * rad,
              p.pos[1],
              p.pos[2] + Math.sin(angle) * rad,
            ]),
            kind: 'dropped',
            ttlTicks: 480,
          });
        }

        p.invulnTicks = Math.round(world.tuning.invuln_s * TICK_RATE);

        s.state = 'recoil';
        s.drainTicks = 0;
        s.stateTicksLeft = 60;
        s.pushTicksLeft = 60;
        const dx = s.pos[0] - p.pos[0];
        const dz = s.pos[2] - p.pos[2];
        const dist = Math.sqrt(dx * dx + dz * dz);
        const ux = dist > 0.0001 ? dx / dist : 1.0;
        const uz = dist > 0.0001 ? dz / dist : 0.0;
        s.pushStepXZ = [(ux * 2.0) / 60, (uz * 2.0) / 60];

        emit('player_hit', { by: 'shade', flames: p.flames, dropped: dropCount });
        break;
      }
    }
  }

  // Step 10: Scheduled spawns
  const nightInfo = getSpawnListsForNight(world.night);

  if (world.randomMotes && world.simTick > 0 && world.simTick % 240 === 0 && world.motes.length < 30) {
    const emptySpawns = nightInfo.moteSpawns.filter(
      (sp) => !world.motes.some((m) => distXZ(m.pos, sp) < 0.5)
    );
    if (emptySpawns.length > 0) {
      const chosen = emptySpawns[prng.int(0, emptySpawns.length - 1)];
      world.motes.push({
        id: `M${world.nextMoteId++}`,
        pos: [...chosen] as Vec3Tuple,
        kind: 'random',
        ttlTicks: null,
      });
    }
  }

  if (world.randomShades && world.simTick >= 300) {
    const isInitialSpawn = world.simTick === 300;
    const isPeriodicSpawn =
      world.simTick > 300 && (world.simTick - 300) % nightInfo.shadeIntervalTicks === 0;

    if (isInitialSpawn || isPeriodicSpawn) {
      const countToSpawn = isInitialSpawn ? 2 : 1;
      for (let c = 0; c < countToSpawn; c++) {
        if (world.shades.length >= nightInfo.maxShades) break;
        const validSpawns = nightInfo.shadeSpawns.filter(
          (sp) =>
            distXZ(sp, p.pos) >= 15.0 &&
            !world.lanterns.some((l) => hasActiveSafeZone(l) && distXZ(sp, l.pos) < world.tuning.safe_radius)
        );
        if (validSpawns.length > 0) {
          const sp = validSpawns[prng.int(0, validSpawns.length - 1)];
          const id = `S${world.nextShadeId++}`;
          world.shades.push({
            id,
            pos: [...sp] as Vec3Tuple,
            state: 'wander',
            stateTicksLeft: 0,
            pushTicksLeft: 0,
            pushStepXZ: [0, 0],
            wanderAngle: Math.atan2(-sp[2], -sp[0]),
            targetLanternId: null,
            drainTicks: 0,
            wasDrainingTick: -10,
          });
          emit('shade_spawned', { id });
        }
      }
    }
  }

  if (
    world.randomDrifters &&
    world.night >= 2 &&
    world.simTick > 0 &&
    world.simTick % 1200 === 0
  ) {
    const activeDrifters = world.drifters.filter((d) => d.state !== 'removed');
    if (activeDrifters.length < 2 && nightInfo.shadeSpawns.length > 0) {
      const sp = nightInfo.shadeSpawns[prng.int(0, nightInfo.shadeSpawns.length - 1)];
      world.drifters.push({
        id: `D${world.nextDrifterId++}`,
        pos: [...sp] as Vec3Tuple,
        state: 'idle',
        stolen: 0,
        hasStolenOnce: false,
        stateTicksLeft: 0,
        wanderAngle: Math.atan2(-sp[2], -sp[0]),
      });
    }
  }

  // Step 11: Evaluate Victory / Defeat (Ticket-03 Section 3: [REPLACES] "win immediately when all lanterns lit")
  // - Out of Flames -> always lose ('no_flames') immediately, even on the final tick.
  // - When time runs out (timeLeftTicks <= 0, dawn): if litCount >= ceil(0.6 * totalLanterns), win ('dawn_survived'); else lose ('dawn').
  if (p.flames <= 0) {
    world.state = 'lost';
    emit('game_over', { result: 'lost', reason: 'no_flames' });
  } else if (world.timeLeftTicks <= 0) {
    const litLanterns = world.lanterns.filter((l) => l.lit);
    const requiredLit = Math.ceil(world.tuning.win_ratio * world.lanterns.length);
    if (litLanterns.length >= requiredLit) {
      world.state = 'won';
      // Dawn bonus (Ticket-03 Section 5): each lit lantern grants +50 + floor(fuel); each remaining Flame grants +50
      for (const l of litLanterns) {
        const fuelFloor = Math.floor(l.fuelUnits / FUEL_UNITS_PER_FUEL);
        world.score += world.tuning.score.per_lit_at_dawn + fuelFloor;
      }
      world.score += p.flames * world.tuning.score.per_flame_left;
      emit('game_over', { result: 'won', reason: 'dawn_survived' });
    } else {
      world.state = 'lost';
      emit('game_over', { result: 'lost', reason: 'dawn' });
    }
  }

  return tickEvents;
}

export function buildSnapshot(world: SimWorld): Record<string, unknown> {
  const timeLeftS = round3(world.timeLeftTicks / TICK_RATE);

  return {
    type: 'snapshot',
    tick: world.tick,
    sim_tick: world.simTick,
    night: world.night,
    state: world.state,
    time_left_s: timeLeftS,
    score: world.score,
    wind: {
      active: world.wind.active,
      dir_deg: round3(world.wind.dirDeg),
    },
    player: {
      pos: roundVec3(world.player.pos),
      vel: roundVec3(world.player.vel),
      flames: world.player.flames,
      carried: world.player.carried,
      capacity: world.player.capacity,
      grounded: world.player.grounded,
      invuln: world.player.invulnTicks > 0,
      dash_cd_s: round3(world.player.dashCdTicks / TICK_RATE),
      pulse_cd_s: round3(world.player.pulseCdTicks / TICK_RATE),
      charm_s: round3(world.player.charmTicks / TICK_RATE),
    },
    lanterns: world.lanterns.map((l) => ({
      id: l.id,
      pos: roundVec3(l.pos),
      lit: l.lit,
      deposited: l.deposited,
      fuel: l.lit ? round1(l.fuelUnits / FUEL_UNITS_PER_FUEL) : 0,
      ever_lit: l.everLit,
      relit_count: l.relitCount,
    })),
    shades: world.shades.map((s) => ({
      id: s.id,
      pos: roundVec3(s.pos),
      state: s.state,
    })),
    motes_active: world.motes.length,
    motes: world.motes.map((m) => ({
      id: m.id,
      pos: roundVec3(m.pos),
      kind: m.kind,
      ttl_s: m.ttlTicks !== null ? round3(m.ttlTicks / TICK_RATE) : null,
    })),
    drifters: world.drifters
      .filter((d) => d.state !== 'removed')
      .map((d) => ({
        id: d.id,
        pos: roundVec3(d.pos),
        state: d.state,
        stolen: d.stolen,
      })),
    charms: world.charms.map((c) => ({
      id: c.id,
      pos: roundVec3(c.pos),
      available: c.available,
      respawn_s: round3(c.respawnTicks / TICK_RATE),
    })),
  };
}

export function validateInputFile(input: unknown): InputFile {
  if (!input || typeof input !== 'object' || !Array.isArray((input as InputFile).frames)) {
    throw new Error('INVALID_INPUT_FORMAT: Missing frames array');
  }
  const frames = (input as InputFile).frames;
  let lastTick = -1;
  for (const f of frames) {
    if (typeof f.tick !== 'number' || !Number.isInteger(f.tick) || f.tick < 0) {
      throw new Error('INVALID_INPUT_FORMAT: Frame tick must be a non-negative integer');
    }
    if (f.tick <= lastTick) {
      throw new Error('INVALID_INPUT_FORMAT: Frame ticks must be strictly increasing');
    }
    lastTick = f.tick;
    if (f.move !== undefined) {
      if (
        !Array.isArray(f.move) ||
        f.move.length !== 2 ||
        typeof f.move[0] !== 'number' ||
        typeof f.move[1] !== 'number'
      ) {
        throw new Error('INVALID_INPUT_FORMAT: move must be [x, z]');
      }
    }
  }
  return input as InputFile;
}

export function validateScenarioFile(sc: unknown): ScenarioFile {
  if (!sc || typeof sc !== 'object' || Array.isArray(sc)) {
    throw new Error('INVALID_SCENARIO_FORMAT: Scenario must be a JSON object');
  }
  const s = sc as ScenarioFile;
  if (s.player !== undefined && (typeof s.player !== 'object' || s.player === null)) {
    throw new Error('INVALID_SCENARIO_FORMAT: player must be an object');
  }
  if (s.motes !== undefined && !Array.isArray(s.motes)) {
    throw new Error('INVALID_SCENARIO_FORMAT: motes must be an array');
  }
  if (s.shades !== undefined && !Array.isArray(s.shades)) {
    throw new Error('INVALID_SCENARIO_FORMAT: shades must be an array');
  }
  if (s.lanterns !== undefined && !Array.isArray(s.lanterns)) {
    throw new Error('INVALID_SCENARIO_FORMAT: lanterns must be an array');
  }
  return s;
}

export function runContractSimulation(params: {
  seed: number;
  night: 1 | 2 | 3;
  ticks: number;
  snapshotEvery?: number;
  scenario?: ScenarioFile;
  inputs?: InputFile;
  contractVersion?: '1.0' | '1.1' | '1.2';
}): { lines: string[]; finalWorld: SimWorld } {
  const snapshotEvery = params.snapshotEvery ?? 10;
  const { world, prng } = createWorld({
    seed: params.seed,
    night: params.night,
    scenario: params.scenario,
    contractVersion: params.contractVersion,
  });

  const frameMap = new Map<number, InputFrame>();
  if (params.inputs) {
    for (const f of params.inputs.frames) {
      frameMap.set(f.tick, f);
    }
  }

  const lines: string[] = [];
  const inputState = createDefaultInputState();

  if (snapshotEvery > 0 && 0 % snapshotEvery === 0) {
    lines.push(JSON.stringify(buildSnapshot(world)));
  }

  for (let k = 0; k < params.ticks; k++) {
    if (world.state === 'won' || world.state === 'lost') {
      break;
    }
    const frame = frameMap.get(k);
    const events = stepWorld(world, prng, inputState, frame);

    for (const ev of events) {
      lines.push(JSON.stringify(ev));
    }

    if (snapshotEvery > 0 && world.tick % snapshotEvery === 0) {
      lines.push(JSON.stringify(buildSnapshot(world)));
    }
  }

  lines.push(
    JSON.stringify({
      type: 'end',
      ticks: world.tick,
      state: world.state,
      score: world.score,
    })
  );

  return { lines, finalWorld: world };
}
