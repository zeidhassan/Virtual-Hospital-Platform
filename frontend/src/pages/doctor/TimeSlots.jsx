import { useState } from 'react';
import { getMyTimeSlots, createTimeSlot, deleteTimeSlot } from '@/api/doctor';
import usePaginatedFetch from '@/hooks/usePaginatedFetch';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import PageHeader from '@/components/ui/PageHeader';
import { Clock, Plus, Trash2, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import clsx from 'clsx';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const schema = z.object({
  day_of_week: z.string().min(1, 'Select a day'),
  start_time: z.string().min(1, 'Required'),
  end_time: z.string().min(1, 'Required'),
});

const TimeSlots = () => {
  // Slots are grouped by day and shown as a full weekly view, not a list to
  // page through — a limit high enough to cover a realistic week's worth
  // (previously silently truncated at the default 10) is the right fit here.
  const { data: slots, isLoading, error, refetch } = usePaginatedFetch(getMyTimeSlots, {}, 100);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
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
    if (!window.confirm('Remove this time slot?')) return;
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

  // Group slots by day
  const slotsByDay = DAYS.reduce((acc, day) => {
    acc[day] = slots.filter((s) => s.day_of_week === day);
    return acc;
  }, {});

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="My Time Slots"
        action={
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={16} />
            Add Slot
          </Button>
        }
      />

      <Card>
        {isLoading && (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        )}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && slots.length === 0 && <EmptyState icon={Clock} title="No time slots" description="Add your availability to let patients book appointments." />}
        {!isLoading && !error && slots.length > 0 && (
          <div className="space-y-4">
            {DAYS.map((day) => {
              const daySlots = slotsByDay[day];
              if (daySlots.length === 0) return null;

              return (
                <div key={day} className="p-4 rounded-xl bg-surface-subtle border-l-4 border-l-emerald-500">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar size={18} className="text-emerald-600" />
                    <p className="text-sm font-bold text-text-primary">{day}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {daySlots.map((slot) => (
                      <div key={slot.id} className="flex items-center justify-between p-3 rounded-lg bg-surface hover:bg-surface-warm transition-colors border border-slate-200">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-emerald-600" />
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
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          reset();
        }}
        title="Add Time Slot"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setModalOpen(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button form="slot-form" type="submit" isLoading={isSubmitting}>
              Add Slot
            </Button>
          </>
        }
      >
        <form id="slot-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select label="Day of Week" error={errors.day_of_week?.message} {...register('day_of_week')}>
            <option value="">Select day...</option>
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
          <Input label="Start Time" type="time" error={errors.start_time?.message} {...register('start_time')} />
          <Input label="End Time" type="time" error={errors.end_time?.message} {...register('end_time')} />
        </form>
      </Modal>
    </div>
  );
};

export default TimeSlots;
