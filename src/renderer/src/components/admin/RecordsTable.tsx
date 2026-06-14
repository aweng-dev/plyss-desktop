import React from 'react';
import { CreditCard as IdCardIcon, ChevronRight, ArrowUp, ArrowDown, Check, Minus } from 'lucide-react';
import type { AnyRecord, IndividualRecord, FamilyRecord } from '../../lib/adminApi';
import type { SortKey, SortState } from '../../pages/admin/RecordsPage';
import { displayName, photoUrl, initials, titleCase, formatDateTime } from '../../lib/recordHelpers';

interface Props {
  records: AnyRecord[];
  onSelect: (r: AnyRecord) => void;
  onGenerate: (r: AnyRecord) => void;
  sort?: SortState;
  onSort?: (key: SortKey) => void;
  /** When provided (with onToggle), selection checkboxes are shown. */
  selectedIds?: Set<number>;
  onToggle?: (id: number) => void;
  onToggleAllVisible?: () => void;
}

const SelectBox: React.FC<{ checked: boolean; indeterminate?: boolean; onChange: () => void; label: string }> = ({
  checked, indeterminate, onChange, label,
}) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={indeterminate ? 'mixed' : checked}
    aria-label={label}
    onClick={(e) => { e.stopPropagation(); onChange(); }}
    className={`inline-flex items-center justify-center w-5 h-5 rounded border shrink-0 transition-colors ${
      checked || indeterminate ? 'bg-forest border-forest text-on-forest' : 'border-rule bg-paper hover:border-ink-2'
    }`}
  >
    {indeterminate ? <Minus className="w-3.5 h-3.5" /> : checked ? <Check className="w-3.5 h-3.5" /> : null}
  </button>
);

const Avatar: React.FC<{ record: AnyRecord; size?: number }> = ({ record, size = 38 }) => {
  const url = photoUrl(record);
  const name = displayName(record);
  return (
    <span
      className="inline-flex items-center justify-center overflow-hidden rounded-full bg-paper-3 border border-rule shrink-0"
      style={{ width: size, height: size }}
    >
      {url ? (
        <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <span className="font-display text-sm text-ink-2">{initials(name)}</span>
      )}
    </span>
  );
};

const subtitle = (r: AnyRecord): string =>
  r.type === 'individual'
    ? titleCase((r as IndividualRecord).occupation) || 'Individual'
    : `${(r as FamilyRecord).household_size || '—'} household`;

const RecordsTable: React.FC<Props> = ({ records, onSelect, onGenerate, sort, onSort, selectedIds, onToggle, onToggleAllVisible }) => {
  const selectable = Boolean(selectedIds && onToggle);
  const visibleIds = records.map((r) => r.id);
  const allSelected = selectable && records.length > 0 && visibleIds.every((id) => selectedIds!.has(id));
  const someSelected = selectable && !allSelected && visibleIds.some((id) => selectedIds!.has(id));

  const SortHead: React.FC<{ label: string; sortKey: SortKey; className?: string }> = ({ label, sortKey, className = '' }) => {
    const active = sort?.key === sortKey;
    if (!onSort) return <th className={`font-medium px-4 py-3 ${className}`}>{label}</th>;
    return (
      <th className={`font-medium px-4 py-3 ${className}`}>
        <button
          onClick={() => onSort(sortKey)}
          className={`inline-flex items-center gap-1 uppercase tracking-[0.14em] transition-colors ${active ? 'text-ink' : 'hover:text-ink'}`}
          aria-label={`Sort by ${label}`}
        >
          {label}
          {active && (sort!.dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
        </button>
      </th>
    );
  };

  return (
    <div>
      {/* Desktop table */}
      <div className="hidden md:block overflow-hidden rounded-lg border border-rule">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-paper-2 text-left font-mono text-[0.68rem] uppercase tracking-[0.14em] text-muted">
              {selectable && (
                <th className="px-4 py-3 w-10">
                  <SelectBox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={() => onToggleAllVisible?.()}
                    label={allSelected ? 'Deselect all on this page' : 'Select all on this page'}
                  />
                </th>
              )}
              <SortHead label="Name" sortKey="name" />
              <SortHead label="PLYSS ID" sortKey="plyss_id" />
              <SortHead label="LGA of residence" sortKey="lga" />
              <th className="font-medium px-4 py-3">Phone</th>
              <SortHead label="Recorded" sortKey="recorded" />
              <th className="font-medium px-4 py-3 text-right">Card</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => {
              const isChecked = selectable && selectedIds!.has(r.id);
              return (
              <tr
                key={`${r.type}-${r.id}`}
                onClick={() => onSelect(r)}
                className={`border-t border-rule cursor-pointer transition-colors ${isChecked ? 'bg-accent/[0.07] hover:bg-accent/10' : 'hover:bg-paper-2'}`}
              >
                {selectable && (
                  <td className="px-4 py-3">
                    <SelectBox checked={isChecked} onChange={() => onToggle!(r.id)} label={`Select ${displayName(r)}`} />
                  </td>
                )}
                <td className="px-4 py-3">
                  <span className="flex items-center gap-3 min-w-0">
                    <Avatar record={r} />
                    <span className="min-w-0">
                      <span className="block font-medium text-ink truncate">{displayName(r)}</span>
                      <span className="block text-xs text-muted truncate">{subtitle(r)}</span>
                    </span>
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-accent-deep whitespace-nowrap">{r.plyss_id || '—'}</td>
                <td className="px-4 py-3 text-ink-2">{titleCase(r.lga_of_residence) || '—'}</td>
                <td className="px-4 py-3 text-ink-2 whitespace-nowrap">{r.phone_number || '—'}</td>
                <td className="px-4 py-3 text-muted whitespace-nowrap">{formatDateTime(r.created_at)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={(e) => { e.stopPropagation(); onGenerate(r); }}
                    className="inline-flex items-center gap-1.5 rounded border border-rule px-2.5 py-1.5 font-mono text-[0.68rem] uppercase tracking-[0.12em] text-ink hover:border-ink hover:bg-paper transition-colors"
                    aria-label={`Generate ID card for ${displayName(r)}`}
                  >
                    <IdCardIcon className="w-3.5 h-3.5" /> ID
                  </button>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="md:hidden space-y-3">
        {records.map((r) => {
          const isChecked = selectable && selectedIds!.has(r.id);
          return (
          <li key={`${r.type}-${r.id}`} className="flex items-center gap-2">
            {selectable && (
              <SelectBox checked={isChecked} onChange={() => onToggle!(r.id)} label={`Select ${displayName(r)}`} />
            )}
            <button
              onClick={() => onSelect(r)}
              className={`flex-1 min-w-0 text-left rounded-lg border p-4 flex items-center gap-3 transition-colors ${
                isChecked ? 'border-accent/50 bg-accent/[0.07]' : 'border-rule bg-paper-2 hover:border-ink-2'
              }`}
            >
              <Avatar record={r} size={44} />
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-ink truncate">{displayName(r)}</span>
                <span className="block font-mono text-xs text-accent-deep truncate">{r.plyss_id || '—'}</span>
                <span className="block text-xs text-muted truncate mt-0.5">
                  {titleCase(r.lga_of_residence)} · {formatDateTime(r.created_at)}
                </span>
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); onGenerate(r); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onGenerate(r); } }}
                className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded border border-rule text-ink"
                aria-label={`Generate ID card for ${displayName(r)}`}
              >
                <IdCardIcon className="w-4 h-4" />
              </span>
              <ChevronRight className="w-4 h-4 text-muted shrink-0" aria-hidden="true" />
            </button>
          </li>
          );
        })}
      </ul>
    </div>
  );
};

export default RecordsTable;
