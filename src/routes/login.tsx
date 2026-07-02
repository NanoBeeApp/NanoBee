import { createFileRoute } from "@tanstack/react-router";
import { LoginCard } from "@/components/auth/LoginCard";

// Standalone auth page (no app sidebar). Client-only like the home page:
// the flow is fully interactive and has no SEO-relevant content.
export const Route = createFileRoute("/login")({
	ssr: false,
	component: LoginPage,
	head: () => ({
		meta: [
			{ title: "登录 NanoBee — 主动式 AI 助理" },
			{
				name: "description",
				content: "登录或注册 NanoBee，支持邮箱、Google 与 GitHub 登录。",
			},
		],
	}),
});

function LoginPage() {
	return (
		<div className="nb-auth-page" data-testid="login-page">
			<div className="nb-auth-brand">
				<div className="glyph">
					<img className="nb-brand-bee" src="/brand/nanobee-bee.png" alt="NanoBee" />
				</div>
				<div className="name">
					Nano<b>Bee</b>
				</div>
			</div>
			<LoginCard />
			<p className="nb-auth-foot">登录即表示你同意我们的服务条款与隐私政策</p>
		</div>
	);
}
