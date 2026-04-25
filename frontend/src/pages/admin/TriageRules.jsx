import { useState } from 'react';
import toast from 'react-hot-toast';
import { getTriageRules, createTriageRule, updateTriageRule, deleteTriageRule } from '@/api/triage';
import useFetch from '@/hooks/useFetch';
import Card, { CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { ShieldCheck } from 'lucide-react';

const URGENCY_VARIANT = {
  emergency: 'danger',
  urgent: 'warning',
  standard: 'info',
  self_care: 'success',
};

const BLANK = { urgency_level: 'standard', keywords: '', recommended_action: '', recommended_department: '' };

const TriageRules = () => {
  const { data, isLoading, error, refetch } = useFetch(getTriageRules);
  const rules = data?.data || [];

  const [form, setForm] = useState(BLANK);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.keywords.trim() || !form.recommended_action.trim() || !form.recommended_department.trim()) {
      toast.error('All fields are required.');
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await updateTriageRule(editId, form);
        toast.success('Rule updated.');
      } else {
        await createTriageRule(form);
        toast.success('Rule created.');
      }
      setForm(BLANK);
      setEditId(null);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Failed to save rule.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (rule) => {
    setEditId(rule.id);
    setForm({
      urgency_level: rule.urgency_level,
      keywords: rule.keywords,
      recommended_action: rule.recommended_action,
      recommended_department: rule.recommended_department,
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this rule?')) return;
    try {
      await deleteTriageRule(id);
      toast.success('Rule deleted.');
      refetch();
    } catch {
      toast.error('Failed to delete rule.');
    }
  };

  const f = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="page-title">Triage Symptom Rules</h1>

      {/* Form */}
      <Card>
        <CardHeader title={editId ? 'Edit Rule' : 'Add New Rule'} />
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary">Urgency Level</label>
              <select
                value={form.urgency_level}
                onChange={f('urgency_level')}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="emergency">Emergency</option>
                <option value="urgent">Urgent</option>
                <option value="standard">Standard</option>
                <option value="self_care">Self Care</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary">Department</label>
              <input
                type="text"
                value={form.recommended_department}
                onChange={f('recommended_department')}
                placeholder="e.g. Emergency, General Practice"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">Keywords <span className="text-text-muted">(comma-separated)</span></label>
            <input
              type="text"
              value={form.keywords}
              onChange={f('keywords')}
              placeholder="e.g. chest pain,difficulty breathing,shortness of breath"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">Recommended Action</label>
            <textarea
              rows={2}
              value={form.recommended_action}
              onChange={f('recommended_action')}
              placeholder="What should the patient do?"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>
          <div className="flex gap-3">
            {editId && (
              <Button type="button" variant="secondary" onClick={() => { setForm(BLANK); setEditId(null); }}>
                Cancel
              </Button>
            )}
            <Button type="submit" isLoading={saving}>{editId ? 'Update Rule' : 'Create Rule'}</Button>
          </div>
        </form>
      </Card>

      {/* Rules list */}
      <Card>
        <CardHeader title={`Existing Rules (${rules.length})`} />
        {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && rules.length === 0 && (
          <EmptyState icon={ShieldCheck} title="No rules yet" description="Create a rule above to start classifying symptoms." />
        )}
        {!isLoading && !error && rules.length > 0 && (
          <div className="space-y-3">
            {rules.map((rule) => (
              <div key={rule.id} className="rounded-lg border border-slate-100 p-4 space-y-2 hover:bg-surface-subtle">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={URGENCY_VARIANT[rule.urgency_level] || 'default'}>
                      {rule.urgency_level?.replace('_', ' ')}
                    </Badge>
                    <span className="text-sm font-medium text-text-primary">{rule.recommended_department}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => handleEdit(rule)}>Edit</Button>
                    <Button size="sm" variant="danger" onClick={() => handleDelete(rule.id)}>Delete</Button>
                  </div>
                </div>
                <p className="text-xs text-text-muted"><span className="font-medium">Keywords:</span> {rule.keywords}</p>
                <p className="text-xs text-text-secondary">{rule.recommended_action}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default TriageRules;
