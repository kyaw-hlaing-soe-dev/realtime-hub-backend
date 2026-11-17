import { z } from "zod";

const positiveInteger = z.coerce.number().int().positive();
const nonNegativeInteger = z.coerce.number().int().nonnegative();
const isoDateString = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "Must be a valid ISO date string",
});

export const listMatchesQuerySchema = z.object({
  limit: positiveInteger.max(100).optional(),
});

export const MATCH_STATUS = Object.freeze({
  SCHEDULED: "scheduled",
  LIVE: "live",
  FINISHED: "finished",
});

export const matchIdParamSchema = z.object({
  id: positiveInteger,
});

export const createMatchSchema = z
  .object({
    sport: z.string().min(1),
    homeTeam: z.string().min(1),
    awayTeam: z.string().min(1),
    startTime: isoDateString,
    endTime: isoDateString,
    homeScore: nonNegativeInteger.optional(),
    awayScore: nonNegativeInteger.optional(),
  })
  .superRefine((match, context) => {
    if (new Date(match.endTime) <= new Date(match.startTime)) {
      context.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "Must be after startTime",
      });
    }
  });

export const updateScoreSchema = z.object({
  homeScore: nonNegativeInteger,
  awayScore: nonNegativeInteger,
});
