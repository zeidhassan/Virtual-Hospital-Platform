import { useState, useEffect } from 'react';
import { getDoctorFollowUps, createFollowUp, completeFollowUp, cancelFollowUp, rescheduleFollowUp } from '@/api/followUps';
import { getDoctorPatients } from '@/api/doctor';
import usePaginatedFetch from '@/hooks/usePaginatedFetch';
import Card from '@/components/ui/Card';
import Badge, { statusVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import SearchableSelect from '@/components/ui/SearchableSelect';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';
import Avatar from '@/components/ui/Avatar';
import { Calendar, Plus, Clock, User, FileText, CheckCircle, X } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const STATUS_FILTERS = ['all', 'pending', 'completed', 'cancelled', 'missed'];

const canAct = (status) => status !== 'completed' && status !== 'cancelled';

const emptyCreateForm = { patient_id: '', scheduled_date: '', appointment_start_time: '', appointment_end_time: '', notes: '' };

// Table-based layout matching doctor/Appointments.jsx (View + Reschedule row
// actions, a detail Modal for everything else) rather than the old card-list
// — this page is a single-type view of the same underlying data, so it
// should look like the appointments table, not like a different feature.
const DoctorFollowUps = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const {
    data: followUps,
    isLoading,
    error,
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    setPage,
    refetch,
  } = usePaginatedFetch(getDoctorFollowUps, {
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  const [patients, setPatients] = useState([]);
  useEffect(() => {
    getDoctorPatients({ limit: 500 }).then((res) => setPatients(res.data?.data || [])).catch(() => {});
  }, []);
  const patientOptions = patients.map((p) => ({ value: p.id, label: p.full_name || `Patient #${p.id}` }));

  const [detailModal, setDetailModal] = useState(null);
  const [acting, setActing] = useState(null);

  // Completion is its own step (not a status dropdown, since follow-ups have
  // dedicated complete/cancel endpoints rather than a generic status PUT) —
  // pendingComplete gates an inline outcome-notes form the same way
  // Appointments.jsx gates its own outcome capture.
  const [pendingComplete, setPendingComplete] = useState(false);
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [savingComplete, setSavingComplete] = useState(false);

  // Create modal
  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [creating, setCreating] = useState(false);

  // Reschedule modal
  const [rescheduleModal, setRescheduleModal] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [rescheduling, setRescheduling] = useState(false);

  const openCreate = () => {
    setCreateForm(emptyCreateForm);
    setCreateModal(true);
  };

  // Both-or-neither: half-filled times skip both the app-level availability
  // check and the DB exclusion constraint, so a lone time would be silently
  // unprotected against a double-booking.
  const timesIncomplete = (!!createForm.appointment_start_time) !== (!!createForm.appointment_end_time);

  const handleCreate = async () => {
    if (!createForm.patient_id || !createForm.scheduled_date) {
      toast.error('Patient and date are required.');
      return;
    }
    if (timesIncomplete) {
      toast.error('Provide both a start and end time, or leave both blank.');
      return;
    }
    setCreating(true);
    try {
      await createFollowUp({
        patient_id: Number(createForm.patient_id),
        scheduled_date: createForm.scheduled_date,
        appointment_start_time: createForm.appointment_start_time || undefined,
        appointment_end_time: createForm.appointment_end_time || undefined,
        notes: createForm.notes || undefined,
      });
      toast.success('Follow-up created');
      setCreateModal(false);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create follow-up');
    } finally {
      setCreating(false);
    }
  };

  const openDetail = (fu) => {
    setPendingComplete(false);
    setDetailModal(fu);
  };

  const handleCompleteWithOutcome = async (fu) => {
    setSavingComplete(true);
    try {
      const res = await completeFollowUp(fu.id, { outcome_notes: outcomeNotes.trim() || undefined });
      toast.success('Marked as completed');
      setPendingComplete(false);
      setDetailModal((m) => (m && m.id === fu.id ? res.data : m));
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update');
    } finally {
      setSavingComplete(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this follow-up?')) return;
    setActing(id + '-cancel');
    try {
      await cancelFollowUp(id);
      toast.success('Follow-up cancelled');
      setDetailModal(null);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel');
    } finally {
      setActing(null);
    }
  };

  const openReschedule = (fu) => {
    setRescheduleModal(fu);
    setNewDate(fu.scheduled_date ? fu.scheduled_date.split('T')[0] : '');
    setNewStartTime(fu.appointment_start_time ? fu.appointment_start_time.slice(0, 5) : '');
    setNewEndTime(fu.appointment_end_time ? fu.appointment_end_time.slice(0, 5) : '');
  };

  const handleReschedule = async () => {
    if (!newDate) {
      toast.error('Please select a date.');
      return;
    }
    if ((!!newStartTime) !== (!!newEndTime)) {
      toast.error('Provide both a start and end time, or leave both blank.');
      return;
    }
    setRescheduling(true);
    try {
      await rescheduleFollowUp(rescheduleModal.id, {
        scheduled_date: newDate,
        appointment_start_time: newStartTime || undefined,
        appointment_end_time: newEndTime || undefined,
      });
      toast.success('Follow-up rescheduled');
      setRescheduleModal(null);
      setDetailModal(null);
      refetch();
    } catch (err) {
      // A doctor who created an off-slot follow-up can legitimately fail to
      // reschedule it under the stricter rule reschedule always applies —
      // show the backend's exact message rather than a generic one.
      toast.error(err.response?.data?.error || 'Failed to reschedule');
    } finally {
      setRescheduling(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Follow-Ups"
        action={
          <Button onClick={openCreate}>
            <Plus size={16} />
            Create Follow-Up
          </Button>
        }
      />

      {/* Filter Pills — status only; this page is already scoped to
          appointment_type=follow_up, so no type filter is needed. */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            className={clsx(
              'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors capitalize',
              statusFilter === filter ? 'bg-brand-600 text-white' : 'bg-surface-subtle text-text-secondary hover:bg-surface-warm border border-slate-200'
            )}
          >
            {filter}
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
        {!isLoading && !error && followUps.length === 0 && (
          <EmptyState icon={Calendar} title={statusFilter !== 'all' ? 'No matching follow-ups' : 'No follow-ups assigned'} description={statusFilter !== 'all' ? 'Try a different filter.' : 'Follow-ups you create for patients will appear here.'} />
        )}
        {!isLoading && !error && followUps.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-subtle border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-bold text-[11px] uppercase tracking-wider text-text-muted">Patient</th>
                  <th className="text-left py-3 px-4 font-bold text-[11px] uppercase tracking-wider text-text-muted">Date</th>
                  <th className="text-left py-3 px-4 font-bold text-[11px] uppercase tracking-wider text-text-muted">Time</th>
                  <th className="text-left py-3 px-4 font-bold text-[11px] uppercase tracking-wider text-text-muted">Status</th>
                  <th className="text-left py-3 px-4 font-bold text-[11px] uppercase tracking-wider text-text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {followUps.map((fu) => (
                  <tr key={fu.id} className="border-b border-slate-100 transition-colors hover:bg-surface-subtle">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Avatar name={fu.patient_name || `Patient ${fu.patient_id}`} size={32} />
                        <span className="font-medium text-text-primary">{fu.patient_name || `Patient #${fu.patient_id}`}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-text-secondary">{fu.scheduled_date ? format(new Date(fu.scheduled_date), 'dd MMM yyyy') : '—'}</td>
                    <td className="py-3 px-4 text-text-secondary">{fu.appointment_start_time ? fu.appointment_start_time.slice(0, 5) : '—'}</td>
                    <td className="py-3 px-4">
                      <Badge variant={statusVariant(fu.status)}>{fu.status}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openDetail(fu)} className="hover:border-brand-600 hover:text-brand-600">
                          View
                        </Button>
                        {canAct(fu.status) && (
                          <Button variant="ghost" size="sm" onClick={() => openReschedule(fu)} className="hover:border-brand-600 hover:text-brand-600">
                            Reschedule
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
      </Card>

      {/* Detail Modal */}
      {detailModal && (
        <Modal isOpen={!!detailModal} onClose={() => { setPendingComplete(false); setDetailModal(null); }} title={`Follow-Up #${detailModal.id}`}>
          <div className="space-y-4">
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
                {detailModal.scheduled_date ? format(new Date(detailModal.scheduled_date), 'dd MMM yyyy') : '—'}
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
            {detailModal.status === 'completed' && detailModal.outcome_notes && !pendingComplete && (
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
              <Badge variant={statusVariant(detailModal.status)}>{detailModal.status}</Badge>
            </div>

            {/* Outcome capture — rendered inline inside this same Modal, never
                as a nested one, matching Appointments.jsx's pattern (see the
                note there on Modal.jsx's scroll-lock). */}
            {pendingComplete && (
              <div className="space-y-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-xs font-medium text-blue-900">Record the outcome of this follow-up.</p>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">Outcome Notes (optional)</label>
                  <textarea
                    rows={3}
                    value={outcomeNotes}
                    onChange={(e) => setOutcomeNotes(e.target.value)}
                    className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
                    placeholder="e.g. Patient's condition has stabilized, no further follow-up needed…"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="secondary" onClick={() => setPendingComplete(false)} disabled={savingComplete}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={() => handleCompleteWithOutcome(detailModal)} isLoading={savingComplete}>
                    Save
                  </Button>
                </div>
              </div>
            )}

            {canAct(detailModal.status) && !pendingComplete && (
              <div className="flex gap-2 pt-2">
                <Button onClick={() => { setOutcomeNotes(''); setPendingComplete(true); }} className="flex-1">
                  <CheckCircle size={16} className="mr-2" /> Mark Completed
                </Button>
                <Button variant="secondary" onClick={() => { const fu = detailModal; setDetailModal(null); openReschedule(fu); }} className="flex-1">
                  <Clock size={16} className="mr-2" /> Reschedule
                </Button>
                <Button variant="secondary" isLoading={acting === detailModal.id + '-cancel'} onClick={() => handleCancel(detailModal.id)} className="flex-1 text-red-600 hover:bg-red-50">
                  <X size={16} className="mr-2" /> Cancel
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Create Follow-Up modal — no doctor picker: the server derives the
          assigned doctor from the JWT and ignores any doctor_id sent. */}
      <Modal
        isOpen={createModal}
        onClose={() => setCreateModal(false)}
        title="Create Follow-Up"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreate} isLoading={creating}>Create</Button>
          </>
        }
      >
        <div className="space-y-3">
          <SearchableSelect
            label="Patient"
            options={patientOptions}
            value={createForm.patient_id}
            onChange={(v) => setCreateForm((f) => ({ ...f, patient_id: v }))}
            placeholder="Search patients by name…"
            emptyText="No patients found"
          />
          <Input label="Scheduled Date" type="date" value={createForm.scheduled_date} onChange={(e) => setCreateForm((f) => ({ ...f, scheduled_date: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Time (optional)" type="time" value={createForm.appointment_start_time} onChange={(e) => setCreateForm((f) => ({ ...f, appointment_start_time: e.target.value }))} />
            <Input label="End Time (optional)" type="time" value={createForm.appointment_end_time} onChange={(e) => setCreateForm((f) => ({ ...f, appointment_end_time: e.target.value }))} />
          </div>
          {timesIncomplete && (
            <p className="text-xs text-amber-700">Provide both a start and end time, or leave both blank for a date-only follow-up.</p>
          )}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Notes (optional)</label>
            <textarea
              rows={3}
              value={createForm.notes}
              onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>
        </div>
      </Modal>

      {/* Reschedule modal */}
      <Modal
        isOpen={!!rescheduleModal}
        onClose={() => setRescheduleModal(null)}
        title="Reschedule Follow-Up"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRescheduleModal(null)}>Cancel</Button>
            <Button onClick={handleReschedule} isLoading={rescheduling}>Reschedule</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            {rescheduleModal?.patient_name || `Patient #${rescheduleModal?.patient_id}`} • Current: {rescheduleModal?.scheduled_date ? format(new Date(rescheduleModal.scheduled_date), 'dd MMM yyyy') : '—'}
          </p>
          <Input label="New Date" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Time" type="time" value={newStartTime} onChange={(e) => setNewStartTime(e.target.value)} />
            <Input label="End Time" type="time" value={newEndTime} onChange={(e) => setNewEndTime(e.target.value)} />
          </div>
          <p className="text-xs text-text-muted">Leave both times blank to keep this a date-only follow-up.</p>
        </div>
      </Modal>
    </div>
  );
};

export default DoctorFollowUps;
