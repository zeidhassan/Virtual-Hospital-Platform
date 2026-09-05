import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, Sun, Moon } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const RegisterPage = () => {
  const { register: authRegister } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      const { confirmPassword, ...rest } = data;
      await authRegister({ ...rest, role: 'patient' });
      toast.success('Account created! Welcome to HelixaCare.');
      navigate('/patient/dashboard', { replace: true });
    } catch (err) {
      const message = err.response?.data?.error || err.response?.data?.message || 'Registration failed. Please try again.';
      setError('root', { message });
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative overflow-hidden bg-surface">
        {/* Decorative blob */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-50 rounded-full blur-[120px] opacity-40" />

        <div className="w-full max-w-[440px] relative z-10">
          {/* Top Actions */}
          <div className="flex items-center justify-between mb-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Home
            </Link>
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-lg bg-surface-subtle border border-slate-200 dark:border-[#404040] flex items-center justify-center text-text-secondary hover:bg-surface-warm transition-colors"
              aria-label="Toggle dark mode"
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>

          {/* Logo */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-text-primary">HelixaCare</span>
            </div>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-[26px] font-extrabold text-text-primary tracking-tight mb-2">Create your account</h1>
            <p className="text-sm text-text-secondary">Join HelixaCare — free to get started</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Input
              label="Full name"
              type="text"
              placeholder="Sarah Al-Rashidi"
              autoComplete="name"
              error={errors.name?.message}
              {...register('name')}
            />

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
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-lg border text-sm placeholder:text-text-muted transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 border-slate-200 dark:border-[#404040] bg-white dark:bg-[#2A2A2A] hover:border-slate-300 dark:hover:border-[#4A4A4A]"
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
              {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
            </div>

            <Input
              label="Confirm password"
              type="password"
              placeholder="Re-enter your password"
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            {errors.root && (
              <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-lg" role="alert">
                {errors.root.message}
              </div>
            )}

            <Button type="submit" isLoading={isSubmitting} className="w-full" size="lg">
              Create account
            </Button>
          </form>

          {/* Sign in Link */}
          <p className="text-center text-sm text-text-secondary mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 font-semibold hover:text-brand-700 hover:underline">
              Sign in
            </Link>
          </p>

          <p className="text-center text-xs text-text-muted mt-3">
            Signing up as a doctor? Contact your clinic administrator to have an account set up for you.
          </p>
        </div>
      </div>

      {/* Right Panel - Brand */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[560px] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#2D2580] via-[#3D196E] to-[#1A0B3B]" />

        <div className="relative z-10 flex flex-col items-center justify-center px-12 text-white">
          {/* Logo Mark */}
          <div className="mb-8">
            <div className="w-24 h-24 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <svg className="w-14 h-14 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>

          {/* Tagline */}
          <p className="text-center text-lg text-white/90 mb-12 max-w-md leading-relaxed">
            Join thousands of patients and doctors using HelixaCare to deliver better healthcare outcomes.
          </p>

          {/* Features */}
          <div className="space-y-4 w-full max-w-md">
            {[
              { icon: '🏥', text: 'Complete virtual hospital platform' },
              { icon: '🤖', text: 'AI-powered triage & diagnostics' },
              { icon: '📱', text: 'Access from any device, anywhere' },
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
                <span className="text-2xl">{feature.icon}</span>
                <span className="text-sm text-white/90">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
