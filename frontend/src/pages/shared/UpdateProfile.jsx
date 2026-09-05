import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getProfile, updateProfile } from '@/api/profile';
import { useAuth } from '@/hooks/useAuth';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import PageHeader from '@/components/ui/PageHeader';

// Literal class strings per field of focus color, so Tailwind's JIT scanner
// can find them — building `focus:ring-${roleColor}-300` at runtime never
// matches anything in the compiled CSS.
const ROLE_FOCUS = {
  patient: 'focus:ring-indigo-300 focus:border-indigo-500',
  doctor: 'focus:ring-emerald-300 focus:border-emerald-500',
  admin: 'focus:ring-orange-300 focus:border-orange-500',
};

const UpdateProfile = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  useEffect(() => {
    getProfile()
      .then(({ data }) => {
        const profile = data?.user || data;
        reset({
          ...profile,
          date_of_birth: profile?.date_of_birth ? profile.date_of_birth.slice(0, 10) : '',
        });
      })
      .catch(() => toast.error('Failed to load your profile'))
      .finally(() => setLoading(false));
  }, [reset]);

  const onSubmit = async (data) => {
    try {
      // Don't send email unless the user actually changed it — updateProfile
      // treats a present `email` key as an intentional change and re-validates
      // uniqueness, which is wasted work (and a needless failure point) here.
      const { email, ...rest } = data;
      await updateProfile(rest);
      toast.success('Profile updated!');
      await refreshUser();
      navigate('/profile');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    }
  };

  const focusClass = ROLE_FOCUS[user?.role] || ROLE_FOCUS.patient;
  const textareaCls = `w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-surface-dark text-text-primary focus:outline-none focus:ring-2 ${focusClass} resize-none`;

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-2xl mx-auto animate-fade-in space-y-6">
      <PageHeader title="Edit Profile" />

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Basic Information */}
          <div>
            <h3 className="text-base font-semibold text-text-primary mb-4">Basic Information</h3>
            <div className="space-y-4">
              <Input label="Full Name" placeholder="Enter your full name" error={errors.full_name?.message} {...register('full_name', { required: 'Full name is required', minLength: { value: 2, message: 'Too short' } })} />
              <Input label="Phone" type="tel" placeholder="Enter phone number" {...register('phone')} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">Gender</label>
                  <Select {...register('gender')}>
                    <option value="">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </Select>
                </div>
                <Input label="Date of Birth" type="date" {...register('date_of_birth')} />
              </div>
            </div>
          </div>

          {/* Patient-specific fields */}
          {user?.role === 'patient' && (
            <>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-semibold text-text-primary mb-4">Medical Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Blood Group" placeholder="e.g. O+" {...register('blood_group')} />
                  <Input label="Address" placeholder="Your address" {...register('address')} />
                  <Input label="Emergency Contact Name" placeholder="Contact person" {...register('emergency_contact_name')} />
                  <Input label="Emergency Contact Phone" type="tel" placeholder="Emergency phone" {...register('emergency_contact_phone')} />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-semibold text-text-primary mb-4">Health Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">Allergies</label>
                    <textarea
                      rows={3}
                      placeholder="List any allergies (medications, food, etc.)"
                      className={textareaCls}
                      {...register('allergies')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">Chronic Conditions</label>
                    <textarea
                      rows={3}
                      placeholder="List any chronic conditions or ongoing health issues"
                      className={textareaCls}
                      {...register('chronic_conditions')}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Doctor-specific fields */}
          {user?.role === 'doctor' && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-semibold text-text-primary mb-4">Professional Information</h3>
              <div className="space-y-4">
                <Input label="Specialization" placeholder="e.g. Cardiology" {...register('specialization')} />
                <Input label="Qualifications" placeholder="e.g. MBBS, MD" {...register('qualifications')} />
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">Bio</label>
                  <textarea
                    rows={4}
                    placeholder="Tell patients about yourself, your experience, and approach to care..."
                    className={textareaCls}
                    {...register('bio')}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => navigate('/profile')} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting} className="flex-1">
              Save Changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default UpdateProfile;
