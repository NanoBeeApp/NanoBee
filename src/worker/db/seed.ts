/**
 * Lazy idempotent demo-data seeding for the "anon" owner bucket.
 *
 * Signed-out visitors land in the "anon" bucket. On the very first bootstrap
 * request for that bucket this function populates it with the canonical demo
 * content so new visitors see a meaningful app instead of an empty screen.
 *
 * Signed-in users are untouched — they start with their own empty bucket
 * and fill it through real use.
 *
 * All statement ids are hard-coded literals (no nanoid / Math.random / Date.now
 * at module scope) to satisfy the Cloudflare Workers global-scope constraint
 * (error 10021) and to keep the ids stable so tests can assert on them.
 *
 * Uses INSERT OR IGNORE throughout so the function is safe to call on every
 * cold start and concurrent calls cannot cause duplicates.
 */

import type { D1Database } from "@cloudflare/workers-types";
import { ANON_OWNER } from "../artifacts/repo";

export async function ensureAnonSeed(db: D1Database): Promise<void> {
	// Fast-path: if the anon bucket already has chats, skip all inserts.
	const existing = await db
		.prepare("SELECT id FROM chats WHERE owner = ? LIMIT 1")
		.bind(ANON_OWNER)
		.first<{ id: string }>();
	if (existing) return;

	// All seed statements are collected into one batch (single D1 transaction).
	// The order matters: chats before messages (FK reference).

	// ── Chats (7 rows) ──────────────────────────────────────────────────────
	const insChat = db.prepare(
		"INSERT OR IGNORE INTO chats (id, owner, topic_id, title, sub, grp, pinned) VALUES (?, ?, ?, ?, ?, ?, ?)",
	);

	// ── Messages ─────────────────────────────────────────────────────────────
	const insMsg = db.prepare(
		"INSERT OR IGNORE INTO messages (id, owner, chat_id, role, payload) VALUES (?, ?, ?, ?, ?)",
	);

	// ── Tasks (5 rows) ───────────────────────────────────────────────────────
	const insTask = db.prepare(
		"INSERT OR IGNORE INTO tasks (id, owner, topic_id, title, status, payload) VALUES (?, ?, ?, ?, ?, ?)",
	);

	// ── Updates (7 rows) ─────────────────────────────────────────────────────
	const insUpdate = db.prepare(
		"INSERT OR IGNORE INTO updates (id, owner, topic_id, grp, payload) VALUES (?, ?, ?, ?, ?)",
	);

	// Helper: JSON.stringify a ChatMessage payload inline.
	function msgPayload(fields: Record<string, unknown>): string {
		return JSON.stringify(fields);
	}

	await db.batch([
		// ── chats ──────────────────────────────────────────────────────────
		insChat.bind("c_gold_today", ANON_OWNER, "gold", "为什么黄金今天大涨？", "4 次工具调用 · 已引用 3 个来源", "今天", 1),
		insChat.bind("c_gold_setup", ANON_OWNER, "gold", "帮我盯着黄金价格", "已创建 2 个任务", "今天", 0),
		insChat.bind("c_edu_test",   ANON_OWNER, "edu",  "孩子明天数学考试",  "生成了 5 道易错题",           "今天", 0),
		insChat.bind("c_brief",      ANON_OWNER, "brief","每天早上给我一份早报","每天 07:30 推送",            "昨天", 0),
		insChat.bind("c_edu_plan",   ANON_OWNER, "edu",  "暑假学习计划",      "8 周计划 · 已保存",           "昨天", 0),
		insChat.bind("c_health",     ANON_OWNER, "health","提醒我多走动",      "久坐提醒（已暂停）",          "近 7 天", 0),
		insChat.bind("c_gold_tax",   ANON_OWNER, "gold", "黄金交易要交税吗？", "已解答",                     "近 7 天", 0),

		// ── messages for c_gold_today (3 rows) ───────────────────────────
		insMsg.bind(
			"m_seed_1", ANON_OWNER, "c_gold_today", "proactive",
			msgPayload({
				id: "m_seed_1", role: "proactive", icon: "trend",
				title: "金价大幅上涨 +2.8%", time: "今天 09:14",
				paras: [["你昨天提到在关注黄金。今天现货黄金大涨 ", { num: "+2.8%" }, "，突破 ", { num: "$2,412/oz" }, "，是近三周以来最大单日涨幅。"]],
			}),
		),
		insMsg.bind(
			"m_seed_2", ANON_OWNER, "c_gold_today", "user",
			msgPayload({ id: "m_seed_2", role: "user", text: "为什么涨这么多？以后这种大变化，重要的就主动告诉我。" }),
		),
		insMsg.bind(
			"m_seed_3", ANON_OWNER, "c_gold_today", "ai",
			msgPayload({
				id: "m_seed_3", role: "ai",
				paras: [
					["今天金价大涨，主要是三个因素同时发生："],
					[{ b: "1. 避险情绪升温" }, " — 地缘风险推动资金流入黄金等避险资产。"],
					[{ b: "2. 美元走弱" }, " — 美元指数 DXY 跌至 ", { num: "103.2" }, "，以美元计价的黄金因此变贵。"],
					[{ b: "3. 降息预期升温" }, " — 市场上调 9 月降息概率，美债实际收益率回落，利好不生息的黄金。"],
					["好的，以后这类大变化我会主动推给你。"],
				],
			}),
		),

		// ── messages for c_gold_setup (2 rows) ───────────────────────────
		insMsg.bind(
			"m_seed_4", ANON_OWNER, "c_gold_setup", "user",
			msgPayload({ id: "m_seed_4", role: "user", text: "帮我盯着黄金价格。" }),
		),
		insMsg.bind(
			"m_seed_5", ANON_OWNER, "c_gold_setup", "ai",
			msgPayload({
				id: "m_seed_5", role: "ai",
				paras: [
					["没问题。我可以帮你 ", { b: "实时盯盘" }, "，只在重要的时候打扰你——大涨大跌、趋势反转、或到了你设的价位。"],
					["你想怎么被通知？"],
				],
			}),
		),

		// ── messages for c_edu_test (3 rows) ─────────────────────────────
		insMsg.bind(
			"m_seed_6", ANON_OWNER, "c_edu_test", "proactive",
			msgPayload({
				id: "m_seed_6", role: "proactive", icon: "book",
				title: "明天有数学单元测", time: "今天 07:30",
				paras: [["从班级群和校历里发现：", { b: "明天上午第二节" }, " 有数学单元测，范围第三章「分数」。我整理了 5 道孩子最近常错的题型。"]],
			}),
		),
		insMsg.bind(
			"m_seed_7", ANON_OWNER, "c_edu_test", "user",
			msgPayload({ id: "m_seed_7", role: "user", text: "帮我整理这 5 道题，今晚 8 点提醒我陪她复习。" }),
		),
		insMsg.bind(
			"m_seed_8", ANON_OWNER, "c_edu_test", "ai",
			msgPayload({
				id: "m_seed_8", role: "ai",
				paras: [["好的，5 道易错题（含解析）已经准备好，并设置了今晚 ", { num: "20:00" }, " 的复习提醒。"]],
			}),
		),

		// ── messages for c_brief (2 rows) ────────────────────────────────
		insMsg.bind(
			"m_seed_9", ANON_OWNER, "c_brief", "user",
			msgPayload({ id: "m_seed_9", role: "user", text: "每天早上给我一份早报。" }),
		),
		insMsg.bind(
			"m_seed_10", ANON_OWNER, "c_brief", "ai",
			msgPayload({
				id: "m_seed_10", role: "ai",
				paras: [["好的，我会每天早上 ", { num: "07:30" }, " 给你一份早报：你关心的科技、地产，以及与持仓相关的要闻，控制在 90 秒读完。"]],
			}),
		),

		// ── messages for c_edu_plan (2 rows) ─────────────────────────────
		insMsg.bind(
			"m_seed_11", ANON_OWNER, "c_edu_plan", "user",
			msgPayload({ id: "m_seed_11", role: "user", text: "帮我做个暑假学习计划。" }),
		),
		insMsg.bind(
			"m_seed_12", ANON_OWNER, "c_edu_plan", "ai",
			msgPayload({
				id: "m_seed_12", role: "ai",
				paras: [["我按 ", { b: "8 周" }, " 给你排了一版：上午学科巩固、下午兴趣+阅读、每周留半天机动。已保存，可以随时让我调整。"]],
			}),
		),

		// ── messages for c_health (2 rows) ───────────────────────────────
		insMsg.bind(
			"m_seed_13", ANON_OWNER, "c_health", "user",
			msgPayload({ id: "m_seed_13", role: "user", text: "提醒我别老坐着。" }),
		),
		insMsg.bind(
			"m_seed_14", ANON_OWNER, "c_health", "ai",
			msgPayload({
				id: "m_seed_14", role: "ai",
				paras: [["好的，工作日里如果你连续静止超过 90 分钟，我会轻轻提醒你起来活动一下。这条提醒目前是 ", { b: "暂停" }, " 状态，你可以在右侧任务面板里随时打开。"]],
			}),
		),

		// ── messages for c_gold_tax (2 rows) ─────────────────────────────
		insMsg.bind(
			"m_seed_15", ANON_OWNER, "c_gold_tax", "user",
			msgPayload({ id: "m_seed_15", role: "user", text: "黄金交易要交税吗？" }),
		),
		insMsg.bind(
			"m_seed_16", ANON_OWNER, "c_gold_tax", "ai",
			msgPayload({
				id: "m_seed_16", role: "ai",
				paras: [
					["这要看你买的形式和所在地。实物金条、纸黄金、黄金 ETF、积存金的税务处理各不相同。简单说：个人长期持有实物黄金通常在卖出时才可能涉及，频繁交易的收益更可能被视作应税所得。"],
					["要不要我根据你的实际情况，整理一份更具体的说明？"],
				],
			}),
		),

		// ── tasks (5 rows) ───────────────────────────────────────────────
		insTask.bind(
			"t_gold_alert", ANON_OWNER, "gold", "金价异动提醒", "active",
			JSON.stringify({
				iconColor: "#d4a64a", triggerType: "condition",
				trigger: "日内涨跌超 ±1.5% 或趋势反转",
				last: "今天 09:14", next: "实时监控中",
				result: "现货黄金 $2,412/oz，较昨日 +2.8%，触发上涨提醒。", resultTone: "up",
			}),
		),
		insTask.bind(
			"t_gold_brief", ANON_OWNER, "gold", "每日金价早报", "active",
			JSON.stringify({
				iconColor: "#d4a64a", triggerType: "schedule",
				trigger: "每天 08:00",
				last: "今天 08:00", next: "明天 08:00",
				result: "已推送：金价、美元指数、美债收益率与隔夜要闻摘要。", resultTone: "info",
			}),
		),
		insTask.bind(
			"t_edu_hw", ANON_OWNER, "edu", "作业 & 考试提醒", "active",
			JSON.stringify({
				iconColor: "#635bff", triggerType: "schedule",
				trigger: "工作日 18:30",
				last: "昨天 18:30", next: "今天 18:30",
				result: "明天数学单元测；语文作文初稿待批改。", resultTone: "info",
			}),
		),
		insTask.bind(
			"t_brief", ANON_OWNER, "brief", "每日新闻早报", "active",
			JSON.stringify({
				iconColor: "#ff6a3d", triggerType: "schedule",
				trigger: "每天 07:30",
				last: "今天 07:30", next: "明天 07:30",
				result: "5 条要闻已整理，2 条与你关注的科技、地产相关。", resultTone: "info",
			}),
		),
		insTask.bind(
			"t_health", ANON_OWNER, "health", "久坐提醒", "paused",
			JSON.stringify({
				iconColor: "#1a7f55", triggerType: "condition",
				trigger: "连续静止 > 90 分钟（工作日）",
				last: "前天 15:20", next: "已暂停",
				result: "上次：连续坐 1h52m，建议起身活动。", resultTone: "info",
			}),
		),

		// ── updates (7 rows) ─────────────────────────────────────────────
		insUpdate.bind(
			"u1", ANON_OWNER, "gold", "今天",
			JSON.stringify({
				icon: "trend", color: "#1a7f55", tone: "up",
				title: "金价大幅上涨 +2.8%", time: "今天 09:14",
				summary: "现货黄金突破 $2,412/oz，单日涨幅 2.8%，是近三周最大涨幅。主因避险情绪升温与美元走弱。",
				body: [
					"现货黄金今早突破 $2,412/oz，较昨收上涨 $65.80（+2.8%），创近三周最大单日涨幅。",
					{ list: ["避险情绪升温 — 地缘风险推动资金流入黄金", "美元走弱 — 美元指数 DXY 跌至 103.2", "降息预期升温 — 美债实际收益率回落"] },
					"你的「金价异动提醒」任务已触发本次通知。",
				],
				source: "世界黄金协会 · DXY · 美债 10Y",
			}),
		),
		insUpdate.bind(
			"u2", ANON_OWNER, "gold", "今天",
			JSON.stringify({
				icon: "spark", color: "#d4a64a", tone: "info",
				title: "黄金趋势可能反转", time: "今天 09:15",
				summary: "过去 5 个交易日下跌趋势被打破，短期动能转为上行。要不要我帮你盯住 $2,450 这个关口？",
				body: [
					"过去 5 个交易日的下跌趋势在今天被有效打破：价格站上 5 日与 10 日均线，短期动能转为上行。",
					"如果你打算逢高减仓，$2,450 是上方最近的密集成交区。要不要我帮你盯住这个关口，到了就提醒你？",
				],
				source: "基于你的「金价异动提醒」任务",
			}),
		),
		insUpdate.bind(
			"u7", ANON_OWNER, "edu", "今天",
			JSON.stringify({
				icon: "clock", color: "#635bff", tone: "info",
				title: "待办 · 今晚 20:00 陪孩子复习数学", time: "今天 20:00",
				summary: "你设置的复习提醒：明天数学单元测，5 道第三章易错题已备好。",
				body: [
					"这是你昨天在对话里设置的提醒：今晚 20:00 陪孩子复习数学，重点是第三章「分数」。",
					"5 道易错题（含解析）已经准备好，打开对话即可查看。",
				],
				source: "来自任务「今晚陪孩子复习数学」",
			}),
		),
		insUpdate.bind(
			"u3", ANON_OWNER, "edu", "今天",
			JSON.stringify({
				icon: "book", color: "#635bff", tone: "info",
				title: "明天有数学单元测", time: "今天 07:30",
				summary: "从班级群和校历检测到：明天上午第二节数学单元测，范围是第三章。已为你准备 5 道易错题。",
				body: [
					"从班级群公告和校历里检测到：明天上午第二节是数学单元测，范围为第三章「分数」。",
					"根据孩子最近的练习记录，我整理了 5 道最常出错的题型，并附了讲解思路。",
				],
				source: "班级群 · 校历 · 练习记录",
			}),
		),
		insUpdate.bind(
			"u4", ANON_OWNER, "brief", "今天",
			JSON.stringify({
				icon: "news", color: "#ff6a3d", tone: "info",
				title: "今日早报已就绪", time: "今天 07:30",
				summary: "5 条要闻 · 其中 2 条与你关注的科技、地产相关。点开查看 90 秒速读版。",
				body: [
					{ list: ["央行宣布维持利率不变，符合市场预期", "多家车企下调智能驾驶选装价格（科技 · 你在关注）", "一线城市二手房挂牌量环比下降 6%（地产 · 你在关注）", "国际油价小幅回落，布伦特报 $78.4", "今日多云转晴，22–31°C，适合户外"] },
				],
				source: "每日早报任务 · 07:30 自动生成",
			}),
		),
		insUpdate.bind(
			"u5", ANON_OWNER, "gold", "本周",
			JSON.stringify({
				icon: "trendDown", color: "#c4362b", tone: "down",
				title: "金价回调 -1.6%", time: "昨天 21:40",
				summary: "隔夜美联储官员鹰派发言，金价自高点回落 1.6%。整体仍在上行通道内。",
				body: [
					"隔夜美联储官员发表鹰派言论，金价自日内高点回落 1.6%。回调幅度在正常波动范围内，整体仍处于上行通道。",
				],
				source: "金价异动提醒 · 自动触发",
			}),
		),
		insUpdate.bind(
			"u6", ANON_OWNER, "health", "本周",
			JSON.stringify({
				icon: "heart", color: "#1a7f55", tone: "info",
				title: "本周步数低于目标", time: "周一 20:00",
				summary: "上周日均 4,210 步，低于你设定的 8,000 步目标。要调整提醒时间或目标吗？",
				body: [
					"上周日均 4,210 步，仅达到目标（8,000 步）的 53%。周三、周四几乎全天静坐。",
					"两个建议：把午饭后的散步提醒提前到 12:40；或先把目标调到 6,000 步，循序渐进。",
				],
				source: "健康数据 · 每周一汇总",
			}),
		),
	]);

	console.log("[seed] anon bucket demo data inserted");
}
