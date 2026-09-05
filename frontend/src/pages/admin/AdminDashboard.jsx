import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Stethoscope, CalendarCheck, DollarSign, Package, CreditCard, BarChart2, Clock, Shield, HelpCircle, Settings, Activity, FileText, MessageSquare } from 'lucide-react';
import { getStatsByRole, getStatsAppointments, getStatsRevenue, getStatsAppointmentsMonthly, getChartTopDoctors, getAdminAppointments } from '@/api/admin';
import useFetch from '@/hooks/useFetch';
import WelcomeBanner from '@/components/ui/WelcomeBanner';
import StatCard from '@/components/ui/StatCard';
import QuickActionButton from '@/components/ui/QuickActionButton';
import Card, { CardHeader } from '@/components/ui/Card';
import Avatar from '@/components/ui/Avatar';
import Spinner from '@/components/ui/Spinner';
import Badge, { statusVariant } from '@/components/ui/Badge';
import { format } from 'date-fns';

const todayStr = () => new Date().toISOString().slice(0, 10);

const platformManagement = [
  { icon: Users, label: 'Users', to: '/admin/database', color: '#7C6EF8', bgColor: '#F0EEFF' },
  { icon: Stethoscope, label: 'Doctors', to: '/admin/doctor-subscriptions', color: '#16A34A', bgColor: '#DCFCE7' },
  { icon: CalendarCheck, label: 'Appointments', to: '/admin/appointments', color: '#2563EB', bgColor: '#DBEAFE' },
  { icon: CreditCard, label: 'Billing', to: '/admin/billing', color: '#D97706', bgColor: '#FEF3C7' },
  { icon: Package, label: 'Orders', to: '/admin/orders', color: '#DC2626', bgColor: '#FEE2E2' },
  { icon: Shield, label: 'Insurance', to: '/admin/insurance', color: '#0891B2', bgColor: '#CFFAFE' },
  { icon: HelpCircle, label: 'Questions', to: '/admin/questions', color: '#7C2D12', bgColor: '#FED7AA' },
  { icon: Clock, label: 'Time Slots', to: '/admin/doctor-time-slots', color: '#57534E', bgColor: '#F5F5F4' },
  { icon: Activity, label: 'Triage', to: '/admin/triage-sessions', color: '#BE123C', bgColor: '#FFE4E6' },
  { icon: FileText, label: 'Support', to: '/admin/support-tickets', color: '#6366F1', bgColor: '#E0E7FF' },
  { icon: MessageSquare, label: 'Messages', to: '/admin/messages', color: '#8B5CF6', bgColor: '#EDE9FE' },
  { icon: Settings, label: 'Database', to: '/admin/database', color: '#475569', bgColor: '#F1F5F9' },
];

const ROLE_COLORS = { patient: '#7C6EF8', doctor: '#16A34A', admin: '#D97706' };

const AdminDashboard = () => {
  const navigate = useNavigate();

  const roleStats = useFetch(getStatsByRole);
  const todayAppts = useFetch(getStatsAppointments, { start: todayStr(), end: todayStr() });
  const revenue = useFetch(getStatsRevenue);
  const trend = useFetch(getStatsAppointmentsMonthly);
  const topDoctors = useFetch(getChartTopDoctors, { top: 4 });
  const recent = useFetch(getAdminAppointments, { limit: 5, sort: '-id' });

  const byRole = useMemo(() => {
    const rows = roleStats.data || [];
    const get = (role) => parseInt(rows.find((r) => r.role === role)?.count) || 0;
    const patients = get('patient');
    const doctors = get('doctor');
    const admins = get('admin');
    const total = patients + doctors + admins;
    return { patients, doctors, admins, total };
  }, [roleStats.data]);

  const todaySummary = useMemo(() => {
    const rows = todayAppts.data || [];
    const total = rows.reduce((s, r) => s + (parseInt(r.count) || 0), 0);
    const completed = parseInt(rows.find((r) => r.status === 'completed')?.count) || 0;
    const pending = parseInt(rows.find((r) => r.status === 'pending')?.count) || 0;
    return { total, completed, pending };
  }, [todayAppts.data]);

  const latestMonthlyRevenue = revenue.data?.monthly?.[0];

  const trendMax = Math.max(1, ...(trend.data || []).map((t) => t.count));

  const isLoadingCore = roleStats.isLoading || todayAppts.isLoading || revenue.isLoading;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <WelcomeBanner
        role="admin"
        title="Platform Overview"
        subtitle={
          <>
            <span className="text-orange-200 font-semibold">{todaySummary.total} appointments</span> today · <span className="text-emerald-200 font-semibold">RM {latestMonthlyRevenue ? Number(latestMonthlyRevenue.total).toLocaleString() : '0'}</span> this month
          </>
        }
        action={
          <button onClick={() => navigate('/admin/stats')} className="px-4 py-2.5 rounded-[10px] bg-white text-orange-700 font-bold text-sm flex items-center gap-2 shadow-lg hover:shadow-xl transition-all">
            <BarChart2 size={16} /> View Stats
          </button>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={isLoadingCore ? '—' : byRole.total.toLocaleString()} sub="Across all roles" icon={Users} iconBg="#7C6EF8" delay={0} />
        <StatCard label="Active Doctors" value={isLoadingCore ? '—' : byRole.doctors.toLocaleString()} sub={`${byRole.patients.toLocaleString()} patients registered`} icon={Stethoscope} iconBg="#16A34A" delay={100} />
        <StatCard label="Today's Appointments" value={isLoadingCore ? '—' : todaySummary.total.toLocaleString()} sub={`${todaySummary.completed} completed · ${todaySummary.pending} pending`} icon={CalendarCheck} iconBg="#2563EB" delay={200} />
        <StatCard label="Monthly Revenue" value={isLoadingCore ? '—' : `RM ${latestMonthlyRevenue ? Number(latestMonthlyRevenue.total).toLocaleString() : '0'}`} sub="Paid bills, this month" icon={DollarSign} iconBg="#D97706" delay={300} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Appointments Chart */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-bold text-text-primary">Monthly Appointments</h3>
          </div>
          {trend.isLoading && (
            <div className="h-48 flex items-center justify-center">
              <Spinner />
            </div>
          )}
          {trend.error && <p className="text-sm text-text-muted py-6 text-center">Failed to load appointment trend.</p>}
          {!trend.isLoading && !trend.error && (!trend.data || trend.data.length === 0) && <p className="text-sm text-text-muted py-6 text-center">No appointment data yet.</p>}
          {!trend.isLoading && !trend.error && trend.data && trend.data.length > 0 && (
            <div className="h-48 flex items-end justify-between gap-2">
              {trend.data.map((point, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <span className="text-xs font-semibold text-text-secondary">{point.count}</span>
                  <div className="w-full bg-brand-600 rounded-t-lg transition-all hover:bg-brand-700" style={{ height: `${Math.max(4, (point.count / trendMax) * 100)}%` }} />
                  <span className="text-xs text-text-muted">{format(new Date(point.month), 'MMM')}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* User Distribution Donut */}
        <Card>
          <h3 className="text-[15px] font-bold text-text-primary mb-4">User Distribution</h3>
          {roleStats.isLoading ? (
            <div className="h-32 flex items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <div className="flex items-center gap-6">
              {/* SVG Donut */}
              <div className="relative w-32 h-32 flex-shrink-0">
                <svg viewBox="0 0 100 100" className="transform -rotate-90">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="#E5E7EB" className="dark:stroke-[#404040]" strokeWidth="18" />
                  {byRole.total > 0 && (
                    <>
                      <circle cx="50" cy="50" r="44" fill="none" stroke={ROLE_COLORS.patient} strokeWidth="18" strokeDasharray={`${(byRole.patients / byRole.total) * 276.46} 276.46`} strokeDashoffset="0" />
                      <circle cx="50" cy="50" r="44" fill="none" stroke={ROLE_COLORS.doctor} strokeWidth="18" strokeDasharray={`${(byRole.doctors / byRole.total) * 276.46} 276.46`} strokeDashoffset={`-${(byRole.patients / byRole.total) * 276.46}`} />
                      <circle cx="50" cy="50" r="44" fill="none" stroke={ROLE_COLORS.admin} strokeWidth="18" strokeDasharray={`${(byRole.admins / byRole.total) * 276.46} 276.46`} strokeDashoffset={`-${((byRole.patients + byRole.doctors) / byRole.total) * 276.46}`} />
                    </>
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-2xl font-extrabold text-text-primary tracking-tight">{byRole.total.toLocaleString()}</p>
                  <p className="text-xs text-text-muted">Total Users</p>
                </div>
              </div>

              {/* Legend */}
              <div className="flex-1 space-y-3">
                {[
                  { label: 'Patients', count: byRole.patients, color: ROLE_COLORS.patient },
                  { label: 'Doctors', count: byRole.doctors, color: ROLE_COLORS.doctor },
                  { label: 'Admins', count: byRole.admins, color: ROLE_COLORS.admin },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: row.color }} />
                      <span className="text-sm text-text-secondary">{row.label}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-text-primary">{row.count.toLocaleString()}</p>
                      <p className="text-xs text-text-muted">{byRole.total > 0 ? `${((row.count / byRole.total) * 100).toFixed(1)}%` : '0%'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Platform Management + Recent Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6">
        {/* Platform Management */}
        <Card>
          <CardHeader title="Platform Management" />
          <div className="mt-4 grid grid-cols-4 gap-3">
            {platformManagement.map((action) => (
              <QuickActionButton key={action.label} icon={action.icon} label={action.label} onClick={() => navigate(action.to)} iconColor={action.color} iconBgColor={action.bgColor} />
            ))}
          </div>
        </Card>

        {/* Recent Appointments */}
        <Card>
          <CardHeader
            title="Recent Appointments"
            action={
              <button onClick={() => navigate('/admin/appointments')} className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                View all
              </button>
            }
          />
          {recent.isLoading && (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          )}
          {!recent.isLoading && (!recent.data?.data || recent.data.data.length === 0) && <p className="text-sm text-text-muted text-center py-8">No appointments yet.</p>}
          {!recent.isLoading && recent.data?.data?.length > 0 && (
            <div className="mt-4 space-y-1">
              {recent.data.data.map((appt) => (
                <div key={appt.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-subtle transition-colors cursor-pointer" onClick={() => navigate('/admin/appointments')}>
                  <div className="w-[30px] h-[30px] rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
                    <CalendarCheck size={14} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {appt.patient_name} → {appt.doctor_name}
                    </p>
                    <p className="text-xs text-text-muted truncate">{appt.appointment_date ? format(new Date(appt.appointment_date), 'dd MMM yyyy') : '—'}</p>
                  </div>
                  <Badge variant={statusVariant(appt.status)} className="capitalize flex-shrink-0">
                    {appt.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Top Performing Doctors */}
      <Card>
        <CardHeader title="Top Performing Doctors" subtitle="By number of appointments" />
        {topDoctors.isLoading && (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        )}
        {!topDoctors.isLoading && (!topDoctors.data?.labels || topDoctors.data.labels.length === 0) && <p className="text-sm text-text-muted text-center py-8">No appointment data yet.</p>}
        {!topDoctors.isLoading && topDoctors.data?.labels?.length > 0 && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {topDoctors.data.labels.map((name, idx) => (
              <div key={name} className="flex flex-col items-center p-4 rounded-lg bg-surface-subtle hover:bg-surface-warm transition-colors cursor-pointer" onClick={() => navigate('/admin/doctor-subscriptions')}>
                <Avatar name={name} size={56} bg="#16A34A" />
                <p className="text-sm font-semibold text-text-primary mt-3 text-center">{name}</p>
                <p className="text-xs text-text-muted text-center mt-1">{topDoctors.data.values[idx]} appointments</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminDashboard;
