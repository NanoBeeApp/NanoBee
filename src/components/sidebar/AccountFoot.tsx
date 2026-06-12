// Sidebar footer account area: shows an avatar-only button when signed in
// (click opens a popover menu with identity info and logout), or a
// login/register entry when signed out.

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Icons } from "../../icons/icons";
import { useAuthUser, useLogout } from "../../lib/useAuth";
import { useAppStore } from "../../store/useAppStore";
import { DownloadAppsMenu } from "./DownloadAppsMenu";

function Avatar({ image, name, className }: { image: string | null | undefined; name: string; className?: string }) {
	if (image) {
		return <img className={className} src={image} alt={name} referrerPolicy="no-referrer" />;
	}
	return (
		<span className={className} style={{ background: '#ffe5da', color: '#7a2e10' }}>
			{name.slice(0, 1).toUpperCase()}
		</span>
	);
}

export function AccountFoot() {
	const { data: user, isLoading } = useAuthUser();
	const logout = useLogout();
	const setAiSetupOpen = useAppStore((s) => s.setAiSetupOpen);
	const [menuOpen, setMenuOpen] = useState(false);

	if (isLoading) {
		return <div className="nb-side-foot" data-testid="account-area" />;
	}

	if (!user) {
		return (
			<div className="nb-side-foot" data-testid="account-area">
				<Link to="/login" className="nb-item nb-login-entry" data-testid="login-entry">
					<span className="avatar avatar-sm" style={{ background: 'var(--brand-soft)', color: 'var(--brand-2)' }}>
						<Icons.bee size={14} sw={1.6} />
					</span>
					<div className="meta">
						<div className="title">登录 / 注册</div>
						<div className="sub">同步你的对话与任务</div>
					</div>
					<span style={{ color: 'var(--ink-4)' }}><Icons.chevR size={15} /></span>
				</Link>
			</div>
		);
	}

	const displayName = user.name || user.email.split('@')[0];

	return (
		<div className="nb-side-foot" data-testid="account-area">
			<button
				className="nb-account-trigger"
				title={displayName}
				aria-haspopup="menu"
				aria-expanded={menuOpen}
				onClick={() => setMenuOpen((open) => !open)}
				data-testid="account-menu-trigger"
			>
				<Avatar className="avatar" image={user.image} name={displayName} />
			</button>

			<DownloadAppsMenu />

			{menuOpen && (
				<>
					<div className="nb-scrim" onClick={() => setMenuOpen(false)} />
					<div className="nb-account-pop" data-testid="account-menu">
						<div className="nb-account-id">
							<Avatar className="avatar" image={user.image} name={displayName} />
							<div className="meta">
								<div className="title">{displayName}</div>
								<div className="sub" title={user.email}>{user.email}</div>
							</div>
						</div>
						<div className="nb-account-sep" />
						<button
							className="nb-account-action"
							onClick={() => { setMenuOpen(false); setAiSetupOpen(true); }}
							data-testid="ai-settings-entry"
						>
							<Icons.spark size={15} />
							AI 模型设置
						</button>
						<button
							className="nb-account-action"
							onClick={() => { setMenuOpen(false); logout.mutate(); }}
							disabled={logout.isPending}
							data-testid="logout-button"
						>
							<Icons.logout size={15} />
							退出登录
						</button>
					</div>
				</>
			)}
		</div>
	);
}
