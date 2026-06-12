import * as React from "react";
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

// NanoBee design-system styles (load order matters: tokens → base → app)
import fontsCss from "@/styles/tokens/fonts.css?url";
import colorsCss from "@/styles/tokens/colors.css?url";
import typographyCss from "@/styles/tokens/typography.css?url";
import effectsCss from "@/styles/tokens/effects.css?url";
import baseCss from "@/styles/base.css?url";
import appCss from "@/styles/app.css?url";

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
						{children}
					</QueryClientProvider>
				</div>
				<Scripts />
			</body>
		</html>
	);
}
