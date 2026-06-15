// Task Template Library modal — opened from the "从模板开始" link on TasksHome.
// Browseable by category (tab strip), with a mini param-fill form for templates
// that need one or two values before creation, then a one-click create button
// that calls store.createTask (POST /api/tasks) with the resolved triggerSpec.
//
// URL state: the open modal and active category are encoded in the tasks route
// search params (`tpl` = category id or 'all'; absent → modal closed) so the
// picker is bookmarkable and survives a page refresh.
//
// Design: white modal, Radix-token colors, minimal borders. Mirrors the
// TaskUploadDialog modal chrome (nb-tk-modal-scrim / nb-tk-modal) and the
// ArtifactGallery's category tab + card grid patterns.
//
// Change history:
//   2026-06-15  Initial implementation.

import { useEffect, useState } from 'react';
import type { TaskSuggestion } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { Icons } from '../../icons/icons';
import { nextId } from '../../data/ids';
import {
  TEMPLATE_CATEGORIES,
  TASK_TEMPLATES,
  type TaskTemplate,
  type TemplateParam,
  applyParams,
  buildTriggerLabel,
  featuredTemplates,
  templatesForCategory,
} from '../../lib/task-templates';

interface Props {
  /** Currently selected category tab id (or 'all'). */
  activeCategoryId: string;
  onChangeCategory: (id: string) => void;
  onClose: () => void;
}

// ─── icon color accent per category ──────────────────────────────────────────
const CATEGORY_COLOR: Record<string, string> = {
  monitor:  'var(--gold)',
  news:     'var(--brand-2)',
  schedule: 'var(--success)',
};

// ─── param defaults extraction ────────────────────────────────────────────────

function defaultValues(params?: TemplateParam[]): Record<string, string> {
  if (!params) return {};
  return Object.fromEntries(params.map((p) => [p.key, p.default]));
}

// ─── Template card ────────────────────────────────────────────────────────────

interface TemplateCardProps {
  template: TaskTemplate;
  onSelect: (t: TaskTemplate) => void;
}

function TemplateCard({ template, onSelect }: TemplateCardProps) {
  const Icon = Icons[template.icon];
  const catColor = CATEGORY_COLOR[template.categoryId] ?? 'var(--brand-2)';

  return (
    <button
      type="button"
      className={`nb-tpl-card${template.comingSoon ? ' nb-tpl-card--soon' : ''}`}
      onClick={() => !template.comingSoon && onSelect(template)}
      disabled={template.comingSoon}
      data-testid={`template-card-${template.id}`}
      aria-label={template.title}
    >
      <span
        className="nb-tpl-card-ic"
        style={{ background: template.comingSoon ? 'var(--surface-3)' : `${catColor}18`, color: template.comingSoon ? 'var(--ink-4)' : catColor }}
      >
        <Icon size={18} />
      </span>
      <div className="nb-tpl-card-body">
        <div className="nb-tpl-card-titlerow">
          <span className="nb-tpl-card-title">{template.title}</span>
          {template.badge && !template.comingSoon && (
            <span className="nb-tpl-badge">{template.badge}</span>
          )}
          {template.comingSoon && (
            <span className="nb-tpl-badge nb-tpl-badge--soon">即将上线</span>
          )}
        </div>
        <div className="nb-tpl-card-desc">{template.description}</div>
      </div>
      {!template.comingSoon && (
        <span className="nb-tpl-card-go" aria-hidden="true">
          <Icons.chevR size={14} />
        </span>
      )}
    </button>
  );
}

// ─── Param fill form ──────────────────────────────────────────────────────────

interface ParamFormProps {
  template: TaskTemplate;
  values: Record<string, string>;
  onChange: (key: string, val: string) => void;
}

function ParamForm({ template, values, onChange }: ParamFormProps) {
  if (!template.params || template.params.length === 0) return null;
  return (
    <div className="nb-tpl-params" data-testid="template-param-form">
      {template.params.map((p) => (
        <label key={p.key} className="nb-tpl-param-row">
          <span className="nb-tpl-param-label">{p.label}</span>
          <input
            className="nb-tpl-param-input"
            type={p.type === 'number' ? 'number' : 'text'}
            value={values[p.key] ?? p.default}
            onChange={(e) => onChange(p.key, e.target.value)}
            data-testid={`template-param-${p.key}`}
            aria-label={p.label}
          />
          {p.hint && <span className="nb-tpl-param-hint">{p.hint}</span>}
        </label>
      ))}
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function TaskTemplateModal({ activeCategoryId, onChangeCategory, onClose }: Props) {
  const createTask = useAppStore((s) => s.createTask);
  const createdTaskIds = useAppStore((s) => s.createdTaskIds);

  /** The template the user clicked — enters detail/confirm mode. */
  const [selected, setSelected] = useState<TaskTemplate | null>(null);
  /** Param values for the selected template's mini form. */
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  /** Whether the create call is in flight (optimistic, but prevents double-click). */
  const [creating, setCreating] = useState(false);

  // Close on Escape; back to list on Escape when in detail view.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selected) setSelected(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, onClose]);

  // When the user selects a template, seed the param form with defaults.
  const handleSelect = (t: TaskTemplate) => {
    setSelected(t);
    setParamValues(defaultValues(t.params));
  };

  const handleParamChange = (key: string, val: string) => {
    setParamValues((prev) => ({ ...prev, [key]: val }));
  };

  // Resolve the list of templates for the current category tab.
  const templates: TaskTemplate[] =
    activeCategoryId === 'all'
      ? featuredTemplates()
      : templatesForCategory(activeCategoryId);

  // All templates in the "all" tab are actually the full list;
  // featuredTemplates gives one per category for the first impression — for
  // browsing "all" we want everything.
  const allTemplates =
    activeCategoryId === 'all'
      ? TASK_TEMPLATES
      : templates;

  const handleCreate = () => {
    if (!selected || creating) return;

    // Substitute param placeholders into the spec.
    const resolvedSpec = applyParams(selected.triggerSpec, paramValues);
    const triggerLabel = buildTriggerLabel(selected, paramValues);

    // Generate a task id inside the handler (never at module scope — Cloudflare
    // Workers rule). nextId uses nanoid internally.
    const taskId = nextId(`tsk_${selected.id.replace('tpl_', '')}`);

    // Check if this exact id is already created (idempotency guard — unlikely
    // for fresh ids but mirrors the TaskSuggestionCard pattern).
    if (createdTaskIds.includes(taskId)) {
      onClose();
      return;
    }

    const triggerType = resolvedSpec.kind === 'schedule' ? 'schedule' : 'condition';
    const next = triggerType === 'schedule' ? '明天' : '监控中';

    const taskData: TaskSuggestion = {
      id: taskId,
      topicId: selected.topic,
      title: selected.title,
      iconColor: selected.iconColor,
      triggerType,
      trigger: triggerLabel,
      last: '从未',
      next,
      desc: selected.description,
      kind: triggerType,
      config: [
        {
          icon: triggerType === 'schedule' ? 'clock' : 'bolt',
          label: triggerLabel,
        },
      ],
      triggerSpec: resolvedSpec,
    };

    setCreating(true);
    // createTask is optimistic + async; close the modal immediately for a fast feel.
    createTask(taskData);
    onClose();
  };

  return (
    <div
      className="nb-tk-modal-scrim"
      onClick={onClose}
      data-testid="template-modal-scrim"
    >
      <div
        className="nb-tpl-modal"
        role="dialog"
        aria-modal="true"
        aria-label="从模板创建任务"
        onClick={(e) => e.stopPropagation()}
        data-testid="template-modal"
      >
        {/* ── Header ── */}
        <div className="nb-tpl-head">
          {selected ? (
            <button
              type="button"
              className="nb-tpl-back"
              onClick={() => setSelected(null)}
              aria-label="返回列表"
              data-testid="template-back"
            >
              <Icons.chevR size={15} style={{ transform: 'rotate(180deg)' }} />
              <span>返回</span>
            </button>
          ) : (
            <h2 className="nb-tpl-title">
              <Icons.grid size={17} />
              任务模板库
            </h2>
          )}
          <button
            type="button"
            className="nb-tk-drawer-x"
            onClick={onClose}
            aria-label="关闭"
            data-testid="template-modal-close"
          >
            <Icons.x size={16} />
          </button>
        </div>

        {selected ? (
          // ── Detail / confirm view ───────────────────────────────────────────
          <div className="nb-tpl-detail" data-testid="template-detail">
            <div className="nb-tpl-detail-hero">
              <span
                className="nb-tpl-detail-ic"
                style={{
                  background: `${CATEGORY_COLOR[selected.categoryId] ?? 'var(--brand-2)'}18`,
                  color: CATEGORY_COLOR[selected.categoryId] ?? 'var(--brand-2)',
                }}
              >
                {(() => { const Ic = Icons[selected.icon]; return <Ic size={26} />; })()}
              </span>
              <div>
                <div className="nb-tpl-detail-name">{selected.title}</div>
                <div className="nb-tpl-detail-sub">{selected.description}</div>
              </div>
            </div>

            {/* Trigger preview */}
            <div className="nb-tpl-detail-trigger">
              <span className="nb-tpl-detail-trigger-ic" aria-hidden>
                {selected.triggerSpec.kind === 'schedule'
                  ? <Icons.clock size={13} />
                  : <Icons.bolt size={13} />}
              </span>
              <span>{buildTriggerLabel(selected, paramValues)}</span>
            </div>

            {/* Param form (if any) */}
            <ParamForm
              template={selected}
              values={paramValues}
              onChange={handleParamChange}
            />

            <div className="nb-tpl-detail-foot">
              <button
                type="button"
                className="nb-tk-btn-primary nb-tpl-create-btn"
                onClick={handleCreate}
                disabled={creating}
                data-testid="template-create"
              >
                <Icons.bolt size={14} />
                创建任务
              </button>
              <span className="nb-tpl-detail-hint">创建后随时可在任务页暂停</span>
            </div>
          </div>
        ) : (
          // ── Browse view ─────────────────────────────────────────────────────
          <>
            {/* Category tabs */}
            <div className="nb-tpl-tabs" role="tablist" aria-label="模板分类">
              <button
                role="tab"
                aria-selected={activeCategoryId === 'all'}
                className={`nb-tpl-tab${activeCategoryId === 'all' ? ' active' : ''}`}
                onClick={() => onChangeCategory('all')}
                data-testid="template-tab-all"
              >
                全部
              </button>
              {TEMPLATE_CATEGORIES.map((cat) => {
                const CatIcon = Icons[cat.icon];
                return (
                  <button
                    key={cat.id}
                    role="tab"
                    aria-selected={activeCategoryId === cat.id}
                    className={`nb-tpl-tab${activeCategoryId === cat.id ? ' active' : ''}`}
                    onClick={() => onChangeCategory(cat.id)}
                    data-testid={`template-tab-${cat.id}`}
                  >
                    <CatIcon size={13} />
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Template list */}
            <div className="nb-tpl-list" data-testid="template-list">
              {allTemplates.length === 0 ? (
                <div className="nb-tpl-empty" data-testid="template-list-empty">
                  该分类暂无模板
                </div>
              ) : (
                allTemplates.map((t) => (
                  <TemplateCard key={t.id} template={t} onSelect={handleSelect} />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
