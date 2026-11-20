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
      contractVersion: '1.0',
    });

    const run2 = runContractSimulation({
      seed: 42,
      night: 1,
      ticks: 150,
      snapshotEvery: 10,
      scenario: sc,
      inputs: inp,
      contractVersion: '1.0',
    });

    expect(run1.lines.join('\n')).toBe(run2.lines.join('\n'));
  });
});

describe('Phase 1 — PRD-0 & Test Contract v1.0 Mechanics', () => {
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
      contractVersion: '1.0',
    });

    const parsed = lines.map((l) => JSON.parse(l));
    // First line must be tick 0 snapshot
    expect(parsed[0].type).toBe('snapshot');
    expect(parsed[0].tick).toBe(0);

    // Events emitted: 2 mote_picked, 1 deposit (10 motes), 1 lantern_lit, 1 game_over (won, all_lit)
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

    // Last line must be end
    const endLine = parsed[parsed.length - 1];
    expect(endLine.type).toBe('end');
    expect(endLine.state).toBe('won');
    expect(finalWorld.state).toBe('won');
    // Score: 10 motes * 10 (100) + 1 lantern * 100 (100) + floor(298.316s) * 2 (596) + 3 flames * 50 (150) = 946
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
      contractVersion: '1.0',
    });

    const parsed = lines.map((l) => JSON.parse(l));
    const pulseEv = parsed.find((x) => x.type === 'event' && x.name === 'pulse');
    expect(pulseEv).toBeDefined();
    expect(pulseEv.tick).toBe(6); // Input at tick 5 -> event at tick 6
    expect(pulseEv.data.stunned_ids).toEqual(['S1']);
    expect(finalWorld.player.carried).toBe(2); // 5 - 3 pulse_cost
    expect(finalWorld.shades[0].state).toBe('stunned');
    expect(finalWorld.shades[0].pos[0]).toBeGreaterThan(6.5); // Pushed back 4m
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
      contractVersion: '1.0',
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
