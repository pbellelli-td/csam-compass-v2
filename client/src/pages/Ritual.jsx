import { useEffect, useState, useMemo } from 'react';
import { api } from '../lib/api.js';

const CSAMS = ['Julia Seitz', 'Maria Mazur', 'Valentina Manta', 'Paolo Zafra', 'Reina Kurosawa', 'Piera Bellelli'];

const RAG = {
  critical: { label: '🔴 Critical', badge: 'bg-red-50 text-red-700 ring-1 ring-red-200', order: 0 },
  at_risk:  { label: '🟡 At Risk',  badge: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200', order: 1 },
  watch:    { label: '⚪ Watch',    badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200', order: 2 },
  none:     { label: '✅ None',     badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', order: 3 },
};

function fmtWeek(w) {
  if (!w) return '—';
  return new Date(w).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtWhen(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function Ritual() {
  const [weekOf, setWeekOf] = useState(null);
  const [weeks, setWeeks] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filterCsam, setFilterCsam] = useState('');
  const [filterRag, setFilterRag] = useState('');
  const [filterSignal, setFilterSignal] = useState(''); // expansion | churn | contacted | uncontacted
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  function load(week) {
    setLoading(true);
    api.getRitual(week)
      .then((data) => {
        setWeekOf(data.week_of);
        setAccounts(data.accounts || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    api.getRitualWeeks().then(setWeeks).catch(() => {});
    load();
  }, []);

  const counts = useMemo(() => {
    const c = { critical: 0, at_risk: 0, watch: 0, none: 0, expansion: 0, churn: 0 };
    for (const a of accounts) {
      if (c[a.rag] != null) c[a.rag]++;
      if (a.expansion) c.expansion++;
      if (a.churn) c.churn++;
    }
    return c;
  }, [accounts]);

  const topSignals = useMemo(() => {
    const sig = [];
    for (const a of accounts) {
      if (a.churn) sig.push({ type: 'churn', account: a.account_name, csam: a.csam, text: a.churn, id: a.account_id });
      if (a.expansion) sig.push({ type: 'expansion', account: a.account_name, csam: a.csam, text: a.expansion, id: a.account_id });
    }
    // churn first, then expansion; cap at 3
    return sig.sort((x, y) => (x.type === 'churn' ? -1 : 1) - (y.type === 'churn' ? -1 : 1)).slice(0, 3);
  }, [accounts]);

  const filtered = useMemo(() => {
    let list = [...accounts];
    if (filterCsam) list = list.filter((a) => a.csam === filterCsam);
    if (filterRag) list = list.filter((a) => a.rag === filterRag);
    if (filterSignal === 'expansion') list = list.filter((a) => a.expansion);
    if (filterSignal === 'churn') list = list.filter((a) => a.churn);
    if (filterSignal === 'contacted') list = list.filter((a) => a.contacted);
    if (filterSignal === 'uncontacted') list = list.filter((a) => !a.contacted);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((a) => a.account_name.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      const ro = (RAG[a.rag]?.order ?? 9) - (RAG[b.rag]?.order ?? 9);
      if (ro !== 0) return ro;
      return (b.score ?? 0) - (a.score ?? 0);
    });
    return list;
  }, [accounts, filterCsam, filterRag, filterSignal, search]);

  async function toggleContacted(account) {
    const next = !account.contacted;
    setAccounts((prev) => prev.map((a) => a.account_id === account.account_id
      ? { ...a, contacted: next, contacted_by: next ? account.csam : null }
      : a));
    try {
      await api.setRitualContacted(account.account_id, next, account.csam);
    } catch (e) {
      // revert on failure
      setAccounts((prev) => prev.map((a) => a.account_id === account.account_id
        ? { ...a, contacted: !next } : a));
      alert(`Could not update: ${e.message}`);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-400 text-sm animate-pulse">Loading ritual…</div></div>;
  }
  if (error) {
    return (
      <div className="max-w-xl mx-auto mt-16 p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
        <strong>Could not load the ritual.</strong>
        <p className="mt-1 font-mono text-xs">{error}</p>
        <p className="mt-2 text-xs text-red-500">Check that Supabase is configured (SUPABASE_URL, SUPABASE_ANON_KEY) and a snapshot has been pushed.</p>
      </div>
    );
  }

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">📋 Monday Ritual</h1>
          <p className="text-sm text-gray-500 mt-0.5">Week of {fmtWeek(weekOf)} · {accounts.length} flagged accounts</p>
        </div>
        {weeks.length > 1 && (
          <select
            value={weekOf || ''}
            onChange={(e) => load(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            {weeks.map((w) => <option key={w} value={w}>Week of {fmtWeek(w)}</option>)}
          </select>
        )}
      </div>

      {/* Top 3 signals */}
      {topSignals.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Top signals this week</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {topSignals.map((s, i) => (
              <div key={i} className={`rounded-xl p-4 ring-1 ${s.type === 'churn' ? 'bg-red-50/60 ring-red-200' : 'bg-blue-50/60 ring-blue-200'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">{s.type === 'churn' ? '⚠️' : '🚀'}</span>
                  <span className="font-semibold text-gray-900 text-sm">{s.account}</span>
                </div>
                <p className="text-xs text-gray-500 font-mono mb-1.5">{s.csam}</p>
                <p className="text-xs text-gray-700 leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metric strip */}
      <div className="flex flex-wrap gap-2 mb-5">
        <Metric label="🔴 Critical" value={counts.critical} />
        <Metric label="🟡 At Risk" value={counts.at_risk} />
        <Metric label="⚪ Watch" value={counts.watch} />
        <Metric label="🚀 Expansion" value={counts.expansion} />
        <Metric label="⚠️ Churn/Risk" value={counts.churn} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select value={filterCsam} onChange={(e) => setFilterCsam(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent/30">
          <option value="">All CSAMs</option>
          {CSAMS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterRag} onChange={(e) => setFilterRag(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent/30">
          <option value="">All statuses</option>
          <option value="critical">🔴 Critical</option>
          <option value="at_risk">🟡 At Risk</option>
          <option value="watch">⚪ Watch</option>
        </select>
        <select value={filterSignal} onChange={(e) => setFilterSignal(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent/30">
          <option value="">All signals</option>
          <option value="expansion">🚀 Has expansion</option>
          <option value="churn">⚠️ Has churn/risk</option>
          <option value="contacted">✓ Contacted</option>
          <option value="uncontacted">○ Not contacted</option>
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search account…"
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
        {(filterCsam || filterRag || filterSignal || search) && (
          <button onClick={() => { setFilterCsam(''); setFilterRag(''); setFilterSignal(''); setSearch(''); }}
            className="text-xs text-gray-400 hover:text-gray-600 px-2">Clear filters</button>
        )}
        <span className="ml-auto text-xs text-gray-400 self-center">{filtered.length} shown</span>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Account</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">CSAM</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Last Login</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Last Contact</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Signals</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">✓</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((a) => {
                const rag = RAG[a.rag] || {};
                const isOpen = expandedId === a.account_id;
                return (
                  <>
                    <tr key={a.account_id} className={`hover:bg-slate-50 transition-colors ${a.contacted ? 'opacity-60' : ''}`}>
                      <td className="px-3 py-3 font-medium text-gray-900">
                        {a.account_name}
                        {a.arr && a.arr !== '—' && <span className="ml-2 text-xs font-mono text-gray-400">{a.arr}</span>}
                      </td>
                      <td className="px-3 py-3 text-gray-500 whitespace-nowrap">{a.csam}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-medium whitespace-nowrap ${rag.badge}`}>{rag.label}</span>
                      </td>
                      <td className="px-3 py-3 font-mono text-gray-500 hidden lg:table-cell whitespace-nowrap">{a.last_login || '—'}</td>
                      <td className="px-3 py-3 font-mono text-gray-500 hidden lg:table-cell whitespace-nowrap">{a.last_contact || '—'}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-1">
                          {a.expansion && <span className="text-xs text-blue-700">🚀 {trunc(a.expansion)}</span>}
                          {a.churn && <span className="text-xs text-red-700">⚠️ {trunc(a.churn)}</span>}
                          {!a.expansion && !a.churn && <span className="text-xs text-gray-300">—</span>}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <input type="checkbox" checked={a.contacted} onChange={() => toggleContacted(a)}
                          className="w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent/30 cursor-pointer" />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <a href={a.hubspot_url} target="_blank" rel="noreferrer" className="text-xs text-gray-400 hover:text-accent" title="Open in HubSpot">↗</a>
                          <button onClick={() => setExpandedId(isOpen ? null : a.account_id)}
                            className="text-xs text-accent hover:text-accent-dark font-medium whitespace-nowrap">
                            {a.notes.length ? `💬 ${a.notes.length}` : 'Note'}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={`${a.account_id}-notes`} className="bg-slate-50/70">
                        <td colSpan={8} className="px-5 py-4">
                          <NoteThread account={a} onChange={() => load(weekOf)} />
                          <div className="mt-3 text-xs text-gray-500">
                            <span className="font-semibold text-gray-600">Suggested action: </span>{a.action}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function trunc(s, n = 70) {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function Metric({ label, value }) {
  return (
    <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-lg px-3 py-1.5 shadow-sm">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="font-mono font-semibold text-gray-900">{value}</span>
    </div>
  );
}

function NoteThread({ account, onChange }) {
  const [author, setAuthor] = useState(account.csam || '');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!body.trim() || !author.trim()) return;
    setSaving(true);
    try {
      await api.addRitualNote(account.account_id, author.trim(), body.trim());
      setBody('');
      onChange();
    } catch (e) {
      alert(`Could not save note: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    try {
      await api.deleteRitualNote(id);
      onChange();
    } catch (e) {
      alert(`Could not delete: ${e.message}`);
    }
  }

  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Notes</h4>
      <div className="space-y-2 mb-3">
        {account.notes.length === 0 && <p className="text-xs text-gray-400">No notes yet.</p>}
        {account.notes.map((n) => (
          <div key={n.id} className="flex items-start gap-2 text-sm bg-white rounded-lg px-3 py-2 ring-1 ring-gray-100">
            <div className="flex-1">
              <span className="font-medium text-gray-800">{n.author}</span>
              <span className="text-xs text-gray-400 ml-2 font-mono">{fmtWhen(n.created_at)}</span>
              <p className="text-gray-700 mt-0.5">{n.body}</p>
            </div>
            <button onClick={() => remove(n.id)} className="text-gray-300 hover:text-red-500 text-xs">✕</button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <select value={author} onChange={(e) => setAuthor(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent/30">
          {CSAMS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input value={body} onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Add a note… (e.g. called, no answer — following up Fri)"
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent/30" />
        <button onClick={add} disabled={saving || !body.trim()}
          className="px-3 py-1.5 bg-accent hover:bg-accent-dark text-white text-sm font-medium rounded-lg disabled:opacity-50">
          {saving ? 'Saving…' : 'Add'}
        </button>
      </div>
    </div>
  );
}
