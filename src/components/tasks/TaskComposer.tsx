// The single visual focus of the Tasks home screen: one quiet chat-style input
// that turns a sentence into an automated task. Submitting hands the text to the
// chat pipeline (store.send), where the agent proposes a task the user confirms
// — tasks are born from conversation, not a config form. The purple send button
// is the only accent-colored block on the home screen.
//
// Below the input sit two low-weight secondary entries (batch upload / template)
// — deliberately small text links so they never compete with the input.
import { useState, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Icons } from '../../icons/icons';

const PLACEHOLDER = '告诉 NanoBee 帮你盯什么，例如：黄金跌超 2% 就提醒我';

export function TaskComposer({
  onUpload,
  onTemplate,
}: {
  onUpload: () => void;
  onTemplate: () => void;
}) {
  const send = useAppStore((s) => s.send);
  const [val, setVal] = useState('');
  // IME guard: an Enter that commits a composition must not submit the task.
  const composingRef = useRef(false);

  const submit = () => {
    const text = val.trim();
    if (!text) return;
    send(text); // routes into the chat view, where the agent builds the task
    setVal('');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !composingRef.current) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="nb-tk-composer-wrap">
      <div className="nb-tk-composer">
        <span className="nb-tk-composer-glyph" aria-hidden>
          <Icons.spark size={17} />
        </span>
        <input
          className="nb-tk-composer-input"
          value={val}
          placeholder={PLACEHOLDER}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={onKeyDown}
          onCompositionStart={() => {
            composingRef.current = true;
          }}
          onCompositionEnd={() => {
            composingRef.current = false;
          }}
          data-testid="task-compose-input"
          aria-label="创建任务"
        />
        <button
          className="nb-tk-send"
          onClick={submit}
          disabled={!val.trim()}
          aria-label="创建任务"
          data-testid="task-compose-send"
        >
          <Icons.up size={16} />
        </button>
      </div>
      <div className="nb-tk-composer-aux">
        <button className="nb-tk-aux-link" onClick={onUpload} data-testid="task-upload-open">
          <Icons.attach size={13} /> 上传文件批量
        </button>
        <span className="nb-tk-aux-dot" aria-hidden>
          ·
        </span>
        <button className="nb-tk-aux-link" onClick={onTemplate} data-testid="task-template-open">
          <Icons.grid size={13} /> 从模板开始
        </button>
      </div>
    </div>
  );
}
