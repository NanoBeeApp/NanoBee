/**
 * React Query hooks for account management:
 * - password reset (forgot / reset)
 * - change display name
 * - change password (current required)
 * - session list / revoke
 * - data export
 * - account deletion
 *
 * All hooks that require a session will receive a 401 response when the user
 * is not signed in; the UI should already guard those sections with useAuthUser.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AUTH_USER_QUERY_KEY } from "./useAuth";

const BASE = "/api/auth";

// ---------------------------------------------------------------------------
// Stable error codes → user-facing copy (same pattern as LoginCard)
// ---------------------------------------------------------------------------
export const ACCOUNT_ERROR_MESSAGES: Record<string, string> = {
	invalid_code: "The code is incorrect or has expired",
	email_send_failed: "Failed to send email, please try again later",
	no_password_set: "This account uses social login and has no password",
	invalid_credentials: "Current password is incorrect",
	session_id_required: "No session selected",
	cannot_revoke_current: "Use logout to end your current session",
};

export function accountMessageFor(code: string | null): string {
	if (!code) return "An unexpected error occurred";
	return ACCOUNT_ERROR_MESSAGES[code] ?? "An unexpected error occurred";
}

// ---------------------------------------------------------------------------
// Forgot password
// ---------------------------------------------------------------------------
export function useForgotPassword() {
	return useMutation({
		mutationFn: async (email: string) => {
			const res = await fetch(`${BASE}/forgot-password`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email }),
			});
			const data = (await res.json()) as { ok?: boolean; error?: string };
			if (!res.ok) throw new Error(data.error ?? "forgot_failed");
			return data;
		},
	});
}

// ---------------------------------------------------------------------------
// Reset password
// ---------------------------------------------------------------------------
export function useResetPassword() {
	return useMutation({
		mutationFn: async (args: { email: string; code: string; newPassword: string }) => {
			const res = await fetch(`${BASE}/reset-password`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(args),
			});
			const data = (await res.json()) as { ok?: boolean; error?: string };
			if (!res.ok) throw new Error(data.error ?? "reset_failed");
			return data;
		},
	});
}

// ---------------------------------------------------------------------------
// Change display name
// ---------------------------------------------------------------------------
export function useChangeName() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (name: string) => {
			const res = await fetch(`${BASE}/account/name`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name }),
			});
			const data = (await res.json()) as { ok?: boolean; error?: string };
			if (!res.ok) throw new Error(data.error ?? "name_update_failed");
			return data;
		},
		onSuccess: () => {
			// Refresh the auth-user query so the header/avatar updates immediately.
			void qc.invalidateQueries({ queryKey: AUTH_USER_QUERY_KEY });
		},
	});
}

// ---------------------------------------------------------------------------
// Change password (current password required)
// ---------------------------------------------------------------------------
export function useChangePassword() {
	return useMutation({
		mutationFn: async (args: { currentPassword: string; newPassword: string }) => {
			const res = await fetch(`${BASE}/account/password`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(args),
			});
			const data = (await res.json()) as { ok?: boolean; error?: string };
			if (!res.ok) throw new Error(data.error ?? "password_change_failed");
			return data;
		},
	});
}

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------
export type SessionItem = {
	id: string;
	createdAt: number;
	/** Unix timestamp of last activity, or null for legacy sessions. */
	lastSeenAt: number | null;
	expiresAt: number;
	ip: string | null;
	userAgent: string | null;
	current: boolean;
};

export const SESSIONS_QUERY_KEY = ["auth", "sessions"] as const;

export function useSessions() {
	return useQuery({
		queryKey: SESSIONS_QUERY_KEY,
		queryFn: async (): Promise<SessionItem[]> => {
			const res = await fetch(`${BASE}/sessions`);
			if (res.status === 401) return [];
			const data = (await res.json()) as { sessions: SessionItem[] };
			return data.sessions ?? [];
		},
		staleTime: 30_000,
	});
}

export function useRevokeSession() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (args: { sessionId?: string; mode: "one" | "others" }) => {
			const res = await fetch(`${BASE}/sessions/revoke`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(args),
			});
			const data = (await res.json()) as { ok?: boolean; error?: string };
			if (!res.ok) throw new Error(data.error ?? "revoke_failed");
			return data;
		},
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
		},
	});
}

// ---------------------------------------------------------------------------
// Data export (triggers a browser download)
// ---------------------------------------------------------------------------
export function useExportData() {
	return useMutation({
		mutationFn: async () => {
			const res = await fetch(`${BASE}/export`);
			if (!res.ok) throw new Error("export_failed");
			const blob = await res.blob();
			// Trigger download via a temporary anchor element.
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download =
				res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ??
				"nanobee-export.json";
			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(url);
		},
	});
}

// ---------------------------------------------------------------------------
// Account deletion
// ---------------------------------------------------------------------------
export function useDeleteAccount() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async () => {
			const res = await fetch(`${BASE}/account`, {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ confirm: "DELETE" }),
			});
			const data = (await res.json()) as { ok?: boolean; error?: string };
			if (!res.ok) throw new Error(data.error ?? "delete_failed");
			return data;
		},
		onSuccess: () => {
			// Clear all cached queries — the user is gone.
			qc.clear();
			// Hard-navigate to /login so the app resets fully.
			window.location.href = "/login";
		},
	});
}
