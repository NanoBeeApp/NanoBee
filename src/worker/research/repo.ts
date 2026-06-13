// D1 persistence for research projects. Each project is stored as one JSON
// snapshot blob (nodes + layout) keyed by id and scoped to an owner bucket
// (the signed-in user id, or "anon" for signed-out visitors). This mirrors
// Curve's snapshot save/load API with a simpler one-row-per-project storage.

import type { D1Database } from "@cloudflare/workers-types";
import type {
  ResearchProjectMeta,
  ResearchSnapshot,
} from "../../research/types";

/** Owner bucket for signed-out visitors (NanoBee app data is global today). */
export const ANON_OWNER = "anon";

interface ProjectRow {
  id: string;
  title: string;
  topic: string;
  snapshot_json: string;
  node_count: number;
  updated_at: number;
}

/** List a user's research projects, newest first (metadata only). */
export async function listResearchProjects(
  db: D1Database,
  owner: string,
): Promise<ResearchProjectMeta[]> {
  const { results } = await db
    .prepare(
      "SELECT id, title, topic, node_count, updated_at FROM research_projects WHERE owner = ? ORDER BY updated_at DESC",
    )
    .bind(owner)
    .all<Omit<ProjectRow, "snapshot_json">>();
  return (results ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    topic: r.topic,
    nodeCount: r.node_count,
    updatedAt: new Date(r.updated_at * 1000).toISOString(),
  }));
}

/** Load one project's full snapshot, or null if it does not exist / is not owned. */
export async function loadResearchSnapshot(
  db: D1Database,
  owner: string,
  projectId: string,
): Promise<ResearchSnapshot | null> {
  const row = await db
    .prepare(
      "SELECT id, title, topic, snapshot_json, node_count, updated_at FROM research_projects WHERE id = ? AND owner = ?",
    )
    .bind(projectId, owner)
    .first<ProjectRow>();
  if (!row) return null;
  try {
    return JSON.parse(row.snapshot_json) as ResearchSnapshot;
  } catch (error) {
    console.error("[research] corrupt snapshot json for", projectId, String(error));
    return null;
  }
}

/** Upsert a project snapshot (full overwrite). */
export async function saveResearchSnapshot(
  db: D1Database,
  owner: string,
  snapshot: ResearchSnapshot,
): Promise<void> {
  const nodeCount = Object.keys(snapshot.nodes).length;
  await db
    .prepare(
      `INSERT INTO research_projects (id, owner, title, topic, snapshot_json, node_count, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, unixepoch())
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         topic = excluded.topic,
         snapshot_json = excluded.snapshot_json,
         node_count = excluded.node_count,
         updated_at = unixepoch()`,
    )
    .bind(
      snapshot.projectId,
      owner,
      snapshot.title,
      snapshot.topic,
      JSON.stringify(snapshot),
      nodeCount,
    )
    .run();
}

/** Delete one project. */
export async function deleteResearchProject(
  db: D1Database,
  owner: string,
  projectId: string,
): Promise<void> {
  await db
    .prepare("DELETE FROM research_projects WHERE id = ? AND owner = ?")
    .bind(projectId, owner)
    .run();
}
