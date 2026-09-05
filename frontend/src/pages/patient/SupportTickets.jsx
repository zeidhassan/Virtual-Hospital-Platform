import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { getMySupportTickets, createSupportTicket, patientReplyToTicket, getTicketReplies } from '@/api/supportTickets';
import usePaginatedFetch from '@/hooks/usePaginatedFetch';
import Card, { CardHeader } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import Pagination from '@/components/ui/Pagination';
import { MessageSquare, Send, ChevronLeft, X } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';
import { useAuth } from '@/hooks/useAuth';

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

// Thread view component
const TicketThread = ({ ticket, onBack, onReplyAdded }) => {
  const { user } = useAuth();
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const loadReplies = useCallback(async () => {
    try {
      const res = await getTicketReplies(ticket.id, { order: 'asc' });
      setReplies(res.data.rows || []);
    } catch (err) {
      toast.error('Failed to load replies');
    } finally {
      setLoading(false);
    }
  }, [ticket.id]);

  useEffect(() => {
    loadReplies();
  }, [loadReplies]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replies]);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await patientReplyToTicket(ticket.id, { message: message.trim() });
      setMessage('');
      await loadReplies();
      onReplyAdded?.();
      toast.success('Reply sent');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] border border-slate-200 rounded-card overflow-hidden bg-surface">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-surface-subtle flex-shrink-0">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-surface-warm text-text-secondary transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate">{ticket.subject}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant={statusVariant(ticket.status)}>{ticket.status}</Badge>
            <span className="text-xs text-text-muted">{ticket.category}</span>
          </div>
        </div>
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-surface-warm text-text-secondary transition-colors lg:hidden"
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* Initial ticket message */}
        <div className="flex flex-col items-start">
          <div className="max-w-[85%] bg-surface-subtle rounded-2xl rounded-tl-sm px-3.5 py-2.5">
            <p className="text-xs font-semibold text-brand-600 mb-1">You</p>
            <p className="text-sm text-text-primary whitespace-pre-wrap break-words">{ticket.description}</p>
            <p className="text-xs text-text-muted mt-1.5">
              {format(new Date(ticket.created_at), 'dd MMM yyyy, HH:mm')}
            </p>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        )}

        {!loading && replies.map((reply) => {
          const isMe = reply.user_id === user?.id;
          return (
            <div key={reply.id} className={clsx('flex flex-col', isMe ? 'items-end' : 'items-start')}>
              <div
                className={clsx(
                  'max-w-[85%] rounded-2xl px-3.5 py-2.5',
                  isMe
                    ? 'bg-brand-600 text-white rounded-tr-sm'
                    : 'bg-surface-subtle text-text-primary rounded-tl-sm'
                )}
              >
                {!isMe && (
                  <p className={clsx('text-xs font-semibold mb-1', isMe ? 'text-brand-200' : 'text-brand-600')}>
                    {reply.author_name || 'Support'}
                  </p>
                )}
                <p className="text-sm whitespace-pre-wrap break-words">{reply.message}</p>
                <p className={clsx('text-xs mt-1.5', isMe ? 'text-brand-200' : 'text-text-muted')}>
                  {format(new Date(reply.created_at), 'HH:mm')}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Compose */}
      {ticket.status !== 'closed' && ticket.status !== 'resolved' && (
        <div className="px-4 py-3 border-t border-slate-100 flex gap-2 items-end flex-shrink-0">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type your message… (Enter to send)"
            rows={1}
            className="flex-1 resize-none text-sm rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 max-h-28"
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || sending}
            className="p-2.5 rounded-xl bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
      )}
      {(ticket.status === 'closed' || ticket.status === 'resolved') && (
        <div className="px-4 py-3 border-t border-slate-100 bg-surface-subtle text-center text-sm text-text-muted">
          This ticket is {ticket.status}. No new replies can be added.
        </div>
      )}
    </div>
  );
};

const SupportTickets = () => {
  const [submitting, setSubmitting] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const { data: tickets, isLoading, error, currentPage, totalPages, totalItems, pageSize, setPage, refetch } = usePaginatedFetch(getMySupportTickets);

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

  const handleReplyAdded = () => {
    refetch();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="page-title">Support Tickets</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Create form + ticket list */}
        <div className={clsx('lg:col-span-1 space-y-6', selectedTicket && 'hidden lg:block')}>
          {/* Create form */}
          <Card>
            <CardHeader title="Create New Ticket" />
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
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
                  {submitting ? 'Creating…' : 'Create Ticket'}
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
              <div className="mt-4 space-y-2">
                {tickets.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className={clsx(
                      'w-full text-left p-3 rounded-lg border transition-colors',
                      selectedTicket?.id === t.id
                        ? 'border-brand-600 bg-brand-50'
                        : 'border-slate-200 hover:bg-surface-subtle'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-semibold text-text-primary truncate flex-1">{t.subject}</p>
                      <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                    </div>
                    <p className="text-xs text-text-muted">
                      {t.category} • {format(new Date(t.created_at), 'dd MMM yyyy')}
                    </p>
                  </button>
                ))}
              </div>
            )}
            <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
          </Card>
        </div>

        {/* Right: Thread view */}
        <div className={clsx('lg:col-span-2', !selectedTicket && 'hidden lg:flex lg:items-center lg:justify-center')}>
          {selectedTicket ? (
            <TicketThread
              ticket={selectedTicket}
              onBack={() => setSelectedTicket(null)}
              onReplyAdded={handleReplyAdded}
            />
          ) : (
            <EmptyState
              icon={MessageSquare}
              title="Select a ticket"
              description="Choose a ticket from the list to view the conversation."
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SupportTickets;
