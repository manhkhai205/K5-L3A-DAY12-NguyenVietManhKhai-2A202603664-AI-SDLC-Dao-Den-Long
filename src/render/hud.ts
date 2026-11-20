import * as THREE from 'three';
import { TICK_RATE } from '../core/config.ts';
import { distXZ } from '../core/engine.ts';
import { SimWorld } from '../core/types.ts';

export const NIGHT_TITLES: Record<1 | 2 | 3, string> = {
  1: 'Đêm 1 — Đảo Bến',
  2: 'Đêm 2 — Đảo Cau',
  3: 'Đêm 3 — Đảo Chuông',
};

export const NIGHT_LORE: Record<1 | 2 | 3, string> = {
  1: 'Ông Đăng: "Đêm 1 tại Đảo Bến! Hòn đảo tròn có 5 Đèn Lồng Lớn. Hãy gom đủ 10 đom đóm cho mỗi đèn và bấm Q để Tỏa Sáng nếu Bóng Mực tới gần nhé Mây!"',
  2: 'Ông Đăng: "Đêm 2 tại Đảo Cau! Hai hòn đảo nối bằng cầu tre và Bục Nhảy vàng. Coi chừng Gió Lạc cướp đom đóm khi cháu giữ từ 5 đốm trở lên, và hãy nhặt Bùa Gió đỏ ở giữa cầu để lướt không hồi chiêu!"',
  3: 'Ông Đăng: "Đêm 3 tại Đảo Chuông! Hòn đảo 3 tầng với 7 Đèn Lồng Lớn và Tháp Chuông trên đỉnh. Hãy đi theo 2 con dốc hoặc Bục Nhảy để lên tầng cao, và giữ vững tay lái khi Gió Mạnh thổi mỗi 30 giây!"',
};

export function initMoteSlots(): void {
  const container = document.getElementById('mote-slots-container');
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < 10; i++) {
    const slot = document.createElement('div');
    slot.className = 'mote-slot';
    container.appendChild(slot);
  }
}

export function updateHUD(
  world: SimWorld,
  totalCampaignScore: number,
  camera: THREE.PerspectiveCamera,
  camYawDeg: number
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

  if (elFlames) {
    const hearts = '🔥'.repeat(Math.max(0, world.player.flames));
    elFlames.textContent = `${hearts || '0'} (${world.player.flames})`;
  }

  if (elFx) {
    const tags: string[] = [];
    if (world.player.invulnTicks > 0)
      tags.push(`Bất tử (${(world.player.invulnTicks / TICK_RATE).toFixed(1)}s)`);
    if (world.player.charmTicks > 0)
      tags.push(`Bùa Gió (${(world.player.charmTicks / TICK_RATE).toFixed(1)}s)`);
    if (world.wind.warning) tags.push('Sắp có Gió Mạnh (2s)!');
    if (world.wind.active) tags.push(`Gió Mạnh (${world.wind.dirDeg.toFixed(0)}°)`);
    elFx.textContent = tags.length > 0 ? tags.join(' · ') : 'Trạng thái: Bình thường';
  }

  // Clock mm:ss
  const secLeft = Math.max(0, Math.ceil(world.timeLeftTicks / TICK_RATE));
  const mm = String(Math.floor(secLeft / 60)).padStart(2, '0');
  const ss = String(secLeft % 60).padStart(2, '0');
  if (elClock) {
    elClock.textContent = `${mm}:${ss}`;
    if (secLeft <= 30) {
      elClock.classList.add('danger');
    } else {
      elClock.classList.remove('danger');
    }
  }

  const litCount = world.lanterns.filter((l) => l.lit).length;
  if (elLanterns) elLanterns.textContent = `${litCount} / ${world.lanterns.length}`;
  if (elScore) elScore.textContent = `${world.score} (Tổng: ${totalCampaignScore + world.score})`;
  if (elCarried) elCarried.textContent = `${world.player.carried} / ${world.tuning.carry_capacity}`;

  // Update 10 mote slots
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

  // Nearest unlit lantern compass, interact prompt, and off-screen screen-edge arrow
  const unlit = world.lanterns.filter((l) => !l.lit);
  if (unlit.length > 0) {
    let nearest = unlit[0];
    let minD = distXZ(world.player.pos, nearest.pos);
    for (const l of unlit) {
      const d = distXZ(world.player.pos, l.pos);
      if (d < minD) {
        minD = d;
        nearest = l;
      }
    }

    const dx = nearest.pos[0] - world.player.pos[0];
    const dz = nearest.pos[2] - world.player.pos[2];
    // Relative angle to camera yaw
    const worldAngleDeg = (Math.atan2(dx, dz) * 180) / Math.PI;
    const relAngleDeg = worldAngleDeg - camYawDeg;

    if (elCompassArrow && elCompassDist) {
      elCompassArrow.style.transform = `rotate(${relAngleDeg.toFixed(1)}deg)`;
      elCompassDist.textContent = `${nearest.id}: ${minD.toFixed(1)}m (${nearest.deposited}/10)`;
    }

    if (elPrompt) {
      if (minD <= world.tuning.interact_radius) {
        elPrompt.style.display = 'block';
        elPrompt.textContent = `E — Nạp ánh sáng (${nearest.deposited}/${world.tuning.lantern_cost})`;
      } else {
        elPrompt.style.display = 'none';
      }
    }

    // Check if nearest unlit lantern is off-screen
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
        elOffscreen.textContent = `▲ ${nearest.id} (${minD.toFixed(0)}m)`;
      } else {
        elOffscreen.style.display = 'none';
      }
    }
  } else {
    if (elCompassDist) elCompassDist.textContent = 'Đã sáng hết!';
    if (elPrompt) elPrompt.style.display = 'none';
    if (elOffscreen) elOffscreen.style.display = 'none';
  }
}
