import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Inbox, Loader2, Download, CheckCircle2, Ban, RotateCcw, Mail, Phone, MapPin,
  KeyRound, Eye, EyeOff, X, Copy, Check, AlertCircle, Wand2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  fetchEnumerators, setEnumeratorStatus, setEnumeratorPassword, downloadFile, recordsToCsv, ApiError,
  type Enumerator, type EnumeratorStatus,
} from '../../lib/adminApi';
import { titleCase, formatDateTime, timeAgo, initials } from '../../lib/recordHelpers';
import { PageHeader, ErrorBlock, StatusBadge } from '../../components/admin/ui';
import { useToast } from '../../components/admin/Toast';

type Filter = 'all' | EnumeratorStatus;

const matches = (e: Enumerator, q: string): boolean =>
  [e.full_name, e.email, e.phone, e.assigned_state, e.assigned_lga]
    .filter(Boolean).join(' ').toLowerCase().includes(q);

/** Backend policy: ≥8 chars with at least one letter and one number. */
const passwordValid = (v: string): boolean =>
  v.length >= 8 && /[A-Za-z]/.test(v) && /[0-9]/.test(v);

/** A strong, readable temporary password — guaranteed to satisfy the policy. */
function generatePassword(len = 16): string {
  const lower = 'abcdefghijkmnpqrstuvwxyz'; // no l
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I, O
  const digits = '23456789'; // no 0, 1
  const all = lower + upper + digits;
  const rand = (n: number) => crypto.getRandomValues(new Uint32Array(1))[0] % n;
  const pick = (set: string) => set[rand(set.length)];
  const chars = [pick(lower), pick(upper), pick(digits)];
  while (chars.length < len) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

/** Copy text to the clipboard, with a fallback for non-secure contexts (file://). */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

/**
 * Modal for an admin to set/reset an enumerator's password. Defined at module
 * scope (not nested) so typing isn't lost if the parent re-renders. The admin can
 * type a password or generate a strong one, then copy it to share securely.
 */
const PasswordDialog: React.FC<{
  enumerator: Enumerator;
  onClose: () => void;
  /** Returns true if the error was an auth error and has been handled (redirect). */
  onError: (e: unknown) => boolean;
  onSuccess: (name: string) => void;
}> = ({ enumerator, onClose, onError, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape' && !submitting) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [submitting, onClose]);

  const generate = () => { setPassword(generatePassword()); setShow(true); setErr(null); setCopied(false); };
  const copy = async () => { if (password) setCopied(await copyText(password)); };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setErr(null);
    if (!passwordValid(password)) {
      setErr('Password must be at least 8 characters and include a letter and a number.');
      return;
    }
    setSubmitting(true);
    try {
      await setEnumeratorPassword(enumerator.id, password);
      onSuccess(titleCase(enumerator.full_name));
      onClose();
    } catch (error) {
      if (!onError(error)) setErr(error instanceof Error ? error.message : 'Could not reset the password.');
      setSubmitting(false);
    }
  };

  const inputClass = 'w-full rounded bg-paper border border-rule focus:border-forest px-3.5 py-2.5 text-sm text-ink placeholder:text-muted transition-colors';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="pw-title">
      <div className="absolute inset-0 bg-forest-deep/50 backdrop-blur-[1px]" onClick={() => !submitting && onClose()} aria-hidden="true" />
      <div className="relative w-full max-w-md rounded-lg border border-rule bg-paper-2 p-5 sm:p-6 shadow-xl animate-[hm-rise_0.2s_ease-out]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-muted">Reset password</p>
            <h2 id="pw-title" className="mt-1 font-display text-xl text-ink truncate">{titleCase(enumerator.full_name)}</h2>
            <p className="text-xs text-muted truncate">{enumerator.email}</p>
          </div>
          <button onClick={() => !submitting && onClose()} aria-label="Close" className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded border border-rule text-muted hover:text-ink transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          {err && (
            <div role="alert" className="flex items-start gap-2.5 rounded border border-danger bg-paper px-4 py-3 text-sm text-danger">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={2} /> <span>{err}</span>
            </div>
          )}
          <div>
            <label htmlFor="pw-new" className="block font-mono text-[0.68rem] uppercase tracking-[0.14em] text-muted mb-2">New password</label>
            <div className="relative">
              <input
                id="pw-new"
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(ev) => { setPassword(ev.target.value); setCopied(false); }}
                className={`${inputClass} pr-[4.5rem] font-mono`}
                placeholder="At least 8 characters"
                disabled={submitting}
                autoFocus
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-1">
                <button type="button" onClick={copy} disabled={!password} aria-label="Copy password" title="Copy" className="flex items-center justify-center w-9 h-full text-muted hover:text-ink disabled:opacity-40">
                  {copied ? <Check className="w-4 h-4 text-forest" /> : <Copy className="w-4 h-4" />}
                </button>
                <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} className="flex items-center justify-center w-9 h-full text-muted hover:text-ink">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="button" onClick={generate} className="mt-2 inline-flex items-center gap-1.5 font-mono text-[0.62rem] uppercase tracking-[0.1em] text-forest hover:text-forest-deep transition-colors">
              <Wand2 className="w-3.5 h-3.5" /> Generate strong password
            </button>
          </div>

          <p className="text-xs leading-relaxed text-muted">
            This immediately signs the enumerator out of any active sessions. Share the new
            password with them securely; they can change it later.
          </p>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={submitting} className="chip disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={submitting || !password} className="chip chip--solid disabled:opacity-60">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><KeyRound className="w-4 h-4" /> Reset password</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EnumeratorsPage: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const toast = useToast();

  const [list, setList] = useState<Enumerator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [pwTarget, setPwTarget] = useState<Enumerator | null>(null);

  const handleAuthError = useCallback((e: unknown): boolean => {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
      logout();
      navigate('/admin/login', { replace: true });
      return true;
    }
    return false;
  }, [logout, navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { enumerators } = await fetchEnumerators();
      setList(enumerators);
    } catch (e) {
      if (!handleAuthError(e)) setError(e instanceof Error ? e.message : 'Could not load enumerators.');
    } finally {
      setLoading(false);
    }
  }, [handleAuthError]);

  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: list.length, approved: 0, pending: 0, suspended: 0 };
    for (const e of list) c[e.status] = (c[e.status] ?? 0) + 1;
    return c;
  }, [list]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((e) => (filter === 'all' || e.status === filter) && (!q || matches(e, q)));
  }, [list, filter, search]);

  const changeStatus = async (e: Enumerator, status: EnumeratorStatus) => {
    setBusyId(e.id);
    const prev = list;
    setList((cur) => cur.map((x) => (x.id === e.id ? { ...x, status } : x))); // optimistic
    try {
      const updated = await setEnumeratorStatus(e.id, status);
      setList((cur) => cur.map((x) => (x.id === e.id ? updated : x)));
      const verb = status === 'approved' ? 'approved' : status === 'suspended' ? 'suspended' : 'moved to pending';
      toast.success(`${titleCase(e.full_name)} ${verb}.`);
    } catch (err) {
      setList(prev); // revert
      if (!handleAuthError(err)) toast.error(err instanceof Error ? err.message : 'Could not update status.');
    } finally {
      setBusyId(null);
    }
  };

  const exportCsv = () => {
    if (filtered.length === 0) return;
    const stamp = new Date().toISOString().slice(0, 10);
    downloadFile(`plyss-enumerators-${stamp}.csv`, recordsToCsv(filtered));
  };

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'approved', label: 'Approved' },
    { id: 'pending', label: 'Pending' },
    { id: 'suspended', label: 'Suspended' },
  ];

  const RowActions: React.FC<{ e: Enumerator }> = ({ e }) => {
    const busy = busyId === e.id;
    return (
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => setPwTarget(e)}
          disabled={busy}
          className="inline-flex items-center justify-center w-8 h-8 rounded border border-rule text-muted hover:text-forest hover:border-forest transition-colors disabled:opacity-50"
          title="Reset password"
          aria-label={`Reset password for ${titleCase(e.full_name)}`}
        >
          <KeyRound className="w-3.5 h-3.5" />
        </button>
        {e.status !== 'approved' && (
          <button
            onClick={() => changeStatus(e, 'approved')}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded border border-forest/40 text-forest px-2.5 py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.1em] hover:bg-forest hover:text-on-forest transition-colors disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Approve
          </button>
        )}
        {e.status === 'approved' && (
          <button
            onClick={() => changeStatus(e, 'suspended')}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded border border-danger/40 text-danger px-2.5 py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.1em] hover:bg-danger hover:text-paper transition-colors disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />} Suspend
          </button>
        )}
        {e.status === 'suspended' && (
          <button
            onClick={() => changeStatus(e, 'pending')}
            disabled={busy}
            className="inline-flex items-center justify-center w-8 h-8 rounded border border-rule text-muted hover:text-ink hover:border-ink transition-colors disabled:opacity-50"
            title="Move back to pending"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Field workers" title="Enumerators">
        <button onClick={exportCsv} disabled={loading || filtered.length === 0} className="chip disabled:opacity-50 disabled:cursor-not-allowed">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </PageHeader>

      <p className="text-ink-2 max-w-prose -mt-2">
        Everyone who has registered to collect surveys in the field. Approve new sign-ups,
        or suspend an account to immediately block it from logging in.
      </p>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg border border-rule bg-paper-2 w-fit">
          {filters.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                aria-pressed={active}
                className={`px-3.5 py-2 font-mono text-xs uppercase tracking-[0.12em] rounded transition-colors ${
                  active ? 'bg-forest text-on-forest' : 'text-muted hover:text-ink'
                }`}
              >
                {f.label}
                <span className={`ml-2 tnum ${active ? 'text-on-forest-2' : 'text-muted'}`}>{counts[f.id] ?? 0}</span>
              </button>
            );
          })}
        </div>
        <div className="relative sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, state…"
            aria-label="Search enumerators"
            className="w-full rounded bg-paper-2 border border-rule focus:border-forest pl-9 pr-3 py-2.5 text-sm text-ink placeholder:text-muted transition-colors"
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 text-muted py-20 rounded-lg border border-rule">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading enumerators…
        </div>
      ) : error ? (
        <ErrorBlock message={error} onRetry={load} />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center text-center gap-3 py-20 rounded-lg border border-rule">
          <Inbox className="w-8 h-8 text-muted" strokeWidth={1.5} />
          <p className="text-ink-2">
            {search.trim() || filter !== 'all' ? 'No enumerators match this view.' : 'No enumerators have registered yet.'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-hidden rounded-lg border border-rule">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-paper-2 text-left font-mono text-[0.66rem] uppercase tracking-[0.14em] text-muted">
                  <th className="font-medium px-4 py-3">Name</th>
                  <th className="font-medium px-4 py-3">Assignment</th>
                  <th className="font-medium px-4 py-3">Status</th>
                  <th className="font-medium px-4 py-3">Last login</th>
                  <th className="font-medium px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="border-t border-rule hover:bg-paper-2 transition-colors">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-3 min-w-0">
                        <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-paper-3 border border-rule shrink-0 font-display text-sm text-ink-2">
                          {initials(e.full_name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-medium text-ink truncate">{titleCase(e.full_name)}</span>
                          <span className="block text-xs text-muted truncate">{e.email}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-2">
                      {e.assigned_state || e.assigned_lga
                        ? `${titleCase(e.assigned_lga || '')}${e.assigned_lga && e.assigned_state ? ', ' : ''}${titleCase(e.assigned_state || '')}`
                        : <span className="text-muted">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                    <td className="px-4 py-3 text-muted whitespace-nowrap">{e.last_login ? timeAgo(e.last_login) : 'Never'}</td>
                    <td className="px-4 py-3"><RowActions e={e} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="md:hidden space-y-3">
            {filtered.map((e) => (
              <li key={e.id} className="rounded-lg border border-rule bg-paper-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-paper-3 border border-rule shrink-0 font-display text-sm text-ink-2">
                      {initials(e.full_name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium text-ink truncate">{titleCase(e.full_name)}</span>
                      <span className="flex items-center gap-1 text-xs text-muted truncate"><Mail className="w-3 h-3 shrink-0" /><span className="truncate">{e.email}</span></span>
                    </span>
                  </span>
                  <StatusBadge status={e.status} />
                </div>
                <dl className="mt-3 grid grid-cols-1 gap-1.5 text-xs text-muted">
                  {e.phone && <dd className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {e.phone}</dd>}
                  <dd className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" />
                    {e.assigned_state || e.assigned_lga
                      ? `${titleCase(e.assigned_lga || '')}${e.assigned_lga && e.assigned_state ? ', ' : ''}${titleCase(e.assigned_state || '')}`
                      : 'Unassigned'}
                  </dd>
                  <dd>Joined {formatDateTime(e.created_at)} · Last login {e.last_login ? timeAgo(e.last_login) : 'never'}</dd>
                </dl>
                <div className="mt-3 pt-3 border-t border-rule"><RowActions e={e} /></div>
              </li>
            ))}
          </ul>
        </>
      )}

      {pwTarget && (
        <PasswordDialog
          enumerator={pwTarget}
          onClose={() => setPwTarget(null)}
          onError={handleAuthError}
          onSuccess={(name) => toast.success(`Password reset for ${name}. They’ll need to sign in again.`)}
        />
      )}
    </div>
  );
};

export default EnumeratorsPage;
