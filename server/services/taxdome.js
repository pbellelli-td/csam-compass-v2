import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import axios from 'axios';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = path.join(__dirname, '../fixtures/taxdome.json');

function isLive() {
  return process.env.ENABLE_TAXDOME === 'true' && !!process.env.TAXDOME_API_KEY;
}

function loadFixture() {
  return JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'));
}

export async function getTaxDomeData(accountId) {
  if (!isLive()) {
    const all = loadFixture();
    return all[accountId] || null;
  }

  // Swap in real TaxDome API call when available.
  // Expected shape matches the fixture structure.
  const res = await axios.get(`https://api.taxdome.com/v1/accounts/${accountId}/usage`, {
    headers: { Authorization: `Bearer ${process.env.TAXDOME_API_KEY}` },
  });

  return res.data;
}
