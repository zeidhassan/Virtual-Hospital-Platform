import { useNavigate } from 'react-router-dom';
import { Package, CreditCard, BarChart2, TrendingUp, Stethoscope, Clock,
         Shield, HelpCircle, Settings, CalendarCheck, Lock, Star } from 'lucide-react';
import Card from '@/components/ui/Card';

const AdminDashboard = () => {
  const navigate = useNavigate();

  const sections = [
    { icon: BarChart2,     label: 'Statistics',       to: '/admin/stats',               color: 'bg-blue-500' },
    { icon: TrendingUp,    label: 'Charts',           to: '/admin/charts',              color: 'bg-violet-500' },
    { icon: CalendarCheck, label: 'Appointments',     to: '/admin/appointments',        color: 'bg-sky-500' },
    { icon: CreditCard,    label: 'Billing',          to: '/admin/billing',             color: 'bg-emerald-500' },
    { icon: Star,          label: 'Doctor Plans',     to: '/admin/doctor-plans',        color: 'bg-brand-600' },
    { icon: Stethoscope,   label: 'Subscriptions',    to: '/admin/doctor-subscriptions', color: 'bg-teal-600' },
    { icon: Clock,         label: 'Doctor Slots',     to: '/admin/doctor-time-slots',   color: 'bg-slate-500' },
    { icon: Shield,        label: 'Insurance',        to: '/admin/insurance',           color: 'bg-teal-700' },
    { icon: HelpCircle,    label: 'Questions',        to: '/admin/questions',           color: 'bg-rose-500' },
    { icon: Package,       label: 'Pharmacy Orders',  to: '/admin/orders',              color: 'bg-amber-500' },
    { icon: Lock,          label: 'Passwords',        to: '/admin/passwords',           color: 'bg-gray-500' },
    { icon: Settings,      label: 'Database',         to: '/admin/database',            color: 'bg-gray-400' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="text-text-secondary mt-1">Platform management and oversight</p>
      </div>

      <Card>
        <h2 className="section-title mb-4">Platform Management</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-2">
          {sections.map(({ icon: Icon, label, to, color }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-surface-subtle transition-colors group"
            >
              <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center`}>
                <Icon size={20} className="text-white" />
              </div>
              <span className="text-xs font-medium text-text-secondary text-center group-hover:text-text-primary">{label}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default AdminDashboard;
