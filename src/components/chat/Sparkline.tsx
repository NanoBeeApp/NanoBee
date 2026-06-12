// Small static sparkline used inside price cards and timeline cards.
// Two fixed paths (up / down) match the prototype's hand-tuned curves.
interface SparklineProps {
  up: boolean;
  color: string;
  /** Pixel height of the rendered SVG. */
  height?: number;
  /** ViewBox height variant: chat price card uses 50, timeline card uses 46. */
  vbHeight?: number;
}

const PATHS_50 = {
  up: 'M0,40 L40,38 L80,42 L120,36 L160,40 L200,34 L240,30 L280,26 L320,28 L360,18 L400,8',
  down: 'M0,12 L40,16 L80,10 L120,20 L160,16 L200,26 L240,24 L280,32 L320,30 L360,38 L400,42',
};
const PATHS_46 = {
  up: 'M0,38 L40,36 L80,40 L120,33 L160,36 L200,29 L240,26 L280,21 L320,23 L360,13 L400,5',
  down: 'M0,8 L40,12 L80,7 L120,16 L160,13 L200,22 L240,20 L280,28 L320,26 L360,34 L400,40',
};

export function Sparkline({ up, color, height = 48, vbHeight = 50 }: SparklineProps) {
  const paths = vbHeight === 46 ? PATHS_46 : PATHS_50;
  const d = up ? paths.up : paths.down;
  const endY = vbHeight === 46 ? (up ? 5 : 40) : (up ? 8 : 42);
  return (
    <svg viewBox={`0 0 400 ${vbHeight}`} style={{ width: '100%', height, display: 'block' }} preserveAspectRatio="none">
      <path d={`${d} L400,${vbHeight} L0,${vbHeight} Z`} fill={color} opacity="0.08" />
      <path d={d} stroke={color} strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="400" cy={endY} r="3.5" fill={color} stroke="#fff" strokeWidth="1.5" />
    </svg>
  );
}
