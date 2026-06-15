// The data-view pipeline. P1 is the minimal closed loop:
//   fetching → (data-hub fetch) → upsert items → ready
// (the AI filter/extract/template stages arrive in P2/P3). It runs server-side
// inside the Worker — typically scheduled via executionCtx.waitUntil so the chat
// reply returns immediately ("秒回") while items load in the background. The
// frontend polls GET /api/artifacts/:id until pipelineStatus is "ready".
//
// Dual-deploy: all IO is `invokeDataSource` (the data-hub gateway over fetch)
// and D1 via the repo — both run unchanged on Cloudflare and self-hosted Node.

import type { Env } from "../api-worker";
import type { FeedQuery } from "../../artifacts/feed-query";
import { invokeDataSource } from "../datahub/client";
import {
  setPipelineStatus,
  upsertDataViewItems,
  type NormalizedItemInput,
} from "../artifacts/repo";
import { computeContentHash, externalId } from "./content-hash";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Best-effort: pull an item's own timestamp as unix seconds, when present. */
function itemUnixSeconds(raw: Record<string, unknown>): number | undefined {
  const v = raw.createdAt ?? raw.created_at ?? raw.publishedAt ?? raw.date;
  if (typeof v === "number") return v > 1e12 ? Math.floor(v / 1000) : Math.floor(v);
  if (typeof v === "string") {
    const t = Date.parse(v);
    if (!Number.isNaN(t)) return Math.floor(t / 1000);
  }
  return undefined;
}

/**
 * Map a FeedQuery onto the data-hub source's fetch params. The hub sources are
 * generic, so we pass through `sourceParams` and, when none set a `query`,
 * derive a concise search keyword. The model's `topic` is a descriptive phrase
 * (often Chinese) that full-text search engines like HN's Algolia return
 * nothing for, so we prefer the coarse English `keywords` it also provides, and
 * only fall back to the topic when there are none. We also default a generous
 * `limit` so a view has enough items (sources without a `limit` param ignore it).
 */
function fetchParams(query: FeedQuery): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {
    ...(query.filter.sourceParams ?? {}),
  };
  if (params.query === undefined) {
    const kw = query.filter.keywords?.filter((k) => k.trim());
    if (kw && kw.length) params.query = kw[0];
    else if (query.filter.topic) params.query = query.filter.topic;
  }
  if (params.limit === undefined) params.limit = 30;
  return params;
}

/** Run the P1 pipeline for one data view. Never throws — terminal failure is
 *  recorded as pipeline_status='error' so the UI can show a non-blocking notice. */
export async function runDataViewPipeline(
  env: Env,
  viewId: string,
  owner: string,
  query: FeedQuery,
): Promise<void> {
  try {
    await setPipelineStatus(env.DB, viewId, "fetching");

    const result = await invokeDataSource(env, query.source, fetchParams(query));
    if (!result) {
      await setPipelineStatus(env.DB, viewId, "error", {
        errorText: `数据源 "${query.source}" 拉取失败或暂不可用`,
      });
      return;
    }

    const rawItems = Array.isArray(result.items) ? result.items.filter(isRecord) : [];
    const normalized: NormalizedItemInput[] = await Promise.all(
      rawItems.map(async (raw) => ({
        raw,
        contentHash: await computeContentHash(query.source, raw),
        externalId: externalId(raw),
        itemCreatedAt: itemUnixSeconds(raw),
      })),
    );

    await upsertDataViewItems(env.DB, viewId, owner, query.source, normalized);
    await setPipelineStatus(env.DB, viewId, "ready", { markFetched: true });
  } catch (error) {
    console.error("[data-views] pipeline error for", viewId, String(error));
    await setPipelineStatus(env.DB, viewId, "error", {
      errorText: String(error).slice(0, 200),
    }).catch(() => {
      /* swallow: status write is best-effort on terminal failure */
    });
  }
}
