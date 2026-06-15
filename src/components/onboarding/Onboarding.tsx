// First-run onboarding flow for new signed-in users with no tasks yet.
// A lightweight 3-step guided sequence:
//   Step 1 — pick a scenario from the template catalog (one prominent card per category)
//   Step 2 — personalize one parameter (only shown if the template has params)
//   Step 3 — confirm creation → the user lands on their first real task
//
// The flow is skippable at every step ("先随便看看").
// Once dismissed (via completion or skip) `markOnboardingDone` is called which
// persists the flag server-side so the flow never reappears.
//
// Design: full-center overlay on a white surface, honey/amber CTA, no dark
// elements, Radix color tokens only. Matches the TasksHome / TaskTemplateModal
// minimal Stripe aesthetic. Animates in with a gentle fade+slide.
//
// Change history:
//   2026-06-15  Initial implementation.

import { useState } from 'react';
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
} from '../../lib/task-templates';
import type { TaskSuggestion } from '../../types';

// One representative template per category (the first non-coming-soon one).
function scenarioTemplates(): TaskTemplate[] {
  const seen = new Set<string>();
  const out: TaskTemplate[] = [];
  for (const t of TASK_TEMPLATES) {
    if (!seen.has(t.categoryId) && !t.comingSoon) {
      seen.add(t.categoryId);
      out.push(t);
    }
  }
  return out;
}

function defaultValues(params?: TemplateParam[]): Record<string, string> {
  if (!params) return {};
  return Object.fromEntries(params.map((p) => [p.key, p.default]));
}

// Category accent color (matches TaskTemplateModal).
const CATEGORY_COLOR: Record<string, string> = {
  monitor: 'var(--gold)',
  news: 'var(--brand-2)',
  schedule: 'var(--success)',
};

// Step indicator dots.
function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="nb-ob-dots" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`nb-ob-dot${i === step ? ' active' : ''}`} />
      ))}
    </div>
  );
}

export function Onboarding() {
  const markOnboardingDone = useAppStore((s) => s.markOnboardingDone);
  const createTask = useAppStore((s) => s.createTask);
  const openTasks = useAppStore((s) => s.openTasks);

  const [step, setStep] = useState(0); // 0=pick, 1=personalize, 2=done
  const [selected, setSelected] = useState<TaskTemplate | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);

  const scenarios = scenarioTemplates();
  const hasParams = (selected?.params?.length ?? 0) > 0;

  const TOTAL_STEPS = hasParams ? 3 : 2;

  const handleSkip = () => {
    void markOnboardingDone();
  };

  const handlePickScenario = (t: TaskTemplate) => {
    setSelected(t);
    setParamValues(defaultValues(t.params));
    // If there are no params to personalize, jump straight to creation.
    if (!t.params || t.params.length === 0) {
      setStep(1); // goes to confirm step (index 1 of 2)
    } else {
      setStep(1); // personalize step
    }
  };

  const handleCreate = () => {
    if (!selected || creating) return;
    setCreating(true);

    const resolvedSpec = applyParams(selected.triggerSpec, paramValues);
    const triggerLabel = buildTriggerLabel(selected, paramValues);
    const taskId = nextId(`tsk_${selected.id.replace('tpl_', '')}`);
    const triggerType = resolvedSpec.kind === 'schedule' ? 'schedule' : 'condition';

    const taskData: TaskSuggestion = {
      id: taskId,
      topicId: selected.topic,
      title: selected.title,
      iconColor: selected.iconColor,
      triggerType,
      trigger: triggerLabel,
      last: '从未',
      next: triggerType === 'schedule' ? '明天' : '监控中',
      desc: selected.description,
      kind: triggerType,
      config: [{ icon: triggerType === 'schedule' ? 'clock' : 'bolt', label: triggerLabel }],
      triggerSpec: resolvedSpec,
    };

    createTask(taskData);
    void markOnboardingDone();
    openTasks();
  };

  // ── Step 0: pick a scenario ─────────────────────────────────────────────────
  if (step === 0) {
    return (
      <div className="nb-ob-wrap" data-testid="onboarding-overlay">
        <div className="nb-ob-card" data-testid="onboarding-step-pick">
          <button className="nb-ob-skip" onClick={handleSkip} data-testid="onboarding-skip">
            先随便看看
          </button>

          <div className="nb-ob-bee" aria-hidden>
            <Icons.bee size={32} />
          </div>
          <h1 className="nb-ob-title">NanoBee 帮你盯着</h1>
          <p className="nb-ob-sub">选一个你感兴趣的场景，几秒就能跑起来</p>

          <StepDots step={0} total={2} />

          <div className="nb-ob-scenarios" data-testid="onboarding-scenarios">
            {scenarios.map((t) => {
              const Icon = Icons[t.icon];
              const catColor = CATEGORY_COLOR[t.categoryId] ?? 'var(--brand-2)';
              const cat = TEMPLATE_CATEGORIES.find((c) => c.id === t.categoryId);
              return (
                <button
                  key={t.id}
                  className="nb-ob-scenario"
                  onClick={() => handlePickScenario(t)}
                  data-testid={`onboarding-scenario-${t.id}`}
                >
                  <span
                    className="nb-ob-scenario-ic"
                    style={{ background: `${catColor}18`, color: catColor }}
                  >
                    <Icon size={20} />
                  </span>
                  <div className="nb-ob-scenario-body">
                    <div className="nb-ob-scenario-cat">{cat?.label}</div>
                    <div className="nb-ob-scenario-title">{t.title}</div>
                    <div className="nb-ob-scenario-desc">{t.description}</div>
                  </div>
                  <Icons.chevR size={15} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
                </button>
              );
            })}
          </div>

          <p className="nb-ob-more-hint">
            还有更多模板，创建后在「任务」页随时可以添加
          </p>
        </div>
      </div>
    );
  }

  // ── Step 1: personalize (only if the template has params) ───────────────────
  if (step === 1 && selected && hasParams) {
    const catColor = CATEGORY_COLOR[selected.categoryId] ?? 'var(--brand-2)';
    const Icon = Icons[selected.icon];

    return (
      <div className="nb-ob-wrap" data-testid="onboarding-overlay">
        <div className="nb-ob-card" data-testid="onboarding-step-personalize">
          <button className="nb-ob-skip" onClick={handleSkip} data-testid="onboarding-skip">
            先随便看看
          </button>

          <button
            className="nb-ob-back"
            onClick={() => setStep(0)}
            data-testid="onboarding-back"
          >
            <Icons.chevR size={13} style={{ transform: 'rotate(180deg)' }} />
            返回
          </button>

          <div className="nb-ob-detail-hero">
            <span
              className="nb-ob-detail-ic"
              style={{ background: `${catColor}18`, color: catColor }}
            >
              <Icon size={24} />
            </span>
            <div>
              <div className="nb-ob-detail-name">{selected.title}</div>
              <div className="nb-ob-detail-sub">{selected.description}</div>
            </div>
          </div>

          <StepDots step={1} total={3} />

          <p className="nb-ob-personalize-label">根据你的喜好调整一下</p>

          <div className="nb-ob-params">
            {(selected.params ?? []).map((p) => (
              <label key={p.key} className="nb-ob-param-row">
                <span className="nb-ob-param-label">{p.label}</span>
                <input
                  className="nb-ob-param-input"
                  type={p.type === 'number' ? 'number' : 'text'}
                  value={paramValues[p.key] ?? p.default}
                  onChange={(e) =>
                    setParamValues((prev) => ({ ...prev, [p.key]: e.target.value }))
                  }
                  data-testid={`onboarding-param-${p.key}`}
                />
                {p.hint && <span className="nb-ob-param-hint">{p.hint}</span>}
              </label>
            ))}
          </div>

          <div className="nb-ob-trigger-preview">
            <span className="nb-ob-trigger-ic" aria-hidden>
              {selected.triggerSpec.kind === 'schedule'
                ? <Icons.clock size={13} />
                : <Icons.bolt size={13} />}
            </span>
            <span>{buildTriggerLabel(selected, paramValues)}</span>
          </div>

          <button
            className="nb-ob-cta"
            onClick={() => setStep(2)}
            data-testid="onboarding-next"
          >
            下一步
            <Icons.chevR size={14} />
          </button>
        </div>
      </div>
    );
  }

  // ── Step 2 (or step 1 when no params): confirm & create ────────────────────
  if (selected) {
    const catColor = CATEGORY_COLOR[selected.categoryId] ?? 'var(--brand-2)';
    const Icon = Icons[selected.icon];
    const triggerLabel = buildTriggerLabel(selected, paramValues);

    return (
      <div className="nb-ob-wrap" data-testid="onboarding-overlay">
        <div className="nb-ob-card" data-testid="onboarding-step-confirm">
          <button className="nb-ob-skip" onClick={handleSkip} data-testid="onboarding-skip">
            先随便看看
          </button>

          <button
            className="nb-ob-back"
            onClick={() => setStep(hasParams ? 1 : 0)}
            data-testid="onboarding-back"
          >
            <Icons.chevR size={13} style={{ transform: 'rotate(180deg)' }} />
            返回
          </button>

          <div className="nb-ob-confirm-check" aria-hidden>
            <Icons.bolt size={28} />
          </div>
          <h2 className="nb-ob-confirm-title">准备好了</h2>
          <p className="nb-ob-confirm-sub">点击「开始」，NanoBee 会立即替你盯着这件事</p>

          <StepDots step={TOTAL_STEPS - 1} total={TOTAL_STEPS} />

          <div className="nb-ob-confirm-card">
            <span
              className="nb-ob-scenario-ic"
              style={{ background: `${catColor}18`, color: catColor }}
            >
              <Icon size={18} />
            </span>
            <div className="nb-ob-confirm-info">
              <div className="nb-ob-confirm-name">{selected.title}</div>
              <div className="nb-ob-confirm-trigger">
                {selected.triggerSpec.kind === 'schedule'
                  ? <Icons.clock size={12} />
                  : <Icons.bolt size={12} />}
                {triggerLabel}
              </div>
            </div>
          </div>

          <button
            className="nb-ob-cta nb-ob-cta--go"
            onClick={handleCreate}
            disabled={creating}
            data-testid="onboarding-create"
          >
            <Icons.bolt size={15} />
            {creating ? '创建中…' : '开始监控'}
          </button>

          <p className="nb-ob-confirm-hint">创建后可在「任务」页随时暂停或删除</p>
        </div>
      </div>
    );
  }

  return null;
}
