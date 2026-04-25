import { useState } from 'react';
import { getMyTimeSlots, createTimeSlot, deleteTimeSlot } from '@/api/doctor';
import useFetch from '@/hooks/useFetch';
import Card, { CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { Clock, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const schema = z.object({
  day_of_week: z.string().min(1, 'Select a day'),
  start_time: z.string().min(1, 'Required'),
  end_time: z.string().min(1, 'Required'),
});

const TimeSlots = () => {
  const { data, isLoading, error, refetch } = useFetch(getMyTimeSlots);
  const slots = data?.slots || data?.data || data || [];
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (formData) => {
    try {
      await createTimeSlot(formData);
      toast.success('Time slot added');
      setModalOpen(false);
      reset();
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add slot');
    }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await deleteTimeSlot(id);
      toast.success('Slot removed');
      refetch();
    } catch {
      toast.error('Failed to remove slot');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <h1 className="page-title mb-6">My Time Slots</h1>
      <Card>
        <CardHeader
          title="Availability"
          action={<Button size="sm" onClick={() => setModalOpen(true)}><Plus size={16} /> Add Slot</Button>}
        />
        {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && slots.length === 0 && (
          <EmptyState icon={Clock} title="No time slots" description="Add your availability to let patients book appointments." />
        )}
        {!isLoading && !error && slots.length > 0 && (
          <div className="space-y-2">
            {slots.map((slot) => (
              <div key={slot.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-subtle">
                <div>
                  <p className="text-sm font-medium text-text-primary">{slot.day_of_week}</p>
                  <p className="text-xs text-text-secondary">{slot.start_time} – {slot.end_time}</p>
                </div>
                <button
                  onClick={() => handleDelete(slot.id)}
                  disabled={deleting === slot.id}
                  className="p-2 rounded-lg text-text-muted hover:bg-red-50 hover:text-red-500 transition-colors"
                  aria-label="Delete slot"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); reset(); }}
        title="Add Time Slot"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setModalOpen(false); reset(); }}>Cancel</Button>
            <Button form="slot-form" type="submit" isLoading={isSubmitting}>Add</Button>
          </>
        }
      >
        <form id="slot-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select label="Day of Week" error={errors.day_of_week?.message} {...register('day_of_week')}>
            <option value="">Select day...</option>
            {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
          <Input label="Start Time" type="time" error={errors.start_time?.message} {...register('start_time')} />
          <Input label="End Time" type="time" error={errors.end_time?.message} {...register('end_time')} />
        </form>
      </Modal>
    </div>
  );
};

export default TimeSlots;
