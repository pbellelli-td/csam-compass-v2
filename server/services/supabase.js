// Supabase service — uses native fetch (Node 18+). No extra dependencies.
// Option A: RLS disabled, anon key has full read/write.

const getEnv = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_ANON_KEY not configured');
  return { url, key };
};

export function isConfigured() {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}

async function supaFetch(path, { method = 'GET', params = {}, body, prefer } = {}) {
  const { url, key } = getEnv();
  const qs = new URLSearchParams(params).toString();
  const fullUrl = `${url}/rest/v1/${path}${qs ? '?' + qs : ''}`;
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (prefer) headers['Prefer'] = prefer;
  const res = await fetch(fullUrl, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${method} ${path} → ${res.status}: ${text}`);
  return text ? JSON.parse(text) : [];
}

// ── Weeks ──────────────────────────────────────────────────────────
export async function getWeeks() {
  const data = await supaFetch('ritual_accounts', {
    params: { select: 'week_of', order: 'week_of.desc' },
  });
  return [...new Set(data.map((r) => r.week_of))];
}

// ── Accounts ───────────────────────────────────────────────────────
export async function getAccountsForWeek(weekOf) {
  const params = { select: '*', order: 'score.desc' };
  if (weekOf) params['week_of'] = `eq.${weekOf}`;
  return supaFetch('ritual_accounts', { params });
}

export async function getLatestWeekAccounts() {
  const weeks = await getWeeks();
  if (!weeks.length) return { weekOf: null, accounts: [] };
  const weekOf = weeks[0];
  const accounts = await getAccountsForWeek(weekOf);
  return { weekOf, accounts };
}

export async function upsertSnapshot(rows) {
  return supaFetch('ritual_accounts', {
    method: 'POST',
    params: { on_conflict: 'week_of,account_id' },
    body: rows,
    prefer: 'resolution=merge-duplicates,return=representation',
  });
}

// ── Notes ──────────────────────────────────────────────────────────
export async function getNotes(accountIds) {
  const params = { select: '*', order: 'created_at.asc' };
  if (accountIds?.length) params['account_id'] = `in.(${accountIds.join(',')})`;
  return supaFetch('ritual_notes', { params });
}

export async function addNote({ account_id, author, body }) {
  const data = await supaFetch('ritual_notes', {
    method: 'POST',
    body: [{ account_id, author, body }],
    prefer: 'return=representation',
  });
  return data[0];
}

export async function deleteNote(id) {
  await supaFetch('ritual_notes', {
    method: 'DELETE',
    params: { id: `eq.${id}` },
  });
  return { ok: true };
}

// ── Contacted ──────────────────────────────────────────────────────
export async function getContacted() {
  return supaFetch('ritual_contacted', { params: { select: '*' } });
}

export async function setContacted({ account_id, contacted, contacted_by }) {
  const data = await supaFetch('ritual_contacted', {
    method: 'POST',
    params: { on_conflict: 'account_id' },
    body: [{
      account_id,
      contacted,
      contacted_by: contacted ? contacted_by : null,
      contacted_at: contacted ? new Date().toISOString() : null,
    }],
    prefer: 'resolution=merge-duplicates,return=representation',
  });
  return data[0];
}
