import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="bg-navy text-white px-6 py-4 flex items-center gap-4 shadow-lg">
      <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
        {/* Compass icon */}
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <circle cx="14" cy="14" r="13" stroke="#1E5EFF" strokeWidth="2" />
          <circle cx="14" cy="14" r="3" fill="#1E5EFF" />
          <line x1="14" y1="1" x2="14" y2="7" stroke="#1E5EFF" strokeWidth="2" strokeLinecap="round" />
          <line x1="14" y1="21" x2="14" y2="27" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
          <line x1="1" y1="14" x2="7" y2="14" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
          <line x1="21" y1="14" x2="27" y2="14" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <div>
          <span className="text-lg font-semibold tracking-tight">CSAM Compass</span>
          <span className="ml-2 text-xs font-mono text-slate-400 uppercase tracking-widest">v2</span>
        </div>
      </Link>

      <div className="flex-1" />

      <span className="text-xs text-slate-400 font-mono">Phase 1 · Revenue Intelligence</span>
    </header>
  );
}
