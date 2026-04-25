import { useState } from 'react';
import { getDoctorInsurancePending, acceptInsurance, rejectInsurance } from '@/api/doctor';
import useFetch from '@/hooks/useFetch';
import Card, { CardHeader } from '@/components/ui/Card';
import Badge, { statusVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { Shield, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const DoctorInsurance = () => {
  const { data, isLoading, error, refetch } = useFetch(getDoctorInsurancePending);
  const requests = data?.data || data || [];
  const [processing, setProcessing] = useState(null);

  const handleAccept = async (id) => {
    setProcessing(id);
    try {
      await acceptInsurance(id);
      toast.success('Insurance request approved');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve request');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id) => {
    setProcessing(id);
    try {
      await rejectInsurance(id, {});
      toast.success('Insurance request rejected');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject request');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <h1 className="page-title mb-6">Insurance Management</h1>
      <Card>
        <CardHeader title="Pending Insurance Requests" />
        {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && requests.length === 0 && (
          <EmptyState icon={Shield} title="No pending requests" description="Insurance requests from your patients will appear here." />
        )}
        {!isLoading && !error && requests.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Patient</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Company</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Policy #</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Amount</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Coverage</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Status</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id} className="border-b border-slate-50 hover:bg-surface-subtle">
                    <td className="py-3 px-2 text-text-primary">{req.patient_name || `Patient #${req.patient_id}`}</td>
                    <td className="py-3 px-2 text-text-secondary">{req.insurance_company || '—'}</td>
                    <td className="py-3 px-2 text-text-secondary">{req.insurance_id_number || '—'}</td>
                    <td className="py-3 px-2">{req.amount ? `SAR ${req.amount}` : '—'}</td>
                    <td className="py-3 px-2 text-text-secondary text-xs">
                      {req.start_date ? format(new Date(req.start_date), 'dd MMM yyyy') : '—'} –{' '}
                      {req.end_date ? format(new Date(req.end_date), 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="py-3 px-2">
                      <Badge variant={statusVariant(req.status)}>{req.status}</Badge>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAccept(req.id)}
                          disabled={processing === req.id}
                          className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium disabled:opacity-50"
                          title="Approve"
                        >
                          <CheckCircle size={15} />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(req.id)}
                          disabled={processing === req.id}
                          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium disabled:opacity-50"
                          title="Reject"
                        >
                          <XCircle size={15} />
                          Reject
                        </button>
                      </div>
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

export default DoctorInsurance;
