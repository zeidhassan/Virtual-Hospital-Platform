import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, Pill, Package, Bell, Calendar, Zap, FileText, ShoppingCart, Activity, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getMyAppointments } from '@/api/appointments';
import { getPrescriptions } from '@/api/prescriptions';
import { getMyOrders } from '@/api/pharmacy';
import { getUnreadCount } from '@/api/notifications';
import useFetch from '@/hooks/useFetch';
import WelcomeBanner from '@/components/ui/WelcomeBanner';
import StatCard from '@/components/ui/StatCard';
import QuickActionButton from '@/components/ui/QuickActionButton';
import Card, { CardHeader } from '@/components/ui/Card';
import Badge, { statusVariant } from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { format, isFuture, isToday, parseISO } from 'date-fns';

const quickActions = [
  { icon: Calendar, label: 'Book Appointment', to: '/patient/book-appointment', color: '#7C6EF8', bgColor: '#F0EEFF' },
  { icon: Zap, label: 'AVA Triage', to: '/patient/triage', color: '#16A34A', bgColor: '#DCFCE7' },
  { icon: Pill, label: 'Prescriptions', to: '/patient/prescriptions', color: '#2563EB', bgColor: '#DBEAFE' },
  { icon: ShoppingCart, label: 'Place Order', to: '/patient/place-order', color: '#D97706', bgColor: '#FEF3C7' },
  { icon: FileText, label: 'Medical Records', to: '/patient/medical-records', color: '#DC2626', bgColor: '#FEE2E2' },
  { icon: Activity, label: 'Care Timeline', to: '/patient/consultation-history', color: '#0891B2', bgColor: '#CFFAFE' },
];

const statusBorderColor = (status) => {
  if (status === 'confirmed' || status === 'completed') return 'border-l-green-500';
  if (status === 'pending' || status === 'scheduled') return 'border-l-amber-500';
  if (status === 'cancelled') return 'border-l-red-500';
  return 'border-l-slate-300';
};

const isUpcoming = (appt) => {
  if (appt.status === 'cancelled' || appt.status === 'completed') return false;
  try {
    const d = parseISO(appt.appointment_date);
    return isFuture(d) || isToday(d);
  } catch {
    return false;
  }
};

const PatientDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const appts = useFetch(getMyAppointments, { limit: 50, sort: '+appointment_date' });
  const rx = useFetch(getPrescriptions, { limit: 50 });
  const orders = useFetch(getMyOrders, { limit: 50 });
  const unread = useFetch(getUnreadCount);

  const upcomingAppts = useMemo(() => (appts.data?.data || []).filter(isUpcoming).slice(0, 3), [appts.data]);
  const upcomingCount = useMemo(() => (appts.data?.data || []).filter(isUpcoming).length, [appts.data]);

  const activeRx = useMemo(() => (rx.data?.data || []).filter((p) => !p.limit_reached), [rx.data]);

  const pendingOrders = useMemo(() => (orders.data?.data || []).filter((o) => ['pending', 'processing'].includes(o.status)), [orders.data]);

  const recentRx = useMemo(() => [...(rx.data?.data || [])].sort((a, b) => new Date(b.issued_date) - new Date(a.issued_date)).slice(0, 4), [rx.data]);

  const isLoadingCore = appts.isLoading || rx.isLoading || orders.isLoading;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <WelcomeBanner
        role="patient"
        title={`${greeting()}, ${user?.name?.split(' ')[0] || 'there'}`}
        subtitle={
          upcomingCount > 0 ? (
            <>
              You have{' '}
              <span className="text-indigo-200 font-semibold">
                {upcomingCount} upcoming appointment{upcomingCount === 1 ? '' : 's'}
              </span>
            </>
          ) : (
            'No upcoming appointments — book one when you need care.'
          )
        }
        action={
          <button onClick={() => navigate('/patient/triage')} className="px-4 py-2.5 rounded-[10px] bg-white text-brand-700 font-bold text-sm flex items-center gap-2 shadow-lg hover:shadow-xl transition-all">
            <Zap size={16} /> Start AVA Triage
          </button>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Upcoming Appointments" value={isLoadingCore ? '—' : upcomingCount} sub={upcomingAppts[0] ? `Next: ${format(parseISO(upcomingAppts[0].appointment_date), 'MMM dd')}` : 'None scheduled'} icon={CalendarCheck} iconBg="#7C6EF8" delay={0} />
        <StatCard label="Active Prescriptions" value={isLoadingCore ? '—' : activeRx.length} sub={rx.data?.data?.length ? `${rx.data.data.length} total issued` : 'None yet'} icon={Pill} iconBg="#16A34A" delay={100} />
        <StatCard label="Pending Orders" value={isLoadingCore ? '—' : pendingOrders.length} sub={pendingOrders.length > 0 ? 'Being processed' : 'Nothing pending'} icon={Package} iconBg="#D97706" delay={200} />
        <StatCard label="Notifications" value={unread.isLoading ? '—' : (unread.data?.count ?? 0)} sub="Unread" icon={Bell} iconBg="#DC2626" delay={300} />
      </div>

      {/* Two-column section */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
        {/* Upcoming Appointments */}
        <Card>
          <CardHeader
            title="Upcoming Appointments"
            action={
              <button onClick={() => navigate('/patient/my-appointments')} className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                View all
              </button>
            }
          />
          {appts.isLoading && (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          )}
          {!appts.isLoading && upcomingAppts.length === 0 && <EmptyState icon={CalendarCheck} title="No upcoming appointments" description="Book an appointment with a doctor to get started." action={{ label: 'Book Appointment', onClick: () => navigate('/patient/book-appointment') }} />}
          {!appts.isLoading && upcomingAppts.length > 0 && (
            <div className="mt-4 space-y-3">
              {upcomingAppts.map((appt) => (
                <div key={appt.id} className={`flex items-center gap-3 p-3 rounded-lg border-l-[5px] ${statusBorderColor(appt.status)} bg-surface-subtle hover:bg-surface-warm transition-colors cursor-pointer`} onClick={() => navigate('/patient/my-appointments')}>
                  <Avatar name={appt.doctor_name} size={40} bg="#0F6644" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">{appt.doctor_name}</p>
                    <p className="text-xs text-text-muted truncate">{appt.specialization || 'General Practice'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock size={12} className="text-text-muted" />
                      <p className="text-xs text-text-secondary">
                        {format(parseISO(appt.appointment_date), 'MMM dd, yyyy')} · {appt.appointment_start_time?.slice(0, 5)}
                      </p>
                    </div>
                  </div>
                  <Badge variant={statusVariant(appt.status)}>{appt.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader title="Quick Actions" />
          <div className="mt-4 grid grid-cols-3 gap-3">
            {quickActions.map((action) => (
              <QuickActionButton key={action.to} icon={action.icon} label={action.label} onClick={() => navigate(action.to)} iconColor={action.color} iconBgColor={action.bgColor} />
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Prescriptions */}
      <Card>
        <CardHeader
          title="Recent Prescriptions"
          action={
            <button onClick={() => navigate('/patient/prescriptions')} className="text-xs font-semibold text-brand-600 hover:text-brand-700">
              View all
            </button>
          }
        />
        {rx.isLoading && (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        )}
        {!rx.isLoading && recentRx.length === 0 && <p className="text-sm text-text-muted text-center py-8">No prescriptions yet.</p>}
        {!rx.isLoading && recentRx.length > 0 && (
          <div className="mt-4 space-y-2">
            {recentRx.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-subtle transition-colors cursor-pointer" onClick={() => navigate('/patient/prescriptions')}>
                <div className="w-[34px] h-[34px] rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0">
                  <Pill size={16} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">{p.medication}</p>
                  <p className="text-xs text-text-muted truncate">{p.dosage}</p>
                </div>
                <span className="text-xs text-text-muted whitespace-nowrap">{p.issued_date ? format(new Date(p.issued_date), 'MMM dd, yyyy') : '—'}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default PatientDashboard;
