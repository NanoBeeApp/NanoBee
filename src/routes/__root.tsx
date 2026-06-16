import * as React from "react";
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { LocaleProvider } from "@/lib/i18n/LocaleContext";

// NanoBee design-system styles (load order matters: tokens → base → app → mobile)
import fontsCss from "@/styles/tokens/fonts.css?url";
import colorsCss from "@/styles/tokens/colors.css?url";
import typographyCss from "@/styles/tokens/typography.css?url";
import effectsCss from "@/styles/tokens/effects.css?url";
import baseCss from "@/styles/base.css?url";
import appCss from "@/styles/app.css?url";
import cardsCss from "@/styles/cards.css?url";
import mobileCss from "@/styles/mobile.css?url";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{
				name: "description",
				content:
					"NanoBee — a proactive AI assistant that watches what you care about and reaches out when it matters.",
			},
			{ title: "NanoBee — 主动式 AI 助理" },
		],
		links: [
			{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
			{ rel: "stylesheet", href: fontsCss },
			{ rel: "stylesheet", href: colorsCss },
			{ rel: "stylesheet", href: typographyCss },
			{ rel: "stylesheet", href: effectsCss },
			{ rel: "stylesheet", href: baseCss },
			{ rel: "stylesheet", href: appCss },
			{ rel: "stylesheet", href: cardsCss },
			// Mobile overrides must load AFTER app.css so specificity wins
			{ rel: "stylesheet", href: mobileCss },
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="zh-CN">
			<head>
				<HeadContent />
			</head>
			<body>
				<div id="root">
					<QueryClientProvider client={queryClient}>
						{/* LocaleProvider wraps the whole tree so useT()/useLocale() work
						    everywhere. Reads the persisted locale from localStorage on mount;
						    defaults to "zh". */}
						<LocaleProvider>
							{/* Global error boundary — catches any uncaught render error in the
							    whole React tree and shows an on-brand fallback instead of a blank
							    screen. Individual routes add their own errorComponent for finer
							    isolation; this is the last-resort catch-all. */}
							<ErrorBoundary>
								{children}
							</ErrorBoundary>
						</LocaleProvider>
					</QueryClientProvider>
				</div>
				<Scripts />
			</body>
		</html>
	);
}
