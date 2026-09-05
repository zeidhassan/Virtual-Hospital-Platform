import { useState } from 'react';
import { getEscalatedSessions } from '@/api/triage';
import { createDoctorAppointment } from '@/api/appointments';
import usePaginatedFetch from '@/hooks/usePaginatedFetch';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';
import Modal from '@/components/ui/Modal';
import { AlertTriangle, User, Calendar, Activity, CalendarPlus } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const URGENCY_VARIANT = {
  emergency: 'error',
  urgent: 'warning',
  standard: 'info',
  self_care: 'success',
};

const urgencyBorderColor = (urgency) => {
  if (urgency === 'emergency') return 'border-l-red-500';
  if (urgency === 'urgent') return 'border-l-amber-500';
  if (urgency === 'standard') return 'border-l-blue-500';
  if (urgency === 'self_care') return 'border-l-green-500';
  return 'border-l-slate-300';
};

const addMinutes = (time, mins) => {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  const hh = Math.floor((total % (24 * 60)) / 60).toString().padStart(2, '0');
  const mm = (total % 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
};

// ── Schedule appointment modal ───────────────────────────────────────────
const ScheduleModal = ({ session, onClose, onScheduled }) => {
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [notes, setNotes] = useState(`Follow-up for escalated triage case #${session.id}`);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date || !startTime) {
      toast.error('Please pick a date and time.');
      return;
    }
    setSaving(true);
    try {
      await createDoctorAppointment({
        patient_id: session.patient_id,
        appointment_date: date,
        appointment_start_time: startTime,
        appointment_end_time: addMinutes(startTime, 30),
        notes,
        triage_session_id: session.id,
      });
      toast.success('Appointment scheduled.');
      onScheduled();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to schedule appointment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Schedule Appointment — ${session.patient_name || `Patient #${session.patient_id}`}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          <Input label="Start Time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-none"
          />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={saving} disabled={saving}>Schedule</Button>
        </div>
      </form>
    </Modal>
  );
};

const EscalatedTriage = () => {
  const { data: sessions, isLoading, error, currentPage, totalPages, totalItems, pageSize, setPage, refetch } = usePaginatedFetch(getEscalatedSessions);
  const [detailModal, setDetailModal] = useState(null);
  const [scheduleModal, setScheduleModal] = useState(null);

  const handleScheduled = () => {
    setScheduleModal(null);
    setDetailModal(null);
    refetch();
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Escalated Triage Cases" />

      <Card>
        {isLoading && (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        )}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && sessions.length === 0 && <EmptyState icon={AlertTriangle} title="No escalated cases" description="Triage sessions escalated to you by an admin will appear here." />}
        {!isLoading && !error && sessions.length > 0 && (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div key={s.id} className={clsx('p-4 rounded-xl border-l-[5px] bg-surface-subtle hover:bg-surface-warm transition-colors', urgencyBorderColor(s.urgency_level))}>
                <div className="flex items-start gap-4">
                  <div className="w-[46px] h-[46px] rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0 cursor-pointer" onClick={() => setDetailModal(s)}>
                    <AlertTriangle size={22} className="text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setDetailModal(s)}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <p className="text-xs font-mono text-text-muted">#{s.id}</p>
                        <p className="text-sm font-semibold text-text-primary">{s.patient_name || `Patient #${s.patient_id}`}</p>
                      </div>
                      <Badge variant={URGENCY_VARIANT[s.urgency_level] || 'default'}>{s.urgency_level?.replace('_', ' ')}</Badge>
                    </div>
                    <p className="text-sm text-text-secondary line-clamp-2 mb-2">{s.symptoms_text}</p>
                    <div className="flex items-center gap-4 text-xs text-text-muted">
                      <span className="flex items-center gap-1">
                        <Activity size={12} />
                        {s.recommended_department}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {s.created_at ? format(new Date(s.created_at), 'dd MMM yyyy') : '—'}
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <Button size="sm" onClick={() => setScheduleModal(s)}>
                      <CalendarPlus size={14} className="mr-1" /> Schedule
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
      </Card>

      {/* Detail Modal */}
      {detailModal && (
        <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title={`Triage Case #${detailModal.id}`}>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Urgency Level</p>
              <Badge variant={URGENCY_VARIANT[detailModal.urgency_level] || 'default'}>{detailModal.urgency_level?.replace('_', ' ')}</Badge>
            </div>
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Patient</p>
              <div className="flex items-center gap-2 text-sm text-text-primary">
                <User size={16} className="text-emerald-600" />
                {detailModal.patient_name || `Patient #${detailModal.patient_id}`}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Symptoms</p>
              <p className="text-sm text-text-secondary whitespace-pre-wrap">{detailModal.symptoms_text}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Recommended Department</p>
              <p className="text-sm text-text-primary">{detailModal.recommended_department}</p>
            </div>
            {detailModal.recommended_action && (
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Recommended Action</p>
                <p className="text-sm text-text-secondary">{detailModal.recommended_action}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Date</p>
              <p className="text-sm text-text-secondary">{detailModal.created_at ? format(new Date(detailModal.created_at), 'dd MMM yyyy, HH:mm') : '—'}</p>
            </div>
            <div className="pt-2">
              <Button className="w-full" onClick={() => setScheduleModal(detailModal)}>
                <CalendarPlus size={16} className="mr-2" /> Schedule Appointment
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Schedule Modal */}
      {scheduleModal && (
        <ScheduleModal
          session={scheduleModal}
          onClose={() => setScheduleModal(null)}
          onScheduled={handleScheduled}
        />
      )}
    </div>
  );
};

export default EscalatedTriage;
