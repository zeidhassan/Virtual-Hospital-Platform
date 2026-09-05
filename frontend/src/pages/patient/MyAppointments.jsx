import { useState, useMemo } from 'react';
import { getMyAppointments, cancelAppointment } from '@/api/appointments';
import { completeFollowUp } from '@/api/followUps';
import usePaginatedFetch from '@/hooks/usePaginatedFetch';
import Card from '@/components/ui/Card';
import Badge, { statusVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import PageHeader from '@/components/ui/PageHeader';
import Avatar from '@/components/ui/Avatar';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import { Calendar, Search, Plus, User, Clock, FileText, CheckCircle, X } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const FILTER_OPTIONS = ['all', 'upcoming', 'confirmed', 'completed', 'pending', 'cancelled'];
const TYPE_FILTER_OPTIONS = ['all', 'consultation', 'follow_up', 'triage_escalation'];
const TYPE_LABEL = { consultation: 'Consultation', follow_up: 'Follow-up', triage_escalation: 'Escalated' };
const TYPE_VARIANT = { consultation: 'default', follow_up: 'brand', triage_escalation: 'warning' };

const MyAppointments = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [detailModal, setDetailModal] = useState(null);
  const [acting, setActing] = useState(null);

  // 'upcoming' is a status combo (confirmed + pending) the backend filter
  // can't express as a single exact match, so it's applied client-side below.
  const filters = useMemo(
    () => ({
      name: searchQuery || undefined,
      status: activeFilter !== 'all' && activeFilter !== 'upcoming' ? activeFilter : undefined,
      appointment_type: typeFilter !== 'all' ? typeFilter : undefined,
    }),
    [searchQuery, activeFilter, typeFilter]
  );
  const { data, isLoading, error, currentPage, totalPages, totalItems, pageSize, setPage, refetch } = usePaginatedFetch(getMyAppointments, filters);
  const appointments = activeFilter === 'upcoming' ? data.filter((appt) => appt.status === 'confirmed' || appt.status === 'pending') : data;

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return;
    setActing(id + '-cancel');
    try {
      await cancelAppointment(id);
      toast.success('Appointment cancelled');
      setDetailModal(null);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel');
    } finally {
      setActing(null);
    }
  };

  const handleComplete = async (id) => {
    setActing(id + '-complete');
    try {
      await completeFollowUp(id);
      toast.success('Marked as completed');
      setDetailModal(null);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update');
    } finally {
      setActing(null);
    }
  };

  const filteredAppointments = appointments;

  const statusBorderColor = (status) => {
    if (status === 'confirmed') return 'border-l-green-500';
    if (status === 'pending') return 'border-l-amber-500';
    if (status === 'completed') return 'border-l-blue-500';
    if (status === 'cancelled') return 'border-l-red-500';
    return 'border-l-slate-300';
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="My Appointments"
        action={
          <Button onClick={() => navigate('/patient/book-appointment')}>
            <Plus size={16} />
            Book Appointment
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
            placeholder="Search by doctor name..."
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

      {/* Appointments List */}
      <Card>
        {isLoading && (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        )}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && filteredAppointments.length === 0 && (
          <EmptyState icon={Calendar} title={searchQuery || activeFilter !== 'all' ? 'No matching appointments' : 'No appointments yet'} description={searchQuery || activeFilter !== 'all' ? 'Try adjusting your search or filters.' : 'Book your first appointment to get started.'} />
        )}
        {!isLoading && !error && filteredAppointments.length > 0 && (
          <div className="space-y-3">
            {filteredAppointments.map((appt) => (
              <div key={appt.id} className={`flex items-center gap-3 p-4 rounded-lg border-l-[5px] ${statusBorderColor(appt.status)} bg-surface-subtle hover:bg-surface-warm transition-colors cursor-pointer`} onClick={() => setDetailModal(appt)}>
                <Avatar name={appt.doctor_name || 'Unassigned'} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-text-primary">{appt.doctor_name || 'Unassigned — awaiting doctor'}</p>
                    {appt.appointment_type && appt.appointment_type !== 'consultation' && (
                      <Badge variant={TYPE_VARIANT[appt.appointment_type]} className="!py-0.5">{TYPE_LABEL[appt.appointment_type]}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-text-muted">
                    {appt.appointment_date ? format(new Date(appt.appointment_date), 'EEEE, MMMM dd, yyyy') : '—'} · {appt.appointment_start_time || '—'}
                  </p>
                  {appt.notes && <p className="text-xs text-text-secondary mt-1 line-clamp-1">{appt.notes}</p>}
                </div>
                {appt.appointment_type === 'follow_up' && appt.status === 'pending' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    isLoading={acting === appt.id + '-complete'}
                    onClick={(e) => { e.stopPropagation(); handleComplete(appt.id); }}
                    className="flex-shrink-0"
                  >
                    <CheckCircle size={14} className="mr-1" /> Mark Done
                  </Button>
                )}
                <Badge variant={statusVariant(appt.status)}>{appt.status}</Badge>
              </div>
            ))}
          </div>
        )}
        {activeFilter !== 'upcoming' && (
          <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
        )}
      </Card>

      {/* Detail Modal */}
      {detailModal && (
        <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title={`Appointment #${detailModal.id}`}>
          <div className="space-y-4">
            {detailModal.appointment_type && detailModal.appointment_type !== 'consultation' && (
              <Badge variant={TYPE_VARIANT[detailModal.appointment_type]}>{TYPE_LABEL[detailModal.appointment_type]}</Badge>
            )}
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Doctor</p>
              <div className="flex items-center gap-2 text-sm text-text-primary">
                <User size={16} className="text-brand-600" />
                {detailModal.doctor_name || 'Unassigned — awaiting doctor'}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Date &amp; Time</p>
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Clock size={16} className="text-brand-600" />
                {detailModal.appointment_date ? format(new Date(detailModal.appointment_date), 'EEEE, MMMM dd, yyyy') : '—'}
                {detailModal.appointment_start_time ? ` · ${detailModal.appointment_start_time.slice(0, 5)}` : ''}
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
              <Badge variant={statusVariant(detailModal.status)}>{detailModal.status}</Badge>
            </div>
            {detailModal.status === 'pending' && (
              <div className="flex gap-2 pt-2">
                {detailModal.appointment_type === 'follow_up' && (
                  <Button onClick={() => handleComplete(detailModal.id)} isLoading={acting === detailModal.id + '-complete'} className="flex-1">
                    <CheckCircle size={16} className="mr-2" /> Mark Done
                  </Button>
                )}
                <Button variant="secondary" onClick={() => handleCancel(detailModal.id)} isLoading={acting === detailModal.id + '-cancel'} className="flex-1 text-red-600 hover:bg-red-50">
                  <X size={16} className="mr-2" /> Cancel
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MyAppointments;
