import { getProfile } from '@/api/profile';
import useFetch from '@/hooks/useFetch';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import Card, { CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import { UserCircle, Edit } from 'lucide-react';

const Field = ({ label, value }) => (
  <div>
    <p className="text-xs text-text-muted">{label}</p>
    <p className="text-sm font-medium text-text-primary mt-0.5">{value || '—'}</p>
  </div>
);

const ViewProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useFetch(getProfile);
  const profile = data?.user || data?.profile || data || user;

  return (
    <div className="max-w-xl animate-fade-in">
      <h1 className="page-title mb-6">My Profile</h1>
      <Card>
        <CardHeader
          title="Account Details"
          action={<Button size="sm" variant="secondary" onClick={() => navigate('/profile/edit')}><Edit size={14} /> Edit</Button>}
        />
        {isLoading && <div className="flex justify-center py-8"><Spinner /></div>}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && profile && (
          <div className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              {profile.profile_picture_url ? (
                <img src={profile.profile_picture_url} alt="Profile" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center">
                  <UserCircle size={32} className="text-brand-600" />
                </div>
              )}
              <div>
                <p className="font-semibold text-text-primary text-lg">{profile.name || profile.username || '—'}</p>
                <p className="text-sm text-text-secondary capitalize">{profile.role || user?.role}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              <Field label="Email" value={profile.email} />
              <Field label="Phone" value={profile.phone} />

              {/* Patient-specific */}
              {user?.role === 'patient' && <>
                <Field label="Blood Group" value={profile.blood_group} />
                <Field label="Address" value={profile.address} />
                <Field label="Emergency Contact" value={profile.emergency_contact_name} />
                <Field label="Emergency Phone" value={profile.emergency_contact_phone} />
                <div className="col-span-2"><Field label="Allergies" value={profile.allergies} /></div>
                <div className="col-span-2"><Field label="Chronic Conditions" value={profile.chronic_conditions} /></div>
              </>}

              {/* Doctor-specific */}
              {user?.role === 'doctor' && <>
                <Field label="Specialization" value={profile.specialization} />
                <Field label="Qualifications" value={profile.qualifications} />
                <Field label="Availability" value={profile.availability_status} />
                <div className="col-span-2"><Field label="Bio" value={profile.bio} /></div>
              </>}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ViewProfile;
