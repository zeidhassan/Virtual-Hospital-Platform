import { useState } from 'react';
import { getQuestions, approveQuestion, deleteQuestion, getQuestionAssignmentsOverview } from '@/api/admin';
import usePaginatedFetch from '@/hooks/usePaginatedFetch';
import Card, { CardHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import Pagination from '@/components/ui/Pagination';
import { HelpCircle, Check, Trash2, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const TABS = ['Question Bank', 'Assignments'];

const AdminQuestions = () => {
  const [tab, setTab] = useState('Question Bank');
  const {
    data: questions,
    isLoading,
    error,
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    setPage,
    refetch,
  } = usePaginatedFetch(getQuestions);
  const [processing, setProcessing] = useState(null);

  const {
    data: assignments,
    isLoading: assignLoading,
    error: assignError,
    currentPage: assignPage,
    totalPages: assignTotalPages,
    totalItems: assignTotalItems,
    pageSize: assignPageSize,
    setPage: setAssignPage,
    refetch: assignRefetch,
  } = usePaginatedFetch(getQuestionAssignmentsOverview);

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
    <div className="animate-fade-in space-y-6">
      <h1 className="page-title">Question Bank</h1>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx('px-3 py-1.5 rounded-full text-xs font-semibold transition-colors', tab === t ? 'bg-brand-600 text-white' : 'bg-surface-subtle text-text-secondary hover:bg-surface-warm border border-slate-200')}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Question Bank' && (
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
          <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
        </Card>
      )}

      {tab === 'Assignments' && (
        <Card>
          <CardHeader title="Doctor → Patient Question Assignments" subtitle="Read-only overview — assignments are managed by doctors and patients." />
          {assignLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}
          {assignError && <ErrorState message={assignError} onRetry={assignRefetch} />}
          {!assignLoading && !assignError && assignments.length === 0 && (
            <EmptyState icon={HelpCircle} title="No assignments yet" description="Questions doctors assign to patients will appear here." />
          )}
          {!assignLoading && !assignError && assignments.length > 0 && (
            <div className="space-y-3">
              {assignments.map((a) => (
                <div key={a.id} className="p-4 rounded-xl bg-surface-subtle">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-text-primary">{a.question_text}</p>
                    {a.response_id ? (
                      <Badge variant="success"><CheckCircle2 size={11} className="mr-1" />Answered</Badge>
                    ) : (
                      <Badge variant="warning"><Clock size={11} className="mr-1" />Pending</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-text-muted">
                    <span>{a.doctor_name} → {a.patient_name}</span>
                    <span>•</span>
                    <span>{a.assigned_at ? format(new Date(a.assigned_at), 'dd MMM yyyy') : '—'}</span>
                  </div>
                  {a.answer && <p className="text-sm text-text-secondary mt-2 border-l-2 border-emerald-300 pl-2.5">{a.answer}</p>}
                </div>
              ))}
            </div>
          )}
          <Pagination currentPage={assignPage} totalPages={assignTotalPages} totalItems={assignTotalItems} pageSize={assignPageSize} onPageChange={setAssignPage} />
        </Card>
      )}
    </div>
  );
};

export default AdminQuestions;
