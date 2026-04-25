import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getProfile, updateProfile } from '@/api/profile';
import { useAuth } from '@/hooks/useAuth';
import Card, { CardHeader } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { useState } from 'react';

const UpdateProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  useEffect(() => {
    getProfile()
      .then(({ data }) => {
        const profile = data?.user || data?.profile || data;
        reset(profile);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [reset]);

  const onSubmit = async (data) => {
    try {
      await updateProfile(data);
      toast.success('Profile updated!');
      navigate('/profile');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-xl animate-fade-in">
      <h1 className="page-title mb-6">Edit Profile</h1>
      <Card>
        <CardHeader title="Update your information" />
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Full Name" {...register('name')} />
          <Input label="Phone" type="tel" {...register('phone')} />

          {user?.role === 'patient' && (
            <>
              <Input label="Blood Group" placeholder="e.g. O+" {...register('blood_group')} />
              <Input label="Address" {...register('address')} />
              <Input label="Emergency Contact Name" {...register('emergency_contact_name')} />
              <Input label="Emergency Contact Phone" type="tel" {...register('emergency_contact_phone')} />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text-primary">Allergies</label>
                <textarea rows={2} className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-none" {...register('allergies')} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text-primary">Chronic Conditions</label>
                <textarea rows={2} className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-none" {...register('chronic_conditions')} />
              </div>
            </>
          )}

          {user?.role === 'doctor' && (
            <>
              <Input label="Specialization" {...register('specialization')} />
              <Input label="Qualifications" {...register('qualifications')} />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text-primary">Bio</label>
                <textarea rows={3} className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-none" {...register('bio')} />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => navigate('/profile')}>Cancel</Button>
            <Button type="submit" isLoading={isSubmitting}>Save Changes</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default UpdateProfile;
