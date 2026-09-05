import { useState, useRef } from 'react';
import { getProfile, updateProfilePicture } from '@/api/profile';
import useFetch from '@/hooks/useFetch';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import PageHeader from '@/components/ui/PageHeader';
import Avatar from '@/components/ui/Avatar';
import { Edit, Mail, Phone, MapPin, Heart, AlertCircle, Stethoscope, Award, FileText, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const Field = ({ label, value, icon: Icon }) => (
  <div>
    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">{label}</p>
    <div className="flex items-center gap-2">
      {Icon && <Icon size={16} className="text-text-muted flex-shrink-0" />}
      <p className="text-sm text-text-primary">{value || '—'}</p>
    </div>
  </div>
);

// Full literal class names per role, so Tailwind's JIT scanner can actually
// find and generate them — a dynamically-built `text-${roleColor}-600` string
// never matches anything in the compiled stylesheet and silently does nothing.
const ROLE_STYLES = {
  patient: { bg: '#4C1D95', text: 'text-indigo-600', chip: 'bg-indigo-50 border-indigo-200' },
  doctor:  { bg: '#0F6644', text: 'text-emerald-600', chip: 'bg-emerald-50 border-emerald-200' },
  admin:   { bg: '#A33C18', text: 'text-orange-600', chip: 'bg-orange-50 border-orange-200' },
};

const ViewProfile = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useFetch(getProfile);
  const profile = data?.user || user;
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const roleStyle = ROLE_STYLES[user?.role] || ROLE_STYLES.patient;
  const pictureUrl = profile?.profile_picture_url ? `/${profile.profile_picture_url}` : undefined;

  const handlePictureChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('profile_picture', file);
      await updateProfilePicture(formData);
      toast.success('Profile picture updated');
      refetch();
      refreshUser();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload picture');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in space-y-6">
      <PageHeader
        title="My Profile"
        action={
          <Button onClick={() => navigate('/profile/edit')}>
            <Edit size={16} />
            Edit Profile
          </Button>
        }
      />

      {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}
      {error && <ErrorState message={error} onRetry={refetch} />}
      {!isLoading && !error && profile && (
        <>
          {/* Profile Header Card */}
          <Card>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <div className="relative flex-shrink-0">
                <Avatar src={pictureUrl} name={profile.full_name} size={88} bg={roleStyle.bg} />
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePictureChange} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  title="Change profile picture"
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center shadow-md transition-colors disabled:opacity-50"
                >
                  {uploading ? <Spinner size="sm" /> : <Camera size={13} />}
                </button>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-2xl font-bold text-text-primary mb-1">
                  {profile.full_name || 'User'}
                </h2>
                <p className={`text-sm font-medium capitalize mb-3 ${roleStyle.text}`}>
                  {profile.role || user?.role}
                </p>
                {profile.email && (
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-text-secondary">
                    <Mail size={16} />
                    {profile.email}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Contact Information */}
          <Card>
            <h3 className="text-lg font-semibold text-text-primary mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Email" value={profile.email} icon={Mail} />
              <Field label="Phone" value={profile.phone} icon={Phone} />
              <Field label="Gender" value={profile.gender} />
              <Field label="Date of Birth" value={profile.date_of_birth ? format(new Date(profile.date_of_birth), 'dd MMM yyyy') : null} />
              {user?.role === 'patient' && profile.address && (
                <div className="sm:col-span-2">
                  <Field label="Address" value={profile.address} icon={MapPin} />
                </div>
              )}
            </div>
          </Card>

          {/* Patient-specific Information */}
          {user?.role === 'patient' && (
            <>
              <Card>
                <h3 className="text-lg font-semibold text-text-primary mb-4">Medical Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Blood Group" value={profile.blood_group} icon={Heart} />
                  <Field label="Emergency Contact" value={profile.emergency_contact_name} icon={Phone} />
                  <Field label="Emergency Phone" value={profile.emergency_contact_phone} icon={Phone} />
                </div>
              </Card>

              {(profile.allergies || profile.chronic_conditions) && (
                <Card>
                  <h3 className="text-lg font-semibold text-text-primary mb-4">Health Details</h3>
                  <div className="space-y-4">
                    {profile.allergies && (
                      <div>
                        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Allergies</p>
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                          <AlertCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-text-secondary">{profile.allergies}</p>
                        </div>
                      </div>
                    )}
                    {profile.chronic_conditions && (
                      <div>
                        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Chronic Conditions</p>
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                          <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-text-secondary">{profile.chronic_conditions}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </>
          )}

          {/* Doctor-specific Information */}
          {user?.role === 'doctor' && (
            <Card>
              <h3 className="text-lg font-semibold text-text-primary mb-4">Professional Information</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Specialization" value={profile.specialization} icon={Stethoscope} />
                  <Field label="Qualifications" value={profile.qualifications} icon={Award} />
                  {profile.availability_status && (
                    <Field label="Availability" value={profile.availability_status} />
                  )}
                </div>
                {profile.bio && (
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Bio</p>
                    <div className="flex items-start gap-2">
                      <FileText size={16} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-text-secondary whitespace-pre-wrap">{profile.bio}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default ViewProfile;
