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
};
