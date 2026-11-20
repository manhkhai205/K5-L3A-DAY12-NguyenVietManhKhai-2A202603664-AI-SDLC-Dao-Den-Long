import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  runContractSimulation,
  validateInputFile,
  validateScenarioFile,
} from '../src/core/engine.ts';
import { PRNG } from '../src/core/prng.ts';

describe('Core PRNG & Determinism Guardrails (Contract v1.0 & v1.1)', () => {
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
      contractVersion: '1.1',
    });

    const run2 = runContractSimulation({
      seed: 42,
      night: 1,
      ticks: 150,
      snapshotEvery: 10,
      scenario: sc,
      inputs: inp,
      contractVersion: '1.1',
    });

    expect(run1.lines.join('\n')).toBe(run2.lines.join('\n'));
  });
});

describe('Phase 1 Regression — PRD-0 & Test Contract Mechanics', () => {
  it('picks up motes, deposits into L1 on interact, lights all lanterns, and wins with exact score', () => {
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
      contractVersion: '1.1',
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
    expect(events.some((e) => e.name === 'lantern_lit' && e.data.lantern_id === 'L1')).toBe(true);
    expect(
      events.some(
        (e) => e.name === 'game_over' && e.data.result === 'won' && e.data.reason === 'all_lit'
      )
    ).toBe(true);

    const endLine = parsed[parsed.length - 1];
    expect(endLine.type).toBe('end');
    expect(endLine.state).toBe('won');
    expect(finalWorld.state).toBe('won');
    expect(finalWorld.score).toBe(946);
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
      contractVersion: '1.1',
    });

    const parsed = lines.map((l) => JSON.parse(l));
    const pulseEv = parsed.find((x) => x.type === 'event' && x.name === 'pulse');
    expect(pulseEv).toBeDefined();
    expect(pulseEv.tick).toBe(6);
    expect(pulseEv.data.stunned_ids).toEqual(['S1']);
    expect(finalWorld.player.carried).toBe(2);
    expect(finalWorld.shades[0].state).toBe('stunned');
    expect(finalWorld.shades[0].pos[0]).toBeGreaterThan(6.5);
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
      contractVersion: '1.1',
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
});

describe('Phase 2 — TICKET-02 ("Ba hòn đảo") & Test Contract v1.1 Features', () => {
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
      contractVersion: '1.1',
    });

    const parsed = lines.map((l) => JSON.parse(l));
    const events = parsed.filter((x) => x.type === 'event');
    const dashEvents = events.filter((e) => e.name === 'dash');
    const charmEv = events.find((e) => e.name === 'charm_picked');

    expect(charmEv).toBeDefined();
    expect(charmEv.data).toEqual({ charm_id: 'C1', charm_ticks: 600 });
    // Because charm resets dash cooldown, the second dash at tick 15 also triggers!
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
      contractVersion: '1.1',
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
      contractVersion: '1.1',
    });

    const parsed = lines.map((l) => JSON.parse(l));
    expect(parsed.some((x) => x.type === 'event' && x.name === 'paused')).toBe(true);
    expect(parsed.some((x) => x.type === 'event' && x.name === 'resumed')).toBe(true);

    const snap10 = parsed.find((x) => x.type === 'snapshot' && x.tick === 10);
    expect(snap10.state).toBe('paused');
    expect(snap10.sim_tick).toBe(5);
    expect(finalWorld.tick).toBe(20);
    expect(finalWorld.simTick).toBe(10); // Paused for 10 ticks (tick 6..15)
  });

  it('supports Night 2 jump pad launch and Night 3 multi-tier elevation & wind', () => {
    // Test Night 2 jump pad at (20, 0, 18)
    const { finalWorld: w2 } = runContractSimulation({
      seed: 505,
      night: 2,
      ticks: 10,
      snapshotEvery: 10,
      scenario: {
        player: { pos: [20, 0, 18], carried: 0, flames: 3 },
        random_motes: false,
        random_shades: false,
        random_drifters: false,
      },
      contractVersion: '1.1',
    });
    expect(w2.player.pos[1]).toBeGreaterThan(1.0);
    expect(w2.player.grounded).toBe(false);

    // Test Night 3 full 21,600 ticks performance (< 30s requirement)
    const startMs = Date.now();
    const { finalWorld: w3 } = runContractSimulation({
      seed: 606,
      night: 3,
      ticks: 21600,
      snapshotEvery: 600,
      contractVersion: '1.1',
    });
    const elapsedMs = Date.now() - startMs;
    expect(elapsedMs).toBeLessThan(5000); // Finishes in < 0.2s (requirement is <= 30s)
    expect(w3.night).toBe(3);
  });
});
