// Pure render component: Google / GitHub sign-in buttons.
// Navigates to the server-side OAuth start endpoints (full-page redirect).

const GoogleMark = () => (
	<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
		<path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81z" />
		<path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.93-2.91l-3.87-3c-1.07.72-2.44 1.14-4.06 1.14-3.12 0-5.77-2.11-6.71-4.95H1.29v3.1A11.99 11.99 0 0 0 12 24z" />
		<path fill="#FBBC05" d="M5.29 14.28A7.2 7.2 0 0 1 4.91 12c0-.79.14-1.56.38-2.28v-3.1H1.29a12 12 0 0 0 0 10.76l4-3.1z" />
		<path fill="#EA4335" d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44A11.97 11.97 0 0 0 12 0 11.99 11.99 0 0 0 1.29 6.62l4 3.1C6.23 6.88 8.88 4.77 12 4.77z" />
	</svg>
);

const GitHubMark = () => (
	<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
		<path
			fill="currentColor"
			d="M12 .3a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.21.7.82.58A12 12 0 0 0 12 .3z"
		/>
	</svg>
);

type OAuthButtonsProps = {
	// Relative path to return to after a successful OAuth login
	returnTo: string;
};

export function OAuthButtons({ returnTo }: OAuthButtonsProps) {
	const start = (provider: "google" | "github") => {
		window.location.href = `/api/auth/${provider}/start?returnTo=${encodeURIComponent(returnTo)}`;
	};

	return (
		<div className="nb-auth-oauth">
			<button
				type="button"
				className="btn btn-secondary btn-lg nb-auth-oauth-btn"
				onClick={() => start("google")}
				data-testid="google-login-button"
			>
				<GoogleMark />
				使用 Google 继续
			</button>
			<button
				type="button"
				className="btn btn-secondary btn-lg nb-auth-oauth-btn"
				onClick={() => start("github")}
				data-testid="github-login-button"
			>
				<GitHubMark />
				使用 GitHub 继续
			</button>
		</div>
	);
}
