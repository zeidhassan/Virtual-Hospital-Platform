import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDoctorAppointments, updateAppointmentStatus, rescheduleDoctorAppointment } from '@/api/appointments';
import usePaginatedFetch from '@/hooks/usePaginatedFetch';
import Card from '@/components/ui/Card';
import Badge, { statusVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';
import Avatar from '@/components/ui/Avatar';
import { Calendar, Search, Plus, Clock, User, FileText } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const STATUS_OPTIONS = ['pending', 'confirmed', 'completed', 'cancelled'];
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

  const canReschedule = (status) => status !== 'completed' && status !== 'cancelled';

  const handleStatusChange = async (id, status) => {
    setUpdating(id);
    try {
      await updateAppointmentStatus(id, { status });
      toast.success('Status updated');
      setDetailModal((m) => (m && m.id === id ? { ...m, status } : m));
      refetch();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdating(null);
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
                          <Button variant="ghost" size="sm" onClick={() => setDetailModal(appt)} className="hover:border-brand-600 hover:text-brand-600">
                            View
                          </Button>
                          {canReschedule(appt.status) && (
                            <Button variant="ghost" size="sm" onClick={() => openReschedule(appt)} className="hover:border-brand-600 hover:text-brand-600">
                              Reschedule
                            </Button>
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
        <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title={`Appointment #${detailModal.id}`}>
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
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Status</p>
              <Select
                value={detailModal.status}
                onChange={(e) => handleStatusChange(detailModal.id, e.target.value)}
                disabled={updating === detailModal.id}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </div>
            {canReschedule(detailModal.status) && (
              <Button variant="secondary" className="w-full" onClick={() => openReschedule(detailModal)}>
                <Clock size={16} className="mr-2" />
                Reschedule
              </Button>
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
