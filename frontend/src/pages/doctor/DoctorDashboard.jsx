import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, FileText, AlertTriangle, CalendarCheck, Pill, MessageSquare, Clock, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getDoctorAppointments } from '@/api/appointments';
import { getDoctorPatients, getPatientAnswers, getMySubscription } from '@/api/doctor';
import { getEscalatedSessions } from '@/api/triage';
import useFetch from '@/hooks/useFetch';
import WelcomeBanner from '@/components/ui/WelcomeBanner';
import StatCard from '@/components/ui/StatCard';
import QuickActionButton from '@/components/ui/QuickActionButton';
import Card, { CardHeader } from '@/components/ui/Card';
import Badge, { statusVariant } from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { format, formatDistanceToNow } from 'date-fns';

const todayStr = () => new Date().toISOString().slice(0, 10);

const quickActions = [
  { icon: Users, label: 'My Patients', to: '/doctor/patients', color: '#7C6EF8', bgColor: '#F0EEFF' },
  { icon: FileText, label: 'Medical Records', to: '/doctor/medical-records', color: '#2563EB', bgColor: '#DBEAFE' },
  { icon: Pill, label: 'Prescriptions', to: '/doctor/prescriptions', color: '#16A34A', bgColor: '#DCFCE7' },
  { icon: MessageSquare, label: 'Patient Answers', to: '/doctor/patient-answers', color: '#D97706', bgColor: '#FEF3C7' },
  { icon: Clock, label: 'Time Slots', to: '/doctor/time-slots', color: '#DC2626', bgColor: '#FEE2E2' },
  { icon: Star, label: 'Subscription', to: '/doctor/subscription', color: '#0891B2', bgColor: '#CFFAFE' },
];

const statusColor = (status) => {
  if (status === 'completed') return 'border-slate-300';
  if (status === 'confirmed' || status === 'scheduled') return 'border-green-500';
  return 'border-slate-300';
};

const urgencyBadgeVariant = (urgency) => {
  if (urgency === 'emergency') return 'danger';
  if (urgency === 'urgent') return 'warning';
  return 'default';
};

const DoctorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const today = useFetch(getDoctorAppointments, { appointment_date: todayStr(), limit: 50, sort: '+appointment_start_time' });
  const patients = useFetch(getDoctorPatients, { limit: 1 });
  const answers = useFetch(getPatientAnswers);
  const triage = useFetch(getEscalatedSessions);
  const sub = useFetch(getMySubscription);

  const todaysSchedule = today.data?.data || [];
  const todayCompleted = todaysSchedule.filter((a) => a.status === 'completed').length;
  const todayUpcoming = todaysSchedule.filter((a) => a.status !== 'completed' && a.status !== 'cancelled').length;

  const escalatedTriage = useMemo(() => (triage.data?.data || []).slice(0, 3), [triage.data]);

  const activePlan = sub.data?.plan_name;
  const planStatus = sub.data?.status;

  const isLoadingCore = today.isLoading || patients.isLoading || answers.isLoading;

  // Doctors' stored full_name already includes the "Dr." honorific (e.g. "Dr. Stephen Strange").
  const firstName = user?.name?.replace(/^Dr\.?\s+/i, '').split(' ')[0];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <WelcomeBanner
        role="doctor"
        title={`${greeting()}, Dr. ${firstName || 'there'}`}
        subtitle={
          <>
            You have{' '}
            <span className="text-emerald-200 font-semibold">
              {todayUpcoming} appointment{todayUpcoming === 1 ? '' : 's'}
            </span>{' '}
            remaining today
            {escalatedTriage.length > 0 && (
              <>
                {' '}
                and{' '}
                <span className="text-red-200 font-semibold">
                  {escalatedTriage.length} triage alert{escalatedTriage.length === 1 ? '' : 's'}
                </span>
              </>
            )}
          </>
        }
        action={
          <button onClick={() => navigate(escalatedTriage.length > 0 ? '/doctor/triage-escalated' : '/doctor/appointments')} className="px-4 py-2.5 rounded-[10px] bg-white text-emerald-700 font-bold text-sm flex items-center gap-2 shadow-lg hover:shadow-xl transition-all">
            {escalatedTriage.length > 0 ? <AlertTriangle size={16} /> : <Calendar size={16} />}
            {escalatedTriage.length > 0 ? `${escalatedTriage.length} Triage Alert${escalatedTriage.length === 1 ? '' : 's'}` : 'View Schedule'}
          </button>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Today's Appointments" value={isLoadingCore ? '—' : todaysSchedule.length} sub={`${todayCompleted} done · ${todayUpcoming} remaining`} icon={CalendarCheck} iconBg="#16A34A" delay={0} />
        <StatCard label="Total Patients" value={isLoadingCore ? '—' : (patients.data?.totalItems ?? 0)} sub="Under your care" icon={Users} iconBg="#2563EB" delay={100} />
        <StatCard label="Patient Answers" value={isLoadingCore ? '—' : (answers.data?.length ?? 0)} sub="Questionnaire responses" icon={MessageSquare} iconBg="#7C6EF8" delay={200} />
        <StatCard label="Subscription Plan" value={sub.isLoading ? '—' : activePlan || 'None'} sub={sub.isLoading ? '' : planStatus ? `Status: ${planStatus}` : 'No active plan'} icon={Star} iconBg="#D97706" delay={300} />
      </div>

      {/* Two-column section */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
        {/* Today's Schedule */}
        <Card>
          <CardHeader
            title="Today's Schedule"
            action={
              <button onClick={() => navigate('/doctor/appointments')} className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                View all
              </button>
            }
          />
          {today.isLoading && (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          )}
          {!today.isLoading && todaysSchedule.length === 0 && <EmptyState icon={CalendarCheck} title="No appointments today" description="Your schedule is clear for today." />}
          {!today.isLoading && todaysSchedule.length > 0 && (
            <div className="mt-4 space-y-3">
              {todaysSchedule.map((appt) => (
                <div key={appt.id} className={`flex items-center gap-3 p-3 rounded-lg border-l-2 ${statusColor(appt.status)} bg-surface-subtle hover:bg-surface-warm transition-colors cursor-pointer`} onClick={() => navigate('/doctor/appointments')}>
                  <div className="min-w-[55px] text-right">
                    <p className="text-sm font-semibold text-text-muted">{appt.appointment_start_time?.slice(0, 5)}</p>
                  </div>
                  <Avatar name={appt.patient_name} size={32} bg="#4C1D95" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">{appt.patient_name}</p>
                    <p className="text-xs text-text-muted truncate">{appt.notes || 'Appointment'}</p>
                  </div>
                  <Badge variant={statusVariant(appt.status)}>{appt.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Right column */}
        <div className="space-y-4">
          {/* Escalated Triage Alert */}
          {escalatedTriage.length > 0 && (
            <Card className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50">
              <div className="flex items-center gap-2 mb-3">
                <div className="relative">
                  <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                  <div className="absolute inset-0 w-2 h-2 rounded-full bg-red-600 animate-ping" />
                </div>
                <h3 className="text-[15px] font-bold text-text-primary">Escalated Triage</h3>
                <Badge variant="danger" className="ml-auto">
                  {escalatedTriage.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {escalatedTriage.map((item) => (
                  <div key={item.id} className="p-3 rounded-lg bg-white dark:bg-[#2A2A2A] border border-red-100 dark:border-red-900/50 hover:border-red-300 dark:hover:border-red-800 transition-colors cursor-pointer" onClick={() => navigate('/doctor/triage-escalated')}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-semibold text-text-primary">{item.patient_name}</p>
                      <Badge variant={urgencyBadgeVariant(item.urgency_level)} size="sm">
                        {item.urgency_level}
                      </Badge>
                    </div>
                    <p className="text-xs text-text-secondary mb-2 line-clamp-2">{item.symptoms_text}</p>
                    <p className="text-xs text-text-muted">{item.created_at ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true }) : ''}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Quick Access */}
          <Card>
            <CardHeader title="Quick Access" />
            <div className="mt-4 grid grid-cols-3 gap-3">
              {quickActions.map((action) => (
                <QuickActionButton key={action.to} icon={action.icon} label={action.label} onClick={() => navigate(action.to)} iconColor={action.color} iconBgColor={action.bgColor} />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
