// Bridge between the Tasks page URL search params and the components. The Tasks
// surface state (home vs the "all tasks" manager, view mode, open drawer,
// filter, upload dialog, template picker) is page-local and only ever changed
// from within this page, so a single source of truth — the URL — is enough;
// no store round-trip or initial-hydration ref dance is needed (contrast
// useArtifactsUrlSync, which must reconcile a store selection set from outside
// the page).
//
// Change history:
//   2026-06-15  Added tplCategory / openTemplate / closeTemplate for the
//               task template picker URL state.
import { getRouteApi, useNavigate } from '@tanstack/react-router';
import type { TasksSearch, TasksSurface, TasksViewMode } from '../../routes/_app/tasks';

const routeApi = getRouteApi('/_app/tasks');

export const DEFAULT_TASKS_VM: TasksViewMode = 'list';
export const DEFAULT_TASKS_FILTER = 'all';
export const DEFAULT_TEMPLATE_CATEGORY = 'all';

export interface TasksUrl {
  surface: TasksSurface;
  vm: TasksViewMode;
  taskId: string | null;
  filter: string;
  uploadOpen: boolean;
  /** Active category in the template picker; null when the picker is closed. */
  tplCategory: string | null;
  openAll: () => void;
  openHome: () => void;
  setVm: (vm: TasksViewMode) => void;
  openTask: (id: string) => void;
  closeTask: () => void;
  setFilter: (f: string) => void;
  openUpload: () => void;
  closeUpload: () => void;
  /** Open the template picker, optionally at a specific category (defaults to 'all'). */
  openTemplate: (categoryId?: string) => void;
  /** Close the template picker. */
  closeTemplate: () => void;
  /** Switch the active category tab within the open picker. */
  setTplCategory: (categoryId: string) => void;
}

export function useTasksUrl(): TasksUrl {
  const navigate = useNavigate();
  const search = routeApi.useSearch();
  const surface: TasksSurface = search.view === 'all' ? 'all' : 'home';
  const vm = search.vm ?? DEFAULT_TASKS_VM;
  const filter = search.f ?? DEFAULT_TASKS_FILTER;

  // Build a clean search object, dropping params at their default to keep URLs short.
  const mk = (next: TasksSearch): TasksSearch => {
    const out: TasksSearch = {};
    if (next.view === 'all') out.view = 'all';
    if (next.vm && next.vm !== DEFAULT_TASKS_VM) out.vm = next.vm;
    if (next.task) out.task = next.task;
    if (next.f && next.f !== DEFAULT_TASKS_FILTER) out.f = next.f;
    if (next.upload === 'open') out.upload = 'open';
    if (next.tpl) out.tpl = next.tpl;
    return out;
  };
  const go = (next: TasksSearch) => void navigate({ to: '/tasks', search: mk(next) });

  return {
    surface,
    vm,
    taskId: search.task ?? null,
    filter,
    uploadOpen: search.upload === 'open',
    tplCategory: search.tpl ?? null,
    // Enter the manager, keeping any chosen view mode / filter.
    openAll: () => go({ view: 'all', vm: search.vm, f: search.f }),
    // Back to the clean home screen (drops everything page-local).
    openHome: () => go({}),
    setVm: (v) => go({ ...search, view: 'all', vm: v }),
    // The drawer can be opened from either surface, so preserve the rest of the URL.
    openTask: (id) => go({ ...search, task: id }),
    closeTask: () => go({ ...search, task: undefined }),
    setFilter: (f) => go({ ...search, view: 'all', f }),
    openUpload: () => go({ ...search, upload: 'open' }),
    closeUpload: () => go({ ...search, upload: undefined }),
    openTemplate: (categoryId = DEFAULT_TEMPLATE_CATEGORY) =>
      go({ ...search, tpl: categoryId }),
    closeTemplate: () => go({ ...search, tpl: undefined }),
    setTplCategory: (categoryId) => go({ ...search, tpl: categoryId }),
  };
}
