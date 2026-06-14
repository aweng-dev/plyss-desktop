import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers, User, Home, Users, RefreshCw, Clock, AlertTriangle, ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  fetchOverview, ApiError, type PlatformOverview,
} from '../../lib/adminApi';
import { timeAgo, titleCase } from '../../lib/recordHelpers';
import { PageHeader, LoadingBlock, ErrorBlock, StatTile } from '../../components/admin/ui';
import { Panel, BarList, Donut, TrendBars } from '../../components/admin/charts';

const OverviewPage: React.FC = () => {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<PlatformOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const admin = session?.admin;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchOverview());
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        logout();
        navigate('/admin/login', { replace: true });
        return;
      }
      setError(e instanceof Error ? e.message : 'Could not load the overview.');
    } finally {
      setLoading(false);
    }
  }, [logout, navigate]);

  useEffect(() => { void load(); }, [load]);

  const pending = data?.enumeratorsByStatus?.pending ?? 0;

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Platform" title={admin?.name ? `Welcome, ${admin.name}.` : 'Platform overview.'}>
        <button onClick={load} disabled={loading} className="chip disabled:opacity-60">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </PageHeader>

      {error ? (
        <ErrorBlock message={error} onRetry={load} />
      ) : loading && !data ? (
        <LoadingBlock label="Loading platform data…" />
      ) : data ? (
        <>
          {/* Headline counts */}
          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatTile label="Total records" value={data.totals.total} note="Individuals + households" icon={Layers} emphasis />
            <StatTile label="Individuals" value={data.totals.individuals} note="Persons enumerated" icon={User} />
            <StatTile label="Households" value={data.totals.families} note="Families recorded" icon={Home} />
            <StatTile label="Field workers" value={data.totals.enumerators} note={`${data.totals.admins} admin${data.totals.admins === 1 ? '' : 's'}`} icon={Users} />
          </dl>

          {/* Activity windows */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Last 24 hours', value: data.windows.last24h },
              { label: 'Last 7 days', value: data.windows.last7d },
              { label: 'Last 30 days', value: data.windows.last30d },
            ].map((w) => (
              <div key={w.label} className="rounded-lg border border-rule bg-paper-2 px-5 py-4 flex items-center justify-between">
                <span className="flex items-center gap-2 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-muted">
                  <Clock className="w-3.5 h-3.5" /> {w.label}
                </span>
                <span className="tnum font-display text-2xl text-ink">+{w.value.toLocaleString()}</span>
              </div>
            ))}
          </div>

          {/* Pending enumerators callout */}
          {pending > 0 && (
            <button
              onClick={() => navigate('/admin/enumerators')}
              className="w-full text-left rounded-lg border border-accent/40 bg-accent/10 px-5 py-4 flex items-center justify-between gap-4 hover:bg-accent/15 transition-colors"
            >
              <span className="flex items-center gap-3 text-sm text-ink">
                <AlertTriangle className="w-5 h-5 text-accent-deep shrink-0" strokeWidth={1.75} />
                <span>
                  <strong className="font-semibold">{pending}</strong> enumerator{pending === 1 ? '' : 's'} awaiting review.
                </span>
              </span>
              <span className="tlink shrink-0">Review <ArrowUpRight className="w-4 h-4" /></span>
            </button>
          )}

          {/* Trend */}
          <Panel title="Submissions" note="Records collected over the last 12 months">
            <TrendBars data={data.monthly} />
          </Panel>

          {/* Demographics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel title="Gender" note="Individuals">
              <Donut data={data.gender} />
            </Panel>
            <Panel title="Marital status" note="Individuals">
              <Donut data={data.maritalStatus} />
            </Panel>
            <Panel title="Top occupations" note="Individuals">
              <BarList data={data.occupations} />
            </Panel>
          </div>

          {/* Geography */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="By state of residence">
              <BarList data={data.byState} />
            </Panel>
            <Panel title="Top LGAs of residence">
              <BarList data={data.topLga} />
            </Panel>
          </div>

          {/* Recent activity + enumerator status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel title="Recent activity" note="Newest submissions" className="lg:col-span-2">
              {data.recent.length === 0 ? (
                <p className="text-sm text-muted py-6 text-center">No submissions yet.</p>
              ) : (
                <ul className="divide-y divide-rule -my-1">
                  {data.recent.map((r) => (
                    <li
                      key={`${r.type}-${r.id}`}
                      onClick={() => navigate(`/admin/id/${r.type}/${r.id}`)}
                      className="flex items-center justify-between gap-3 py-3 cursor-pointer group"
                    >
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="font-medium text-ink truncate group-hover:text-accent-deep transition-colors">
                            {r.name || '—'}
                          </span>
                          <span className="shrink-0 font-mono text-[0.55rem] uppercase tracking-[0.12em] text-muted border border-rule rounded px-1.5 py-0.5">
                            {r.type === 'individual' ? 'Person' : 'Household'}
                          </span>
                        </span>
                        <span className="block text-xs text-muted truncate mt-0.5">
                          {r.plyss_id || '—'} · {titleCase(r.state_of_residence || '') || 'Unknown state'}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-xs text-muted">{timeAgo(r.created_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Enumerators" note="By status">
              <ul className="space-y-3">
                {(['approved', 'pending', 'suspended'] as const).map((s) => (
                  <li key={s} className="flex items-center justify-between text-sm">
                    <span className="capitalize text-ink-2">{s}</span>
                    <span className="tnum text-ink">{(data.enumeratorsByStatus?.[s] ?? 0).toLocaleString()}</span>
                  </li>
                ))}
                <li className="flex items-center justify-between text-sm border-t border-rule pt-3">
                  <span className="text-muted font-mono text-[0.68rem] uppercase tracking-[0.14em]">Total</span>
                  <span className="tnum text-ink">{data.totals.enumerators.toLocaleString()}</span>
                </li>
              </ul>
              <button onClick={() => navigate('/admin/enumerators')} className="tlink mt-5">
                Manage enumerators <ArrowUpRight className="w-4 h-4" />
              </button>
            </Panel>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default OverviewPage;
