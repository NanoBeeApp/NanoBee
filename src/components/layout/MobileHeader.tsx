// Mobile-only top header bar.  Rendered by _app.tsx and visible only at
// <=768px (display:none on desktop via mobile.css).  Contains:
//   Left  — hamburger (panelLeft icon) that toggles the off-canvas sidebar drawer.
//   Right — NanoBee bee logo + wordmark (acts as a home affordance on mobile).
//
// The account avatar was removed from here too — account / downloads / sign-out
// live in Settings → Account, reachable via the drawer's 设置 tile.
//
// The sidebar open/close state uses the `mobileNavOpen` flag in the app store,
// which the CSS reacts to via `.nb-app.mobile-nav-open`.
//
// Change history:
//   2026-06-18  Removed the account avatar (AccountFoot); account moved to Settings.
//   2026-06-15  Created — part of the mobile-responsive pass.
import { useAppStore } from "../../store/useAppStore";
import { Icons } from "../../icons/icons";

export function MobileHeader() {
  const mobileNavOpen = useAppStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useAppStore((s) => s.setMobileNavOpen);

  return (
    <header className="nb-mobile-header" data-testid="mobile-header">
      <button
        className="nb-mobile-hamburger"
        aria-label={mobileNavOpen ? "关闭导航" : "打开导航"}
        aria-expanded={mobileNavOpen}
        aria-controls="app-sidebar"
        onClick={() => setMobileNavOpen(!mobileNavOpen)}
        data-testid="mobile-hamburger"
      >
        {mobileNavOpen
          ? <Icons.x size={18} />
          : <Icons.panelLeft size={18} />
        }
      </button>

      <div className="nb-mobile-brand" aria-hidden="true">
        <div className="glyph">
          <img className="nb-brand-bee" src="/brand/nanobee-bee.png" alt="" />
        </div>
        Nano<b>Bee</b>
      </div>
    </header>
  );
}
