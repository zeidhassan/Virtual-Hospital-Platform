import { getMyAnswers } from '@/api/patient';
import useFetch from '@/hooks/useFetch';
import Card, { CardHeader } from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

const MyAnswers = () => {
  const { data, isLoading, error, refetch } = useFetch(getMyAnswers);
  const answers = data?.responses || data?.data || data || [];

  return (
    <div className="animate-fade-in">
      <h1 className="page-title mb-6">My Submitted Answers</h1>
      <Card>
        <CardHeader title="Health Question Responses" />
        {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && answers.length === 0 && (
          <EmptyState icon={MessageSquare} title="No answers submitted" description="Answer health questions to see your responses here." />
        )}
        {!isLoading && !error && answers.length > 0 && (
          <div className="space-y-4">
            {answers.map((item) => (
              <div key={item.id} className="p-4 rounded-xl bg-surface-subtle">
                <p className="text-sm font-medium text-text-primary">{item.question_text || `Question #${item.question_id}`}</p>
                <p className="text-sm text-text-secondary mt-1">{item.answer}</p>
                <p className="text-xs text-text-muted mt-2">{item.created_at ? format(new Date(item.created_at), 'dd MMM yyyy') : ''}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default MyAnswers;
