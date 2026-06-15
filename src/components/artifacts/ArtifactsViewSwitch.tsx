// The list / table / card view switch for the Artifacts gallery — a compact
// icon segmented control. Pure render: the active mode + change handler come
// from the page (via useArtifactsUrlSync, which keeps the mode in the URL).
import type { ArtifactsViewMode } from '../../routes/_app/artifacts';
import { Icons } from '../../icons/icons';
import type { IconName } from '../../types';

const MODES: { id: ArtifactsViewMode; label: string; icon: IconName }[] = [
  { id: 'list', label: '列表', icon: 'list' },
  { id: 'table', label: '表格', icon: 'table' },
  { id: 'card', label: '卡片', icon: 'grid' },
];

interface Props {
  value: ArtifactsViewMode;
  onChange: (vm: ArtifactsViewMode) => void;
}

export function ArtifactsViewSwitch({ value, onChange }: Props) {
  return (
    <div className="nb-arti-vswitch" role="group" aria-label="切换视图" data-testid="artifacts-view-switch">
      {MODES.map((m) => {
        const Icon = Icons[m.icon];
        const active = value === m.id;
        return (
          <button
            key={m.id}
            className={`nb-arti-vswitch-btn${active ? ' active' : ''}`}
            aria-pressed={active}
            title={`${m.label}视图`}
            onClick={() => onChange(m.id)}
            data-testid={`artifacts-view-${m.id}`}>
            <Icon size={15} />
          </button>
        );
      })}
    </div>
  );
}
