import { useState } from 'react';
import { getBills, updateBill } from '@/api/admin';
import useFetch from '@/hooks/useFetch';
import Card, { CardHeader } from '@/components/ui/Card';
import Badge, { statusVariant } from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const BILL_STATUSES = ['pending', 'paid', 'overdue', 'cancelled'];

const AdminBilling = () => {
  const { data, isLoading, error, refetch } = useFetch(getBills);
  const bills = Array.isArray(data) ? data : (data?.bills || data?.data || []);
  const [updating, setUpdating] = useState(null);

  const handleStatusChange = async (id, status) => {
    setUpdating(id);
    try {
      await updateBill(id, { status });
      toast.success('Bill status updated');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update bill');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <h1 className="page-title mb-6">Billing</h1>
      <Card>
        <CardHeader title="All Bills" />
        {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && bills.length === 0 && (
          <EmptyState icon={CreditCard} title="No bills" />
        )}
        {!isLoading && !error && bills.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Bill ID</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Patient</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Amount</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Status</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Update</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Date</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((bill) => (
                  <tr key={bill.id} className="border-b border-slate-50 hover:bg-surface-subtle">
                    <td className="py-3 px-2 text-text-secondary">#{bill.id}</td>
                    <td className="py-3 px-2 text-text-primary">{bill.patient_name || `Patient #${bill.patient_id}`}</td>
                    <td className="py-3 px-2 font-medium">SAR {bill.amount}</td>
                    <td className="py-3 px-2">
                      <Badge variant={statusVariant(bill.status)}>{bill.status}</Badge>
                    </td>
                    <td className="py-3 px-2">
                      <select
                        className="text-xs rounded-lg border border-slate-200 px-2 py-1.5 bg-white disabled:opacity-50"
                        defaultValue={bill.status}
                        onChange={(e) => handleStatusChange(bill.id, e.target.value)}
                        disabled={updating === bill.id}
                      >
                        {BILL_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-2 text-text-secondary">
                      {bill.billing_date || bill.created_at
                        ? format(new Date(bill.billing_date || bill.created_at), 'dd MMM yyyy')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminBilling;
