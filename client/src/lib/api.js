const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  getAccounts: () => request('/accounts'),
  getAccount: (id) => request(`/accounts/${id}`),
  analyzeAccount: (id) => request(`/accounts/${id}/analyze`, { method: 'POST' }),
  analyzeAll: () => request('/accounts/batch/analyze', { method: 'POST' }),

  // Monday Ritual
  getRitual: (week) => request(`/ritual${week ? `?week=${week}` : ''}`),
  getRitualWeeks: () => request('/ritual/weeks'),
  addRitualNote: (account_id, author, body) =>
    request('/ritual/notes', { method: 'POST', body: JSON.stringify({ account_id, author, body }) }),
  deleteRitualNote: (id) => request(`/ritual/notes/${id}`, { method: 'DELETE' }),
  setRitualContacted: (account_id, contacted, contacted_by) =>
    request('/ritual/contacted', { method: 'POST', body: JSON.stringify({ account_id, contacted, contacted_by }) }),
};
