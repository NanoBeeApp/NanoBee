// Sidebar footer account area: shows the signed-in user with a logout
// action, or a login/register entry when signed out.

import { Link } from "@tanstack/react-router";
import { Icons } from "../../icons/icons";
import { useAuthUser, useLogout } from "../../lib/useAuth";

export function AccountFoot() {
	const { data: user, isLoading } = useAuthUser();
	const logout = useLogout();

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
			<div className="nb-item" style={{ cursor: 'default' }} data-testid="account-summary">
				{user.image ? (
					<img className="avatar avatar-sm" src={user.image} alt={displayName} referrerPolicy="no-referrer" />
				) : (
					<span className="avatar avatar-sm" style={{ background: '#ffe5da', color: '#7a2e10' }}>
						{displayName.slice(0, 1).toUpperCase()}
					</span>
				)}
				<div className="meta">
					<div className="title">{displayName}</div>
					<div className="sub" title={user.email}>{user.email}</div>
				</div>
				<button
					className="btn btn-ghost btn-icon btn-sm"
					title="退出登录"
					onClick={() => logout.mutate()}
					disabled={logout.isPending}
					data-testid="logout-button"
				>
					<Icons.x size={14} />
				</button>
			</div>
		</div>
	);
}
