import { QueryClient } from "@tanstack/react-query";

// Shared TanStack Query client
export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false, // don't refetch on window focus
			retry: 1, // retry failed queries once
		},
	},
});
