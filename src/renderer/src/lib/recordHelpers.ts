// Display helpers shared by the records table, detail drawer, and ID card.

import type { AnyRecord, IndividualRecord, FamilyRecord } from './adminApi';

export const titleCase = (s: string | null | undefined): string =>
  (s ?? '')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

/** Full name for an individual; household head for a family. */
export function displayName(r: AnyRecord): string {
  if (r.type === 'individual') {
    return [r.first_name, r.middle_name, r.last_name].filter(Boolean).map((p) => titleCase(p!)).join(' ');
  }
  return titleCase(r.household_head_name);
}

export function individualName(r: IndividualRecord): string {
  return [r.first_name, r.middle_name, r.last_name].filter(Boolean).map((p) => titleCase(p!)).join(' ');
}

export function photoUrl(r: AnyRecord): string | null {
  return r.type === 'individual' ? r.passport_photo_url : r.household_photo_url;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** SQLite timestamps look like "2026-06-11 16:26:49" (UTC). Render readably. */
export function formatDateTime(s: string | null | undefined): string {
  if (!s) return '—';
  const iso = s.includes('T') ? s : s.replace(' ', 'T') + 'Z';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Compact relative time ("3h ago", "just now") for activity feeds. */
export function timeAgo(s: string | null | undefined): string {
  if (!s) return '—';
  const iso = s.includes('T') ? s : s.replace(' ', 'T') + 'Z';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return formatDateTime(s);
  const diff = Math.max(0, Date.now() - then);
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return formatDateTime(s);
}

export function formatDate(s: string | null | undefined): string {
  if (!s) return '—';
  // DOB is already stored DD/MM/YYYY; pass through. Otherwise format.
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  return formatDateTime(s);
}

/** The verification URL encoded into an ID-card QR code. Includes the signed
 *  anti-enumeration token when available so the QR resolves on /verify. */
export function verifyUrl(plyssId: string | null | undefined, token?: string | null): string {
  const base = `https://plyss.ng/verify/${plyssId ?? ''}`;
  return token ? `${base}?t=${encodeURIComponent(token)}` : base;
}

export interface Field {
  label: string;
  value: string;
}

const v = (x: string | null | undefined): string => {
  const t = (x ?? '').toString().trim();
  return t.length ? t : '—';
};

/** Label/value pairs for the detail view, grouped. */
export function recordSections(r: AnyRecord): { heading: string; fields: Field[] }[] {
  if (r.type === 'individual') return individualSections(r);
  return familySections(r);
}

function individualSections(r: IndividualRecord): { heading: string; fields: Field[] }[] {
  return [
    {
      heading: 'Identity',
      fields: [
        { label: 'PLYSS ID', value: v(r.plyss_id) },
        { label: 'Full name', value: individualName(r) || '—' },
        { label: 'NIN', value: v(r.nin) },
        { label: 'Date of birth', value: formatDate(r.date_of_birth) },
        { label: 'Gender', value: titleCase(r.gender) },
        { label: 'Marital status', value: titleCase(r.marital_status) },
        { label: "Voter's no. (VIN)", value: v(r.vin) },
        { label: 'Occupation', value: titleCase(r.occupation) },
      ],
    },
    {
      heading: 'Origin & residence',
      fields: [
        { label: 'State of origin', value: titleCase(r.state_of_origin) },
        { label: 'LGA of origin', value: titleCase(r.lga_of_origin) },
        { label: 'State of residence', value: titleCase(r.state_of_residence) },
        { label: 'LGA of residence', value: titleCase(r.lga_of_residence) },
      ],
    },
    {
      heading: 'Contact',
      fields: [
        { label: 'Phone', value: v(r.phone_number) },
        { label: 'Email', value: v(r.email) },
        { label: 'Home address', value: v(r.home_address) },
        { label: 'Office / shop', value: v(r.office_address) },
      ],
    },
    {
      heading: 'Record',
      fields: [
        { label: 'Recorded', value: formatDateTime(r.created_at) },
        { label: 'Last updated', value: formatDateTime(r.updated_at) },
      ],
    },
  ];
}

function familySections(r: FamilyRecord): { heading: string; fields: Field[] }[] {
  const spouses = [r.spouse_1_name, r.spouse_2_name, r.spouse_3_name, r.spouse_4_name]
    .filter(Boolean)
    .map((s) => titleCase(s!));
  return [
    {
      heading: 'Household',
      fields: [
        { label: 'PLYSS ID', value: v(r.plyss_id) },
        { label: 'Head of household', value: titleCase(r.household_head_name) },
        { label: 'Household size', value: v(r.household_size) },
        { label: 'Number of children', value: v(r.number_of_children) },
        { label: 'Number of wives', value: v(r.number_of_wives) },
        { label: 'Spouses', value: spouses.length ? spouses.join(', ') : '—' },
      ],
    },
    {
      heading: 'Origin & residence',
      fields: [
        { label: 'State of origin', value: titleCase(r.state_of_origin) },
        { label: 'LGA of origin', value: titleCase(r.lga_of_origin) },
        { label: 'State of residence', value: titleCase(r.state_of_residence) },
        { label: 'LGA of residence', value: titleCase(r.lga_of_residence) },
      ],
    },
    {
      heading: 'Address & contact',
      fields: [
        { label: 'Household address', value: v(r.household_address) },
        { label: 'Street / area', value: titleCase(r.street_or_area) },
        { label: 'Phone', value: v(r.phone_number) },
        { label: 'Email', value: v(r.email) },
      ],
    },
    {
      heading: 'Record',
      fields: [
        { label: 'Recorded', value: formatDateTime(r.created_at) },
        { label: 'Last updated', value: formatDateTime(r.updated_at) },
      ],
    },
  ];
}
