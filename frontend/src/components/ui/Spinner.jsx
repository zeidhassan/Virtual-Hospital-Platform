import clsx from 'clsx';

const sizes = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-[3px]',
};

const Spinner = ({ size = 'md', className = '' }) => (
  <div
    className={clsx(
      'rounded-full border-brand-200 border-t-brand-600 animate-spin',
      sizes[size],
      className
    )}
    role="status"
    aria-label="Loading"
  />
);

export default Spinner;
