import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { assessTriage, getTriageHistory } from '@/api/triage';
import Card, { CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { Zap, AlertTriangle, Calendar, Heart, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useTheme } from '@/hooks/useTheme';

const URGENCY_CONFIG = {
  emergency: {
    color: '#DC2626',
    darkColor: '#F87171',
    bgColor: '#FEE2E2',
    darkBgColor: '#3A1A1A',
    borderColor: 'border-red-500',
    icon: AlertTriangle,
    label: 'EMERGENCY',
  },
  urgent: {
    color: '#D97706',
    darkColor: '#FBBF24',
    bgColor: '#FEF3C7',
    darkBgColor: '#3A2E18',
    borderColor: 'border-amber-500',
    icon: AlertTriangle,
    label: 'URGENT',
  },
  standard: {
    color: '#2563EB',
    darkColor: '#60A5FA',
    bgColor: '#DBEAFE',
    darkBgColor: '#1A263A',
    borderColor: 'border-blue-500',
    icon: Calendar,
    label: 'STANDARD',
  },
  self_care: {
    color: '#16A34A',
    darkColor: '#4ADE80',
    bgColor: '#DCFCE7',
    darkBgColor: '#1A3A22',
    borderColor: 'border-green-500',
    icon: Heart,
    label: 'SELF CARE',
  },
};

const QUICK_EXAMPLES = ['I have chest pain and difficulty breathing', 'Persistent headache with fever for 2 days', 'Minor cut on finger, slight bleeding', 'Mild rash on arm, no pain'];

const TriageAssess = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [symptoms, setSymptoms] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      const { data } = await getTriageHistory();
      setHistory(data?.data || data || []);
    } catch (err) {
      console.error('Failed to load triage history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (symptoms.trim().length < 10) {
      toast.error('Please describe your symptoms in at least 10 characters.');
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const { data } = await assessTriage({ symptoms: symptoms.trim() });
      setResult(data.data);
      toast.success('Assessment complete.');
      loadHistory(); // Reload history after new assessment
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Assessment failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExampleClick = (example) => {
    setSymptoms(example);
  };

  const handleNewAssessment = () => {
    setSymptoms('');
    setResult(null);
  };

  const urgencyConfig = result ? URGENCY_CONFIG[result.urgency_level] : null;
  const UrgencyIcon = urgencyConfig?.icon;

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="page-title">AVA Triage</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Card */}
        <Card>
          <div className="flex items-start gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2D2580] to-[#4C1D95] flex items-center justify-center flex-shrink-0">
              <Zap size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-text-primary">AI Symptom Assessment</h2>
              <p className="text-xs text-text-muted mt-0.5">Describe your symptoms and get instant triage guidance</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">What symptoms are you experiencing?</label>
              <textarea
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                rows={6}
                placeholder="Describe your symptoms in detail..."
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-none"
                disabled={submitting}
              />
              <p className="mt-1.5 text-xs text-text-muted">{symptoms.length} characters (minimum 10)</p>
            </div>

            {/* Quick Examples */}
            <div>
              <p className="text-xs font-semibold text-text-secondary mb-2">Quick examples:</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_EXAMPLES.map((example, idx) => (
                  <button key={idx} type="button" onClick={() => handleExampleClick(example)} className="text-xs px-3 py-1.5 rounded-full border border-slate-200 text-text-secondary hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50 transition-colors" disabled={submitting}>
                    {example}
                  </button>
                ))}
              </div>
            </div>

            <Button type="submit" isLoading={submitting} disabled={symptoms.trim().length < 10} className="w-full">
              {submitting ? 'Analyzing…' : 'Assess Symptoms'}
            </Button>
          </form>
        </Card>

        {/* Result Card */}
        <Card>
          {!result && !submitting && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center mb-4">
                <Zap size={28} className="text-brand-600" />
              </div>
              <p className="text-sm font-semibold text-text-primary mb-1">Ready for assessment</p>
              <p className="text-xs text-text-muted max-w-xs">Describe your symptoms on the left and AVA will provide instant triage guidance</p>
            </div>
          )}

          {submitting && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Spinner size="lg" />
              <p className="text-sm font-semibold text-text-primary mt-4 mb-1">AVA is analyzing…</p>
              <p className="text-xs text-text-muted">This can take up to a minute</p>
            </div>
          )}

          {result && urgencyConfig && (
            <div className={`border-t-2 ${urgencyConfig.borderColor} -m-6 p-6`}>
              <div className="space-y-4">
                {/* Urgency Badge */}
                <div className="flex items-center gap-3">
                  <div
                    className="px-4 py-2 rounded-lg font-extrabold text-[22px] tracking-tight flex items-center gap-2"
                    style={{
                      backgroundColor: isDark ? urgencyConfig.darkBgColor : urgencyConfig.bgColor,
                      color: isDark ? urgencyConfig.darkColor : urgencyConfig.color,
                    }}
                  >
                    {UrgencyIcon && <UrgencyIcon size={20} />}
                    {urgencyConfig.label}
                  </div>
                </div>

                {/* Recommended Action */}
                <div className="p-4 rounded-lg" style={{ backgroundColor: isDark ? urgencyConfig.darkBgColor : urgencyConfig.bgColor }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: isDark ? urgencyConfig.darkColor : urgencyConfig.color }}>
                    Recommended Action
                  </p>
                  <p className="text-sm text-text-primary font-medium">{result.recommended_action}</p>
                </div>

                {/* Recommended Department */}
                <div className="p-4 rounded-lg bg-surface-subtle">
                  <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1">Recommended Department</p>
                  <p className="text-sm text-text-primary font-medium">{result.recommended_department}</p>
                </div>

                {/* Follow-up Notice */}
                {result.follow_up_recommended && (
                  <div className="p-4 rounded-lg bg-brand-50 border border-brand-200">
                    <p className="text-xs font-bold uppercase tracking-wider text-brand-700 mb-1">Follow-up Scheduled</p>
                    <p className="text-sm text-text-primary">A follow-up appointment has been automatically scheduled for 7 days from now.</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button onClick={() => navigate('/patient/book-appointment')} className="flex-1">
                    Book Appointment
                  </Button>
                  <Button variant="secondary" onClick={handleNewAssessment} className="flex-1">
                    New Assessment
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Recent Sessions - Below the two-column layout */}
      <Card>
        <CardHeader title="Recent Triage Sessions" />
        <div className="mt-4">
          {historyLoading && (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          )}
          {!historyLoading && history.length === 0 && <EmptyState icon={Clock} title="No recent sessions" description="Your assessment history will appear here." />}
          {!historyLoading && history.length > 0 && (
            <div className="space-y-3">
              {history.slice(0, 5).map((session) => {
                const urgencyConfig = URGENCY_CONFIG[session.urgency_level];
                const UrgencyIcon = urgencyConfig?.icon;

                return (
                  <div key={session.id} className="p-4 rounded-xl bg-surface-subtle hover:bg-surface-warm transition-colors border-l-4" style={{ borderLeftColor: (isDark ? urgencyConfig?.darkColor : urgencyConfig?.color) || '#CBD5E1' }}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: (isDark ? urgencyConfig?.darkBgColor : urgencyConfig?.bgColor) || '#F1F5F9' }}>
                        {UrgencyIcon && <UrgencyIcon size={18} style={{ color: isDark ? urgencyConfig?.darkColor : urgencyConfig?.color }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={session.urgency_level === 'emergency' ? 'error' : session.urgency_level === 'urgent' ? 'warning' : session.urgency_level === 'standard' ? 'info' : 'success'}>{urgencyConfig?.label || session.urgency_level}</Badge>
                          <span className="text-xs text-text-muted">{session.created_at ? format(new Date(session.created_at), 'dd MMM yyyy, HH:mm') : '—'}</span>
                        </div>
                        <p className="text-sm text-text-secondary line-clamp-2 mb-2">{session.symptoms_text}</p>
                        <p className="text-xs text-text-muted">
                          <span className="font-semibold">Recommended:</span> {session.recommended_action}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default TriageAssess;
