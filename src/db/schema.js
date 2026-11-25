import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const matchStatus = pgEnum("match_status", [
  "scheduled",
  "live",
  "finished",
]);

export const matches = pgTable(
  "matches",
  {
    id: serial("id").primaryKey(),
    // External ID from the football API (e.g. api-football fixture id)
    externalId: text("external_id"),
    sport: text("sport").notNull(),
    homeTeam: text("home_team").notNull(),
    awayTeam: text("away_team").notNull(),
    status: matchStatus("status").notNull(),
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time"),
    homeScore: integer("home_score").default(0).notNull(),
    awayScore: integer("away_score").default(0).notNull(),
    // Extra info from the API (league, venue, referee, …)
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique("matches_external_id_unique").on(t.externalId)]
);

export const commentary = pgTable("commentary", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id")
    .notNull()
    .references(() => matches.id),
  minute: integer("minute"),
  sequence: integer("sequence").notNull(),
  period: text("period"),
  eventType: text("event_type").notNull(),
  actor: text("actor"),
  team: text("team"),
  message: text("message").notNull(),
  metadata: jsonb("metadata"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
