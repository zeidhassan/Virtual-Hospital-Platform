import { useState } from 'react';
import { getDoctorFollowUps, createFollowUp, completeFollowUp, cancelFollowUp } from '@/api/followUps';
import { getPatientHealthLogs } from '@/api/healthLogs';
import useFetch from '@/hooks/useFetch';
import Card, { CardHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { CalendarCheck, Plus, CheckCircle, X, Activity } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_VARIANT = {
  pending:   'warning',
  completed: 'success',
  cancelled: 'default',
  missed:    'danger',
};

const inputCls = 'w-full text-sm rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300';

const DoctorFollowUps = () => {
  const { data, isLoading, error, refetch } = useFetch(getDoctorFollowUps);
  const followUps = data?.data || [];

  const [createModal, setCreateModal] = useState(false);
  const [form, setForm] = useState({ patient_id: '', scheduled_date: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState(null);

  // Patient health logs panel
  const [logsPatientId, setLogsPatientId] = useState(null);
  const { data: logsData, isLoading: logsLoading } = useFetch(
    logsPatientId ? () => getPatientHealthLogs(logsPatientId) : null,
    {},
    [logsPatientId]
  );
  const healthLogs = logsData?.data || [];

  const handleCreate = async () => {
    if (!form.patient_id || !form.scheduled_date) {
      return toast.error('Patient ID and scheduled date are required');
    }
    setSaving(true);
    try {
      await createFollowUp({ ...form, patient_id: Number(form.patient_id) });
      toast.success('Follow-up created');
      setCreateModal(false);
      setForm({ patient_id: '', scheduled_date: '', notes: '' });
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (id) => {
    setActing(id + '-complete');
    try {
      await completeFollowUp(id);
      toast.success('Marked as completed');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setActing(null);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this follow-up?')) return;
    setActing(id + '-cancel');
    try {
      await cancelFollowUp(id);
      toast.success('Follow-up cancelled');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Follow-Ups</h1>
        <Button size="sm" onClick={() => setCreateModal(true)}>
          <Plus size={14} className="mr-1.5" /> Create Follow-Up
        </Button>
      </div>

      <Card>
        <CardHeader title="Assigned Follow-Ups" />
        {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && followUps.length === 0 && (
          <EmptyState icon={CalendarCheck} title="No follow-ups assigned"
            description="Follow-ups you create for patients will appear here." />
        )}
        {!isLoading && !error && followUps.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-3 font-medium text-text-secondary">#</th>
                  <th className="text-left py-3 px-3 font-medium text-text-secondary">Patient ID</th>
                  <th className="text-left py-3 px-3 font-medium text-text-secondary">Date</th>
                  <th className="text-left py-3 px-3 font-medium text-text-secondary">Notes</th>
                  <th className="text-left py-3 px-3 font-medium text-text-secondary">Status</th>
                  <th className="py-3 px-3 text-right font-medium text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody>
                {followUps.map((fu) => (
                  <tr key={fu.id} className="border-b border-slate-50 hover:bg-surface-subtle">
                    <td className="py-3 px-3 text-text-secondary">#{fu.id}</td>
                    <td className="py-3 px-3 text-text-primary">
                      <button
                        className="text-brand-600 hover:underline"
                        onClick={() => setLogsPatientId(fu.patient_id === logsPatientId ? null : fu.patient_id)}>
                        Patient #{fu.patient_id}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-text-primary font-medium">
                      {fu.scheduled_date ? format(new Date(fu.scheduled_date), 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="py-3 px-3 text-text-secondary max-w-[200px] truncate" title={fu.notes}>
                      {fu.notes || '—'}
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant={STATUS_VARIANT[fu.status] || 'default'}>{fu.status}</Badge>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex justify-end gap-1">
                        {fu.status === 'pending' && (
                          <>
                            <Button size="xs" variant="secondary"
                              isLoading={acting === fu.id + '-complete'}
                              onClick={() => handleComplete(fu.id)}>
                              <CheckCircle size={12} className="mr-1" /> Complete
                            </Button>
                            <Button size="xs" variant="danger"
                              isLoading={acting === fu.id + '-cancel'}
                              onClick={() => handleCancel(fu.id)}>
                              <X size={12} className="mr-1" /> Cancel
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Health logs side panel */}
      {logsPatientId && (
        <Card>
          <CardHeader title={`Health Logs — Patient #${logsPatientId}`} />
          {logsLoading && <div className="flex justify-center py-8"><Spinner /></div>}
          {!logsLoading && healthLogs.length === 0 && (
            <EmptyState icon={Activity} title="No health logs" description="This patient hasn't submitted any logs yet." />
          )}
          {!logsLoading && healthLogs.length > 0 && (
            <div className="space-y-2 p-2">
              {healthLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 rounded-xl border border-slate-100 p-3">
                  <Badge variant="info" className="shrink-0 mt-0.5">
                    {log.log_type?.replace(/_/g, ' ')}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    {log.data && (
                      <p className="text-xs font-mono bg-surface-muted rounded px-2 py-1 mb-1 truncate text-text-secondary">
                        {JSON.stringify(log.data)}
                      </p>
                    )}
                    {log.notes && <p className="text-sm text-text-primary">{log.notes}</p>}
                  </div>
                  <span className="text-xs text-text-muted shrink-0">
                    {log.logged_at ? format(new Date(log.logged_at), 'dd MMM yyyy') : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Create modal */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Create Follow-Up"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreate} isLoading={saving}>Create</Button>
          </>
        }>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Patient ID *</label>
            <input type="number" value={form.patient_id}
              onChange={(e) => setForm((p) => ({ ...p, patient_id: e.target.value }))}
              placeholder="Enter patient ID" className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Scheduled Date *</label>
            <input type="date" value={form.scheduled_date}
              onChange={(e) => setForm((p) => ({ ...p, scheduled_date: e.target.value }))}
              className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Notes</label>
            <textarea rows={3} value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Instructions or reason for follow-up…"
              className={`${inputCls} resize-y`} />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DoctorFollowUps;
