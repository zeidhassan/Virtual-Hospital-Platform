import { getDoctorPatients } from '@/api/doctor';
import useFetch from '@/hooks/useFetch';
import Card, { CardHeader } from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { Users } from 'lucide-react';

const ViewPatients = () => {
  const { data, isLoading, error, refetch } = useFetch(getDoctorPatients);
  const patients = data?.patients || data?.data || data || [];

  return (
    <div className="animate-fade-in">
      <h1 className="page-title mb-6">My Patients</h1>
      <Card>
        <CardHeader title="Patient List" />
        {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && patients.length === 0 && (
          <EmptyState icon={Users} title="No patients yet" description="Patients you&apos;ve seen will appear here." />
        )}
        {!isLoading && !error && patients.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Name</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Blood Group</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Allergies</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Chronic Conditions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-surface-subtle">
                    <td className="py-3 px-2 font-medium text-text-primary">{p.name || p.user?.name || `Patient #${p.id}`}</td>
                    <td className="py-3 px-2 text-text-secondary">{p.blood_group || '—'}</td>
                    <td className="py-3 px-2 text-text-secondary max-w-xs truncate">{p.allergies || '—'}</td>
                    <td className="py-3 px-2 text-text-secondary max-w-xs truncate">{p.chronic_conditions || '—'}</td>
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

export default ViewPatients;
