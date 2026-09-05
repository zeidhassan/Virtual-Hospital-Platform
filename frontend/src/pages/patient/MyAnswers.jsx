import { useNavigate } from 'react-router-dom';
import { getMyAnswers } from '@/api/patient';
import usePaginatedFetch from '@/hooks/usePaginatedFetch';
import Card, { CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import Pagination from '@/components/ui/Pagination';
import { MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

const MyAnswers = () => {
  const navigate = useNavigate();
  const { data: answers, isLoading, error, currentPage, totalPages, totalItems, pageSize, setPage, refetch } = usePaginatedFetch(getMyAnswers);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="page-title">My Submitted Answers</h1>
        <Button variant="secondary" size="sm" onClick={() => navigate('/patient/answer-questions')}>
          Answer More Questions
        </Button>
      </div>
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
              <div key={item.response_id} className="p-4 rounded-xl bg-surface-subtle">
                <p className="text-sm font-medium text-text-primary">{item.question_text || `Question #${item.question_id}`}</p>
                <p className="text-sm text-text-secondary mt-1">{item.answer}</p>
                <p className="text-xs text-text-muted mt-2">{item.created_at ? format(new Date(item.created_at), 'dd MMM yyyy') : ''}</p>
              </div>
            ))}
          </div>
        )}
        <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
      </Card>
    </div>
  );
};

export default MyAnswers;
