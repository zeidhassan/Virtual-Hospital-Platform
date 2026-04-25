import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { getMySupportTickets, createSupportTicket } from '@/api/patient';
import useFetch from '@/hooks/useFetch';
import Card, { CardHeader } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

const CATEGORIES = ['Technical', 'Medical', 'Billing', 'Appointments', 'Other'];

const schema = z.object({
  subject: z.string().min(3, 'Subject must be at least 3 characters'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  category: z.string().optional(),
});

const statusVariant = (s) => {
  if (s === 'resolved' || s === 'closed') return 'success';
  if (s === 'in progress') return 'info';
  if (s === 'open') return 'warning';
  return 'default';
};

const SupportTickets = () => {
  const [submitting, setSubmitting] = useState(false);
  const { data, isLoading, error, refetch } = useFetch(getMySupportTickets);
  const tickets = data?.data || (Array.isArray(data) ? data : []);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { category: 'Other' },
  });

  const onSubmit = async (formData) => {
    setSubmitting(true);
    try {
      await createSupportTicket(formData);
      toast.success('Support ticket created!');
      reset();
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="page-title">Support Tickets</h1>

      {/* Create form */}
      <Card>
        <CardHeader title="Create New Ticket" />
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Subject"
              placeholder="Brief description of your issue"
              error={errors.subject?.message}
              {...register('subject')}
            />
            <Select
              label="Category"
              error={errors.category?.message}
              {...register('category')}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">Description</label>
            <textarea
              rows={4}
              placeholder="Describe your issue in detail…"
              className="w-full px-3.5 py-2.5 rounded-lg border text-sm border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-none"
              {...register('description')}
            />
            {errors.description && (
              <p className="text-xs text-red-600">{errors.description.message}</p>
            )}
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Create Ticket'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Ticket list */}
      <Card>
        <CardHeader title="My Tickets" />
        {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && tickets.length === 0 && (
          <EmptyState
            icon={MessageSquare}
            title="No support tickets yet"
            description="Create your first ticket above and we'll get back to you."
          />
        )}
        {!isLoading && !error && tickets.length > 0 && (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Subject</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Category</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Status</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Created</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id} className="border-b border-slate-50 hover:bg-surface-subtle">
                    <td className="py-3 px-2 text-text-primary max-w-xs truncate">{t.subject}</td>
                    <td className="py-3 px-2 text-text-secondary">{t.category || 'Other'}</td>
                    <td className="py-3 px-2">
                      <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                    </td>
                    <td className="py-3 px-2 text-text-secondary">
                      {t.created_at ? format(new Date(t.created_at), 'dd MMM yyyy') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default SupportTickets;
