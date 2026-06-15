// One recommended-template row for the list view. A flat row mirroring
// ArtifactRow's rhythm: icon, title (+ optional badge), subtitle, and a trailing
// "生成" affordance. The whole row runs the template's canned prompt. Pure render.
import type { IconName } from '../../types';
import type { RecommendedTemplate } from '../../artifacts/recommended';
import { Icons } from '../../icons/icons';

interface Props {
  template: RecommendedTemplate;
  icon: IconName;
  onRun: (prompt: string) => void;
  disabled: boolean;
}

export function RecommendedRow({ template, icon, onRun, disabled }: Props) {
  const Icon = Icons[icon];
  return (
    <button
      className="nb-rec-row"
      disabled={disabled}
      onClick={() => onRun(template.prompt)}
      data-testid={`recommended-row-${template.id}`}>
      <span className="nb-rec-row-ic"><Icon size={16} /></span>
      <span className="nb-rec-row-title">{template.title}</span>
      {template.badge && <span className="nb-rec-card-badge">{template.badge}</span>}
      <span className="nb-rec-row-sub">{template.subtitle}</span>
      <span className="nb-rec-row-go" aria-hidden="true">
        <Icons.plus size={14} /> 生成
      </span>
    </button>
  );
}
