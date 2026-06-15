// Bridge between the Artifacts URL search params (`?tab=&artifact=&vm=`) and the
// store, so the active browse tab, the open deck and the gallery view mode all
// survive a refresh and can be bookmarked / shared / navigated with the browser
// back-forward buttons.
//
//  - `tab` and `vm` live only in the URL (page-local). `setTab` writes the tab
//    and drops any open `artifact` (switching tabs closes the detail) while
//    keeping the chosen view mode; `setViewMode` swaps the mode in place.
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
import type { ArtifactsViewMode } from "../../routes/_app/artifacts";
import { useAppStore } from "../../store/useAppStore";

const routeApi = getRouteApi("/_app/artifacts");

/** Default tab: a new user lands on "你创建的". */
export const DEFAULT_ARTIFACTS_TAB = "mine";
/** Default view mode: a quiet flat list rather than heavy cards. */
export const DEFAULT_ARTIFACTS_VM: ArtifactsViewMode = "list";

interface ArtifactsUrlState {
  tab: string;
  setTab: (tab: string) => void;
  viewMode: ArtifactsViewMode;
  setViewMode: (vm: ArtifactsViewMode) => void;
}

export function useArtifactsUrlSync(): ArtifactsUrlState {
  const navigate = useNavigate();
  const search = routeApi.useSearch();
  const tab = search.tab ?? DEFAULT_ARTIFACTS_TAB;
  const viewMode = search.vm ?? DEFAULT_ARTIFACTS_VM;
  const selectedId = useAppStore((s) => s.selectedArtifactId);
  const selectArtifact = useAppStore((s) => s.selectArtifact);

  /** Build a search object, omitting params at their default to keep URLs clean. */
  const mkSearch = (next: {
    tab?: string;
    artifact?: string;
    vm?: ArtifactsViewMode;
  }) => {
    const out: Record<string, string> = {};
    if (next.tab && next.tab !== DEFAULT_ARTIFACTS_TAB) out.tab = next.tab;
    if (next.artifact) out.artifact = next.artifact;
    if (next.vm && next.vm !== DEFAULT_ARTIFACTS_VM) out.vm = next.vm;
    return out;
  };

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

  // store → URL (preserve tab + vm)
  const prevSelected = useRef(selectedId);
  useEffect(() => {
    const had = prevSelected.current;
    prevSelected.current = selectedId;
    if (selectedId) {
      if (selectedId !== search.artifact) {
        void navigate({
          to: "/artifacts",
          search: mkSearch({ tab: search.tab, artifact: selectedId, vm: search.vm }),
        });
      }
    } else if (had) {
      // A real close (was non-null → null): drop the param, keep tab + vm.
      if (search.artifact) {
        void navigate({
          to: "/artifacts",
          search: mkSearch({ tab: search.tab, vm: search.vm }),
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Switch tabs: write the new tab, drop `artifact` (close any detail), keep vm.
  const setTab = (next: string) => {
    void navigate({ to: "/artifacts", search: mkSearch({ tab: next, vm: search.vm }) });
  };

  // Swap view mode in place, keeping the current tab + open deck.
  const setViewMode = (vm: ArtifactsViewMode) => {
    void navigate({
      to: "/artifacts",
      search: mkSearch({ tab: search.tab, artifact: search.artifact, vm }),
    });
  };

  return { tab, setTab, viewMode, setViewMode };
}
