import { useState } from 'react';
import { getMyFollowUps, completeFollowUp } from '@/api/followUps';
import useFetch from '@/hooks/useFetch';
import Card, { CardHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { CalendarCheck, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_VARIANT = {
  pending:   'warning',
  completed: 'success',
  cancelled: 'default',
  missed:    'danger',
};

const PatientFollowUps = () => {
  const { data, isLoading, error, refetch } = useFetch(getMyFollowUps);
  const followUps = data?.data || [];
  const [completing, setCompleting] = useState(null);

  const handleComplete = async (id) => {
    setCompleting(id);
    try {
      await completeFollowUp(id);
      toast.success('Marked as completed');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update');
    } finally {
      setCompleting(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <h1 className="page-title mb-6">My Follow-Ups</h1>
      <Card>
        <CardHeader title="Scheduled Follow-Ups" />
        {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && followUps.length === 0 && (
          <EmptyState
            icon={CalendarCheck}
            title="No follow-ups"
            description="Your follow-up appointments will appear here."
          />
        )}
        {!isLoading && !error && followUps.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-3 font-medium text-text-secondary">#</th>
                  <th className="text-left py-3 px-3 font-medium text-text-secondary">Scheduled Date</th>
                  <th className="text-left py-3 px-3 font-medium text-text-secondary">Notes</th>
                  <th className="text-left py-3 px-3 font-medium text-text-secondary">Status</th>
                  <th className="text-left py-3 px-3 font-medium text-text-secondary">Created</th>
                  <th className="py-3 px-3" />
                </tr>
              </thead>
              <tbody>
                {followUps.map((fu) => (
                  <tr key={fu.id} className="border-b border-slate-50 hover:bg-surface-subtle">
                    <td className="py-3 px-3 text-text-secondary">#{fu.id}</td>
                    <td className="py-3 px-3 text-text-primary font-medium">
                      {fu.scheduled_date ? format(new Date(fu.scheduled_date), 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="py-3 px-3 text-text-secondary max-w-xs truncate" title={fu.notes}>
                      {fu.notes || '—'}
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant={STATUS_VARIANT[fu.status] || 'default'}>
                        {fu.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-text-secondary">
                      {fu.created_at ? format(new Date(fu.created_at), 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="py-3 px-3">
                      {fu.status === 'pending' && (
                        <Button
                          size="xs"
                          variant="secondary"
                          isLoading={completing === fu.id}
                          onClick={() => handleComplete(fu.id)}>
                          <CheckCircle size={13} className="mr-1" /> Done
                        </Button>
                      )}
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

export default PatientFollowUps;
