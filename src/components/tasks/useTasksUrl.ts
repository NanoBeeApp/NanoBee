// Bridge between the Tasks page URL search params and the components. The Tasks
// surface state (home vs the "all tasks" manager, view mode, open drawer,
// filter, upload dialog) is page-local and only ever changed from within this
// page, so a single source of truth — the URL — is enough; no store round-trip
// or initial-hydration ref dance is needed (contrast useArtifactsUrlSync, which
// must reconcile a store selection set from outside the page).
import { getRouteApi, useNavigate } from '@tanstack/react-router';
import type { TasksSearch, TasksSurface, TasksViewMode } from '../../routes/_app/tasks';

const routeApi = getRouteApi('/_app/tasks');

export const DEFAULT_TASKS_VM: TasksViewMode = 'list';
export const DEFAULT_TASKS_FILTER = 'all';

export interface TasksUrl {
  surface: TasksSurface;
  vm: TasksViewMode;
  taskId: string | null;
  filter: string;
  uploadOpen: boolean;
  openAll: () => void;
  openHome: () => void;
  setVm: (vm: TasksViewMode) => void;
  openTask: (id: string) => void;
  closeTask: () => void;
  setFilter: (f: string) => void;
  openUpload: () => void;
  closeUpload: () => void;
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
    return out;
  };
  const go = (next: TasksSearch) => void navigate({ to: '/tasks', search: mk(next) });

  return {
    surface,
    vm,
    taskId: search.task ?? null,
    filter,
    uploadOpen: search.upload === 'open',
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
  };
}
