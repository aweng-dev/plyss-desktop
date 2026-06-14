// Typed client for the PLYSS platform API (admin console).
// Wraps the backend endpoints, attaching the Bearer token via apiFetch.
//
//   GET   /api/surveys/stats                       -> { stats }
//   GET   /api/surveys?type=&limit=&offset=        -> { surveys, pagination }
//   GET   /api/surveys/:type/:id                   -> { survey }
//   GET   /api/admin/overview                      -> { overview }
//   GET   /api/admin/enumerators                   -> { enumerators, byStatus }
//   PATCH /api/admin/enumerators/:id  { status }   -> { enumerator }
//   PATCH /api/admin/enumerators/:id/password { password } -> { message }
//   GET   /api/auth/admins                         -> { admins }
//   POST  /api/auth/admins  { email, password, … } -> { admin }
//   PATCH /api/auth/admins/:id  { is_active }       -> { id, is_active }

import { apiFetch } from './auth';

export type SurveyType = 'individual' | 'family';

/** A row from the `individuals` table. */
export interface IndividualRecord {
  id: number;
  plyss_id: string | null;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  passport_photo_url: string | null;
  nin: string;
  date_of_birth: string;
  state_of_origin: string;
  state_of_residence: string;
  lga_of_origin: string;
  lga_of_residence: string;
  home_address: string;
  office_address: string | null;
  phone_number: string;
  email: string | null;
  vin: string | null;
  occupation: string;
  marital_status: string;
  gender: string;
  survey_type: 'individual';
  /** Signed QR verification tag — present on single-record fetches only. */
  verify_token?: string | null;
  created_at: string;
  updated_at: string;
}

/** A row from the `families` table. */
export interface FamilyRecord {
  id: number;
  plyss_id: string | null;
  household_head_name: string;
  household_photo_url: string | null;
  number_of_children: string;
  household_size: string;
  number_of_wives: string;
  spouse_1_name: string | null;
  spouse_2_name: string | null;
  spouse_3_name: string | null;
  spouse_4_name: string | null;
  state_of_origin: string;
  state_of_residence: string;
  lga_of_origin: string;
  lga_of_residence: string;
  household_address: string;
  street_or_area: string;
  phone_number: string;
  email: string | null;
  survey_type: 'family';
  /** Signed QR verification tag — present on single-record fetches only. */
  verify_token?: string | null;
  created_at: string;
  updated_at: string;
}

/** A list row carries a discriminating `type` so individual + family can mix. */
export type AnyRecord =
  | (IndividualRecord & { type: 'individual' })
  | (FamilyRecord & { type: 'family' });

export interface SurveyStats {
  individualSurveys: number;
  familySurveys: number;
  totalSurveys: number;
}

/** Thrown for any API failure. `status === 401` means the session is invalid. */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await apiFetch(path, init ?? {});
  } catch {
    throw new ApiError('Can’t reach the server. Check your connection.', 0);
  }
  if (res.status === 401 || res.status === 403) {
    throw new ApiError('Your session has expired. Please sign in again.', res.status);
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & { success?: boolean; error?: string };
  if (!res.ok || data.success === false) {
    throw new ApiError(data.error || `Request failed (${res.status})`, res.status);
  }
  return data as T;
}

const mutate = <T>(path: string, method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', body?: unknown): Promise<T> =>
  request<T>(path, { method, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });

export async function fetchStats(): Promise<SurveyStats> {
  const data = await request<{ stats: SurveyStats }>('/api/surveys/stats');
  return data.stats;
}

/** Fetch a single full record. The list omits the discriminator, so we pass `type`. */
export async function fetchRecord<T extends SurveyType>(
  type: T,
  id: number | string,
): Promise<(T extends 'individual' ? IndividualRecord : FamilyRecord)> {
  const data = await request<{ survey: IndividualRecord | FamilyRecord }>(`/api/surveys/${type}/${id}`);
  return { ...(data.survey as object), survey_type: type } as never;
}

interface ListResponse<T> {
  surveys: T[];
  pagination: { total: number; limit: number; offset: number; hasMore: boolean };
}

/**
 * Load every record of a type by paging through the API (the dataset is small,
 * so we hold it in memory for instant client-side search/sort). Caps at 5000 to
 * stay safe if the survey ever grows large.
 */
export async function fetchAllRecords(type: SurveyType): Promise<AnyRecord[]> {
  const pageSize = 100;
  const cap = 5000;
  let offset = 0;
  const out: AnyRecord[] = [];
  for (;;) {
    const data = await request<ListResponse<IndividualRecord | FamilyRecord>>(
      `/api/surveys?type=${type}&limit=${pageSize}&offset=${offset}`,
    );
    for (const row of data.surveys) out.push({ ...(row as object), type } as AnyRecord);
    if (!data.pagination?.hasMore || data.surveys.length === 0 || out.length >= cap) break;
    offset += pageSize;
  }
  return out;
}

/** Editable columns the backend accepts for each survey type (see SurveyModel). */
export const EDITABLE_FIELDS: Record<SurveyType, { key: string; label: string }[]> = {
  individual: [
    { key: 'first_name', label: 'First name' },
    { key: 'middle_name', label: 'Middle name' },
    { key: 'last_name', label: 'Last name' },
    { key: 'phone_number', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'occupation', label: 'Occupation' },
    { key: 'marital_status', label: 'Marital status' },
    { key: 'home_address', label: 'Home address' },
    { key: 'office_address', label: 'Office / shop' },
    { key: 'state_of_origin', label: 'State of origin' },
    { key: 'lga_of_origin', label: 'LGA of origin' },
    { key: 'state_of_residence', label: 'State of residence' },
    { key: 'lga_of_residence', label: 'LGA of residence' },
  ],
  family: [
    { key: 'household_head_name', label: 'Head of household' },
    { key: 'household_size', label: 'Household size' },
    { key: 'number_of_children', label: 'Number of children' },
    { key: 'number_of_wives', label: 'Number of wives' },
    { key: 'spouse_1_name', label: 'Spouse 1' },
    { key: 'spouse_2_name', label: 'Spouse 2' },
    { key: 'spouse_3_name', label: 'Spouse 3' },
    { key: 'spouse_4_name', label: 'Spouse 4' },
    { key: 'phone_number', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'household_address', label: 'Household address' },
    { key: 'street_or_area', label: 'Street / area' },
    { key: 'state_of_origin', label: 'State of origin' },
    { key: 'lga_of_origin', label: 'LGA of origin' },
    { key: 'state_of_residence', label: 'State of residence' },
    { key: 'lga_of_residence', label: 'LGA of residence' },
  ],
};

/** Patch a record. Returns the updated row (with its discriminating `type`). */
export async function updateRecord(
  type: SurveyType,
  id: number | string,
  patch: Record<string, string>,
): Promise<AnyRecord> {
  const data = await mutate<{ survey: IndividualRecord | FamilyRecord }>(`/api/surveys/${type}/${id}`, 'PUT', patch);
  return { ...(data.survey as object), type } as AnyRecord;
}

/** Permanently delete a record. */
export async function deleteRecord(type: SurveyType, id: number | string): Promise<void> {
  await mutate(`/api/surveys/${type}/${id}`, 'DELETE');
}

/** Largest batch the API accepts in one bulk-delete call (mirrors the backend cap). */
export const BULK_DELETE_MAX = 500;

/** Permanently delete many records of one type. Returns how many rows were removed. */
export async function bulkDeleteRecords(type: SurveyType, ids: number[]): Promise<number> {
  const data = await mutate<{ deleted: number }>(`/api/surveys/${type}/bulk-delete`, 'POST', { ids });
  return data.deleted ?? 0;
}

// ─────────────────────────────── Platform overview ───────────────────────────

/** A {label, value} pair used by every chart on the overview. */
export interface Bucket {
  label: string;
  value: number;
}

export interface RecentActivity {
  id: number;
  plyss_id: string | null;
  type: SurveyType;
  name: string;
  state_of_residence: string | null;
  created_at: string;
}

export interface PlatformOverview {
  totals: {
    individuals: number;
    families: number;
    total: number;
    enumerators: number;
    admins: number;
  };
  enumeratorsByStatus: Record<string, number>;
  windows: { last24h: number; last7d: number; last30d: number };
  byState: Bucket[];
  topLga: Bucket[];
  gender: Bucket[];
  maritalStatus: Bucket[];
  occupations: Bucket[];
  monthly: Bucket[];
  recent: RecentActivity[];
}

export async function fetchOverview(): Promise<PlatformOverview> {
  const data = await request<{ overview: PlatformOverview }>('/api/admin/overview');
  return data.overview;
}

// ──────────────────────────────── Enumerators ────────────────────────────────

export type EnumeratorStatus = 'approved' | 'suspended' | 'pending';

export interface Enumerator {
  id: number;
  email: string;
  phone: string | null;
  full_name: string;
  assigned_state: string | null;
  assigned_lga: string | null;
  status: EnumeratorStatus;
  role: string;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchEnumerators(): Promise<{
  enumerators: Enumerator[];
  byStatus: Record<string, number>;
}> {
  const data = await request<{ enumerators: Enumerator[]; byStatus: Record<string, number> }>(
    '/api/admin/enumerators',
  );
  return { enumerators: data.enumerators ?? [], byStatus: data.byStatus ?? {} };
}

export async function setEnumeratorStatus(
  id: number,
  status: EnumeratorStatus,
): Promise<Enumerator> {
  const data = await mutate<{ enumerator: Enumerator }>(`/api/admin/enumerators/${id}`, 'PATCH', { status });
  return data.enumerator;
}

/**
 * Set a new password for an enumerator (admin-initiated reset). This revokes the
 * enumerator's existing sessions server-side, so they must sign in again with the
 * new password. The password must be ≥8 chars and include a letter and a number.
 */
export async function setEnumeratorPassword(id: number, password: string): Promise<void> {
  await mutate(`/api/admin/enumerators/${id}/password`, 'PATCH', { password });
}

// ───────────────────────────────── Admin team ────────────────────────────────

export interface AdminUser {
  id: number;
  email: string;
  full_name: string | null;
  role: string;
  is_active: number;
  last_login: string | null;
  created_at: string;
}

export async function fetchAdmins(): Promise<AdminUser[]> {
  const data = await request<{ admins: AdminUser[] }>('/api/auth/admins');
  return data.admins ?? [];
}

export async function createAdmin(input: {
  email: string;
  password: string;
  full_name?: string;
}): Promise<AdminUser> {
  const data = await mutate<{ admin: AdminUser }>('/api/auth/admins', 'POST', input);
  return data.admin;
}

export async function setAdminActive(id: number, isActive: boolean): Promise<void> {
  await mutate(`/api/auth/admins/${id}`, 'PATCH', { is_active: isActive });
}

// ─────────────────────────────────── Export ──────────────────────────────────

/** Quote a CSV cell only when it contains a delimiter, quote, or newline. */
const csvCell = (val: unknown): string => {
  const s = val == null ? '' : String(val);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Serialise flat records to CSV. Columns are the union of keys across the rows. */
export function recordsToCsv(records: readonly object[]): string {
  if (records.length === 0) return '';
  const skip = new Set(['answers_json']);
  const cols = Array.from(
    records.reduce<Set<string>>((set, r) => {
      Object.keys(r).forEach((k) => { if (!skip.has(k)) set.add(k); });
      return set;
    }, new Set()),
  );
  const head = cols.map(csvCell).join(',');
  const body = records.map((r) => {
    const row = r as Record<string, unknown>;
    return cols.map((c) => csvCell(row[c])).join(',');
  });
  return [head, ...body].join('\r\n');
}

/** Trigger a client-side download of a text blob. */
export function downloadFile(filename: string, content: string, mime = 'text/csv;charset=utf-8'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
