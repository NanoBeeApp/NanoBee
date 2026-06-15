/**
 * /api/notifications/settings — per-user notification preferences.
 *
 * GET  /settings — returns the user's notification settings (lazy-creates
 *                  a row with sensible defaults on first call).
 * PUT  /settings — validates and upserts the user's notification settings.
 *
 * Both endpoints require a signed-in session and return 401 when signed out.
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../api-worker";
import { getSessionToken } from "../auth/cookies";
import { getUserBySessionToken } from "../auth/store";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

export type ImportanceThreshold = "low" | "normal" | "high";

export interface UserNotificationSettings {
  emailEnabled: boolean;
  pushEnabled: boolean;
  /** Minutes from midnight UTC. null when DND is disabled. */
  dndStart: number | null;
  /** Minutes from midnight UTC. null when DND is disabled. */
  dndEnd: number | null;
  digestEnabled: boolean;
  /** HH:MM UTC */
  digestTime: string;
  importanceThreshold: ImportanceThreshold;
}

/** Sensible defaults applied when no row exists yet. */
const DEFAULT_SETTINGS: UserNotificationSettings = {
  emailEnabled: true,
  pushEnabled: true,
  dndStart: null,
  dndEnd: null,
  digestEnabled: false,
  digestTime: "08:00",
  importanceThreshold: "normal",
};

// ---------------------------------------------------------------------------
// D1 row shape
// ---------------------------------------------------------------------------

interface SettingsRow {
  email_enabled: number;
  push_enabled: number;
  dnd_start: number | null;
  dnd_end: number | null;
  digest_enabled: number;
  digest_time: string;
  importance_threshold: string;
}

function rowToSettings(row: SettingsRow): UserNotificationSettings {
  return {
    emailEnabled: row.email_enabled === 1,
    pushEnabled: row.push_enabled === 1,
    dndStart: row.dnd_start,
    dndEnd: row.dnd_end,
    digestEnabled: row.digest_enabled === 1,
    digestTime: row.digest_time,
    importanceThreshold: (row.importance_threshold as ImportanceThreshold) ?? "normal",
  };
}

// ---------------------------------------------------------------------------
// Zod schema for PUT
// ---------------------------------------------------------------------------

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const putSchema = z.object({
  emailEnabled: z.boolean(),
  pushEnabled: z.boolean(),
  dndStart: z.number().int().min(0).max(1439).nullable(),
  dndEnd: z.number().int().min(0).max(1439).nullable(),
  digestEnabled: z.boolean(),
  digestTime: z.string().regex(TIME_RE, "Must be HH:MM"),
  importanceThreshold: z.enum(["low", "normal", "high"]),
});

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export const notificationSettingsRoutes = new Hono<{ Bindings: Env }>()

  // GET /api/notifications/settings
  .get("/settings", async (c) => {
    const token = getSessionToken(c);
    const user = token ? await getUserBySessionToken(c.env.DB, token) : null;
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const row = await c.env.DB.prepare(
      `SELECT email_enabled, push_enabled, dnd_start, dnd_end,
              digest_enabled, digest_time, importance_threshold
       FROM user_notification_settings
       WHERE user_id = ?`,
    )
      .bind(user.id)
      .first<SettingsRow>();

    if (!row) {
      // Lazy-create with defaults so subsequent PUTs become UPDATE-only.
      await c.env.DB.prepare(
        `INSERT INTO user_notification_settings
           (user_id, email_enabled, push_enabled, dnd_start, dnd_end,
            digest_enabled, digest_time, importance_threshold)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          user.id,
          DEFAULT_SETTINGS.emailEnabled ? 1 : 0,
          DEFAULT_SETTINGS.pushEnabled ? 1 : 0,
          DEFAULT_SETTINGS.dndStart,
          DEFAULT_SETTINGS.dndEnd,
          DEFAULT_SETTINGS.digestEnabled ? 1 : 0,
          DEFAULT_SETTINGS.digestTime,
          DEFAULT_SETTINGS.importanceThreshold,
        )
        .run();

      console.log("[API] GET /api/notifications/settings: lazy-created defaults for user", user.id);
      return c.json({ settings: DEFAULT_SETTINGS });
    }

    return c.json({ settings: rowToSettings(row) });
  })

  // PUT /api/notifications/settings
  .put("/settings", zValidator("json", putSchema), async (c) => {
    const token = getSessionToken(c);
    const user = token ? await getUserBySessionToken(c.env.DB, token) : null;
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const body = c.req.valid("json");

    // DND requires both start and end, or neither.
    if ((body.dndStart === null) !== (body.dndEnd === null)) {
      return c.json({ error: "dndStart and dndEnd must both be set or both be null" }, 400);
    }

    await c.env.DB.prepare(
      `INSERT INTO user_notification_settings
         (user_id, email_enabled, push_enabled, dnd_start, dnd_end,
          digest_enabled, digest_time, importance_threshold)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         email_enabled        = excluded.email_enabled,
         push_enabled         = excluded.push_enabled,
         dnd_start            = excluded.dnd_start,
         dnd_end              = excluded.dnd_end,
         digest_enabled       = excluded.digest_enabled,
         digest_time          = excluded.digest_time,
         importance_threshold = excluded.importance_threshold,
         updated_at           = unixepoch()`,
    )
      .bind(
        user.id,
        body.emailEnabled ? 1 : 0,
        body.pushEnabled ? 1 : 0,
        body.dndStart,
        body.dndEnd,
        body.digestEnabled ? 1 : 0,
        body.digestTime,
        body.importanceThreshold,
      )
      .run();

    console.log(
      "[API] PUT /api/notifications/settings: saved for user",
      user.id,
      "push:", body.pushEnabled,
      "dnd:", body.dndStart, "-", body.dndEnd,
      "digest:", body.digestEnabled,
    );

    return c.json({ settings: body as UserNotificationSettings });
  });
