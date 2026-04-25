import { useState } from 'react';
import { getTimeline, getSummary } from '@/api/consultationHistory';
import Card, { CardHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import {
  Clock, Activity, Calendar, FileText, Pill, ClipboardList, Heart,
  ChevronLeft, ChevronRight, Search,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

const TYPE_META = {
  triage:         { label: 'Triage',        icon: Activity,      variant: 'danger' },
  appointment:    { label: 'Appointment',    icon: Calendar,      variant: 'info' },
  prescription:   { label: 'Prescription',   icon: Pill,          variant: 'success' },
  medical_record: { label: 'Medical Record', icon: FileText,      variant: 'warning' },
  follow_up:      { label: 'Follow-Up',      icon: ClipboardList, variant: 'default' },
  health_log:     { label: 'Health Log',     icon: Heart,         variant: 'info' },
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
            <button onClick={() => setExpanded(e => !e)} className="text-xs text-brand-600 hover:underline">
              {expanded ? 'Hide' : 'Details'}
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

const PatientTimeline = () => {
  const [inputId, setInputId]     = useState('');
  const [patientId, setPatientId] = useState(null);
  const [summary, setSummary]     = useState(null);
  const [entries, setEntries]     = useState([]);
  const [total, setTotal]         = useState(0);
  const [offset, setOffset]       = useState(0);
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const page  = Math.floor(offset / LIMIT) + 1;
  const pages = Math.max(1, Math.ceil(total / LIMIT));

  const load = async (pid, off = 0) => {
    setLoading(true); setError('');
    try {
      const params = { limit: LIMIT, offset: off };
      if (typeFilter) params.type = typeFilter;
      if (dateFrom)   params.date_from = dateFrom;
      if (dateTo)     params.date_to   = dateTo;

      const [tRes, sRes] = await Promise.all([
        getTimeline(pid, params),
        getSummary(pid),
      ]);
      setEntries(tRes.data.data || []);
      setTotal(tRes.data.total || 0);
      setSummary(sRes.data);
      setOffset(off);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load timeline.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    const pid = parseInt(inputId);
    if (!pid || pid <= 0) { setError('Enter a valid patient ID.'); return; }
    setPatientId(pid);
    load(pid, 0);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Clock size={22} className="text-brand-600" />
        <h1 className="text-xl font-bold text-text-primary">Patient Care Timeline</h1>
      </div>

      {/* Patient search */}
      <Card>
        <CardHeader title="Load Patient Timeline" icon={Search} />
        <div className="p-4 flex gap-2">
          <input
            type="number"
            value={inputId}
            onChange={e => setInputId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Patient ID"
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-300 outline-none"
          />
          <Button onClick={handleSearch} size="sm">Load</Button>
        </div>
      </Card>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      {patientId && summary && (
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

      {patientId && (
        <Card>
          <CardHeader title="Filters" />
          <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-300 outline-none"
            >
              <option value="">All types</option>
              {TYPES.map(t => <option key={t} value={t}>{TYPE_META[t].label}</option>)}
            </select>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              placeholder="From"
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-300 outline-none" />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              placeholder="To"
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-300 outline-none" />
          </div>
          <div className="px-4 pb-4 flex gap-2">
            <Button size="sm" onClick={() => load(patientId, 0)}>Apply</Button>
            <Button size="sm" variant="ghost" onClick={() => {
              setTypeFilter(''); setDateFrom(''); setDateTo('');
              load(patientId, 0);
            }}>Clear</Button>
          </div>
        </Card>
      )}

      {loading && <div className="flex justify-center py-8"><Spinner size="lg" /></div>}
      {!loading && patientId && entries.length === 0 && !error && (
        <EmptyState title="No records" description="No care records for this patient." />
      )}
      {!loading && entries.length > 0 && (
        <div className="mt-2">
          {entries.map((entry, i) => (
            <TimelineEntry key={`${entry.type}-${entry.id}-${i}`} entry={entry} />
          ))}
        </div>
      )}

      {total > LIMIT && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-text-muted">Page {page} of {pages} ({total} total)</span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" disabled={offset === 0}
              onClick={() => load(patientId, offset - LIMIT)}>
              <ChevronLeft size={16} />
            </Button>
            <Button size="sm" variant="ghost" disabled={offset + LIMIT >= total}
              onClick={() => load(patientId, offset + LIMIT)}>
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientTimeline;
