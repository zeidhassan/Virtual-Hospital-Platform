import { useNavigate } from 'react-router-dom';
import { CalendarPlus, CalendarCheck, FileText, Pill, ShoppingBag, HelpCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Card from '@/components/ui/Card';

const QuickAction = ({ icon: Icon, label, to, color }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-transparent hover:border-brand-100 hover:bg-brand-50 transition-all duration-150 group`}
    >
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
        <Icon size={22} className="text-white" />
      </div>
      <span className="text-xs font-medium text-text-secondary group-hover:text-brand-700">{label}</span>
    </button>
  );
};

const PatientDashboard = () => {
  const { user } = useAuth();

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const actions = [
    { icon: CalendarPlus, label: 'Book Appointment', to: '/patient/book-appointment', color: 'bg-brand-600' },
    { icon: CalendarCheck, label: 'My Appointments', to: '/patient/my-appointments', color: 'bg-blue-500' },
    { icon: FileText, label: 'Medical Records', to: '/patient/medical-records', color: 'bg-violet-500' },
    { icon: Pill, label: 'Prescriptions', to: '/patient/prescriptions', color: 'bg-emerald-500' },
    { icon: ShoppingBag, label: 'Place Order', to: '/patient/place-order', color: 'bg-amber-500' },
    { icon: HelpCircle, label: 'Health Questions', to: '/patient/answer-questions', color: 'bg-rose-500' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div>
        <h1 className="page-title">{greeting()}, {user?.name?.split(' ')[0] || 'there'}</h1>
        <p className="text-text-secondary mt-1">Here&apos;s an overview of your health portal</p>
      </div>

      {/* Quick actions */}
      <Card>
        <h2 className="section-title mb-4">Quick Actions</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {actions.map((action) => (
            <QuickAction key={action.to} {...action} />
          ))}
        </div>
      </Card>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="sm:col-span-1">
          <p className="text-sm text-text-secondary">Upcoming Appointments</p>
          <p className="text-3xl font-bold text-text-primary mt-1">—</p>
          <p className="text-xs text-text-muted mt-1">Visit My Appointments to view</p>
        </Card>
        <Card className="sm:col-span-1">
          <p className="text-sm text-text-secondary">Active Prescriptions</p>
          <p className="text-3xl font-bold text-text-primary mt-1">—</p>
          <p className="text-xs text-text-muted mt-1">Check your prescriptions tab</p>
        </Card>
        <Card className="sm:col-span-1">
          <p className="text-sm text-text-secondary">Pending Orders</p>
          <p className="text-3xl font-bold text-text-primary mt-1">—</p>
          <p className="text-xs text-text-muted mt-1">Track your pharmacy orders</p>
        </Card>
      </div>
    </div>
  );
};

export default PatientDashboard;
