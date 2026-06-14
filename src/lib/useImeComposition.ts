/**
 * Shared IME-composition guard for Enter-to-submit inputs.
 *
 * Chinese / Japanese / Korean input methods build a character through a
 * multi-keystroke "composition", and pressing Enter mid-composition *confirms
 * the candidate* — it must not be treated as "submit the message". This hook
 * tracks composition state and exposes a single `isSubmitEnter` test so every
 * composer in the app handles IME the same way.
 */

import { useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";

export function useImeComposition() {
	// True while an IME composition is in progress (pinyin / kana / hangul). We
	// track it with our own ref because keydown fires *before* compositionend, so
	// the native KeyboardEvent.isComposing flag has already flipped back to false
	// by the time some browsers deliver the Enter keydown — the ref is still true.
	const composingRef = useRef(false);

	// Spread onto the <input>/<textarea> to keep the ref in sync.
	const compositionProps = {
		onCompositionStart: () => {
			composingRef.current = true;
		},
		onCompositionEnd: () => {
			composingRef.current = false;
		},
	};

	// True when this keydown is a plain Enter that should submit: Enter without
	// Shift, and not while composing. We trust our own ref first, with the native
	// isComposing / keyCode 229 flags as a cross-browser fallback.
	const isSubmitEnter = (e: ReactKeyboardEvent) => {
		if (e.key !== "Enter" || e.shiftKey) return false;
		if (composingRef.current) return false;
		const native = e.nativeEvent as globalThis.KeyboardEvent;
		return !native.isComposing && native.keyCode !== 229;
	};

	return { composingRef, compositionProps, isSubmitEnter };
}
