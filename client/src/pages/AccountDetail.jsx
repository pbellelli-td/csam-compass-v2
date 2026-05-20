import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import MetricCard from '../components/MetricCard.jsx';
import SignalCard from '../components/SignalCard.jsx';

const fmt = {
  pct: (v) => (v != null ? `${Math.round(v * 100)}%` : '—'),
  mrr: (v) => (v != null ? `$${v.toLocaleString()}` : '—'),
  date: (v) =>
    v
      ? new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '—',
};

function metricStatus(key, value) {
  if (value == null) return undefined;
  if (key === 'seat_fill_pct') {
    if (value >= 0.85) return 'good';
    if (value >= 0.55) return undefined;
    return 'bad';
  }
  if (key === 'days_since_last_login') {
    if (value <= 7) return 'good';
    if (value <= 21) return 'warn';
    return 'bad';
  }
  if (key === 'workflow_adoption') {
    if (value >= 0.7) return 'good';
    if (value >= 0.4) return undefined;
    return 'bad';
  }
  return undefined;
}

function SourcePill({ label, active }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-mono ${
        active
          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
          : 'bg-gray-100 text-gray-400'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-gray-300'}`} />
      {label}
    </span>
  );
}

function Spinner({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className="animate-spin" aria-hidden="true">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
      <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function AccountDetail() {
  const { id } = useParams();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getAccount(id)
      .then(setAccount)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleAnalyze() {
    setAnalyzing(true);
    setError(null);
    try {
      const updated = await api.analyzeAccount(id);
      setAccount(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-sm animate-pulse">Loading account…</div>
      </div>
    );
  }

  if (error && !account) {
    return (
      <div className="max-w-xl mx-auto mt-16 p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
        <strong>Could not load account.</strong>
        <p className="mt-1 font-mono text-xs">{error}</p>
      </div>
    );
  }

  const { analysis } = account;

  const daysUntilRenewal = account.renewal_date
    ? Math.round((new Date(account.renewal_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="max-w-screen-lg mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link to="/" className="text-sm text-gray-400 hover:text-accent transition-colors inline-flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Book of Business
        </Link>
      </div>

      {/* Account header */}
      <div className="bg-navy rounded-2xl px-7 py-6 mb-6 text-white">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold">{account.company_name}</h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="text-slate-300 text-sm">{account.csam_owner}</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-300 text-sm capitalize">{account.lifecycle_stage}</span>
              {daysUntilRenewal != null && (
                <>
                  <span className="text-slate-600">·</span>
                  <span className={`text-sm font-mono ${daysUntilRenewal <= 60 ? 'text-amber-300' : 'text-slate-300'}`}>
                    Renews {fmt.date(account.renewal_date)}
                    {daysUntilRenewal <= 60 && ` · ${daysUntilRenewal}d`}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-mono font-semibold">{fmt.mrr(account.mrr)}</p>
            <p className="text-slate-400 text-xs font-mono mt-0.5">MRR · {fmt.mrr(account.arr)} ARR</p>
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Seat Fill"
          value={fmt.pct(account.seat_fill_pct)}
          sub={account.active_users != null ? `${account.active_users} / ${account.total_seats} users` : undefined}
          status={metricStatus('seat_fill_pct', account.seat_fill_pct)}
        />
        <MetricCard
          label="Last Login"
          value={account.days_since_last_login != null ? `${account.days_since_last_login}d ago` : '—'}
          status={metricStatus('days_since_last_login', account.days_since_last_login)}
        />
        <MetricCard
          label="Workflow Adoption"
          value={fmt.pct(account.workflow_adoption)}
          status={metricStatus('workflow_adoption', account.workflow_adoption)}
        />
        <MetricCard
          label="ARR"
          value={fmt.mrr(account.arr)}
          sub={`MRR ${fmt.mrr(account.mrr)}`}
        />
      </div>

      {/* Analysis section */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-800">AI Signal Analysis</h2>
        <div className="flex items-center gap-3">
          {analysis?.analyzed_at && (
            <span className="text-xs text-gray-400 font-mono">
              {new Date(analysis.analyzed_at).toLocaleString('en-US', {
                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
              })}
            </span>
          )}
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-dark text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {analyzing ? (
              <><Spinner size={13} /> Analyzing…</>
            ) : (
              <>{analysis ? 'Refresh Analysis' : 'Run Analysis'}</>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-mono">
          {error}
        </div>
      )}

      {!analysis && !analyzing && (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl p-12 text-center">
          <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"
                fill="#1E5EFF" fillOpacity="0.7" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm mb-1">No analysis yet</p>
          <p className="text-gray-400 text-xs">Click "Run Analysis" to send this account's data to Claude.</p>
        </div>
      )}

      {analysis && (
        <div className="space-y-5">
          {/* Health summary */}
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Health Summary</p>
            <p className="text-gray-800 leading-relaxed">{analysis.health_summary}</p>
          </div>

          {/* Risk + Expansion signals side by side */}
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                Risk Signals
                <span className="text-gray-300 font-mono">{analysis.risk_signals?.length ?? 0}</span>
              </p>
              {analysis.risk_signals?.length ? (
                <div className="space-y-2">
                  {analysis.risk_signals.map((s, i) => (
                    <SignalCard key={i} signal={s.signal} evidence={s.evidence} level={s.severity} />
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-gray-100 rounded-lg p-4 text-sm text-gray-400 italic">No risk signals detected.</div>
              )}
            </div>

            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                Expansion Signals
                <span className="text-gray-300 font-mono">{analysis.expansion_signals?.length ?? 0}</span>
              </p>
              {analysis.expansion_signals?.length ? (
                <div className="space-y-2">
                  {analysis.expansion_signals.map((s, i) => (
                    <SignalCard key={i} signal={s.signal} evidence={s.evidence} level={s.confidence} />
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-gray-100 rounded-lg p-4 text-sm text-gray-400 italic">No expansion signals detected.</div>
              )}
            </div>
          </div>

          {/* Qual notes */}
          {analysis.recent_qual_notes && (
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Qualitative Context</p>
              <p className="text-gray-700 leading-relaxed text-sm">{analysis.recent_qual_notes}</p>
            </div>
          )}

          {/* Suggested next action */}
          {analysis.suggested_next_action && (
            <div className="bg-accent/5 border border-accent/20 rounded-xl p-5">
              <p className="text-xs text-accent uppercase tracking-wider font-semibold mb-2">Suggested Next Action</p>
              <p className="text-gray-800 font-medium">{analysis.suggested_next_action}</p>
            </div>
          )}

          {/* Data sources used */}
          {analysis.sources_used && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-gray-400 mr-1">Sources:</span>
              <SourcePill label="HubSpot" active={analysis.sources_used.hubspot} />
              <SourcePill label="TaxDome" active={analysis.sources_used.taxdome} />
              <SourcePill label="Gmail" active={analysis.sources_used.gmail} />
              <SourcePill label="Fathom" active={analysis.sources_used.fathom} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
