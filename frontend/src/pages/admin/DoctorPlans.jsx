import { useState } from 'react';
import { getAdminPlans, createAdminPlan, updateAdminPlan, deleteAdminPlan } from '@/api/admin';
import useFetch from '@/hooks/useFetch';
import Card, { CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { Star, Plus, Edit2, Trash2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const BLANK_FORM = { name: '', description: '', monthly_price: '', yearly_price: '', currency: 'SAR', features: '' };

const AdminDoctorPlans = () => {
  const { data, isLoading, error, refetch } = useFetch(getAdminPlans);
  const plans = data?.data || data || [];

  const [modal, setModal]       = useState(null); // 'create' | plan object for edit
  const [form, setForm]         = useState(BLANK_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const openCreate = () => { setForm(BLANK_FORM); setModal('create'); };
  const openEdit   = (plan) => {
    setForm({
      name:          plan.name          || '',
      description:   plan.description   || '',
      monthly_price: plan.monthly_price != null ? String(plan.monthly_price) : '',
      yearly_price:  plan.yearly_price  != null ? String(plan.yearly_price)  : '',
      currency:      plan.currency      || 'SAR',
      features:      plan.features      ? JSON.stringify(plan.features, null, 2) : '',
    });
    setModal(plan);
  };

  const handleSave = async () => {
    if (!form.name) return toast.error('Plan name is required');
    setSubmitting(true);
    try {
      let parsedFeatures = {};
      if (form.features.trim()) {
        try { parsedFeatures = JSON.parse(form.features); }
        catch { return toast.error('Features must be valid JSON (e.g. {"analytics": true})'); }
      }
      const payload = {
        name:          form.name,
        description:   form.description || null,
        monthly_price: form.monthly_price ? parseFloat(form.monthly_price) : 0,
        yearly_price:  form.yearly_price  ? parseFloat(form.yearly_price)  : 0,
        currency:      form.currency      || 'SAR',
        features:      parsedFeatures,
      };
      if (modal === 'create') {
        await createAdminPlan(payload);
        toast.success('Plan created');
      } else {
        await updateAdminPlan(modal.id, payload);
        toast.success('Plan updated');
      }
      setModal(null);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save plan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this plan? Doctors subscribed to it may be affected.')) return;
    setDeleting(id);
    try {
      await deleteAdminPlan(id);
      toast.success('Plan deleted');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete plan');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <h1 className="page-title mb-6">Doctor Plans</h1>
      <Card>
        <CardHeader
          title="Manage Plans"
          action={
            <Button size="sm" onClick={openCreate}>
              <Plus size={15} className="mr-1" /> New Plan
            </Button>
          }
        />
        {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && plans.length === 0 && (
          <EmptyState icon={Star} title="No plans" description="Create your first subscription plan for doctors." />
        )}
        {!isLoading && !error && plans.length > 0 && (
          <div className="space-y-3">
            {plans.map((plan) => {
              const features = plan.features ? Object.entries(plan.features) : [];
              return (
                <div key={plan.id} className="p-4 rounded-xl bg-surface-subtle flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                    <Star size={18} className="text-brand-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold text-text-primary">{plan.name}</p>
                      <span className="text-xs text-text-muted">
                        {plan.currency || 'SAR'} {Number(plan.monthly_price || 0).toFixed(2)}/mo
                        {' · '}
                        {plan.currency || 'SAR'} {Number(plan.yearly_price || 0).toFixed(2)}/yr
                      </span>
                    </div>
                    {plan.description && (
                      <p className="text-sm text-text-secondary mb-2">{plan.description}</p>
                    )}
                    {features.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {features.map(([key, val]) => (
                          <span key={key} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                            val ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400 line-through'
                          }`}>
                            <CheckCircle size={10} />
                            {key.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(plan)}
                      className="p-1.5 rounded-lg text-text-muted hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      title="Edit plan">
                      <Edit2 size={15} />
                    </button>
                    <button onClick={() => handleDelete(plan.id)} disabled={deleting === plan.id}
                      className="p-1.5 rounded-lg text-text-muted hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40"
                      title="Delete plan">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Create / Edit modal */}
      <Modal
        isOpen={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'create' ? 'New Plan' : `Edit Plan: ${modal?.name}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={handleSave} isLoading={submitting}>Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Plan Name *" placeholder="e.g. Basic, Pro, Enterprise"
            value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input label="Description" placeholder="Short description"
            value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Monthly Price" type="number" placeholder="0.00"
              value={form.monthly_price} onChange={(e) => setForm((f) => ({ ...f, monthly_price: e.target.value }))} />
            <Input label="Yearly Price" type="number" placeholder="0.00"
              value={form.yearly_price} onChange={(e) => setForm((f) => ({ ...f, yearly_price: e.target.value }))} />
          </div>
          <Input label="Currency" placeholder="SAR"
            value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} />
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">
              Features (JSON object, e.g. {`{"analytics": true, "priority_support": false}`})
            </label>
            <textarea
              className="w-full text-sm font-mono rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
              rows={4}
              placeholder={`{"analytics": true, "priority_support": false}`}
              value={form.features}
              onChange={(e) => setForm((f) => ({ ...f, features: e.target.value }))}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminDoctorPlans;
