import { useState, useEffect, useCallback } from 'react';
import { getAllOrders, updateOrderStatus } from '@/api/pharmacy';
import Card, { CardHeader } from '@/components/ui/Card';
import Badge, { statusVariant } from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { Package } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const ORDER_STATUSES = ['pending', 'processing', 'dispatched', 'delivered', 'cancelled'];

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [patientFilter, setPatientFilter] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = { limit: 50 };
      if (statusFilter) params.status = statusFilter;
      if (patientFilter) params.patient = patientFilter;
      const res = await getAllOrders(params);
      setOrders(res.data?.data || res.data || []);
    } catch {
      setError('Failed to load orders.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, patientFilter]);

  useEffect(() => { load(); }, [load]);

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

  return (
    <div className="animate-fade-in">
      <h1 className="page-title mb-6">Pharmacy Orders</h1>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap mb-4">
        <input
          type="text"
          placeholder="Filter by patient name..."
          value={patientFilter}
          onChange={(e) => setPatientFilter(e.target.value)}
          className="text-sm rounded-lg border border-slate-200 px-3 py-1.5 bg-white w-52 focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm rounded-lg border border-slate-200 px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
        >
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
      </div>

      <Card>
        <CardHeader title="All Orders" />
        {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}
        {error && <ErrorState message={error} onRetry={load} />}
        {!isLoading && !error && orders.length === 0 && (
          <EmptyState icon={Package} title="No orders found" description="Try adjusting filters." />
        )}
        {!isLoading && !error && orders.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">ID</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Patient</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Medications</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Total</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Payment</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Status</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Update</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const meds = Array.isArray(order.medications)
                    ? order.medications
                    : (order.medications || '').split(',').map(m => m.trim());
                  return (
                    <tr key={order.id} className="border-b border-slate-50 hover:bg-surface-subtle">
                      <td className="py-3 px-2 text-text-secondary font-mono">#{order.id}</td>
                      <td className="py-3 px-2 text-text-primary">{order.patient_name || `#${order.patient_id}`}</td>
                      <td className="py-3 px-2 text-text-secondary max-w-[160px]">
                        <span className="block truncate" title={meds.join(', ')}>{meds.join(', ')}</span>
                      </td>
                      <td className="py-3 px-2 font-medium">SAR {parseFloat(order.total_amount || 0).toFixed(2)}</td>
                      <td className="py-3 px-2 text-text-secondary capitalize">{order.payment_method || '—'}</td>
                      <td className="py-3 px-2"><Badge variant={statusVariant(order.status)}>{order.status}</Badge></td>
                      <td className="py-3 px-2">
                        <select
                          className="text-xs rounded-lg border border-slate-200 px-2 py-1.5 bg-white focus:outline-none capitalize"
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          disabled={updating === order.id}
                        >
                          {ORDER_STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
                        </select>
                      </td>
                      <td className="py-3 px-2 text-text-secondary">
                        {order.ordered_at ? format(new Date(order.ordered_at), 'dd MMM yyyy') : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminOrders;
