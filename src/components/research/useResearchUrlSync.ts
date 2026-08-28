// Two-way bridge between the research URL search params (`?project=&node=`) and
// the research store, so the open project + open reading overlay survive a page
// refresh and can be bookmarked / shared.
//
//  - URL → store: on deep-link / refresh / browser back-forward, load the
//    project and open the node the URL points at.
//  - store → URL: reflect user-driven store changes (load a project, open/close
//    an article, start/reset research) back into the URL.
//
// Both directions act only on a real difference, so they converge instead of
// looping. The store→URL side uses a ref to tell an *initial* null projectId
// (store not yet hydrated from a deep link — leave the URL alone) apart from a
// null caused by the user resetting to the welcome screen (clear the URL).

import { useEffect, useRef } from "react";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useResearchStore } from "../../store/useResearchStore";

const routeApi = getRouteApi("/_app/research");

export function useResearchUrlSync(): void {
  const navigate = useNavigate();
  const search = routeApi.useSearch();
  const projectId = useResearchStore((s) => s.projectId);
  const activeNodeId = useResearchStore((s) => s.activeNodeId);
  const loadProject = useResearchStore((s) => s.loadProject);
  const openNode = useResearchStore((s) => s.openNode);
  const closeReading = useResearchStore((s) => s.closeReading);

  // URL → store
  useEffect(() => {
    const { project, node } = search;
    if (project && project !== projectId) {
      // A different project in the URL → load it (and open the node, if any).
      void loadProject(project, node);
      return;
    }
    if (project && project === projectId) {
      if (node && node !== activeNodeId) void openNode(node);
      else if (!node && activeNodeId) closeReading();
    }
    // No project in the URL → leave the store; store→URL reflects/normalizes it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.project, search.node]);

  // store → URL
  const prevProjectId = useRef(projectId);
  useEffect(() => {
    const had = prevProjectId.current;
    prevProjectId.current = projectId;

    if (projectId) {
      const next = activeNodeId
        ? { project: projectId, node: activeNodeId }
        : { project: projectId };
      if (next.project !== search.project || next.node !== search.node) {
        void navigate({ to: "/research", search: next });
      }
    } else if (had) {
      // projectId went non-null → null: a real reset (newResearch). Clear the
      // URL. (An *initial* null with a deep link is left for URL→store to load.)
      if (search.project || search.node) {
        void navigate({ to: "/research", search: {}, replace: true });
      }
    }
    // Failed / in-flight deep links leave projectId null without `had`, so the
    // URL's ?project= stays — that is what the user asked to open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, activeNodeId]);
}
