// Inline line icons (1.5–2px stroke, rounded, 24x24) matching the Ledger UI
// design system's Lucide-class set. Ported from the design prototype.
import type { CSSProperties, ReactNode } from 'react';
import type { IconName } from '../types';

export interface IconProps {
  size?: number;
  sw?: number;
  style?: CSSProperties;
}

interface BaseProps extends IconProps {
  fill?: string;
  children: ReactNode;
}

function Svg({ size = 16, sw = 2, fill = 'none', style, children }: BaseProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style}>
      {children}
    </svg>
  );
}

export type IconComponent = (p: IconProps) => ReactNode;

export const Icons: Record<IconName, IconComponent> = {
  plus: (p) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>,
  search: (p) => <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>,
  bell: (p) => <Svg {...p}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></Svg>,
  chevR: (p) => <Svg {...p}><path d="m9 18 6-6-6-6" /></Svg>,
  chevD: (p) => <Svg {...p}><path d="m6 9 6 6 6-6" /></Svg>,
  chat: (p) => <Svg {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></Svg>,
  star: (p) => <Svg {...p} fill="currentColor" sw={0}><path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.9l-5.8 3.07 1.1-6.47L2.6 9.35l6.5-.95z" /></Svg>,
  clock: (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>,
  bolt: (p) => <Svg {...p}><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></Svg>,
  trend: (p) => <Svg {...p}><path d="M3 17l6-6 4 4 8-8" /><path d="M17 7h4v4" /></Svg>,
  trendDown: (p) => <Svg {...p}><path d="M3 7l6 6 4-4 8 8" /><path d="M17 17h4v-4" /></Svg>,
  bars: (p) => <Svg {...p}><path d="M3 3v18h18" /><path d="M7 14l4-4 4 4 5-6" /></Svg>,
  coins: (p) => <Svg {...p}><ellipse cx="12" cy="6" rx="8" ry="3.2" /><path d="M4 6v6c0 1.8 3.6 3.2 8 3.2s8-1.4 8-3.2V6" /><path d="M4 12v6c0 1.8 3.6 3.2 8 3.2s8-1.4 8-3.2v-6" /></Svg>,
  book: (p) => <Svg {...p}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></Svg>,
  news: (p) => <Svg {...p}><path d="M4 4h13a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4z" /><path d="M19 8h2v9a2 2 0 0 1-2 2" /><path d="M8 8h7M8 12h7M8 16h4" /></Svg>,
  heart: (p) => <Svg {...p}><path d="M19 14c1.5-1.5 3-3.4 3-5.5A4.5 4.5 0 0 0 12 6 4.5 4.5 0 0 0 2 8.5c0 2.1 1.5 4 3 5.5l7 7z" /></Svg>,
  send: (p) => <Svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>,
  attach: (p) => <Svg {...p}><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></Svg>,
  mic: (p) => <Svg {...p}><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M19 10a7 7 0 0 1-14 0M12 19v3" /></Svg>,
  slash: (p) => <Svg {...p}><path d="M9 21 15 3" /></Svg>,
  at: (p) => <Svg {...p}><circle cx="12" cy="12" r="4" /><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.9 7.9" /></Svg>,
  copy: (p) => <Svg {...p}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></Svg>,
  up: (p) => <Svg {...p}><path d="M7 10v12M3 14a2 2 0 0 1 2-2h12V3l4 5v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2z" /></Svg>,
  redo: (p) => <Svg {...p}><path d="M3 12a9 9 0 1 0 3-7M3 4v5h5" /></Svg>,
  more: (p) => <Svg {...p}><circle cx="5" cy="12" r="1.4" fill="currentColor" /><circle cx="12" cy="12" r="1.4" fill="currentColor" /><circle cx="19" cy="12" r="1.4" fill="currentColor" /></Svg>,
  check: (p) => <Svg {...p}><path d="M20 6 9 17l-5-5" /></Svg>,
  // Friendly bee echoing the NanoBee mark: round head, spread wings, striped
  // body and ball-tipped antennae. Antenna tips are filled with currentColor.
  bee: (p) => <Svg {...p}><path d="M10.5 5.4C9.8 4 8.9 3.3 8 3.1" /><path d="M13.5 5.4C14.2 4 15.1 3.3 16 3.1" /><circle cx="7.7" cy="3" r="0.9" fill="currentColor" stroke="none" /><circle cx="16.3" cy="3" r="0.9" fill="currentColor" stroke="none" /><circle cx="12" cy="7.3" r="2.2" /><ellipse cx="6.6" cy="11.6" rx="3" ry="2.1" transform="rotate(-25 6.6 11.6)" /><ellipse cx="17.4" cy="11.6" rx="3" ry="2.1" transform="rotate(25 17.4 11.6)" /><ellipse cx="12" cy="15.4" rx="4.5" ry="5.7" /><path d="M7.9 14h8.2" /><path d="M8.6 18h6.8" /></Svg>,
  panelRight: (p) => <Svg {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M15 4v16" /></Svg>,
  panelLeft: (p) => <Svg {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></Svg>,
  list: (p) => <Svg {...p}><path d="M9 6h12M9 12h12M9 18h12" /><circle cx="4.5" cy="6" r="0.9" fill="currentColor" /><circle cx="4.5" cy="12" r="0.9" fill="currentColor" /><circle cx="4.5" cy="18" r="0.9" fill="currentColor" /></Svg>,
  grid: (p) => <Svg {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></Svg>,
  feed: (p) => <Svg {...p}><rect x="4" y="3" width="16" height="8" rx="2" /><rect x="4" y="14" width="16" height="8" rx="2" /></Svg>,
  eye: (p) => <Svg {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></Svg>,
  arrowRight: (p) => <Svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>,
  pause: (p) => <Svg {...p}><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></Svg>,
  play: (p) => <Svg {...p} fill="currentColor" sw={0}><path d="M7 4v16l13-8z" /></Svg>,
  calendar: (p) => <Svg {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></Svg>,
  globe: (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" /></Svg>,
  spark: (p) => <Svg {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></Svg>,
  x: (p) => <Svg {...p}><path d="M18 6 6 18M6 6l12 12" /></Svg>,
  bookmark: (p) => <Svg {...p}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></Svg>,
  doc: (p) => <Svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></Svg>,
  filter: (p) => <Svg {...p}><path d="M3 4h18l-7 8v6l-4 2v-8z" /></Svg>,
  logout: (p) => <Svg {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></Svg>,
  download: (p) => <Svg {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /><path d="M12 15V3" /></Svg>,
  smartphone: (p) => <Svg {...p}><rect x="5" y="2" width="14" height="20" rx="2" /><path d="M12 18h.01" /></Svg>,
  monitor: (p) => <Svg {...p}><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></Svg>,
  // Lucide "settings" gear (line style), matching the rest of the stroke icon set.
  gear: (p) => <Svg {...p}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></Svg>,
  // Table/grid-of-rows glyph for the Artifacts view switch.
  table: (p) => <Svg {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M3 15h18M9 4v16" /></Svg>,
  // Filled rounded square — the "stop generating" affordance on the composer.
  stop: (p) => <Svg {...p} fill="currentColor" sw={0}><rect x="6" y="6" width="12" height="12" rx="2.5" /></Svg>,
};

/** Render an icon by name with a safe fallback (bell). */
export function Icon({ name, ...p }: IconProps & { name: IconName | string }) {
  const C = Icons[name as IconName] ?? Icons.bell;
  return <>{C(p)}</>;
}
