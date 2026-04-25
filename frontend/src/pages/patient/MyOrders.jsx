import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getMyOrders, cancelOrder } from '@/api/pharmacy';
import Card, { CardHeader } from '@/components/ui/Card';
import Badge, { statusVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { Package, ShoppingBag } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_FILTERS = ['all', 'pending', 'processing', 'dispatched', 'delivered', 'cancelled'];

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = { limit: 50 };
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await getMyOrders(params);
      setOrders(res.data?.data || res.data || []);
    } catch {
      setError('Failed to load orders.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

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

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">My Pharmacy Orders</h1>
        <Link to="/patient/place-order">
          <Button size="sm">
            <ShoppingBag size={15} className="mr-1.5" />
            Place Order
          </Button>
        </Link>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap mb-4">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 text-xs font-medium rounded-full border capitalize transition-colors ${
              statusFilter === s
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-text-secondary border-slate-200 hover:border-brand-400'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader title="Order History" />
        {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}
        {error && <ErrorState message={error} onRetry={load} />}
        {!isLoading && !error && orders.length === 0 && (
          <EmptyState
            icon={Package}
            title="No orders"
            description={statusFilter === 'all' ? 'Your pharmacy orders will appear here.' : `No ${statusFilter} orders found.`}
          />
        )}
        {!isLoading && !error && orders.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">ID</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Medications</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Qty</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Total (SAR)</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Payment</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Status</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Ordered</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary"></th>
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
                      <td className="py-3 px-2 text-text-primary max-w-[180px]">
                        <span className="block truncate" title={meds.join(', ')}>{meds.join(', ')}</span>
                      </td>
                      <td className="py-3 px-2 text-text-secondary">{order.quantities || '—'}</td>
                      <td className="py-3 px-2 font-medium">{parseFloat(order.total_amount || 0).toFixed(2)}</td>
                      <td className="py-3 px-2 text-text-secondary capitalize">{order.payment_method || '—'}</td>
                      <td className="py-3 px-2">
                        <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
                      </td>
                      <td className="py-3 px-2 text-text-secondary">
                        {order.ordered_at ? format(new Date(order.ordered_at), 'dd MMM yyyy') : '—'}
                      </td>
                      <td className="py-3 px-2">
                        {order.status === 'pending' && (
                          <button
                            onClick={() => handleCancel(order.id)}
                            disabled={cancelling === order.id}
                            className="text-xs text-red-600 hover:underline disabled:opacity-40"
                          >
                            {cancelling === order.id ? 'Cancelling…' : 'Cancel'}
                          </button>
                        )}
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

export default MyOrders;
