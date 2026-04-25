import { useState } from 'react';
import { getDoctorAppointments, updateAppointmentStatus } from '@/api/appointments';
import useFetch from '@/hooks/useFetch';
import Card, { CardHeader } from '@/components/ui/Card';
import Badge, { statusVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['pending', 'confirmed', 'completed', 'cancelled'];

const Appointments = () => {
  const { data, isLoading, error, refetch } = useFetch(getDoctorAppointments);
  const appointments = data?.appointments || data?.data || data || [];
  const [updating, setUpdating] = useState(null);

  const handleStatusChange = async (id, status) => {
    setUpdating(id);
    try {
      await updateAppointmentStatus(id, { status });
      toast.success('Status updated');
      refetch();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <h1 className="page-title mb-6">Appointments</h1>
      <Card>
        <CardHeader title="Manage Appointments" />
        {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && appointments.length === 0 && (
          <EmptyState icon={Calendar} title="No appointments" description="Your scheduled appointments will appear here." />
        )}
        {!isLoading && !error && appointments.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">ID</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Date</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Time</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Patient</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Status</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Update</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appt) => (
                  <tr key={appt.id} className="border-b border-slate-50 hover:bg-surface-subtle">
                    <td>{appt.id}</td>
                    <td className="py-3 px-2">{appt.appointment_date ? format(new Date(appt.appointment_date), 'dd MMM yyyy') : '—'}</td>
                    <td className="py-3 px-2 text-text-secondary">{appt.appointment_start_time || '—'}</td>
                    <td className="py-3 px-2 font-medium text-text-primary">{appt.patient_name || `Patient #${appt.patient_id}` || '—'}</td>
                    <td className="py-3 px-2"><Badge variant={statusVariant(appt.status)}>{appt.status}</Badge></td>
                    <td className="py-3 px-2">
                      <select
                        className="text-xs rounded-lg border border-slate-200 px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                        defaultValue={appt.status}
                        onChange={(e) => handleStatusChange(appt.id, e.target.value)}
                        disabled={updating === appt.id}
                      >
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
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

export default Appointments;
