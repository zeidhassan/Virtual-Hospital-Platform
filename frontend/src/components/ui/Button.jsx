import { forwardRef } from 'react';
import clsx from 'clsx';
import Spinner from './Spinner';

const variants = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800',
  secondary: 'bg-surface border border-slate-200 text-text-primary hover:bg-surface-subtle active:bg-surface-muted',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
  ghost: 'text-text-secondary hover:bg-surface-subtle active:bg-surface-muted',
  outline: 'border border-brand-600 text-brand-600 hover:bg-brand-50 active:bg-brand-100',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className = '',
  ...props
}, ref) => (
  <button
    ref={ref}
    disabled={disabled || isLoading}
    className={clsx(
      'inline-flex items-center justify-center gap-2 rounded-lg font-medium',
      'transition-colors duration-150',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      variants[variant],
      sizes[size],
      className
    )}
    {...props}
  >
    {isLoading && <Spinner size="sm" />}
    {children}
  </button>
));

Button.displayName = 'Button';
export default Button;
