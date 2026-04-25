import { useState } from 'react';
import { getInsuranceRequests, updateInsuranceRequest } from '@/api/insurance';
import useFetch from '@/hooks/useFetch';
import Card, { CardHeader } from '@/components/ui/Card';
import Badge, { statusVariant } from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { Shield } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const AdminInsurance = () => {
  const { data, isLoading, error, refetch } = useFetch(getInsuranceRequests);
  const requests = data?.requests || data?.data || data || [];
  const [updating, setUpdating] = useState(null);

  const handleStatusChange = async (id, status) => {
    setUpdating(id);
    try {
      await updateInsuranceRequest(id, { status });
      toast.success('Status updated');
      refetch();
    } catch {
      toast.error('Failed to update');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <h1 className="page-title mb-6">Insurance Management</h1>
      <Card>
        <CardHeader title="All Insurance Requests" />
        {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && requests.length === 0 && (
          <EmptyState icon={Shield} title="No requests" />
        )}
        {!isLoading && !error && requests.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Patient</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Doctor</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Company</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Amount</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Status</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Update</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Date</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id} className="border-b border-slate-50 hover:bg-surface-subtle">
                    <td className="py-3 px-2">{req.patient_name || `#${req.patient_id}`}</td>
                    <td className="py-3 px-2">{req.doctor_name || `#${req.doctor_id}`}</td>
                    <td className="py-3 px-2 text-text-secondary">{req.insurance_company}</td>
                    <td className="py-3 px-2">{req.amount || '—'}</td>
                    <td className="py-3 px-2"><Badge variant={statusVariant(req.status)}>{req.status}</Badge></td>
                    <td className="py-3 px-2">
                      <select
                        className="text-xs rounded-lg border border-slate-200 px-2 py-1.5 bg-white"
                        defaultValue={req.status}
                        onChange={(e) => handleStatusChange(req.id, e.target.value)}
                        disabled={updating === req.id}
                      >
                        {['pending', 'approved', 'rejected'].map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="py-3 px-2 text-text-secondary">{req.created_at ? format(new Date(req.created_at), 'dd MMM') : '—'}</td>
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

export default AdminInsurance;
