import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, CalendarPlus, CalendarCheck, FileText,
  Pill, ShoppingBag, Package, HelpCircle, MessageSquare, CreditCard,
  Users, ClipboardList, Star, Clock, Shield, BarChart2, TrendingUp,
  Settings, LogOut, ChevronRight, UserCircle, Stethoscope, Activity, AlertTriangle, Ticket, Lock, Heart,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/hooks/useAuth';

const PATIENT_NAV = [
  { to: '/patient/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/patient/book-appointment', label: 'Book Appointment', icon: CalendarPlus },
  { to: '/patient/my-appointments', label: 'My Appointments', icon: CalendarCheck },
  { to: '/patient/medical-records', label: 'Medical Records', icon: FileText },
  { to: '/patient/prescriptions', label: 'Prescriptions', icon: Pill },
  { to: '/patient/place-order', label: 'Place Order', icon: ShoppingBag },
  { to: '/patient/my-orders', label: 'My Orders', icon: Package },
  { to: '/patient/answer-questions', label: 'Health Questions', icon: HelpCircle },
  { to: '/patient/billing', label: 'Billing', icon: CreditCard },
  { to: '/patient/payment-methods', label: 'Payment Methods', icon: CreditCard },
  { to: '/patient/triage', label: 'AVA Triage', icon: Activity },
  { to: '/patient/triage-history', label: 'Triage History', icon: ClipboardList },
  { to: '/patient/insurance', label: 'Insurance', icon: Shield },
  { to: '/patient/support-tickets', label: 'Support Tickets', icon: Ticket },
  { to: '/patient/follow-ups', label: 'Follow-Ups', icon: ClipboardList },
  { to: '/patient/health-logs', label: 'Health Logs', icon: Activity },
  { to: '/patient/consultation-history', label: 'Care Timeline', icon: Clock },
];

const DOCTOR_NAV = [
  { to: '/doctor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/doctor/patients', label: 'My Patients', icon: Users },
  { to: '/doctor/appointments', label: 'Appointments', icon: Calendar },
  { to: '/doctor/medical-records', label: 'Medical Records', icon: FileText },
  { to: '/doctor/prescriptions', label: 'Prescriptions', icon: Pill },
  { to: '/doctor/patient-answers', label: 'Patient Answers', icon: MessageSquare },
  { to: '/doctor/suggest-questions', label: 'Suggest Questions', icon: HelpCircle },
  { to: '/doctor/time-slots', label: 'Time Slots', icon: Clock },
  { to: '/doctor/subscription', label: 'My Subscription', icon: Star },
  { to: '/doctor/insurance', label: 'Insurance', icon: Shield },
  { to: '/doctor/triage-escalated', label: 'Escalated Triage', icon: AlertTriangle },
  { to: '/doctor/follow-ups', label: 'Follow-Ups', icon: ClipboardList },
  { to: '/doctor/patient-timeline', label: 'Patient Timeline', icon: Clock },
];

const ADMIN_NAV = [
  { to: '/admin/dashboard',            label: 'Dashboard',          icon: LayoutDashboard },
  { to: '/admin/stats',                label: 'Statistics',         icon: BarChart2 },
  { to: '/admin/charts',               label: 'Charts',             icon: TrendingUp },
  { to: '/admin/appointments',         label: 'Appointments',       icon: CalendarCheck },
  { to: '/admin/billing',              label: 'Billing',            icon: CreditCard },
  { to: '/admin/doctor-plans',         label: 'Doctor Plans',       icon: Star },
  { to: '/admin/doctor-subscriptions', label: 'Subscriptions',      icon: Stethoscope },
  { to: '/admin/doctor-time-slots',    label: 'Doctor Slots',       icon: Clock },
  { to: '/admin/insurance',            label: 'Insurance',          icon: Shield },
  { to: '/admin/questions',            label: 'Questions',          icon: HelpCircle },
  { to: '/admin/orders',               label: 'Pharmacy Orders',    icon: Package },
  { to: '/admin/passwords',            label: 'Passwords',          icon: Lock },
  { to: '/admin/database',             label: 'Database',           icon: Settings },
  { to: '/admin/triage-sessions',      label: 'Triage Sessions',    icon: Activity },
  { to: '/admin/triage-rules',         label: 'Triage Rules',       icon: AlertTriangle },
  { to: '/admin/follow-ups',           label: 'Follow-Ups',         icon: ClipboardList },
  { to: '/admin/consultation-history', label: 'Care Timeline',      icon: Clock },
];

const NAV_BY_ROLE = {
  patient: PATIENT_NAV,
  doctor: DOCTOR_NAV,
  admin: ADMIN_NAV,
};

const NavItem = ({ to, label, icon: Icon }) => (
  <NavLink
    to={to}
    className={({ isActive }) => clsx(
      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
      isActive
        ? 'bg-brand-50 text-brand-700'
        : 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary'
    )}
  >
    <Icon size={18} className="flex-shrink-0" />
    <span className="truncate">{label}</span>
  </NavLink>
);

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = NAV_BY_ROLE[user?.role] || [];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={clsx(
        'fixed inset-y-0 left-0 z-30 w-64 bg-surface border-r border-slate-100 flex flex-col',
        'transition-transform duration-300 ease-in-out',
        'lg:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-100 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
              <path d="M12 2a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0V8H8a1 1 0 010-2h3V3a1 1 0 011-1z"/>
            </svg>
          </div>
          <span className="font-bold text-text-primary">HelixaCare</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>

        {/* User section */}
        <div className="flex-shrink-0 border-t border-slate-100 p-3 space-y-1">
          <NavLink
            to="/profile"
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
              isActive
                ? 'bg-brand-50 text-brand-700'
                : 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary'
            )}
          >
            <UserCircle size={18} />
            <div className="min-w-0">
              <p className="truncate font-medium text-text-primary">{user?.name || user?.email}</p>
              <p className="text-xs text-text-muted capitalize">{user?.role}</p>
            </div>
            <ChevronRight size={16} className="ml-auto flex-shrink-0 text-text-muted" />
          </NavLink>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:bg-red-50 hover:text-red-600 transition-colors duration-150"
          >
            <LogOut size={18} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
