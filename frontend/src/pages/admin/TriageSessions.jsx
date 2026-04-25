import { useState } from 'react';
import toast from 'react-hot-toast';
import { getAdminSessions, escalateSession } from '@/api/triage';
import useFetch from '@/hooks/useFetch';
import Card, { CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { ClipboardList } from 'lucide-react';
import { format } from 'date-fns';

const URGENCY_VARIANT = {
  emergency: 'danger',
  urgent: 'warning',
  standard: 'info',
  self_care: 'success',
};

const TriageSessions = () => {
  const [filters, setFilters] = useState({ urgency_level: '', date_from: '', date_to: '' });
  const [applied, setApplied] = useState({});
  const [escalateMap, setEscalateMap] = useState({});
  const [submitting, setSubmitting] = useState({});

  const { data, isLoading, error, refetch } = useFetch(getAdminSessions, applied);
  const sessions = data?.data || [];

  const applyFilters = () => {
    const clean = {};
    if (filters.urgency_level) clean.urgency_level = filters.urgency_level;
    if (filters.date_from) clean.date_from = filters.date_from;
    if (filters.date_to) clean.date_to = filters.date_to;
    setApplied(clean);
  };

  const handleEscalate = async (sessionId) => {
    const doctorId = escalateMap[sessionId];
    if (!doctorId || isNaN(parseInt(doctorId))) {
      toast.error('Enter a valid Doctor ID.');
      return;
    }
    setSubmitting(prev => ({ ...prev, [sessionId]: true }));
    try {
      await escalateSession(sessionId, { doctor_id: parseInt(doctorId) });
      toast.success('Session escalated.');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Escalation failed.');
    } finally {
      setSubmitting(prev => ({ ...prev, [sessionId]: false }));
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="page-title">Triage Sessions</h1>

      {/* Filters */}
      <Card>
        <CardHeader title="Filter Sessions" />
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-text-secondary">Urgency Level</label>
            <select
              value={filters.urgency_level}
              onChange={(e) => setFilters(f => ({ ...f, urgency_level: e.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All</option>
              <option value="emergency">Emergency</option>
              <option value="urgent">Urgent</option>
              <option value="standard">Standard</option>
              <option value="self_care">Self Care</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-text-secondary">From</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters(f => ({ ...f, date_from: e.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-text-secondary">To</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters(f => ({ ...f, date_to: e.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <Button onClick={applyFilters}>Apply</Button>
          <Button variant="secondary" onClick={() => { setFilters({ urgency_level: '', date_from: '', date_to: '' }); setApplied({}); }}>
            Clear
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader title={`Sessions (${sessions.length})`} />
        {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && sessions.length === 0 && (
          <EmptyState icon={ClipboardList} title="No sessions found" description="No triage sessions match the current filters." />
        )}
        {!isLoading && !error && sessions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">#</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Patient</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Symptoms</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Urgency</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Escalated</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Date</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Escalate to Doctor</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-b border-slate-50 hover:bg-surface-subtle">
                    <td className="py-3 px-2 text-text-secondary">#{s.id}</td>
                    <td className="py-3 px-2 text-text-primary">{s.patient_name || '—'}</td>
                    <td className="py-3 px-2 text-text-primary max-w-xs truncate">{s.symptoms_text}</td>
                    <td className="py-3 px-2">
                      <Badge variant={URGENCY_VARIANT[s.urgency_level] || 'default'}>
                        {s.urgency_level?.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-text-secondary">
                      {s.escalated_to_doctor_id ? `Dr. #${s.escalated_to_doctor_id}` : '—'}
                    </td>
                    <td className="py-3 px-2 text-text-secondary">
                      {s.created_at ? format(new Date(s.created_at), 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="Doctor ID"
                          value={escalateMap[s.id] || ''}
                          onChange={(e) => setEscalateMap(m => ({ ...m, [s.id]: e.target.value }))}
                          className="w-24 rounded border border-slate-200 px-2 py-1 text-xs"
                        />
                        <Button
                          size="sm"
                          isLoading={!!submitting[s.id]}
                          onClick={() => handleEscalate(s.id)}
                        >
                          Escalate
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default TriageSessions;
