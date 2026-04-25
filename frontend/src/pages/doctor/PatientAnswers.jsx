import { getPatientAnswers } from '@/api/doctor';
import useFetch from '@/hooks/useFetch';
import Card, { CardHeader } from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

const PatientAnswers = () => {
  const { data, isLoading, error, refetch } = useFetch(getPatientAnswers);
  const answers = Array.isArray(data) ? data : data?.data || [];

  return (
    <div className="animate-fade-in">
      <h1 className="page-title mb-6">Patient Answers</h1>
      <Card>
        <CardHeader title="Health Question Responses" subtitle="Answers submitted by your patients" />
        {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && answers.length === 0 && (
          <EmptyState icon={MessageSquare} title="No answers yet" description="Patient answers will appear here." />
        )}
        {!isLoading && !error && answers.length > 0 && (
          <div className="space-y-4">
            {answers.map((item) => (
              <div key={item.id} className="p-4 rounded-xl bg-surface-subtle">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1">
                      Patient: {item.patient_name || `#${item.patient_id}`}
                    </p>
                    <p className="text-sm font-medium text-text-primary">{item.question_text || `Question #${item.question_id}`}</p>
                    <p className="text-sm text-text-secondary mt-1">{item.answer}</p>
                  </div>
                  <p className="text-xs text-text-muted flex-shrink-0">
                    {item.created_at ? format(new Date(item.created_at), 'dd MMM') : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default PatientAnswers;
