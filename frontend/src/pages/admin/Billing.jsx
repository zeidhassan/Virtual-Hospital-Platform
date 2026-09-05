import { useState } from 'react';
import { getBills, updateBill } from '@/api/admin';
import usePaginatedFetch from '@/hooks/usePaginatedFetch';
import Card from '@/components/ui/Card';
import Badge, { statusVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';
import { CreditCard, User, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const BILL_STATUSES = ['pending', 'paid', 'overdue', 'cancelled'];

const statusBorderColor = (status) => {
  if (status === 'paid') return 'border-l-green-500';
  if (status === 'pending') return 'border-l-amber-500';
  if (status === 'overdue') return 'border-l-red-500';
  if (status === 'cancelled') return 'border-l-slate-400';
  return 'border-l-slate-300';
};

const AdminBilling = () => {
  const {
    data: bills,
    isLoading,
    error,
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    setPage,
    refetch,
  } = usePaginatedFetch(getBills);
  const [updating, setUpdating] = useState(null);
  const [detailModal, setDetailModal] = useState(null);

  const handleStatusChange = async (id, status) => {
    setUpdating(id);
    try {
      await updateBill(id, { status });
      toast.success('Bill status updated');
      refetch();
      if (detailModal?.id === id) {
        setDetailModal({ ...detailModal, status });
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update bill');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Billing Management" />

      <Card>
        {isLoading && (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        )}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && bills.length === 0 && <EmptyState icon={CreditCard} title="No bills" description="No billing records found." />}
        {!isLoading && !error && bills.length > 0 && (
          <div className="space-y-3">
            {bills.map((bill) => (
              <div key={bill.id} className={clsx('p-4 rounded-xl border-l-[5px] bg-surface-subtle hover:bg-surface-warm transition-colors cursor-pointer', statusBorderColor(bill.status))} onClick={() => setDetailModal(bill)}>
                <div className="flex items-start gap-4">
                  <div className="w-[46px] h-[46px] rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <CreditCard size={22} className="text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <p className="text-xs font-mono text-text-muted">#{bill.id}</p>
                        <p className="text-sm font-semibold text-text-primary">{bill.patient_name || `Patient #${bill.patient_id}`}</p>
                      </div>
                      <Badge variant={statusVariant(bill.status)}>{bill.status}</Badge>
                    </div>
                    <p className="text-lg font-bold text-text-primary mb-2">RM {bill.amount}</p>
                    <div className="flex items-center gap-4 text-xs text-text-muted">
                      <span>{bill.billing_date || bill.created_at ? format(new Date(bill.billing_date || bill.created_at), 'dd MMM yyyy') : '—'}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Select value={bill.status} onChange={(e) => handleStatusChange(bill.id, e.target.value)} disabled={updating === bill.id} className="text-xs">
                      {BILL_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </Select>
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
        <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title={`Bill #${detailModal.id}`}>
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
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Amount</p>
              <div className="flex items-center gap-2 text-2xl font-bold text-text-primary">
                <DollarSign size={24} className="text-orange-600" />
                RM {detailModal.amount}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Billing Date</p>
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Calendar size={16} className="text-orange-600" />
                {detailModal.billing_date || detailModal.created_at ? format(new Date(detailModal.billing_date || detailModal.created_at), 'dd MMM yyyy, HH:mm') : '—'}
              </div>
            </div>
            <div className="pt-2">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Update Status</p>
              <Select value={detailModal.status} onChange={(e) => handleStatusChange(detailModal.id, e.target.value)} disabled={updating === detailModal.id}>
                {BILL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminBilling;
