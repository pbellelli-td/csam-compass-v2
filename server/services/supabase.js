// Supabase service — uses the official @supabase/supabase-js client.
// Option A: RLS disabled, anon key has full read/write (internal tool).
import { createClient } from '@supabase/supabase-js';

let _client = null;

function db() {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_ANON_KEY not configured');
  _client = createClient(url, key);
  return _client;
}

export function isConfigured() {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}

function check(error, context) {
  if (error) throw new Error(`[${context}] ${error.message}`);
}

// ── Weeks ──────────────────────────────────────────────────────────
export async function getWeeks() {
  const { data, error } = await db()
    .from('ritual_accounts')
    .select('week_of')
    .order('week_of', { ascending: false });
  check(error, 'getWeeks');
  return [...new Set(data.map((r) => r.week_of))];
}

// ── Accounts ───────────────────────────────────────────────────────
export async function getAccountsForWeek(weekOf) {
  const q = db().from('ritual_accounts').select('*').order('score', { ascending: false });
  if (weekOf) q.eq('week_of', weekOf);
  const { data, error } = await q;
  check(error, 'getAccountsForWeek');
  return data;
}

export async function getLatestWeekAccounts() {
  const weeks = await getWeeks();
  if (!weeks.length) return { weekOf: null, accounts: [] };
  const weekOf = weeks[0];
  const accounts = await getAccountsForWeek(weekOf);
  return { weekOf, accounts };
}

export async function upsertSnapshot(rows) {
  const { data, error } = await db()
    .from('ritual_accounts')
    .upsert(rows, { onConflict: 'week_of,account_id' })
    .select();
  check(error, 'upsertSnapshot');
  return data;
}

// ── Notes ──────────────────────────────────────────────────────────
export async function getNotes(accountIds) {
  const q = db().from('ritual_notes').select('*').order('created_at', { ascending: true });
  if (accountIds?.length) q.in('account_id', accountIds);
  const { data, error } = await q;
  check(error, 'getNotes');
  return data;
}

export async function addNote({ account_id, author, body }) {
  const { data, error } = await db()
    .from('ritual_notes')
    .insert([{ account_id, author, body }])
    .select()
    .single();
  check(error, 'addNote');
  return data;
}

export async function deleteNote(id) {
  const { error } = await db().from('ritual_notes').delete().eq('id', id);
  check(error, 'deleteNote');
  return { ok: true };
}

// ── Contacted ──────────────────────────────────────────────────────
export async function getContacted() {
  const { data, error } = await db().from('ritual_contacted').select('*');
  check(error, 'getContacted');
  return data;
}

export async function setContacted({ account_id, contacted, contacted_by }) {
  const row = {
    account_id,
    contacted,
    contacted_by: contacted ? contacted_by : null,
    contacted_at: contacted ? new Date().toISOString() : null,
  };
  const { data, error } = await db()
    .from('ritual_contacted')
    .upsert([row], { onConflict: 'account_id' })
    .select()
    .single();
  check(error, 'setContacted');
  return data;
}
