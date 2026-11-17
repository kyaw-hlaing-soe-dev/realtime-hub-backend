import test from "node:test";
import assert from "node:assert/strict";

import {
  createMatchSchema,
  listMatchesQuerySchema,
  matchIdParamSchema,
  updateScoreSchema,
} from "../../src/validation/matches.js";

test("coerces valid list query and match id values", () => {
  assert.equal(listMatchesQuerySchema.parse({ limit: "100" }).limit, 100);
  assert.equal(matchIdParamSchema.parse({ id: "42" }).id, 42);
});

test("rejects invalid limits and ids", () => {
  assert.equal(listMatchesQuerySchema.safeParse({ limit: "101" }).success, false);
  assert.equal(listMatchesQuerySchema.safeParse({ limit: "0" }).success, false);
  assert.equal(matchIdParamSchema.safeParse({ id: "0" }).success, false);
});

test("validates match dates and chronological order", () => {
  const validMatch = {
    sport: "football",
    homeTeam: "Home",
    awayTeam: "Away",
    startTime: "2026-11-17T10:00:00.000Z",
    endTime: "2026-11-17T11:00:00.000Z",
  };

  assert.equal(createMatchSchema.safeParse(validMatch).success, true);
  assert.equal(
    createMatchSchema.safeParse({
      ...validMatch,
      endTime: "2026-11-17T09:00:00.000Z",
    }).success,
    false,
  );
  assert.equal(
    createMatchSchema.safeParse({
      ...validMatch,
      startTime: "not-a-date",
    }).success,
    false,
  );
});

test("coerces non-negative scores and rejects negative scores", () => {
  const scores = updateScoreSchema.parse({ homeScore: "2", awayScore: "0" });

  assert.deepEqual(scores, { homeScore: 2, awayScore: 0 });
  assert.equal(updateScoreSchema.safeParse({ homeScore: "-1", awayScore: "0" }).success, false);
  assert.equal(
    createMatchSchema.safeParse({
      sport: "football",
      homeTeam: "Home",
      awayTeam: "Away",
      startTime: "2026-11-17T10:00:00.000Z",
      endTime: "2026-11-17T11:00:00.000Z",
      homeScore: "-1",
    }).success,
    false,
  );
});
