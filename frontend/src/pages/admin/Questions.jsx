import { useState } from 'react';
import { getQuestions, approveQuestion, deleteQuestion } from '@/api/admin';
import useFetch from '@/hooks/useFetch';
import Card, { CardHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { HelpCircle, Check, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminQuestions = () => {
  const { data, isLoading, error, refetch } = useFetch(getQuestions);
  const questions = data?.questions || data?.data || data || [];
  const [processing, setProcessing] = useState(null);

  const handleApprove = async (id) => {
    setProcessing(id);
    try {
      await approveQuestion(id);
      toast.success('Question approved');
      refetch();
    } catch {
      toast.error('Failed to approve');
    } finally {
      setProcessing(null);
    }
  };

  const handleDelete = async (id) => {
    setProcessing(id);
    try {
      await deleteQuestion(id);
      toast.success('Question deleted');
      refetch();
    } catch {
      toast.error('Failed to delete');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <h1 className="page-title mb-6">Question Bank</h1>
      <Card>
        <CardHeader title="Manage Questions" />
        {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && questions.length === 0 && (
          <EmptyState icon={HelpCircle} title="No questions" />
        )}
        {!isLoading && !error && questions.length > 0 && (
          <div className="space-y-3">
            {questions.map((q) => (
              <div key={q.id} className="flex items-start gap-3 p-4 rounded-xl bg-surface-subtle">
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">{q.question_text}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-text-muted">{q.question_type}</span>
                    {q.specialty && <span className="text-xs text-text-muted">• {q.specialty}</span>}
                    <Badge variant={q.is_approved ? 'success' : 'warning'}>
                      {q.is_approved ? 'Approved' : 'Pending'}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!q.is_approved && (
                    <button
                      onClick={() => handleApprove(q.id)}
                      disabled={processing === q.id}
                      className="p-2 rounded-lg text-text-muted hover:bg-green-50 hover:text-green-600 transition-colors"
                      aria-label="Approve"
                    >
                      <Check size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(q.id)}
                    disabled={processing === q.id}
                    className="p-2 rounded-lg text-text-muted hover:bg-red-50 hover:text-red-500 transition-colors"
                    aria-label="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminQuestions;
