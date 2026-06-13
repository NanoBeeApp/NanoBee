// Top-right corner account control: an avatar-only button when signed in
// (click opens a popover menu with identity info and logout), or a login/
// register icon button when signed out. Sits in the floating top-right bar
// alongside the settings menu and the notification bell.

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Icons } from "../../icons/icons";
import { useAuthUser, useLogout } from "../../lib/useAuth";
import { useAppStore } from "../../store/useAppStore";
import { SettingsMenu } from "./SettingsMenu";

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

	// While auth resolves, still surface the settings control so the bar shape
	// stays stable and settings remain reachable.
	if (isLoading) {
		return (
			<div className="nb-corner-account" data-testid="account-area">
				<SettingsMenu />
			</div>
		);
	}

	if (!user) {
		return (
			<div className="nb-corner-account" data-testid="account-area">
				<SettingsMenu />
				<Link to="/login" className="fbtn" title="登录 / 注册" data-testid="login-entry">
					<Icons.bee size={16} sw={1.6} />
				</Link>
			</div>
		);
	}

	const displayName = user.name || user.email.split('@')[0];

	return (
		<div className="nb-corner-account" data-testid="account-area">
			<SettingsMenu />

			<div className="nb-corner-ctrl">
				<button
					className="fbtn nb-account-trigger"
					title={displayName}
					aria-haspopup="menu"
					aria-expanded={menuOpen}
					onClick={() => setMenuOpen((open) => !open)}
					data-testid="account-menu-trigger"
				>
					<Avatar className="avatar" image={user.image} name={displayName} />
				</button>

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
		</div>
	);
}
