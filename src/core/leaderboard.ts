/**
 * Pure TypeScript Leaderboard sorting, validation, and formatting (TICKET-04 Section 3 / Contract v1.3).
 * No DOM, Node FS, or non-deterministic globals inside src/core/.
 */

export interface LeaderboardEntry {
  name: string;
  score: number;
  nights_won: number;
  achieved_at: string;
  seed: number;
}

export interface LeaderboardData {
  entries: LeaderboardEntry[];
}

export const LEADERBOARD_MAX_ENTRIES = 10;

/**
 * Validates player name per TICKET-04 Section 3:
 * 3-12 characters, [A-Za-z0-9_] or Vietnamese Unicode letters.
 */
export function isValidPlayerName(name: string): boolean {
  if (typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (trimmed.length < 3 || trimmed.length > 12) return false;
  return /^[A-Za-z0-9_À-ỹ]+$/u.test(trimmed);
}

/**
 * Sorts leaderboard entries by score descending; ties broken by achieved_at ascending (earlier first).
 * Slices to top 10 entries.
 */
export function sortAndCapLeaderboard(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  const valid = entries.filter(
    (e) =>
      e &&
      typeof e.name === 'string' &&
      isValidPlayerName(e.name) &&
      typeof e.score === 'number' &&
      Number.isFinite(e.score) &&
      typeof e.nights_won === 'number' &&
      e.nights_won >= 0 &&
      e.nights_won <= 3 &&
      typeof e.achieved_at === 'string' &&
      typeof e.seed === 'number'
  );

  const seen = new Set<string>();
  const deduped: LeaderboardEntry[] = [];
  for (const e of valid) {
    const key = `${e.name.trim()}|${e.score}|${e.nights_won}|${e.achieved_at}|${e.seed}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push({ ...e, name: e.name.trim() });
    }
  }

  return deduped
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      const ta = Date.parse(a.achieved_at);
      const tb = Date.parse(b.achieved_at);
      if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) {
        return ta - tb;
      }
      return a.achieved_at.localeCompare(b.achieved_at);
    })
    .slice(0, LEADERBOARD_MAX_ENTRIES);
}

/**
 * Inserts a new entry into existing leaderboard data, returning sorted Top 10 LeaderboardData.
 */
export function addLeaderboardEntry(
  current: LeaderboardData,
  entry: LeaderboardEntry
): LeaderboardData {
  const trimmedName = entry.name.trim();
  if (!isValidPlayerName(trimmedName)) {
    throw new Error(
      'INVALID_LEADERBOARD_NAME: Tên người chơi phải từ 3–12 ký tự (chữ cái, số, dấu gạch dưới _)'
    );
  }
  const normalizedEntry: LeaderboardEntry = {
    name: trimmedName,
    score: Math.max(0, Math.round(entry.score)),
    nights_won: Math.max(0, Math.min(3, Math.round(entry.nights_won))),
    achieved_at: entry.achieved_at,
    seed: Math.trunc(entry.seed),
  };

  return {
    entries: sortAndCapLeaderboard([...(current.entries ?? []), normalizedEntry]),
  };
}
