import { useState } from 'react';
import { listPrograms, enrollProgram, unenrollProgram } from '@/api/healthPrograms';
import useFetch from '@/hooks/useFetch';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import PageHeader from '@/components/ui/PageHeader';
import { Stethoscope, Calendar, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const HealthPrograms = () => {
  const { data, isLoading, error, refetch } = useFetch(listPrograms);
  const programs = data?.programs || [];
  const [acting, setActing] = useState(null);

  const handleEnroll = async (id) => {
    setActing(id);
    try {
      await enrollProgram(id);
      toast.success('Enrolled in program');
      refetch();
    } catch (err) {
      // A 409 here is a real, expected state (e.g. a double-click), not a
      // failure — show the backend's own clean message either way.
      toast.error(err.response?.data?.error || 'Failed to enroll');
    } finally {
      setActing(null);
    }
  };

  const handleUnenroll = async (id) => {
    setActing(id);
    try {
      await unenrollProgram(id);
      toast.success('Left program');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to leave program');
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Health Programs" />

      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}
      {error && <ErrorState message={error} onRetry={refetch} />}
      {!isLoading && !error && programs.length === 0 && (
        <EmptyState icon={Stethoscope} title="No health programs available" description="Check back later for upcoming programs." />
      )}
      {!isLoading && !error && programs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map((program) => (
            <Card key={program.id} className="flex flex-col">
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-text-primary">{program.name}</h3>
                  {program.is_enrolled && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-status-success flex-shrink-0">
                      <CheckCircle2 size={14} /> Enrolled
                    </span>
                  )}
                </div>
                {program.description && (
                  <p className="text-xs text-text-secondary mb-3">{program.description}</p>
                )}
                {(program.start_date || program.end_date) && (
                  <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1.5">
                    <Calendar size={13} />
                    {program.start_date ? format(new Date(program.start_date), 'dd MMM yyyy') : '—'}
                    {program.end_date ? ` – ${format(new Date(program.end_date), 'dd MMM yyyy')}` : ''}
                  </div>
                )}
                {program.eligibility && (
                  <p className="text-xs text-text-muted">Eligibility: {program.eligibility}</p>
                )}
              </div>
              <Button
                size="sm"
                variant={program.is_enrolled ? 'secondary' : 'primary'}
                isLoading={acting === program.id}
                onClick={() => (program.is_enrolled ? handleUnenroll(program.id) : handleEnroll(program.id))}
                className="mt-4 w-full"
              >
                {program.is_enrolled ? 'Leave' : 'Enroll'}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default HealthPrograms;
