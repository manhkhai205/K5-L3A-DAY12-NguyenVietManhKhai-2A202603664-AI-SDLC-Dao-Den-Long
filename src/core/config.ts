import { TuningConfig, Vec3Tuple } from './types.ts';

export const TICK_RATE = 60;
export const DT = 1 / TICK_RATE;
export const GRAVITY = -20.0;
export const JUMP_SPEED = 7.0;

export const STANDARD_TUNING: TuningConfig = {
  player_speed: 6.0,
  carry_capacity: 10,
  lantern_cost: 10,
  lantern_count_night1: 5,
  pickup_radius: 1.0,
  interact_radius: 2.0,
  pulse_cost: 3,
  pulse_radius: 5.0,
  night1_duration_s: 300,
  night2_duration_s: 330,
  night3_duration_s: 360,
  flames: 3,
  invuln_s: 1.5,
  hit_drop_ratio: 0.5,
  pulse_stun_s: 2.0,
  pulse_push_m: 4.0,
  pulse_cooldown_s: 3.0,
  safe_radius: 6.0,
  shade_speed: 4.0,
  shade_hit_radius: 1.0,
  fall_enabled: true,
  dash_speed: 14.0,
  dash_duration_s: 0.2,
  dash_cooldown_s: 1.5,
  score: {
    per_mote: 10,
    per_lantern: 100,
    per_stun: 5,
    per_second_left: 2,
    per_flame_left: 50,
  },
};

export function round3(n: number): number {
  const r = Math.round(n * 1000) / 1000;
  return Object.is(r, -0) ? 0 : r;
}

export function roundVec3(v: Vec3Tuple): Vec3Tuple {
  return [round3(v[0]), round3(v[1]), round3(v[2])];
}

export function degToPointXZ(radius: number, deg: number, centerX = 0, centerY = 0, centerZ = 0): Vec3Tuple {
  const rad = (deg * Math.PI) / 180;
  return roundVec3([centerX + radius * Math.cos(rad), centerY, centerZ + radius * Math.sin(rad)]);
}

// Night 1 — Đảo Bến
export const NIGHT1_LANTERNS: Array<{ id: string; pos: Vec3Tuple }> = [
  { id: 'L1', pos: [0, 0, 25] },
  { id: 'L2', pos: [23.8, 0, 7.7] },
  { id: 'L3', pos: [14.7, 0, -20.2] },
  { id: 'L4', pos: [-14.7, 0, -20.2] },
  { id: 'L5', pos: [-23.8, 0, 7.7] },
];

export const NIGHT1_MOTE_SPAWNS: Vec3Tuple[] = [
  ...Array.from({ length: 8 }, (_, i) => degToPointXZ(12, i * 45)),
  ...Array.from({ length: 16 }, (_, i) => degToPointXZ(33, i * 22.5)),
];

export const NIGHT1_SHADE_SPAWNS: Vec3Tuple[] = Array.from({ length: 12 }, (_, i) =>
  degToPointXZ(37, 15 + i * 30)
);

// Night 2 — Đảo Cau
export const NIGHT2_LANTERNS: Array<{ id: string; pos: Vec3Tuple }> = [
  { id: 'L1', pos: [0, 0, 20] },
  { id: 'L2', pos: [17, 0, -10] },
  { id: 'L3', pos: [-17, 0, -10] },
  { id: 'L4', pos: [70, 0, 20] },
  { id: 'L5', pos: [87, 0, -10] },
  { id: 'L6', pos: [53, 0, -10] },
];

export const NIGHT2_MOTE_SPAWNS: Vec3Tuple[] = [
  ...Array.from({ length: 4 }, (_, i) => degToPointXZ(10, i * 90, 0, 0, 0)),
  ...Array.from({ length: 8 }, (_, i) => degToPointXZ(22, i * 45, 0, 0, 0)),
  ...Array.from({ length: 4 }, (_, i) => degToPointXZ(10, i * 90, 70, 0, 0)),
  ...Array.from({ length: 8 }, (_, i) => degToPointXZ(22, i * 45, 70, 0, 0)),
];

export const NIGHT2_SHADE_SPAWNS: Vec3Tuple[] = [
  ...Array.from({ length: 8 }, (_, i) => degToPointXZ(26, 22.5 + i * 45, 0, 0, 0)),
  ...Array.from({ length: 8 }, (_, i) => degToPointXZ(26, 22.5 + i * 45, 70, 0, 0)),
];

export const NIGHT2_CHARMS: Array<{ id: string; pos: Vec3Tuple }> = [{ id: 'C1', pos: [35, 0, 0] }];

// Night 3 — Đảo Chuông
export const NIGHT3_LANTERNS: Array<{ id: string; pos: Vec3Tuple }> = [
  { id: 'L1', pos: [0, 6, 6] },
  { id: 'L2', pos: [18, 3, 10] },
  { id: 'L3', pos: [-18, 3, 10] },
  { id: 'L4', pos: [35, 0, -10] },
  { id: 'L5', pos: [-35, 0, -10] },
  { id: 'L6', pos: [20, 0, -35] },
  { id: 'L7', pos: [-20, 0, -35] },
];

export const NIGHT3_MOTE_SPAWNS: Vec3Tuple[] = [
  ...Array.from({ length: 18 }, (_, i) => degToPointXZ(34, i * 20, 0, 0, 0)),
  ...Array.from({ length: 8 }, (_, i) => degToPointXZ(18, 20 + i * 20, 0, 3, 0)),
  ...Array.from({ length: 4 }, (_, i) => degToPointXZ(5, 45 + i * 90, 0, 6, 0)),
];

export const NIGHT3_SHADE_SPAWNS: Vec3Tuple[] = Array.from({ length: 16 }, (_, i) =>
  degToPointXZ(43, i * 22.5, 0, 0, 0)
);

export const NIGHT3_CHARMS: Array<{ id: string; pos: Vec3Tuple }> = [
  { id: 'C1', pos: [30, 0, 25] },
  { id: 'C2', pos: [-30, 0, 25] },
];
