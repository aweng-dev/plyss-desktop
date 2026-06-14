import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Inbox, Loader2, ChevronLeft, ChevronRight, Download, Trash2, X, AlertTriangle,
} from 'lucide-react';
import RecordsTable from '../../components/admin/RecordsTable';
import RecordDetail from '../../components/admin/RecordDetail';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/admin/Toast';
import { PageHeader, ErrorBlock } from '../../components/admin/ui';
import {
  fetchAllRecords, recordsToCsv, downloadFile, bulkDeleteRecords, BULK_DELETE_MAX, ApiError,
  type SurveyType, type AnyRecord,
} from '../../lib/adminApi';
import { displayName } from '../../lib/recordHelpers';

const PAGE_SIZE = 10;

export type SortKey = 'name' | 'plyss_id' | 'lga' | 'recorded';
export interface SortState { key: SortKey; dir: 'asc' | 'desc' }

const searchString = (r: AnyRecord): string =>
  [
    displayName(r), r.plyss_id, r.phone_number, r.email,
    r.lga_of_residence, r.lga_of_origin, r.state_of_residence,
    r.type === 'individual' ? r.occupation : r.household_head_name,
  ].filter(Boolean).join(' ').toLowerCase();

const sortValue = (r: AnyRecord, key: SortKey): string => {
  switch (key) {
    case 'name': return displayName(r).toLowerCase();
    case 'plyss_id': return (r.plyss_id || '').toLowerCase();
    case 'lga': return (r.lga_of_residence || '').toLowerCase();
    case 'recorded': return r.created_at || '';
  }
};

const RecordsPage: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const toast = useToast();

  const [tab, setTab] = useState<SurveyType>('individual');
  const [cache, setCache] = useState<Partial<Record<SurveyType, AnyRecord[]>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<SortState>({ key: 'recorded', dir: 'desc' });
  const [selected, setSelected] = useState<AnyRecord | null>(null);

  // Bulk selection + permanent-delete confirmation.
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);

  const handleAuthError = useCallback((e: unknown): boolean => {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
      logout();
      navigate('/admin/login', { replace: true });
      return true;
    }
    return false;
  }, [logout, navigate]);

  const loadTab = useCallback(async (type: SurveyType) => {
    setLoading(true);
    setError(null);
    try {
      const recs = await fetchAllRecords(type);
      setCache((c) => ({ ...c, [type]: recs }));
    } catch (e) {
      if (!handleAuthError(e)) setError(e instanceof Error ? e.message : 'Could not load records.');
    } finally {
      setLoading(false);
    }
  }, [handleAuthError]);

  useEffect(() => {
    if (!cache[tab]) void loadTab(tab);
  }, [tab, cache, loadTab]);

  const filtered = useMemo(() => {
    const records = cache[tab] ?? [];
    const q = search.trim().toLowerCase();
    const base = q ? records.filter((r) => searchString(r).includes(q)) : records;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...base].sort((a, b) => sortValue(a, sort.key).localeCompare(sortValue(b, sort.key)) * dir);
  }, [cache, tab, search, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'recorded' ? 'desc' : 'asc' }));

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount - 1);
  const paged = filtered.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE);

  const handleGenerate = (r: AnyRecord) => navigate(`/admin/id/${r.type}/${r.id}`);
  const clearSelection = () => setSelectedIds(new Set());
  const changeTab = (t: SurveyType) => { setTab(t); setPage(0); clearSelection(); };
  const onSearch = (v: string) => { setSearch(v); setPage(0); };

  const handleUpdated = (updated: AnyRecord) => {
    setCache((c) => ({
      ...c,
      [updated.type]: (c[updated.type] ?? []).map((r) => (r.id === updated.id ? updated : r)),
    }));
    setSelected(updated);
  };

  const handleDeleted = (r: AnyRecord) => {
    setCache((c) => ({ ...c, [r.type]: (c[r.type] ?? []).filter((x) => x.id !== r.id) }));
    setSelectedIds((cur) => { const n = new Set(cur); n.delete(r.id); return n; });
  };

  // ── Bulk selection ──────────────────────────────────────────────────────
  const toggleId = (id: number) =>
    setSelectedIds((cur) => {
      const n = new Set(cur);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const toggleAllVisible = () =>
    setSelectedIds((cur) => {
      const n = new Set(cur);
      const allOnPage = paged.length > 0 && paged.every((r) => n.has(r.id));
      paged.forEach((r) => (allOnPage ? n.delete(r.id) : n.add(r.id)));
      return n;
    });

  const selectAllFiltered = () => setSelectedIds(new Set(filtered.map((r) => r.id)));

  const openConfirm = () => { setConfirmText(''); setConfirmBulk(true); };

  const runBulkDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      // The API caps each request, so delete in chunks for arbitrarily large selections.
      let deleted = 0;
      for (let i = 0; i < ids.length; i += BULK_DELETE_MAX) {
        deleted += await bulkDeleteRecords(tab, ids.slice(i, i + BULK_DELETE_MAX));
      }
      const removed = new Set(ids);
      setCache((c) => ({ ...c, [tab]: (c[tab] ?? []).filter((r) => !removed.has(r.id)) }));
      if (selected && removed.has(selected.id)) setSelected(null);
      clearSelection();
      setConfirmBulk(false);
      toast.success(`Permanently deleted ${deleted} record${deleted === 1 ? '' : 's'}.`);
    } catch (e) {
      if (!handleAuthError(e)) toast.error(e instanceof Error ? e.message : 'Could not delete the records.');
    } finally {
      setBulkBusy(false);
    }
  };

  const exportCsv = () => {
    if (filtered.length === 0) return;
    const stamp = new Date().toISOString().slice(0, 10);
    downloadFile(`plyss-${tab}-${stamp}.csv`, recordsToCsv(filtered));
  };

  const tabs: { id: SurveyType; label: string }[] = [
    { id: 'individual', label: 'Individuals' },
    { id: 'family', label: 'Households' },
  ];

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Survey records" title="Records">
        <button
          onClick={exportCsv}
          disabled={loading || filtered.length === 0}
          className="chip disabled:opacity-50 disabled:cursor-not-allowed"
          title="Download the current view as CSV"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </PageHeader>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="inline-flex items-center gap-1 p-1 rounded-lg border border-rule bg-paper-2 w-fit">
          {tabs.map((t) => {
            const active = tab === t.id;
            const count = cache[t.id]?.length;
            return (
              <button
                key={t.id}
                onClick={() => changeTab(t.id)}
                aria-pressed={active}
                className={`relative px-4 py-2 font-mono text-xs uppercase tracking-[0.14em] rounded transition-colors ${
                  active ? 'bg-forest text-on-forest' : 'text-muted hover:text-ink'
                }`}
              >
                {t.label}
                {typeof count === 'number' && (
                  <span className={`ml-2 tnum ${active ? 'text-on-forest-2' : 'text-muted'}`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
        <div className="relative sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search name, ID, phone, LGA…"
            aria-label="Search records"
            className="w-full rounded bg-paper-2 border border-rule focus:border-forest pl-9 pr-3 py-2.5 text-sm text-ink placeholder:text-muted transition-colors"
          />
        </div>
      </div>

      {/* Selection toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent/40 bg-accent/[0.07] px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="font-medium text-ink tnum">{selectedIds.size} selected</span>
            {selectedIds.size < filtered.length && (
              <button onClick={selectAllFiltered} className="text-accent-deep hover:text-ink text-xs font-medium underline underline-offset-2">
                Select all {filtered.length}
              </button>
            )}
            <button onClick={clearSelection} className="text-muted hover:text-ink text-xs underline underline-offset-2">Clear</button>
          </div>
          <button
            onClick={openConfirm}
            className="inline-flex items-center gap-2 rounded border border-danger bg-danger text-paper px-3.5 py-2 font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            <Trash2 className="w-4 h-4" /> Delete permanently
          </button>
        </div>
      )}

      {/* List */}
      <div>
        {loading ? (
          <div className="flex items-center justify-center gap-2 text-muted py-20 rounded-lg border border-rule">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading records…
          </div>
        ) : error ? (
          <ErrorBlock message={error} onRetry={() => loadTab(tab)} />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center text-center gap-3 py-20 rounded-lg border border-rule">
            <Inbox className="w-8 h-8 text-muted" strokeWidth={1.5} />
            <p className="text-ink-2">
              {search.trim()
                ? <>No records match “<span className="text-ink">{search.trim()}</span>”.</>
                : `No ${tab === 'individual' ? 'individual' : 'household'} records yet.`}
            </p>
            {search.trim() && <button onClick={() => onSearch('')} className="tlink">Clear search</button>}
          </div>
        ) : (
          <>
            <RecordsTable
              records={paged}
              onSelect={setSelected}
              onGenerate={handleGenerate}
              sort={sort}
              onSort={toggleSort}
              selectedIds={selectedIds}
              onToggle={toggleId}
              onToggleAllVisible={toggleAllVisible}
            />
            <div className="mt-5 flex items-center justify-between gap-4 font-mono text-xs text-muted">
              <span className="tnum">
                {clampedPage * PAGE_SIZE + 1}–{Math.min((clampedPage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              {pageCount > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={clampedPage === 0}
                    className="inline-flex items-center justify-center w-9 h-9 rounded border border-rule text-ink disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-2 transition-colors"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="tnum tabular-nums">{clampedPage + 1} / {pageCount}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                    disabled={clampedPage >= pageCount - 1}
                    className="inline-flex items-center justify-center w-9 h-9 rounded border border-rule text-ink disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-2 transition-colors"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <RecordDetail
        record={selected}
        onClose={() => setSelected(null)}
        onGenerate={handleGenerate}
        onUpdated={handleUpdated}
        onDeleted={handleDeleted}
        onAuthError={handleAuthError}
      />

      {/* Bulk permanent-delete confirmation */}
      {confirmBulk && (
        <div className="fixed inset-0 z-[320]">
          <div className="absolute inset-0 bg-forest-deep/50 backdrop-blur-[2px]" onClick={() => !bulkBusy && setConfirmBulk(false)} aria-hidden="true" />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirm permanent deletion"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(92vw,28rem)] rounded-xl border border-rule bg-paper shadow-2xl p-6 animate-[hm-rise_0.2s_ease-out]"
          >
            <div className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-danger/10 text-danger shrink-0">
                <AlertTriangle className="w-5 h-5" strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-xl text-ink">
                  Delete {selectedIds.size} record{selectedIds.size === 1 ? '' : 's'}?
                </h2>
                <p className="mt-1 text-sm text-ink-2">
                  This permanently removes the selected {tab === 'individual' ? 'individual' : 'household'} record
                  {selectedIds.size === 1 ? '' : 's'}. This cannot be undone.
                </p>
              </div>
              <button onClick={() => !bulkBusy && setConfirmBulk(false)} aria-label="Close" className="ml-auto -mt-1 text-muted hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>

            <label htmlFor="bulk-confirm" className="block mt-5 font-mono text-[0.64rem] uppercase tracking-[0.14em] text-muted mb-2">
              Type <span className="text-danger">DELETE</span> to confirm
            </label>
            <input
              id="bulk-confirm"
              autoFocus
              value={confirmText}
              disabled={bulkBusy}
              onChange={(e) => setConfirmText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setConfirmBulk(false);
                if (e.key === 'Enter' && confirmText.trim().toUpperCase() === 'DELETE') void runBulkDelete();
              }}
              placeholder="DELETE"
              className="w-full rounded bg-paper-2 border border-rule focus:border-danger px-3 py-2.5 text-sm text-ink transition-colors disabled:opacity-60"
            />

            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={runBulkDelete}
                disabled={bulkBusy || confirmText.trim().toUpperCase() !== 'DELETE'}
                className="inline-flex items-center justify-center gap-2 flex-1 rounded border border-danger bg-danger text-paper px-4 py-2.5 font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete permanently
              </button>
              <button onClick={() => setConfirmBulk(false)} disabled={bulkBusy} className="chip">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecordsPage;
