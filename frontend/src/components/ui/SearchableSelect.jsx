import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import clsx from 'clsx';

// A typeahead dropdown for picking one item out of a long list (patients,
// doctors, etc.) by name instead of scrolling a native <select> or typing a
// raw ID. `options` is [{ value, label, sublabel? }].
const SearchableSelect = ({ label, options = [], value, onChange, placeholder = 'Search…', emptyText = 'No matches', className = '' }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);

  const selected = options.find((o) => String(o.value) === String(value));

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = options.filter((o) =>
    !query || o.label.toLowerCase().includes(query.toLowerCase()) || o.sublabel?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className={clsx('relative', className)} ref={containerRef}>
      {label && <label className="block text-sm font-medium text-text-primary mb-1.5">{label}</label>}
      <div
        className="w-full flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm bg-white cursor-text focus-within:ring-2 focus-within:ring-brand-500/30 focus-within:border-brand-500"
        onClick={() => setOpen(true)}
      >
        <Search size={14} className="text-text-muted flex-shrink-0" />
        <input
          type="text"
          value={open ? query : selected?.label || ''}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={selected ? selected.label : placeholder}
          className="flex-1 min-w-0 outline-none bg-transparent"
        />
        {selected && !open && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            className="text-text-muted hover:text-text-primary flex-shrink-0"
          >
            <X size={14} />
          </button>
        )}
        <ChevronDown size={14} className="text-text-muted flex-shrink-0" />
      </div>
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {filtered.length === 0 && <div className="px-3.5 py-3 text-sm text-text-muted">{emptyText}</div>}
          {filtered.map((o) => (
            <button
              type="button"
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); setQuery(''); }}
              className={clsx(
                'w-full text-left px-3.5 py-2.5 text-sm hover:bg-surface-subtle transition-colors',
                String(o.value) === String(value) && 'bg-brand-50 text-brand-700 font-medium'
              )}
            >
              {o.label}
              {o.sublabel && <span className="block text-xs text-text-muted">{o.sublabel}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
