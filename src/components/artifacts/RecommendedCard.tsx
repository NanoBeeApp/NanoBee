// One recommended-template tile: a one-click seed shown under the category tabs
// and in the empty-state "为你推荐" strip. Clicking runs the template's canned
// prompt through the generation pipeline (the gallery wires onRun); the result
// becomes a real artifact under 你创建的. Pure render.
import type { IconName } from '../../types';
import type { RecommendedTemplate } from '../../artifacts/recommended';
import { Icons } from '../../icons/icons';

interface Props {
  template: RecommendedTemplate;
  /** Category icon (the gallery resolves it so this stays category-agnostic). */
  icon: IconName;
  onRun: (prompt: string) => void;
  /** A generation is already in flight — block re-entry. */
  disabled: boolean;
}

export function RecommendedCard({ template, icon, onRun, disabled }: Props) {
  const Icon = Icons[icon];
  return (
    <button
      className="nb-rec-card"
      disabled={disabled}
      onClick={() => onRun(template.prompt)}
      data-testid={`recommended-card-${template.id}`}>
      <span className="nb-rec-card-ic"><Icon size={18} /></span>
      <div className="nb-rec-card-main">
        <div className="nb-rec-card-titlerow">
          <span className="nb-rec-card-title">{template.title}</span>
          {template.badge && <span className="nb-rec-card-badge">{template.badge}</span>}
        </div>
        <div className="nb-rec-card-sub">{template.subtitle}</div>
      </div>
      <span className="nb-rec-card-go" aria-hidden="true">
        <Icons.plus size={15} />
      </span>
    </button>
  );
}
