import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, UserPlus, X, ShieldCheck, Power, AlertCircle, Eye, EyeOff,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  fetchAdmins, createAdmin, setAdminActive, ApiError, type AdminUser,
} from '../../lib/adminApi';
import { titleCase, formatDateTime, timeAgo, initials } from '../../lib/recordHelpers';
import { PageHeader, ErrorBlock, StatusBadge } from '../../components/admin/ui';
import { useToast } from '../../components/admin/Toast';

const emailValid = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const TeamPage: React.FC = () => {
  const navigate = useNavigate();
  const { session, logout } = useAuth();
  const toast = useToast();
  const myEmail = (session?.admin?.email ?? '').toLowerCase();

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  // Add-admin form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
      setAdmins(await fetchAdmins());
    } catch (e) {
      if (!handleAuthError(e)) setError(e instanceof Error ? e.message : 'Could not load the team.');
    } finally {
      setLoading(false);
    }
  }, [handleAuthError]);

  useEffect(() => { void load(); }, [load]);

  const toggleActive = async (a: AdminUser) => {
    const willActivate = !a.is_active;
    setBusyId(a.id);
    try {
      await setAdminActive(a.id, willActivate);
      setAdmins((cur) => cur.map((x) => (x.id === a.id ? { ...x, is_active: willActivate ? 1 : 0 } : x)));
      toast.success(`${a.full_name ? titleCase(a.full_name) : a.email} — access ${willActivate ? 'restored' : 'revoked'}.`);
    } catch (e) {
      if (!handleAuthError(e)) toast.error(e instanceof Error ? e.message : 'Could not update the admin.');
    } finally {
      setBusyId(null);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!emailValid(form.email)) { setFormError('Enter a valid email address.'); return; }
    if (form.password.length < 10 || !/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      setFormError('Password must be at least 10 characters and include a letter and a number.');
      return;
    }
    setSubmitting(true);
    try {
      const created = await createAdmin({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        full_name: form.full_name.trim() || undefined,
      });
      setAdmins((cur) => [created, ...cur.filter((a) => a.id !== created.id)]);
      toast.success(`${created.email} can now sign in.`);
      setForm({ full_name: '', email: '', password: '' });
      setShowForm(false);
    } catch (err) {
      if (!handleAuthError(err)) setFormError(err instanceof Error ? err.message : 'Could not create the admin.');
    } finally {
      setSubmitting(false);
    }
  };

  const labelClass = 'block font-mono text-[0.68rem] uppercase tracking-[0.14em] text-muted mb-2';
  const inputClass = 'w-full rounded bg-paper border border-rule focus:border-forest px-3.5 py-2.5 text-sm text-ink placeholder:text-muted transition-colors';

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Administration" title="Team">
        <button onClick={() => { setShowForm((v) => !v); setFormError(null); }} className="chip chip--solid">
          {showForm ? <><X className="w-4 h-4" /> Cancel</> : <><UserPlus className="w-4 h-4" /> Add admin</>}
        </button>
      </PageHeader>

      <p className="text-ink-2 max-w-prose -mt-2">
        Everyone with access to this console. Admins can manage records, enumerators and the
        team itself — grant access carefully.
      </p>

      {/* Add-admin form */}
      {showForm && (
        <form onSubmit={submit} className="rounded-lg border border-rule bg-paper-2 p-5 sm:p-6 space-y-5">
          <h2 className="font-display text-xl text-ink">Add an administrator</h2>
          {formError && (
            <div role="alert" className="flex items-start gap-2.5 rounded border border-danger bg-paper px-4 py-3 text-sm text-danger">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={2} /> <span>{formError}</span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="na-name" className={labelClass}>Full name <span className="text-muted normal-case tracking-normal">(optional)</span></label>
              <input id="na-name" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} className={inputClass} placeholder="Jane Doe" disabled={submitting} />
            </div>
            <div>
              <label htmlFor="na-email" className={labelClass}>Email</label>
              <input id="na-email" type="email" autoComplete="off" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inputClass} placeholder="admin@plyss.ng" disabled={submitting} />
            </div>
          </div>
          <div>
            <label htmlFor="na-pw" className={labelClass}>Temporary password</label>
            <div className="relative">
              <input
                id="na-pw"
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className={`${inputClass} pr-11`}
                placeholder="At least 10 characters"
                disabled={submitting}
              />
              <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-0 flex items-center justify-center w-11 text-muted hover:text-ink">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="mt-2 text-xs text-muted">Must include a letter and a number. Share it securely; the admin can change it later.</p>
          </div>
          <button type="submit" disabled={submitting} className="chip chip--solid disabled:opacity-70">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : <><UserPlus className="w-4 h-4" /> Create admin</>}
          </button>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 text-muted py-20 rounded-lg border border-rule">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading team…
        </div>
      ) : error ? (
        <ErrorBlock message={error} onRetry={load} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-rule">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-paper-2 text-left font-mono text-[0.66rem] uppercase tracking-[0.14em] text-muted">
                <th className="font-medium px-4 py-3">Administrator</th>
                <th className="font-medium px-4 py-3 hidden sm:table-cell">Role</th>
                <th className="font-medium px-4 py-3">Status</th>
                <th className="font-medium px-4 py-3 hidden md:table-cell">Last login</th>
                <th className="font-medium px-4 py-3 text-right">Access</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => {
                const isSelf = a.email.toLowerCase() === myEmail;
                const active = Boolean(a.is_active);
                return (
                  <tr key={a.id} className="border-t border-rule">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-3 min-w-0">
                        <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-paper-3 border border-rule shrink-0 font-display text-sm text-ink-2">
                          {initials(a.full_name || a.email)}
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="font-medium text-ink truncate">{a.full_name ? titleCase(a.full_name) : a.email}</span>
                            {isSelf && <span className="shrink-0 font-mono text-[0.55rem] uppercase tracking-[0.12em] text-accent-deep border border-accent/40 rounded px-1.5 py-0.5">You</span>}
                          </span>
                          <span className="block text-xs text-muted truncate">{a.email}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="inline-flex items-center gap-1.5 text-ink-2 capitalize">
                        <ShieldCheck className="w-3.5 h-3.5 text-forest" /> {a.role}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={active ? 'active' : 'inactive'} /></td>
                    <td className="px-4 py-3 text-muted whitespace-nowrap hidden md:table-cell">
                      {a.last_login ? timeAgo(a.last_login) : 'Never'}
                      <span className="block text-[0.7rem] text-muted/70">Joined {formatDateTime(a.created_at)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => toggleActive(a)}
                        disabled={busyId === a.id || isSelf}
                        title={isSelf ? 'You cannot change your own access' : active ? 'Revoke access' : 'Restore access'}
                        className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.1em] transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                          active
                            ? 'border-danger/40 text-danger hover:bg-danger hover:text-paper'
                            : 'border-forest/40 text-forest hover:bg-forest hover:text-on-forest'
                        }`}
                      >
                        {busyId === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
                        {active ? 'Revoke' : 'Restore'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TeamPage;
