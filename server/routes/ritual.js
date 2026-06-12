import { Router } from 'express';
import {
  isConfigured,
  getWeeks,
  getAccountsForWeek,
  getLatestWeekAccounts,
  upsertSnapshot,
  getNotes,
  addNote,
  deleteNote,
  getContacted,
  setContacted,
} from '../services/supabase.js';

const router = Router();

function guard(res) {
  if (!isConfigured()) {
    res.status(503).json({ error: 'Supabase not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.' });
    return false;
  }
  return true;
}

// List available weeks
router.get('/weeks', async (_req, res) => {
  if (!guard(res)) return;
  try {
    res.json(await getWeeks());
  } catch (err) {
    console.error('[GET /ritual/weeks]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get accounts + notes + contacted for a week (defaults to latest)
router.get('/', async (req, res) => {
  if (!guard(res)) return;
  try {
    const week = req.query.week;
    let weekOf, accounts;
    if (week) {
      weekOf = week;
      accounts = await getAccountsForWeek(week);
    } else {
      ({ weekOf, accounts } = await getLatestWeekAccounts());
    }

    const ids = accounts.map((a) => a.account_id);
    const [notes, contacted] = await Promise.all([getNotes(ids), getContacted()]);

    const notesByAccount = {};
    for (const n of notes) (notesByAccount[n.account_id] ||= []).push(n);

    const contactedByAccount = {};
    for (const c of contacted) contactedByAccount[c.account_id] = c;

    const merged = accounts.map((a) => ({
      ...a,
      notes: notesByAccount[a.account_id] || [],
      contacted: contactedByAccount[a.account_id]?.contacted || false,
      contacted_by: contactedByAccount[a.account_id]?.contacted_by || null,
      contacted_at: contactedByAccount[a.account_id]?.contacted_at || null,
    }));

    res.json({ week_of: weekOf, accounts: merged });
  } catch (err) {
    console.error('[GET /ritual]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Push a weekly snapshot
router.post('/snapshot', async (req, res) => {
  if (!guard(res)) return;
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || !rows.length) return res.status(400).json({ error: 'rows[] required' });
    const saved = await upsertSnapshot(rows);
    res.json({ ok: true, count: saved.length });
  } catch (err) {
    console.error('[POST /ritual/snapshot]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Add a threaded note
router.post('/notes', async (req, res) => {
  if (!guard(res)) return;
  try {
    const { account_id, author, body } = req.body;
    if (!account_id || !author || !body) return res.status(400).json({ error: 'account_id, author, body required' });
    res.json(await addNote({ account_id, author, body }));
  } catch (err) {
    console.error('[POST /ritual/notes]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Delete a note
router.delete('/notes/:id', async (req, res) => {
  if (!guard(res)) return;
  try {
    res.json(await deleteNote(req.params.id));
  } catch (err) {
    console.error('[DELETE /ritual/notes/:id]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Toggle contacted
router.post('/contacted', async (req, res) => {
  if (!guard(res)) return;
  try {
    const { account_id, contacted, contacted_by } = req.body;
    if (!account_id) return res.status(400).json({ error: 'account_id required' });
    res.json(await setContacted({ account_id, contacted: !!contacted, contacted_by }));
  } catch (err) {
    console.error('[POST /ritual/contacted]', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
