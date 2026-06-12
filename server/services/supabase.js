// Supabase service for the Monday Ritual tab.
// Uses the REST API directly (no SDK dependency) with the anon key.
// Option A: RLS disabled, anon key has full read/write (internal tool).
import axios from 'axios';

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_ANON_KEY;

function client() {
  if (!URL || !KEY) {
    throw new Error('SUPABASE_URL / SUPABASE_ANON_KEY not configured');
  }
  return axios.create({
    baseURL: `${URL}/rest/v1`,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
    },
  });
}

export function isConfigured() {
  return !!(URL && KEY);
}

// ── Accounts ───────────────────────────────────────────────────────
export async function getWeeks() {
  const c = client();
  const res = await c.get('/ritual_accounts', {
    params: { select: 'week_of', order: 'week_of.desc' },
  });
  // distinct weeks
  return [...new Set(res.data.map((r) => r.week_of))];
}

export async function getAccountsForWeek(weekOf) {
  const c = client();
  const params = { select: '*', order: 'score.desc' };
  if (weekOf) params.week_of = `eq.${weekOf}`;
  const res = await c.get('/ritual_accounts', { params });
  return res.data;
}

export async function getLatestWeekAccounts() {
  const weeks = await getWeeks();
  if (!weeks.length) return { weekOf: null, accounts: [] };
  const weekOf = weeks[0];
  const accounts = await getAccountsForWeek(weekOf);
  return { weekOf, accounts };
}

// Upsert a full weekly snapshot. rows = array of account objects.
export async function upsertSnapshot(rows) {
  const c = client();
  const res = await c.post('/ritual_accounts', rows, {
    params: { on_conflict: 'week_of,account_id' },
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
  });
  return res.data;
}

// ── Notes (threaded) ───────────────────────────────────────────────
export async function getNotes(accountIds) {
  const c = client();
  const params = { select: '*', order: 'created_at.asc' };
  if (accountIds && accountIds.length) {
    params.account_id = `in.(${accountIds.join(',')})`;
  }
  const res = await c.get('/ritual_notes', { params });
  return res.data;
}

export async function addNote({ account_id, author, body }) {
  const c = client();
  const res = await c.post('/ritual_notes', [{ account_id, author, body }], {
    headers: { Prefer: 'return=representation' },
  });
  return res.data[0];
}

export async function deleteNote(id) {
  const c = client();
  await c.delete('/ritual_notes', { params: { id: `eq.${id}` } });
  return { ok: true };
}

// ── Contacted flag ─────────────────────────────────────────────────
export async function getContacted() {
  const c = client();
  const res = await c.get('/ritual_contacted', { params: { select: '*' } });
  return res.data;
}

export async function setContacted({ account_id, contacted, contacted_by }) {
  const c = client();
  const row = {
    account_id,
    contacted,
    contacted_by: contacted ? contacted_by : null,
    contacted_at: contacted ? new Date().toISOString() : null,
  };
  const res = await c.post('/ritual_contacted', [row], {
    params: { on_conflict: 'account_id' },
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
  });
  return res.data[0];
}
