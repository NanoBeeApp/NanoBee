// Server-side AI-reply generator.
// Picks a topic by keyword and proposes a matching task; when the user is
// reading something on the Today page, the reply acknowledges that context.
// The reply text comes from the configured LLM (ai/client.ts) when available;
// the rule-based copy below is the fallback when no model call succeeded.
import { nanoid } from "nanoid";
import type { AiMessage, Paragraph, TaskSuggestion } from "../types";

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

export function genReply(
	text: string,
	ctxTitle?: string | null,
	llm?: { text: string; model: string } | null,
): GeneratedReply {
	const t = `${text ?? ""} ${ctxTitle ?? ""}`;
	let topicId = "gold";
	let task: TaskSuggestion;

	const mk = (o: Omit<TaskSuggestion, "id" | "last">): TaskSuggestion =>
		({ id: genId("t"), last: "刚刚创建", ...o });

	if (/孩子|作业|考试|学习|教育|复习/.test(t)) {
		topicId = "edu";
		task = mk({
			topicId, title: "孩子 · 学习提醒", desc: "作业、考试或重要校园通知出现时提醒你。",
			config: [{ icon: "bolt", label: "有新通知时" }, { icon: "clock", label: "工作日 18:30" }],
			iconColor: "#635bff", trigger: "有新通知 · 工作日 18:30", triggerType: "schedule",
			next: "今天 18:30", result: "已开始关注。", resultTone: "info",
		});
	} else if (/早报|新闻|资讯|摘要/.test(t)) {
		topicId = "brief";
		task = mk({
			topicId, title: "每日早报", desc: "每天定时给你一份你关心的要闻摘要。",
			config: [{ icon: "clock", label: "每天 07:30" }],
			iconColor: "#ff6a3d", trigger: "每天 07:30", triggerType: "schedule",
			next: "明天 07:30", result: "已就绪。", resultTone: "info",
		});
	} else if (/走|运动|久坐|喝水|健康|身体|步数/.test(t)) {
		topicId = "health";
		task = mk({
			topicId, title: "健康提醒", desc: "在合适的时机提醒你活动、喝水或达成目标。",
			config: [{ icon: "bolt", label: "久坐 > 90 分钟" }],
			iconColor: "#1a7f55", trigger: "久坐 > 90 分钟", triggerType: "condition",
			next: "监控中", result: "已开启。", resultTone: "info",
		});
	} else {
		task = mk({
			topicId: "gold", title: "黄金 · 盯盘提醒", desc: "大涨大跌或趋势反转时主动通知你。",
			config: [{ icon: "bolt", label: "涨跌 ±1.5%" }, { icon: "bolt", label: "趋势反转" }],
			iconColor: "#d4a64a", trigger: "涨跌 ±1.5% / 趋势反转", triggerType: "condition",
			next: "实时监控中", result: "已开始监控。", resultTone: "up",
		});
	}

	// LLM-written reply text when the model call succeeded; otherwise the
	// rule-based fallback copy. The task proposal stays rule-based either way.
	const paras: Paragraph[] = llm
		? textToParas(llm.text)
		: [
				...(ctxTitle ? [["结合你正在看的 ", { b: `「${ctxTitle}」` }, "："] as Paragraph] : []),
				["好的，我来帮你盯着这件事。", { b: "重要的时候我会主动找你" }, "，平时不打扰。"],
				["建议这样设置，你确认一下："],
			];

	return {
		topicId,
		msg: {
			id: genId("m"), role: "ai",
			paras,
			...(llm ? { model: llm.model } : {}),
			extras: [{ kind: "task", data: task }],
			suggest: ["改一下通知条件", "换个时间", "先这样"],
		},
	};
}
