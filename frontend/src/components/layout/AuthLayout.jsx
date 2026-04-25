import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Spinner from '@/components/ui/Spinner';

const ROLE_HOME = {
  patient: '/patient/dashboard',
  doctor: '/doctor/dashboard',
  admin: '/admin/dashboard',
};

const AuthLayout = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isAuthenticated && user?.role) {
    return <Navigate to={ROLE_HOME[user.role] || '/patient/dashboard'} replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-600 mb-4">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-white fill-current">
              <path d="M12 2a1 1 0 0 1 1 1v3h3a1 1 0 1 1 0 2h-3v3a1 1 0 1 1-2 0V8H8a1 1 0 0 1 0-2h3V3a1 1 0 0 1 1-1z"/>
              <path fillRule="evenodd" d="M3 14a9 9 0 1 1 18 0 9 9 0 0 1-18 0zm9-7a7 7 0 1 0 0 14A7 7 0 0 0 12 7z" clipRule="evenodd"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">HelixaCare</h1>
          <p className="text-sm text-text-secondary mt-1">Your healthcare platform, always open</p>
        </div>

        {/* Form card */}
        <div className="bg-surface rounded-2xl shadow-card p-7">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
