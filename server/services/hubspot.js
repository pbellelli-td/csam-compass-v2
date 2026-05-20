import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import axios from 'axios';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = path.join(__dirname, '../fixtures/accounts.json');

function isLive() {
  return process.env.ENABLE_HUBSPOT === 'true' && !!process.env.HUBSPOT_API_KEY;
}

function loadFixture() {
  return JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'));
}

export async function getAllAccounts() {
  if (!isLive()) return loadFixture();

  const propNames = [
    'name', 'mrr', 'arr', 'hubspot_owner_id', 'lifecyclestage', 'closedate',
    process.env.HUBSPOT_PROP_SEAT_FILL || 'seat_fill_pct',
    process.env.HUBSPOT_PROP_LAST_LOGIN || 'days_since_last_login',
    process.env.HUBSPOT_PROP_WORKFLOW || 'workflow_adoption',
  ];

  const res = await axios.get('https://api.hubapi.com/crm/v3/objects/companies', {
    headers: { Authorization: `Bearer ${process.env.HUBSPOT_API_KEY}` },
    params: { properties: propNames.join(','), limit: 100 },
  });

  return res.data.results.map(normalizeCompany);
}

export async function getAccount(id) {
  if (!isLive()) {
    return loadFixture().find((a) => a.id === id) || null;
  }

  const propNames = [
    'name', 'mrr', 'arr', 'hubspot_owner_id', 'lifecyclestage', 'closedate',
    process.env.HUBSPOT_PROP_SEAT_FILL || 'seat_fill_pct',
    process.env.HUBSPOT_PROP_LAST_LOGIN || 'days_since_last_login',
    process.env.HUBSPOT_PROP_WORKFLOW || 'workflow_adoption',
  ];

  const res = await axios.get(`https://api.hubapi.com/crm/v3/objects/companies/${id}`, {
    headers: { Authorization: `Bearer ${process.env.HUBSPOT_API_KEY}` },
    params: { properties: propNames.join(',') },
  });

  return normalizeCompany(res.data);
}

function normalizeCompany(raw) {
  const p = raw.properties || {};
  const seatFillKey = process.env.HUBSPOT_PROP_SEAT_FILL || 'seat_fill_pct';
  const lastLoginKey = process.env.HUBSPOT_PROP_LAST_LOGIN || 'days_since_last_login';
  const workflowKey = process.env.HUBSPOT_PROP_WORKFLOW || 'workflow_adoption';

  return {
    id: raw.id,
    company_name: p.name || 'Unknown',
    mrr: parseFloat(p.mrr) || 0,
    arr: parseFloat(p.arr) || 0,
    csam_owner: p.hubspot_owner_id || 'Unassigned',
    lifecycle_stage: p.lifecyclestage || 'customer',
    renewal_date: p.closedate || null,
    seat_fill_pct: p[seatFillKey] != null ? parseFloat(p[seatFillKey]) : null,
    days_since_last_login: p[lastLoginKey] != null ? parseInt(p[lastLoginKey]) : null,
    workflow_adoption: p[workflowKey] != null ? parseFloat(p[workflowKey]) : null,
  };
}
