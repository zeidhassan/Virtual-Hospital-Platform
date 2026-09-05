import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { getAllSupportTickets, adminReplyToTicket, adminAssignTicket, updateTicketStatus, getTicketReplies } from '@/api/supportTickets';
import usePaginatedFetch from '@/hooks/usePaginatedFetch';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';
import { MessageSquare, User, Calendar, Tag, Send } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

const STATUS_OPTIONS = ['pending', 'open', 'in progress', 'resolved', 'closed'];

const replySchema = z.object({
  message: z.string().min(2, 'Message must be at least 2 characters'),
});

const statusVariant = (s) => {
  if (s === 'resolved' || s === 'closed') return 'success';
  if (s === 'in progress') return 'info';
  if (s === 'open') return 'warning';
  return 'default';
};

const statusBorderColor = (status) => {
  if (status === 'resolved' || status === 'closed') return 'border-l-green-500';
  if (status === 'in progress') return 'border-l-blue-500';
  if (status === 'open') return 'border-l-amber-500';
  if (status === 'pending') return 'border-l-slate-400';
  return 'border-l-slate-300';
};

const SupportTickets = () => {
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [replies, setReplies] = useState([]);
  const [loadingReplies, setLoadingReplies] = useState(false);

  const { data: tickets, isLoading, error, currentPage, totalPages, totalItems, pageSize, setPage, refetch } = usePaginatedFetch(getAllSupportTickets);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(replySchema),
  });

  const openReplyModal = async (ticket) => {
    setSelectedTicket(ticket);
    setShowReplyModal(true);
    setLoadingReplies(true);
    try {
      const res = await getTicketReplies(ticket.id);
      setReplies(res.data?.rows || []);
      // Viewing the thread marks it read server-side — resync the list so the
      // "unread" badge clears without waiting for the next manual refresh.
      if (ticket.has_unread) refetch();
    } catch (err) {
      toast.error('Failed to load replies');
      setReplies([]);
    } finally {
      setLoadingReplies(false);
    }
  };

  const closeReplyModal = () => {
    setShowReplyModal(false);
    setSelectedTicket(null);
    setReplies([]);
    reset();
  };

  const onReplySubmit = async (formData) => {
    if (!selectedTicket) return;
    setSubmitting(true);
    try {
      await adminReplyToTicket(selectedTicket.id, formData);
      toast.success('Reply sent!');
      reset();
      // Reload replies
      const res = await getTicketReplies(selectedTicket.id);
      setReplies(res.data?.rows || []);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send reply');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      await updateTicketStatus(ticketId, { status: newStatus });
      toast.success('Status updated!');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update status');
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Support Tickets" />

      <Card>
        {isLoading && (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        )}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && tickets.length === 0 && <EmptyState icon={MessageSquare} title="No support tickets" description="No tickets have been created yet." />}
        {!isLoading && !error && tickets.length > 0 && (
          <div className="space-y-3">
            {tickets.map((t) => (
              <div key={t.id} className={clsx('p-4 rounded-xl border-l-[5px] bg-surface-subtle hover:bg-surface-warm transition-colors cursor-pointer', statusBorderColor(t.status))} onClick={() => openReplyModal(t)}>
                <div className="flex items-start gap-4">
                  <div className="relative w-[46px] h-[46px] rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <MessageSquare size={22} className="text-orange-600" />
                    {t.has_unread && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-600 border-2 border-surface-subtle" title="New message" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <p className="text-xs font-mono text-text-muted">#{t.id}</p>
                        <div className="flex items-center gap-2">
                          <p className={clsx('text-sm', t.has_unread ? 'font-bold text-text-primary' : 'font-semibold text-text-primary')}>{t.subject}</p>
                          {t.has_unread && (
                            <Badge variant="danger" className="text-[10px] px-1.5 py-0.5">New</Badge>
                          )}
                        </div>
                      </div>
                      <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                    </div>
                    <p className="text-sm text-text-secondary mb-2 line-clamp-2">{t.description}</p>
                    <div className="flex items-center gap-4 text-xs text-text-muted">
                      <span>{t.creator_name || 'Unknown'}</span>
                      <span>•</span>
                      <span className="capitalize">{t.category || 'Other'}</span>
                      <span>•</span>
                      <span>{t.created_at ? format(new Date(t.created_at), 'dd MMM yyyy') : '—'}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Select value={t.status} onChange={(e) => handleStatusChange(t.id, e.target.value)} className="text-xs">
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
      </Card>

      {/* Reply Modal */}
      {showReplyModal && selectedTicket && (
        <Modal isOpen={!!showReplyModal} onClose={closeReplyModal} title={`Ticket #${selectedTicket.id}: ${selectedTicket.subject}`} size="large">
          <div className="space-y-4">
            {/* Ticket Details */}
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Status</p>
                <Badge variant={statusVariant(selectedTicket.status)}>{selectedTicket.status}</Badge>
              </div>
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Category</p>
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Tag size={16} className="text-orange-600" />
                  {selectedTicket.category || 'Other'}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Creator</p>
                <div className="flex items-center gap-2 text-sm text-text-primary">
                  <User size={16} className="text-orange-600" />
                  {selectedTicket.creator_name || 'Unknown'}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Created</p>
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Calendar size={16} className="text-orange-600" />
                  {format(new Date(selectedTicket.created_at), 'dd MMM yyyy, HH:mm')}
                </div>
              </div>
            </div>

            {/* Original Request */}
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Original Request</p>
              <p className="text-sm text-text-secondary whitespace-pre-wrap">{selectedTicket.description}</p>
            </div>

            {/* Replies */}
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Replies</p>
              {loadingReplies && (
                <div className="flex justify-center py-4">
                  <Spinner size="sm" />
                </div>
              )}
              {!loadingReplies && replies.length === 0 && <p className="text-sm text-text-secondary italic">No replies yet.</p>}
              {!loadingReplies && replies.length > 0 && (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {replies.map((r) => (
                    <div key={r.id} className="bg-surface-subtle rounded-lg p-3 border border-slate-100">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-medium text-text-primary">
                          {r.author_name} <span className="text-xs text-text-muted">({r.author_role})</span>
                        </p>
                        <p className="text-xs text-text-muted">{format(new Date(r.created_at), 'dd MMM yyyy HH:mm')}</p>
                      </div>
                      <p className="text-sm text-text-secondary whitespace-pre-wrap">{r.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reply Form */}
            <form onSubmit={handleSubmit(onReplySubmit)} className="space-y-3 pt-4 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Your Reply</label>
                <textarea rows={4} placeholder="Type your reply here…" className="w-full px-3.5 py-2.5 rounded-lg border text-sm border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-500 resize-none" {...register('message')} />
                {errors.message && <p className="text-xs text-red-600 mt-1">{errors.message.message}</p>}
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={closeReplyModal}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={submitting}>
                  <Send size={16} className="mr-2" />
                  Send Reply
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SupportTickets;
