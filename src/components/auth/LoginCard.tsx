// State component for the login page: owns the auth flow state
// (login / register / verify-email) and calls the /api/auth endpoints.
// Rendering is delegated to the pure form components.

import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { AUTH_USER_QUERY_KEY } from "@/lib/useAuth";
import { EmailAuthForm } from "./EmailAuthForm";
import { VerifyEmailForm } from "./VerifyEmailForm";
import { OAuthButtons } from "./OAuthButtons";

type Mode = "login" | "register" | "verify";

// Server error codes → user-facing copy (includes OAuth callback errors).
const ERROR_MESSAGES: Record<string, string> = {
	email_taken: "这个邮箱已经注册过了，请直接登录",
	invalid_credentials: "邮箱或密码不正确",
	no_password_set: "这个账号是通过第三方登录创建的，请使用 Google 或 GitHub 登录",
	email_not_verified: "邮箱还未验证，已重新发送验证码",
	invalid_code: "验证码不正确或已过期",
	too_many_codes: "发送太频繁了，请一小时后再试",
	email_send_failed: "验证码邮件发送失败，请稍后重试",
	provider_not_configured: "该登录方式暂未开通",
	invalid_state: "登录链接已过期，请重新发起登录",
	oauth_denied: "你取消了第三方授权",
	oauth_exchange_failed: "第三方登录失败，请重试",
	oauth_profile_failed: "获取第三方账号信息失败，请重试",
	user_resolve_failed: "登录失败，请重试",
};

function messageFor(code: string | null): string | null {
	if (!code) return null;
	return ERROR_MESSAGES[code] ?? "操作失败，请稍后重试";
}

/** OAuth callback errors arrive as /login?error=<code>. */
function initialOAuthError(): string | null {
	if (typeof window === "undefined") return null;
	return messageFor(new URLSearchParams(window.location.search).get("error"));
}

export function LoginCard() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const [mode, setMode] = useState<Mode>("login");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [name, setName] = useState("");
	const [code, setCode] = useState("");
	const [error, setError] = useState<string | null>(initialOAuthError);
	const [resendNotice, setResendNotice] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	const finishLogin = async () => {
		await queryClient.invalidateQueries({ queryKey: AUTH_USER_QUERY_KEY });
		navigate({ to: "/" });
	};

	const run = async (fn: () => Promise<void>) => {
		setPending(true);
		setError(null);
		setResendNotice(null);
		try {
			await fn();
		} catch (e) {
			console.error("[AUTH] request failed:", String(e));
			setError("网络异常，请稍后重试");
		} finally {
			setPending(false);
		}
	};

	const submitEmailAuth = () =>
		run(async () => {
			if (mode === "register") {
				const res = await apiClient.auth.register.$post({
					json: { email, password, name },
				});
				const data = (await res.json()) as { error?: string };
				if (!res.ok) return setError(messageFor(data.error ?? null));
				setMode("verify");
			} else {
				const res = await apiClient.auth.login.$post({
					json: { email, password },
				});
				const data = (await res.json()) as {
					error?: string;
					needsVerification?: boolean;
				};
				if (res.ok) return finishLogin();
				if (data.needsVerification) {
					setMode("verify");
					setResendNotice("邮箱还未验证，已重新发送验证码");
					return;
				}
				setError(messageFor(data.error ?? null));
			}
		});

	const submitCode = () =>
		run(async () => {
			const res = await apiClient.auth["verify-email"].$post({
				json: { email, code },
			});
			const data = (await res.json()) as { error?: string };
			if (!res.ok) return setError(messageFor(data.error ?? null));
			await finishLogin();
		});

	const resendCode = () =>
		run(async () => {
			const res = await apiClient.auth["resend-code"].$post({
				json: { email },
			});
			const data = (await res.json()) as { error?: string };
			if (!res.ok) return setError(messageFor(data.error ?? null));
			setResendNotice("验证码已重新发送，请查收邮箱");
		});

	const switchMode = () => {
		setError(null);
		setMode(mode === "register" ? "login" : "register");
	};

	return (
		<div className="nb-auth-card" data-testid="login-card">
			<h1 className="nb-auth-title">
				{mode === "verify" ? "验证你的邮箱" : mode === "register" ? "创建账号" : "欢迎回来"}
			</h1>
			<p className="nb-auth-sub">
				{mode === "verify"
					? "最后一步，确认这个邮箱属于你"
					: "登录 NanoBee，让 AI 助理主动为你盯着重要的事"}
			</p>

			{mode === "verify" ? (
				<VerifyEmailForm
					email={email}
					code={code}
					error={error}
					pending={pending}
					resendNotice={resendNotice}
					onCodeChange={setCode}
					onSubmit={submitCode}
					onResend={resendCode}
					onBack={() => {
						setCode("");
						setError(null);
						setMode("login");
					}}
				/>
			) : (
				<>
					<OAuthButtons returnTo="/" />
					<div className="nb-auth-divider" role="separator">
						<span>或使用邮箱{mode === "register" ? "注册" : "登录"}</span>
					</div>
					<EmailAuthForm
						mode={mode}
						email={email}
						password={password}
						name={name}
						error={error}
						pending={pending}
						onEmailChange={setEmail}
						onPasswordChange={setPassword}
						onNameChange={setName}
						onSubmit={submitEmailAuth}
						onSwitchMode={switchMode}
					/>
				</>
			)}
		</div>
	);
}
