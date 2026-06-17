// ArtifactRecoCard.tsx — a one-click recommended-template card (shown under the
// category tabs and below an empty personal tab). Clicking it runs the
// template's canned prompt through the chat agent's create_data_view tool,
// producing a real data view. Pure render; the run + disabled state are owned by
// the gallery.
import { Icons } from '../../icons/icons';
import type { IconName } from '../../types';
import type { RecommendedTemplate } from '../../artifacts/recommended';

interface Props {
  template: RecommendedTemplate;
  icon: IconName;
  onRun: (prompt: string) => void;
  disabled: boolean;
}

export function ArtifactRecoCard({ template, icon, onRun, disabled }: Props) {
  const Icon = Icons[icon] ?? Icons.spark;
  return (
    <button
      className="af-rcard"
      onClick={() => onRun(template.prompt)}
      disabled={disabled}
      data-testid={`recommended-card-${template.id}`}
    >
      <span className="af-rcard-ic" style={{ background: 'var(--brand-soft)', color: 'var(--brand-2)' }}>
        <Icon size={18} />
      </span>
      <div className="af-rcard-main">
        <div className="af-rcard-title">
          {template.title}
          {template.badge && <span className="af-hot">{template.badge}</span>}
        </div>
        <div className="af-rcard-sub">{template.subtitle}</div>
      </div>
      <span className="af-rcard-add"><Icons.plus size={16} /></span>
    </button>
  );
}
