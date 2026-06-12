// Renders the inline rich-text segments of an AI paragraph:
// plain text, bold, tabular numbers and citation markers.
import { Fragment } from 'react';
import type { Paragraph } from '../../types';

interface InlineSegmentsProps {
  segs: Paragraph;
}

export function InlineSegments({ segs }: InlineSegmentsProps) {
  return (
    <>
      {segs.map((s, i) => {
        if (typeof s === 'string') return <Fragment key={i}>{s}</Fragment>;
        if ('b' in s) return <strong key={i}>{s.b}</strong>;
        if ('num' in s) return <span className="nb-mono" key={i}>{s.num}</span>;
        if ('cite' in s) return <span className="nb-cite" key={i}>{s.cite}</span>;
        return null;
      })}
    </>
  );
}
