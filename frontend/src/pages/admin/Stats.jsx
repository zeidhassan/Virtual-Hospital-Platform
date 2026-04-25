import { getStatsByRole, getStatsAppointments, getStatsPrescriptions,
         getStatsPharmacyOrders, getStatsRevenue, getStatsSubscriptions } from '@/api/admin';
import useFetch from '@/hooks/useFetch';
import Card, { CardHeader } from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';

const StatRow = ({ label, value }) => (
  <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
    <span className="text-sm text-text-secondary capitalize">{String(label).replace(/_/g, ' ')}</span>
    <span className="text-sm font-semibold text-text-primary">{value ?? '—'}</span>
  </div>
);

const Section = ({ title, data, isLoading, error, refetch, rowKey, rowVal }) => (
  <Card>
    <CardHeader title={title} />
    {isLoading && <div className="flex justify-center py-6"><Spinner /></div>}
    {error && <ErrorState message={error} onRetry={refetch} />}
    {!isLoading && !error && Array.isArray(data) && data.length === 0 && (
      <p className="text-sm text-text-muted py-2">No data available.</p>
    )}
    {!isLoading && !error && Array.isArray(data) && data.length > 0 && (
      <div>
        {data.map((row, i) => (
          <StatRow key={i} label={row[rowKey] ?? `Row ${i + 1}`} value={row[rowVal]} />
        ))}
      </div>
    )}
    {!isLoading && !error && data && !Array.isArray(data) && (
      <div>
        {Object.entries(data).flatMap(([section, rows]) =>
          Array.isArray(rows)
            ? rows.map((row, i) => (
                <StatRow
                  key={`${section}-${i}`}
                  label={`${section} — ${row.month || row.year ? new Date(row.month || row.year).getFullYear() : i + 1}`}
                  value={`SAR ${Number(row.total || 0).toFixed(2)}`}
                />
              ))
            : []
        )}
      </div>
    )}
  </Card>
);

const AdminStats = () => {
  const roles        = useFetch(getStatsByRole);
  const appointments = useFetch(getStatsAppointments);
  const prescriptions = useFetch(getStatsPrescriptions);
  const pharmacy     = useFetch(getStatsPharmacyOrders);
  const revenue      = useFetch(getStatsRevenue);
  const subscriptions = useFetch(getStatsSubscriptions);

  return (
    <div className="animate-fade-in">
      <h1 className="page-title mb-6">Statistics</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Section title="Users by Role"
          data={roles.data} isLoading={roles.isLoading} error={roles.error} refetch={roles.refetch}
          rowKey="role" rowVal="count"
        />
        <Section title="Appointments by Status"
          data={appointments.data} isLoading={appointments.isLoading} error={appointments.error} refetch={appointments.refetch}
          rowKey="status" rowVal="count"
        />
        <Section title="Prescriptions by Doctor"
          data={prescriptions.data} isLoading={prescriptions.isLoading} error={prescriptions.error} refetch={prescriptions.refetch}
          rowKey="doctor_name" rowVal="count"
        />
        <Section title="Pharmacy Orders by Status"
          data={pharmacy.data} isLoading={pharmacy.isLoading} error={pharmacy.error} refetch={pharmacy.refetch}
          rowKey="status" rowVal="count"
        />
        <Section title="Revenue (Monthly/Yearly)"
          data={revenue.data} isLoading={revenue.isLoading} error={revenue.error} refetch={revenue.refetch}
          rowKey="month" rowVal="total"
        />
        <Section title="Active Subscriptions by Plan"
          data={subscriptions.data} isLoading={subscriptions.isLoading} error={subscriptions.error} refetch={subscriptions.refetch}
          rowKey="plan_name" rowVal="count"
        />
      </div>
    </div>
  );
};

export default AdminStats;
