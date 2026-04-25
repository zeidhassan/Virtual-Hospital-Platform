import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  role: z.enum(['patient', 'doctor'], { required_error: 'Select a role' }),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const ROLE_HOME = { patient: '/patient/dashboard', doctor: '/doctor/dashboard' };

const RegisterPage = () => {
  const { register: authRegister } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, watch, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { role: 'patient' },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data) => {
    try {
      const { confirmPassword, ...payload } = data;
      const user = await authRegister(payload);
      toast.success('Account created! Welcome to HelixaCare.');
      navigate(ROLE_HOME[user.role] || '/patient/dashboard', { replace: true });
    } catch (err) {
      const message = err.response?.data?.error || err.response?.data?.message || 'Registration failed. Please try again.';
      setError('root', { message });
    }
  };

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-text-primary">Create account</h2>
        <p className="text-sm text-text-secondary mt-1">Join HelixaCare — free to get started</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Role selection */}
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-text-primary">I am a</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'patient', label: 'Patient', desc: 'Book consultations & manage health' },
              { value: 'doctor', label: 'Doctor', desc: 'Manage patients & appointments' },
            ].map(({ value, label, desc }) => (
              <label
                key={value}
                className={`flex flex-col p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                  selectedRole === value
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  value={value}
                  className="sr-only"
                  {...register('role')}
                />
                <span className="text-sm font-semibold text-text-primary">{label}</span>
                <span className="text-xs text-text-secondary mt-0.5">{desc}</span>
              </label>
            ))}
          </div>
          {errors.role && <p className="text-sm text-red-600">{errors.role.message}</p>}
        </div>

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
              className="w-full px-3.5 py-2.5 pr-10 rounded-lg border text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 border-slate-200 bg-white hover:border-slate-300"
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
          <div className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg" role="alert">
            {errors.root.message}
          </div>
        )}

        <Button type="submit" isLoading={isSubmitting} className="w-full" size="lg">
          Create account
        </Button>
      </form>

      <p className="text-center text-sm text-text-secondary mt-5">
        Already have an account?{' '}
        <Link to="/login" className="text-brand-600 font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
};

export default RegisterPage;
