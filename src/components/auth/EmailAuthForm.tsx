// Pure render component: email + password form for both
// "login" and "register" modes. All state lives in LoginCard.

import type { FormEvent } from "react";

type EmailAuthFormProps = {
	mode: "login" | "register";
	email: string;
	password: string;
	name: string;
	error: string | null;
	pending: boolean;
	onEmailChange: (value: string) => void;
	onPasswordChange: (value: string) => void;
	onNameChange: (value: string) => void;
	onSubmit: () => void;
	onSwitchMode: () => void;
};

export function EmailAuthForm({
	mode,
	email,
	password,
	name,
	error,
	pending,
	onEmailChange,
	onPasswordChange,
	onNameChange,
	onSubmit,
	onSwitchMode,
}: EmailAuthFormProps) {
	const isRegister = mode === "register";

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		onSubmit();
	};

	return (
		<form className="nb-auth-form" onSubmit={handleSubmit} data-testid="email-auth-form">
			{isRegister && (
				<div className="field">
					<label className="field-label" htmlFor="auth-name">昵称</label>
					<input
						id="auth-name"
						className="input"
						value={name}
						maxLength={100}
						placeholder="怎么称呼你（可选）"
						onChange={(e) => onNameChange(e.target.value)}
						data-testid="register-name-input"
					/>
				</div>
			)}

			<div className="field">
				<label className="field-label" htmlFor="auth-email">邮箱</label>
				<input
					id="auth-email"
					className="input"
					type="email"
					required
					value={email}
					placeholder="you@example.com"
					autoComplete="email"
					onChange={(e) => onEmailChange(e.target.value)}
					data-testid="login-email-input"
				/>
			</div>

			<div className="field">
				<label className="field-label" htmlFor="auth-password">密码</label>
				<input
					id="auth-password"
					className="input"
					type="password"
					required
					minLength={isRegister ? 8 : undefined}
					value={password}
					placeholder={isRegister ? "至少 8 位" : "输入密码"}
					autoComplete={isRegister ? "new-password" : "current-password"}
					onChange={(e) => onPasswordChange(e.target.value)}
					data-testid="login-password-input"
				/>
			</div>

			{error && (
				<div className="field-error" role="alert" data-testid="auth-error-message">
					{error}
				</div>
			)}

			<button
				type="submit"
				className="btn btn-primary btn-lg nb-auth-submit"
				disabled={pending}
				data-testid="email-auth-submit"
			>
				{pending ? "请稍候…" : isRegister ? "注册" : "登录"}
			</button>

			<div className="nb-auth-switch">
				{isRegister ? "已有账号？" : "还没有账号？"}
				<button
					type="button"
					className="nb-auth-link"
					onClick={onSwitchMode}
					data-testid="auth-mode-switch"
				>
					{isRegister ? "去登录" : "立即注册"}
				</button>
			</div>
		</form>
	);
}
