import { getChartTopDoctors, getChartTopMedications, getChartSubscriptionDistribution } from '@/api/admin';
import useFetch from '@/hooks/useFetch';
import { useTheme } from '@/hooks/useTheme';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import PageHeader from '@/components/ui/PageHeader';

const COLORS = ['#ea580c', '#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5'];

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
    <div className="mb-4">
      <h3 className="text-base font-semibold text-text-primary">{title}</h3>
    </div>
    {isLoading && (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    )}
    {error && <ErrorState message={error} onRetry={refetch} />}
    {!isLoading && !error && children}
  </Card>
);

const AdminCharts = () => {
  const doctors = useFetch(getChartTopDoctors);
  const meds = useFetch(getChartTopMedications);
  const subs = useFetch(getChartSubscriptionDistribution);
  const { isDark } = useTheme();

  const doctorData = toBarData(doctors.data);
  const medData = toBarData(meds.data);
  const subData = toPieData(subs.data);

  const axisTick = { fontSize: 11, fill: isDark ? '#A3A3A3' : '#64748b' };
  const tooltipStyle = {
    backgroundColor: isDark ? '#2A2A2A' : '#fff',
    border: `1px solid ${isDark ? '#404040' : '#e2e8f0'}`,
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    color: isDark ? '#F5F5F5' : '#1C1917',
  };
  const legendStyle = { fontSize: '13px', color: isDark ? '#D4D4D4' : '#57534E' };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Analytics & Charts" />

      {/* Bar charts: side-by-side on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Top Doctors by Appointments" isLoading={doctors.isLoading} error={doctors.error} refetch={doctors.refetch}>
          {doctorData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={doctorData} margin={{ left: -10, right: 10, top: 10, bottom: 10 }}>
                <XAxis dataKey="name" tick={axisTick} />
                <YAxis tick={axisTick} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#ea580c" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-text-muted py-6 text-center">No data available.</p>
          )}
        </ChartCard>

        <ChartCard title="Top Prescribed Medications" isLoading={meds.isLoading} error={meds.error} refetch={meds.refetch}>
          {medData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={medData} margin={{ left: -10, right: 10, top: 10, bottom: 10 }}>
                <XAxis dataKey="name" tick={axisTick} />
                <YAxis tick={axisTick} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#f97316" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-text-muted py-6 text-center">No data available.</p>
          )}
        </ChartCard>
      </div>

      {/* Pie chart: full width */}
      <ChartCard title="Subscription Plan Distribution" isLoading={subs.isLoading} error={subs.error} refetch={subs.refetch}>
        {subData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={subData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="45%"
                outerRadius={150}
                label={({ x, y, name, percent, textAnchor }) => (
                  <text x={x} y={y} textAnchor={textAnchor} fontSize={12} fill={isDark ? '#D4D4D4' : '#57534E'}>
                    {`${name} ${(percent * 100).toFixed(0)}%`}
                  </text>
                )}
                labelLine={{ stroke: isDark ? '#A3A3A3' : '#94a3b8', strokeWidth: 1 }}
              >
                {subData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Legend verticalAlign="bottom" height={36} wrapperStyle={legendStyle} />
              <Tooltip formatter={(value) => [value, 'Subscribers']} contentStyle={tooltipStyle} />
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
