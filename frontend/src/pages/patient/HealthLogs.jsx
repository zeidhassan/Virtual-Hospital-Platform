import { useState } from 'react';
import { createHealthLog, getMyHealthLogs } from '@/api/healthLogs';
import useFetch from '@/hooks/useFetch';
import Card, { CardHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { Activity, Plus } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const LOG_TYPE_VARIANT = {
  vitals:               'info',
  symptom_update:       'warning',
  medication_adherence: 'success',
  general:              'default',
};

const LOG_TYPES = ['vitals', 'symptom_update', 'medication_adherence', 'general'];

const VITALS_FIELDS = [
  { key: 'heart_rate',     label: 'Heart Rate (bpm)',    type: 'number' },
  { key: 'blood_pressure', label: 'Blood Pressure',      type: 'text', placeholder: '120/80' },
  { key: 'temperature',    label: 'Temperature (°C)',    type: 'number', step: '0.1' },
  { key: 'weight_kg',      label: 'Weight (kg)',         type: 'number', step: '0.1' },
  { key: 'oxygen_sat',     label: 'O₂ Saturation (%)',  type: 'number' },
];

const inputCls = 'w-full text-sm rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300';

const HealthLogs = () => {
  const { data, isLoading, error, refetch } = useFetch(getMyHealthLogs);
  const logs = data?.data || [];

  const [modalOpen, setModalOpen] = useState(false);
  const [logType, setLogType]     = useState('vitals');
  const [vitals, setVitals]       = useState({});
  const [symptoms, setSymptoms]   = useState('');
  const [severity, setSeverity]   = useState('mild');
  const [medication, setMedication] = useState('');
  const [taken, setTaken]         = useState('true');
  const [medTime, setMedTime]     = useState('');
  const [notes, setNotes]         = useState('');
  const [saving, setSaving]       = useState(false);

  const resetForm = () => {
    setLogType('vitals'); setVitals({}); setSymptoms(''); setSeverity('mild');
    setMedication(''); setTaken('true'); setMedTime(''); setNotes('');
  };

  const buildData = () => {
    if (logType === 'vitals') {
      const d = {};
      VITALS_FIELDS.forEach(({ key }) => { if (vitals[key]) d[key] = Number(vitals[key]) || vitals[key]; });
      return Object.keys(d).length ? d : null;
    }
    if (logType === 'symptom_update') {
      return { symptoms: symptoms.split(',').map(s => s.trim()).filter(Boolean), severity };
    }
    if (logType === 'medication_adherence') {
      return { medication, taken: taken === 'true', time: medTime || undefined };
    }
    return null;
  };

  const handleSubmit = async () => {
    if (logType === 'medication_adherence' && !medication) {
      return toast.error('Medication name is required');
    }
    setSaving(true);
    try {
      await createHealthLog({ log_type: logType, data: buildData(), notes: notes || undefined });
      toast.success('Health log saved');
      setModalOpen(false);
      resetForm();
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Health Logs</h1>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus size={14} className="mr-1.5" /> Log Entry
        </Button>
      </div>

      <Card>
        <CardHeader title="My Health Log History" />
        {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && logs.length === 0 && (
          <EmptyState icon={Activity} title="No logs yet"
            description="Track your vitals, symptoms, and medications here." />
        )}
        {!isLoading && !error && logs.length > 0 && (
          <div className="space-y-3 p-2">
            {logs.map((log) => (
              <div key={log.id}
                className="flex items-start gap-3 rounded-xl border border-slate-100 p-3 hover:bg-surface-subtle transition-colors">
                <Badge variant={LOG_TYPE_VARIANT[log.log_type] || 'default'} className="mt-0.5 shrink-0">
                  {log.log_type?.replace('_', ' ')}
                </Badge>
                <div className="flex-1 min-w-0">
                  {log.data && (
                    <p className="text-xs text-text-secondary font-mono bg-surface-muted rounded px-2 py-1 mb-1 truncate">
                      {JSON.stringify(log.data)}
                    </p>
                  )}
                  {log.notes && <p className="text-sm text-text-primary">{log.notes}</p>}
                </div>
                <span className="text-xs text-text-muted shrink-0">
                  {log.logged_at ? format(new Date(log.logged_at), 'dd MMM yyyy, HH:mm') : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); resetForm(); }}
        title="Log Health Entry"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setModalOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSubmit} isLoading={saving}>Save Log</Button>
          </>
        }>
        <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Log Type</label>
            <select value={logType} onChange={(e) => setLogType(e.target.value)} className={inputCls}>
              {LOG_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          {logType === 'vitals' && VITALS_FIELDS.map(({ key, label, type, step, placeholder }) => (
            <div key={key}>
              <label className="text-xs font-medium text-text-secondary mb-1 block">{label}</label>
              <input type={type} step={step} placeholder={placeholder || ''}
                value={vitals[key] ?? ''}
                onChange={(e) => setVitals((p) => ({ ...p, [key]: e.target.value }))}
                className={inputCls} />
            </div>
          ))}

          {logType === 'symptom_update' && (
            <>
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">Symptoms (comma-separated)</label>
                <input type="text" value={symptoms} onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="headache, fatigue, nausea" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">Severity</label>
                <select value={severity} onChange={(e) => setSeverity(e.target.value)} className={inputCls}>
                  {['mild', 'moderate', 'severe'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </>
          )}

          {logType === 'medication_adherence' && (
            <>
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">Medication Name *</label>
                <input type="text" value={medication} onChange={(e) => setMedication(e.target.value)}
                  placeholder="e.g. Metformin 500mg" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">Taken?</label>
                <select value={taken} onChange={(e) => setTaken(e.target.value)} className={inputCls}>
                  <option value="true">Yes</option>
                  <option value="false">No (missed dose)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">Time Taken</label>
                <input type="time" value={medTime} onChange={(e) => setMedTime(e.target.value)} className={inputCls} />
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Notes</label>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes…" className={`${inputCls} resize-y`} />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default HealthLogs;
