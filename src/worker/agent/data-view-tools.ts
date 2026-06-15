// The `create_data_view` agent tool — the chat entry point of the redefined
// Artifacts feature. When a chat message asks to *follow / collect / filter* a
// public data source into a browsable page ("帮我做一个只看 AI 相关的 Hacker
// News" / "把这几个来源的新闻聚到一起"), the model calls this tool. It parses
// the request into a FeedQuery, persists a data view in the 'pending' state,
// pushes its reference onto the chat context (→ inline chat card), and kicks off
// the fetch pipeline in the background (waitUntil) so the chat reply returns
// immediately. The frontend then polls the view until it is ready.
//
// The source list is data-driven from the live data-hub catalog, so new hub
// sources become available here with no code change. The tool is only offered
// when the request carries artifact context (owner + sink), so anon flows work.

import type { AgentContext, AgentTool } from "./tools";
import { listDataSources } from "../datahub/client";
import { createDataViewArtifact } from "../artifacts/repo";
import { parseFeedQuery } from "../data-views/feed-query-schema";
import { runDataViewPipeline } from "../data-views/pipeline";
import { classifyTopic } from "../data-views/topic-class";

/**
 * Build the data-view tool set. Returns `create_data_view` when the request
 * carries artifact context, else []. Async so it can read the hub catalog to
 * constrain the `source` enum to ids that actually exist.
 */
export async function dataViewTools(
  env: import("../api-worker").Env,
  ctx: AgentContext,
): Promise<AgentTool[]> {
  const artifactCtx = ctx.artifacts;
  if (!artifactCtx) return [];

  const sources = await listDataSources(env).catch(() => []);
  const sourceIds = sources.map((s) => s.id);
  // A compact catalog line helps the model pick the right source + params.
  const catalogHint = sources.length
    ? sources.map((s) => `- ${s.id}: ${s.description}`).join("\n")
    : "(data-hub unavailable; no sources)";

  const tool: AgentTool = {
    name: "create_data_view",
    description:
      "Create a saved, browsable DATA VIEW page from a public data source filtered by a topic. " +
      "Use this whenever the user wants to FOLLOW / COLLECT / FILTER an ongoing stream of items into a page they can revisit — " +
      "e.g. '帮我做一个只看 AI 相关的 Hacker News' / 'a feed of developer news' / '把美联储相关的新闻集中到一起'. " +
      "Do NOT use it for a one-off question that a normal chat answer covers. " +
      "Pick `source` from the available data sources below; put the user's focus in `filter.topic`. " +
      "After calling it, briefly tell the user the data view was created and is loading; do NOT list the items in your text.\n\n" +
      `Available data sources (use the id as \`source\`):\n${catalogHint}`,
    parameters: {
      type: "object",
      properties: {
        source: {
          type: "string",
          ...(sourceIds.length ? { enum: sourceIds } : {}),
          description: "The data-hub source id to pull from, e.g. 'hackernews', 'news', 'websearch'.",
        },
        filter: {
          type: "object",
          properties: {
            topic: {
              type: "string",
              description: "What the view is about, in the user's words, e.g. 'AI / 大模型' or '美联储与利率'.",
            },
            keywords: {
              type: "array",
              items: { type: "string" },
              description: "Optional coarse keywords to help narrow results.",
            },
          },
          required: ["topic"],
        },
        defaultView: {
          type: "string",
          enum: ["list", "card", "table", "timeline"],
          description: "Preferred initial layout. Default 'card'.",
        },
        title: {
          type: "string",
          description: "Short display title, e.g. 'Hacker News · AI 相关帖子' (≤60 chars, no <>\"「」).",
        },
      },
      required: ["source", "filter", "title"],
    },
    // No LLM call inside this tool (P1 pipeline is fetch-only), so the default
    // timeout is fine — it writes the row + schedules the fetch and returns.
    execute: async (args, env2) => {
      const query = parseFeedQuery(args, sourceIds);
      const topicId = classifyTopic(query.filter.topic);

      const artifact = await createDataViewArtifact(
        env2.DB,
        artifactCtx.owner,
        query,
        topicId,
        artifactCtx.chatId,
      );

      // Surface the reference to the request handler (→ inline chat card).
      artifactCtx.created.push({
        id: artifact.id,
        kind: "data_view",
        title: artifact.title,
        itemCount: 0,
        pipelineStatus: "pending",
      });

      // Fetch in the background so the chat reply is immediate; fall back to an
      // inline await when no executionCtx is available (e.g. some test envs).
      const run = runDataViewPipeline(env2, artifact.id, artifactCtx.owner, query).catch(
        (e) => console.error("[create_data_view] pipeline kickoff failed:", String(e)),
      );
      if (ctx.executionCtx?.waitUntil) ctx.executionCtx.waitUntil(run);
      else await run;

      return (
        `Created data view "${artifact.title}" (source: ${query.source}, id: ${artifact.id}). ` +
        `It is now on the user's Data Views page and is fetching the latest content.`
      );
    },
  };

  return [tool];
}
