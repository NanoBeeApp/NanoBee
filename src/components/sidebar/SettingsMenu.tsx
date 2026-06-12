// Sidebar footer settings button: sits at the right edge of the footer and
// opens a popover menu. Currently hosts the native app download links
// (iOS / Mac); future utility entries also belong here.

import { useState } from "react";
import { Icons } from "../../icons/icons";
import { APP_DOWNLOAD_LINKS } from "../../config";

export function SettingsMenu() {
	const [open, setOpen] = useState(false);

	return (
		<>
			<button
				className="nb-settings-trigger"
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
		</>
	);
}
