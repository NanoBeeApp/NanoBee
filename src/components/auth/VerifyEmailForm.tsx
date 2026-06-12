// Pure render component: 6-digit email verification step.
// All state lives in LoginCard.

import type { FormEvent } from "react";

type VerifyEmailFormProps = {
	email: string;
	code: string;
	error: string | null;
	pending: boolean;
	resendNotice: string | null;
	onCodeChange: (value: string) => void;
	onSubmit: () => void;
	onResend: () => void;
	onBack: () => void;
};

export function VerifyEmailForm({
	email,
	code,
	error,
	pending,
	resendNotice,
	onCodeChange,
	onSubmit,
	onResend,
	onBack,
}: VerifyEmailFormProps) {
	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		onSubmit();
	};

	return (
		<form className="nb-auth-form" onSubmit={handleSubmit} data-testid="verify-email-form">
			<p className="nb-auth-verify-hint">
				验证码已发送到 <b>{email}</b>，请输入邮件中的 6 位数字完成验证。
			</p>

			<div className="field">
				<label className="field-label" htmlFor="auth-code">验证码</label>
				<input
					id="auth-code"
					className="input nb-auth-code-input"
					inputMode="numeric"
					pattern="\d{6}"
					maxLength={6}
					required
					value={code}
					placeholder="6 位数字"
					onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, ""))}
					data-testid="verification-code-input"
				/>
			</div>

			{error && (
				<div className="field-error" role="alert" data-testid="verify-error-message">
					{error}
				</div>
			)}
			{resendNotice && <div className="field-hint">{resendNotice}</div>}

			<button
				type="submit"
				className="btn btn-primary btn-lg nb-auth-submit"
				disabled={pending || code.length !== 6}
				data-testid="verification-code-submit"
			>
				{pending ? "验证中…" : "完成验证"}
			</button>

			<div className="nb-auth-switch">
				没收到邮件？
				<button type="button" className="nb-auth-link" onClick={onResend} data-testid="resend-code-button">
					重新发送
				</button>
				<span className="nb-auth-sep">·</span>
				<button type="button" className="nb-auth-link" onClick={onBack} data-testid="back-to-login-button">
					返回登录
				</button>
			</div>
		</form>
	);
}
