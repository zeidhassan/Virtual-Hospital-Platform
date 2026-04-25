import { useState, useEffect } from 'react';
import { getAdminAppointments, updateAdminAppointment, deleteAdminAppointment,
         reassignAdminAppointment, getAllDoctors } from '@/api/admin';
import useFetch from '@/hooks/useFetch';
import Card, { CardHeader } from '@/components/ui/Card';
import Badge, { statusVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import Modal from '@/components/ui/Modal';
import { CalendarCheck, Trash2, RefreshCw, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const APPT_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];

const AdminAppointments = () => {
  const [filters, setFilters] = useState({ status: '', doctor: '', patient: '', date: '' });
  const [applied, setApplied] = useState({});
  const { data, isLoading, error, refetch } = useFetch(getAdminAppointments, applied);
  const appointments = data?.data || data || [];

  // Doctors list for modals
  const [doctors, setDoctors] = useState([]);
  useEffect(() => {
    getAllDoctors()
      .then(({ data: d }) => setDoctors(Array.isArray(d) ? d : (d?.data || [])))
      .catch(() => {});
  }, []);

  const [deleting, setDeleting] = useState(null);

  // Edit modal (status + reschedule)
  const [editModal, setEditModal]   = useState(null);
  const [editForm, setEditForm]     = useState({});
  const [editSaving, setEditSaving] = useState(false);

  // Reassign modal
  const [reassignModal, setReassignModal] = useState(null);
  const [newDoctorId, setNewDoctorId]     = useState('');
  const [reassigning, setReassigning]     = useState(false);

  const handleSearch = () => setApplied({ ...filters });
  const clearFilters = () => { setFilters({ status: '', doctor: '', patient: '', date: '' }); setApplied({}); };

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
      appointment_end_time:   appt.appointment_end_time   || '',
    });
  };

  const handleEditSave = async () => {
    setEditSaving(true);
    try {
      const payload = {};
      if (editForm.status)                  payload.status = editForm.status;
      if (editForm.appointment_date)        payload.appointment_date = editForm.appointment_date;
      if (editForm.appointment_start_time)  payload.appointment_start_time = editForm.appointment_start_time;
      if (editForm.appointment_end_time)    payload.appointment_end_time   = editForm.appointment_end_time;
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

  const handleReassign = async () => {
    if (!newDoctorId) return;
    setReassigning(true);
    try {
      await reassignAdminAppointment(reassignModal.id, { doctor_id: parseInt(newDoctorId) });
      toast.success('Appointment reassigned');
      setReassignModal(null);
      setNewDoctorId('');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reassign');
    } finally {
      setReassigning(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <h1 className="page-title mb-6">Appointments</h1>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader title="Filters" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <Input label="Status" placeholder="e.g. pending" value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} />
          <Input label="Doctor" placeholder="Doctor name" value={filters.doctor}
            onChange={(e) => setFilters((f) => ({ ...f, doctor: e.target.value }))} />
          <Input label="Patient" placeholder="Patient name" value={filters.patient}
            onChange={(e) => setFilters((f) => ({ ...f, patient: e.target.value }))} />
          <Input label="Date" type="date" value={filters.date}
            onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))} />
        </div>
        <div className="flex gap-3">
          <Button size="sm" onClick={handleSearch}>Search</Button>
          <Button size="sm" variant="ghost" onClick={clearFilters}>Clear</Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="All Appointments" />
        {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && appointments.length === 0 && (
          <EmptyState icon={CalendarCheck} title="No appointments" />
        )}
        {!isLoading && !error && appointments.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">ID</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Patient</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Doctor</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Date</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Time</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Status</th>
                  <th className="py-3 px-2" />
                </tr>
              </thead>
              <tbody>
                {appointments.map((appt) => (
                  <tr key={appt.id} className="border-b border-slate-50 hover:bg-surface-subtle">
                    <td className="py-3 px-2 text-text-muted">#{appt.id}</td>
                    <td className="py-3 px-2 text-text-primary">{appt.patient_name || `#${appt.patient_id}`}</td>
                    <td className="py-3 px-2 text-text-secondary">{appt.doctor_name || `#${appt.doctor_id}`}</td>
                    <td className="py-3 px-2 text-text-secondary">
                      {appt.appointment_date ? format(new Date(appt.appointment_date), 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="py-3 px-2 text-text-secondary">{appt.appointment_start_time || '—'}</td>
                    <td className="py-3 px-2">
                      <Badge variant={statusVariant(appt.status)}>{appt.status}</Badge>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(appt)}
                          className="p-1.5 rounded-lg text-text-muted hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          title="Edit status / reschedule">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => { setReassignModal(appt); setNewDoctorId(''); }}
                          className="p-1.5 rounded-lg text-text-muted hover:bg-violet-50 hover:text-violet-600 transition-colors"
                          title="Reassign doctor">
                          <RefreshCw size={14} />
                        </button>
                        <button onClick={() => handleDelete(appt.id)} disabled={deleting === appt.id}
                          className="p-1.5 rounded-lg text-text-muted hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40"
                          title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Edit (status + reschedule) modal */}
      <Modal isOpen={!!editModal} onClose={() => setEditModal(null)}
        title={`Edit Appointment #${editModal?.id}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditModal(null)}>Cancel</Button>
            <Button onClick={handleEditSave} isLoading={editSaving}>Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Status</label>
            <select
              className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
              value={editForm.status || ''}
              onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="">Keep current</option>
              {APPT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <Input label="Reschedule Date" type="date"
            value={editForm.appointment_date || ''}
            onChange={(e) => setEditForm((f) => ({ ...f, appointment_date: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Time" type="time"
              value={editForm.appointment_start_time || ''}
              onChange={(e) => setEditForm((f) => ({ ...f, appointment_start_time: e.target.value }))} />
            <Input label="End Time" type="time"
              value={editForm.appointment_end_time || ''}
              onChange={(e) => setEditForm((f) => ({ ...f, appointment_end_time: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* Reassign modal */}
      <Modal isOpen={!!reassignModal} onClose={() => setReassignModal(null)}
        title="Reassign Doctor"
        footer={
          <>
            <Button variant="secondary" onClick={() => setReassignModal(null)}>Cancel</Button>
            <Button onClick={handleReassign} disabled={!newDoctorId || reassigning} isLoading={reassigning}>
              Reassign
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-secondary mb-4">
          Appointment #{reassignModal?.id} — currently assigned to <strong>{reassignModal?.doctor_name}</strong>.
        </p>
        <div>
          <label className="text-xs font-medium text-text-secondary mb-1 block">New Doctor</label>
          <select
            className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
            value={newDoctorId}
            onChange={(e) => setNewDoctorId(e.target.value)}
          >
            <option value="">Choose a doctor...</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>{d.doctor_name || d.full_name || d.name}</option>
            ))}
          </select>
          {doctors.length === 0 && (
            <p className="text-xs text-text-muted mt-1">No doctors loaded — ensure the backend is running.</p>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default AdminAppointments;
