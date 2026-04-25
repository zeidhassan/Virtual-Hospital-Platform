import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { assessTriage } from '@/api/triage';
import Card, { CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

const URGENCY_STYLES = {
  emergency: { variant: 'danger',  label: 'Emergency',  bg: 'bg-red-50 border-red-200' },
  urgent:    { variant: 'warning', label: 'Urgent',     bg: 'bg-amber-50 border-amber-200' },
  standard:  { variant: 'info',    label: 'Standard',   bg: 'bg-blue-50 border-blue-200' },
  self_care: { variant: 'success', label: 'Self Care',  bg: 'bg-green-50 border-green-200' },
};

const TriageAssess = () => {
  const navigate = useNavigate();
  const [symptoms, setSymptoms] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (symptoms.trim().length < 10) {
      toast.error('Please describe your symptoms in at least 10 characters.');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await assessTriage({ symptoms: symptoms.trim() });
      setResult(data.data);
      toast.success('Assessment complete.');
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Assessment failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const urgencyInfo = result ? URGENCY_STYLES[result.urgency_level] : null;

  return (
    <div className="max-w-2xl animate-fade-in space-y-6">
      <h1 className="page-title">AVA Triage Assessment</h1>

      <Card>
        <CardHeader title="Describe Your Symptoms" />
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              What symptoms are you experiencing?
            </label>
            <textarea
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              rows={5}
              placeholder="e.g. I have had chest pain and difficulty breathing since this morning..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
            <p className="mt-1 text-xs text-text-muted">Minimum 10 characters</p>
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>Back</Button>
            <Button type="submit" isLoading={submitting}>Assess Symptoms</Button>
          </div>
        </form>
      </Card>

      {result && urgencyInfo && (
        <Card className={`border-2 ${urgencyInfo.bg}`}>
          <CardHeader title="Triage Result" />
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-text-secondary">Urgency Level:</span>
              <Badge variant={urgencyInfo.variant}>{urgencyInfo.label}</Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-text-secondary mb-1">Recommended Action</p>
              <p className="text-sm text-text-primary">{result.recommended_action}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-text-secondary mb-1">Recommended Department</p>
              <p className="text-sm text-text-primary">{result.recommended_department}</p>
            </div>
            {result.follow_up_recommended && (
              <div className="rounded-lg bg-brand-50 border border-brand-100 px-4 py-3">
                <p className="text-sm text-brand-700 font-medium">
                  A follow-up appointment has been automatically scheduled for 7 days from now.
                </p>
              </div>
            )}
            <Button variant="secondary" onClick={() => navigate('/patient/triage-history')}>
              View Triage History
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default TriageAssess;
