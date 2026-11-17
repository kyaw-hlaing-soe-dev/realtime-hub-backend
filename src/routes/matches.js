import { Router } from "express";
import { desc, eq } from "drizzle-orm";

import { db } from "../db/db.js";
import { matches } from "../db/schema.js";
import {
  createMatchSchema,
  listMatchesQuerySchema,
  matchIdParamSchema,
  updateScoreSchema,
} from "../validation/matches.js";

const router = Router();

const sendValidationError = (res, error) => {
  res.status(400).json({ error: error.flatten() });
};

router.get("/", async (req, res) => {
  const parsedQuery = listMatchesQuerySchema.safeParse(req.query);

  if (!parsedQuery.success) {
    return sendValidationError(res, parsedQuery.error);
  }

  const limit = parsedQuery.data.limit ?? 20;
  const result = await db.select().from(matches).orderBy(desc(matches.startTime)).limit(limit);

  return res.json(result);
});

router.get("/:id", async (req, res) => {
  const parsedParams = matchIdParamSchema.safeParse(req.params);

  if (!parsedParams.success) {
    return sendValidationError(res, parsedParams.error);
  }

  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, parsedParams.data.id))
    .limit(1);

  if (!match) {
    return res.status(404).json({ error: "Match not found" });
  }

  return res.json(match);
});

router.post("/", async (req, res) => {
  const parsedBody = createMatchSchema.safeParse(req.body);

  if (!parsedBody.success) {
    return sendValidationError(res, parsedBody.error);
  }

  const [match] = await db
    .insert(matches)
    .values({
      ...parsedBody.data,
      startTime: new Date(parsedBody.data.startTime),
      endTime: new Date(parsedBody.data.endTime),
      status: "scheduled",
    })
    .returning();

  return res.status(201).json(match);
});

router.patch("/:id/score", async (req, res) => {
  const parsedParams = matchIdParamSchema.safeParse(req.params);

  if (!parsedParams.success) {
    return sendValidationError(res, parsedParams.error);
  }

  const parsedBody = updateScoreSchema.safeParse(req.body);

  if (!parsedBody.success) {
    return sendValidationError(res, parsedBody.error);
  }

  const [match] = await db
    .update(matches)
    .set(parsedBody.data)
    .where(eq(matches.id, parsedParams.data.id))
    .returning();

  if (!match) {
    return res.status(404).json({ error: "Match not found" });
  }

  return res.json(match);
});

export default router;
