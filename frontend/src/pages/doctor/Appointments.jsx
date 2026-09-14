import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDoctorAppointments, updateAppointmentStatus, rescheduleDoctorAppointment } from '@/api/appointments';
import { createFollowUp } from '@/api/followUps';
import usePaginatedFetch from '@/hooks/usePaginatedFetch';
import Card from '@/components/ui/Card';
import Badge, { statusVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';
import Avatar from '@/components/ui/Avatar';
import { Calendar, Search, Plus, Clock, User, FileText, CheckCircle, X } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const FILTER_OPTIONS = ['all', 'upcoming', 'confirmed', 'in-progress', 'completed', 'pending'];
const TYPE_FILTER_OPTIONS = ['all', 'consultation', 'follow_up', 'triage_escalation'];
const TYPE_LABEL = { consultation: 'Consultation', follow_up: 'Follow-up', triage_escalation: 'Escalated' };
const TYPE_VARIANT = { consultation: 'default', follow_up: 'brand', triage_escalation: 'warning' };

const Appointments = () => {
  const navigate = useNavigate();
  const { data: appointments, isLoading, error, currentPage, totalPages, totalItems, pageSize, setPage, refetch } = usePaginatedFetch(getDoctorAppointments);
  const [updating, setUpdating] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [detailModal, setDetailModal] = useState(null);
  const [rescheduleModal, setRescheduleModal] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [rescheduling, setRescheduling] = useState(false);

  // Consultation-outcome capture — only intercepts the transition to
  // 'completed' on a non-follow_up appointment. Follow-up completion has
  // its own separate, correct lifecycle via completeFollowUp on the
  // Follow-Ups page, so this must never fire for appointment_type ===
  // 'follow_up'. pendingStatus exists because the status Badge is otherwise
  // fully controlled off detailModal.status — without it, clicking "Mark
  // Completed" would visually snap back to the old status while this form is open.
  const [pendingStatus, setPendingStatus] = useState(null);
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [scheduleFollowUp, setScheduleFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [savingOutcome, setSavingOutcome] = useState(false);

  const canReschedule = (status) => status !== 'completed' && status !== 'cancelled';

  const defaultFollowUpDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  };

  const handleStatusChange = async (id, status) => {
    setUpdating(id);
    try {
      await updateAppointmentStatus(id, { status });
      toast.success('Status updated');
      setDetailModal((m) => (m && m.id === id ? { ...m, status } : m));
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update status');
    } finally {
      setUpdating(null);
    }
  };

  // Only ever called with 'completed' (from the Mark Completed button) —
  // kept as its own function, rather than inlined into that button's
  // onClick, so the follow_up-type guard lives in one place.
  const handleStatusSelect = (id, status, appointmentType) => {
    if (status === 'completed' && appointmentType !== 'follow_up') {
      setPendingStatus('completed');
      setOutcomeNotes('');
      setScheduleFollowUp(false);
      setFollowUpDate(defaultFollowUpDate());
      setFollowUpNotes('');
      return;
    }
    setPendingStatus(null);
    handleStatusChange(id, status);
  };

  const handleCompleteWithOutcome = async (appt) => {
    setSavingOutcome(true);
    try {
      await updateAppointmentStatus(appt.id, {
        status: 'completed',
        // undefined (not '') for an empty textarea, so axios drops the key
        // and the backend's COALESCE leaves any prior value untouched
        // instead of overwriting it with blank.
        outcome_notes: outcomeNotes.trim() || undefined,
      });
      setDetailModal((m) => (m && m.id === appt.id ? { ...m, status: 'completed' } : m));
      setPendingStatus(null);

      if (scheduleFollowUp) {
        if (!followUpDate) {
          toast.error('Marked completed, but a follow-up date is required to schedule one.');
        } else {
          try {
            await createFollowUp({
              patient_id: appt.patient_id,
              scheduled_date: followUpDate,
              notes: followUpNotes.trim() || undefined,
            });
            toast.success('Marked completed and follow-up scheduled');
          } catch (err) {
            // The status update already succeeded — this is a distinct,
            // partial failure, not an overall one. Say so explicitly rather
            // than a generic error that could read as the whole action
            // having failed.
            toast.error(`Marked completed, but the follow-up could not be scheduled: ${err.response?.data?.error || 'unknown error'}`);
          }
        }
      } else {
        toast.success('Marked completed');
      }
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update status');
    } finally {
      setSavingOutcome(false);
    }
  };

  const openReschedule = (appt) => {
    setRescheduleModal(appt);
    setNewDate(appt.appointment_date ? appt.appointment_date.split('T')[0] : '');
    setNewStartTime(appt.appointment_start_time ? appt.appointment_start_time.slice(0, 5) : '');
    setNewEndTime(appt.appointment_end_time ? appt.appointment_end_time.slice(0, 5) : '');
  };

  const handleReschedule = async () => {
    if (!newDate) {
      toast.error('Please select a date.');
      return;
    }
    setRescheduling(true);
    try {
      await rescheduleDoctorAppointment(rescheduleModal.id, {
        appointment_date: newDate,
        appointment_start_time: newStartTime || undefined,
        appointment_end_time: newEndTime || undefined,
      });
      toast.success('Appointment rescheduled');
      setRescheduleModal(null);
      setDetailModal(null);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reschedule');
    } finally {
      setRescheduling(false);
    }
  };

  const filteredAppointments = appointments.filter((appt) => {
    const matchesSearch = !searchQuery || appt.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) || appt.id?.toString().includes(searchQuery);

    const matchesFilter = activeFilter === 'all' || (activeFilter === 'upcoming' && (appt.status === 'confirmed' || appt.status === 'pending')) || appt.status === activeFilter;

    const matchesType = typeFilter === 'all' || appt.appointment_type === typeFilter;

    return matchesSearch && matchesFilter && matchesType;
  });

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Appointments"
        action={
          <Button onClick={() => navigate('/doctor/time-slots')}>
            <Plus size={16} />
            New Slot
          </Button>
        }
      />

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search by patient name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTER_OPTIONS.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={clsx('px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors', activeFilter === filter ? 'bg-brand-600 text-white' : 'bg-surface-subtle text-text-secondary hover:bg-surface-warm border border-slate-200')}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Type Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TYPE_FILTER_OPTIONS.map((type) => (
          <button
            key={type}
            onClick={() => setTypeFilter(type)}
            className={clsx('px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors', typeFilter === type ? 'bg-slate-800 text-white' : 'bg-surface-subtle text-text-secondary hover:bg-surface-warm border border-slate-200')}
          >
            {type === 'all' ? 'All Types' : TYPE_LABEL[type]}
          </button>
        ))}
      </div>

      {/* Table Card */}
      <Card className="overflow-hidden">
        {isLoading && (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        )}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && filteredAppointments.length === 0 && (
          <EmptyState icon={Calendar} title={searchQuery || activeFilter !== 'all' ? 'No matching appointments' : 'No appointments'} description={searchQuery || activeFilter !== 'all' ? 'Try adjusting your search or filters.' : 'Your scheduled appointments will appear here.'} />
        )}
        {!isLoading && !error && filteredAppointments.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-subtle border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-bold text-[11px] uppercase tracking-wider text-text-muted">Patient</th>
                  <th className="text-left py-3 px-4 font-bold text-[11px] uppercase tracking-wider text-text-muted">Date</th>
                  <th className="text-left py-3 px-4 font-bold text-[11px] uppercase tracking-wider text-text-muted">Time</th>
                  <th className="text-left py-3 px-4 font-bold text-[11px] uppercase tracking-wider text-text-muted">Type</th>
                  <th className="text-left py-3 px-4 font-bold text-[11px] uppercase tracking-wider text-text-muted">Status</th>
                  <th className="text-left py-3 px-4 font-bold text-[11px] uppercase tracking-wider text-text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map((appt) => {
                  const isInProgress = appt.status === 'in-progress';
                  return (
                    <tr key={appt.id} className={clsx('border-b border-slate-100 transition-colors', isInProgress ? 'bg-gradient-to-r from-brand-50 to-transparent' : 'hover:bg-surface-subtle')}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Avatar name={appt.patient_name || `Patient ${appt.patient_id}`} size={32} />
                          <span className="font-medium text-text-primary">{appt.patient_name || `Patient #${appt.patient_id}` || '—'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-text-secondary">{appt.appointment_date ? format(new Date(appt.appointment_date), 'dd MMM yyyy') : '—'}</td>
                      <td className="py-3 px-4 text-text-secondary">{appt.appointment_start_time || '—'}</td>
                      <td className="py-3 px-4">
                        <Badge variant={TYPE_VARIANT[appt.appointment_type] || 'default'}>{TYPE_LABEL[appt.appointment_type] || 'Consultation'}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={statusVariant(appt.status)}>{appt.status}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setPendingStatus(null); setDetailModal(appt); }} className="hover:border-brand-600 hover:text-brand-600">
                            View
                          </Button>
                          {/* Reschedule/status here go through generic endpoints the
                              backend now rejects for follow-up rows — those have
                              their own dedicated lifecycle on the Follow-Ups page. */}
                          {appt.appointment_type === 'follow_up' ? (
                            canReschedule(appt.status) && (
                              <Button variant="ghost" size="sm" onClick={() => navigate('/doctor/follow-ups')} className="hover:border-brand-600 hover:text-brand-600">
                                Follow-Ups
                              </Button>
                            )
                          ) : (
                            canReschedule(appt.status) && (
                              <Button variant="ghost" size="sm" onClick={() => openReschedule(appt)} className="hover:border-brand-600 hover:text-brand-600">
                                Reschedule
                              </Button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
      </Card>

      {/* Detail Modal */}
      {detailModal && (
        <Modal isOpen={!!detailModal} onClose={() => { setPendingStatus(null); setDetailModal(null); }} title={`Appointment #${detailModal.id}`}>
          <div className="space-y-4">
            <Badge variant={TYPE_VARIANT[detailModal.appointment_type] || 'default'}>{TYPE_LABEL[detailModal.appointment_type] || 'Consultation'}</Badge>
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Patient</p>
              <div className="flex items-center gap-2 text-sm text-text-primary">
                <User size={16} className="text-brand-600" />
                {detailModal.patient_name || `Patient #${detailModal.patient_id}`}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Date &amp; Time</p>
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Clock size={16} className="text-brand-600" />
                {detailModal.appointment_date ? format(new Date(detailModal.appointment_date), 'dd MMM yyyy') : '—'}
                {detailModal.appointment_start_time ? ` · ${detailModal.appointment_start_time.slice(0, 5)}` : ''}
                {detailModal.appointment_end_time ? ` – ${detailModal.appointment_end_time.slice(0, 5)}` : ''}
              </div>
            </div>
            {detailModal.notes && (
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Notes</p>
                <div className="flex items-start gap-2 text-sm text-text-secondary">
                  <FileText size={16} className="text-brand-600 mt-0.5 flex-shrink-0" />
                  <p className="whitespace-pre-wrap">{detailModal.notes}</p>
                </div>
              </div>
            )}
            {detailModal.status === 'completed' && detailModal.outcome_notes && pendingStatus !== 'completed' && (
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Outcome Notes</p>
                <div className="flex items-start gap-2 text-sm text-text-secondary">
                  <FileText size={16} className="text-brand-600 mt-0.5 flex-shrink-0" />
                  <p className="whitespace-pre-wrap">{detailModal.outcome_notes}</p>
                </div>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Status</p>
              {detailModal.appointment_type === 'follow_up' ? (
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-surface-subtle border border-slate-200">
                  <Badge variant={statusVariant(detailModal.status)}>{detailModal.status}</Badge>
                  <Button size="sm" variant="secondary" onClick={() => navigate('/doctor/follow-ups')}>
                    Manage in Follow-Ups
                  </Button>
                </div>
              ) : (
                <Badge variant={statusVariant(pendingStatus ?? detailModal.status)}>{pendingStatus ?? detailModal.status}</Badge>
              )}
            </div>

            {/* Consultation-outcome capture — rendered inline inside this
                same Modal, never as a nested one: Modal.jsx locks/unlocks
                page scroll on mount/unmount, so closing an inner modal
                would incorrectly unlock scroll while this outer one stays open. */}
            {pendingStatus === 'completed' && (
              <div className="space-y-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-xs font-medium text-blue-900">Record the outcome of this consultation.</p>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">Outcome Notes (optional)</label>
                  <textarea
                    rows={3}
                    value={outcomeNotes}
                    onChange={(e) => setOutcomeNotes(e.target.value)}
                    className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
                    placeholder="e.g. Patient responded well to treatment, advised rest for 3 days…"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-text-primary">
                  <input type="checkbox" checked={scheduleFollowUp} onChange={(e) => setScheduleFollowUp(e.target.checked)} />
                  Schedule a follow-up for this patient
                </label>
                {scheduleFollowUp && (
                  <div className="space-y-2 pl-6">
                    <Input label="Follow-Up Date" type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1.5">Follow-Up Notes (optional)</label>
                      <textarea
                        rows={2}
                        value={followUpNotes}
                        onChange={(e) => setFollowUpNotes(e.target.value)}
                        className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
                      />
                    </div>
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="secondary" onClick={() => setPendingStatus(null)} disabled={savingOutcome}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={() => handleCompleteWithOutcome(detailModal)} isLoading={savingOutcome}>
                    Save
                  </Button>
                </div>
              </div>
            )}

            {/* Button row instead of a raw status dropdown, matching the
                Follow-Ups detail modal's layout. Appointments have one extra
                state follow-ups don't (confirmed), so pending gets a Confirm
                step first; confirmed is what actually offers Mark Completed. */}
            {canReschedule(detailModal.status) && pendingStatus !== 'completed' && detailModal.appointment_type !== 'follow_up' && (
              <div className="flex gap-2 pt-2">
                {detailModal.status === 'pending' && (
                  <Button isLoading={updating === detailModal.id} onClick={() => handleStatusChange(detailModal.id, 'confirmed')} className="flex-1">
                    <CheckCircle size={16} className="mr-2" /> Confirm
                  </Button>
                )}
                {detailModal.status === 'confirmed' && (
                  <Button onClick={() => handleStatusSelect(detailModal.id, 'completed', detailModal.appointment_type)} className="flex-1">
                    <CheckCircle size={16} className="mr-2" /> Mark Completed
                  </Button>
                )}
                <Button variant="secondary" onClick={() => { const appt = detailModal; setDetailModal(null); openReschedule(appt); }} className="flex-1">
                  <Clock size={16} className="mr-2" /> Reschedule
                </Button>
                <Button variant="secondary" isLoading={updating === detailModal.id} onClick={() => handleStatusChange(detailModal.id, 'cancelled')} className="flex-1 text-red-600 hover:bg-red-50">
                  <X size={16} className="mr-2" /> Cancel
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Reschedule Modal */}
      {rescheduleModal && (
        <Modal
          isOpen={!!rescheduleModal}
          onClose={() => setRescheduleModal(null)}
          title="Reschedule Appointment"
          footer={
            <>
              <Button variant="secondary" onClick={() => setRescheduleModal(null)}>Cancel</Button>
              <Button onClick={handleReschedule} isLoading={rescheduling}>Reschedule</Button>
            </>
          }
        >
          <div className="space-y-3">
            <p className="text-sm text-text-secondary">
              {rescheduleModal.patient_name || `Patient #${rescheduleModal.patient_id}`} • Current: {rescheduleModal.appointment_date ? format(new Date(rescheduleModal.appointment_date), 'dd MMM yyyy') : '—'}
              {rescheduleModal.appointment_start_time ? ` at ${rescheduleModal.appointment_start_time.slice(0, 5)}` : ''}
            </p>
            <Input label="New Date" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Start Time" type="time" value={newStartTime} onChange={(e) => setNewStartTime(e.target.value)} />
              <Input label="End Time" type="time" value={newEndTime} onChange={(e) => setNewEndTime(e.target.value)} />
            </div>
            <p className="text-xs text-text-muted">Leave time blank to keep the current time. You can reschedule to any time — it just can't clash with another one of your appointments.</p>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Appointments;
