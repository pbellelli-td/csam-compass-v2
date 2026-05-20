import { Router } from 'express';
import { getAllAccounts, getAccount } from '../services/hubspot.js';
import { assembleDataBundle } from '../lib/dataBundle.js';
import { analyzeAccount } from '../services/claude.js';

const router = Router();

// In-memory analysis cache — cleared on server restart, which is fine for Phase 1
const cache = new Map();

router.get('/', async (req, res) => {
  try {
    const accounts = await getAllAccounts();
    res.json(accounts.map((a) => ({ ...a, analysis: cache.get(a.id) || null })));
  } catch (err) {
    console.error('[GET /accounts]', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const account = await getAccount(req.params.id);
    if (!account) return res.status(404).json({ error: 'Account not found' });
    res.json({ ...account, analysis: cache.get(account.id) || null });
  } catch (err) {
    console.error('[GET /accounts/:id]', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/analyze', async (req, res) => {
  try {
    const account = await getAccount(req.params.id);
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const bundle = await assembleDataBundle(account);
    const analysis = await analyzeAccount(bundle);

    const enriched = { ...analysis, analyzed_at: new Date().toISOString(), sources_used: bundle.sources_used };
    cache.set(account.id, enriched);

    res.json({ ...account, analysis: enriched });
  } catch (err) {
    console.error('[POST /accounts/:id/analyze]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Analyze all accounts sequentially to avoid rate limits
router.post('/batch/analyze', async (req, res) => {
  try {
    const accounts = await getAllAccounts();
    const results = [];

    for (const account of accounts) {
      try {
        const bundle = await assembleDataBundle(account);
        const analysis = await analyzeAccount(bundle);
        const enriched = { ...analysis, analyzed_at: new Date().toISOString(), sources_used: bundle.sources_used };
        cache.set(account.id, enriched);
        results.push({ id: account.id, ok: true });
      } catch (err) {
        results.push({ id: account.id, ok: false, error: err.message });
      }
    }

    const enrichedAccounts = accounts.map((a) => ({ ...a, analysis: cache.get(a.id) || null }));
    res.json({ results, accounts: enrichedAccounts });
  } catch (err) {
    console.error('[POST /accounts/batch/analyze]', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
