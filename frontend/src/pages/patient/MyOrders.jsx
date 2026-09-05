import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getMyOrders, cancelOrder } from '@/api/pharmacy';
import usePaginatedFetch from '@/hooks/usePaginatedFetch';
import Card from '@/components/ui/Card';
import Badge, { statusVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';
import Modal from '@/components/ui/Modal';
import { Package, ShoppingBag, Calendar, MapPin, CreditCard, FileText, Pill } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';
import { openAuthedFile, fileNameFromPath } from '@/utils/viewFile';

const STATUS_FILTERS = ['all', 'pending', 'processing', 'dispatched', 'delivered', 'cancelled'];

const MyOrders = () => {
  const [cancelling, setCancelling] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [detailModal, setDetailModal] = useState(null);

  const {
    data: orders,
    isLoading,
    error,
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    setPage,
    refetch: load,
  } = usePaginatedFetch(getMyOrders, { status: statusFilter !== 'all' ? statusFilter : undefined });

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this order?')) return;
    setCancelling(id);
    try {
      await cancelOrder(id);
      toast.success('Order cancelled.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel order.');
    } finally {
      setCancelling(null);
    }
  };

  const statusBorderColor = (status) => {
    if (status === 'delivered') return 'border-l-green-500';
    if (status === 'dispatched') return 'border-l-blue-500';
    if (status === 'processing') return 'border-l-amber-500';
    if (status === 'pending') return 'border-l-slate-400';
    if (status === 'cancelled') return 'border-l-red-500';
    return 'border-l-slate-300';
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="My Orders"
        action={
          <Link to="/patient/place-order">
            <Button>
              <ShoppingBag size={16} />
              Place Order
            </Button>
          </Link>
        }
      />

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={clsx('px-3 py-1.5 text-xs font-semibold rounded-full capitalize transition-colors', statusFilter === s ? 'bg-brand-600 text-white' : 'bg-surface-subtle text-text-secondary hover:bg-surface-warm border border-slate-200')}>
            {s}
          </button>
        ))}
      </div>

      <Card>
        {isLoading && (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        )}
        {error && <ErrorState message={error} onRetry={load} />}
        {!isLoading && !error && orders.length === 0 && <EmptyState icon={Package} title="No orders" description={statusFilter === 'all' ? 'Your pharmacy orders will appear here.' : `No ${statusFilter} orders found.`} />}
        {!isLoading && !error && orders.length > 0 && (
          <div className="space-y-3">
            {orders.map((order) => {
              const meds = Array.isArray(order.medications) ? order.medications : (order.medications || '').split(',').map((m) => m.trim());

              return (
                <div key={order.id} className={`p-4 rounded-xl border-l-[5px] ${statusBorderColor(order.status)} bg-surface-subtle hover:bg-surface-warm transition-colors cursor-pointer`} onClick={() => setDetailModal(order)}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="text-xs font-mono text-text-muted">#{order.id}</p>
                        <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
                      </div>
                      <p className="text-sm font-semibold text-text-primary mb-1">{meds.join(', ')}</p>
                      <div className="flex items-center gap-4 text-xs text-text-muted">
                        <span>Qty: {order.quantities || '—'}</span>
                        <span>•</span>
                        <span className="font-semibold text-text-primary">RM {parseFloat(order.total_amount || 0).toFixed(2)}</span>
                        <span>•</span>
                        <span className="capitalize">{order.payment_method || '—'}</span>
                        <span>•</span>
                        <span>{order.ordered_at ? format(new Date(order.ordered_at), 'dd MMM yyyy') : '—'}</span>
                      </div>
                      {order.status === 'dispatched' && <p className="text-xs text-blue-600 font-medium mt-2">Est. delivery: 2-3 days</p>}
                    </div>
                    {order.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancel(order.id);
                        }}
                        disabled={cancelling === order.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {cancelling === order.id ? 'Cancelling…' : 'Cancel'}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
      </Card>

      {/* Detail Modal */}
      {detailModal && (
        <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title={`Order #${detailModal.id}`}>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Status</p>
              <Badge variant={statusVariant(detailModal.status)}>{detailModal.status}</Badge>
            </div>

            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Medications</p>
              <div className="space-y-2">
                {(Array.isArray(detailModal.medications) ? detailModal.medications : (detailModal.medications || '').split(',').map((m) => m.trim())).map((med, idx) => {
                  const quantities = (detailModal.quantities || '').split(',').map((q) => q.trim());
                  const qty = quantities[idx] || '1';
                  return (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-surface-subtle border border-slate-200">
                      <Pill size={16} className="text-indigo-600 flex-shrink-0" />
                      <span className="text-sm text-text-primary flex-1">{med}</span>
                      <span className="text-xs text-text-muted">Qty: {qty}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Total Amount</p>
              <p className="text-lg font-bold text-text-primary">RM {parseFloat(detailModal.total_amount || 0).toFixed(2)}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Payment Method</p>
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <CreditCard size={16} className="text-indigo-600" />
                <span className="capitalize">{detailModal.payment_method || '—'}</span>
              </div>
            </div>

            {detailModal.delivery_address && (
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Delivery Address</p>
                <div className="flex items-start gap-2">
                  <MapPin size={16} className="text-indigo-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-text-secondary">{detailModal.delivery_address}</p>
                </div>
              </div>
            )}

            {detailModal.prescription_file_url && (
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Prescription</p>
                <button
                  type="button"
                  onClick={() => openAuthedFile(`/files/prescriptions/${fileNameFromPath(detailModal.prescription_file_url)}`)}
                  className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 hover:underline"
                >
                  <FileText size={16} />
                  View Prescription
                </button>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Ordered</p>
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Calendar size={16} className="text-indigo-600" />
                {detailModal.ordered_at ? format(new Date(detailModal.ordered_at), 'dd MMM yyyy, HH:mm') : '—'}
              </div>
            </div>

            {detailModal.status === 'dispatched' && (
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-sm text-blue-800 font-medium">📦 Your order is on the way!</p>
                <p className="text-xs text-blue-700 mt-1">Estimated delivery: 2-3 business days</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MyOrders;
