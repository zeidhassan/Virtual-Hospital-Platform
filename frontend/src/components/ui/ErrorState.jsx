import { AlertCircle } from 'lucide-react';
import Button from './Button';

const ErrorState = ({ message = 'Something went wrong.', onRetry }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
      <AlertCircle className="w-7 h-7 text-red-500" />
    </div>
    <h3 className="text-base font-semibold text-text-primary mb-1">Something went wrong</h3>
    <p className="text-sm text-text-secondary max-w-xs mb-5">{message}</p>
    {onRetry && (
      <Button onClick={onRetry} variant="secondary" size="md">
        Try again
      </Button>
    )}
  </div>
);

export default ErrorState;
