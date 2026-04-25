import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { getMyInsuranceRequests, submitInsuranceRequest } from '@/api/insurance';
import useFetch from '@/hooks/useFetch';
import Card, { CardHeader } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { Shield } from 'lucide-react';
import { format } from 'date-fns';

const schema = z.object({
  insurance_company: z.string().min(2, 'Company name is required'),
  insurance_id_number: z.string().min(2, 'Insurance ID is required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
});

const statusVariant = (s) => {
  if (s === 'accepted') return 'success';
  if (s === 'rejected') return 'error';
  return 'warning';
};

const InsuranceRequests = () => {
  const [submitting, setSubmitting] = useState(false);
  const { data, isLoading, error, refetch } = useFetch(getMyInsuranceRequests);
  const requests = Array.isArray(data) ? data : data?.data || [];

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (formData) => {
    setSubmitting(true);
    try {
      await submitInsuranceRequest(formData);
      toast.success('Insurance request submitted successfully!');
      reset();
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="page-title">Insurance Requests</h1>

      {/* Submit form */}
      <Card>
        <CardHeader title="Submit New Insurance Request" />
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Insurance Company"
              placeholder="e.g. BlueCross BlueShield"
              error={errors.insurance_company?.message}
              {...register('insurance_company')}
            />
            <Input
              label="Insurance ID Number"
              placeholder="e.g. INS-123456"
              error={errors.insurance_id_number?.message}
              {...register('insurance_id_number')}
            />
            <Input
              label="Coverage Start Date"
              type="date"
              error={errors.start_date?.message}
              {...register('start_date')}
            />
            <Input
              label="Coverage End Date"
              type="date"
              error={errors.end_date?.message}
              {...register('end_date')}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Request history */}
      <Card>
        <CardHeader title="My Insurance Requests" />
        {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && requests.length === 0 && (
          <EmptyState
            icon={Shield}
            title="No insurance requests yet"
            description="Submit your first insurance request above."
          />
        )}
        {!isLoading && !error && requests.length > 0 && (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Company</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Insurance ID</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Start</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">End</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Status</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-surface-subtle">
                    <td className="py-3 px-2 text-text-primary">{r.insurance_company}</td>
                    <td className="py-3 px-2 text-text-secondary font-mono text-xs">{r.insurance_id_number}</td>
                    <td className="py-3 px-2 text-text-secondary">
                      {r.start_date ? format(new Date(r.start_date), 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="py-3 px-2 text-text-secondary">
                      {r.end_date ? format(new Date(r.end_date), 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="py-3 px-2">
                      <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                    </td>
                    <td className="py-3 px-2 text-text-secondary">
                      {r.created_at ? format(new Date(r.created_at), 'dd MMM yyyy') : '—'}
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

export default InsuranceRequests;
