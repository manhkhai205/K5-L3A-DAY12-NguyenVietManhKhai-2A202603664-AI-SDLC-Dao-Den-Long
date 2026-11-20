import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  runContractSimulation,
  validateInputFile,
  validateScenarioFile,
} from '../src/core/engine.ts';
import {
  addLeaderboardEntry,
  isValidPlayerName,
  sortAndCapLeaderboard,
} from '../src/core/leaderboard.ts';
import { PRNG } from '../src/core/prng.ts';
import { runBenchmark } from '../src/headless/bench.ts';
import type { SoakOutput } from '../src/headless/soak.ts';

describe('Core PRNG & Determinism Guardrails (Contract v1.2)', () => {
  it('produces identical sequence for identical seeds', () => {
    const a = new PRNG(202603664);
    const b = new PRNG(202603664);
    expect(Array.from({ length: 10 }, () => a.next())).toEqual(
      Array.from({ length: 10 }, () => b.next())
    );
  });

  it('produces byte-identical JSONL output across two runs with same seed, scenario, and inputs', () => {
    const sc = validateScenarioFile(
      JSON.parse(readFileSync(resolve(process.cwd(), 'scenarios/smoke.json'), 'utf-8'))
    );
    const inp = validateInputFile(
      JSON.parse(readFileSync(resolve(process.cwd(), 'scenarios/smoke-inputs.json'), 'utf-8'))
    );

    const run1 = runContractSimulation({
      seed: 42,
      night: 1,
      ticks: 150,
      snapshotEvery: 10,
      scenario: sc,
      inputs: inp,
      contractVersion: '1.2',
    });

    const run2 = runContractSimulation({
      seed: 42,
      night: 1,
      ticks: 150,
      snapshotEvery: 10,
      scenario: sc,
      inputs: inp,
      contractVersion: '1.2',
    });

    expect(run1.lines.join('\n')).toBe(run2.lines.join('\n'));
  });
});

describe('Phase 1 & 2 Regression — Updated for TICKET-03 Breaking Rule Changes', () => {
  /**
   * [UPDATED IN PHASE 3 DUE TO TICKET-03 CHANGE REQUEST]:
   * - Old rule (Phase 1 & 2): Lighting all 5 lanterns immediately ended the game (`state: 'won'`, `reason: 'all_lit'`)
   *   with `+10` per mote, `+100` per lantern, `+2` per second left, `+50` per flame left (old score = 946).
   * - New rule (Ticket-03 Section 3, 4, 5):
   *   1. Lighting all lanterns NO LONGER ends the Night early (`state` remains `'playing'` until dawn).
   *   2. `lantern_lit` event includes `relight: false` on first light and increases `player.capacity` from 10 to 12 (`10 + 2 * successful_lights`).
   *   3. New score formula: `+5` per mote deposited (10 * 5 = 50) + `+100` first-time lantern light = `150`.
   */
  it('picks up motes, deposits into L1 on interact, lights L1 (with relight: false & capacity +2), and continues playing under Ticket-03 rules', () => {
    const sc = validateScenarioFile(
      JSON.parse(readFileSync(resolve(process.cwd(), 'scenarios/smoke.json'), 'utf-8'))
    );
    const inp = validateInputFile(
      JSON.parse(readFileSync(resolve(process.cwd(), 'scenarios/smoke-inputs.json'), 'utf-8'))
    );

    const { lines, finalWorld } = runContractSimulation({
      seed: 100,
      night: 1,
      ticks: 150,
      snapshotEvery: 10,
      scenario: sc,
      inputs: inp,
      contractVersion: '1.2',
    });

    const parsed = lines.map((l) => JSON.parse(l));
    expect(parsed[0].type).toBe('snapshot');
    expect(parsed[0].tick).toBe(0);

    const events = parsed.filter((x) => x.type === 'event');
    expect(events.some((e) => e.name === 'mote_picked' && e.data.carried === 9)).toBe(true);
    expect(events.some((e) => e.name === 'mote_picked' && e.data.carried === 10)).toBe(true);
    expect(
      events.some(
        (e) => e.name === 'deposit' && e.data.lantern_id === 'L1' && e.data.amount === 10
      )
    ).toBe(true);
    expect(
      events.some(
        (e) =>
          e.name === 'lantern_lit' &&
          e.data.lantern_id === 'L1' &&
          e.data.relight === false
      )
    ).toBe(true);

    // Under Ticket-03 Section 3, lighting all 5 lanterns does NOT trigger early victory
    expect(events.some((e) => e.name === 'game_over')).toBe(false);
    expect(finalWorld.state).toBe('playing');
    expect(finalWorld.player.capacity).toBe(12); // 10 + 2 * 1 successful light
    expect(finalWorld.score).toBe(150); // 10 motes * 5 + 100 first light
  });

  it('stuns and pushes Ink Shadows when Mây triggers Pulse (Tỏa Sáng)', () => {
    const sc = validateScenarioFile(
      JSON.parse(readFileSync(resolve(process.cwd(), 'scenarios/pulse-shade.json'), 'utf-8'))
    );
    const inp = validateInputFile(
      JSON.parse(readFileSync(resolve(process.cwd(), 'scenarios/pulse-inputs.json'), 'utf-8'))
    );

    const { lines, finalWorld } = runContractSimulation({
      seed: 7,
      night: 1,
      ticks: 30,
      snapshotEvery: 10,
      scenario: sc,
      inputs: inp,
      contractVersion: '1.2',
    });

    const parsed = lines.map((l) => JSON.parse(l));
    const pulseEv = parsed.find((x) => x.type === 'event' && x.name === 'pulse');
    expect(pulseEv).toBeDefined();
    expect(pulseEv.tick).toBe(6);
    expect(pulseEv.data.stunned_ids).toEqual(['S1']);
    expect(finalWorld.player.carried).toBe(2);
    expect(finalWorld.shades[0].state).toBe('stunned');
    expect(finalWorld.shades[0].pos[0]).toBeGreaterThan(6.5);
    expect(finalWorld.score).toBe(5);
  });

  it('handles Ink Shadow hit: reduces 1 flame, drops floor(carried/2) motes, grants 90 ticks invuln', () => {
    const { finalWorld, lines } = runContractSimulation({
      seed: 99,
      night: 1,
      ticks: 5,
      snapshotEvery: 5,
      scenario: {
        player: { pos: [0, 0, 0], carried: 7, flames: 3 },
        random_motes: false,
        random_shades: false,
        motes: [],
        shades: [{ id: 'S1', pos: [0.5, 0, 0] }],
        lanterns: [{ id: 'L1', pos: [0, 0, 25], deposited: 0 }],
      },
      contractVersion: '1.2',
    });

    const parsed = lines.map((l) => JSON.parse(l));
    const hitEv = parsed.find((x) => x.type === 'event' && x.name === 'player_hit');
    expect(hitEv).toBeDefined();
    expect(hitEv.data).toEqual({ by: 'shade', flames: 2, dropped: 3 });
    expect(finalWorld.player.flames).toBe(2);
    expect(finalWorld.player.carried).toBe(4);
    expect(finalWorld.motes.length).toBe(3);
  });

  it('rejects non-increasing input frame ticks with validation error', () => {
    expect(() =>
      validateInputFile({
        frames: [
          { tick: 10, move: [0, 1] },
          { tick: 10, move: [0, 0] },
        ],
      })
    ).toThrow(/INVALID_INPUT_FORMAT/);
  });

  it('executes Dash, picks up Wind Charm (Bùa Gió), and refreshes dash cooldown immediately', () => {
    const sc = validateScenarioFile(
      JSON.parse(readFileSync(resolve(process.cwd(), 'scenarios/p2-dash-charm.json'), 'utf-8'))
    );
    const inp = validateInputFile(
      JSON.parse(readFileSync(resolve(process.cwd(), 'scenarios/p2-dash-charm-inputs.json'), 'utf-8'))
    );

    const { lines, finalWorld } = runContractSimulation({
      seed: 202,
      night: 2,
      ticks: 25,
      snapshotEvery: 10,
      scenario: sc,
      inputs: inp,
      contractVersion: '1.2',
    });

    const parsed = lines.map((l) => JSON.parse(l));
    const events = parsed.filter((x) => x.type === 'event');
    const dashEvents = events.filter((e) => e.name === 'dash');
    const charmEv = events.find((e) => e.name === 'charm_picked');

    expect(charmEv).toBeDefined();
    expect(charmEv.data).toEqual({ charm_id: 'C1', charm_ticks: 600 });
    expect(dashEvents.length).toBe(2);
    expect(finalWorld.player.charmTicks).toBe(580);
  });

  it('handles Drifter (Gió Lạc) stealing up to 3 motes and dropping them when hit by Pulse while fleeing', () => {
    const sc = validateScenarioFile(
      JSON.parse(readFileSync(resolve(process.cwd(), 'scenarios/p2-drifter.json'), 'utf-8'))
    );
    const inp = validateInputFile(
      JSON.parse(readFileSync(resolve(process.cwd(), 'scenarios/p2-drifter-inputs.json'), 'utf-8'))
    );

    const { lines, finalWorld } = runContractSimulation({
      seed: 303,
      night: 2,
      ticks: 15,
      snapshotEvery: 5,
      scenario: sc,
      inputs: inp,
      contractVersion: '1.2',
    });

    const parsed = lines.map((l) => JSON.parse(l));
    const stealEv = parsed.find((x) => x.type === 'event' && x.name === 'drifter_steal');
    const dropEv = parsed.find((x) => x.type === 'event' && x.name === 'drifter_drop');

    expect(stealEv).toBeDefined();
    expect(stealEv.data).toEqual({ drifter_id: 'D1', amount: 3, carried: 4 });
    expect(dropEv).toBeDefined();
    expect(dropEv.data).toEqual({ drifter_id: 'D1', amount: 3 });
    expect(finalWorld.motes.filter((m) => m.kind === 'dropped').length).toBe(3);
  });

  it('handles Pause / Resume: freezes sim_tick and timers while tick continues', () => {
    const sc = validateScenarioFile(
      JSON.parse(readFileSync(resolve(process.cwd(), 'scenarios/p2-pause.json'), 'utf-8'))
    );
    const inp = validateInputFile(
      JSON.parse(readFileSync(resolve(process.cwd(), 'scenarios/p2-pause-inputs.json'), 'utf-8'))
    );

    const { lines, finalWorld } = runContractSimulation({
      seed: 404,
      night: 1,
      ticks: 20,
      snapshotEvery: 10,
      scenario: sc,
      inputs: inp,
      contractVersion: '1.2',
    });

    const parsed = lines.map((l) => JSON.parse(l));
    expect(parsed.some((x) => x.type === 'event' && x.name === 'paused')).toBe(true);
    expect(parsed.some((x) => x.type === 'event' && x.name === 'resumed')).toBe(true);

    const snap10 = parsed.find((x) => x.type === 'snapshot' && x.tick === 10);
    expect(snap10.state).toBe('paused');
    expect(snap10.sim_tick).toBe(5);
    expect(finalWorld.tick).toBe(20);
    expect(finalWorld.simTick).toBe(10);
  });
});

describe('Phase 3 — TICKET-03 ("Đèn cạn dầu") & Test Contract v1.2 Features', () => {
  it('decays lantern fuel at 1.0/s, emits lantern_out when fuel hits 0, relights with 5 motes (relight: true, +40 score), and refuels lit lanterns', () => {
    const sc = validateScenarioFile(
      JSON.parse(readFileSync(resolve(process.cwd(), 'scenarios/p3-fuel-relight.json'), 'utf-8'))
    );
    const inp = validateInputFile(
      JSON.parse(
        readFileSync(resolve(process.cwd(), 'scenarios/p3-fuel-relight-inputs.json'), 'utf-8')
      )
    );

    const { lines, finalWorld } = runContractSimulation({
      seed: 701,
      night: 1,
      ticks: 110,
      snapshotEvery: 20,
      scenario: sc,
      inputs: inp,
      contractVersion: '1.2',
    });

    const parsed = lines.map((l) => JSON.parse(l));
    const events = parsed.filter((x) => x.type === 'event');

    // L1 starts with fuel 0.5 (30 ticks) -> runs out at tick 30
    const outEv = events.find((e) => e.name === 'lantern_out');
    expect(outEv).toBeDefined();
    expect(outEv.tick).toBe(30);
    expect(outEv.data).toEqual({ lantern_id: 'L1' });

    // At tick 35 (step -> tick 36), Mây interacts to relight L1 using only 5 motes (ever_lit = true)
    const depositEv = events.find((e) => e.name === 'deposit');
    expect(depositEv).toBeDefined();
    expect(depositEv.data).toEqual({ lantern_id: 'L1', amount: 5, deposited: 5 });

    const litEv = events.find((e) => e.name === 'lantern_lit');
    expect(litEv).toBeDefined();
    expect(litEv.data).toEqual({ lantern_id: 'L1', relight: true });

    // At tick 100 (step -> tick 101), L1 has decayed by 65/60 (~1.08 fuel) so fuel < 100 -> Mây interacts to refuel 1 mote
    const refuelEv = events.find((e) => e.name === 'refuel');
    expect(refuelEv).toBeDefined();
    expect(refuelEv.data.lantern_id).toBe('L1');
    expect(refuelEv.data.amount).toBe(1);
    expect(refuelEv.data.fuel).toBe(100);

    // Score: 5 motes * 5 (25) + 40 relight + 1 mote refuel * 5 (5) = 70
    expect(finalWorld.score).toBe(70);
    expect(finalWorld.player.capacity).toBe(12); // +2 after relight
    expect(finalWorld.lanterns[0].relitCount).toBe(1);
  });

  it('causes wandering Ink Shadows to target weak lanterns (fuel < 30), enter drain state at <= 2m, emit fuel_drain at 60 ticks, and award +15 score when stunned out of drain', () => {
    const sc = validateScenarioFile(
      JSON.parse(readFileSync(resolve(process.cwd(), 'scenarios/p3-shade-drain.json'), 'utf-8'))
    );
    const inp = validateInputFile(
      JSON.parse(
        readFileSync(resolve(process.cwd(), 'scenarios/p3-shade-drain-inputs.json'), 'utf-8')
      )
    );

    const { lines, finalWorld } = runContractSimulation({
      seed: 702,
      night: 1,
      ticks: 110,
      snapshotEvery: 20,
      scenario: sc,
      inputs: inp,
      contractVersion: '1.2',
    });

    const parsed = lines.map((l) => JSON.parse(l));
    const events = parsed.filter((x) => x.type === 'event');

    // S1 starts at (0,0,24), 1m from L1 (0,0,25) with fuel 25.0 (< 30), so it enters 'drain' on tick 1
    // and emits fuel_drain after 60 ticks of draining (at tick 61)
    const drainEv = events.find((e) => e.name === 'fuel_drain');
    expect(drainEv).toBeDefined();
    expect(drainEv.data.lantern_id).toBe('L1');
    expect(drainEv.data.shade_id).toBe('S1');

    // At tick 65 (step -> tick 66), Mây triggers Pulse within 5m of S1 while S1 is in 'drain' -> awards +15 points!
    const pulseEv = events.find((e) => e.name === 'pulse');
    expect(pulseEv).toBeDefined();
    expect(pulseEv.data.stunned_ids).toEqual(['S1']);
    expect(finalWorld.score).toBe(15);
    expect(finalWorld.shades[0].state).toBe('stunned');
  });

  it('evaluates Dawn Survival victory (dawn_survived) when >= ceil(0.6 * total) lanterns are lit at time_left_s == 0 with new dawn score bonus', () => {
    const sc = validateScenarioFile(
      JSON.parse(readFileSync(resolve(process.cwd(), 'scenarios/p3-dawn-win.json'), 'utf-8'))
    );
    const inp = validateInputFile(
      JSON.parse(
        readFileSync(resolve(process.cwd(), 'scenarios/p3-dawn-win-inputs.json'), 'utf-8')
      )
    );

    const { lines, finalWorld } = runContractSimulation({
      seed: 703,
      night: 1,
      ticks: 60,
      snapshotEvery: 30,
      scenario: sc,
      inputs: inp,
      contractVersion: '1.2',
    });

    const parsed = lines.map((l) => JSON.parse(l));
    const gameOverEv = parsed.find((x) => x.type === 'event' && x.name === 'game_over');
    expect(gameOverEv).toBeDefined();
    expect(gameOverEv.data).toEqual({ result: 'won', reason: 'dawn_survived' });
    expect(finalWorld.state).toBe('won');

    // 3 lit lanterns starting at 80, 60, 40 fuel -> after 1s (60 ticks) decay to 79, 59, 39
    // Dawn bonus: (50+79) + (50+59) + (50+39) + 3 flames * 50 = 129 + 109 + 89 + 150 = 477
    expect(finalWorld.score).toBe(477);
  });
});

describe('Phase 4 — TICKET-04 ("Bình minh: phát hành v1.0.0") & Contract v1.3 Features', () => {
  it('validates player names (3-12 chars), sorts leaderboard by score desc then achieved_at asc, and caps at Top 10', () => {
    expect(isValidPlayerName('May')).toBe(true);
    expect(isValidPlayerName('Khai_2A')).toBe(true);
    expect(isValidPlayerName('Ab')).toBe(false); // < 3 chars
    expect(isValidPlayerName('ThisNameIsWayTooLong123')).toBe(false); // > 12 chars
    expect(isValidPlayerName('Bad Name!')).toBe(false); // invalid symbols

    const entries = Array.from({ length: 12 }, (_, i) => ({
      name: `Player_${i + 1}`,
      score: i === 2 || i === 5 ? 3000 : (i + 1) * 200,
      nights_won: 2,
      achieved_at:
        i === 5
          ? '2026-04-20T10:00:00+07:00'
          : i === 2
            ? '2026-04-20T12:00:00+07:00'
            : `2026-04-20T14:${String(i).padStart(2, '0')}:00+07:00`,
      seed: 100 + i,
    }));

    const sorted = sortAndCapLeaderboard(entries);
    expect(sorted.length).toBe(10);
    // Player_6 and Player_3 both have score 3000, but Player_6 achieved it earlier (10:00 vs 12:00)
    expect(sorted[0].name).toBe('Player_6');
    expect(sorted[1].name).toBe('Player_3');

    const updated = addLeaderboardEntry(
      { entries: sorted },
      {
        name: 'May',
        score: 4820,
        nights_won: 3,
        achieved_at: '2026-04-20T14:32:10+07:00',
        seed: 1842901,
      }
    );
    expect(updated.entries.length).toBe(10);
    expect(updated.entries[0].name).toBe('May');
    expect(updated.entries[0].score).toBe(4820);

    // Deduplicate identical records when merging localStorage & disk leaderboard.json
    const deduped = sortAndCapLeaderboard([...updated.entries, ...updated.entries]);
    expect(deduped.filter((e) => e.name === 'May' && e.score === 4820).length).toBe(1);
  });

  it('runs headless soak test across consecutive Nights in clean process with 0 crashes and stable memory (mem_end_mb <= 1.2 * mem_start_mb)', () => {
    const tmpSoakOut = resolve(tmpdir(), `soak-test-${process.pid}.json`);
    execFileSync(
      process.execPath,
      [
        resolve(process.cwd(), 'node_modules/tsx/dist/cli.mjs'),
        resolve(process.cwd(), 'src/headless/soak.ts'),
        '--seed',
        '7',
        '--nights',
        '5',
        '--out',
        tmpSoakOut,
      ],
      { stdio: 'pipe' }
    );
    const soakRes = JSON.parse(readFileSync(tmpSoakOut, 'utf-8')) as SoakOutput;
    expect(soakRes.nights).toBe(5);
    expect(soakRes.crashes).toBe(0);
    expect(soakRes.results.length).toBe(5);
    expect(soakRes.mem_end_mb).toBeLessThanOrEqual(Math.ceil(soakRes.mem_start_mb * 1.2));
  });

  it('runs benchmark scene (200 Ink Shadows, 100 Fireflies, L1-L3 lit) and satisfies Contract v1.3 thresholds', () => {
    const benchRes = runBenchmark({
      seed: 42,
      duration: 0.4,
      warmupSec: 0.1,
      out: 'bench.json',
    });
    expect(benchRes.contract_version).toBe('1.3');
    expect(benchRes.avg_fps).toBeGreaterThanOrEqual(60);
    expect(benchRes.p1_low_fps).toBeGreaterThanOrEqual(30);
    expect(benchRes.load_ms).toBeLessThanOrEqual(10000);
    expect(benchRes.vsync_off).toBe(true);
    expect(benchRes.frames).toBeGreaterThan(10);
  });
});

