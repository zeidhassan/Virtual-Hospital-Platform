import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getSpecializations, getDoctorsBySpecialization, getDoctorTimeSlots, bookAppointment } from '@/api/appointments';
import Card from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import PageHeader from '@/components/ui/PageHeader';
import { Calendar, Clock, User } from 'lucide-react';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Given a set of available day names (lowercase), find the next calendar date from `fromDate`
// (inclusive) that falls on one of those days.
const nextAvailableDate = (availableDayNamesSet, fromDateStr) => {
  const from = new Date(fromDateStr + 'T12:00:00');
  for (let i = 0; i < 14; i++) {
    const candidate = new Date(from);
    candidate.setDate(from.getDate() + i);
    const name = DAY_NAMES[candidate.getDay()].toLowerCase();
    if (availableDayNamesSet.has(name)) {
      return candidate.toISOString().split('T')[0];
    }
  }
  return null;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

const BookAppointment = () => {
  const navigate = useNavigate();
  const [specializations, setSpecializations] = useState([]);
  const [selectedSpec, setSelectedSpec] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [date, setDate] = useState('');
  const [timeSlots, setTimeSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [notes, setNotes] = useState('');
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    getSpecializations()
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : [];
        setSpecializations(list.map((s) => (typeof s === 'string' ? s : s.specialization)));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedSpec) {
      setDoctors([]);
      return;
    }
    setLoadingDoctors(true);
    setSelectedDoctorId('');
    setTimeSlots([]);
    setSelectedSlot(null);
    setDate('');
    getDoctorsBySpecialization(selectedSpec)
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data?.data || [];
        setDoctors(list);
      })
      .catch(() => {})
      .finally(() => setLoadingDoctors(false));
  }, [selectedSpec]);

  useEffect(() => {
    if (!selectedDoctorId) {
      setTimeSlots([]);
      setSelectedSlot(null);
      setDate('');
      return;
    }
    setLoadingSlots(true);
    setSelectedSlot(null);
    setDate('');
    getDoctorTimeSlots(selectedDoctorId)
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data?.data || [];
        setTimeSlots(list);
      })
      .catch(() => {})
      .finally(() => setLoadingSlots(false));
  }, [selectedDoctorId]);

  // Set of available day names (lowercase) from the loaded time slots
  const availableDaySet = useMemo(() => new Set(timeSlots.map((s) => (s.day_of_week || '').toLowerCase())), [timeSlots]);

  // Display-friendly sorted list of available days
  const availableDayLabels = useMemo(() => {
    const ordered = DAY_NAMES.filter((d) => availableDaySet.has(d.toLowerCase()));
    return ordered;
  }, [availableDaySet]);

  // Time slots filtered to selected date's day of week
  const filteredSlots = useMemo(() => {
    if (!date) return [];
    const dayName = DAY_NAMES[new Date(date + 'T12:00:00').getDay()].toLowerCase();
    return timeSlots.filter((s) => (s.day_of_week || '').toLowerCase() === dayName);
  }, [date, timeSlots]);

  // Is the picked date on an unavailable day?
  const dateOnUnavailableDay = date && availableDaySet.size > 0 && filteredSlots.length === 0;

  // Next valid date suggestion
  const suggestedDate = useMemo(() => {
    if (!dateOnUnavailableDay || !date) return null;
    return nextAvailableDate(availableDaySet, date);
  }, [dateOnUnavailableDay, date, availableDaySet]);

  const validate = () => {
    const e = {};
    if (!selectedDoctorId) e.doctor = 'Select a doctor';
    if (!date) e.date = 'Select a date';
    if (!selectedSlot) e.slot = 'Select a time slot';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await bookAppointment({
        doctor_id: parseInt(selectedDoctorId),
        appointment_date: date,
        appointment_start_time: selectedSlot.start_time,
        appointment_end_time: selectedSlot.end_time,
        notes: notes || undefined,
      });
      toast.success('Appointment booked successfully!');
      navigate('/patient/my-appointments');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to book appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Book an Appointment" />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Specialization */}
          <div>
            <Select label="Specialization" value={selectedSpec} onChange={(e) => setSelectedSpec(e.target.value)}>
              <option value="">Select specialization...</option>
              {specializations.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>

          {/* Doctor */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">Doctor</label>
            {loadingDoctors ? (
              <Spinner size="sm" />
            ) : (
              <select
                className="w-full px-3.5 py-2.5 rounded-lg border text-sm border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                disabled={!selectedSpec || doctors.length === 0}
              >
                <option value="">Select doctor...</option>
                {doctors.map((d) => (
                  <option key={d.doctor_id} value={d.doctor_id}>
                    {d.full_name}
                  </option>
                ))}
              </select>
            )}
            {errors.doctor && <p className="text-sm text-red-600">{errors.doctor}</p>}
          </div>

          {/* Available days banner */}
          {selectedDoctorId && !loadingSlots && availableDayLabels.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 p-4 rounded-xl bg-indigo-50 border border-indigo-200">
              <Calendar size={16} className="text-indigo-600 flex-shrink-0" />
              <span className="text-xs font-semibold text-indigo-700">Available days:</span>
              {availableDayLabels.map((day) => (
                <span key={day} className="text-xs px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 font-medium border border-indigo-200">
                  {day}
                </span>
              ))}
            </div>
          )}

          {/* Date */}
          <div className="space-y-1.5">
            <Input
              label="Appointment Date"
              type="date"
              min={today}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setSelectedSlot(null);
              }}
              error={errors.date}
            />

            {/* Unavailable-day warning */}
            {dateOnUnavailableDay && (
              <div className="mt-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm">
                <p className="text-amber-800 font-medium">
                  No slots on {DAY_NAMES[new Date(date + 'T12:00:00').getDay()]}. This doctor is available on: <span className="font-semibold">{availableDayLabels.join(', ')}</span>.
                </p>
                {suggestedDate && (
                  <div className="mt-2 flex items-center gap-3">
                    <span className="text-amber-700 text-xs">
                      Nearest available: <strong>{formatDate(suggestedDate)}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setDate(suggestedDate);
                        setSelectedSlot(null);
                      }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 transition-colors"
                    >
                      Use this date
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Time Slot */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">Time Slot</label>
            {loadingSlots ? (
              <Spinner size="sm" />
            ) : (
              <select
                className="w-full px-3.5 py-2.5 rounded-lg border text-sm border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                value={selectedSlot?.id || ''}
                onChange={(e) => {
                  const slot = filteredSlots.find((s) => String(s.id) === e.target.value);
                  setSelectedSlot(slot || null);
                }}
                disabled={!selectedDoctorId || !date || filteredSlots.length === 0}
              >
                <option value="">{!selectedDoctorId ? 'Select a doctor first' : !date ? 'Select a date first' : filteredSlots.length === 0 ? 'No slots for this day' : 'Select time slot...'}</option>
                {filteredSlots.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {slot.start_time} – {slot.end_time}
                  </option>
                ))}
              </select>
            )}
            {errors.slot && <p className="text-sm text-red-600">{errors.slot}</p>}
          </div>

          {/* Notes */}
          <Input label="Notes (optional)" placeholder="Any symptoms or reason for visit..." value={notes} onChange={(e) => setNotes(e.target.value)} />

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting} className="flex-1">
              Book Appointment
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default BookAppointment;
