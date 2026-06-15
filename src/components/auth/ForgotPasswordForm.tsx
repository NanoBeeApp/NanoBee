/**
 * Forgot-password and reset-password flow forms.
 * ForgotPasswordForm: collect email → POST /api/auth/forgot-password.
 * ResetPasswordForm: collect code + new password → POST /api/auth/reset-password.
 * Both are pure render components; state lives in LoginCard.
 */

import type { FormEvent } from "react";

// ---------------------------------------------------------------------------
// Step 1: request a code
// ---------------------------------------------------------------------------

type ForgotPasswordFormProps = {
	email: string;
	error: string | null;
	notice: string | null;
	pending: boolean;
	onEmailChange: (v: string) => void;
	onSubmit: () => void;
	onBack: () => void;
};

export function ForgotPasswordForm({
	email,
	error,
	notice,
	pending,
	onEmailChange,
	onSubmit,
	onBack,
}: ForgotPasswordFormProps) {
	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		onSubmit();
	};

	return (
		<form className="nb-auth-form" onSubmit={handleSubmit} data-testid="forgot-password-form">
			<p className="nb-auth-verify-hint">
				Enter your account email address and we will send you a 6-digit reset code.
			</p>

			<div className="field">
				<label className="field-label" htmlFor="reset-email">Email</label>
				<input
					id="reset-email"
					className="input"
					type="email"
					required
					value={email}
					placeholder="you@example.com"
					autoComplete="email"
					onChange={(e) => onEmailChange(e.target.value)}
					data-testid="forgot-email-input"
				/>
			</div>

			{error && (
				<div className="field-error" role="alert" data-testid="forgot-error">
					{error}
				</div>
			)}

			{notice && (
				<div
					className="nb-auth-verify-hint"
					role="status"
					style={{ color: "var(--success)", marginTop: 0 }}
					data-testid="forgot-notice"
				>
					{notice}
				</div>
			)}

			<button
				type="submit"
				className="btn btn-primary btn-lg nb-auth-submit"
				disabled={pending}
				data-testid="forgot-submit"
			>
				{pending ? "Sending…" : "Send reset code"}
			</button>

			<div className="nb-auth-switch">
				<button type="button" className="nb-auth-link" onClick={onBack} data-testid="forgot-back">
					Back to login
				</button>
			</div>
		</form>
	);
}

// ---------------------------------------------------------------------------
// Step 2: enter code + new password
// ---------------------------------------------------------------------------

type ResetPasswordFormProps = {
	email: string;
	code: string;
	password: string;
	confirmPassword: string;
	error: string | null;
	pending: boolean;
	onCodeChange: (v: string) => void;
	onPasswordChange: (v: string) => void;
	onConfirmChange: (v: string) => void;
	onSubmit: () => void;
	onBack: () => void;
};

export function ResetPasswordForm({
	email,
	code,
	password,
	confirmPassword,
	error,
	pending,
	onCodeChange,
	onPasswordChange,
	onConfirmChange,
	onSubmit,
	onBack,
}: ResetPasswordFormProps) {
	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		onSubmit();
	};

	const mismatch = confirmPassword.length > 0 && password !== confirmPassword;
	const canSubmit = !pending && code.length === 6 && password.length >= 8 && !mismatch;

	return (
		<form className="nb-auth-form" onSubmit={handleSubmit} data-testid="reset-password-form">
			<p className="nb-auth-verify-hint">
				We sent a 6-digit code to <b>{email}</b>. Enter it below along with your new password.
			</p>

			<div className="field">
				<label className="field-label" htmlFor="reset-code">Reset code</label>
				<input
					id="reset-code"
					className="input nb-auth-code-input"
					type="text"
					inputMode="numeric"
					pattern="[0-9]{6}"
					maxLength={6}
					required
					value={code}
					placeholder="000000"
					autoComplete="one-time-code"
					onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
					data-testid="reset-code-input"
				/>
			</div>

			<div className="field">
				<label className="field-label" htmlFor="reset-new-password">New password</label>
				<input
					id="reset-new-password"
					className="input"
					type="password"
					minLength={8}
					required
					value={password}
					placeholder="At least 8 characters"
					autoComplete="new-password"
					onChange={(e) => onPasswordChange(e.target.value)}
					data-testid="reset-new-password-input"
				/>
			</div>

			<div className="field">
				<label className="field-label" htmlFor="reset-confirm-password">Confirm new password</label>
				<input
					id="reset-confirm-password"
					className={`input${mismatch ? " is-invalid" : ""}`}
					type="password"
					required
					value={confirmPassword}
					placeholder="Repeat new password"
					autoComplete="new-password"
					onChange={(e) => onConfirmChange(e.target.value)}
					data-testid="reset-confirm-password-input"
				/>
				{mismatch && <div className="field-error">Passwords do not match</div>}
			</div>

			{error && (
				<div className="field-error" role="alert" data-testid="reset-error">
					{error}
				</div>
			)}

			<button
				type="submit"
				className="btn btn-primary btn-lg nb-auth-submit"
				disabled={!canSubmit}
				data-testid="reset-submit"
			>
				{pending ? "Resetting…" : "Set new password"}
			</button>

			<div className="nb-auth-switch">
				<button type="button" className="nb-auth-link" onClick={onBack} data-testid="reset-back">
					Back
				</button>
			</div>
		</form>
	);
}
