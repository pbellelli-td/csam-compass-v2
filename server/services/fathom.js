import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import axios from 'axios';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = path.join(__dirname, '../fixtures/fathom.json');

const LOOKBACK_DAYS = parseInt(process.env.FATHOM_LOOKBACK_DAYS || '90', 10);

function isLive() {
  return process.env.ENABLE_FATHOM === 'true' && !!process.env.FATHOM_API_KEY;
}

function loadFixture() {
  return JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'));
}

export async function getFathomTranscripts(accountId) {
  if (!isLive()) {
    const all = loadFixture();
    return all[accountId] || [];
  }

  const since = new Date();
  since.setDate(since.getDate() - LOOKBACK_DAYS);

  // Fathom API: swap endpoint/params once documented
  const res = await axios.get('https://api.fathom.video/v1/calls', {
    headers: { Authorization: `Bearer ${process.env.FATHOM_API_KEY}` },
    params: {
      account_id: accountId,
      after: since.toISOString().split('T')[0],
    },
  });

  return (res.data.calls || []).map((call) => ({
    call_id: call.id,
    call_date: call.started_at?.split('T')[0],
    duration_min: Math.round((call.duration_seconds || 0) / 60),
    participants: call.attendees?.map((a) => a.name) || [],
    transcript_summary: call.summary || '',
    topics: call.topics || [],
    sentiment: call.sentiment || 'unknown',
    action_items: call.action_items || [],
  }));
}
