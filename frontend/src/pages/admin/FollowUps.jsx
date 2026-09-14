import { useState, useEffect } from 'react';
import {
  getAdminFollowUps,
  createFollowUp,
  assignFollowUp,
  rescheduleFollowUp,
  cancelFollowUp,
  processReminders,
  processMissed,
} from '@/api/followUps';
import { getAllDoctors, getAllPatientsForPicker, getAdminAvailableTimeSlots } from '@/api/admin';
import usePaginatedFetch from '@/hooks/usePaginatedFetch';
import Card from '@/components/ui/Card';
import Badge, { statusVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import SearchableSelect from '@/components/ui/SearchableSelect';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import { CalendarCheck, Plus, RefreshCw, Clock, X, Bell, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const STATUS_FILTERS = ['all', 'pending', 'completed', 'cancelled', 'missed'];

const canAct = (status) => status !== 'completed' && status !== 'cancelled';

const statusBorderColor = (status) => {
  if (status === 'pending') return 'border-l-amber-500';
  if (status === 'completed') return 'border-l-blue-500';
  if (status === 'cancelled') return 'border-l-red-500';
  if (status === 'missed') return 'border-l-red-500';
  return 'border-l-slate-300';
};

const emptyCreateForm = { patient_id: '', doctor_id: '', scheduled_date: '', appointment_start_time: '', appointment_end_time: '', notes: '' };

const AdminFollowUps = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [patientFilter, setPatientFilter] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('');

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
  } = usePaginatedFetch(getAdminFollowUps, {
    status: statusFilter !== 'all' ? statusFilter : undefined,
    patient_id: patientFilter || undefined,
    doctor_id: doctorFilter || undefined,
  }, 15);

  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  useEffect(() => {
    getAllDoctors().then(({ data: d }) => setDoctors(Array.isArray(d) ? d : d?.data || [])).catch(() => {});
    getAllPatientsForPicker().then(({ data: d }) => setPatients(Array.isArray(d) ? d : d?.data || [])).catch(() => {});
  }, []);
  const doctorOptions = doctors.map((d) => ({ value: d.id, label: d.doctor_name || `Dr. #${d.id}` }));
  const patientOptions = patients.map((p) => ({ value: p.id, label: p.full_name || `Patient #${p.id}` }));

  const [processing, setProcessing] = useState(null);
  const [acting, setActing] = useState(null);

  const handleProcessReminders = async () => {
    setProcessing('reminders');
    try {
      const { data: res } = await processReminders();
      toast.success(`${res.count} reminder${res.count !== 1 ? 's' : ''} sent`);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setProcessing(null);
    }
  };

  const handleProcessMissed = async () => {
    setProcessing('missed');
    try {
      const { data: res } = await processMissed();
      toast.success(`${res.count} follow-up${res.count !== 1 ? 's' : ''} marked as missed`);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setProcessing(null);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this follow-up?')) return;
    setActing(id + '-cancel');
    try {
      await cancelFollowUp(id);
      toast.success('Follow-up cancelled');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel');
    } finally {
      setActing(null);
    }
  };

  // ── Create modal ──────────────────────────────────────────────────────
  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [creating, setCreating] = useState(false);
  const createTimesIncomplete = (!!createForm.appointment_start_time) !== (!!createForm.appointment_end_time);

  const openCreate = () => {
    setCreateForm(emptyCreateForm);
    setCreateModal(true);
  };

  const handleCreate = async () => {
    if (!createForm.patient_id || !createForm.scheduled_date) {
      toast.error('Patient and date are required.');
      return;
    }
    if (createTimesIncomplete) {
      toast.error('Provide both a start and end time, or leave both blank.');
      return;
    }
    setCreating(true);
    try {
      await createFollowUp({
        patient_id: Number(createForm.patient_id),
        doctor_id: createForm.doctor_id ? Number(createForm.doctor_id) : undefined,
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

  // ── Assign modal ──────────────────────────────────────────────────────
  const [assignModal, setAssignModal] = useState(null);
  const [assignDoctorId, setAssignDoctorId] = useState('');
  const [assignStart, setAssignStart] = useState('');
  const [assignEnd, setAssignEnd] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignConflict, setAssignConflict] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState('');

  const openAssign = (fu) => {
    setAssignModal(fu);
    setAssignDoctorId(fu.doctor_id || '');
    setAssignConflict(false);
    setAssignStart(fu.appointment_start_time ? fu.appointment_start_time.slice(0, 5) : '');
    setAssignEnd(fu.appointment_end_time ? fu.appointment_end_time.slice(0, 5) : '');
  };

  const handleAssign = async () => {
    if (!assignDoctorId) {
      toast.error('Please select a doctor');
      return;
    }
    setAssigning(true);
    try {
      await assignFollowUp(assignModal.id, {
        doctor_id: Number(assignDoctorId),
        appointment_start_time: assignStart || undefined,
        appointment_end_time: assignEnd || undefined,
      });
      toast.success('Doctor assigned');
      setAssignModal(null);
      refetch();
    } catch (err) {
      if (err.response?.data?.needsReschedule) {
        setAssignConflict(true);
        toast.error('That doctor is not available at the current time — pick a new time below.');
      } else {
        // Every other 400 here (already completed/cancelled, doctor not
        // found, missing doctor_id) is unrelated to availability — show it
        // plainly rather than opening the slot picker for a dead end.
        toast.error(err.response?.data?.error || 'Failed to assign doctor');
      }
    } finally {
      setAssigning(false);
    }
  };

  // Once a conflict is flagged, show the doctor's real available slots for
  // the follow-up's date instead of leaving the admin to guess and retry.
  useEffect(() => {
    if (!assignConflict || !assignDoctorId || !assignModal?.scheduled_date) {
      setAvailableSlots([]);
      setSlotsError('');
      return;
    }
    const dateOnly = assignModal.scheduled_date.split('T')[0];
    setLoadingSlots(true);
    setSlotsError('');
    getAdminAvailableTimeSlots(assignDoctorId, dateOnly)
      .then(({ data }) => setAvailableSlots(data?.available_slots || []))
      .catch((err) => {
        setAvailableSlots([]);
        setSlotsError(err.response?.data?.error || 'No time slots configured for this doctor on this day.');
      })
      .finally(() => setLoadingSlots(false));
  }, [assignConflict, assignDoctorId, assignModal]);

  // ── Reschedule modal ──────────────────────────────────────────────────
  const [rescheduleModal, setRescheduleModal] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [rescheduling, setRescheduling] = useState(false);

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
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reschedule');
    } finally {
      setRescheduling(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Follow-Up Management"
        action={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" isLoading={processing === 'reminders'} onClick={handleProcessReminders} disabled={processing !== null}>
              <Bell size={14} className="mr-1" /> Send Reminders
            </Button>
            <Button size="sm" variant="outline" isLoading={processing === 'missed'} onClick={handleProcessMissed} disabled={processing !== null}>
              <AlertCircle size={14} className="mr-1" /> Process Missed
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus size={14} className="mr-1" /> Create Follow-Up
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <Card className="!p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <p className="text-xs font-semibold text-text-secondary mb-1.5">Status</p>
            <div className="flex flex-wrap gap-2">
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
          </div>
          <SearchableSelect label="Patient" options={patientOptions} value={patientFilter} onChange={setPatientFilter} placeholder="All patients" emptyText="No patients found" />
          <SearchableSelect label="Doctor" options={doctorOptions} value={doctorFilter} onChange={setDoctorFilter} placeholder="All doctors" emptyText="No doctors found" />
        </div>
      </Card>

      <Card>
        {isLoading && (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        )}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && followUps.length === 0 && (
          <EmptyState
            icon={CalendarCheck}
            title="No follow-ups found"
            description="Adjust the filters above, or create one for a patient."
          />
        )}
        {!isLoading && !error && followUps.length > 0 && (
          <div className="space-y-3">
            {followUps.map((fu) => (
              <div key={fu.id} className={`p-4 rounded-xl border-l-[5px] ${statusBorderColor(fu.status)} bg-surface-subtle hover:bg-surface-warm transition-colors`}>
                <div className="flex items-start gap-4">
                  <Avatar name={fu.patient_name || `Patient ${fu.patient_id}`} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{fu.patient_name || `Patient #${fu.patient_id}`}</p>
                        <p className="text-xs text-text-muted">with {fu.doctor_name || 'Unassigned'}</p>
                      </div>
                      <Badge variant={statusVariant(fu.status)}>{fu.status}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-muted mt-2">
                      <span>{fu.scheduled_date ? format(new Date(fu.scheduled_date), 'dd MMM yyyy') : '—'}</span>
                      <span>•</span>
                      <span>{fu.appointment_start_time ? fu.appointment_start_time.slice(0, 5) : '—'}</span>
                      {fu.notes && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[200px]">{fu.notes}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {canAct(fu.status) && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => openAssign(fu)} title={fu.doctor_name ? 'Reassign doctor' : 'Assign doctor'}>
                        <RefreshCw size={14} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openReschedule(fu)} title="Reschedule">
                        <Clock size={14} />
                      </Button>
                      <Button variant="ghost" size="sm" isLoading={acting === fu.id + '-cancel'} onClick={() => handleCancel(fu.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50" title="Cancel">
                        <X size={14} />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
      </Card>

      {/* Create modal */}
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
          <SearchableSelect
            label="Doctor (optional — leave blank to create unassigned)"
            options={doctorOptions}
            value={createForm.doctor_id}
            onChange={(v) => setCreateForm((f) => ({ ...f, doctor_id: v }))}
            placeholder="Search doctors by name…"
            emptyText="No doctors found"
          />
          <Input label="Scheduled Date" type="date" value={createForm.scheduled_date} onChange={(e) => setCreateForm((f) => ({ ...f, scheduled_date: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Time (optional)" type="time" value={createForm.appointment_start_time} onChange={(e) => setCreateForm((f) => ({ ...f, appointment_start_time: e.target.value }))} />
            <Input label="End Time (optional)" type="time" value={createForm.appointment_end_time} onChange={(e) => setCreateForm((f) => ({ ...f, appointment_end_time: e.target.value }))} />
          </div>
          {createTimesIncomplete && (
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

      {/* Assign modal */}
      <Modal
        isOpen={!!assignModal}
        onClose={() => setAssignModal(null)}
        title={assignModal?.doctor_name ? 'Reassign Doctor' : 'Assign Doctor'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssignModal(null)}>Cancel</Button>
            <Button onClick={handleAssign} isLoading={assigning}>{assignModal?.doctor_name ? 'Reassign' : 'Assign'}</Button>
          </>
        }
      >
        {assignModal?.doctor_name && <p className="text-sm text-text-secondary mb-3">Currently: {assignModal.doctor_name}</p>}
        <SearchableSelect
          label="Doctor"
          options={doctorOptions}
          value={assignDoctorId}
          onChange={(v) => { setAssignDoctorId(v); setAssignConflict(false); }}
          placeholder="Search doctors by name…"
          emptyText="No doctors found"
        />
        {assignConflict && (
          <div className="mt-4 space-y-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-xs font-medium text-amber-800">This doctor isn't available at the current time. Choose an open slot below, or set a custom time.</p>
            <div>
              <p className="text-xs font-semibold text-text-secondary mb-1.5">Open slots on {assignModal?.scheduled_date ? format(new Date(assignModal.scheduled_date), 'dd MMM yyyy') : 'this date'}</p>
              {loadingSlots && (
                <div className="flex justify-center py-2">
                  <Spinner size="sm" />
                </div>
              )}
              {!loadingSlots && slotsError && <p className="text-xs text-text-muted">{slotsError}</p>}
              {!loadingSlots && !slotsError && availableSlots.length === 0 && (
                <p className="text-xs text-text-muted">No open slots for this date.</p>
              )}
              {!loadingSlots && !slotsError && availableSlots.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {availableSlots.map((slot) => {
                    const start = slot.start_time.slice(0, 5);
                    const end = slot.end_time.slice(0, 5);
                    const isSelected = assignStart === start && assignEnd === end;
                    return (
                      <button
                        key={`${start}-${end}`}
                        type="button"
                        onClick={() => { setAssignStart(start); setAssignEnd(end); }}
                        className={clsx(
                          'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                          isSelected ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-text-secondary border-slate-200 hover:border-brand-400'
                        )}
                      >
                        {start}–{end}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Start Time" type="time" value={assignStart} onChange={(e) => setAssignStart(e.target.value)} />
              <Input label="End Time" type="time" value={assignEnd} onChange={(e) => setAssignEnd(e.target.value)} />
            </div>
          </div>
        )}
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

export default AdminFollowUps;
