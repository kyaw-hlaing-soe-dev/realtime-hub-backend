import { Router } from "express";
import { desc, eq } from "drizzle-orm";

import { db } from "../db/db.js";
import { commentary } from "../db/schema.js";
import { matchIdParamSchema } from "../validation/matches.js";
import {
  createCommentarySchema,
  listCommentaryQuerySchema,
} from "../validation/commentary.js";

const router = Router({ mergeParams: true });
const MAX_LIMIT = 100;

router.get("/", async (req, res) => {
  const parsedParams = matchIdParamSchema.safeParse(req.params);
  const parsedQuery = listCommentaryQuerySchema.safeParse(req.query);

  if (!parsedParams.success) {
    return res.status(400).json({ error: parsedParams.error.issues });
  }

  if (!parsedQuery.success) {
    return res.status(400).json({ error: parsedQuery.error.issues });
  }

  const limit = Math.min(parsedQuery.data.limit ?? MAX_LIMIT, MAX_LIMIT);

  try {
    const entries = await db
      .select()
      .from(commentary)
      .where(eq(commentary.matchId, parsedParams.data.id))
      .orderBy(desc(commentary.createdAt))
      .limit(limit);

    return res.json(entries);
  } catch (error) {
    console.error("[commentary] load failed", error);
    return res.status(500).json({ error: "Failed to load commentary" });
  }
});

router.post("/", async (req, res) => {
  const parsedParams = matchIdParamSchema.safeParse(req.params);
  const parsedBody = createCommentarySchema.safeParse(req.body);

  if (!parsedParams.success) {
    return res.status(400).json({ error: parsedParams.error.issues });
  }

  if (!parsedBody.success) {
    return res.status(400).json({ error: parsedBody.error.issues });
  }

  try {
    const [entry] = await db
      .insert(commentary)
      .values({
        matchId: parsedParams.data.id,
        minute: parsedBody.data.minute,
        sequence: parsedBody.data.sequence,
        period: parsedBody.data.period,
        eventType: parsedBody.data.eventType,
        actor: parsedBody.data.actor,
        team: parsedBody.data.team,
        message: parsedBody.data.message,
        metadata: parsedBody.data.metadata,
        tags: parsedBody.data.tags,
      })
      .returning();

    req.app.locals.broadcastCommentary(parsedParams.data.id, entry);

    return res.status(201).json(entry);
  } catch (error) {
    console.error("[commentary] create failed", error);
    return res.status(500).json({ error: "Failed to create commentary" });
  }
});

export default router;
