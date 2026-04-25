import { forwardRef } from 'react';
import clsx from 'clsx';

const Select = forwardRef(({
  label,
  error,
  hint,
  id,
  children,
  className = '',
  ...props
}, ref) => {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-text-primary">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={clsx(
          'w-full px-3.5 py-2.5 rounded-lg border text-sm bg-white',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500',
          error
            ? 'border-red-300 bg-red-50/50'
            : 'border-slate-200 hover:border-slate-300',
          className
        )}
        aria-invalid={error ? 'true' : undefined}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p className="text-sm text-red-600" role="alert">{error}</p>
      )}
      {hint && !error && (
        <p className="text-sm text-text-muted">{hint}</p>
      )}
    </div>
  );
});

Select.displayName = 'Select';
export default Select;
