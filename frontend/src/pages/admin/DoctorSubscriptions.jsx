import { useState } from 'react';
import { getDoctorSubscriptions, updateDoctorSubscription, getDoctorSubscriptionStats } from '@/api/admin';
import useFetch from '@/hooks/useFetch';
import usePaginatedFetch from '@/hooks/usePaginatedFetch';
import Card from '@/components/ui/Card';
import Badge, { statusVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';
import StatCard from '@/components/ui/StatCard';
import { Stethoscope, Check, X, Edit2, User, Calendar, CreditCard, FileText } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const SUB_STATUSES = ['pending', 'approved', 'rejected', 'cancelled', 'paid'];

const statusBorderColor = (status) => {
  if (status === 'approved' || status === 'paid') return 'border-l-green-500';
  if (status === 'pending') return 'border-l-amber-500';
  if (status === 'rejected' || status === 'cancelled') return 'border-l-red-500';
  return 'border-l-slate-300';
};

const AdminDoctorSubscriptions = () => {
  const { data: subs, isLoading, error, currentPage, totalPages, totalItems, pageSize, setPage, refetch } = usePaginatedFetch(getDoctorSubscriptions);
  const { data: stats } = useFetch(getDoctorSubscriptionStats);

  const [processing, setProcessing] = useState(null);
  const [detailModal, setDetailModal] = useState(null);

  // Modify modal
  const [modifyModal, setModifyModal] = useState(null);
  const [modifyForm, setModifyForm] = useState({});
  const [modifySaving, setModifySaving] = useState(false);

  const quickAction = async (id, status, notes) => {
    setProcessing(id);
    try {
      await updateDoctorSubscription(id, { status, admin_notes: notes });
      toast.success(`Subscription ${status}`);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update');
    } finally {
      setProcessing(null);
    }
  };

  const openModify = (sub) => {
    setModifyModal(sub);
    setModifyForm({
      status: sub.status || '',
      admin_notes: sub.admin_notes || '',
      start_date: sub.start_date ? sub.start_date.split('T')[0] : '',
      end_date: sub.end_date ? sub.end_date.split('T')[0] : '',
    });
  };

  const handleModifySave = async () => {
    setModifySaving(true);
    try {
      const payload = {};
      if (modifyForm.status) payload.status = modifyForm.status;
      if (modifyForm.admin_notes !== undefined) payload.admin_notes = modifyForm.admin_notes;
      if (modifyForm.start_date) payload.start_date = modifyForm.start_date;
      if (modifyForm.end_date) payload.end_date = modifyForm.end_date;
      await updateDoctorSubscription(modifyModal.id, payload);
      toast.success('Subscription updated');
      setModifyModal(null);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setModifySaving(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Doctor Subscriptions" />

      {Array.isArray(stats) && stats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map((s) => (
            <StatCard key={s.plan_id} label={s.plan_name} value={s.total_subscriptions ?? 0} sub={`${s.active_subscriptions ?? 0} active`} icon={Stethoscope} iconBg="#D97706" />
          ))}
        </div>
      )}

      <Card>
        {isLoading && (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        )}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && subs.length === 0 && <EmptyState icon={Stethoscope} title="No subscriptions" description="Doctor subscription requests will appear here." />}
        {!isLoading && !error && subs.length > 0 && (
          <div className="space-y-3">
            {subs.map((sub) => (
              <div key={sub.id} className={clsx('p-4 rounded-xl border-l-[5px] bg-surface-subtle hover:bg-surface-warm transition-colors cursor-pointer', statusBorderColor(sub.status))} onClick={() => setDetailModal(sub)}>
                <div className="flex items-start gap-4">
                  <div className="w-[46px] h-[46px] rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <Stethoscope size={22} className="text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <p className="text-xs font-mono text-text-muted">#{sub.id}</p>
                        <p className="text-sm font-semibold text-text-primary">{sub.doctor_name || sub.full_name || `Doctor #${sub.user_id}`}</p>
                      </div>
                      <Badge variant={statusVariant(sub.status)}>{sub.status}</Badge>
                    </div>
                    <p className="text-sm text-text-secondary mb-2">{sub.plan_name || `Plan #${sub.plan_id}`}</p>
                    <div className="flex items-center gap-4 text-xs text-text-muted">
                      <span className="capitalize">{sub.billing_cycle || '—'}</span>
                      <span>•</span>
                      <span>
                        {sub.start_date ? format(new Date(sub.start_date), 'dd MMM yyyy') : '—'} – {sub.end_date ? format(new Date(sub.end_date), 'dd MMM yyyy') : '—'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {sub.status === 'pending' && (
                      <>
                        <Button size="sm" onClick={() => quickAction(sub.id, 'approved', 'Approved by admin')} disabled={processing === sub.id}>
                          <Check size={14} className="mr-1" />
                          Approve
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => quickAction(sub.id, 'rejected', 'Rejected by admin')} disabled={processing === sub.id} className="text-red-600 hover:bg-red-50">
                          <X size={14} className="mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="secondary" onClick={() => openModify(sub)}>
                      <Edit2 size={14} className="mr-1" />
                      Modify
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
      </Card>

      {/* Detail Modal */}
      {detailModal && (
        <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title={`Subscription #${detailModal.id}`}>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Status</p>
              <Badge variant={statusVariant(detailModal.status)}>{detailModal.status}</Badge>
            </div>
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Doctor</p>
              <div className="flex items-center gap-2 text-sm text-text-primary">
                <User size={16} className="text-orange-600" />
                {detailModal.doctor_name || detailModal.full_name || `Doctor #${detailModal.user_id}`}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Plan</p>
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <CreditCard size={16} className="text-orange-600" />
                {detailModal.plan_name || `Plan #${detailModal.plan_id}`}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Billing Cycle</p>
              <p className="text-sm text-text-secondary capitalize">{detailModal.billing_cycle || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Subscription Period</p>
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Calendar size={16} className="text-orange-600" />
                {detailModal.start_date ? format(new Date(detailModal.start_date), 'dd MMM yyyy') : '—'} – {detailModal.end_date ? format(new Date(detailModal.end_date), 'dd MMM yyyy') : '—'}
              </div>
            </div>
            {detailModal.admin_notes && (
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Admin Notes</p>
                <div className="flex items-start gap-2">
                  <FileText size={16} className="text-orange-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-text-secondary whitespace-pre-wrap">{detailModal.admin_notes}</p>
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              {detailModal.status === 'pending' && (
                <>
                  <Button
                    onClick={() => {
                      quickAction(detailModal.id, 'approved', 'Approved by admin');
                      setDetailModal(null);
                    }}
                    disabled={processing === detailModal.id}
                    className="flex-1"
                  >
                    <Check size={16} className="mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      quickAction(detailModal.id, 'rejected', 'Rejected by admin');
                      setDetailModal(null);
                    }}
                    disabled={processing === detailModal.id}
                    className="flex-1 text-red-600 hover:bg-red-50"
                  >
                    <X size={16} className="mr-2" />
                    Reject
                  </Button>
                </>
              )}
              <Button
                variant="secondary"
                onClick={() => {
                  openModify(detailModal);
                  setDetailModal(null);
                }}
                className="flex-1"
              >
                <Edit2 size={16} className="mr-2" />
                Modify
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modify modal */}
      <Modal
        isOpen={!!modifyModal}
        onClose={() => setModifyModal(null)}
        title={`Modify Subscription — ${modifyModal?.doctor_name || modifyModal?.full_name || `#${modifyModal?.id}`}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModifyModal(null)}>
              Cancel
            </Button>
            <Button onClick={handleModifySave} isLoading={modifySaving}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Status</label>
            <select className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300" value={modifyForm.status || ''} onChange={(e) => setModifyForm((f) => ({ ...f, status: e.target.value }))}>
              {SUB_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" type="date" value={modifyForm.start_date || ''} onChange={(e) => setModifyForm((f) => ({ ...f, start_date: e.target.value }))} />
            <Input label="End Date" type="date" value={modifyForm.end_date || ''} onChange={(e) => setModifyForm((f) => ({ ...f, end_date: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Admin Notes</label>
            <textarea
              className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
              rows={3}
              placeholder="Notes visible to the doctor..."
              value={modifyForm.admin_notes || ''}
              onChange={(e) => setModifyForm((f) => ({ ...f, admin_notes: e.target.value }))}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminDoctorSubscriptions;
