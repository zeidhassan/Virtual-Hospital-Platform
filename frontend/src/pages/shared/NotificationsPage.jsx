import { useState, useEffect, useCallback } from 'react';
import { getMyNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/api/notifications';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import Badge from '@/components/ui/Badge';
import { Bell, CheckCheck, Calendar, Pill, Zap, Package, CreditCard, Clock, Shield, MessageSquare, Star, Ticket, Settings, X, Check } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

// Category metadata: icon, color, background, label
const CAT_META = {
  appointment: { icon: Calendar, col: '#7C6EF8', bg: '#F0EEFF', label: 'Appointment' },
  prescription: { icon: Pill, col: '#2563EB', bg: '#DBEAFE', label: 'Prescription' },
  triage: { icon: Zap, col: '#16A34A', bg: '#DCFCE7', label: 'Triage' },
  order: { icon: Package, col: '#D97706', bg: '#FEF3C7', label: 'Order' },
  billing: { icon: CreditCard, col: '#0D9488', bg: '#CCFBF1', label: 'Billing' },
  followup: { icon: Clock, col: '#7C6EF8', bg: '#F0EEFF', label: 'Follow-up' },
  insurance: { icon: Shield, col: '#16A34A', bg: '#DCFCE7', label: 'Insurance' },
  message: { icon: MessageSquare, col: '#2563EB', bg: '#DBEAFE', label: 'Message' },
  subscription: { icon: Star, col: '#D97706', bg: '#FEF3C7', label: 'Subscription' },
  support: { icon: Ticket, col: '#DC2626', bg: '#FEE2E2', label: 'Support' },
  system: { icon: Settings, col: '#57534E', bg: '#F6F3EF', label: 'System' },
};

// Urgent notification types
const URGENT_TYPES = new Set(['urgent', 'overdue', 'alert', 'critical']);

// Get initials from name
const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

// Small actor avatar
const Avatar = ({ name, role, size = 20 }) => {
  const ROLE_BG = { patient: '#4C1D95', doctor: '#0F6644', admin: '#A33C18' };
  const bg = ROLE_BG[role] || '#57534E';
  return (
    <div className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ width: size, height: size, backgroundColor: bg, fontSize: size * 0.4 }}>
      {getInitials(name)}
    </div>
  );
};

// Group notifications by day
const groupByDay = (items) => {
  const groups = { Today: [], Yesterday: [], Earlier: [] };
  items.forEach((n) => {
    const date = new Date(n.created_at);
    if (isToday(date)) groups.Today.push(n);
    else if (isYesterday(date)) groups.Yesterday.push(n);
    else groups.Earlier.push(n);
  });
  return groups;
};

// Determine if notification is urgent
const isUrgent = (notification) => {
  return URGENT_TYPES.has(notification.type) || notification.title?.toLowerCase().includes('urgent') || notification.body?.toLowerCase().includes('urgent');
};

// ── Notification Row ─────────────────────────────────────────────────────
const NotificationRow = ({ notification, onMarkRead, onDismiss }) => {
  const [hovered, setHovered] = useState(false);
  const category = notification.category || 'system';
  const meta = CAT_META[category] || CAT_META.system;
  const Icon = meta.icon;
  const urgent = isUrgent(notification);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={clsx(
        'grid grid-cols-[auto_1fr_auto] gap-3.5 px-4 py-4 border-b border-slate-100 dark:border-slate-800 transition-colors relative',
        notification.is_read
          ? 'bg-white dark:bg-surface-dark hover:bg-surface-subtle dark:hover:bg-surface-dark-subtle border-l-[3px] border-l-transparent'
          : urgent
            ? 'bg-red-50/50 dark:bg-red-500/5 hover:bg-red-50 dark:hover:bg-red-500/10 border-l-[3px] border-l-red-600'
            : 'bg-white dark:bg-surface-dark hover:bg-surface-subtle dark:hover:bg-surface-dark-subtle border-l-[3px] border-l-brand-500',
      )}
    >
      {/* Icon + unread dot */}
      <div className="relative flex-shrink-0">
        <div className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center" style={{ backgroundColor: meta.bg }}>
          <Icon size={17} style={{ color: meta.col }} />
        </div>
        {!notification.is_read && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-surface-dark" style={{ backgroundColor: urgent ? '#DC2626' : meta.col }} />}
      </div>

      {/* Body */}
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className={clsx('text-sm tracking-tight', notification.is_read ? 'font-semibold text-text-secondary dark:text-text-dark-secondary' : 'font-bold text-text-primary dark:text-text-dark-primary')}>{notification.title}</span>
          {urgent && (
            <Badge variant="error" className="text-[10px] px-1.5 py-0.5">
              Urgent
            </Badge>
          )}
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: meta.col }}>
            {meta.label}
          </span>
        </div>

        <div className="text-[13.5px] text-text-secondary dark:text-text-dark-secondary leading-relaxed mb-2">{notification.body}</div>

        {notification.actor_name && (
          <div className="flex items-center gap-1.5">
            <Avatar name={notification.actor_name} role={notification.actor_role} size={20} />
            <span className="text-xs text-text-secondary dark:text-text-dark-secondary font-medium">
              {notification.actor_name}
            </span>
          </div>
        )}
      </div>

      {/* Time + actions */}
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <span className="text-xs text-text-muted dark:text-text-dark-muted font-medium whitespace-nowrap">{notification.created_at ? format(new Date(notification.created_at), 'HH:mm') : '—'}</span>
        <div className={clsx('flex gap-1 transition-opacity', hovered ? 'opacity-100' : 'opacity-0')}>
          {!notification.is_read && (
            <button
              onClick={() => onMarkRead(notification.id)}
              title="Mark as read"
              className="w-7 h-7 rounded-lg bg-surface-subtle dark:bg-surface-dark-subtle border border-slate-200 dark:border-slate-700 flex items-center justify-center text-text-secondary dark:text-text-dark-secondary hover:bg-surface-warm dark:hover:bg-surface-dark-warm transition-colors"
            >
              <Check size={13} />
            </button>
          )}
          <button
            onClick={() => onDismiss(notification.id)}
            title="Dismiss"
            className="w-7 h-7 rounded-lg bg-surface-subtle dark:bg-surface-dark-subtle border border-slate-200 dark:border-slate-700 flex items-center justify-center text-text-secondary dark:text-text-dark-secondary hover:bg-surface-warm dark:hover:bg-surface-dark-warm transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────
const PAGE_SIZE = 20;

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [page, setPageNum] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [marking, setMarking] = useState(false);
  const [filter, setFilter] = useState('all');

  // Category pills and day-grouping need the full loaded set to compute
  // accurate counts, so this appends pages into one growing list ("Load
  // more") rather than swapping pages the way a numbered Pagination
  // component would — swapping pages would make pill counts reflect only
  // the current page instead of everything the user has seen so far.
  const load = useCallback(async (pageToLoad, append) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await getMyNotifications({ page: pageToLoad, limit: PAGE_SIZE });
      const body = res.data;
      setNotifications((prev) => (append ? [...prev, ...(body.data || [])] : body.data || []));
      setTotalItems(body.totalItems || 0);
      setPageNum(pageToLoad);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load notifications.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    load(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoadMore = () => load(page + 1, true);
  const hasMore = notifications.length < totalItems;

  const handleMarkOne = async (id) => {
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch {
      toast.error('Failed to mark as read');
    }
  };

  const handleDismiss = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleMarkAll = async () => {
    setMarking(true);
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all as read');
    } finally {
      setMarking(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const urgentCount = notifications.filter((n) => !n.is_read && isUrgent(n)).length;

  // Categories actually present in this user's notifications
  const categories = [...new Set(notifications.map((n) => n.category || 'system'))];

  const FILTERS = [
    { id: 'all', label: 'All', count: notifications.length },
    { id: 'unread', label: 'Unread', count: unreadCount },
    { id: 'today', label: 'Today', count: notifications.filter((n) => isToday(new Date(n.created_at))).length },
    ...categories.map((cat) => ({
      id: cat,
      label: (CAT_META[cat] || CAT_META.system).label,
      count: notifications.filter((n) => (n.category || 'system') === cat).length,
    })),
  ];

  const filtered = notifications.filter((n) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.is_read;
    if (filter === 'today') return isToday(new Date(n.created_at));
    return (n.category || 'system') === filter;
  });

  const grouped = groupByDay(filtered);

  return (
    <div className="animate-fade-in space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-[10px] bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center flex-shrink-0">
              <Bell size={17} className="text-brand-600" />
            </span>
            Notifications
          </h1>
          <p className="text-sm text-text-secondary dark:text-text-dark-secondary mt-1.5">
            {unreadCount > 0 ? (
              <>
                <span className="font-semibold text-text-primary dark:text-text-dark-primary">{unreadCount} unread</span>
                {urgentCount > 0 && (
                  <>
                    {' '}
                    · <span className="font-semibold text-red-600">{urgentCount} urgent</span>
                  </>
                )}
              </>
            ) : (
              "You're all caught up."
            )}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={handleMarkAll} disabled={unreadCount === 0 || marking} isLoading={marking}>
          <CheckCheck size={14} /> Mark all read
        </Button>
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTERS.map((f) => {
          const isActive = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap border',
                isActive ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white dark:bg-surface-dark border-slate-200 dark:border-slate-700 text-text-secondary dark:text-text-dark-secondary hover:bg-surface-subtle dark:hover:bg-surface-dark-subtle',
              )}
            >
              {f.label}
              <span className={clsx('text-[11px] font-bold px-1.5 py-0.5 rounded-full', isActive ? 'bg-white/20 text-white' : 'bg-surface-subtle dark:bg-surface-dark-subtle text-text-muted dark:text-text-dark-muted')}>{f.count}</span>
            </button>
          );
        })}
      </div>

      {/* Notifications list */}
      <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden">
        {loading && (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        )}

        {error && <ErrorState message={error} onRetry={() => load(1, false)} />}

        {!loading && !error && filtered.length === 0 && (
          <div className="px-8 py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-surface-subtle dark:bg-surface-dark-subtle flex items-center justify-center mx-auto mb-3.5">
              <Bell size={24} className="text-text-muted dark:text-text-dark-muted" />
            </div>
            <div className="text-[15px] font-semibold text-text-primary dark:text-text-dark-primary mb-1">Nothing here</div>
            <div className="text-[13px] text-text-secondary dark:text-text-dark-secondary">No notifications match this filter.</div>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <>
            {['Today', 'Yesterday', 'Earlier'].map(
              (group) =>
                grouped[group].length > 0 && (
                  <div key={group}>
                    <div className="px-4 py-2.5 bg-surface-subtle dark:bg-surface-dark-subtle border-b border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] font-bold text-text-muted dark:text-text-dark-muted uppercase tracking-widest">
                        {group} <span className="font-semibold">· {grouped[group].length}</span>
                      </span>
                    </div>
                    {grouped[group].map((n) => (
                      <NotificationRow key={n.id} notification={n} onMarkRead={handleMarkOne} onDismiss={handleDismiss} />
                    ))}
                  </div>
                ),
            )}
          </>
        )}

        {!loading && !error && hasMore && (
          <div className="flex justify-center py-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" size="sm" onClick={handleLoadMore} isLoading={loadingMore} disabled={loadingMore}>
              Load more
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
