import { getPrescriptions } from '@/api/prescriptions';
import useFetch from '@/hooks/useFetch';
import Card, { CardHeader } from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { Pill, Download } from 'lucide-react';
import { format } from 'date-fns';

const downloadPrescription = (rx) => {
  const lines = [
    'HelixaCare — Prescription',
    '─'.repeat(40),
    `Medication : ${rx.medication || '—'}`,
    `Dosage     : ${rx.dosage || '—'}`,
    `Instructions: ${rx.instructions || '—'}`,
    `Pack limit : ${rx.pack_limit ?? '—'}`,
    `Issued     : ${rx.issued_date ? format(new Date(rx.issued_date), 'dd MMM yyyy') : '—'}`,
  ].join('\n');
  const blob = new Blob([lines], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `prescription-${rx.id}.txt`;
  a.click();
  URL.revokeObjectURL(url);
};

const Prescriptions = () => {
  const { data, isLoading, error, refetch } = useFetch(getPrescriptions);
  const prescriptions = data?.data || data?.prescriptions || data || [];

  return (
    <div className="animate-fade-in">
      <h1 className="page-title mb-6">Prescriptions</h1>
      <Card>
        <CardHeader title="Your Prescriptions" />
        {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && prescriptions.length === 0 && (
          <EmptyState icon={Pill} title="No prescriptions" description="Prescriptions from your doctor will appear here." />
        )}
        {!isLoading && !error && prescriptions.length > 0 && (
          <div className="space-y-3">
            {prescriptions.map((rx) => (
              <div key={rx.id} className="p-4 rounded-xl bg-surface-subtle flex gap-4 items-start">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Pill size={18} className="text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-primary">{rx.medication}</p>
                  <p className="text-sm text-text-secondary">{rx.dosage}</p>
                  {rx.instructions && <p className="text-xs text-text-muted mt-1">{rx.instructions}</p>}
                  <p className="text-xs text-text-muted mt-1">
                    Issued: {rx.issued_date ? format(new Date(rx.issued_date), 'dd MMM yyyy') : '—'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => downloadPrescription(rx)}
                  title="Download prescription"
                  className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium flex-shrink-0 mt-0.5"
                >
                  <Download size={14} />
                  Download
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default Prescriptions;
