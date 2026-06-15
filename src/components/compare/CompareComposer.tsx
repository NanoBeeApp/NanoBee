// Shared compare input: one prompt sent to every column at once. Auto-growing
// textarea with IME-safe Enter-to-send (Enter sends, Shift+Enter newlines, and
// Enter never sends mid-composition for CJK input).
import { useRef, useState } from "react";
import { useImeComposition } from "../../lib/useImeComposition";
import { Icons } from "../../icons/icons";

const TEXTAREA_MAX_HEIGHT = 160;

interface CompareComposerProps {
	onSend: (text: string) => void;
	columnCount: number;
}

export function CompareComposer({ onSend, columnCount }: CompareComposerProps) {
	const [val, setVal] = useState("");
	const taRef = useRef<HTMLTextAreaElement>(null);
	const { compositionProps, isSubmitEnter } = useImeComposition();

	const autoGrow = () => {
		const ta = taRef.current;
		if (!ta) return;
		ta.style.height = "auto";
		ta.style.height = `${Math.min(ta.scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
	};

	const submit = () => {
		const t = val.trim();
		if (!t) return;
		onSend(t);
		setVal("");
		if (taRef.current) {
			taRef.current.style.height = "auto";
			taRef.current.focus();
		}
	};

	const onKeyDown = (e: React.KeyboardEvent) => {
		if (isSubmitEnter(e)) {
			e.preventDefault();
			submit();
		}
	};

	return (
		<div className="nb-cmp-composer">
			<div className="nb-cmp-composer-box">
				<textarea
					ref={taRef}
					rows={1}
					value={val}
					onChange={(e) => {
						setVal(e.target.value);
						autoGrow();
					}}
					onKeyDown={onKeyDown}
					{...compositionProps}
					placeholder="输入要对比的问题，回车发给所有模型…"
					aria-label="对比问题输入"
					data-testid="compare-prompt-input"
				/>
				<button
					type="button"
					className="nb-send"
					disabled={!val.trim()}
					onClick={submit}
					title="发送给所有模型"
					aria-label="发送给所有模型"
					data-testid="compare-send"
				>
					<Icons.send size={16} sw={2.4} />
				</button>
			</div>
			<div className="nb-cmp-composer-hint">
				同一问题将并行发送给上方 {columnCount} 个模型
			</div>
		</div>
	);
}
