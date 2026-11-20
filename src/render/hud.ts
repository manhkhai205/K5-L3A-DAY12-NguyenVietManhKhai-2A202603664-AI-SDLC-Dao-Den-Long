import { TICK_RATE } from '../core/config.ts';
import { distXZ } from '../core/engine.ts';
import { SimWorld } from '../core/types.ts';

const NIGHT_TITLES: Record<1 | 2 | 3, string> = {
  1: 'Đêm 1 — Đảo Bến',
  2: 'Đêm 2 — Đảo Cau',
  3: 'Đêm 3 — Đảo Chuông',
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

export function updateHUD(world: SimWorld, totalCampaignScore: number): void {
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

  if (elNight) elNight.textContent = NIGHT_TITLES[world.night];

  if (elFlames) {
    const hearts = '🔥'.repeat(Math.max(0, world.player.flames));
    elFlames.textContent = `${hearts || '0'} (${world.player.flames})`;
  }

  if (elFx) {
    const tags: string[] = [];
    if (world.player.invulnTicks > 0) tags.push(`Bất tử (${(world.player.invulnTicks / TICK_RATE).toFixed(1)}s)`);
    if (world.player.charmTicks > 0) tags.push(`Bùa Gió (${(world.player.charmTicks / TICK_RATE).toFixed(1)}s)`);
    if (world.wind.warning) tags.push('Sắp có Gió Mạnh!');
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

  // Nearest unlit lantern compass & interact prompt
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

    if (elCompassArrow && elCompassDist) {
      const dx = nearest.pos[0] - world.player.pos[0];
      const dz = nearest.pos[2] - world.player.pos[2];
      const angleDeg = (Math.atan2(dx, -dz) * 180) / Math.PI;
      elCompassArrow.style.transform = `rotate(${angleDeg.toFixed(1)}deg)`;
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
  } else {
    if (elCompassDist) elCompassDist.textContent = 'Đã sáng hết!';
    if (elPrompt) elPrompt.style.display = 'none';
  }
}
