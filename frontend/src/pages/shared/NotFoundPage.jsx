import { useNavigate } from 'react-router-dom';
import Button from '@/components/ui/Button';

const NotFoundPage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
      <p className="text-7xl font-bold text-brand-600 mb-4">404</p>
      <h1 className="text-2xl font-bold text-text-primary mb-2">Page not found</h1>
      <p className="text-text-secondary mb-8 max-w-xs">The page you're looking for doesn't exist or has been moved.</p>
      <Button onClick={() => navigate(-1)}>Go back</Button>
    </div>
  );
};

export default NotFoundPage;
