// Server-side AI-reply generator.
// Detects a topic by keyword (used to categorize the chat) and wraps the
// LLM-written reply text (ai/client.ts) into a chat message; the rule-based
// copy below is the fallback when no model call succeeded.
// Kept intentionally minimal: no task-suggestion cards or quick-reply chips
// are attached — those will return once the underlying features ship.
import { nanoid } from "nanoid";
import type { AiMessage, Paragraph } from "../types";

const genId = (prefix: string) => `${prefix}_${nanoid(10)}`;

export interface GeneratedReply {
	topicId: string;
	msg: AiMessage;
}

/** Split LLM output into display paragraphs (blank-line separated). */
export function textToParas(text: string): Paragraph[] {
	return text
		.split(/\n{2,}|\n(?=\S)/)
		.map((p) => p.trim())
		.filter(Boolean)
		.map((p) => [p] as Paragraph);
}

/** Keyword-based topic detection, used only to categorize the chat. */
function detectTopic(t: string): string {
	if (/孩子|作业|考试|学习|教育|复习/.test(t)) return "edu";
	if (/早报|新闻|资讯|摘要/.test(t)) return "brief";
	if (/走|运动|久坐|喝水|健康|身体|步数/.test(t)) return "health";
	return "gold";
}

export function genReply(
	text: string,
	ctxTitle?: string | null,
	llm?: { text: string; model: string } | null,
): GeneratedReply {
	const topicId = detectTopic(`${text ?? ""} ${ctxTitle ?? ""}`);

	// LLM-written reply text when the model call succeeded; otherwise a
	// short rule-based fallback so chat never breaks.
	const paras: Paragraph[] = llm
		? textToParas(llm.text)
		: [
				...(ctxTitle ? [["结合你正在看的 ", { b: `「${ctxTitle}」` }, "："] as Paragraph] : []),
				["收到，我记下了。", { b: "有重要进展我会主动找你" }, "。"],
			];

	return {
		topicId,
		msg: {
			id: genId("m"), role: "ai",
			paras,
			...(llm ? { model: llm.model } : {}),
		},
	};
}
