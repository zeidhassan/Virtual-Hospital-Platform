import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminAppointments, updateAdminAppointment, deleteAdminAppointment, reassignAdminAppointment, getAllDoctors, sendAdminAppointmentReminder, getAdminAvailableTimeSlots } from '@/api/admin';
import usePaginatedFetch from '@/hooks/usePaginatedFetch';
import Card from '@/components/ui/Card';
import Badge, { statusVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import { CalendarCheck, Trash2, RefreshCw, Edit2, Search, BellRing, ArrowUpRight } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const APPT_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'missed'];
const STATUS_FILTERS = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];
const TYPE_FILTERS = ['all', 'consultation', 'follow_up', 'triage_escalation'];
const TYPE_LABEL = { consultation: 'Consultation', follow_up: 'Follow-up', triage_escalation: 'Escalated' };
const TYPE_VARIANT = { consultation: 'default', follow_up: 'brand', triage_escalation: 'warning' };

const AdminAppointments = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const {
    data: appointments,
    isLoading,
    error,
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    setPage,
    refetch,
  } = usePaginatedFetch(getAdminAppointments, {
    status: statusFilter !== 'all' ? statusFilter : undefined,
    appointment_type: typeFilter !== 'all' ? typeFilter : undefined,
  });

  // Doctors list for modals
  const [doctors, setDoctors] = useState([]);
  useEffect(() => {
    getAllDoctors()
      .then(({ data: d }) => setDoctors(Array.isArray(d) ? d : d?.data || []))
      .catch(() => {});
  }, []);

  const [deleting, setDeleting] = useState(null);

  // Edit modal (status + reschedule)
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);

  // Reassign modal
  const [reassignModal, setReassignModal] = useState(null);
  const [newDoctorId, setNewDoctorId] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [reassignConflict, setReassignConflict] = useState(false);
  const [reassignDate, setReassignDate] = useState('');
  const [reassignStart, setReassignStart] = useState('');
  const [reassignEnd, setReassignEnd] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState('');

  const [reminding, setReminding] = useState(null);

  const handleSendReminder = async (id) => {
    setReminding(id);
    try {
      await sendAdminAppointmentReminder(id);
      toast.success('Reminder sent to patient');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send reminder');
    } finally {
      setReminding(null);
    }
  };

  const canAct = (status) => status !== 'completed' && status !== 'cancelled';

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this appointment? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await deleteAdminAppointment(id);
      toast.success('Appointment deleted');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  const openEdit = (appt) => {
    setEditModal(appt);
    setEditForm({
      status: appt.status || '',
      appointment_date: appt.appointment_date ? appt.appointment_date.split('T')[0] : '',
      appointment_start_time: appt.appointment_start_time || '',
      appointment_end_time: appt.appointment_end_time || '',
    });
  };

  const handleEditSave = async () => {
    setEditSaving(true);
    try {
      const payload = {};
      if (editForm.status) payload.status = editForm.status;
      if (editForm.appointment_date) payload.appointment_date = editForm.appointment_date;
      if (editForm.appointment_start_time) payload.appointment_start_time = editForm.appointment_start_time;
      if (editForm.appointment_end_time) payload.appointment_end_time = editForm.appointment_end_time;
      await updateAdminAppointment(editModal.id, payload);
      toast.success('Appointment updated');
      setEditModal(null);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update');
    } finally {
      setEditSaving(false);
    }
  };

  const openReassign = (appt) => {
    setReassignModal(appt);
    setNewDoctorId('');
    setReassignConflict(false);
    setReassignDate(appt.appointment_date ? appt.appointment_date.split('T')[0] : '');
    setReassignStart(appt.appointment_start_time ? appt.appointment_start_time.slice(0, 5) : '');
    setReassignEnd(appt.appointment_end_time ? appt.appointment_end_time.slice(0, 5) : '');
  };

  const handleReassign = async () => {
    if (!newDoctorId) {
      toast.error('Please select a doctor');
      return;
    }
    setReassigning(true);
    try {
      const payload = { doctor_id: newDoctorId };
      if (reassignConflict) {
        payload.appointment_date = reassignDate;
        payload.appointment_start_time = reassignStart;
        payload.appointment_end_time = reassignEnd;
      }
      await reassignAdminAppointment(reassignModal.id, payload);
      toast.success(reassignConflict ? 'Appointment reassigned and rescheduled' : 'Appointment reassigned');
      setReassignModal(null);
      refetch();
    } catch (err) {
      if (err.response?.data?.needsReschedule) {
        setReassignConflict(true);
        toast.error('That doctor is not available at the current time — pick a new time below.');
      } else {
        toast.error(err.response?.data?.error || 'Failed to reassign');
      }
    } finally {
      setReassigning(false);
    }
  };

  // Once a conflict is flagged, show the doctor's actual open slots for the
  // chosen date instead of leaving the admin to guess a time and retry.
  useEffect(() => {
    if (!reassignConflict || !newDoctorId || !reassignDate) {
      setAvailableSlots([]);
      setSlotsError('');
      return;
    }
    setLoadingSlots(true);
    setSlotsError('');
    getAdminAvailableTimeSlots(newDoctorId, reassignDate)
      .then(({ data }) => setAvailableSlots(data?.available_slots || []))
      .catch((err) => {
        setAvailableSlots([]);
        setSlotsError(err.response?.data?.error || 'No time slots configured for this doctor on this day.');
      })
      .finally(() => setLoadingSlots(false));
  }, [reassignConflict, newDoctorId, reassignDate]);

  // Status and type are applied server-side (see usePaginatedFetch above);
  // the free-text search only has a name to match against, not a paginate()
  // filter column both fields share, so it's applied over the current page.
  const filteredAppointments = appointments.filter((appt) => {
    return !searchQuery || appt.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) || appt.doctor_name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const statusBorderColor = (status) => {
    if (status === 'confirmed') return 'border-l-green-500';
    if (status === 'pending') return 'border-l-amber-500';
    if (status === 'completed') return 'border-l-blue-500';
    if (status === 'cancelled') return 'border-l-red-500';
    return 'border-l-slate-300';
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Appointments Management" />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search by patient or doctor name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={clsx('px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors capitalize', statusFilter === filter ? 'bg-brand-600 text-white' : 'bg-surface-subtle text-text-secondary hover:bg-surface-warm border border-slate-200')}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Type Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TYPE_FILTERS.map((type) => (
          <button
            key={type}
            onClick={() => setTypeFilter(type)}
            className={clsx('px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors', typeFilter === type ? 'bg-slate-800 text-white' : 'bg-surface-subtle text-text-secondary hover:bg-surface-warm border border-slate-200')}
          >
            {type === 'all' ? 'All Types' : TYPE_LABEL[type]}
          </button>
        ))}
      </div>

      <Card>
        {isLoading && (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        )}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && filteredAppointments.length === 0 && (
          <EmptyState icon={CalendarCheck} title={searchQuery || statusFilter !== 'all' ? 'No matching appointments' : 'No appointments'} description={searchQuery || statusFilter !== 'all' ? 'Try adjusting your search or filters.' : 'Appointments will appear here.'} />
        )}
        {!isLoading && !error && filteredAppointments.length > 0 && (
          <div className="space-y-3">
            {filteredAppointments.map((appt) => (
              <div key={appt.id} className={`p-4 rounded-xl border-l-[5px] ${statusBorderColor(appt.status)} bg-surface-subtle hover:bg-surface-warm transition-colors`}>
                <div className="flex items-start gap-4">
                  <Avatar name={appt.patient_name || `Patient ${appt.patient_id}`} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{appt.patient_name || `Patient #${appt.patient_id}`}</p>
                        <p className="text-xs text-text-muted">with {appt.doctor_name || 'Unassigned'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={TYPE_VARIANT[appt.appointment_type] || 'default'}>{TYPE_LABEL[appt.appointment_type] || 'Consultation'}</Badge>
                        <Badge variant={statusVariant(appt.status)}>{appt.status}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-muted mt-2">
                      <span>{appt.appointment_date ? format(new Date(appt.appointment_date), 'dd MMM yyyy') : '—'}</span>
                      <span>•</span>
                      <span>{appt.appointment_start_time || '—'}</span>
                      {appt.notes && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[200px]">{appt.notes}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {canAct(appt.status) && (
                      <Button variant="ghost" size="sm" onClick={() => handleSendReminder(appt.id)} disabled={reminding === appt.id} title="Send reminder to patient">
                        <BellRing size={14} />
                      </Button>
                    )}
                    {/* Edit/Reassign act through generic endpoints the backend now
                        rejects for follow-up rows (they have their own dedicated
                        lifecycle with different side effects — see Follow-Ups
                        page) — show a redirect instead of a button that 400s. */}
                    {appt.appointment_type === 'follow_up' ? (
                      canAct(appt.status) && (
                        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/follow-ups')} className="text-brand-600 hover:bg-brand-50" title="Manage this follow-up from the Follow-Ups page">
                          <ArrowUpRight size={14} className="mr-1" /> Follow-Ups
                        </Button>
                      )
                    ) : (
                      <>
                        {canAct(appt.status) && (
                          <Button variant="ghost" size="sm" onClick={() => openEdit(appt)} title="Reschedule / update status">
                            <Edit2 size={14} />
                          </Button>
                        )}
                        {canAct(appt.status) && (
                          <Button variant="ghost" size="sm" onClick={() => openReassign(appt)} title={appt.doctor_name ? 'Reassign' : 'Assign'}>
                            <RefreshCw size={14} />
                          </Button>
                        )}
                      </>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(appt.id)} disabled={deleting === appt.id} className="text-red-600 hover:text-red-700 hover:bg-red-50" title="Delete">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {!searchQuery && <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />}
      </Card>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editModal}
        onClose={() => setEditModal(null)}
        title="Update Status / Reschedule"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditModal(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} isLoading={editSaving}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select label="Status" value={editForm.status || ''} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
            {APPT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Input label="Date" type="date" value={editForm.appointment_date || ''} onChange={(e) => setEditForm({ ...editForm, appointment_date: e.target.value })} />
          <Input label="Start Time" type="time" value={editForm.appointment_start_time || ''} onChange={(e) => setEditForm({ ...editForm, appointment_start_time: e.target.value })} />
          <Input label="End Time" type="time" value={editForm.appointment_end_time || ''} onChange={(e) => setEditForm({ ...editForm, appointment_end_time: e.target.value })} />
        </div>
      </Modal>

      {/* Reassign Modal */}
      <Modal
        isOpen={!!reassignModal}
        onClose={() => setReassignModal(null)}
        title={reassignModal?.doctor_name ? 'Reassign Doctor' : 'Assign Doctor'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setReassignModal(null)}>
              Cancel
            </Button>
            <Button onClick={handleReassign} isLoading={reassigning}>
              {reassignModal?.doctor_name ? 'Reassign' : 'Assign'}
            </Button>
          </>
        }
      >
        {reassignModal?.doctor_name && (
          <p className="text-sm text-text-secondary mb-3">Currently: {reassignModal.doctor_name}</p>
        )}
        <Select label="New Doctor" value={newDoctorId} onChange={(e) => { setNewDoctorId(e.target.value); setReassignConflict(false); }}>
          <option value="">Select a doctor</option>
          {doctors.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.doctor_name || `Dr. #${doc.id}`}
            </option>
          ))}
        </Select>
        {reassignConflict && (
          <div className="mt-4 space-y-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-xs font-medium text-amber-800">This doctor isn't available at the current time. Choose a new time to reassign and reschedule together.</p>
            <Input label="Date" type="date" value={reassignDate} onChange={(e) => setReassignDate(e.target.value)} />

            <div>
              <p className="text-xs font-semibold text-text-secondary mb-1.5">Open slots on this date</p>
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
                    const isSelected = reassignStart === start && reassignEnd === end;
                    return (
                      <button
                        key={`${start}-${end}`}
                        type="button"
                        onClick={() => { setReassignStart(start); setReassignEnd(end); }}
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
              <Input label="Start Time" type="time" value={reassignStart} onChange={(e) => setReassignStart(e.target.value)} />
              <Input label="End Time" type="time" value={reassignEnd} onChange={(e) => setReassignEnd(e.target.value)} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminAppointments;
