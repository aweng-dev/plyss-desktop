// Dependency-free charts for the admin overview, drawn with SVG/CSS on the
// heritage palette. Every chart is fed real data and degrades to an honest
// empty state when there is nothing to show (no fabricated figures).

import React from 'react';
import type { Bucket } from '../../lib/adminApi';

/** Categorical series colours, drawn from the heritage tokens. */
const SERIES = [
  'var(--color-forest)',
  'var(--color-accent)',
  'var(--color-forest-2)',
  'var(--color-bronze)',
  'var(--color-accent-deep)',
  'var(--color-muted)',
];

const fmt = (n: number): string => n.toLocaleString();

const EmptyChart: React.FC<{ label?: string }> = ({ label = 'No data yet' }) => (
  <div className="flex items-center justify-center h-32 text-sm text-muted">{label}</div>
);

/** Card shell shared by every chart panel. */
export const Panel: React.FC<{
  title: string;
  note?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ title, note, right, children, className = '' }) => (
  <section className={`rounded-lg border border-rule bg-paper-2 p-5 sm:p-6 ${className}`}>
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-muted">{title}</h3>
        {note && <p className="mt-1 text-xs text-muted">{note}</p>}
      </div>
      {right}
    </div>
    <div className="mt-5">{children}</div>
  </section>
);

/** Horizontal ranked bars (states, LGAs, occupations). */
export const BarList: React.FC<{ data: Bucket[]; max?: number }> = ({ data, max }) => {
  if (data.length === 0) return <EmptyChart />;
  const peak = max ?? Math.max(...data.map((d) => d.value), 1);
  return (
    <ul className="space-y-3">
      {data.map((d, i) => (
        <li key={d.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-ink-2 truncate capitalize">{d.label.toLowerCase()}</span>
            <span className="tnum text-ink shrink-0">{fmt(d.value)}</span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-paper-3 overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${Math.max((d.value / peak) * 100, 2)}%`,
                backgroundColor: i === 0 ? 'var(--color-accent)' : 'var(--color-forest)',
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
};

/** Donut for a small categorical split (gender, marital status). */
export const Donut: React.FC<{ data: Bucket[] }> = ({ data }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <EmptyChart />;

  const R = 42;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const segments = data.map((d, i) => {
    const frac = d.value / total;
    const seg = { dash: frac * C, gap: C - frac * C, off: offset, color: SERIES[i % SERIES.length], ...d, frac };
    offset += frac * C;
    return seg;
  });

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 100 100" className="w-28 h-28 shrink-0 -rotate-90" role="img" aria-label="Distribution donut chart">
        <circle cx="50" cy="50" r={R} fill="none" stroke="var(--color-paper-3)" strokeWidth="12" />
        {segments.map((s) => (
          <circle
            key={s.label}
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke={s.color}
            strokeWidth="12"
            strokeDasharray={`${s.dash} ${s.gap}`}
            strokeDashoffset={-s.off}
          />
        ))}
      </svg>
      <ul className="min-w-0 flex-1 space-y-2">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2.5 text-sm">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color }} aria-hidden="true" />
            <span className="text-ink-2 capitalize truncate flex-1">{s.label.toLowerCase()}</span>
            <span className="tnum text-ink">{fmt(s.value)}</span>
            <span className="tnum text-muted w-10 text-right">{Math.round(s.frac * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

/** Monthly submission trend as vertical bars. `labels` are YYYY-MM. */
export const TrendBars: React.FC<{ data: Bucket[] }> = ({ data }) => {
  if (data.length === 0) return <EmptyChart label="No submissions in the last 12 months" />;
  const peak = Math.max(...data.map((d) => d.value), 1);
  const monthLabel = (ym: string) => {
    const m = Number(ym.split('-')[1]);
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1] ?? ym;
  };
  return (
    <div className="flex items-end gap-2 h-40" role="list">
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-2 min-w-0" role="listitem">
          <span className="tnum text-[0.7rem] text-ink-2">{d.value || ''}</span>
          <div
            className="w-full max-w-[2.5rem] rounded-t bg-forest hover:bg-forest-2 transition-colors"
            style={{ height: `${Math.max((d.value / peak) * 100, 3)}%`, minHeight: 4 }}
            title={`${monthLabel(d.label)} ${d.label.split('-')[0]}: ${d.value}`}
          />
          <span className="font-mono text-[0.6rem] uppercase tracking-wider text-muted truncate w-full text-center">
            {monthLabel(d.label)}
          </span>
        </div>
      ))}
    </div>
  );
};
