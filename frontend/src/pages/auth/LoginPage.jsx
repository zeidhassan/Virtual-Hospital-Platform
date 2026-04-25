import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const ROLE_HOME = {
  patient: '/patient/dashboard',
  doctor: '/doctor/dashboard',
  admin: '/admin/dashboard',
};

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      const user = await login(data);
      toast.success('Welcome back!');
      const from = location.state?.from?.pathname;
      navigate(from || ROLE_HOME[user.role] || '/patient/dashboard', { replace: true });
    } catch (err) {
      const message = err.response?.data?.error || err.response?.data?.message || 'Invalid credentials.';
      setError('root', { message });
    }
  };

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-text-primary">Sign in</h2>
        <p className="text-sm text-text-secondary mt-1">Welcome back — enter your details below</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Email address"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-text-primary">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              autoComplete="current-password"
              className="w-full px-3.5 py-2.5 pr-10 rounded-lg border text-sm placeholder:text-text-muted transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 border-slate-200 bg-white hover:border-slate-300"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-red-600" role="alert">{errors.password.message}</p>
          )}
        </div>

        {errors.root && (
          <div className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg" role="alert">
            {errors.root.message}
          </div>
        )}

        <Button type="submit" isLoading={isSubmitting} className="w-full" size="lg">
          Sign in
        </Button>
      </form>

      <p className="text-center text-sm text-text-secondary mt-5">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="text-brand-600 font-medium hover:underline">
          Create one
        </Link>
      </p>

      {/* OAuth */}
      <div className="mt-5 pt-5 border-t border-slate-100">
        <p className="text-center text-xs text-text-muted mb-3">Or sign in with</p>
        <div className="grid grid-cols-2 gap-3">
          <a
            href="/api/auth/google"
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm text-text-primary hover:bg-surface-subtle transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </a>
          <a
            href="/api/auth/facebook"
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm text-text-primary hover:bg-surface-subtle transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#1877F2" aria-hidden="true">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Facebook
          </a>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
