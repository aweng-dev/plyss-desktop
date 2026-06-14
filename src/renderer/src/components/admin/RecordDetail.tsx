import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, CreditCard as IdCardIcon, Pencil, Trash2, Save, Loader2, AlertTriangle } from 'lucide-react';
import {
  EDITABLE_FIELDS, updateRecord, deleteRecord, ApiError,
  type AnyRecord,
} from '../../lib/adminApi';
import { displayName, photoUrl, initials, recordSections } from '../../lib/recordHelpers';
import { useToast } from './Toast';

interface Props {
  record: AnyRecord | null;
  onClose: () => void;
  onGenerate: (r: AnyRecord) => void;
  /** Called with the patched record after a successful save. */
  onUpdated?: (r: AnyRecord) => void;
  /** Called after a successful delete. */
  onDeleted?: (r: AnyRecord) => void;
  /** Bubble a 401/403 up so the page can sign the admin out. */
  onAuthError?: (e: unknown) => boolean;
}

const RecordDetail: React.FC<Props> = ({ record, onClose, onGenerate, onUpdated, onDeleted, onAuthError }) => {
  const closeRef = useRef<HTMLButtonElement>(null);
  const toast = useToast();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fields = useMemo(() => (record ? EDITABLE_FIELDS[record.type] : []), [record]);

  // Reset transient UI whenever the selected record changes.
  useEffect(() => {
    setEditing(false);
    setConfirmDelete(false);
    setForm({});
  }, [record?.type, record?.id]);

  useEffect(() => {
    if (!record) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (confirmDelete) setConfirmDelete(false);
      else if (editing) setEditing(false);
      else onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [record, onClose, editing, confirmDelete]);

  if (!record) return null;

  const name = displayName(record);
  const url = photoUrl(record);
  const typeLabel = record.type === 'individual' ? 'Individual' : 'Household';

  const startEdit = () => {
    const init: Record<string, string> = {};
    const row = record as unknown as Record<string, unknown>;
    for (const f of fields) init[f.key] = String(row[f.key] ?? '');
    setForm(init);
    setConfirmDelete(false);
    setEditing(true);
  };

  const save = async () => {
    // Only send fields that actually changed.
    const patch: Record<string, string> = {};
    const row = record as unknown as Record<string, unknown>;
    for (const f of fields) {
      const next = (form[f.key] ?? '').trim();
      const prev = String(row[f.key] ?? '');
      if (next !== prev) patch[f.key] = next;
    }
    if (Object.keys(patch).length === 0) { setEditing(false); return; }

    setSaving(true);
    try {
      const updated = await updateRecord(record.type, record.id, patch);
      onUpdated?.(updated);
      toast.success('Record updated.');
      setEditing(false);
    } catch (e) {
      if (onAuthError?.(e)) return;
      toast.error(e instanceof ApiError ? e.message : 'Could not update the record.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await deleteRecord(record.type, record.id);
      onDeleted?.(record);
      toast.success(`${name || 'Record'} deleted.`);
      onClose();
    } catch (e) {
      if (onAuthError?.(e)) return;
      toast.error(e instanceof ApiError ? e.message : 'Could not delete the record.');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300]">
      <div className="absolute inset-0 bg-forest-deep/40 backdrop-blur-[1px]" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Record for ${name}`}
        className="absolute inset-y-0 right-0 w-full max-w-md bg-paper shadow-2xl flex flex-col animate-[hm-rise_0.28s_ease-out]"
      >
        {/* header */}
        <div className="focus-on-dark bg-forest-deep text-on-forest px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <span className="inline-flex items-center gap-1 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-accent">
              {editing ? `Editing ${typeLabel.toLowerCase()}` : `${typeLabel} record`}
            </span>
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 -mt-1 inline-flex items-center justify-center w-9 h-9 text-on-forest-2 hover:text-on-forest"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-4">
            <span className="inline-flex items-center justify-center w-16 h-16 rounded-lg overflow-hidden bg-forest border border-rule-forest shrink-0">
              {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : <span className="font-display text-xl text-on-forest">{initials(name)}</span>}
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-2xl text-on-forest leading-tight break-words">{name}</h2>
              <p className="mt-1 font-mono text-sm text-accent">{record.plyss_id || '—'}</p>
            </div>
          </div>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {editing ? (
            <div className="space-y-4">
              {fields.map((f) => (
                <div key={f.key}>
                  <label htmlFor={`edit-${f.key}`} className="block font-mono text-[0.64rem] uppercase tracking-[0.14em] text-muted mb-1.5">
                    {f.label}
                  </label>
                  <input
                    id={`edit-${f.key}`}
                    value={form[f.key] ?? ''}
                    disabled={saving}
                    onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                    className="w-full rounded bg-paper-2 border border-rule focus:border-forest px-3 py-2 text-sm text-ink transition-colors disabled:opacity-60"
                  />
                </div>
              ))}
            </div>
          ) : (
            recordSections(record).map((section) => (
              <section key={section.heading} className="mb-7 last:mb-0">
                <h3 className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-muted border-b border-rule pb-2">
                  {section.heading}
                </h3>
                <dl className="mt-3 grid grid-cols-1 gap-y-3">
                  {section.fields.map((f) => (
                    <div key={f.label} className="grid grid-cols-[9rem_minmax(0,1fr)] gap-3">
                      <dt className="text-sm text-muted">{f.label}</dt>
                      <dd className="text-sm text-ink break-words">{f.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))
          )}
        </div>

        {/* footer */}
        <div className="border-t border-rule px-6 py-4 bg-paper">
          {confirmDelete ? (
            <div className="space-y-3">
              <p className="flex items-start gap-2 text-sm text-ink">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-danger" strokeWidth={2} />
                Permanently delete this record? This can’t be undone.
              </p>
              <div className="flex items-center gap-3">
                <button onClick={remove} disabled={deleting} className="inline-flex items-center justify-center gap-2 flex-1 rounded border border-danger bg-danger text-paper px-4 py-2.5 font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60">
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete permanently
                </button>
                <button onClick={() => setConfirmDelete(false)} disabled={deleting} className="chip">Cancel</button>
              </div>
            </div>
          ) : editing ? (
            <div className="flex items-center gap-3">
              <button onClick={save} disabled={saving} className="chip chip--solid flex-1 justify-center disabled:opacity-70">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save changes
              </button>
              <button onClick={() => setEditing(false)} disabled={saving} className="chip">Cancel</button>
            </div>
          ) : (
            <div className="space-y-3">
              <button onClick={() => onGenerate(record)} className="chip chip--solid w-full justify-center">
                <IdCardIcon className="w-4 h-4" /> Generate identity card
              </button>
              <div className="flex items-center gap-3">
                <button onClick={startEdit} className="chip flex-1 justify-center">
                  <Pencil className="w-4 h-4" /> Edit
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center justify-center gap-2 rounded border border-rule px-4 py-2.5 font-semibold text-sm text-danger hover:border-danger hover:bg-danger hover:text-paper transition-colors"
                  aria-label="Delete record"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecordDetail;
