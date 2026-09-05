import { useState } from 'react';
import { getPatientAnswers } from '@/api/doctor';
import usePaginatedFetch from '@/hooks/usePaginatedFetch';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';
import Modal from '@/components/ui/Modal';
import { MessageSquare, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const PatientAnswers = () => {
  const { data: answers, isLoading, error, currentPage, totalPages, totalItems, pageSize, setPage, refetch } = usePaginatedFetch(getPatientAnswers);
  const [detailModal, setDetailModal] = useState(null);

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Patient Answers" />

      <Card>
        {isLoading && (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        )}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && answers.length === 0 && <EmptyState icon={MessageSquare} title="No answers yet" description="Patient answers to health questions will appear here." />}
        {!isLoading && !error && answers.length > 0 && (
          <div className="space-y-3">
            {answers.map((item) => (
              <div key={item.id} className="p-4 rounded-xl bg-surface-subtle hover:bg-surface-warm transition-colors cursor-pointer border-l-4 border-l-emerald-500" onClick={() => setDetailModal(item)}>
                <div className="flex items-start gap-4">
                  <div className="w-[46px] h-[46px] rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <MessageSquare size={22} className="text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-text-muted bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">{item.patient_name || `Patient #${item.patient_id}`}</span>
                      <span className="text-xs text-text-muted">{item.created_at ? format(new Date(item.created_at), 'dd MMM yyyy') : '—'}</span>
                    </div>
                    <p className="text-sm font-semibold text-text-primary mb-1">{item.question_text || `Question #${item.question_id}`}</p>
                    <p className="text-sm text-text-secondary line-clamp-2">{item.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
      </Card>

      {/* Detail Modal */}
      {detailModal && (
        <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title="Patient Answer Details">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Patient</p>
              <div className="flex items-center gap-2 text-sm text-text-primary">
                <User size={16} className="text-emerald-600" />
                {detailModal.patient_name || `Patient #${detailModal.patient_id}`}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Question</p>
              <p className="text-sm text-text-primary font-medium">{detailModal.question_text || `Question #${detailModal.question_id}`}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Answer</p>
              <p className="text-sm text-text-secondary whitespace-pre-wrap">{detailModal.answer}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Submitted</p>
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Calendar size={16} className="text-emerald-600" />
                {detailModal.created_at ? format(new Date(detailModal.created_at), 'dd MMM yyyy, HH:mm') : '—'}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PatientAnswers;
