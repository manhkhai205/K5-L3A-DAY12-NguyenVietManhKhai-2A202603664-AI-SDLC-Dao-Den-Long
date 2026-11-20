import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  runContractSimulation,
  validateInputFile,
  validateScenarioFile,
} from '../core/engine.ts';
import { InputFile, ScenarioFile } from '../core/types.ts';

interface CliArgs {
  seed: number;
  night: 1 | 2 | 3;
  scenarioPath?: string;
  inputsPath?: string;
  ticks: number;
  outPath?: string;
  snapshotEvery: number;
}

function parseCliArgs(argv: string[]): CliArgs {
  let seed = 202603664;
  let night: 1 | 2 | 3 = 1;
  let scenarioPath: string | undefined;
  let inputsPath: string | undefined;
  let ticks = 600;
  let outPath: string | undefined;
  let snapshotEvery = 10;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--seed' && argv[i + 1] !== undefined) {
      seed = Number(argv[++i]);
      if (!Number.isFinite(seed)) {
        throw new Error('CLI_ERROR: --seed must be an integer');
      }
    } else if (arg === '--night' && argv[i + 1] !== undefined) {
      const n = Number(argv[++i]);
      if (n !== 1 && n !== 2 && n !== 3) {
        throw new Error('CLI_ERROR: --night must be 1, 2, or 3');
      }
      night = n;
    } else if ((arg === '--scenario' || arg === '-s') && argv[i + 1] !== undefined) {
      scenarioPath = argv[++i];
    } else if ((arg === '--inputs' || arg === '-i') && argv[i + 1] !== undefined) {
      inputsPath = argv[++i];
    } else if (arg === '--ticks' && argv[i + 1] !== undefined) {
      ticks = Number(argv[++i]);
      if (!Number.isInteger(ticks) || ticks < 0) {
        throw new Error('CLI_ERROR: --ticks must be a non-negative integer');
      }
    } else if ((arg === '--out' || arg === '-o') && argv[i + 1] !== undefined) {
      outPath = argv[++i];
    } else if (arg === '--snapshot-every' && argv[i + 1] !== undefined) {
      snapshotEvery = Number(argv[++i]);
      if (!Number.isInteger(snapshotEvery) || snapshotEvery <= 0) {
        throw new Error('CLI_ERROR: --snapshot-every must be a positive integer');
      }
    }
  }

  return {
    seed,
    night,
    scenarioPath,
    inputsPath,
    ticks,
    outPath,
    snapshotEvery,
  };
}

function readContractVersion(): '1.0' | '1.1' | '1.2' {
  try {
    const raw = readFileSync(resolve(process.cwd(), 'game.contract.json'), 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.contract_version === '1.2') return '1.2';
    if (parsed.contract_version === '1.1') return '1.1';
  } catch {
    // Default to 1.2
  }
  return '1.2';
}

function main() {
  let args: CliArgs;
  try {
    args = parseCliArgs(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`${(err as Error).message}\n`);
    process.exit(1);
  }

  let scenario: ScenarioFile | undefined;
  let inputs: InputFile | undefined;

  if (args.scenarioPath) {
    try {
      const raw = readFileSync(resolve(process.cwd(), args.scenarioPath), 'utf-8');
      scenario = validateScenarioFile(JSON.parse(raw));
    } catch (err) {
      process.stderr.write(`Scenario format error: ${(err as Error).message}\n`);
      process.exit(2);
    }
  }

  if (args.inputsPath) {
    try {
      const raw = readFileSync(resolve(process.cwd(), args.inputsPath), 'utf-8');
      inputs = validateInputFile(JSON.parse(raw));
    } catch (err) {
      process.stderr.write(`Inputs format error: ${(err as Error).message}\n`);
      process.exit(2);
    }
  }

  try {
    const contractVersion = readContractVersion();
    const { lines } = runContractSimulation({
      seed: args.seed,
      night: args.night,
      ticks: args.ticks,
      snapshotEvery: args.snapshotEvery,
      scenario,
      inputs,
      contractVersion,
    });

    const jsonl = lines.join('\n') + '\n';
    if (args.outPath) {
      const fullOut = resolve(process.cwd(), args.outPath);
      mkdirSync(dirname(fullOut), { recursive: true });
      writeFileSync(fullOut, jsonl, 'utf-8');
    } else {
      process.stdout.write(jsonl);
    }
    process.exit(0);
  } catch (err) {
    process.stderr.write(`Simulation runtime error: ${(err as Error).message}\n`);
    process.exit(1);
  }
}

main();
