import { useState } from 'react';
import { getMyFollowUps, completeFollowUp } from '@/api/followUps';
import { cancelAppointment } from '@/api/appointments';
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
import { CalendarCheck, User, Clock, FileText, CheckCircle, X } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const STATUS_FILTERS = ['all', 'pending', 'completed', 'cancelled', 'missed'];

const statusBorderColor = (status) => {
  if (status === 'pending') return 'border-l-amber-500';
  if (status === 'completed') return 'border-l-blue-500';
  if (status === 'cancelled') return 'border-l-red-500';
  if (status === 'missed') return 'border-l-red-500';
  return 'border-l-slate-300';
};

const MyFollowUps = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [detailModal, setDetailModal] = useState(null);
  const [acting, setActing] = useState(null);

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
  } = usePaginatedFetch(getMyFollowUps, {
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

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

  // Patients can't call cancelFollowUp (doctor/admin only) — the general
  // patient appointment-cancel endpoint has no appointment_type restriction
  // and is what MyAppointments.jsx already uses for follow-up rows, so this
  // page has to go through the same endpoint or the same row would be
  // cancellable on one page and not the other.
  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this follow-up?')) return;
    setActing(id + '-cancel');
    try {
      await cancelAppointment(id);
      toast.success('Follow-up cancelled');
      setDetailModal(null);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel');
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="My Follow-Ups" />

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
            title={statusFilter !== 'all' ? 'No matching follow-ups' : 'No follow-ups yet'}
            description={statusFilter !== 'all' ? 'Try a different filter.' : 'Follow-ups your doctor schedules for you will appear here.'}
          />
        )}
        {!isLoading && !error && followUps.length > 0 && (
          <div className="space-y-3">
            {followUps.map((fu) => (
              <div
                key={fu.id}
                className={`flex items-center gap-3 p-4 rounded-lg border-l-[5px] ${statusBorderColor(fu.status)} bg-surface-subtle hover:bg-surface-warm transition-colors cursor-pointer`}
                onClick={() => setDetailModal(fu)}
              >
                <Avatar name={fu.doctor_name || 'Unassigned'} size={40} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary">{fu.doctor_name || 'Unassigned — awaiting doctor'}</p>
                  <p className="text-xs text-text-muted">
                    {fu.scheduled_date ? format(new Date(fu.scheduled_date), 'EEEE, MMMM dd, yyyy') : '—'}
                    {fu.appointment_start_time ? ` · ${fu.appointment_start_time.slice(0, 5)}` : ''}
                  </p>
                  {fu.notes && <p className="text-xs text-text-secondary mt-1 line-clamp-1">{fu.notes}</p>}
                </div>
                {fu.status === 'pending' && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="secondary"
                      isLoading={acting === fu.id + '-complete'}
                      onClick={(e) => { e.stopPropagation(); handleComplete(fu.id); }}
                    >
                      <CheckCircle size={14} className="mr-1" /> Mark Done
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      isLoading={acting === fu.id + '-cancel'}
                      onClick={(e) => { e.stopPropagation(); handleCancel(fu.id); }}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <X size={14} />
                    </Button>
                  </div>
                )}
                <Badge variant={statusVariant(fu.status)}>{fu.status}</Badge>
              </div>
            ))}
          </div>
        )}
        <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
      </Card>

      {/* Detail modal is built entirely from the already-loaded row — there
          is no GET /follow-ups/:id endpoint to refetch a single one. */}
      {detailModal && (
        <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title={`Follow-Up #${detailModal.id}`}>
          <div className="space-y-4">
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
                {detailModal.scheduled_date ? format(new Date(detailModal.scheduled_date), 'EEEE, MMMM dd, yyyy') : '—'}
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
                <Button onClick={() => handleComplete(detailModal.id)} isLoading={acting === detailModal.id + '-complete'} className="flex-1">
                  <CheckCircle size={16} className="mr-2" /> Mark Done
                </Button>
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

export default MyFollowUps;
