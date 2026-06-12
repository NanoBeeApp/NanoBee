/**
 * Built-in skills: local agent tools that need no external service.
 *
 * A skill is just an AgentTool defined in-process. To add one, append it to
 * `SKILLS` — the collector and the model pick it up automatically.
 *
 * Current skills:
 *   - get_current_time: date/time in any IANA timezone (models have no clock)
 *   - calculate: exact arithmetic via a tiny recursive-descent parser
 *     (Workers forbid eval/new Function, and LLMs are unreliable at math)
 */

import type { AgentTool } from "./tools";

/* ----------------------------- get_current_time ---------------------------- */

const getCurrentTime: AgentTool = {
	name: "get_current_time",
	description:
		"Get the current date and time. Use when the user asks about now/today or when an answer depends on the current date. Optionally pass an IANA timezone like 'Asia/Shanghai' (the default) or 'America/New_York'.",
	parameters: {
		type: "object",
		properties: {
			timezone: {
				type: "string",
				description: "IANA timezone name; defaults to Asia/Shanghai.",
			},
		},
	},
	execute: async (args) => {
		const tz = typeof args.timezone === "string" && args.timezone ? args.timezone : "Asia/Shanghai";
		try {
			const formatted = new Intl.DateTimeFormat("zh-CN", {
				dateStyle: "full",
				timeStyle: "long",
				timeZone: tz,
			}).format(new Date());
			return `${formatted}（时区 ${tz}）`;
		} catch {
			throw new Error(`Unknown timezone: ${tz}`);
		}
	},
};

/* --------------------------------- calculate ------------------------------- */

/**
 * Evaluate an arithmetic expression with a recursive-descent parser.
 * Grammar: expr := term (("+"|"-") term)*
 *          term := factor (("*"|"/"|"%") factor)*
 *          factor := ("-"|"+")* primary ("^" factor)?   (right-assoc power)
 *          primary := number | "(" expr ")"
 */
function evaluateExpression(input: string): number {
	let pos = 0;
	const src = input.replace(/\s+/g, "");

	const peek = () => src[pos];
	const fail = (): never => {
		throw new Error(`Invalid expression at position ${pos}: ${input}`);
	};

	function primary(): number {
		if (peek() === "(") {
			pos++;
			const v = expr();
			if (peek() !== ")") fail();
			pos++;
			return v;
		}
		const m = /^\d+(\.\d+)?/.exec(src.slice(pos));
		if (!m) fail();
		pos += m![0].length;
		return Number(m![0]);
	}

	function factor(): number {
		let sign = 1;
		while (peek() === "-" || peek() === "+") {
			if (peek() === "-") sign = -sign;
			pos++;
		}
		const base = primary();
		if (peek() === "^") {
			pos++;
			return sign * base ** factor();
		}
		return sign * base;
	}

	function term(): number {
		let v = factor();
		while (peek() === "*" || peek() === "/" || peek() === "%") {
			const op = src[pos++];
			const rhs = factor();
			if (op === "*") v *= rhs;
			else if (op === "/") v /= rhs;
			else v %= rhs;
		}
		return v;
	}

	function expr(): number {
		let v = term();
		while (peek() === "+" || peek() === "-") {
			const op = src[pos++];
			const rhs = term();
			v = op === "+" ? v + rhs : v - rhs;
		}
		return v;
	}

	const result = expr();
	if (pos !== src.length) fail();
	return result;
}

const calculate: AgentTool = {
	name: "calculate",
	description:
		"Evaluate an arithmetic expression exactly (+, -, *, /, %, ^, parentheses). Use for any numeric computation instead of doing math in your head.",
	parameters: {
		type: "object",
		properties: {
			expression: {
				type: "string",
				description: "The arithmetic expression, e.g. '(3+5)*7-2' or '2^10'.",
			},
		},
		required: ["expression"],
	},
	execute: async (args) => {
		const expression = typeof args.expression === "string" ? args.expression : "";
		if (!expression) throw new Error("expression is required");
		const value = evaluateExpression(expression);
		if (!Number.isFinite(value)) throw new Error("Expression did not produce a finite number");
		return `${expression} = ${value}`;
	},
};

/* --------------------------------- registry -------------------------------- */

const SKILLS: AgentTool[] = [getCurrentTime, calculate];

/** All built-in skills (synchronous — they carry no I/O at registration). */
export function skillTools(): AgentTool[] {
	return SKILLS;
}
