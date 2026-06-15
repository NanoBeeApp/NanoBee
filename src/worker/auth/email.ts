/**
 * Verification email delivery via the Resend HTTP API.
 * Falls back to logging the code when no API key is configured
 * (local development without secrets).
 */

import { CONFIG } from "../config";
import type { Env } from "../api-worker";

/** Send a 6-digit verification code; returns false when delivery failed. */
export async function sendVerificationCode(
	env: Env,
	email: string,
	code: string,
): Promise<boolean> {
	// Local-dev escape hatch: surface the code in the dev server log so the
	// flow can be exercised without a mailbox. Never enable in production.
	if (env.LOG_EMAIL_CODES === "1") {
		console.log(`[AUTH] verification code for ${email}: ${code}`);
	}

	if (!env.RESEND_API_KEY) {
		console.warn("[AUTH] RESEND_API_KEY not set — email not sent");
		return env.LOG_EMAIL_CODES === "1";
	}

	const from = env.EMAIL_FROM || CONFIG.AUTH.DEFAULT_EMAIL_FROM;
	const minutes = Math.floor(CONFIG.AUTH.EMAIL_CODE_TTL_SECONDS / 60);
	const res = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${env.RESEND_API_KEY}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			from,
			to: [email],
			subject: `NanoBee 邮箱验证码：${code}`,
			html: buildCodeEmailHtml(code, minutes),
			text: `你的 NanoBee 邮箱验证码是 ${code}，${minutes} 分钟内有效。如果不是你本人操作，请忽略这封邮件。`,
		}),
	});

	if (!res.ok) {
		const body = await res.text();
		console.error(`[AUTH] Resend send failed: ${res.status} ${body}`);
		return false;
	}
	const data = (await res.json()) as { id?: string };
	console.log(`[AUTH] verification email sent to ${email}, id=${data.id}`);
	return true;
}

/** Send a 6-digit password-reset code; returns false when delivery failed. */
export async function sendPasswordResetCode(
	env: Env,
	email: string,
	code: string,
): Promise<boolean> {
	if (env.LOG_EMAIL_CODES === "1") {
		console.log(`[AUTH] password-reset code for ${email}: ${code}`);
	}

	if (!env.RESEND_API_KEY) {
		console.warn("[AUTH] RESEND_API_KEY not set — reset email not sent");
		return env.LOG_EMAIL_CODES === "1";
	}

	const from = env.EMAIL_FROM || CONFIG.AUTH.DEFAULT_EMAIL_FROM;
	const minutes = Math.floor(CONFIG.AUTH.EMAIL_CODE_TTL_SECONDS / 60);
	const res = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${env.RESEND_API_KEY}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			from,
			to: [email],
			subject: `NanoBee Password Reset Code: ${code}`,
			html: buildResetEmailHtml(code, minutes),
			text: `Your NanoBee password reset code is ${code}. It expires in ${minutes} minutes. If you did not request a password reset, please ignore this email.`,
		}),
	});

	if (!res.ok) {
		const body = await res.text();
		console.error(`[AUTH] Resend send failed (reset): ${res.status} ${body}`);
		return false;
	}
	const data = (await res.json()) as { id?: string };
	console.log(`[AUTH] reset email sent to ${email}, id=${data.id}`);
	return true;
}

function buildCodeEmailHtml(code: string, minutes: number): string {
	return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:420px;margin:0 auto;padding:32px 24px;color:#0f1117;">
	<div style="font-size:18px;font-weight:700;margin-bottom:16px;">Nano<span style="color:#635bff;">Bee</span></div>
	<p style="font-size:14px;color:#2a2d36;margin:0 0 20px;">你好，请使用下面的验证码完成邮箱验证：</p>
	<div style="font-size:32px;font-weight:700;letter-spacing:8px;background:#f6f8fa;border-radius:12px;padding:16px 0;text-align:center;margin-bottom:20px;">${code}</div>
	<p style="font-size:13px;color:#5a5e6b;margin:0;">验证码 ${minutes} 分钟内有效。如果这不是你本人的操作，请忽略这封邮件。</p>
</div>`;
}

function buildResetEmailHtml(code: string, minutes: number): string {
	return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:420px;margin:0 auto;padding:32px 24px;color:#0f1117;">
	<div style="font-size:18px;font-weight:700;margin-bottom:16px;">Nano<span style="color:#635bff;">Bee</span></div>
	<p style="font-size:14px;color:#2a2d36;margin:0 0 20px;">We received a request to reset your NanoBee password. Use the code below:</p>
	<div style="font-size:32px;font-weight:700;letter-spacing:8px;background:#f6f8fa;border-radius:12px;padding:16px 0;text-align:center;margin-bottom:20px;">${code}</div>
	<p style="font-size:13px;color:#5a5e6b;margin:0;">This code expires in ${minutes} minutes. If you did not request a password reset, you can safely ignore this email — your password has not been changed.</p>
</div>`;
}
