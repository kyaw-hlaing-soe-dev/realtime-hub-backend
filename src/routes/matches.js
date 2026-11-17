import { Router } from "express";
import { desc, eq } from "drizzle-orm";

import { db } from "../db/db.js";
import { matches } from "../db/schema.js";
import { getMatchStatus, syncMatchStatus } from "../utils/matche-status.js";
import {
  createMatchSchema,
  listMatchesQuerySchema,
} from "../validation/matches.js";

const router = Router();

const sendValidationError = (res, error) => {
  return res.status(400).json({ error: error.flatten() });
};

const sendServerError = (res, operation, error) => {
  console.error(`[matches] ${operation} failed`, error);
  return res.status(500).json({ error: `Failed to ${operation} matches` });
};

const refreshMatchStatus = async (match) => {
  await syncMatchStatus(match, async (status) => {
    await db.update(matches).set({ status }).where(eq(matches.id, match.id));
  });

  return match;
};

router.get("/", async (req, res) => {
  const parsedQuery = listMatchesQuerySchema.safeParse(req.query);

  if (!parsedQuery.success) {
    return sendValidationError(res, parsedQuery.error);
  }

  const limit = parsedQuery.data.limit ?? 20;

  try {
    const matchesList = await db
      .select()
      .from(matches)
      .orderBy(desc(matches.createdAt))
      .limit(limit);

    return res.json(await Promise.all(matchesList.map(refreshMatchStatus)));
  } catch (error) {
    return sendServerError(res, "load", error);
  }
});

router.post("/", async (req, res) => {
  const parsedBody = createMatchSchema.safeParse(req.body);

  if (!parsedBody.success) {
    return sendValidationError(res, parsedBody.error);
  }

  const startTime = new Date(parsedBody.data.startTime);
  const endTime = new Date(parsedBody.data.endTime);
  const status = getMatchStatus(startTime, endTime);

  if (!status) {
    return res.status(400).json({ error: "Invalid match dates" });
  }

  try {
    const [match] = await db
      .insert(matches)
      .values({
        sport: parsedBody.data.sport,
        homeTeam: parsedBody.data.homeTeam,
        awayTeam: parsedBody.data.awayTeam,
        startTime,
        endTime,
        homeScore: parsedBody.data.homeScore ?? 0,
        awayScore: parsedBody.data.awayScore ?? 0,
        status,
      })
      .returning();

    req.app.locals.broadcastMatchCreate(match);

    return res.status(201).json(match);
  } catch (error) {
    return sendServerError(res, "create", error);
  }
});

export default router;
