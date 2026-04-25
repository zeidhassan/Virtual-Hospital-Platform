import clsx from 'clsx';

const Card = ({ children, className = '', hoverable = false, ...props }) => (
  <div
    className={clsx(
      'bg-surface rounded-card shadow-card p-5 sm:p-6',
      hoverable && 'transition-shadow duration-200 hover:shadow-card-hover cursor-pointer',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export const CardHeader = ({ title, subtitle, action, className = '' }) => (
  <div className={clsx('flex items-start justify-between mb-5', className)}>
    <div>
      <h2 className="section-title">{title}</h2>
      {subtitle && <p className="text-sm text-text-secondary mt-0.5">{subtitle}</p>}
    </div>
    {action && <div className="ml-4 flex-shrink-0">{action}</div>}
  </div>
);

export default Card;
