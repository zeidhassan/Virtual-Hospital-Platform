import { useState, useEffect, useCallback } from 'react';
import { getDoctorTimeSlots, createDoctorTimeSlot, deleteDoctorTimeSlot } from '@/api/admin';
import Card from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import PageHeader from '@/components/ui/PageHeader';
import { Clock, Plus, Trash2, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const EMPTY_FORM = { day_of_week: 'Monday', start_time: '', end_time: '' };

const AdminDoctorTimeSlots = () => {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [slots, setSlots] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Add slot modal
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleting, setDeleting] = useState(null);

  // Load doctor list
  useEffect(() => {
    getDoctorTimeSlots({ list_only: true })
      .then(({ data }) => setDoctors(data?.data || data || []))
      .catch(() => {})
      .finally(() => setLoadingDoctors(false));
  }, []);

  // Load slots for selected doctor
  const loadSlots = useCallback(() => {
    if (!selectedDoctor) return;
    setLoadingSlots(true);
    getDoctorTimeSlots({ doctor_id: selectedDoctor })
      .then(({ data }) => setSlots(data?.data || data || []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedDoctor]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const handleAdd = async () => {
    if (!form.start_time || !form.end_time) {
      toast.error('Start time and end time are required');
      return;
    }
    setSaving(true);
    try {
      await createDoctorTimeSlot({
        doctor_id: parseInt(selectedDoctor),
        day_of_week: form.day_of_week,
        start_time: form.start_time,
        end_time: form.end_time,
      });
      toast.success('Time slot added');
      setAddOpen(false);
      setForm(EMPTY_FORM);
      loadSlots();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add slot');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this time slot?')) return;
    setDeleting(id);
    try {
      await deleteDoctorTimeSlot(id);
      toast.success('Slot deleted');
      setSlots((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Doctor Time Slots" />

      <Card>
        {loadingDoctors ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Select
                  label="Select Doctor"
                  value={selectedDoctor}
                  onChange={(e) => {
                    setSelectedDoctor(e.target.value);
                    setSlots([]);
                  }}
                >
                  <option value="">Choose a doctor...</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.doctor_name || d.full_name}
                    </option>
                  ))}
                </Select>
              </div>
              {selectedDoctor && (
                <Button
                  onClick={() => {
                    setForm(EMPTY_FORM);
                    setAddOpen(true);
                  }}
                >
                  <Plus size={16} />
                  Add Slot
                </Button>
              )}
            </div>

            {loadingSlots && (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            )}

            {!loadingSlots && selectedDoctor && slots.length === 0 && <EmptyState icon={Clock} title="No slots" description="This doctor has no time slots configured." />}

            {!loadingSlots && slots.length > 0 && (
              <div className="space-y-4">
                {DAYS.map((day) => {
                  const daySlots = slots.filter((s) => s.day_of_week === day);
                  if (daySlots.length === 0) return null;

                  return (
                    <div key={day} className="p-4 rounded-xl bg-orange-50 border border-orange-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar size={18} className="text-orange-600" />
                        <p className="text-sm font-bold text-text-primary">{day}</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {daySlots.map((slot) => (
                          <div key={slot.id} className="flex items-center justify-between p-3 rounded-lg bg-white border border-orange-100 hover:border-orange-300 transition-colors">
                            <div className="flex items-center gap-2">
                              <Clock size={14} className="text-orange-600" />
                              <span className="text-sm font-medium text-text-primary">
                                {slot.start_time} – {slot.end_time}
                              </span>
                            </div>
                            <button onClick={() => handleDelete(slot.id)} disabled={deleting === slot.id} className="p-1.5 rounded-lg text-text-muted hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50" aria-label="Delete slot">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Add Slot Modal */}
      <Modal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Time Slot"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} isLoading={saving}>
              Add Slot
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Day</label>
            <select className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300" value={form.day_of_week} onChange={(e) => setForm((f) => ({ ...f, day_of_week: e.target.value }))}>
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Time" type="time" value={form.start_time} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))} />
            <Input label="End Time" type="time" value={form.end_time} onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminDoctorTimeSlots;
