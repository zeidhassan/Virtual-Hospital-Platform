import { getChartTopDoctors, getChartTopMedications, getChartSubscriptionDistribution } from '@/api/admin';
import useFetch from '@/hooks/useFetch';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import Card, { CardHeader } from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';

const COLORS = ['#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4', '#ccfbf1'];

// Convert { labels: [...], values: [...] } → [{ name, count }]
const toBarData = (raw) => {
  if (!raw?.labels) return [];
  return raw.labels.map((name, i) => ({ name, count: raw.values[i] ?? 0 }));
};

// Convert { labels: [...], values: [...] } → [{ name, value }]
const toPieData = (raw) => {
  if (!raw?.labels) return [];
  return raw.labels.map((name, i) => ({ name, value: raw.values[i] ?? 0 }));
};

const ChartCard = ({ title, isLoading, error, refetch, children }) => (
  <Card>
    <CardHeader title={title} />
    {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}
    {error && <ErrorState message={error} onRetry={refetch} />}
    {!isLoading && !error && children}
  </Card>
);

const AdminCharts = () => {
  const doctors = useFetch(getChartTopDoctors);
  const meds    = useFetch(getChartTopMedications);
  const subs    = useFetch(getChartSubscriptionDistribution);

  const doctorData = toBarData(doctors.data);
  const medData    = toBarData(meds.data);
  const subData    = toPieData(subs.data);

  return (
    <div className="animate-fade-in">
      <h1 className="page-title mb-6">Charts</h1>
      {/* Bar charts: side-by-side on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard title="Top Doctors by Appointments"
          isLoading={doctors.isLoading} error={doctors.error} refetch={doctors.refetch}>
          {doctorData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={doctorData} margin={{ left: -10 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-text-muted py-6 text-center">No data available.</p>
          )}
        </ChartCard>

        <ChartCard title="Top Prescribed Medications"
          isLoading={meds.isLoading} error={meds.error} refetch={meds.refetch}>
          {medData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={medData} margin={{ left: -10 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-text-muted py-6 text-center">No data available.</p>
          )}
        </ChartCard>
      </div>

      {/* Pie chart: full width so it has room to breathe */}
      <ChartCard title="Subscription Plan Distribution"
        isLoading={subs.isLoading} error={subs.error} refetch={subs.refetch}>
        {subData.length > 0 ? (
          <ResponsiveContainer width="100%" height={380}>
            <PieChart>
              <Pie data={subData} dataKey="value" nameKey="name"
                cx="50%" cy="45%" outerRadius={140} label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }>
                {subData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Legend verticalAlign="bottom" height={36} />
              <Tooltip formatter={(value) => [value, 'Subscribers']} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-text-muted py-6 text-center">No data available.</p>
        )}
      </ChartCard>
    </div>
  );
};

export default AdminCharts;
