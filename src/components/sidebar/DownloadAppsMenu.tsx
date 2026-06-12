// Sidebar footer "download apps" button: sits next to the account avatar
// and opens a popover menu with native app download links (iOS / Mac).

import { useState } from "react";
import { Icons } from "../../icons/icons";
import { APP_DOWNLOAD_LINKS } from "../../config";

export function DownloadAppsMenu() {
	const [open, setOpen] = useState(false);

	return (
		<>
			<button
				className="nb-apps-trigger"
				title="下载 Apps"
				aria-haspopup="menu"
				aria-expanded={open}
				onClick={() => setOpen((o) => !o)}
				data-testid="download-apps-trigger"
			>
				<Icons.download size={16} />
			</button>

			{open && (
				<>
					<div className="nb-scrim" onClick={() => setOpen(false)} />
					<div className="nb-apps-pop" data-testid="download-apps-menu">
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
