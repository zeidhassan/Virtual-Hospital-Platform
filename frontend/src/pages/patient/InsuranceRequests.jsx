import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  getMyInsuranceRequests,
  getMyPolicy,
  saveMyPolicy,
  cancelMyPolicy,
} from '@/api/insurance';
import usePaginatedFetch from '@/hooks/usePaginatedFetch';
import Card, { CardHeader } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import Pagination from '@/components/ui/Pagination';
import { Shield, ShieldCheck, ShieldOff, Pencil, Plus } from 'lucide-react';
import { format } from 'date-fns';

const policySchema = z.object({
  insurance_company: z.string().min(2, 'Company name is required'),
  insurance_id_number: z.string().min(2, 'Insurance ID is required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
});

const statusVariant = (s) => {
  if (s === 'accepted') return 'success';
  if (s === 'rejected') return 'error';
  return 'warning';
};

const fmtDate = (d) => (d ? format(new Date(d), 'dd MMM yyyy') : '—');

// ── Policy Card ────────────────────────────────────────────────────────────
const PolicyCard = ({ policy, onEdit, onCancel, cancelling }) => (
  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-start gap-4">
    <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0">
      <ShieldCheck size={20} className="text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <p className="font-semibold text-emerald-900">{policy.insurance_company}</p>
        <Badge variant="success">Active</Badge>
      </div>
      <p className="text-sm text-emerald-800 font-mono">{policy.insurance_id_number}</p>
      <p className="text-xs text-emerald-700 mt-1">
        Coverage: {fmtDate(policy.start_date)} — {fmtDate(policy.end_date)}
      </p>
    </div>
    <div className="flex gap-2 flex-shrink-0">
      <Button size="sm" variant="outline" onClick={onEdit}>
        <Pencil size={14} className="mr-1" /> Edit
      </Button>
      <Button size="sm" variant="ghost" onClick={onCancel} isLoading={cancelling} disabled={cancelling}
        className="text-red-600 hover:bg-red-50">
        <ShieldOff size={14} className="mr-1" /> Cancel
      </Button>
    </div>
  </div>
);

// ── Policy Form ────────────────────────────────────────────────────────────
const PolicyForm = ({ existing, onSaved, onClose }) => {
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(policySchema),
    defaultValues: existing ? {
      insurance_company: existing.insurance_company,
      insurance_id_number: existing.insurance_id_number,
      start_date: existing.start_date?.slice(0, 10) || '',
      end_date: existing.end_date?.slice(0, 10) || '',
    } : {},
  });

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      await saveMyPolicy(data);
      toast.success(existing ? 'Insurance policy updated.' : 'Insurance policy saved.');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save policy.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Insurance Company" placeholder="e.g. AIA, Prudential, Takaful"
          error={errors.insurance_company?.message} {...register('insurance_company')} />
        <Input label="Member / Policy ID" placeholder="e.g. AIA-JD-20250101"
          error={errors.insurance_id_number?.message} {...register('insurance_id_number')} />
        <Input label="Coverage Start Date" type="date"
          error={errors.start_date?.message} {...register('start_date')} />
        <Input label="Coverage End Date" type="date"
          error={errors.end_date?.message} {...register('end_date')} />
      </div>
      <div className="flex gap-3 justify-end">
        {onClose && <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>}
        <Button type="submit" isLoading={saving} disabled={saving}>
          {existing ? 'Update Policy' : 'Save Policy'}
        </Button>
      </div>
    </form>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────
const InsurancePage = () => {
  const [policy, setPolicy] = useState(undefined);  // undefined = loading, null = none
  const [policyLoading, setPolicyLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const {
    data: requests,
    isLoading: reqLoading,
    error: reqError,
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    setPage,
    refetch: loadRequests,
  } = usePaginatedFetch(getMyInsuranceRequests);

  const loadPolicy = useCallback(async () => {
    try {
      const res = await getMyPolicy();
      setPolicy(res.data.policy || null);
    } catch {
      setPolicy(null);
    } finally {
      setPolicyLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPolicy();
  }, [loadPolicy]);

  const handlePolicySaved = () => {
    setShowForm(false);
    setPolicyLoading(true);
    loadPolicy();
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel your active insurance policy?')) return;
    setCancelling(true);
    try {
      await cancelMyPolicy();
      toast.success('Insurance policy cancelled.');
      setPolicy(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel policy.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <h1 className="page-title">My Insurance</h1>

      {/* Active policy section */}
      <Card>
        <CardHeader title="Active Insurance Policy" />
        <div className="mt-4">
          {policyLoading && <div className="flex justify-center py-6"><Spinner /></div>}

          {!policyLoading && policy && !showForm && (
            <PolicyCard
              policy={policy}
              onEdit={() => setShowForm(true)}
              onCancel={handleCancel}
              cancelling={cancelling}
            />
          )}

          {!policyLoading && !policy && !showForm && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Shield size={40} className="text-slate-300" />
              <p className="text-sm text-text-secondary">No active insurance policy on your account.</p>
              <Button onClick={() => setShowForm(true)}>
                <Plus size={15} className="mr-1" /> Add Insurance Policy
              </Button>
            </div>
          )}

          {showForm && (
            <PolicyForm
              existing={policy}
              onSaved={handlePolicySaved}
              onClose={() => setShowForm(false)}
            />
          )}
        </div>
      </Card>

      {/* Insurance request history */}
      <Card>
        <CardHeader title="Insurance Request History" />
        {reqLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}
        {reqError && <ErrorState message={reqError} onRetry={loadRequests} />}
        {!reqLoading && !reqError && requests.length === 0 && (
          <EmptyState
            icon={Shield}
            title="No insurance requests yet"
            description="When you use insurance as a payment method on a bill, the request will appear here."
          />
        )}
        {!reqLoading && !reqError && requests.length > 0 && (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Company</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Member ID</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Start</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">End</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Bill</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Status</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Reviewed By</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-surface-subtle">
                    <td className="py-3 px-2 text-text-primary">{r.insurance_company}</td>
                    <td className="py-3 px-2 text-text-secondary font-mono text-xs">{r.insurance_id_number}</td>
                    <td className="py-3 px-2 text-text-secondary">{fmtDate(r.start_date)}</td>
                    <td className="py-3 px-2 text-text-secondary">{fmtDate(r.end_date)}</td>
                    <td className="py-3 px-2 text-text-secondary text-xs">
                      {r.bill_id ? `#${r.bill_id}` : r.bill_description ? r.bill_description.slice(0, 20) : '—'}
                    </td>
                    <td className="py-3 px-2">
                      <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                    </td>
                    <td className="py-3 px-2 text-text-secondary text-xs">{r.reviewed_by_name || '—'}</td>
                    <td className="py-3 px-2 text-text-secondary">{fmtDate(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
      </Card>
    </div>
  );
};

export default InsurancePage;
