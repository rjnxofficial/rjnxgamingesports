import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SCORING,
  calculateScore,
  placementPointsFor,
  rankRows,
  aggregateLeaderboard,
  generateSingleEliminationBracket,
  generateRoundRobin,
  generateBattleRoyaleLobbies,
  generateBracketForFormat,
  nextPowerOfTwo,
  seedOrder,
  slotsAvailable,
  prizeForPlacement,
  scoringConfigFromRule,
} from "../src/scoring.ts";
import { slugify, isTeamSizeValid, safeNextPath, formatCurrency } from "../src/utils.ts";
import { tournamentSchema, signUpSchema, passwordSchema } from "../src/validation.ts";

test("nextPowerOfTwo / seedOrder produce seeded brackets", () => {
  assert.equal(nextPowerOfTwo(1), 1);
  assert.equal(nextPowerOfTwo(5), 8);
  assert.equal(nextPowerOfTwo(16), 16);
  assert.deepEqual(seedOrder(4), [1, 4, 2, 3]);
  assert.deepEqual(seedOrder(8), [1, 8, 4, 5, 2, 7, 3, 6]);
});

test("placement points honour the scoring table", () => {
  assert.equal(placementPointsFor(1, DEFAULT_SCORING), 12);
  assert.equal(placementPointsFor(8, DEFAULT_SCORING), 1);
  assert.equal(placementPointsFor(9, DEFAULT_SCORING), 0);
  assert.equal(placementPointsFor(null, DEFAULT_SCORING), 0);
});

test("calculateScore combines placement + kills + bonus", () => {
  const result = calculateScore({ placement: 1, kills: 5, bonusPoints: 2 }, DEFAULT_SCORING);
  assert.equal(result.placementPoints, 12);
  assert.equal(result.killPoints, 5);
  assert.equal(result.totalPoints, 19);
});

test("custom scoring rule overrides defaults", () => {
  const config = scoringConfigFromRule({
    placement_points: [{ placement: 1, points: 10 }],
    kill_points: 2,
    bonus_rules: { chicken_dinner: 5 },
    tie_breakers: ["total_points", "kills"],
  });
  assert.equal(calculateScore({ placement: 1, kills: 3, bonusPoints: 5 }, config).totalPoints, 21);
});

test("rankRows orders by points then kills then best placement", () => {
  const ranked = rankRows([
    { key: "a", totalPoints: 30, totalKills: 5, bestPlacement: 2 },
    { key: "b", totalPoints: 30, totalKills: 8, bestPlacement: 3 },
    { key: "c", totalPoints: 40, totalKills: 1, bestPlacement: 1 },
    { key: "d", totalPoints: 30, totalKills: 5, bestPlacement: 1 },
  ]);
  assert.deepEqual(
    ranked.map((r) => r.key),
    ["c", "b", "d", "a"],
  );
  assert.deepEqual(
    ranked.map((r) => r.rank),
    [1, 2, 3, 4],
  );
});

test("aggregateLeaderboard sums matches per participant", () => {
  const rows = aggregateLeaderboard([
    { participantKey: "t1", teamId: "t1", placement: 1, kills: 4, totalPoints: 16 },
    { participantKey: "t1", teamId: "t1", placement: 3, kills: 2, totalPoints: 9 },
    { participantKey: "t2", teamId: "t2", placement: 2, kills: 9, totalPoints: 18 },
  ]);
  assert.equal(rows[0]?.key, "t1");
  assert.equal(rows[0]?.totalPoints, 25);
  assert.equal(rows[0]?.wins, 1);
  assert.equal(rows[0]?.bestPlacement, 1);
  assert.equal(rows[1]?.key, "t2");
});

test("single elimination bracket generates linked rounds", () => {
  const bracket = generateSingleEliminationBracket(["a", "b", "c", "d"]);
  assert.equal(bracket.length, 3);
  assert.equal(bracket[0]?.nextIndex, 2);
  assert.equal(bracket[1]?.nextIndex, 2);
  assert.equal(bracket[2]?.round, 2);
  assert.equal(bracket[2]?.nextIndex, null);
});

test("byes are handled for non power-of-two participant counts", () => {
  const bracket = generateSingleEliminationBracket(["a", "b", "c"]);
  assert.equal(bracket[0]?.homeKey, "a");
  assert.equal(bracket[0]?.awayKey, null);
  assert.equal(bracket.filter((m) => m.round === 1).length, 2);
});

test("round robin generates every pairing", () => {
  const matches = generateRoundRobin(["a", "b", "c", "d"]);
  assert.equal(matches.length, 6);
});

test("battle royale splits into lobbies", () => {
  const keys = Array.from({ length: 30 }, (_, i) => `t${i}`);
  const lobbies = generateBattleRoyaleLobbies(keys, 12);
  assert.equal(lobbies.length, 3);
});

test("format dispatcher picks the right generator", () => {
  assert.equal(generateBracketForFormat("round_robin", ["a", "b"]).length, 1);
  assert.equal(generateBracketForFormat("battle_royale", ["a", "b"], 12).length, 1);
  assert.equal(generateBracketForFormat("single_elimination", ["a", "b", "c", "d"]).length, 3);
});

test("slots + prize helpers", () => {
  assert.equal(slotsAvailable(64, 64), 0);
  assert.equal(slotsAvailable(64, 12), 52);
  assert.equal(
    prizeForPlacement(1, [
      { place: 1, amount: 5000 },
      { place: 2, amount: 2000 },
    ]),
    5000,
  );
});

test("url + size helpers", () => {
  assert.equal(slugify("Free Fire Weekday Clash #2"), "free-fire-weekday-clash-2");
  assert.equal(isTeamSizeValid(4, "squad"), true);
  assert.equal(isTeamSizeValid(3, "squad"), false);
  assert.equal(isTeamSizeValid(2, "duo"), true);
  assert.equal(safeNextPath("//evil.com"), "/dashboard");
  assert.equal(safeNextPath("/admin/tournaments"), "/admin/tournaments");
  assert.equal(formatCurrency(1500), "₹1,500");
});

test("validation rejects bad tournament payloads", () => {
  const invalid = tournamentSchema.safeParse({
    name: "No",
    slug: "Bad Slug!",
    game_id: "nope",
    mode: "squad",
    format: "single_elimination",
    entry_fee: -5,
    prize_pool: 100,
    max_slots: 1,
    min_team_size: 4,
    max_team_size: 2,
    starts_at: "2030-01-10T10:00:00.000Z",
  });
  assert.equal(invalid.success, false);

  const valid = tournamentSchema.safeParse({
    name: "Free Fire Weekday Clash",
    slug: "free-fire-weekday-clash",
    game_id: "11111111-1111-4111-8111-111111111111",
    mode: "squad",
    format: "battle_royale",
    entry_fee: 20,
    prize_pool: 5000,
    max_slots: 64,
    min_team_size: 4,
    max_team_size: 4,
    registration_starts_at: "2030-01-01T10:00:00.000Z",
    registration_ends_at: "2030-01-08T10:00:00.000Z",
    starts_at: "2030-01-10T10:00:00.000Z",
    status: "registration_open",
  });
  assert.equal(valid.success, true, valid.success ? "" : JSON.stringify(valid.error.issues));
});

test("password + signup validation enforces strength", () => {
  assert.equal(passwordSchema.safeParse("short").success, false);
  assert.equal(passwordSchema.safeParse("savage123").success, true);
  assert.equal(
    signUpSchema.safeParse({
      email: "PLAYER@Example.com ",
      password: "savage123",
      username: "savage_one",
      fullName: "Savage One",
    }).success,
    true,
  );
  assert.equal(
    signUpSchema.safeParse({ email: "bad", password: "savage123", username: "x", fullName: "A" }).success,
    false,
  );
});
