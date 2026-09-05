import { useState } from 'react';
import { getInsuranceRequests, acceptInsuranceRequest, rejectInsuranceRequest } from '@/api/insurance';
import usePaginatedFetch from '@/hooks/usePaginatedFetch';
import Card from '@/components/ui/Card';
import Badge, { statusVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';
import { Shield, CheckCircle, XCircle, User, Calendar, CreditCard, Building } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const STATUSES = ['all', 'pending', 'accepted', 'rejected'];

const statusBorderColor = (status) => {
  if (status === 'accepted') return 'border-l-green-500';
  if (status === 'pending') return 'border-l-amber-500';
  if (status === 'rejected') return 'border-l-red-500';
  return 'border-l-slate-300';
};

const AdminInsurance = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const {
    data: filtered,
    isLoading,
    error,
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    setPage,
    refetch,
  } = usePaginatedFetch(getInsuranceRequests, { status: statusFilter });
  const [processing, setProcessing] = useState(null);
  const [detailModal, setDetailModal] = useState(null);

  const handleAccept = async (id) => {
    setProcessing(id);
    try {
      await acceptInsuranceRequest(id);
      toast.success('Insurance request approved');
      refetch();
      setDetailModal(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Reject this insurance request?')) return;
    setProcessing(id);
    try {
      await rejectInsuranceRequest(id, {});
      toast.success('Insurance request rejected');
      refetch();
      setDetailModal(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Insurance Management" />

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUSES.map((filter) => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            className={clsx('px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors capitalize', statusFilter === filter ? 'bg-orange-600 text-white' : 'bg-surface-subtle text-text-secondary hover:bg-surface-warm border border-slate-200')}
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
        {!isLoading && !error && filtered.length === 0 && <EmptyState icon={Shield} title="No requests" description="No insurance requests match the current filter." />}
        {!isLoading && !error && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map((req) => (
              <div key={req.id} className={clsx('p-4 rounded-xl border-l-[5px] bg-surface-subtle hover:bg-surface-warm transition-colors cursor-pointer', statusBorderColor(req.status))} onClick={() => setDetailModal(req)}>
                <div className="flex items-start gap-4">
                  <div className="w-[46px] h-[46px] rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <Shield size={22} className="text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <p className="text-xs font-mono text-text-muted">#{req.id}</p>
                        <p className="text-sm font-semibold text-text-primary">{req.patient_name || `Patient #${req.patient_id}`}</p>
                      </div>
                      <Badge variant={statusVariant(req.status)}>{req.status}</Badge>
                    </div>
                    <p className="text-sm text-text-secondary mb-2">{req.insurance_company}</p>
                    <div className="flex items-center gap-4 text-xs text-text-muted">
                      <span>Policy: {req.insurance_id_number}</span>
                      {req.amount && (
                        <>
                          <span>•</span>
                          <span className="font-semibold text-text-primary">RM {req.amount}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>
                        {req.start_date ? format(new Date(req.start_date), 'dd MMM yyyy') : '—'} – {req.end_date ? format(new Date(req.end_date), 'dd MMM yyyy') : '—'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" onClick={() => handleAccept(req.id)} disabled={processing === req.id}>
                      <CheckCircle size={14} className="mr-1" />
                      Approve
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleReject(req.id)} disabled={processing === req.id} className="text-red-600 hover:bg-red-50">
                      <XCircle size={14} className="mr-1" />
                      Reject
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
        <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title={`Insurance Request #${detailModal.id}`}>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Status</p>
              <Badge variant={statusVariant(detailModal.status)}>{detailModal.status}</Badge>
            </div>
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Patient</p>
              <div className="flex items-center gap-2 text-sm text-text-primary">
                <User size={16} className="text-orange-600" />
                {detailModal.patient_name || `Patient #${detailModal.patient_id}`}
              </div>
            </div>
            {detailModal.doctor_name && (
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Doctor</p>
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <User size={16} className="text-orange-600" />
                  {detailModal.doctor_name}
                </div>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Insurance Company</p>
              <div className="flex items-center gap-2 text-sm text-text-primary">
                <Building size={16} className="text-orange-600" />
                {detailModal.insurance_company}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Policy Number</p>
              <p className="text-sm text-text-secondary font-mono">{detailModal.insurance_id_number}</p>
            </div>
            {detailModal.amount && (
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Amount</p>
                <div className="flex items-center gap-2 text-lg font-bold text-text-primary">
                  <CreditCard size={18} className="text-orange-600" />
                  RM {detailModal.amount}
                </div>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Coverage Period</p>
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Calendar size={16} className="text-orange-600" />
                {detailModal.start_date ? format(new Date(detailModal.start_date), 'dd MMM yyyy') : '—'} – {detailModal.end_date ? format(new Date(detailModal.end_date), 'dd MMM yyyy') : '—'}
              </div>
            </div>
            {detailModal.reviewed_by_name && (
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Reviewed By</p>
                <p className="text-sm text-text-secondary">{detailModal.reviewed_by_name}</p>
              </div>
            )}
            {detailModal.created_at && (
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Submitted</p>
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Calendar size={16} className="text-orange-600" />
                  {format(new Date(detailModal.created_at), 'dd MMM yyyy, HH:mm')}
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button onClick={() => handleAccept(detailModal.id)} isLoading={processing === detailModal.id} className="flex-1">
                <CheckCircle size={16} className="mr-2" />
                Approve Request
              </Button>
              <Button variant="secondary" onClick={() => handleReject(detailModal.id)} disabled={processing === detailModal.id} className="flex-1 text-red-600 hover:bg-red-50">
                <XCircle size={16} className="mr-2" />
                Reject
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminInsurance;
