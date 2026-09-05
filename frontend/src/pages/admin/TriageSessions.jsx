import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getAdminSessions, escalateSession } from '@/api/triage';
import { getAllDoctors, createAdminAppointment } from '@/api/admin';
import usePaginatedFetch from '@/hooks/usePaginatedFetch';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';
import { ClipboardList, User, Calendar, AlertTriangle, FileText, CalendarPlus } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

const URGENCY_VARIANT = {
  emergency: 'danger',
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

const TriageSessions = () => {
  const [filters, setFilters] = useState({ urgency_level: '', date_from: '', date_to: '' });
  const [applied, setApplied] = useState({});
  const [escalateMap, setEscalateMap] = useState({});
  const [submitting, setSubmitting] = useState({});
  const [detailModal, setDetailModal] = useState(null);

  const { data: sessions, isLoading, error, currentPage, totalPages, totalItems, pageSize, setPage, refetch } = usePaginatedFetch(getAdminSessions, applied);

  const [doctors, setDoctors] = useState([]);
  useEffect(() => {
    getAllDoctors()
      .then(({ data: d }) => setDoctors(d?.data || []))
      .catch(() => {});
  }, []);

  // Schedule modal — admin picks a doctor + date/time to both escalate and book
  const [scheduleModal, setScheduleModal] = useState(null);
  const [scheduleDoctorId, setScheduleDoctorId] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleStart, setScheduleStart] = useState('');
  const [scheduleEnd, setScheduleEnd] = useState('');
  const [scheduling, setScheduling] = useState(false);

  const applyFilters = () => {
    const clean = {};
    if (filters.urgency_level) clean.urgency_level = filters.urgency_level;
    if (filters.date_from) clean.date_from = filters.date_from;
    if (filters.date_to) clean.date_to = filters.date_to;
    setApplied(clean);
  };

  const handleEscalate = async (sessionId) => {
    const doctorId = escalateMap[sessionId];
    if (!doctorId) {
      toast.error('Select a doctor.');
      return;
    }
    setSubmitting((prev) => ({ ...prev, [sessionId]: true }));
    try {
      await escalateSession(sessionId, { doctor_id: parseInt(doctorId) });
      toast.success('Session escalated.');
      refetch();
      setDetailModal(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Escalation failed.');
    } finally {
      setSubmitting((prev) => ({ ...prev, [sessionId]: false }));
    }
  };

  const openSchedule = (session) => {
    setScheduleModal(session);
    setScheduleDoctorId(session.escalated_to_doctor_id ? String(session.escalated_to_doctor_id) : '');
    setScheduleDate('');
    setScheduleStart('');
    setScheduleEnd('');
  };

  const addMinutes = (time, mins) => {
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m + mins;
    const hh = Math.floor((total % (24 * 60)) / 60).toString().padStart(2, '0');
    const mm = (total % 60).toString().padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const handleSchedule = async () => {
    if (!scheduleDoctorId || !scheduleDate || !scheduleStart) {
      toast.error('Please select a doctor, date, and start time.');
      return;
    }
    setScheduling(true);
    try {
      await createAdminAppointment({
        patient_id: scheduleModal.patient_id,
        doctor_id: scheduleDoctorId,
        appointment_date: scheduleDate,
        appointment_start_time: scheduleStart,
        appointment_end_time: scheduleEnd || addMinutes(scheduleStart, 30),
        notes: `Scheduled from escalated triage case #${scheduleModal.id}`,
        triage_session_id: scheduleModal.id,
      });
      toast.success('Appointment scheduled.');
      setScheduleModal(null);
      setDetailModal(null);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to schedule appointment.');
    } finally {
      setScheduling(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Triage Sessions" />

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1 flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-text-secondary">Urgency Level</label>
            <select value={filters.urgency_level} onChange={(e) => setFilters((f) => ({ ...f, urgency_level: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
              <option value="">All</option>
              <option value="emergency">Emergency</option>
              <option value="urgent">Urgent</option>
              <option value="standard">Standard</option>
              <option value="self_care">Self Care</option>
            </select>
          </div>
          <div className="space-y-1 flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-text-secondary">From</label>
            <input type="date" value={filters.date_from} onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>
          <div className="space-y-1 flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-text-secondary">To</label>
            <input type="date" value={filters.date_to} onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>
          <Button onClick={applyFilters}>Apply</Button>
          <Button
            variant="secondary"
            onClick={() => {
              setFilters({ urgency_level: '', date_from: '', date_to: '' });
              setApplied({});
            }}
          >
            Clear
          </Button>
        </div>
      </Card>

      <Card>
        {isLoading && (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        )}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && sessions.length === 0 && <EmptyState icon={ClipboardList} title="No sessions found" description="No triage sessions match the current filters." />}
        {!isLoading && !error && sessions.length > 0 && (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div key={s.id} className={clsx('p-4 rounded-xl border-l-[5px] bg-surface-subtle hover:bg-surface-warm transition-colors cursor-pointer', urgencyBorderColor(s.urgency_level))} onClick={() => setDetailModal(s)}>
                <div className="flex items-start gap-4">
                  <div className="w-[46px] h-[46px] rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <ClipboardList size={22} className="text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <p className="text-xs font-mono text-text-muted">#{s.id}</p>
                        <p className="text-sm font-semibold text-text-primary">{s.patient_name || 'Unknown Patient'}</p>
                      </div>
                      <Badge variant={URGENCY_VARIANT[s.urgency_level] || 'default'}>{s.urgency_level?.replace('_', ' ')}</Badge>
                    </div>
                    <p className="text-sm text-text-secondary mb-2 line-clamp-2">{s.symptoms_text}</p>
                    <div className="flex items-center gap-4 text-xs text-text-muted">
                      <span>{s.created_at ? format(new Date(s.created_at), 'dd MMM yyyy') : '—'}</span>
                      {s.escalated_to_doctor_id && (
                        <>
                          <span>•</span>
                          <span>Escalated to {s.escalated_to_doctor_name || `Dr. #${s.escalated_to_doctor_id}`}</span>
                        </>
                      )}
                    </div>
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
        <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title={`Triage Session #${detailModal.id}`}>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Urgency Level</p>
              <Badge variant={URGENCY_VARIANT[detailModal.urgency_level] || 'default'}>{detailModal.urgency_level?.replace('_', ' ')}</Badge>
            </div>
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Patient</p>
              <div className="flex items-center gap-2 text-sm text-text-primary">
                <User size={16} className="text-orange-600" />
                {detailModal.patient_name || 'Unknown Patient'}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Symptoms</p>
              <div className="flex items-start gap-2">
                <FileText size={16} className="text-orange-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-text-secondary whitespace-pre-wrap">{detailModal.symptoms_text}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Session Date</p>
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Calendar size={16} className="text-orange-600" />
                {detailModal.created_at ? format(new Date(detailModal.created_at), 'dd MMM yyyy, HH:mm') : '—'}
              </div>
            </div>
            {detailModal.escalated_to_doctor_id && (
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Escalated To</p>
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <AlertTriangle size={16} className="text-orange-600" />
                  {detailModal.escalated_to_doctor_name || `Doctor #${detailModal.escalated_to_doctor_id}`}
                </div>
              </div>
            )}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              {!detailModal.escalated_to_doctor_id && (
                <div>
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Escalate to Doctor</p>
                  <div className="flex gap-2">
                    <select
                      value={escalateMap[detailModal.id] || ''}
                      onChange={(e) => setEscalateMap((m) => ({ ...m, [detailModal.id]: e.target.value }))}
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                    >
                      <option value="">Select a doctor</option>
                      {doctors.map((doc) => (
                        <option key={doc.id} value={doc.id}>{doc.doctor_name}</option>
                      ))}
                    </select>
                    <Button isLoading={!!submitting[detailModal.id]} onClick={() => handleEscalate(detailModal.id)}>
                      Escalate
                    </Button>
                  </div>
                </div>
              )}
              <Button className="w-full" variant="secondary" onClick={() => openSchedule(detailModal)}>
                <CalendarPlus size={16} className="mr-2" /> Schedule Appointment
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Schedule Modal */}
      {scheduleModal && (
        <Modal
          isOpen={!!scheduleModal}
          onClose={() => setScheduleModal(null)}
          title={`Schedule Appointment — ${scheduleModal.patient_name || `Patient #${scheduleModal.patient_id}`}`}
          footer={
            <>
              <Button variant="secondary" onClick={() => setScheduleModal(null)}>Cancel</Button>
              <Button onClick={handleSchedule} isLoading={scheduling}>Schedule</Button>
            </>
          }
        >
          <div className="space-y-4">
            <Select label="Doctor" value={scheduleDoctorId} onChange={(e) => setScheduleDoctorId(e.target.value)}>
              <option value="">Select a doctor</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>{doc.doctor_name}</option>
              ))}
            </Select>
            <Input label="Date" type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Start Time" type="time" value={scheduleStart} onChange={(e) => setScheduleStart(e.target.value)} />
              <Input label="End Time" type="time" value={scheduleEnd} onChange={(e) => setScheduleEnd(e.target.value)} placeholder="Defaults to +30 min" />
            </div>
            <p className="text-xs text-text-muted">Must fall within the doctor's declared time slots.</p>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default TriageSessions;
