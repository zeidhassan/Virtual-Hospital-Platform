import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, CalendarPlus, CalendarCheck, FileText,
  Pill, ShoppingBag, Package, HelpCircle, MessageSquare, CreditCard,
  Users, ClipboardList, Star, Clock, Shield, BarChart2, TrendingUp,
  Settings, LogOut, ChevronLeft, ChevronRight, UserCircle, Stethoscope, Activity, AlertTriangle, Ticket, Heart, Zap, Mail,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/hooks/useAuth';
import Avatar from '@/components/ui/Avatar';

const PATIENT_NAV = [
  { group: 'Overview', items: [
    { to: '/patient/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ]},
  { group: 'Healthcare', items: [
    { to: '/patient/book-appointment', label: 'Book Appointment', icon: CalendarPlus },
    { to: '/patient/my-appointments', label: 'My Appointments', icon: CalendarCheck },
    { to: '/patient/my-follow-ups', label: 'Follow-Ups', icon: Calendar },
    { to: '/patient/medical-records', label: 'Medical Records', icon: FileText },
    { to: '/patient/prescriptions', label: 'Prescriptions', icon: Pill },
  ]},
  { group: 'AVA Triage', items: [
    { to: '/patient/triage', label: 'AVA Triage', icon: Zap },
    { to: '/patient/triage-history', label: 'Triage History', icon: ClipboardList },
  ]},
  { group: 'Orders', items: [
    { to: '/patient/place-order', label: 'Place Order', icon: ShoppingBag },
    { to: '/patient/my-orders', label: 'My Orders', icon: Package },
    { to: '/patient/billing', label: 'Billing', icon: CreditCard },
    { to: '/patient/payment-methods', label: 'Payment Methods', icon: CreditCard },
  ]},
  { group: 'Care', items: [
    { to: '/patient/health-logs', label: 'Health Logs', icon: Activity },
    { to: '/patient/health-programs', label: 'Health Programs', icon: Stethoscope },
    { to: '/patient/consultation-history', label: 'Care Timeline', icon: Heart },
    { to: '/patient/answer-questions', label: 'Health Questions', icon: HelpCircle },
    { to: '/patient/my-answers', label: 'My Answers', icon: MessageSquare },
  ]},
  { group: 'Support', items: [
    { to: '/patient/insurance', label: 'Insurance', icon: Shield },
    { to: '/patient/support-tickets', label: 'Support', icon: Ticket },
    { to: '/patient/messages', label: 'Messages', icon: Mail },
  ]},
];

const DOCTOR_NAV = [
  { group: 'Overview', items: [
    { to: '/doctor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ]},
  { group: 'Patients', items: [
    { to: '/doctor/patients', label: 'My Patients', icon: Users },
    { to: '/doctor/appointments', label: 'Appointments', icon: Calendar },
    { to: '/doctor/follow-ups', label: 'Follow-Ups', icon: CalendarCheck },
    { to: '/doctor/medical-records', label: 'Medical Records', icon: FileText },
    { to: '/doctor/prescriptions', label: 'Prescriptions', icon: Pill },
    { to: '/doctor/pharmacy-orders', label: 'Pharmacy Orders', icon: Package },
    { to: '/doctor/messages', label: 'Messages', icon: Mail },
  ]},
  { group: 'Clinical', items: [
    { to: '/doctor/triage-escalated', label: 'Escalated Triage', icon: AlertTriangle },
    { to: '/doctor/patient-timeline', label: 'Patient Timeline', icon: Heart },
    { to: '/doctor/patient-answers', label: 'Patient Answers', icon: MessageSquare },
    { to: '/doctor/suggest-questions', label: 'Suggest Question', icon: HelpCircle },
  ]},
  { group: 'Practice', items: [
    { to: '/doctor/time-slots', label: 'Time Slots', icon: Calendar },
    { to: '/doctor/plans', label: 'Available Plans', icon: ClipboardList },
    { to: '/doctor/subscription', label: 'Subscription', icon: Star },
    { to: '/doctor/insurance', label: 'Insurance', icon: Shield },
  ]},
];

const ADMIN_NAV = [
  { group: 'Overview', items: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/stats', label: 'Statistics', icon: BarChart2 },
    { to: '/admin/charts', label: 'Charts', icon: TrendingUp },
  ]},
  { group: 'Operations', items: [
    { to: '/admin/appointments', label: 'Appointments', icon: CalendarCheck },
    { to: '/admin/follow-ups', label: 'Follow-Ups', icon: CalendarPlus },
    { to: '/admin/consultation-history', label: 'Consultation History', icon: Heart },
    { to: '/admin/billing', label: 'Billing', icon: CreditCard },
    { to: '/admin/orders', label: 'Pharmacy Orders', icon: Package },
  ]},
  { group: 'Doctors', items: [
    { to: '/admin/doctor-plans', label: 'Doctor Plans', icon: Star },
    { to: '/admin/doctor-subscriptions', label: 'Subscriptions', icon: Stethoscope },
    { to: '/admin/doctor-time-slots', label: 'Doctor Slots', icon: Clock },
  ]},
  { group: 'System', items: [
    { to: '/admin/insurance', label: 'Insurance', icon: Shield },
    { to: '/admin/support-tickets', label: 'Support Tickets', icon: Ticket },
    { to: '/admin/messages', label: 'Messages', icon: Mail },
    { to: '/admin/triage-sessions', label: 'Triage Sessions', icon: Zap },
    { to: '/admin/triage-rules', label: 'Triage Rules', icon: ClipboardList },
    { to: '/admin/questions', label: 'Question Bank', icon: HelpCircle },
    { to: '/admin/database', label: 'Database', icon: Settings },
  ]},
];

const NAV_BY_ROLE = {
  patient: PATIENT_NAV,
  doctor: DOCTOR_NAV,
  admin: ADMIN_NAV,
};

const ROLE_THEMES = {
  patient: {
    gradient: 'linear-gradient(175deg, #2D2580 0%, #3D196E 100%)',
    activeHighlight: 'rgba(165,180,252,.18)',
    activeText: '#E0E7FF',
    idleText: 'rgba(255,255,255,.65)',
    activeDot: '#818CF8',
    avatarAccent: '#A5B4FC',
  },
  doctor: {
    gradient: 'linear-gradient(175deg, #134E35 0%, #1B7A5E 100%)',
    activeHighlight: 'rgba(110,231,183,.18)',
    activeText: '#D1FAE5',
    idleText: 'rgba(255,255,255,.65)',
    activeDot: '#34D399',
    avatarAccent: '#6EE7B7',
  },
  admin: {
    gradient: 'linear-gradient(175deg, #7C2D12 0%, #A33C18 100%)',
    activeHighlight: 'rgba(253,186,116,.18)',
    activeText: '#FED7AA',
    idleText: 'rgba(255,255,255,.65)',
    activeDot: '#FB923C',
    avatarAccent: '#FDBA74',
  },
};

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const navGroups = NAV_BY_ROLE[user?.role] || [];
  const theme = ROLE_THEMES[user?.role] || ROLE_THEMES.patient;

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved) setCollapsed(saved === 'true');
  }, []);

  const toggleCollapse = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-30 flex flex-col',
          'transition-all duration-300 ease-in-out',
          'lg:translate-x-0',
          collapsed ? 'w-[72px]' : 'w-[264px]',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ background: theme.gradient }}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-3.5 h-[60px] border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[9px] bg-white/15 flex items-center justify-center flex-shrink-0">
              <Pill size={17} className="text-white" />
            </div>
            {!collapsed && (
              <span className="font-extrabold text-white text-base tracking-tight">HelixaCare</span>
            )}
          </div>
          <button
            onClick={toggleCollapse}
            className="w-[26px] h-[26px] rounded-md bg-white/10 flex items-center justify-center text-white hover:bg-white/15 transition-colors flex-shrink-0"
          >
            {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-2.5">
          {navGroups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
              {!collapsed && (
                <div className="text-[10px] font-bold tracking-wider text-white/30 px-2 mb-1 uppercase">
                  {group.group}
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => clsx(
                      'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all',
                      collapsed ? 'justify-center' : 'justify-start',
                      isActive
                        ? 'text-white font-semibold'
                        : 'hover:bg-white/8'
                    )}
                    style={({ isActive }) => ({
                      background: isActive ? theme.activeHighlight : 'transparent',
                      color: isActive ? theme.activeText : theme.idleText,
                    })}
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon size={15} className="flex-shrink-0" />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                        {!collapsed && isActive && (
                          <span
                            className="w-1.5 h-1.5 rounded-full ml-auto flex-shrink-0"
                            style={{ background: theme.activeDot }}
                          />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User section */}
        <div className="flex-shrink-0 border-t border-white/10 p-2 space-y-0.5">
          <NavLink
            to="/profile"
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors hover:bg-white/8"
            style={{ color: theme.idleText, justifyContent: collapsed ? 'center' : 'flex-start' }}
          >
            <Avatar
              name={user?.name || user?.email || 'U'}
              src={user?.profile_picture_url ? `/${user.profile_picture_url}` : undefined}
              size={28}
              bg={theme.avatarAccent}
              color="#1C1917"
            />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-white/90 text-[13px]">{user?.name || user?.email}</p>
                <p className="text-[11px] text-white/40 capitalize">{user?.role}</p>
              </div>
            )}
          </NavLink>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors hover:bg-red-500/15 hover:text-red-300"
            style={{ color: theme.idleText, justifyContent: collapsed ? 'center' : 'flex-start' }}
          >
            <LogOut size={14} className="flex-shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}
    </>
  );
};

export default Sidebar;
