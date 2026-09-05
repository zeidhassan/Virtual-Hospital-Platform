import clsx from 'clsx';

const variants = {
  default: 'bg-surface-subtle text-text-secondary',
  success: 'bg-status-success-light text-status-success',
  warning: 'bg-status-warning-light text-status-warning',
  danger: 'bg-status-error-light text-status-error',
  error: 'bg-status-error-light text-status-error',
  info: 'bg-status-info-light text-status-info',
  brand: 'bg-brand-50 text-brand-500',
};

const Badge = ({ children, variant = 'default', className = '' }) => (
  <span
    className={clsx(
      'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold',
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
    'in-progress': 'brand',
    upcoming: 'info',
    cancelled: 'danger',
    rejected: 'danger',
    failed: 'danger',
    inactive: 'default',
  };
  return map[status?.toLowerCase()] || 'default';
};
