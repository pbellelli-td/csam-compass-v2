export default function MetricCard({ label, value, sub, status }) {
  const statusColor =
    status === 'good'
      ? 'border-t-emerald-400'
      : status === 'warn'
      ? 'border-t-amber-400'
      : status === 'bad'
      ? 'border-t-red-400'
      : 'border-t-slate-200';

  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5 border-t-2 ${statusColor}`}>
      <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">{label}</p>
      <p className="text-2xl font-mono font-semibold text-gray-900 leading-none">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-1.5 font-mono">{sub}</p>}
    </div>
  );
}
