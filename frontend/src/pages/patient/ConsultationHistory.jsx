import { useState, useEffect } from 'react';
import { getTimeline, getSummary } from '@/api/consultationHistory';
import Card, { CardHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { useAuth } from '@/hooks/useAuth';
import {
  Clock, Activity, Calendar, FileText, Pill, ClipboardList, Heart,
  ChevronLeft, ChevronRight, Filter,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

const TYPE_META = {
  triage:         { label: 'Triage',          icon: Activity,      variant: 'danger' },
  appointment:    { label: 'Appointment',      icon: Calendar,      variant: 'info' },
  prescription:   { label: 'Prescription',     icon: Pill,          variant: 'success' },
  medical_record: { label: 'Medical Record',   icon: FileText,      variant: 'warning' },
  follow_up:      { label: 'Follow-Up',        icon: ClipboardList, variant: 'default' },
  health_log:     { label: 'Health Log',       icon: Heart,         variant: 'info' },
};

const TYPES = Object.keys(TYPE_META);
const LIMIT = 10;

const TimelineEntry = ({ entry }) => {
  const [expanded, setExpanded] = useState(false);
  const meta = TYPE_META[entry.type] || { label: entry.type, icon: Clock, variant: 'default' };
  const Icon = meta.icon;
  const date = entry.date ? format(parseISO(entry.date), 'dd MMM yyyy') : '—';

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-9 h-9 rounded-full bg-brand-50 border-2 border-brand-200 flex items-center justify-center flex-shrink-0">
          <Icon size={16} className="text-brand-600" />
        </div>
        <div className="flex-1 w-px bg-slate-100 my-1" />
      </div>
      <div className="flex-1 pb-4">
        <div className="bg-surface border border-slate-100 rounded-card p-3 shadow-sm">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Badge variant={meta.variant}>{meta.label}</Badge>
              <span className="text-xs text-text-muted">{date}</span>
            </div>
            <button
              onClick={() => setExpanded(e => !e)}
              className="text-xs text-brand-600 hover:underline"
            >
              {expanded ? 'Hide details' : 'Details'}
            </button>
          </div>
          <p className="mt-1 text-sm text-text-primary truncate">{entry.summary || '—'}</p>
          {expanded && entry.details && (
            <pre className="mt-2 text-xs bg-slate-50 rounded p-2 overflow-x-auto text-text-secondary whitespace-pre-wrap">
              {JSON.stringify(entry.details, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};

const ConsultationHistory = () => {
  const { user } = useAuth();
  const patientId = user?.patientId;

  const [summary, setSummary]     = useState(null);
  const [entries, setEntries]     = useState([]);
  const [total, setTotal]         = useState(0);
  const [offset, setOffset]       = useState(0);
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');
  const [applied, setApplied]     = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState('');

  const page  = Math.floor(offset / LIMIT) + 1;
  const pages = Math.max(1, Math.ceil(total / LIMIT));

  const load = async (off = 0, filters = applied) => {
    if (!patientId) return;
    setIsLoading(true);
    setError('');
    try {
      const params = { limit: LIMIT, offset: off, ...filters };
      const [tRes, sRes] = await Promise.all([
        getTimeline(patientId, params),
        getSummary(patientId),
      ]);
      setEntries(tRes.data.data || []);
      setTotal(tRes.data.total || 0);
      setSummary(sRes.data);
      setOffset(off);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load timeline.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load(0, {});
  }, [patientId]);

  const applyFilters = () => {
    const f = {};
    if (typeFilter) f.type = typeFilter;
    if (dateFrom)   f.date_from = dateFrom;
    if (dateTo)     f.date_to   = dateTo;
    setApplied(f);
    load(0, f);
  };

  const clearFilters = () => {
    setTypeFilter('');
    setDateFrom('');
    setDateTo('');
    setApplied({});
    load(0, {});
  };

  if (!patientId) {
    return (
      <div className="p-6">
        <p className="text-text-secondary text-sm">Unable to load patient profile.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Clock size={22} className="text-brand-600" />
        <h1 className="text-xl font-bold text-text-primary">My Care Timeline</h1>
      </div>

      {/* Summary bar */}
      {summary && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {Object.entries(summary).map(([key, count]) => {
            const meta = TYPE_META[key] || { label: key, icon: Clock };
            const Icon = meta.icon;
            return (
              <div key={key} className="bg-surface border border-slate-100 rounded-card p-2 text-center">
                <Icon size={16} className="text-brand-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-text-primary">{count}</p>
                <p className="text-xs text-text-muted capitalize">{meta.label}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader title="Filter Timeline" icon={Filter} />
        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-text-muted mb-1">Record type</label>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-300 outline-none"
            >
              <option value="">All types</option>
              {TYPES.map(t => (
                <option key={t} value={t}>{TYPE_META[t].label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">From date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-300 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">To date</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-300 outline-none"
            />
          </div>
        </div>
        <div className="px-4 pb-4 flex gap-2">
          <Button size="sm" onClick={applyFilters}>Apply</Button>
          <Button size="sm" variant="ghost" onClick={clearFilters}>Clear</Button>
        </div>
      </Card>

      {/* Timeline */}
      {isLoading && <div className="flex justify-center py-8"><Spinner size="lg" /></div>}
      {error && <ErrorState message={error} />}
      {!isLoading && !error && entries.length === 0 && (
        <EmptyState title="No records found" description="Your care timeline is empty." />
      )}
      {!isLoading && !error && entries.length > 0 && (
        <div className="mt-2">
          {entries.map((entry, i) => (
            <TimelineEntry key={`${entry.type}-${entry.id}-${i}`} entry={entry} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > LIMIT && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-text-muted">Page {page} of {pages} ({total} total)</span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" disabled={offset === 0}
              onClick={() => load(offset - LIMIT)}>
              <ChevronLeft size={16} />
            </Button>
            <Button size="sm" variant="ghost" disabled={offset + LIMIT >= total}
              onClick={() => load(offset + LIMIT)}>
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsultationHistory;
