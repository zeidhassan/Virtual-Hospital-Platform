import { useState } from 'react';
import { createHealthLog, getMyHealthLogs } from '@/api/healthLogs';
import usePaginatedFetch from '@/hooks/usePaginatedFetch';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';
import { Activity, Plus, Heart, Thermometer, Droplet, Weight } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const LOG_TYPE_VARIANT = {
  vitals: 'info',
  symptom_update: 'warning',
  medication_adherence: 'success',
  general: 'default',
};

const LOG_TYPE_ICONS = {
  vitals: Heart,
  symptom_update: Activity,
  medication_adherence: Droplet,
  general: Activity,
};

const LOG_TYPES = ['vitals', 'symptom_update', 'medication_adherence', 'general'];

const VITALS_FIELDS = [
  { key: 'heart_rate', label: 'Heart Rate (bpm)', type: 'number' },
  { key: 'blood_pressure', label: 'Blood Pressure', type: 'text', placeholder: '120/80' },
  { key: 'temperature', label: 'Temperature (°C)', type: 'number', step: '0.1' },
  { key: 'weight_kg', label: 'Weight (kg)', type: 'number', step: '0.1' },
  { key: 'oxygen_sat', label: 'O₂ Saturation (%)', type: 'number' },
];

const inputCls = 'w-full text-sm rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300';

const HealthLogs = () => {
  const { data: logs, isLoading, error, currentPage, totalPages, totalItems, pageSize, setPage, refetch } = usePaginatedFetch(getMyHealthLogs);

  const [modalOpen, setModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState(null);
  const [logType, setLogType] = useState('vitals');
  const [vitals, setVitals] = useState({});
  const [symptoms, setSymptoms] = useState('');
  const [severity, setSeverity] = useState('mild');
  const [medication, setMedication] = useState('');
  const [taken, setTaken] = useState('true');
  const [medTime, setMedTime] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setLogType('vitals');
    setVitals({});
    setSymptoms('');
    setSeverity('mild');
    setMedication('');
    setTaken('true');
    setMedTime('');
    setNotes('');
  };

  const buildData = () => {
    if (logType === 'vitals') {
      const d = {};
      VITALS_FIELDS.forEach(({ key }) => {
        if (vitals[key]) d[key] = Number(vitals[key]) || vitals[key];
      });
      return Object.keys(d).length ? d : null;
    }
    if (logType === 'symptom_update') {
      return {
        symptoms: symptoms
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        severity,
      };
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
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Health Logs"
        action={
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={16} />
            New Log
          </Button>
        }
      />

      <Card>
        {isLoading && (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        )}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && logs.length === 0 && <EmptyState icon={Activity} title="No logs yet" description="Track your vitals, symptoms, and medications here." />}
        {!isLoading && !error && logs.length > 0 && (
          <div className="space-y-3">
            {logs.map((log) => {
              const LogIcon = LOG_TYPE_ICONS[log.log_type] || Activity;
              return (
                <div key={log.id} className="p-4 rounded-xl bg-surface-subtle hover:bg-surface-warm transition-colors cursor-pointer border-l-4 border-l-indigo-500" onClick={() => setDetailModal(log)}>
                  <div className="flex items-start gap-4">
                    <div className="w-[46px] h-[46px] rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <LogIcon size={22} className="text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={LOG_TYPE_VARIANT[log.log_type] || 'default'}>{log.log_type?.replace('_', ' ')}</Badge>
                        <span className="text-xs text-text-muted">{log.logged_at ? format(new Date(log.logged_at), 'dd MMM yyyy, HH:mm') : '—'}</span>
                      </div>
                      {log.data && (
                        <div className="text-xs text-text-secondary bg-surface-muted rounded-lg px-3 py-2 mb-2 font-mono">
                          {Object.entries(log.data).map(([key, val]) => (
                            <div key={key} className="flex gap-2">
                              <span className="font-semibold">{key}:</span>
                              <span>{typeof val === 'object' ? JSON.stringify(val) : val}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {log.notes && <p className="text-sm text-text-primary line-clamp-2">{log.notes}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        title="Log Health Entry"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} isLoading={saving}>
              Save Log
            </Button>
          </>
        }
      >
        <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Log Type</label>
            <select value={logType} onChange={(e) => setLogType(e.target.value)} className={inputCls}>
              {LOG_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          {logType === 'vitals' &&
            VITALS_FIELDS.map(({ key, label, type, step, placeholder }) => (
              <div key={key}>
                <label className="text-xs font-medium text-text-secondary mb-1 block">{label}</label>
                <input type={type} step={step} placeholder={placeholder || ''} value={vitals[key] ?? ''} onChange={(e) => setVitals((p) => ({ ...p, [key]: e.target.value }))} className={inputCls} />
              </div>
            ))}

          {logType === 'symptom_update' && (
            <>
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">Symptoms (comma-separated)</label>
                <input type="text" value={symptoms} onChange={(e) => setSymptoms(e.target.value)} placeholder="headache, fatigue, nausea" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">Severity</label>
                <select value={severity} onChange={(e) => setSeverity(e.target.value)} className={inputCls}>
                  {['mild', 'moderate', 'severe'].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {logType === 'medication_adherence' && (
            <>
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">Medication Name *</label>
                <input type="text" value={medication} onChange={(e) => setMedication(e.target.value)} placeholder="e.g. Metformin 500mg" className={inputCls} />
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
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes…" className={`${inputCls} resize-y`} />
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      {detailModal && (
        <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title={`Health Log - ${detailModal.log_type?.replace('_', ' ')}`}>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Type</p>
              <Badge variant={LOG_TYPE_VARIANT[detailModal.log_type] || 'default'}>{detailModal.log_type?.replace('_', ' ')}</Badge>
            </div>
            {detailModal.data && (
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Data</p>
                <div className="bg-surface-muted rounded-lg p-3 space-y-1 text-sm font-mono">
                  {Object.entries(detailModal.data).map(([key, val]) => (
                    <div key={key} className="flex gap-2">
                      <span className="font-semibold text-text-primary">{key}:</span>
                      <span className="text-text-secondary">{typeof val === 'object' ? JSON.stringify(val) : val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {detailModal.notes && (
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Notes</p>
                <p className="text-sm text-text-secondary whitespace-pre-wrap">{detailModal.notes}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Logged At</p>
              <p className="text-sm text-text-secondary">{detailModal.logged_at ? format(new Date(detailModal.logged_at), 'dd MMM yyyy, HH:mm') : '—'}</p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default HealthLogs;
