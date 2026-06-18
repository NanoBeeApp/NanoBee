/**
 * Account section within the /settings master-detail panel.
 * Now the single home for everything the (removed) top-right avatar dropdown
 * used to own. Top to bottom:
 *   0. Identity — avatar + name + email header
 *   1. Profile — change display name
 *   2. Security — change password (email accounts only)
 *   3. Sessions — list + revoke active sessions
 *   4. Data — export + delete account (with explicit confirm step)
 *   5. Apps & session — native app downloads + sign out
 *
 * Rendered as the "account" pane of AiSettingsForm when the user clicks the
 * "Account" row in the master list. Requires the user to be signed in (the
 * parent SettingsView guards the entire form behind an auth check).
 */

import { useState } from "react";
import { Icons } from "../../icons/icons";
import { APP_DOWNLOAD_LINKS } from "../../config";
import { useLogout, type SessionUser } from "../../lib/useAuth";
import {
	accountMessageFor,
	useChangeName,
	useChangePassword,
	useDeleteAccount,
	useExportData,
	useRevokeSession,
	useSessions,
	type SessionItem,
} from "../../lib/useAccount";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(unixSec: number): string {
	const diffSec = Math.floor(Date.now() / 1000) - unixSec;
	if (diffSec < 60) return "just now";
	if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
	if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
	return `${Math.floor(diffSec / 86400)}d ago`;
}

/** Avatar image with an initials fallback (ported from the old AccountFoot). */
function Avatar({ image, name }: { image: string | null; name: string }) {
	if (image) {
		return (
			<img
				className="avatar avatar-lg"
				src={image}
				alt={name}
				referrerPolicy="no-referrer"
			/>
		);
	}
	return (
		<span className="avatar avatar-lg" style={{ background: "#ffe5da", color: "#7a2e10" }}>
			{(name || "?").slice(0, 1).toUpperCase()}
		</span>
	);
}

function parseUserAgent(ua: string | null): string {
	if (!ua) return "Unknown device";
	// Very simple UA parse — just enough for a human-readable label.
	if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
	if (/Android/.test(ua)) return "Android";
	if (/Macintosh/.test(ua)) return "Mac";
	if (/Windows/.test(ua)) return "Windows";
	if (/Linux/.test(ua)) return "Linux";
	return "Unknown device";
}

// ---------------------------------------------------------------------------
// Identity header: avatar + name + email
// ---------------------------------------------------------------------------

function IdentityHeader({ user }: { user: SessionUser }) {
	const displayName = user.name || user.email.split("@")[0];
	return (
		<div className="nb-acct-section nb-acct-identity" data-testid="account-identity">
			<Avatar image={user.image} name={displayName} />
			<div className="nb-acct-identity-meta">
				<div className="nb-acct-identity-name">{displayName}</div>
				<div className="nb-acct-identity-email" title={user.email}>{user.email}</div>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Apps & session: native app downloads + sign out
// ---------------------------------------------------------------------------

function AppsSection() {
	const logout = useLogout();
	return (
		<div className="nb-acct-section" data-testid="account-apps">
			<h3 className="nb-acct-section-title">Apps & session</h3>

			<div className="nb-acct-data-row">
				<div className="nb-acct-data-info">
					<span className="nb-acct-data-label">Download apps</span>
					<span className="nb-acct-data-hint">Get the native iOS and Mac apps.</span>
				</div>
				<div className="nb-acct-apps-links">
					<a
						className="btn btn-secondary btn-sm"
						href={APP_DOWNLOAD_LINKS.ios}
						target="_blank"
						rel="noopener noreferrer"
						data-testid="account-download-ios"
					>
						<Icons.smartphone size={13} />
						iOS
					</a>
					<a
						className="btn btn-secondary btn-sm"
						href={APP_DOWNLOAD_LINKS.mac}
						target="_blank"
						rel="noopener noreferrer"
						data-testid="account-download-mac"
					>
						<Icons.monitor size={13} />
						Mac
					</a>
				</div>
			</div>

			<div className="nb-acct-data-row">
				<div className="nb-acct-data-info">
					<span className="nb-acct-data-label">Sign out</span>
					<span className="nb-acct-data-hint">Sign out of NanoBee on this device.</span>
				</div>
				<button
					type="button"
					className="btn btn-secondary btn-sm"
					disabled={logout.isPending}
					onClick={() => logout.mutate()}
					data-testid="account-signout"
				>
					<Icons.logout size={13} />
					{logout.isPending ? "Signing out…" : "Sign out"}
				</button>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Profile sub-section: change display name
// ---------------------------------------------------------------------------

function ProfileSection({ user }: { user: SessionUser }) {
	const [name, setName] = useState(user.name || "");
	const [msg, setMsg] = useState<string | null>(null);
	const [isError, setIsError] = useState(false);
	const changeName = useChangeName();

	const handleSave = async () => {
		const trimmed = name.trim();
		if (!trimmed || trimmed === user.name) return;
		setMsg(null);
		try {
			await changeName.mutateAsync(trimmed);
			setMsg("Name updated");
			setIsError(false);
		} catch (e) {
			setMsg(accountMessageFor(e instanceof Error ? e.message : null));
			setIsError(true);
		}
	};

	return (
		<div className="nb-acct-section" data-testid="account-profile">
			<h3 className="nb-acct-section-title">Profile</h3>
			<div className="field">
				<label className="field-label" htmlFor="acct-name">Display name</label>
				<div className="nb-acct-row">
					<input
						id="acct-name"
						className="input"
						value={name}
						maxLength={100}
						placeholder="Your name"
						onChange={(e) => { setName(e.target.value); setMsg(null); }}
						data-testid="account-name-input"
					/>
					<button
						type="button"
						className="btn btn-secondary btn-sm"
						disabled={changeName.isPending || !name.trim() || name.trim() === user.name}
						onClick={handleSave}
						data-testid="account-name-save"
					>
						{changeName.isPending ? "Saving…" : "Save"}
					</button>
				</div>
				{msg && (
					<p className={isError ? "field-error" : "nb-acct-hint-ok"} role="status">
						{msg}
					</p>
				)}
			</div>
			<div className="field" style={{ marginTop: 8 }}>
				<span className="field-label">Email</span>
				<p className="nb-acct-email">{user.email}</p>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Security sub-section: change password
// ---------------------------------------------------------------------------

function SecuritySection() {
	const [current, setCurrent] = useState("");
	const [next, setNext] = useState("");
	const [confirm, setConfirm] = useState("");
	const [msg, setMsg] = useState<string | null>(null);
	const [isError, setIsError] = useState(false);
	const [showCurrent, setShowCurrent] = useState(false);
	const [showNext, setShowNext] = useState(false);
	const changePassword = useChangePassword();

	const canSubmit =
		current.length >= 1 &&
		next.length >= 8 &&
		next === confirm &&
		!changePassword.isPending;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!canSubmit) return;
		setMsg(null);
		try {
			await changePassword.mutateAsync({ currentPassword: current, newPassword: next });
			setMsg("Password changed — other sessions have been signed out");
			setIsError(false);
			setCurrent(""); setNext(""); setConfirm("");
		} catch (e) {
			setMsg(accountMessageFor(e instanceof Error ? e.message : null));
			setIsError(true);
		}
	};

	return (
		<div className="nb-acct-section" data-testid="account-security">
			<h3 className="nb-acct-section-title">Security</h3>
			<form className="nb-acct-pw-form" onSubmit={handleSubmit}>
				<div className="field">
					<label className="field-label" htmlFor="acct-pw-current">Current password</label>
					<div className="nb-ai-key-wrap">
						<input
							id="acct-pw-current"
							className="input"
							type={showCurrent ? "text" : "password"}
							autoComplete="current-password"
							value={current}
							placeholder="Current password"
							onChange={(e) => { setCurrent(e.target.value); setMsg(null); }}
							data-testid="account-current-password"
						/>
						<button type="button" className="nb-ai-key-eye" onClick={() => setShowCurrent((s) => !s)} aria-label={showCurrent ? "Hide" : "Show"}>
							<Icons.eye size={15} />
						</button>
					</div>
				</div>
				<div className="field">
					<label className="field-label" htmlFor="acct-pw-next">New password</label>
					<div className="nb-ai-key-wrap">
						<input
							id="acct-pw-next"
							className="input"
							type={showNext ? "text" : "password"}
							autoComplete="new-password"
							minLength={8}
							value={next}
							placeholder="At least 8 characters"
							onChange={(e) => { setNext(e.target.value); setMsg(null); }}
							data-testid="account-new-password"
						/>
						<button type="button" className="nb-ai-key-eye" onClick={() => setShowNext((s) => !s)} aria-label={showNext ? "Hide" : "Show"}>
							<Icons.eye size={15} />
						</button>
					</div>
				</div>
				<div className="field">
					<label className="field-label" htmlFor="acct-pw-confirm">Confirm new password</label>
					<input
						id="acct-pw-confirm"
						type="password"
						autoComplete="new-password"
						value={confirm}
						placeholder="Repeat new password"
						className={`input${confirm && next !== confirm ? " is-invalid" : ""}`}
						onChange={(e) => { setConfirm(e.target.value); setMsg(null); }}
						data-testid="account-confirm-password"
					/>
					{confirm && next !== confirm && (
						<p className="field-error">Passwords do not match</p>
					)}
				</div>
				{msg && (
					<p className={isError ? "field-error" : "nb-acct-hint-ok"} role="status">
						{msg}
					</p>
				)}
				<button
					type="submit"
					className="btn btn-secondary btn-sm"
					disabled={!canSubmit}
					data-testid="account-change-password-submit"
				>
					{changePassword.isPending ? "Saving…" : "Change password"}
				</button>
			</form>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Sessions sub-section
// ---------------------------------------------------------------------------

function SessionRow({ session, onRevoke, revoking }: {
	session: SessionItem;
	onRevoke: (id: string) => void;
	revoking: boolean;
}) {
	const device = parseUserAgent(session.userAgent);
	return (
		<div className="nb-acct-session" data-current={session.current || undefined} data-testid={`session-row-${session.id}`}>
			<span className="nb-acct-session-ic" aria-hidden="true">
				<Icons.monitor size={14} />
			</span>
			<div className="nb-acct-session-info">
				<span className="nb-acct-session-device">
					{device}
					{session.current && (
						<span className="nb-acct-session-badge">current</span>
					)}
				</span>
				<span className="nb-acct-session-meta">
					{session.ip ? `${session.ip} · ` : ""}
					Last seen {session.lastSeenAt != null ? formatRelativeTime(session.lastSeenAt) : "unknown"}
				</span>
			</div>
			{!session.current && (
				<button
					type="button"
					className="btn btn-ghost btn-sm"
					disabled={revoking}
					onClick={() => onRevoke(session.id)}
					data-testid={`session-revoke-${session.id}`}
				>
					{revoking ? "…" : "Sign out"}
				</button>
			)}
		</div>
	);
}

function SessionsSection() {
	const sessions = useSessions();
	const revoke = useRevokeSession();
	const [revoking, setRevoking] = useState<string | null>(null);
	const [msg, setMsg] = useState<string | null>(null);
	const [isError, setIsError] = useState(false);

	const handleRevoke = async (sessionId: string) => {
		setRevoking(sessionId);
		setMsg(null);
		try {
			await revoke.mutateAsync({ sessionId, mode: "one" });
			setMsg("Session signed out");
			setIsError(false);
		} catch (e) {
			setMsg(accountMessageFor(e instanceof Error ? e.message : null));
			setIsError(true);
		} finally {
			setRevoking(null);
		}
	};

	const handleRevokeOthers = async () => {
		setRevoking("others");
		setMsg(null);
		try {
			await revoke.mutateAsync({ mode: "others" });
			setMsg("All other sessions signed out");
			setIsError(false);
		} catch (e) {
			setMsg(accountMessageFor(e instanceof Error ? e.message : null));
			setIsError(true);
		} finally {
			setRevoking(null);
		}
	};

	const list = sessions.data ?? [];
	const hasOthers = list.some((s) => !s.current);

	return (
		<div className="nb-acct-section" data-testid="account-sessions">
			<div className="nb-acct-section-head">
				<h3 className="nb-acct-section-title">Active sessions</h3>
				{hasOthers && (
					<button
						type="button"
						className="btn btn-ghost btn-sm"
						disabled={revoking === "others"}
						onClick={handleRevokeOthers}
						data-testid="sessions-revoke-others"
					>
						Sign out others
					</button>
				)}
			</div>
			{sessions.isLoading ? (
				<p className="nb-acct-loading">Loading…</p>
			) : list.length === 0 ? (
				<p className="nb-acct-empty">No active sessions found</p>
			) : (
				<div className="nb-acct-sessions-list">
					{list.map((s) => (
						<SessionRow
							key={s.id}
							session={s}
							onRevoke={handleRevoke}
							revoking={revoking === s.id}
						/>
					))}
				</div>
			)}
			{msg && (
				<p className={isError ? "field-error" : "nb-acct-hint-ok"} role="status">
					{msg}
				</p>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Data sub-section: export + delete
// ---------------------------------------------------------------------------

function DataSection() {
	const exportData = useExportData();
	const deleteAccount = useDeleteAccount();
	const [confirmText, setConfirmText] = useState("");
	const [showConfirm, setShowConfirm] = useState(false);
	const [deleteError, setDeleteError] = useState<string | null>(null);

	const handleDelete = async () => {
		if (confirmText !== "DELETE") return;
		setDeleteError(null);
		try {
			await deleteAccount.mutateAsync();
			// onSuccess navigates to /login — nothing more to do here.
		} catch (e) {
			setDeleteError(accountMessageFor(e instanceof Error ? e.message : null));
		}
	};

	return (
		<div className="nb-acct-section" data-testid="account-data">
			<h3 className="nb-acct-section-title">Data</h3>

			{/* Export */}
			<div className="nb-acct-data-row">
				<div className="nb-acct-data-info">
					<span className="nb-acct-data-label">Export your data</span>
					<span className="nb-acct-data-hint">Download a JSON file of all your chats, tasks, research, and settings</span>
				</div>
				<button
					type="button"
					className="btn btn-secondary btn-sm"
					disabled={exportData.isPending}
					onClick={() => exportData.mutate()}
					data-testid="account-export-btn"
				>
					<Icons.send size={13} />
					{exportData.isPending ? "Preparing…" : "Export"}
				</button>
			</div>

			{/* Delete */}
			<div className="nb-acct-data-row nb-acct-danger-row">
				<div className="nb-acct-data-info">
					<span className="nb-acct-data-label">Delete account</span>
					<span className="nb-acct-data-hint">Permanently remove your account and all associated data. This cannot be undone.</span>
				</div>
				{!showConfirm ? (
					<button
						type="button"
						className="btn btn-danger btn-sm"
						onClick={() => setShowConfirm(true)}
						data-testid="account-delete-start"
					>
						Delete
					</button>
				) : (
					<div className="nb-acct-confirm-box" data-testid="account-delete-confirm">
						<p className="nb-acct-confirm-label">
							Type <strong>DELETE</strong> to confirm:
						</p>
						<input
							className="input nb-acct-confirm-input"
							value={confirmText}
							onChange={(e) => setConfirmText(e.target.value)}
							placeholder="DELETE"
							autoFocus
							data-testid="account-delete-confirm-input"
						/>
						{deleteError && <p className="field-error">{deleteError}</p>}
						<div className="nb-acct-confirm-actions">
							<button
								type="button"
								className="btn btn-ghost btn-sm"
								onClick={() => { setShowConfirm(false); setConfirmText(""); setDeleteError(null); }}
								data-testid="account-delete-cancel"
							>
								Cancel
							</button>
							<button
								type="button"
								className="btn btn-danger btn-sm"
								disabled={confirmText !== "DELETE" || deleteAccount.isPending}
								onClick={handleDelete}
								data-testid="account-delete-submit"
							>
								{deleteAccount.isPending ? "Deleting…" : "Permanently delete"}
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export interface AccountSectionProps {
	user: SessionUser;
}

export function AccountSection({ user }: AccountSectionProps) {
	return (
		<div className="nb-acct-pane" data-testid="account-section">
			<IdentityHeader user={user} />
			<ProfileSection user={user} />
			<SecuritySection />
			<SessionsSection />
			<DataSection />
			<AppsSection />
		</div>
	);
}
