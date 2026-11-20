export type Vec3Tuple = [number, number, number];

export interface TuningConfig {
  player_speed: number;
  carry_capacity: number;
  lantern_cost: number;
  lantern_count_night1: number;
  pickup_radius: number;
  interact_radius: number;
  pulse_cost: number;
  pulse_radius: number;
  night1_duration_s: number;
  night2_duration_s?: number;
  night3_duration_s?: number;
  flames: number;
  invuln_s: number;
  hit_drop_ratio: number;
  pulse_stun_s: number;
  pulse_push_m: number;
  pulse_cooldown_s: number;
  safe_radius: number;
  shade_speed: number;
  shade_hit_radius: number;
  fall_enabled: boolean;
  dash_speed?: number;
  dash_duration_s?: number;
  dash_cooldown_s?: number;
  score: {
    per_mote: number;
    per_lantern: number;
    per_stun: number;
    per_second_left: number;
    per_flame_left: number;
  };
}

export interface InputFrame {
  tick: number;
  move?: [number, number];
  cam_yaw_deg?: number;
  jump?: boolean;
  interact?: boolean;
  pulse?: boolean;
  dash?: boolean;
  pause?: boolean;
}

export interface InputFile {
  frames: InputFrame[];
}

export type ShadeStateName = 'spawning' | 'wander' | 'chase' | 'recoil' | 'stunned';
export type DrifterStateName = 'idle' | 'chase' | 'flee' | 'removed';

export interface PlayerSim {
  pos: Vec3Tuple;
  vel: Vec3Tuple;
  facingDir: [number, number]; // normalized XZ
  flames: number;
  carried: number;
  grounded: boolean;
  invulnTicks: number;
  dashCdTicks: number;
  dashActiveTicks: number;
  dashDir: [number, number];
  pulseCdTicks: number;
  charmTicks: number;
  respawnWaitTicks: number;
  jumpPadLocked: boolean;
  jumpPadVel: [number, number];
}

export interface MoteSim {
  id: string;
  pos: Vec3Tuple;
  kind: 'random' | 'dropped';
  ttlTicks: number | null; // null for random motes
  spawnPointIdx?: number;
}

export interface LanternSim {
  id: string;
  pos: Vec3Tuple;
  lit: boolean;
  deposited: number;
  justLitTicks: number; // 30 ticks safe zone push window
}

export interface ShadeSim {
  id: string;
  pos: Vec3Tuple;
  state: ShadeStateName;
  stateTicksLeft: number;
  pushTicksLeft: number;
  pushStepXZ: [number, number];
  wanderAngle: number;
}

export interface DrifterSim {
  id: string;
  pos: Vec3Tuple;
  state: DrifterStateName;
  stolen: number;
  hasStolenOnce: boolean;
  stateTicksLeft: number;
  wanderAngle: number;
}

export interface CharmSim {
  id: string;
  pos: Vec3Tuple;
  available: boolean;
  respawnTicks: number;
}

export interface ScenarioFile {
  player?: {
    pos?: Vec3Tuple;
    carried?: number;
    flames?: number;
    invuln_ticks?: number;
    dash_cd_ticks?: number;
    pulse_cd_ticks?: number;
    charm_ticks?: number;
  };
  random_motes?: boolean;
  random_shades?: boolean;
  random_drifters?: boolean;
  wind_enabled?: boolean;
  motes?: Array<Vec3Tuple | { id?: string; pos: Vec3Tuple; kind?: 'random' | 'dropped'; ttl_ticks?: number }>;
  shades?: Array<{
    id?: string;
    pos: Vec3Tuple;
    state?: ShadeStateName;
    state_ticks_left?: number;
  }>;
  lanterns?: Array<{
    id: string;
    pos?: Vec3Tuple;
    deposited?: number;
    lit?: boolean;
  }>;
  drifters?: Array<{
    id?: string;
    pos: Vec3Tuple;
    state?: DrifterStateName;
    stolen?: number;
    state_ticks_left?: number;
  }>;
  charms?: Array<{
    id?: string;
    pos?: Vec3Tuple;
    available?: boolean;
    respawn_ticks?: number;
  }>;
  time_left_s?: number;
}

export type SimGameState = 'playing' | 'paused' | 'won' | 'lost';

export interface SimEvent {
  type: 'event';
  tick: number;
  name: string;
  data: Record<string, unknown>;
}

export interface SimWorld {
  contractVersion: '1.0' | '1.1';
  seed: number;
  night: 1 | 2 | 3;
  tick: number;
  simTick: number;
  state: SimGameState;
  initialDurationTicks: number;
  timeLeftTicks: number;
  score: number;
  tuning: TuningConfig;
  player: PlayerSim;
  lanterns: LanternSim[];
  motes: MoteSim[];
  shades: ShadeSim[];
  drifters: DrifterSim[];
  charms: CharmSim[];
  wind: {
    enabled: boolean;
    active: boolean;
    warning: boolean;
    dirDeg: number;
  };
  randomMotes: boolean;
  randomShades: boolean;
  randomDrifters: boolean;
  nextMoteId: number;
  nextShadeId: number;
  nextDrifterId: number;
  events: SimEvent[];
}
