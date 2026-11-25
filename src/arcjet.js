import "dotenv/config";
import arcjet, { detectBot, shield, slidingWindow } from "@arcjet/node";

const arcjetKey = process.env.ARCJET_KEY;
const isDev =
  process.env.ARCJET_ENV === "development" ||
  process.env.NODE_ENV === "development";
const arcjetMode =
  process.env.ARCJET_MODE === "LIVE" || process.env.ARCJET_MODE === "DRY_RUN"
    ? process.env.ARCJET_MODE
    : isDev
      ? "DRY_RUN"
      : "LIVE";

if (!arcjetKey) {
  throw new Error("ARCJET_KEY environment variable is missing.");
}

export const httpArcjet = arcjet({
  key: arcjetKey,
  rules: [
    shield({ mode: arcjetMode }),
    detectBot({
      mode: arcjetMode,
      allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW"],
    }),
    slidingWindow({ mode: arcjetMode, interval: "10s", max: 50 }),
  ],
});

export const wsArcjet = arcjet({
  key: arcjetKey,
  rules: [
    shield({ mode: arcjetMode }),
    detectBot({
      mode: arcjetMode,
      allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW"],
    }),
    slidingWindow({ mode: arcjetMode, interval: "2s", max: 5 }),
  ],
});

function getDenialResponse(reason) {
  if (reason.isRateLimit()) {
    return { status: 429, error: "Too many requests" };
  }

  if (reason.isBot()) {
    return { status: 403, error: "Automated requests are not allowed" };
  }

  return { status: 403, error: "Forbidden" };
}

export async function securityMiddleware(req, res, next) {
  try {
    const decision = await httpArcjet.protect(req);

    if (decision.isDenied()) {
      const { status, error } = getDenialResponse(decision.reason);

      return res.status(status).json({ error });
    }

    if (decision.isErrored()) {
      console.warn("Arcjet decision error (allowing request):", decision.reason.message);
      return next();
    }

    return next();
  } catch (error) {
    console.warn("Arcjet middleware error (allowing request):", error);
    return next();
  }
}