/**
 * Tournament engine — pure functions for battle-royale scoring, leaderboard
 * ranking and bracket generation. Framework-agnostic so the exact same logic
 * runs in Next.js server actions, API routes and the Expo app.
 */
import type { LeaderboardEntry, MatchResult, ScoringRule } from "./types";
import type { TournamentFormat } from "./constants";

export interface PlacementPointRow {
  placement: number;
  points: number;
}

export interface ScoringConfig {
  placementPoints: PlacementPointRow[];
  killPoints: number;
  bonusRules?: Record<string, number> | null;
  tieBreakers?: TieBreaker[];
}

export type TieBreaker = "total_points" | "kills" | "best_placement" | "wins";

export const DEFAULT_SCORING: ScoringConfig = {
  placementPoints: [
    { placement: 1, points: 12 },
    { placement: 2, points: 9 },
    { placement: 3, points: 7 },
    { placement: 4, points: 5 },
    { placement: 5, points: 4 },
    { placement: 6, points: 3 },
    { placement: 7, points: 2 },
    { placement: 8, points: 1 },
  ],
  killPoints: 1,
  bonusRules: null,
  tieBreakers: ["total_points", "kills", "best_placement"],
};

export function scoringConfigFromRule(rule: Pick<ScoringRule, "placement_points" | "kill_points" | "bonus_rules" | "tie_breakers"> | null | undefined): ScoringConfig {
  if (!rule) return DEFAULT_SCORING;
  const placement = Array.isArray(rule.placement_points) ? rule.placement_points : [];
  return {
    placementPoints: placement.length ? placement : DEFAULT_SCORING.placementPoints,
    killPoints: Number(rule.kill_points ?? DEFAULT_SCORING.killPoints),
    bonusRules: rule.bonus_rules ?? null,
    tieBreakers: (rule.tie_breakers?.length ? rule.tie_breakers : DEFAULT_SCORING.tieBreakers) as TieBreaker[],
  };
}

/** Points awarded purely for a finishing position (0 when outside the table). */
export function placementPointsFor(placement: number | null | undefined, config: ScoringConfig): number {
  if (placement == null || placement < 1) return 0;
  const rows = [...config.placementPoints].sort((a, b) => a.placement - b.placement);
  for (const row of rows) {
    if (placement === row.placement) return row.points;
  }
  // "8+" style open-ended lowest tier
  const last = rows[rows.length - 1];
  return placement > (last?.placement ?? 0) ? 0 : 0;
}

/** Bonus points from a named rule table, e.g. { "chicken_dinner": 5 }. */
export function bonusPointsFor(keys: string[], config: ScoringConfig): number {
  if (!config.bonusRules) return 0;
  return keys.reduce((sum, key) => sum + Number(config.bonusRules?.[key] ?? 0), 0);
}

export interface RawResultInput {
  placement?: number | null;
  kills?: number;
  bonusPoints?: number;
}

/** Canonical point calculation used for every submitted result row. */
export function calculateScore(result: RawResultInput, config: ScoringConfig = DEFAULT_SCORING) {
  const kills = Math.max(0, Math.trunc(Number(result.kills ?? 0)));
  const placement = result.placement && result.placement > 0 ? Math.trunc(result.placement) : null;
  const placementPoints = placementPointsFor(placement, config);
  const killPoints = kills * config.killPoints;
  const bonusPoints = Math.trunc(Number(result.bonusPoints ?? 0));
  return {
    placement,
    kills,
    placementPoints,
    killPoints,
    bonusPoints,
    totalPoints: placementPoints + killPoints + bonusPoints,
  };
}

export interface RankableRow {
  key: string;
  totalPoints: number;
  totalKills: number;
  matchesPlayed?: number;
  wins?: number;
  bestPlacement?: number | null;
}

function compareRows(a: RankableRow, b: RankableRow, tieBreakers: TieBreaker[]): number {
  for (const breaker of tieBreakers) {
    switch (breaker) {
      case "total_points":
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        break;
      case "kills":
        if (b.totalKills !== a.totalKills) return b.totalKills - a.totalKills;
        break;
      case "wins":
        if ((b.wins ?? 0) !== (a.wins ?? 0)) return (b.wins ?? 0) - (a.wins ?? 0);
        break;
      case "best_placement": {
        const av = a.bestPlacement ?? Number.MAX_SAFE_INTEGER;
        const bv = b.bestPlacement ?? Number.MAX_SAFE_INTEGER;
        if (av !== bv) return av - bv;
        break;
      }
    }
  }
  if ((b.wins ?? 0) !== (a.wins ?? 0)) return (b.wins ?? 0) - (a.wins ?? 0);
  if ((b.totalKills ?? 0) !== (a.totalKills ?? 0)) return b.totalKills - a.totalKills;
  return a.key.localeCompare(b.key);
}

/** Rank rows with deterministic tie-breaking. Returns rows + their 1-based rank. */
export function rankRows<T extends RankableRow>(
  rows: T[],
  tieBreakers: TieBreaker[] = DEFAULT_SCORING.tieBreakers ?? [],
): (T & { rank: number })[] {
  const sorted = [...rows].sort((a, b) => compareRows(a, b, tieBreakers));
  return sorted.map((row, index) => ({ ...row, rank: index + 1 }));
}

export interface AggregatedEntry {
  key: string;
  teamId: string | null;
  userId: string | null;
  matchesPlayed: number;
  totalKills: number;
  totalPoints: number;
  wins: number;
  bestPlacement: number | null;
}

/**
 * Aggregate verified match results into leaderboard rows.
 * `participantKey` maps a result row to its participant (team or player).
 */
export function aggregateLeaderboard<
  T extends {
    participantKey: string;
    teamId?: string | null;
    userId?: string | null;
    placement: number | null;
    kills: number;
    totalPoints: number;
  },
>(results: T[], tieBreakers: TieBreaker[] = ["total_points", "kills", "best_placement"]): AggregatedEntry[] {
  const map = new Map<string, AggregatedEntry>();
  for (const row of results) {
    const entry = map.get(row.participantKey) ?? {
      key: row.participantKey,
      teamId: row.teamId ?? null,
      userId: row.userId ?? null,
      matchesPlayed: 0,
      totalKills: 0,
      totalPoints: 0,
      wins: 0,
      bestPlacement: null,
    };
    entry.matchesPlayed += 1;
    entry.totalKills += Math.max(0, Math.trunc(row.kills ?? 0));
    entry.totalPoints += Math.trunc(row.totalPoints ?? 0);
    if (row.placement === 1) entry.wins += 1;
    if (row.placement != null) {
      entry.bestPlacement =
        entry.bestPlacement == null ? row.placement : Math.min(entry.bestPlacement, row.placement);
    }
    map.set(row.participantKey, entry);
  }
  const rows: RankableRow[] = [...map.values()].map((entry) => ({
    key: entry.key,
    totalPoints: entry.totalPoints,
    totalKills: entry.totalKills,
    wins: entry.wins,
    bestPlacement: entry.bestPlacement,
    matchesPlayed: entry.matchesPlayed,
  }));
  const ranked = rankRows(rows, tieBreakers);
  const byKey = map;
  return ranked.map((row) => {
    const base = byKey.get(row.key) as AggregatedEntry;
    return { ...base, ...row, key: row.key, rank: row.rank } as AggregatedEntry & { rank: number };
  });
}

export function leaderboardRowFromEntry(entry: AggregatedEntry & { rank: number }): Omit<LeaderboardEntry, "id" | "tournament_id" | "updated_at"> {
  return {
    team_id: entry.teamId,
    user_id: entry.userId,
    matches_played: entry.matchesPlayed,
    total_kills: entry.totalKills,
    total_points: entry.totalPoints,
    wins: entry.wins,
    best_placement: entry.bestPlacement,
    rank: entry.rank,
  };
}

/* ------------------------------------------------------------------ */
/* Bracket generation                                                  */
/* ------------------------------------------------------------------ */

export interface BracketSlot {
  seed: number;
  participantKey: string | null;
}

export interface BracketMatchSpec {
  round: number;
  matchNumber: number;
  bracketPosition: number;
  homeKey: string | null;
  awayKey: string | null;
  /** index into the generated flat array for the match the winner advances to */
  nextIndex: number | null;
}

export function nextPowerOfTwo(n: number): number {
  if (n <= 1) return 1;
  return 2 ** Math.ceil(Math.log2(n));
}

/** Standard seeded bracket order (1 v 16, 8 v 9, ...). */
export function seedOrder(size: number): number[] {
  let rounds: number[] = [1];
  while (rounds.length < size) {
    const next: number[] = [];
    const total = rounds.length * 2 + 1;
    for (const seed of rounds) {
      next.push(seed, total - seed);
    }
    rounds = next;
  }
  return rounds;
}

/**
 * Generate a single-elimination bracket for the given participant keys.
 * Returns a flat array ordered by round then match number, with `nextIndex`
 * links so winners can be advanced automatically.
 */
export function generateSingleEliminationBracket(participantKeys: string[]): BracketMatchSpec[] {
  const cleaned = participantKeys.filter((k) => Boolean(k));
  if (cleaned.length < 2) return [];
  const size = nextPowerOfTwo(cleaned.length);
  const order = seedOrder(size);
  const firstRound: BracketMatchSpec[] = [];
  const rounds = Math.log2(size);
  for (let i = 0; i < size / 2; i += 1) {
    const homeSeed = order[i * 2] ?? null;
    const awaySeed = order[i * 2 + 1] ?? null;
    const homeKey = homeSeed && homeSeed <= cleaned.length ? cleaned[homeSeed - 1] ?? null : null;
    const awayKey = awaySeed && awaySeed <= cleaned.length ? cleaned[awaySeed - 1] ?? null : null;
    firstRound.push({
      round: 1,
      matchNumber: i + 1,
      bracketPosition: i,
      homeKey,
      awayKey,
      nextIndex: null,
    });
  }
  const all: BracketMatchSpec[] = [...firstRound];
  let previousRoundStart = 0;
  let previousRoundCount = firstRound.length;
  for (let round = 2; round <= rounds; round += 1) {
    const count = previousRoundCount / 2;
    const roundStart = all.length;
    for (let i = 0; i < count; i += 1) {
      all.push({
        round,
        matchNumber: i + 1,
        bracketPosition: i,
        homeKey: null,
        awayKey: null,
        nextIndex: null,
      });
    }
    // link previous round matches to their successor
    for (let i = 0; i < previousRoundCount; i += 1) {
      const prev = all[previousRoundStart + i];
      if (prev) prev.nextIndex = roundStart + Math.floor(i / 2);
    }
    previousRoundStart = roundStart;
    previousRoundCount = count;
  }
  const finalIndex = all.length - 1;
  if (all[finalIndex]) all[finalIndex]!.nextIndex = null;
  return all;
}

/** Round-robin pairings (circle method) — every participant plays every other. */
export function generateRoundRobin(participantKeys: string[]): BracketMatchSpec[] {
  const keys: (string | null)[] = [...participantKeys];
  if (keys.length % 2 !== 0) keys.push(null);
  const n = keys.length;
  if (n < 2) return [];
  const matches: BracketMatchSpec[] = [];
  let matchNumber = 1;
  for (let round = 0; round < n - 1; round += 1) {
    for (let i = 0; i < n / 2; i += 1) {
      const home = keys[i] ?? null;
      const away = keys[n - 1 - i] ?? null;
      if (home && away) {
        matches.push({
          round: round + 1,
          matchNumber: matchNumber++,
          bracketPosition: i,
          homeKey: home,
          awayKey: away,
          nextIndex: null,
        });
      }
    }
    const fixed = keys[0];
    const rest = keys.slice(1);
    const last = rest.pop() ?? null;
    keys.splice(0, keys.length, fixed as string | null, last, ...rest);
  }
  return matches;
}

/** Battle-royale lobbies: split participants into groups of `lobbySize`. */
export function generateBattleRoyaleLobbies(participantKeys: string[], lobbySize = 12): BracketMatchSpec[] {
  const matches: BracketMatchSpec[] = [];
  let matchNumber = 1;
  for (let i = 0; i < participantKeys.length; i += lobbySize) {
    const chunk = participantKeys.slice(i, i + lobbySize);
    matches.push({
      round: 1,
      matchNumber,
      bracketPosition: matchNumber - 1,
      homeKey: chunk.join(","),
      awayKey: null,
      nextIndex: null,
    });
    matchNumber += 1;
  }
  return matches;
}

export function generateBracketForFormat(
  format: TournamentFormat,
  participantKeys: string[],
  lobbySize = 12,
): BracketMatchSpec[] {
  switch (format) {
    case "round_robin":
    case "league":
      return generateRoundRobin(participantKeys);
    case "battle_royale":
      return generateBattleRoyaleLobbies(participantKeys, lobbySize);
    case "single_elimination":
    case "double_elimination":
    case "custom":
    default:
      return generateSingleEliminationBracket(participantKeys);
  }
}

/** Total prize amount for a given placement from a distribution table. */
export function prizeForPlacement(
  placement: number,
  distribution: { place: number; amount: number }[],
): number {
  return Number(distribution.find((row) => row.place === placement)?.amount ?? 0);
}

/** Slot occupancy helper used by the registration engine. */
export function slotsAvailable(maxSlots: number, takenSlots: number): number {
  return Math.max(0, Number(maxSlots ?? 0) - Number(takenSlots ?? 0));
}

export { type MatchResult };
