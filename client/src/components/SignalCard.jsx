import SeverityBadge from './SeverityBadge.jsx';

export default function SignalCard({ signal, evidence, level, levelKey = 'severity' }) {
  return (
    <div className="bg-white border border-gray-100 rounded-lg px-4 py-3 shadow-sm flex gap-3 items-start">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 leading-snug">{signal}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{evidence}</p>
      </div>
      <div className="shrink-0 pt-0.5">
        <SeverityBadge level={level} />
      </div>
    </div>
  );
}
