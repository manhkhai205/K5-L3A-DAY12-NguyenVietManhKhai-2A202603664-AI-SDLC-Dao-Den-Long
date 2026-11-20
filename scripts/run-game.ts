import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  addLeaderboardEntry,
  type LeaderboardData,
  type LeaderboardEntry,
  sortAndCapLeaderboard,
} from '../src/core/leaderboard.ts';

const LEADERBOARD_FILE = resolve(process.cwd(), 'leaderboard.json');

export function loadDiskLeaderboard(filePath = LEADERBOARD_FILE): LeaderboardData {
  try {
    if (!existsSync(filePath)) {
      return { entries: [] };
    }
    const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
    const entries = Array.isArray(raw?.entries) ? sortAndCapLeaderboard(raw.entries) : [];
    return { entries };
  } catch {
    return { entries: [] };
  }
}

export function saveDiskLeaderboard(data: LeaderboardData, filePath = LEADERBOARD_FILE): LeaderboardData {
  const sorted: LeaderboardData = {
    entries: sortAndCapLeaderboard(data.entries ?? []),
  };
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(filePath, JSON.stringify(sorted, null, 2) + '\n', 'utf-8');
  return sorted;
}

async function main() {
  const argv = process.argv.slice(2);
  let exportOutPath: string | null = null;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--export-leaderboard' && argv[i + 1]) {
      exportOutPath = argv[i + 1];
      break;
    }
  }

  if (exportOutPath) {
    const data = loadDiskLeaderboard();
    const absOut = resolve(process.cwd(), exportOutPath);
    const dir = dirname(absOut);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(absOut, JSON.stringify({ entries: data.entries }, null, 2) + '\n', 'utf-8');
    process.exit(0);
  }

  // Otherwise start Vite dev server with /api/leaderboard middleware
  const { createServer } = await import('vite');
  const server = await createServer({
    server: {
      port: 5173,
    },
    plugins: [
      {
        name: 'dao-den-long-leaderboard-api',
        configureServer(viteServer) {
          viteServer.middlewares.use('/api/leaderboard', (req, res) => {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            if (req.method === 'GET') {
              const current = loadDiskLeaderboard();
              res.statusCode = 200;
              res.end(JSON.stringify(current));
              return;
            }
            if (req.method === 'POST') {
              let body = '';
              req.on('data', (chunk) => {
                body += chunk.toString();
              });
              req.on('end', () => {
                try {
                  const payload = JSON.parse(body) as LeaderboardEntry;
                  const current = loadDiskLeaderboard();
                  const updated = addLeaderboardEntry(current, payload);
                  saveDiskLeaderboard(updated);
                  res.statusCode = 200;
                  res.end(JSON.stringify(updated));
                } catch (err) {
                  res.statusCode = 400;
                  res.end(
                    JSON.stringify({
                      error: err instanceof Error ? err.message : 'Invalid payload',
                    })
                  );
                }
              });
              return;
            }
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method not allowed' }));
          });
        },
      },
    ],
  });

  await server.listen();
  server.printUrls();
}

main().catch((err) => {
  console.error('[RunGame] Error:', err);
  process.exit(1);
});
