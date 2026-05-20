import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import SeverityBadge from '../components/SeverityBadge.jsx';

const fmt = {
  pct: (v) => (v != null ? `${Math.round(v * 100)}%` : '—'),
  mrr: (v) => (v != null ? `$${v.toLocaleString()}` : '—'),
  date: (v) => (v ? new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'),
  days: (v) => (v != null ? `${v}d` : '—'),
};

function healthFromAnalysis(analysis) {
  if (!analysis) return null;
  const highs = (analysis.risk_signals || []).filter((s) => s.severity === 'high').length;
  const meds = (analysis.risk_signals || []).filter((s) => s.severity === 'med').length;
  if (highs >= 2) return 'critical';
  if (highs >= 1) return 'at-risk';
  if (meds >= 2) return 'watch';
  return 'healthy';
}

const HEALTH_BADGE = {
  healthy: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  watch: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  'at-risk': 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
  critical: 'bg-red-50 text-red-700 ring-1 ring-red-200',
};

const HEALTH_LABEL = {
  healthy: 'Healthy',
  watch: 'Watch',
  'at-risk': 'At Risk',
  critical: 'Critical',
};

function HealthBadge({ status }) {
  if (!status) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono bg-gray-100 text-gray-400">
        Not analyzed
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-medium ${HEALTH_BADGE[status]}`}>
      {HEALTH_LABEL[status]}
    </span>
  );
}

const SORT_KEYS = {
  company_name: (a) => a.company_name,
  mrr: (a) => a.mrr,
  seat_fill_pct: (a) => a.seat_fill_pct ?? -1,
  days_since_last_login: (a) => a.days_since_last_login ?? 999,
  workflow_adoption: (a) => a.workflow_adoption ?? -1,
  renewal_date: (a) => (a.renewal_date ? new Date(a.renewal_date).getTime() : Infinity),
};

export default function AccountList() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analyzingId, setAnalyzingId] = useState(null);
  const [analyzingAll, setAnalyzingAll] = useState(false);
  const [sortKey, setSortKey] = useState('company_name');
  const [sortDir, setSortDir] = useState('asc');
  const [filterOwner, setFilterOwner] = useState('');
  const [filterHealth, setFilterHealth] = useState('');

  useEffect(() => {
    api.getAccounts()
      .then(setAccounts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const owners = useMemo(() => [...new Set(accounts.map((a) => a.csam_owner))].sort(), [accounts]);

  const sorted = useMemo(() => {
    let list = [...accounts];
    if (filterOwner) list = list.filter((a) => a.csam_owner === filterOwner);
    if (filterHealth) {
      list = list.filter((a) => {
        const h = healthFromAnalysis(a.analysis);
        return filterHealth === 'not-analyzed' ? !h : h === filterHealth;
      });
    }
    const keyFn = SORT_KEYS[sortKey] || ((a) => a[sortKey]);
    list.sort((a, b) => {
      const av = keyFn(a);
      const bv = keyFn(b);
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [accounts, sortKey, sortDir, filterOwner, filterHealth]);

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  async function handleAnalyze(e, id) {
    e.stopPropagation();
    setAnalyzingId(id);
    try {
      const updated = await api.analyzeAccount(id);
      setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } catch (err) {
      alert(`Analysis failed: ${err.message}`);
    } finally {
      setAnalyzingId(null);
    }
  }

  async function handleAnalyzeAll() {
    setAnalyzingAll(true);
    try {
      const { accounts: updated } = await api.analyzeAll();
      setAccounts(updated);
    } catch (err) {
      alert(`Batch analysis failed: ${err.message}`);
    } finally {
      setAnalyzingAll(false);
    }
  }

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="text-accent ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const Th = ({ col, label, className = '' }) => (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-900 whitespace-nowrap ${className}`}
      onClick={() => toggleSort(col)}
    >
      {label}
      <SortIcon col={col} />
    </th>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-sm animate-pulse">Loading accounts…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto mt-16 p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
        <strong>Could not load accounts.</strong>
        <p className="mt-1 font-mono text-xs">{error}</p>
        <p className="mt-2 text-xs text-red-500">Make sure the server is running on port 3001.</p>
      </div>
    );
  }

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8">
      {/* Page header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Book of Business</h1>
          <p className="text-sm text-gray-500 mt-0.5">{accounts.length} accounts · Phase 1 signal view</p>
        </div>
        <button
          onClick={handleAnalyzeAll}
          disabled={analyzingAll}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-dark text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {analyzingAll ? (
            <>
              <Spinner size={14} />
              Analyzing all…
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 1v6l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M13.6 10A6 6 0 1 1 8 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Analyze All
            </>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          value={filterOwner}
          onChange={(e) => setFilterOwner(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="">All CSAMs</option>
          {owners.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <select
          value={filterHealth}
          onChange={(e) => setFilterHealth(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="">All statuses</option>
          <option value="healthy">Healthy</option>
          <option value="watch">Watch</option>
          <option value="at-risk">At Risk</option>
          <option value="critical">Critical</option>
          <option value="not-analyzed">Not Analyzed</option>
        </select>
        {(filterOwner || filterHealth) && (
          <button
            onClick={() => { setFilterOwner(''); setFilterHealth(''); }}
            className="text-xs text-gray-400 hover:text-gray-600 px-2"
          >
            Clear filters
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400 self-center">{sorted.length} shown</span>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <Th col="company_name" label="Account" />
                <Th col="csam_owner" label="CSAM" className="hidden md:table-cell" />
                <Th col="mrr" label="MRR" />
                <Th col="seat_fill_pct" label="Seat Fill" />
                <Th col="days_since_last_login" label="Last Login" />
                <Th col="workflow_adoption" label="Workflows" className="hidden lg:table-cell" />
                <Th col="renewal_date" label="Renewal" className="hidden lg:table-cell" />
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Health</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map((account) => {
                const health = healthFromAnalysis(account.analysis);
                const isAnalyzing = analyzingId === account.id;
                const seatStatus =
                  account.seat_fill_pct >= 0.9 ? 'text-emerald-600' :
                  account.seat_fill_pct >= 0.6 ? 'text-gray-800' :
                  'text-red-500';
                const loginStatus =
                  account.days_since_last_login <= 7 ? 'text-gray-800' :
                  account.days_since_last_login <= 21 ? 'text-amber-600' :
                  'text-red-500';

                return (
                  <tr
                    key={account.id}
                    onClick={() => navigate(`/accounts/${account.id}`)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3.5">
                      <span className="font-medium text-gray-900 group-hover:text-accent transition-colors">
                        {account.company_name}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 hidden md:table-cell">{account.csam_owner}</td>
                    <td className="px-4 py-3.5 font-mono text-gray-800">{fmt.mrr(account.mrr)}</td>
                    <td className={`px-4 py-3.5 font-mono font-medium ${seatStatus}`}>
                      {fmt.pct(account.seat_fill_pct)}
                    </td>
                    <td className={`px-4 py-3.5 font-mono font-medium ${loginStatus}`}>
                      {fmt.days(account.days_since_last_login)}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-gray-600 hidden lg:table-cell">
                      {fmt.pct(account.workflow_adoption)}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-gray-500 hidden lg:table-cell">
                      {fmt.date(account.renewal_date)}
                    </td>
                    <td className="px-4 py-3.5">
                      <HealthBadge status={health} />
                    </td>
                    <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleAnalyze(e, account.id)}
                        disabled={isAnalyzing}
                        className="text-xs text-accent hover:text-accent-dark font-medium disabled:opacity-40 whitespace-nowrap"
                      >
                        {isAnalyzing ? <span className="flex items-center gap-1"><Spinner size={11} /> Running…</span> : 'Analyze'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Spinner({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      className="animate-spin"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
      <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
