import { useState, useEffect } from 'react';
import { Menu, Bell, Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { getUnreadCount } from '@/api/notifications';

const ROLE_COLORS = {
  patient: '#818CF8',
  doctor: '#34D399',
  admin: '#FB923C',
};

const Topbar = ({ onMenuClick }) => {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let mounted = true;
    const fetchCount = async () => {
      try {
        const res = await getUnreadCount();
        if (mounted) setUnread(res.data.count || 0);
      } catch { /* ignore */ }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const roleColor = ROLE_COLORS[user?.role] || ROLE_COLORS.patient;

  return (
    <header className="sticky top-0 z-20 h-16 bg-surface border-b border-slate-200 flex items-center px-4 sm:px-6 gap-4">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-text-secondary hover:bg-surface-subtle transition-colors"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Link
          to="/notifications"
          className="relative w-9 h-9 rounded-[9px] bg-surface-subtle border border-slate-200 flex items-center justify-center text-text-secondary hover:bg-surface-warm transition-colors"
          aria-label="Notifications"
        >
          <Bell size={16} />
          {unread > 0 && (
            <span
              className="absolute top-1 right-1 w-[7px] h-[7px] rounded-full border-2 border-white"
              style={{ background: roleColor }}
              aria-label={`${unread} unread notifications`}
            />
          )}
        </Link>

        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-[9px] bg-surface-subtle border border-slate-200 flex items-center justify-center text-text-secondary hover:bg-surface-warm transition-colors"
          aria-label="Toggle dark mode"
        >
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </header>
  );
};

export default Topbar;
