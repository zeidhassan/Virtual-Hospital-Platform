import { getMyAppointments } from '@/api/appointments';
import useFetch from '@/hooks/useFetch';
import Card, { CardHeader } from '@/components/ui/Card';
import Badge, { statusVariant } from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';

const MyAppointments = () => {
  const { data, isLoading, error, refetch } = useFetch(getMyAppointments);
  const appointments = data?.appointments || data?.data || data || [];

  return (
    <div className="animate-fade-in">
      <h1 className="page-title mb-6">My Appointments</h1>
      <Card>
        <CardHeader title="Appointment History" />
        {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && appointments.length === 0 && (
          <EmptyState
            icon={Calendar}
            title="No appointments yet"
            description="Book your first appointment to get started."
          />
        )}
        {!isLoading && !error && appointments.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Date</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Time</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Doctor</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Status</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Notes</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appt) => (
                  <tr key={appt.id} className="border-b border-slate-50 hover:bg-surface-subtle">
                    <td className="py-3 px-2 text-text-primary">
                      {appt.appointment_date ? format(new Date(appt.appointment_date), 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="py-3 px-2 text-text-secondary">{appt.appointment_start_time || '—'}</td>
                    <td className="py-3 px-2 text-text-primary">{appt.doctor_name || `Dr. #${appt.doctor_id}` || '—'}</td>
                    <td className="py-3 px-2">
                      <Badge variant={statusVariant(appt.status)}>{appt.status}</Badge>
                    </td>
                    <td className="py-3 px-2 text-text-secondary max-w-xs truncate">{appt.notes || '—'}</td>
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

export default MyAppointments;
