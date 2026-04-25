import clsx from 'clsx';

const variants = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  brand: 'bg-brand-100 text-brand-700',
};

const Badge = ({ children, variant = 'default', className = '' }) => (
  <span
    className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      variants[variant],
      className
    )}
  >
    {children}
  </span>
);

export default Badge;

// Helper to get variant from status strings
export const statusVariant = (status) => {
  const map = {
    confirmed: 'success',
    completed: 'success',
    approved: 'success',
    active: 'success',
    pending: 'warning',
    scheduled: 'info',
    processing: 'info',
    cancelled: 'danger',
    rejected: 'danger',
    failed: 'danger',
    inactive: 'default',
  };
  return map[status?.toLowerCase()] || 'default';
};
