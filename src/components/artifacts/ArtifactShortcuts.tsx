// Quick-launch shortcuts for the Artifacts page: one click runs a canned
// prompt through the chat pipeline (the create_card_artifact agent tool) and
// the freshly generated deck appears on this page — no typing needed.
//
// Presets are word-kind themes today; as new card kinds ship, add their
// shortcuts here. The list is intentionally a plain data array so it stays the
// single place to extend.
import { useAppStore } from '../../store/useAppStore';
import { Icons } from '../../icons/icons';

interface Shortcut {
  /** Chip label. */
  label: string;
  /** The canned chat prompt the click sends. */
  prompt: string;
}

const SHORTCUTS: Shortcut[] = [
  { label: '每天 10 个单词', prompt: '每天教我 10 个实用的英语单词' },
  { label: '旅行英语', prompt: '教我 10 个旅行场景常用的英语单词' },
  { label: '商务英语', prompt: '教我 10 个商务英语高频单词' },
  { label: '情绪表达', prompt: '教我 10 个表达情绪和心情的英语单词' },
];

export function ArtifactShortcuts() {
  const generating = useAppStore((s) => s.artifactGenerating);
  const run = useAppStore((s) => s.runArtifactShortcut);

  return (
    <div className="nb-arti-shortcuts" data-testid="artifact-shortcuts">
      <span className="nb-arti-shortcuts-label">
        <Icons.bolt size={13} /> 快捷生成
      </span>
      {SHORTCUTS.map((s) => (
        <button
          key={s.label}
          className="nb-arti-shortcut"
          disabled={generating}
          onClick={() => void run(s.prompt)}
          data-testid={`artifact-shortcut-${s.label}`}>
          {s.label}
        </button>
      ))}
    </div>
  );
}
