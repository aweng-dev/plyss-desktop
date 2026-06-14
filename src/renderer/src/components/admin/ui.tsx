// Small shared UI atoms for the admin console pages.

import React from 'react';
import { Loader2, AlertCircle, RefreshCw, type LucideIcon } from 'lucide-react';

export const PageHeader: React.FC<{
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}> = ({ eyebrow, title, children }) => (
  <div className="flex flex-wrap items-end justify-between gap-4">
    <div className="min-w-0">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">{eyebrow}</p>
      <h1 className="mt-2 font-display font-light text-3xl sm:text-4xl text-ink leading-[1.05]">{title}</h1>
    </div>
    {children && <div className="flex items-center gap-3">{children}</div>}
  </div>
);

export const LoadingBlock: React.FC<{ label?: string }> = ({ label = 'Loading…' }) => (
  <div className="flex items-center justify-center gap-2 text-muted py-20 rounded-lg border border-rule">
    <Loader2 className="w-5 h-5 animate-spin" /> {label}
  </div>
);

export const ErrorBlock: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div className="rounded-lg border border-danger bg-paper-2 px-5 py-6">
    <p className="flex items-center gap-2 text-sm text-danger">
      <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={2} /> {message}
    </p>
    {onRetry && (
      <button onClick={onRetry} className="chip mt-4">
        <RefreshCw className="w-4 h-4" /> Try again
      </button>
    )}
  </div>
);

export const StatTile: React.FC<{
  label: string;
  value?: number;
  note?: string;
  icon?: LucideIcon;
  loading?: boolean;
  emphasis?: boolean;
}> = ({ label, value, note, icon: Icon, loading, emphasis }) => (
  <div className={`rounded-lg border p-5 sm:p-6 ${emphasis ? 'border-forest/40 bg-forest text-on-forest' : 'border-rule bg-paper-2'}`}>
    <div className="flex items-center justify-between">
      <dt className={`font-mono text-[0.68rem] uppercase tracking-[0.16em] ${emphasis ? 'text-on-forest-2' : 'text-muted'}`}>
        {label}
      </dt>
      {Icon && <Icon className={`w-4 h-4 ${emphasis ? 'text-accent' : 'text-forest'}`} strokeWidth={1.75} />}
    </div>
    <dd className={`mt-3 font-display font-light text-4xl tnum leading-none ${emphasis ? 'text-on-forest' : 'text-ink'}`}>
      {loading ? (
        <span className="inline-block h-8 w-16 rounded bg-rule/60 animate-pulse align-middle" aria-label="loading" />
      ) : (
        (value ?? 0).toLocaleString()
      )}
    </dd>
    {note && <p className={`mt-2 text-xs leading-relaxed ${emphasis ? 'text-on-forest-2' : 'text-muted'}`}>{note}</p>}
  </div>
);

const STATUS_STYLES: Record<string, string> = {
  approved: 'bg-forest/12 text-forest border-forest/30',
  active: 'bg-forest/12 text-forest border-forest/30',
  suspended: 'bg-danger/10 text-danger border-danger/30',
  inactive: 'bg-danger/10 text-danger border-danger/30',
  pending: 'bg-accent/15 text-accent-deep border-accent/40',
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const key = status.toLowerCase();
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.12em] ${
        STATUS_STYLES[key] ?? 'bg-paper-3 text-ink-2 border-rule'
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
      {status}
    </span>
  );
};
