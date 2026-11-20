import * as THREE from 'three';
import { FUEL_UNITS_PER_FUEL, MAX_FUEL_UNITS, TICK_RATE } from '../core/config.ts';
import { distXZ } from '../core/engine.ts';
import { SimWorld } from '../core/types.ts';

export const NIGHT_TITLES: Record<1 | 2 | 3, string> = {
  1: 'Đêm 1 — Đảo Bến (Cần giữ 3/5 đèn sáng tới bình minh)',
  2: 'Đêm 2 — Đảo Cau (Cần giữ 4/6 đèn sáng tới bình minh)',
  3: 'Đêm 3 — Đảo Chuông (Cần giữ 5/7 đèn sáng tới bình minh)',
};

export const NIGHT_LORE: Record<1 | 2 | 3, string> = {
  1: 'Ông Đăng: "Đêm 1 tại Đảo Bến (240 giây)! Đèn đã thắp sẽ cạn dầu dần (1 dầu/giây) và Bóng Mực sẽ lao vào hút dầu khi dầu dưới 30! Hãy châm thêm đom đóm để giữ ít nhất 3/5 Đèn Lồng Lớn sáng tới lúc bình minh nhé Mây!"',
  2: 'Ông Đăng: "Đêm 2 tại Đảo Cau (270 giây)! Giữ ít nhất 4/6 Đèn Lồng Lớn sáng tới bình minh. Mỗi lần thắp đèn thành công sức chứa của cháu tăng thêm +2 (tối đa 20)!"',
  3: 'Ông Đăng: "Đêm 3 tại Đảo Chuông (300 giây)! Giữ ít nhất 5/7 Đèn Lồng Lớn sáng tới bình minh trên hòn đảo 3 tầng. Bấm Tỏa Sáng (Q) trúng Bóng Mực đang hút dầu sẽ được thưởng +15 điểm!"',
};

export function initMoteSlots(capacity = 10): void {
  const container = document.getElementById('mote-slots-container');
  if (!container) return;
  if (container.children.length === capacity) return;
  container.innerHTML = '';
  for (let i = 0; i < capacity; i++) {
    const slot = document.createElement('div');
    slot.className = 'mote-slot';
    container.appendChild(slot);
  }
}

export function updateHUD(
  world: SimWorld,
  totalCampaignScore: number,
  camera: THREE.PerspectiveCamera,
  camYawDeg: number,
  colorblindMode = false
): void {
  const elNight = document.getElementById('hud-night-label');
  const elFlames = document.getElementById('stat-flames');
  const elFx = document.getElementById('stat-status-fx');
  const elClock = document.getElementById('clock-box');
  const elLanterns = document.getElementById('stat-lanterns');
  const elScore = document.getElementById('stat-score');
  const elCarried = document.getElementById('stat-carried');
  const elCdDash = document.getElementById('cd-dash');
  const elCdPulse = document.getElementById('cd-pulse');
  const elCompassArrow = document.getElementById('compass-arrow');
  const elCompassDist = document.getElementById('compass-dist');
  const elPrompt = document.getElementById('interact-prompt');
  const elOffscreen = document.getElementById('offscreen-arrow');

  if (elNight) elNight.textContent = NIGHT_TITLES[world.night];

  const warnSymbol = colorblindMode ? '⚠ ' : '';

  if (elFlames) {
    const hearts = '🔥'.repeat(Math.max(0, world.player.flames));
    elFlames.textContent = `${warnSymbol}${hearts || '0'} (${world.player.flames})`;
  }

  if (elFx) {
    const tags: string[] = [];
    if (world.player.invulnTicks > 0)
      tags.push(`Bất tử (${(world.player.invulnTicks / TICK_RATE).toFixed(1)}s)`);
    if (world.player.charmTicks > 0)
      tags.push(`Bùa Gió (${(world.player.charmTicks / TICK_RATE).toFixed(1)}s)`);
    if (world.wind.warning) tags.push(`${warnSymbol}Sắp có Gió Mạnh (2s)!`);
    if (world.wind.active) tags.push(`${warnSymbol}Gió Mạnh (${world.wind.dirDeg.toFixed(0)}°)`);
    const drainingCount = world.shades.filter((s) => s.state === 'drain').length;
    if (drainingCount > 0) {
      tags.push(`${warnSymbol}${drainingCount} Bóng Mực đang hút dầu!`);
    }
    elFx.textContent = tags.length > 0 ? tags.join(' · ') : 'Trạng thái: Bình thường';
  }

  // Clock mm:ss
  const secLeft = Math.max(0, Math.ceil(world.timeLeftTicks / TICK_RATE));
  const mm = String(Math.floor(secLeft / 60)).padStart(2, '0');
  const ss = String(secLeft % 60).padStart(2, '0');
  if (elClock) {
    if (secLeft <= 30) {
      elClock.textContent = `${warnSymbol}${mm}:${ss}`;
      elClock.classList.add('danger');
    } else {
      elClock.textContent = `${mm}:${ss}`;
      elClock.classList.remove('danger');
    }
  }

  const litCount = world.lanterns.filter((l) => l.lit).length;
  const reqLit = Math.ceil(world.tuning.win_ratio * world.lanterns.length);
  if (elLanterns)
    elLanterns.textContent = `${litCount} / ${world.lanterns.length} (Cần ≥${reqLit})`;
  if (elScore) elScore.textContent = `${world.score} (Tổng: ${totalCampaignScore + world.score})`;
  if (elCarried) elCarried.textContent = `${world.player.carried} / ${world.player.capacity}`;

  // Dynamic capacity slots (10 to 20)
  initMoteSlots(world.player.capacity);
  const slots = document.querySelectorAll('.mote-slot');
  slots.forEach((slot, idx) => {
    if (idx < world.player.carried) {
      slot.classList.add('filled');
    } else {
      slot.classList.remove('filled');
    }
  });

  if (elCdDash) {
    if (world.player.charmTicks > 0) {
      elCdDash.textContent = 'Bùa Gió (0s)';
    } else if (world.player.dashCdTicks > 0) {
      elCdDash.textContent = `${(world.player.dashCdTicks / TICK_RATE).toFixed(1)}s`;
    } else {
      elCdDash.textContent = 'Sẵn sàng';
    }
  }

  if (elCdPulse) {
    if (world.player.pulseCdTicks > 0) {
      elCdPulse.textContent = `${(world.player.pulseCdTicks / TICK_RATE).toFixed(1)}s`;
    } else if (world.player.carried < world.tuning.pulse_cost) {
      elCdPulse.textContent = `Cần ${world.tuning.pulse_cost} đốm`;
    } else {
      elCdPulse.textContent = 'Sẵn sàng';
    }
  }

  // Nearest actionable lantern (unlit OR lit with fuel < 100)
  const actionable = world.lanterns.filter((l) => !l.lit || l.fuelUnits < MAX_FUEL_UNITS);
  if (actionable.length > 0) {
    // Prioritize unlit or low-fuel (<30) lanterns for compass, then any refuelable lantern
    const urgent = actionable.filter(
      (l) => !l.lit || l.fuelUnits < world.tuning.low_fuel_threshold * FUEL_UNITS_PER_FUEL
    );
    const pool = urgent.length > 0 ? urgent : actionable;
    let nearest = pool[0];
    let minD = distXZ(world.player.pos, nearest.pos);
    for (const l of pool) {
      const d = distXZ(world.player.pos, l.pos);
      if (d < minD) {
        minD = d;
        nearest = l;
      }
    }

    const dx = nearest.pos[0] - world.player.pos[0];
    const dz = nearest.pos[2] - world.player.pos[2];
    const worldAngleDeg = (Math.atan2(dx, dz) * 180) / Math.PI;
    const relAngleDeg = worldAngleDeg - camYawDeg;

    if (elCompassArrow && elCompassDist) {
      elCompassArrow.style.transform = `rotate(${relAngleDeg.toFixed(1)}deg)`;
      if (nearest.lit) {
        const fuelVal = (nearest.fuelUnits / FUEL_UNITS_PER_FUEL).toFixed(0);
        elCompassDist.textContent = `${nearest.id}: ${minD.toFixed(1)}m (Dầu ${fuelVal}%)`;
      } else {
        const cost = nearest.everLit ? world.tuning.relight_cost : world.tuning.lantern_cost;
        elCompassDist.textContent = `${nearest.id}: ${minD.toFixed(1)}m (${nearest.deposited}/${cost})`;
      }
    }

    // Interact prompt for closest actionable lantern within interact_radius
    let nearestAny = actionable[0];
    let minAnyD = distXZ(world.player.pos, nearestAny.pos);
    for (const l of actionable) {
      const d = distXZ(world.player.pos, l.pos);
      if (d < minAnyD) {
        minAnyD = d;
        nearestAny = l;
      }
    }

    if (elPrompt) {
      if (minAnyD <= world.tuning.interact_radius) {
        elPrompt.style.display = 'block';
        if (!nearestAny.lit) {
          const cost = nearestAny.everLit ? world.tuning.relight_cost : world.tuning.lantern_cost;
          elPrompt.textContent = `E — ${nearestAny.everLit ? 'Thắp lại đèn' : 'Nạp ánh sáng'} (${nearestAny.deposited}/${cost})`;
        } else {
          const fuelVal = (nearestAny.fuelUnits / FUEL_UNITS_PER_FUEL).toFixed(0);
          elPrompt.textContent = `E — Châm dầu đèn ${nearestAny.id} (Dầu: ${fuelVal}/100)`;
        }
      } else {
        elPrompt.style.display = 'none';
      }
    }

    if (elOffscreen) {
      const worldVec = new THREE.Vector3(nearest.pos[0], nearest.pos[1] + 2.5, nearest.pos[2]);
      const ndc = worldVec.project(camera);
      const isBehind = ndc.z > 1;
      const isOut = isBehind || Math.abs(ndc.x) > 0.92 || Math.abs(ndc.y) > 0.92;

      if (isOut) {
        elOffscreen.style.display = 'block';
        const rad = (relAngleDeg * Math.PI) / 180;
        const marginX = window.innerWidth * 0.42;
        const marginY = window.innerHeight * 0.38;
        const cx = window.innerWidth / 2 + Math.sin(rad) * marginX;
        const cy = window.innerHeight / 2 - Math.cos(rad) * marginY;
        elOffscreen.style.left = `${Math.max(60, Math.min(window.innerWidth - 60, cx))}px`;
        elOffscreen.style.top = `${Math.max(60, Math.min(window.innerHeight - 60, cy))}px`;
        elOffscreen.textContent = `${warnSymbol}▲ ${nearest.id} (${minD.toFixed(0)}m)`;
      } else {
        elOffscreen.style.display = 'none';
      }
    }
  } else {
    if (elCompassDist) elCompassDist.textContent = 'Tất cả đèn đầy dầu!';
    if (elPrompt) elPrompt.style.display = 'none';
    if (elOffscreen) elOffscreen.style.display = 'none';
  }
}
