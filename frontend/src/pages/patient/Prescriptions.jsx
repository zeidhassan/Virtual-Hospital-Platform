import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPrescriptions, requestRefill } from '@/api/prescriptions';
import usePaginatedFetch from '@/hooks/usePaginatedFetch';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';
import { Pill, Download, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const downloadPrescription = (rx) => {
  const lines = [
    'HelixaCare — Prescription',
    '─'.repeat(40),
    `Medication : ${rx.medication || '—'}`,
    `Dosage : ${rx.dosage || '—'}`,
    `Instructions: ${rx.instructions || '—'}`,
    `Refills allowed : ${rx.pack_limit ?? '—'}`,
    `Issued : ${rx.issued_date ? format(new Date(rx.issued_date), 'dd MMM yyyy') : '—'}`,
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
  const navigate = useNavigate();
  const { data: prescriptions, isLoading, error, currentPage, totalPages, totalItems, pageSize, setPage, refetch } = usePaginatedFetch(getPrescriptions);
  const [refilling, setRefilling] = useState(null);

  const refillsRemaining = (rx) => (rx.pack_limit ?? 0) - (rx.refills_used ?? 0);
  const canRefill = (rx) => rx.medication_id && !rx.limit_reached && refillsRemaining(rx) > 0;

  const handleRefill = async (rx) => {
    setRefilling(rx.id);
    try {
      await requestRefill(rx.id);
      toast.success('Refill requested — a bill has been added to your Bills page.');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to request refill.');
    } finally {
      setRefilling(null);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Prescriptions" />

      <Card>
        {isLoading && (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        )}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && prescriptions.length === 0 && <EmptyState icon={Pill} title="No prescriptions" description="Prescriptions from your doctor will appear here." />}
        {!isLoading && !error && prescriptions.length > 0 && (
          <div className="space-y-3">
            {prescriptions.map((rx) => {
              const remaining = refillsRemaining(rx);
              return (
                <div key={rx.id} className="p-4 rounded-xl bg-surface-subtle hover:bg-surface-warm transition-colors flex gap-4 items-start">
                  <div className="w-[46px] h-[46px] rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Pill size={22} className="text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-[15px] font-bold text-text-primary">{rx.medication}</p>
                      {rx.medication_id && (
                        <Badge variant={remaining > 0 ? 'success' : 'default'}>
                          {remaining > 0 ? `${remaining} refill${remaining !== 1 ? 's' : ''} left` : 'No refills left'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-text-secondary font-medium">{rx.dosage}</p>
                    {rx.instructions && <p className="text-sm text-text-secondary mt-1 line-clamp-2">{rx.instructions}</p>}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <p className="text-xs text-text-muted">Issued: {rx.issued_date ? format(new Date(rx.issued_date), 'dd MMM yyyy') : '—'}</p>
                      {rx.doctor_name && (
                        <>
                          <span className="text-xs text-text-muted">•</span>
                          <p className="text-xs text-text-muted">{rx.doctor_name}</p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => downloadPrescription(rx)} className="hover:bg-brand-50 hover:text-brand-700">
                      <Download size={14} />
                      Download
                    </Button>
                    {canRefill(rx) && (
                      <Button variant="secondary" size="sm" isLoading={refilling === rx.id} onClick={() => handleRefill(rx)}>
                        <RefreshCw size={14} />
                        Request Refill
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
      </Card>

      <p className="text-xs text-text-muted">
        Requesting a refill creates a bill you can pay from your{' '}
        <button type="button" onClick={() => navigate('/patient/billing')} className="text-brand-600 hover:underline font-medium">
          Billing page
        </button>.
      </p>
    </div>
  );
};

export default Prescriptions;
