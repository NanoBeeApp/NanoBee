/**
 * Auth state hooks shared by the login page and the app shell.
 * Wraps the /api/auth endpoints with TanStack Query.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api-client";

export type SessionUser = {
	id: string;
	email: string;
	name: string;
	image: string | null;
};

export const AUTH_USER_QUERY_KEY = ["auth", "me"] as const;

/** Current logged-in user (null when signed out). */
export function useAuthUser() {
	return useQuery({
		queryKey: AUTH_USER_QUERY_KEY,
		queryFn: async (): Promise<SessionUser | null> => {
			const res = await apiClient.auth.me.$get();
			if (!res.ok) return null;
			const data = (await res.json()) as { user: SessionUser | null };
			return data.user;
		},
		staleTime: 60_000,
	});
}

/** Logout mutation; clears the cached user on success. */
export function useLogout() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async () => {
			await apiClient.auth.logout.$post();
		},
		onSuccess: () => {
			queryClient.setQueryData(AUTH_USER_QUERY_KEY, null);
		},
	});
}
