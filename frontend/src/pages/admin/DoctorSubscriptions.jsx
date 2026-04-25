import { useState } from 'react';
import { getDoctorSubscriptions, updateDoctorSubscription, getDoctorSubscriptionStats } from '@/api/admin';
import useFetch from '@/hooks/useFetch';
import Card, { CardHeader } from '@/components/ui/Card';
import Badge, { statusVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { Stethoscope, Check, X, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const SUB_STATUSES = ['pending', 'approved', 'rejected', 'cancelled', 'paid'];

const AdminDoctorSubscriptions = () => {
  const { data, isLoading, error, refetch } = useFetch(getDoctorSubscriptions);
  const { data: stats } = useFetch(getDoctorSubscriptionStats);
  const subs  = data?.data || data || [];

  const [processing, setProcessing] = useState(null);

  // Modify modal
  const [modifyModal, setModifyModal] = useState(null);
  const [modifyForm, setModifyForm]   = useState({});
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
      status:      sub.status || '',
      admin_notes: sub.admin_notes || '',
      start_date:  sub.start_date ? sub.start_date.split('T')[0] : '',
      end_date:    sub.end_date   ? sub.end_date.split('T')[0]   : '',
    });
  };

  const handleModifySave = async () => {
    setModifySaving(true);
    try {
      const payload = {};
      if (modifyForm.status)      payload.status      = modifyForm.status;
      if (modifyForm.admin_notes !== undefined) payload.admin_notes = modifyForm.admin_notes;
      if (modifyForm.start_date)  payload.start_date  = modifyForm.start_date;
      if (modifyForm.end_date)    payload.end_date    = modifyForm.end_date;
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
      <h1 className="page-title">Doctor Subscriptions</h1>

      {Array.isArray(stats) && stats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map((s) => (
            <Card key={s.plan_id}>
              <p className="text-sm text-text-secondary">{s.plan_name}</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{s.total_subscriptions ?? 0}</p>
              <p className="text-xs text-text-muted mt-1">{s.active_subscriptions ?? 0} active</p>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader title="All Doctor Subscriptions" />
        {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && subs.length === 0 && (
          <EmptyState icon={Stethoscope} title="No subscriptions" />
        )}
        {!isLoading && !error && subs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Doctor</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Plan</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Cycle</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Status</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Start</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">End</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Notes</th>
                  <th className="py-3 px-2" />
                </tr>
              </thead>
              <tbody>
                {subs.map((sub) => (
                  <tr key={sub.id} className="border-b border-slate-50 hover:bg-surface-subtle">
                    <td className="py-3 px-2 text-text-primary">{sub.doctor_name || sub.full_name || `Doctor #${sub.user_id}`}</td>
                    <td className="py-3 px-2 text-text-secondary">{sub.plan_name || `Plan #${sub.plan_id}`}</td>
                    <td className="py-3 px-2 text-text-secondary capitalize">{sub.billing_cycle || '—'}</td>
                    <td className="py-3 px-2"><Badge variant={statusVariant(sub.status)}>{sub.status}</Badge></td>
                    <td className="py-3 px-2 text-text-secondary">{sub.start_date ? format(new Date(sub.start_date), 'dd MMM yyyy') : '—'}</td>
                    <td className="py-3 px-2 text-text-secondary">{sub.end_date ? format(new Date(sub.end_date), 'dd MMM yyyy') : '—'}</td>
                    <td className="py-3 px-2 text-text-secondary max-w-[140px] truncate">{sub.admin_notes || '—'}</td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-1">
                        {sub.status === 'pending' && (
                          <>
                            <button
                              onClick={() => quickAction(sub.id, 'approved', 'Approved by admin')}
                              disabled={processing === sub.id}
                              className="p-1.5 rounded-lg text-text-muted hover:bg-green-50 hover:text-green-600 transition-colors disabled:opacity-40"
                              title="Approve">
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => quickAction(sub.id, 'rejected', 'Rejected by admin')}
                              disabled={processing === sub.id}
                              className="p-1.5 rounded-lg text-text-muted hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40"
                              title="Reject">
                              <X size={14} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => openModify(sub)}
                          className="p-1.5 rounded-lg text-text-muted hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          title="Modify">
                          <Edit2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modify modal */}
      <Modal
        isOpen={!!modifyModal}
        onClose={() => setModifyModal(null)}
        title={`Modify Subscription — ${modifyModal?.doctor_name || modifyModal?.full_name || `#${modifyModal?.id}`}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModifyModal(null)}>Cancel</Button>
            <Button onClick={handleModifySave} isLoading={modifySaving}>Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Status</label>
            <select
              className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
              value={modifyForm.status || ''}
              onChange={(e) => setModifyForm((f) => ({ ...f, status: e.target.value }))}
            >
              {SUB_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" type="date"
              value={modifyForm.start_date || ''}
              onChange={(e) => setModifyForm((f) => ({ ...f, start_date: e.target.value }))} />
            <Input label="End Date" type="date"
              value={modifyForm.end_date || ''}
              onChange={(e) => setModifyForm((f) => ({ ...f, end_date: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Admin Notes</label>
            <textarea
              className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
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
