const STYLES = {
  high: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  med: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  low: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
};

const LABELS = {
  high: 'High',
  med: 'Med',
  low: 'Low',
};

export default function SeverityBadge({ level }) {
  const style = STYLES[level] || 'bg-gray-100 text-gray-500 ring-1 ring-gray-200';
  const label = LABELS[level] || level || '?';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-medium ${style}`}>
      {label}
    </span>
  );
}
