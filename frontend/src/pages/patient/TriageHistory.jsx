import { getTriageHistory } from '@/api/triage';
import usePaginatedFetch from '@/hooks/usePaginatedFetch';
import Card, { CardHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import Pagination from '@/components/ui/Pagination';
import { Activity } from 'lucide-react';
import { format } from 'date-fns';

const URGENCY_VARIANT = {
  emergency: 'danger',
  urgent: 'warning',
  standard: 'info',
  self_care: 'success',
};

const TriageHistory = () => {
  const { data: sessions, isLoading, error, currentPage, totalPages, totalItems, pageSize, setPage, refetch } = usePaginatedFetch(getTriageHistory);

  return (
    <div className="animate-fade-in">
      <h1 className="page-title mb-6">My Triage History</h1>
      <Card>
        <CardHeader title="Past Assessments" />
        {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && sessions.length === 0 && (
          <EmptyState
            icon={Activity}
            title="No assessments yet"
            description="Submit a triage assessment to see your history here."
          />
        )}
        {!isLoading && !error && sessions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">#</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Symptoms</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Urgency</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Department</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Follow-up</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Date</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-b border-slate-50 hover:bg-surface-subtle">
                    <td className="py-3 px-2 text-text-secondary">#{s.id}</td>
                    <td className="py-3 px-2 text-text-primary max-w-xs truncate">{s.symptoms_text}</td>
                    <td className="py-3 px-2">
                      <Badge variant={URGENCY_VARIANT[s.urgency_level] || 'default'}>
                        {s.urgency_level?.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-text-secondary">{s.recommended_department}</td>
                    <td className="py-3 px-2">
                      {s.follow_up_recommended
                        ? <Badge variant="info">Scheduled</Badge>
                        : <span className="text-text-muted text-xs">None</span>}
                    </td>
                    <td className="py-3 px-2 text-text-secondary">
                      {s.created_at ? format(new Date(s.created_at), 'dd MMM yyyy') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
      </Card>
    </div>
  );
};

export default TriageHistory;
