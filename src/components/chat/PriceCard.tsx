// Price / monitor data card embedded in a chat message.
import type { PriceCardData } from '../../types';
import { Sparkline } from './Sparkline';

interface PriceCardProps {
  d: PriceCardData;
}

export function PriceCard({ d }: PriceCardProps) {
  const up = d.dir === 'up';
  return (
    <div className="nb-data-card" data-testid="chat-price-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div className="t-caption">{d.label}</div>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1, marginTop: 4 }} className="nb-mono">{d.value}</div>
          <div className={`kpi-delta ${up ? 'up' : 'down'}`} style={{ marginTop: 6 }}>
            {up ? '▲' : '▼'} {d.delta} <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>· {d.sub}</span>
          </div>
        </div>
        <span className={`badge ${up ? 'badge-success' : 'badge-danger'}`}>{d.tag}</span>
      </div>
      <div style={{ marginTop: 10 }}>
        <Sparkline up={up} color={up ? 'var(--success)' : 'var(--danger)'} />
      </div>
    </div>
  );
}
