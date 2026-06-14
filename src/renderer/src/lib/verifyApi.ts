// Public client for the QR verification endpoint (no auth token).
//   GET /api/verify/:plyssId -> { valid, record? }

import { API_BASE } from './auth';

export interface VerifiedRecord {
  plyss_id: string;
  type: 'individual' | 'family';
  name: string;
  photo_url: string | null;
  state_of_residence: string | null;
  lga_of_residence: string | null;
  issued_at: string;
}

export interface VerifyResult {
  valid: boolean;
  record?: VerifiedRecord;
}

/** Thrown only when the server can't be reached or errors — not for "not found". */
export class VerifyError extends Error {}

export async function verifyId(plyssId: string, token?: string): Promise<VerifyResult> {
  const qs = token ? `?t=${encodeURIComponent(token)}` : '';
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/verify/${encodeURIComponent(plyssId)}${qs}`, {
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new VerifyError('Couldn’t reach the verification service. Check your connection and try again.');
  }

  // The endpoint returns 200 with { valid: false } for unknown IDs; a 404 (e.g.
  // an empty id segment) is treated the same way for the user.
  if (res.status === 404) return { valid: false };

  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    valid?: boolean;
    record?: VerifiedRecord;
    error?: string;
  };

  if (!res.ok || data.success === false) {
    throw new VerifyError(data.error || 'Verification failed. Please try again.');
  }

  return { valid: Boolean(data.valid), record: data.record };
}
