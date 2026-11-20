import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { round1 } from '../core/config.ts';
import {
  createDefaultInputState,
  createWorld,
  type PersistentInputState,
  stepWorld,
} from '../core/engine.ts';
import { PRNG } from '../core/prng.ts';
import type { SimWorld } from '../core/types.ts';

export interface SoakOutput {
  nights: number;
  crashes: number;
  results: Array<'won' | 'lost'>;
  mem_start_mb: number;
  mem_end_mb: number;
  duration_s: number;
}

interface SoakArgs {
  seed: number;
  nights: number;
  out: string;
}

function parseSoakArgs(argv: string[]): SoakArgs {
  let seed = 7;
  let nights = 10;
  let out = 'soak.json';

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--seed' && next !== undefined) {
      seed = Number.parseInt(next, 10);
      i++;
    } else if (arg === '--nights' && next !== undefined) {
      nights = Number.parseInt(next, 10);
      i++;
    } else if (arg === '--out' && next !== undefined) {
      out = next;
      i++;
    }
  }

  return {
    seed: Number.isNaN(seed) ? 7 : seed,
    nights: Number.isNaN(nights) || nights <= 0 ? 10 : nights,
    out,
  };
}

function resetWorldForReuse(world: SimWorld): void {
  world.motes.length = 0;
  world.shades.length = 0;
  world.drifters.length = 0;
  world.charms.length = 0;
  world.lanterns.length = 0;
  world.events.length = 0;
}

export function runSoakTest(args: SoakArgs): SoakOutput {
  const startNs = process.hrtime.bigint();
  const results: Array<'won' | 'lost'> = [];
  let crashes = 0;
  let memStartMb = 0;

  let currentWorld: SimWorld | null = null;

  for (let i = 0; i < args.nights; i++) {
    const nightId = (((i % 3) + 1) as unknown) as 1 | 2 | 3;
    const nightSeed = args.seed + i;
    const inputPrng = new PRNG(nightSeed ^ 0x9e3779b9);

    try {
      if (currentWorld) {
        resetWorldForReuse(currentWorld);
      }

      const created = createWorld({
        seed: nightSeed,
        night: nightId,
        contractVersion: '1.3',
      });
      currentWorld = created.world;
      const worldPrng = created.prng;
      const inputState: PersistentInputState = createDefaultInputState();

      if (i === 0) {
        memStartMb = Math.round(process.memoryUsage().rss / (1024 * 1024));
      }

      let moveDir: [number, number] = [0, 1];
      const maxTicks = currentWorld.timeLeftTicks + 10;

      for (let tick = 0; tick < maxTicks; tick++) {
        if (currentWorld.state !== 'playing') {
          break;
        }

        // Every 30 ticks choose a new random movement direction
        if (tick % 30 === 0) {
          const angle = inputPrng.nextRange(0, Math.PI * 2);
          moveDir = [Math.cos(angle), Math.sin(angle)];
        }

        // Roll action probabilities per tick: 5% jump, 3% dash, 2% pulse, 10% interact
        const wantJump = inputPrng.next() < 0.05;
        const wantDash = inputPrng.next() < 0.03;
        const wantPulse = inputPrng.next() < 0.02;
        const wantInteract = inputPrng.next() < 0.1;

        // Reset prevInput edge flags so each independent roll triggers a rising edge when true
        inputState.jump = false;
        inputState.dash = false;
        inputState.pulse = false;
        inputState.interact = false;

        stepWorld(currentWorld, worldPrng, inputState, {
          tick: currentWorld.tick,
          move: moveDir,
          jump: wantJump,
          dash: wantDash,
          pulse: wantPulse,
          interact: wantInteract,
          pause: false,
        });
      }

      const finalResult: 'won' | 'lost' = currentWorld.state === 'won' ? 'won' : 'lost';
      results.push(finalResult);
    } catch {
      crashes++;
      results.push('lost');
    }
  }

  // Final reset after the last Night per TICKET-04 Section 2
  if (currentWorld) {
    resetWorldForReuse(currentWorld);
    currentWorld = null;
  }

  const memEndMb = Math.round(process.memoryUsage().rss / (1024 * 1024));
  const durationS = round1(Number(process.hrtime.bigint() - startNs) / 1_000_000_000);

  return {
    nights: args.nights,
    crashes,
    results,
    mem_start_mb: memStartMb,
    mem_end_mb: memEndMb,
    duration_s: durationS,
  };
}

function main() {
  const args = parseSoakArgs(process.argv.slice(2));
  const output = runSoakTest(args);
  const outPath = resolve(process.cwd(), args.out);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n', 'utf-8');
  process.exit(output.crashes === 0 ? 0 : 1);
}

const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith('soak.ts') || process.argv[1].endsWith('soak.js'));

if (isDirectRun) {
  main();
}
