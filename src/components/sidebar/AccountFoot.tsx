// Top-right corner account control: a single avatar + chevron button that
// opens one unified dropdown menu. The menu gathers everything that used to be
// separate top-right buttons — recent updates (notifications), AI model
// settings, native app downloads and logout — behind the account icon.

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Icons } from "../../icons/icons";
import { APP_DOWNLOAD_LINKS } from "../../config";
import { useAuthUser, useLogout } from "../../lib/useAuth";
import { useAppStore } from "../../store/useAppStore";

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

// Shared "settings" actions (available signed-in or not).
function DownloadLinks({ onPick }: { onPick: () => void }) {
	return (
		<>
			<a className="nb-account-action" href={APP_DOWNLOAD_LINKS.ios} target="_blank" rel="noopener noreferrer"
				onClick={onPick} data-testid="download-ios-link">
				<Icons.smartphone size={15} />
				下载 iOS 版
			</a>
			<a className="nb-account-action" href={APP_DOWNLOAD_LINKS.mac} target="_blank" rel="noopener noreferrer"
				onClick={onPick} data-testid="download-mac-link">
				<Icons.monitor size={15} />
				下载 Mac 版
			</a>
		</>
	);
}

export function AccountFoot() {
	const { data: user, isLoading } = useAuthUser();
	const logout = useLogout();
	const setAiSetupOpen = useAppStore((s) => s.setAiSetupOpen);
	const setNotifOpen = useAppStore((s) => s.setNotifOpen);
	const [menuOpen, setMenuOpen] = useState(false);
	const close = () => setMenuOpen(false);

	// Keep the bar shape stable while the session query resolves.
	if (isLoading) {
		return <div className="nb-corner-account" data-testid="account-area" />;
	}

	const displayName = user ? (user.name || user.email.split('@')[0]) : '';

	return (
		<div className="nb-corner-account" data-testid="account-area">
			<div className="nb-corner-ctrl">
				<button
					className="fbtn nb-account-trigger"
					title={user ? displayName : '账户'}
					aria-haspopup="menu"
					aria-expanded={menuOpen}
					onClick={() => setMenuOpen((open) => !open)}
					data-testid="account-menu-trigger"
				>
					{user ? (
						<Avatar className="avatar" image={user.image} name={displayName} />
					) : (
						<span className="avatar" style={{ background: 'var(--brand-soft)', color: 'var(--brand-2)' }}>
							<Icons.bee size={14} sw={1.6} />
						</span>
					)}
					<Icons.chevD size={13} style={{ color: 'var(--ink-4)' }} />
				</button>

				{menuOpen && (
					<>
						<div className="nb-scrim" onClick={close} />
						<div className="nb-account-pop" data-testid="account-menu">
							{user ? (
								<>
									<div className="nb-account-id">
										<Avatar className="avatar" image={user.image} name={displayName} />
										<div className="meta">
											<div className="title">{displayName}</div>
											<div className="sub" title={user.email}>{user.email}</div>
										</div>
									</div>
									<div className="nb-account-sep" />
									<button className="nb-account-action" onClick={() => { close(); setNotifOpen(true); }}
										data-testid="notifications-entry">
										<Icons.bell size={15} />
										最近动态
									</button>
									<button className="nb-account-action" onClick={() => { close(); setAiSetupOpen(true); }}
										data-testid="ai-settings-entry">
										<Icons.spark size={15} />
										AI 模型设置
									</button>
									<div className="nb-account-sep" />
									<DownloadLinks onPick={close} />
									<div className="nb-account-sep" />
									<button className="nb-account-action" onClick={() => { close(); logout.mutate(); }}
										disabled={logout.isPending} data-testid="logout-button">
										<Icons.logout size={15} />
										退出登录
									</button>
								</>
							) : (
								<>
									<Link to="/login" className="nb-account-action" onClick={close} data-testid="login-entry">
										<Icons.bee size={15} />
										登录 / 注册
									</Link>
									<div className="nb-account-sep" />
									<button className="nb-account-action" onClick={() => { close(); setAiSetupOpen(true); }}
										data-testid="ai-settings-entry">
										<Icons.spark size={15} />
										AI 模型设置
									</button>
									<div className="nb-account-sep" />
									<DownloadLinks onPick={close} />
								</>
							)}
						</div>
					</>
				)}
			</div>
		</div>
	);
}
