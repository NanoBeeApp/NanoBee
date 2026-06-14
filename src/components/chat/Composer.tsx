// Main chat composer: auto-growing textarea plus the slash ("/task") and
// mention ("@watchlist") popovers that turn conversation into automated tasks.
import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useImeComposition } from '../../lib/useImeComposition';
import { Icon, Icons } from '../../icons/icons';

const SLASH_COMMANDS = [
  { ic: 'bolt', name: '/任务', desc: '创建一个会自动运行的任务', amber: true },
  { ic: 'bell', name: '/提醒', desc: '在某个时间或条件下提醒我', amber: true },
  { ic: 'bars', name: '/盯盘', desc: '持续监控一个指标的变化', amber: true },
  { ic: 'news', name: '/早报', desc: '每天定时给我一份摘要' },
] as const;

const MENTION_ITEMS = [
  { ic: 'coins', name: '黄金 XAU/USD', desc: '实时行情 · 已关注' },
  { ic: 'book', name: '孩子 · 三年级', desc: '校历 · 作业 · 成绩' },
  { ic: 'doc', name: '我的关注清单', desc: '12 项 · 上次更新今天' },
] as const;

const TEXTAREA_MAX_HEIGHT = 160;

interface ComposerProps {
  onSend: (text: string) => void;
}

type Popover = 'slash' | 'mention' | null;

export function Composer({ onSend }: ComposerProps) {
  // A page-specific "new" action (新建任务 / 新建 Artifact) seeds the composer
  // through the store *before* navigating here, so the seed is already present
  // when this composer mounts — read it once into the initial value (rather than
  // mirroring store → state via an effect).
  const seededRef = useRef(useAppStore.getState().composerSeed);
  const [val, setVal] = useState(() => seededRef.current ?? '');
  const [pop, setPop] = useState<Popover>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const { compositionProps, isSubmitEnter } = useImeComposition();
  const activeChatId = useAppStore((s) => s.activeChatId);
  const clearComposerSeed = useAppStore((s) => s.clearComposerSeed);

  // Focus the input on mount and whenever the conversation changes
  // (new chat via ⌘N / sidebar button, or switching to another chat).
  useEffect(() => {
    taRef.current?.focus();
  }, [activeChatId]);

  // When mounted from a seed, clear it (one-shot) and put the caret at the end +
  // grow the textarea so the user keeps typing from the starter prompt.
  useEffect(() => {
    if (!seededRef.current) return;
    clearComposerSeed();
    const ta = taRef.current;
    if (!ta) return;
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
  }, [clearComposerSeed]);

  const autoGrow = () => {
    const ta = taRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${Math.min(ta.scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setVal(v);
    if (v === '/') setPop('slash');
    else if (v.endsWith('@')) setPop('mention');
    // Keep the slash popover only while the text still looks like a command
    // being typed ("/盯盘"), not when "/" merely appears mid-sentence.
    else if (pop === 'slash' && !(v.startsWith('/') && !v.includes(' '))) setPop(null);
    else if (pop === 'mention' && !v.endsWith('@')) setPop(null);
    autoGrow();
  };

  const submit = () => {
    if (!val.trim()) return;
    onSend(val.trim());
    setVal('');
    setPop(null);
    if (taRef.current) {
      taRef.current.style.height = 'auto';
      // Clicking the send button moves focus to it — bring it back so the
      // user can keep typing without re-clicking the input.
      taRef.current.focus();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    // Don't send while an IME composition is active — there Enter confirms the
    // candidate (e.g. picking a Chinese word), it is not a "send".
    if (isSubmitEnter(e)) { e.preventDefault(); submit(); }
    if (e.key === 'Escape') setPop(null);
  };

  const pick = (txt: string) => {
    setVal(`${txt} `);
    setPop(null);
    taRef.current?.focus();
  };

  return (
    <div className="nb-composer-wrap">
      <div className="nb-composer-inner">
        <div className="nb-composer" data-testid="chat-composer">
          {pop === 'slash' && (
            <div className="nb-pop" data-testid="slash-command-popover">
              <div className="nb-pop-head">
                <span className="nb-mono" style={{ color: 'var(--ink)', fontWeight: 700 }}>/</span> 把对话变成会自动跑的任务
              </div>
              {SLASH_COMMANDS.map((s, i) => (
                <div className={`nb-pop-item${'amber' in s && s.amber ? ' amber' : ''}${i === 0 ? ' active' : ''}`}
                  key={i} onClick={() => pick(s.name)}>
                  <div className="ic"><Icon name={s.ic} size={15} /></div>
                  <div className="meta"><div className="name">{s.name}</div><div className="desc">{s.desc}</div></div>
                </div>
              ))}
            </div>
          )}
          {pop === 'mention' && (
            <div className="nb-pop" data-testid="mention-popover">
              <div className="nb-pop-head">
                <span className="nb-mono" style={{ color: 'var(--ink)', fontWeight: 700 }}>@</span> 引用一个你关注的东西
              </div>
              {MENTION_ITEMS.map((s, i) => (
                <div className={`nb-pop-item${i === 0 ? ' active' : ''}`} key={i} onClick={() => pick(`@${s.name}`)}>
                  <div className="ic"><Icon name={s.ic} size={15} /></div>
                  <div className="meta"><div className="name">{s.name}</div><div className="desc">{s.desc}</div></div>
                </div>
              ))}
            </div>
          )}
          <textarea ref={taRef} rows={1} value={val} onChange={onChange} onKeyDown={onKeyDown}
            {...compositionProps}
            placeholder="问点什么，或者让 NanoBee 帮你盯着一件事…   输入 / 创建任务，@ 引用关注"
            data-testid="chat-message-input" />
          <div className="nb-composer-bar">
            <button className="cbtn" title="附件" data-testid="attach-file"><Icons.attach size={16} /></button>
            <button className="cbtn" title="任务"
              onClick={() => {
                // Toggle: a second click closes the popover instead of re-opening it.
                if (pop === 'slash') { setPop(null); setVal(''); }
                else { setVal('/'); setPop('slash'); }
                taRef.current?.focus();
              }}
              data-testid="open-slash-commands"><Icons.slash size={16} /></button>
            <button className="cbtn" title="语音" data-testid="voice-input"><Icons.mic size={16} /></button>
            <span className="model" data-testid="model-selector"><Icons.spark size={12} /> sonnet · agent <Icons.chevD size={12} /></span>
            <button className="nb-send" disabled={!val.trim()} onClick={submit} title="发送"
              data-testid="send-chat-message"><Icons.send size={16} sw={2.4} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
