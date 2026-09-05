import { useMemo } from 'react';
import {
  getStatsByRole,
  getStatsAppointments,
  getStatsPrescriptions,
  getStatsPharmacyOrders,
  getStatsRevenue,
  getStatsSubscriptions,
} from '@/api/admin';
import useFetch from '@/hooks/useFetch';
import Card from '@/components/ui/Card';
import StatCard from '@/components/ui/StatCard';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import { DollarSign, CalendarCheck, Users, Package } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

const STATUS_LABEL = (s) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const sumCounts = (rows) => (rows || []).reduce((s, r) => s + (parseInt(r.count) || 0), 0);

// Loading/error/empty wrapper shared by every card below, so a fetch failure
// or a genuinely empty result (e.g. no active subscriptions) reads as
// exactly that — not as a blank chart that looks broken.
const StatSection = ({ title, subtitle, isLoading, error, refetch, isEmpty, emptyLabel, children }) => (
  <Card>
    <h3 className="text-[15px] font-bold text-text-primary">{title}</h3>
    {subtitle && <p className="text-xs text-text-muted mt-0.5 mb-1">{subtitle}</p>}
    <div className={subtitle ? 'mt-3' : 'mt-4'}>
      {isLoading && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}
      {!isLoading && error && <ErrorState message={error} onRetry={refetch} />}
      {!isLoading && !error && isEmpty && (
        <p className="text-sm text-text-muted py-8 text-center">{emptyLabel || 'No data available.'}</p>
      )}
      {!isLoading && !error && !isEmpty && children}
    </div>
  </Card>
);

// Simple labeled bar list — reused for every count-by-category breakdown
// below (appointments by status, pharmacy orders by status, etc.).
const BarList = ({ items, labelKey, valueKey, color, formatLabel = (l) => l }) => {
  const max = Math.max(1, ...items.map((i) => parseInt(i[valueKey]) || 0));
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const value = parseInt(item[valueKey]) || 0;
        return (
          <div key={item[labelKey]}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-text-secondary">{formatLabel(item[labelKey])}</span>
              <span className="text-sm font-semibold text-text-primary">{value.toLocaleString()}</span>
            </div>
            <div className="h-2 bg-surface-subtle rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${(value / max) * 100}%`, background: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const AdminStats = () => {
  const roles = useFetch(getStatsByRole);
  const appointments = useFetch(getStatsAppointments);
  const prescriptions = useFetch(getStatsPrescriptions);
  const pharmacy = useFetch(getStatsPharmacyOrders);
  const revenue = useFetch(getStatsRevenue);
  const subscriptions = useFetch(getStatsSubscriptions);

  const totalUsers = useMemo(() => sumCounts(roles.data), [roles.data]);
  const totalAppointments = useMemo(() => sumCounts(appointments.data), [appointments.data]);
  const totalPharmacyOrders = useMemo(() => sumCounts(pharmacy.data), [pharmacy.data]);

  // billing_date is grouped DESC by the API (most recent first); reverse for
  // a chronological, left-to-right chart.
  const monthlyRevenue = useMemo(
    () => (revenue.data?.monthly || []).map((r) => ({ month: r.month, total: Number(r.total) })).reverse(),
    [revenue.data]
  );
  const totalRevenue = useMemo(() => monthlyRevenue.reduce((s, r) => s + r.total, 0), [monthlyRevenue]);
  const revenueTrend = useMemo(() => {
    if (monthlyRevenue.length < 2) return null;
    const prev = monthlyRevenue[monthlyRevenue.length - 2].total;
    const latest = monthlyRevenue[monthlyRevenue.length - 1].total;
    if (prev === 0) return null;
    return ((latest - prev) / prev) * 100;
  }, [monthlyRevenue]);

  const roleRows = useMemo(
    () => (roles.data || []).map((r) => ({ role: r.role, count: r.count })).sort((a, b) => b.count - a.count),
    [roles.data]
  );

  const topPrescribers = useMemo(() => (prescriptions.data || []).slice(0, 6), [prescriptions.data]);

  const isLoadingCore = roles.isLoading || appointments.isLoading || pharmacy.isLoading || revenue.isLoading;

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="page-title">Statistics</h1>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Revenue"
          value={isLoadingCore ? '—' : `RM ${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          sub="Paid bills, all time"
          icon={DollarSign}
          iconBg="#16A34A"
          delta={revenueTrend !== null ? `${Math.abs(revenueTrend).toFixed(0)}%` : undefined}
          up={revenueTrend !== null ? revenueTrend >= 0 : undefined}
        />
        <StatCard
          label="Total Appointments"
          value={isLoadingCore ? '—' : totalAppointments.toLocaleString()}
          sub="All time"
          icon={CalendarCheck}
          iconBg="#7C6EF8"
        />
        <StatCard
          label="Total Users"
          value={isLoadingCore ? '—' : totalUsers.toLocaleString()}
          sub="Across all roles"
          icon={Users}
          iconBg="#2563EB"
        />
        <StatCard
          label="Pharmacy Orders"
          value={isLoadingCore ? '—' : totalPharmacyOrders.toLocaleString()}
          sub="All time"
          icon={Package}
          iconBg="#D97706"
        />
      </div>

      {/* Revenue trend + role distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatSection
          title="Monthly Revenue"
          subtitle="Paid bills by month"
          isLoading={revenue.isLoading}
          error={revenue.error}
          refetch={revenue.refetch}
          isEmpty={monthlyRevenue.length === 0}
          emptyLabel="No paid bills yet."
        >
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyRevenue} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F5F3EF" vertical={false} />
              <XAxis dataKey="month" tickFormatter={(m) => format(new Date(m), 'MMM')} tick={{ fontSize: 11, fill: '#78716C' }} />
              <YAxis tick={{ fontSize: 11, fill: '#78716C' }} allowDecimals={false} />
              <Tooltip
                formatter={(value) => [`RM ${Number(value).toLocaleString()}`, 'Revenue']}
                labelFormatter={(m) => format(new Date(m), 'MMMM yyyy')}
              />
              <Line type="monotone" dataKey="total" stroke="#16A34A" strokeWidth={2} dot={{ r: 3, fill: '#16A34A' }} />
            </LineChart>
          </ResponsiveContainer>
        </StatSection>

        <StatSection
          title="Users by Role"
          subtitle="Current registered accounts"
          isLoading={roles.isLoading}
          error={roles.error}
          refetch={roles.refetch}
          isEmpty={roleRows.length === 0}
        >
          <BarList items={roleRows} labelKey="role" valueKey="count" color="#7C6EF8" formatLabel={STATUS_LABEL} />
        </StatSection>
      </div>

      {/* Status breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatSection
          title="Appointments by Status"
          isLoading={appointments.isLoading}
          error={appointments.error}
          refetch={appointments.refetch}
          isEmpty={(appointments.data || []).length === 0}
        >
          <BarList items={appointments.data || []} labelKey="status" valueKey="count" color="#2563EB" formatLabel={STATUS_LABEL} />
        </StatSection>

        <StatSection
          title="Pharmacy Orders by Status"
          isLoading={pharmacy.isLoading}
          error={pharmacy.error}
          refetch={pharmacy.refetch}
          isEmpty={(pharmacy.data || []).length === 0}
        >
          <BarList items={pharmacy.data || []} labelKey="status" valueKey="count" color="#0D9488" formatLabel={STATUS_LABEL} />
        </StatSection>
      </div>

      {/* Prescribing activity + subscriptions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatSection
          title="Top Prescribing Doctors"
          isLoading={prescriptions.isLoading}
          error={prescriptions.error}
          refetch={prescriptions.refetch}
          isEmpty={topPrescribers.length === 0}
          emptyLabel="No prescriptions written yet."
        >
          <BarList items={topPrescribers} labelKey="doctor_name" valueKey="count" color="#D97706" />
        </StatSection>

        <StatSection
          title="Active Subscriptions by Plan"
          isLoading={subscriptions.isLoading}
          error={subscriptions.error}
          refetch={subscriptions.refetch}
          isEmpty={(subscriptions.data || []).length === 0}
          emptyLabel="No active subscriptions right now."
        >
          <BarList items={subscriptions.data || []} labelKey="plan_name" valueKey="count" color="#DC2626" />
        </StatSection>
      </div>
    </div>
  );
};

export default AdminStats;
