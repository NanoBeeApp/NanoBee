// Bridge between the Artifacts URL search params (`?tab=&artifact=`) and the
// store, so the active browse tab and the open deck survive a refresh and can be
// bookmarked / shared / navigated with the browser back-forward buttons.
//
//  - `tab` lives only in the URL (page-local); `setTab` writes it and drops any
//    open `artifact` (switching tabs closes the detail).
//  - `artifact` ↔ store.selectedArtifactId both ways. Each direction tracks its
//    previous value with a ref so it can tell a *real* change from an initial
//    hydration and act only on real differences — this is what stops the two
//    effects from clobbering each other on mount and lets them converge:
//      · URL → store: adopt a present `artifact`; clear the store only when the
//        param was present and is now gone (browser back / tab switch). An
//        initially-empty URL is left alone so a store-set selection (e.g. a chat
//        artifact-ref opening `openArtifacts(id)`) is not wiped.
//      · store → URL: write a non-null selection; clear the param only on a real
//        close (selection went non-null → null), never on the initial null.

import { useEffect, useRef } from "react";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useAppStore } from "../../store/useAppStore";

const routeApi = getRouteApi("/_app/artifacts");

/** Default tab: a new user lands on "你创建的". */
export const DEFAULT_ARTIFACTS_TAB = "mine";

export function useArtifactsUrlSync(): { tab: string; setTab: (tab: string) => void } {
  const navigate = useNavigate();
  const search = routeApi.useSearch();
  const tab = search.tab ?? DEFAULT_ARTIFACTS_TAB;
  const selectedId = useAppStore((s) => s.selectedArtifactId);
  const selectArtifact = useAppStore((s) => s.selectArtifact);

  // URL → store
  const prevUrlArtifact = useRef(search.artifact);
  useEffect(() => {
    const wasPresent = prevUrlArtifact.current;
    prevUrlArtifact.current = search.artifact;
    const urlId = search.artifact ?? null;
    if (urlId) {
      if (urlId !== selectedId) selectArtifact(urlId);
    } else if (wasPresent && selectedId) {
      // The param was dropped (browser back / tab switch) → close the detail.
      selectArtifact(null);
    }
    // Initial empty URL → leave the store for store→URL to reflect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.artifact]);

  // store → URL
  const prevSelected = useRef(selectedId);
  useEffect(() => {
    const had = prevSelected.current;
    prevSelected.current = selectedId;
    if (selectedId) {
      if (selectedId !== search.artifact) {
        void navigate({ to: "/artifacts", search: { tab: search.tab, artifact: selectedId } });
      }
    } else if (had) {
      // A real close (was non-null → null): drop the param, keep the tab. (An
      // initial null with a deep link is left for URL→store to adopt.)
      if (search.artifact) {
        void navigate({ to: "/artifacts", search: { tab: search.tab } });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Switch tabs: write the new tab and drop `artifact` (close any detail). The
  // URL→store effect then clears the store selection. Omitting `tab` for the
  // default keeps the URL clean (`/artifacts` rather than `?tab=mine`).
  const setTab = (next: string) => {
    void navigate({
      to: "/artifacts",
      search: next === DEFAULT_ARTIFACTS_TAB ? {} : { tab: next },
    });
  };

  return { tab, setTab };
}
