// Text-selection float: selecting AI reply text (marked with data-ai-text)
// surfaces "set as reminder / set as task" actions that create a task from
// the selected snippet.
import { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { topicById } from '../../data/topics';
import { nextId } from '../../data/ids';
import { Icons } from '../../icons/icons';

const MIN_SELECTION_CHARS = 4;
const SNIPPET_MAX_CHARS = 16;
const DEFAULT_ICON_COLOR = '#d98b2b';

interface SelectionState {
  x: number;
  y: number;
  text: string;
}

export function SelectionFloat() {
  const [sel, setSel] = useState<SelectionState | null>(null);
  const activeTopicId = useAppStore((s) => s.activeTopicId);
  const createTask = useAppStore((s) => s.createTask);

  useEffect(() => {
    const onMouseUp = () => {
      const s = window.getSelection();
      const txt = s?.toString().trim();
      if (!s || !txt || txt.length < MIN_SELECTION_CHARS) { setSel(null); return; }
      // Only offer the float for selections inside AI-generated text.
      let node: Node | null = s.anchorNode;
      let insideAiText = false;
      while (node) {
        if (node instanceof Element && node.getAttribute('data-ai-text')) { insideAiText = true; break; }
        node = node.parentNode;
      }
      if (!insideAiText) { setSel(null); return; }
      const rect = s.getRangeAt(0).getBoundingClientRect();
      setSel({ x: rect.left + rect.width / 2, y: rect.top - 6, text: txt });
    };
    document.addEventListener('mouseup', onMouseUp);
    return () => document.removeEventListener('mouseup', onMouseUp);
  }, []);

  if (!sel) return null;

  const createFromSelection = () => {
    const topic = topicById(activeTopicId);
    const snippet = sel.text.length > SNIPPET_MAX_CHARS ? `${sel.text.slice(0, SNIPPET_MAX_CHARS)}…` : sel.text;
    createTask({
      id: nextId('t'),
      topicId: activeTopicId ?? 'gold',
      title: `提醒我：${snippet}`,
      desc: '基于你选中的内容创建的提醒。',
      config: [{ icon: 'clock', label: '明天 09:00' }],
      iconColor: topic?.color ?? DEFAULT_ICON_COLOR,
      trigger: '明天 09:00',
      triggerType: 'schedule',
      last: '刚刚创建',
      next: '明天 09:00',
      result: '提醒已设置。',
      resultTone: 'info',
    });
    window.getSelection()?.removeAllRanges();
    setSel(null);
  };

  return (
    <div className="nb-sel-float" style={{ left: sel.x, top: sel.y }} data-testid="selection-action-float">
      <button onClick={createFromSelection} data-testid="set-selection-as-reminder">
        <span className="ic"><Icons.bell size={14} /></span> 设为提醒
      </button>
      <button onClick={createFromSelection} data-testid="set-selection-as-task">
        <span className="ic"><Icons.bolt size={14} /></span> 设为任务
      </button>
    </div>
  );
}
