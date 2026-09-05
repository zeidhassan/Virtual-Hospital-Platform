import { useState } from 'react';
import { getAllOrders, updateOrderStatus } from '@/api/pharmacy';
import usePaginatedFetch from '@/hooks/usePaginatedFetch';
import Card from '@/components/ui/Card';
import Badge, { statusVariant } from '@/components/ui/Badge';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';
import Modal from '@/components/ui/Modal';
import { Package, Search, User, Calendar, MapPin, CreditCard, FileText, Pill } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { openAuthedFile, fileNameFromPath } from '@/utils/viewFile';

const ORDER_STATUSES = ['pending', 'processing', 'dispatched', 'delivered', 'cancelled'];
const STATUS_FILTERS = ['all', 'pending', 'processing', 'dispatched', 'delivered', 'cancelled'];

const statusBorderColor = (status) => {
  if (status === 'delivered') return 'border-l-green-500';
  if (status === 'dispatched') return 'border-l-blue-500';
  if (status === 'processing') return 'border-l-amber-500';
  if (status === 'pending') return 'border-l-slate-400';
  if (status === 'cancelled') return 'border-l-red-500';
  return 'border-l-slate-300';
};

const DoctorPharmacyOrders = () => {
  const [updating, setUpdating] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
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
  } = usePaginatedFetch(getAllOrders, { status: statusFilter !== 'all' ? statusFilter : undefined });

  const handleStatusChange = async (id, status) => {
    setUpdating(id);
    try {
      await updateOrderStatus(id, status);
      toast.success('Order updated');
      load();
    } catch {
      toast.error('Failed to update order');
    } finally {
      setUpdating(null);
    }
  };

  const filteredOrders = orders.filter((order) => {
    return !searchQuery || order.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) || order.id?.toString().includes(searchQuery);
  });

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Patient Pharmacy Orders" />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search by patient name or order ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-500"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={clsx('px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors capitalize', statusFilter === filter ? 'bg-emerald-600 text-white' : 'bg-surface-subtle text-text-secondary hover:bg-surface-warm border border-slate-200')}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <Card>
        {isLoading && (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        )}
        {error && <ErrorState message={error} onRetry={load} />}
        {!isLoading && !error && filteredOrders.length === 0 && (
          <EmptyState icon={Package} title={searchQuery || statusFilter !== 'all' ? 'No matching orders' : 'No orders found'} description={searchQuery || statusFilter !== 'all' ? 'Try adjusting your search or filters.' : 'None of your patients have placed pharmacy orders yet.'} />
        )}
        {!isLoading && !error && filteredOrders.length > 0 && (
          <div className="space-y-3">
            {filteredOrders.map((order) => {
              const meds = Array.isArray(order.medications) ? order.medications : (order.medications || '').split(',').map((m) => m.trim());

              return (
                <div key={order.id} className={clsx('p-4 rounded-xl border-l-[5px] bg-surface-subtle hover:bg-surface-warm transition-colors cursor-pointer', statusBorderColor(order.status))} onClick={() => setDetailModal(order)}>
                  <div className="flex items-start gap-4">
                    <div className="w-[46px] h-[46px] rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Package size={22} className="text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          <p className="text-xs font-mono text-text-muted">#{order.id}</p>
                          <p className="text-sm font-semibold text-text-primary">{order.patient_name || `Patient #${order.patient_id}`}</p>
                        </div>
                        <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
                      </div>
                      <p className="text-sm text-text-secondary mb-2">{meds.join(', ')}</p>
                      <div className="flex items-center gap-4 text-xs text-text-muted">
                        <span>Qty: {order.quantities || '—'}</span>
                        <span>•</span>
                        <span className="font-semibold text-text-primary">RM {parseFloat(order.total_amount || 0).toFixed(2)}</span>
                        <span>•</span>
                        <span className="capitalize">{order.payment_method || '—'}</span>
                        <span>•</span>
                        <span>{order.ordered_at ? format(new Date(order.ordered_at), 'dd MMM yyyy') : '—'}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Select value={order.status} onChange={(e) => handleStatusChange(order.id, e.target.value)} disabled={updating === order.id} className="text-xs">
                        {ORDER_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {!searchQuery && <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />}
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
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Patient</p>
              <div className="flex items-center gap-2 text-sm text-text-primary">
                <User size={16} className="text-emerald-600" />
                {detailModal.patient_name || `Patient #${detailModal.patient_id}`}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Medications</p>
              <div className="space-y-2">
                {(Array.isArray(detailModal.medications) ? detailModal.medications : (detailModal.medications || '').split(',').map((m) => m.trim())).map((med, idx) => {
                  const quantities = (detailModal.quantities || '').split(',').map((q) => q.trim());
                  const qty = quantities[idx] || '1';
                  return (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-surface-subtle border border-slate-200">
                      <Pill size={16} className="text-emerald-600 flex-shrink-0" />
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
                <CreditCard size={16} className="text-emerald-600" />
                <span className="capitalize">{detailModal.payment_method || '—'}</span>
              </div>
            </div>
            {detailModal.delivery_address && (
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Delivery Address</p>
                <div className="flex items-start gap-2">
                  <MapPin size={16} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-text-secondary">{detailModal.delivery_address}</p>
                </div>
              </div>
            )}
            {detailModal.prescription_file_url && (
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Prescription File</p>
                <button
                  type="button"
                  onClick={() => openAuthedFile(`/files/prescriptions/${fileNameFromPath(detailModal.prescription_file_url)}`)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  <FileText size={16} />
                  View Prescription
                </button>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Ordered</p>
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Calendar size={16} className="text-emerald-600" />
                {detailModal.ordered_at ? format(new Date(detailModal.ordered_at), 'dd MMM yyyy, HH:mm') : '—'}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DoctorPharmacyOrders;
