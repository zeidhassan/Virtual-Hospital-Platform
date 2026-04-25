import { useNavigate } from 'react-router-dom';
import { Users, Calendar, FileText, Pill, MessageSquare, Clock, Star, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Card from '@/components/ui/Card';

const QuickAction = ({ icon: Icon, label, to, color }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-transparent hover:border-brand-100 hover:bg-brand-50 transition-all duration-150 group"
    >
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
        <Icon size={22} className="text-white" />
      </div>
      <span className="text-xs font-medium text-text-secondary group-hover:text-brand-700 text-center">{label}</span>
    </button>
  );
};

const DoctorDashboard = () => {
  const { user } = useAuth();

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const actions = [
    { icon: Users, label: 'My Patients', to: '/doctor/patients', color: 'bg-brand-600' },
    { icon: Calendar, label: 'Appointments', to: '/doctor/appointments', color: 'bg-blue-500' },
    { icon: FileText, label: 'Medical Records', to: '/doctor/medical-records', color: 'bg-violet-500' },
    { icon: Pill, label: 'Prescriptions', to: '/doctor/prescriptions', color: 'bg-emerald-500' },
    { icon: MessageSquare, label: 'Patient Answers', to: '/doctor/patient-answers', color: 'bg-amber-500' },
    { icon: Clock, label: 'Time Slots', to: '/doctor/time-slots', color: 'bg-slate-500' },
    { icon: Star, label: 'Subscription', to: '/doctor/subscription', color: 'bg-rose-500' },
    { icon: Shield, label: 'Insurance', to: '/doctor/insurance', color: 'bg-teal-600' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">{greeting()}, Dr. {user?.name?.split(' ')[0] || 'there'}</h1>
        <p className="text-text-secondary mt-1">Manage your patients and clinical work</p>
      </div>

      <Card>
        <h2 className="section-title mb-4">Quick Access</h2>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {actions.map((action) => (
            <QuickAction key={action.to} {...action} />
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-text-secondary">Today&apos;s Appointments</p>
          <p className="text-3xl font-bold text-text-primary mt-1">—</p>
          <p className="text-xs text-text-muted mt-1">View in Appointments</p>
        </Card>
        <Card>
          <p className="text-sm text-text-secondary">Pending Reviews</p>
          <p className="text-3xl font-bold text-text-primary mt-1">—</p>
          <p className="text-xs text-text-muted mt-1">Patient answers awaiting review</p>
        </Card>
        <Card>
          <p className="text-sm text-text-secondary">Active Plan</p>
          <p className="text-3xl font-bold text-text-primary mt-1">—</p>
          <p className="text-xs text-text-muted mt-1">Manage in Subscription</p>
        </Card>
      </div>
    </div>
  );
};

export default DoctorDashboard;
