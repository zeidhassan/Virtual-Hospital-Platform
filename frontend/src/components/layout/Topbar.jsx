import { Menu, Bell } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const Topbar = ({ onMenuClick }) => {
  const { user } = useAuth();

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <header className="sticky top-0 z-20 h-16 bg-surface border-b border-slate-100 flex items-center px-4 sm:px-6 gap-4">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-text-secondary hover:bg-surface-subtle transition-colors"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Greeting */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-secondary truncate hidden sm:block">
          {greeting()}, <span className="font-semibold text-text-primary">{user?.name || user?.email}</span>
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          className="p-2 rounded-lg text-text-secondary hover:bg-surface-subtle transition-colors relative"
          aria-label="Notifications"
        >
          <Bell size={20} />
        </button>
      </div>
    </header>
  );
};

export default Topbar;
