// Settings button: lives in the floating top-right bar and opens a popover
// menu. Hosts the AI provider settings entry and the native app download
// links (iOS / Mac); future utility entries also belong here.

import { useState } from "react";
import { Icons } from "../../icons/icons";
import { APP_DOWNLOAD_LINKS } from "../../config";
import { useAppStore } from "../../store/useAppStore";

export function SettingsMenu() {
	const [open, setOpen] = useState(false);
	const setAiSetupOpen = useAppStore((s) => s.setAiSetupOpen);

	return (
		<div className="nb-corner-ctrl">
			<button
				className="fbtn"
				title="设置"
				aria-haspopup="menu"
				aria-expanded={open}
				onClick={() => setOpen((o) => !o)}
				data-testid="settings-menu-trigger"
			>
				<Icons.gear size={16} />
			</button>

			{open && (
				<>
					<div className="nb-scrim" onClick={() => setOpen(false)} />
					<div className="nb-settings-pop" data-testid="settings-menu">
						<button
							className="nb-account-action"
							onClick={() => { setOpen(false); setAiSetupOpen(true); }}
							data-testid="settings-ai-entry"
						>
							<Icons.spark size={15} />
							AI 模型设置
						</button>
						<div className="nb-account-sep" />
						<a
							className="nb-account-action"
							href={APP_DOWNLOAD_LINKS.ios}
							target="_blank"
							rel="noopener noreferrer"
							onClick={() => setOpen(false)}
							data-testid="download-ios-link"
						>
							<Icons.smartphone size={15} />
							下载 iOS 版
						</a>
						<div className="nb-account-sep" />
						<a
							className="nb-account-action"
							href={APP_DOWNLOAD_LINKS.mac}
							target="_blank"
							rel="noopener noreferrer"
							onClick={() => setOpen(false)}
							data-testid="download-mac-link"
						>
							<Icons.monitor size={15} />
							下载 Mac 版
						</a>
					</div>
				</>
			)}
		</div>
	);
}
