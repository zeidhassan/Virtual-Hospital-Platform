import { useNavigate } from 'react-router-dom';
import Button from '@/components/ui/Button';

const UnauthorizedPage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
      <p className="text-7xl font-bold text-amber-500 mb-4">403</p>
      <h1 className="text-2xl font-bold text-text-primary mb-2">Access denied</h1>
      <p className="text-text-secondary mb-8 max-w-xs">You don't have permission to view this page.</p>
      <Button onClick={() => navigate(-1)}>Go back</Button>
    </div>
  );
};

export default UnauthorizedPage;
