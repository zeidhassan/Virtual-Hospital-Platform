import { useState, useEffect } from 'react';
import { getAdminFollowUps, cancelFollowUp, processReminders, processMissed } from '@/api/followUps';
import Card, { CardHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { CalendarCheck, Bell, AlertCircle, X } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_VARIANT = {
  pending:   'warning',
  completed: 'success',
  cancelled: 'default',
  missed:    'danger',
};

const AdminFollowUps = () => {
  const [filters, setFilters] = useState({ status: '', patient_id: '', doctor_id: '' });
  const [appliedFilters, setAppliedFilters] = useState({});
  const [page, setPage] = useState(1);
  const [followUps, setFollowUps]   = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [processing, setProcessing] = useState(null);

  const load = async (pg, activeFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAdminFollowUps({ ...activeFilters, page: pg, limit: 15 });
      setFollowUps(res.data.data || []);
      setTotalItems(res.data.totalItems || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load follow-ups.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(1, {}); }, []);

  const applyFilters = () => {
    const f = {};
    if (filters.status)     f.status     = filters.status;
    if (filters.patient_id) f.patient_id = filters.patient_id;
    if (filters.doctor_id)  f.doctor_id  = filters.doctor_id;
    setAppliedFilters(f);
    setPage(1);
    load(1, f);
  };

  const clearFilters = () => {
    setFilters({ status: '', patient_id: '', doctor_id: '' });
    setAppliedFilters({});
    setPage(1);
    load(1, {});
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this follow-up?')) return;
    setCancelling(id);
    try {
      await cancelFollowUp(id);
      toast.success('Cancelled');
      load(page, appliedFilters);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setCancelling(null);
    }
  };

  const handleProcessReminders = async () => {
    setProcessing('reminders');
    try {
      const { data: res } = await processReminders();
      toast.success(`${res.count} reminder${res.count !== 1 ? 's' : ''} sent`);
      load(page, appliedFilters);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setProcessing(null);
    }
  };

  const handleProcessMissed = async () => {
    setProcessing('missed');
    try {
      const { data: res } = await processMissed();
      toast.success(`${res.count} follow-up${res.count !== 1 ? 's' : ''} marked as missed`);
      load(page, appliedFilters);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setProcessing(null);
    }
  };

  const goToPage = (pg) => {
    setPage(pg);
    load(pg, appliedFilters);
  };

  const inputCls = 'text-sm rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300';

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Follow-Up Management</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary"
            isLoading={processing === 'reminders'} onClick={handleProcessReminders}>
            <Bell size={13} className="mr-1.5" /> Send Reminders
          </Button>
          <Button size="sm" variant="secondary"
            isLoading={processing === 'missed'} onClick={handleProcessMissed}>
            <AlertCircle size={13} className="mr-1.5" /> Mark Missed
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="!p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Status</label>
            <select value={filters.status}
              onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
              className={inputCls}>
              <option value="">All</option>
              {['pending', 'completed', 'cancelled', 'missed'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Patient ID</label>
            <input type="number" value={filters.patient_id} placeholder="Any"
              onChange={(e) => setFilters((p) => ({ ...p, patient_id: e.target.value }))}
              className={`${inputCls} w-28`} />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Doctor ID</label>
            <input type="number" value={filters.doctor_id} placeholder="Any"
              onChange={(e) => setFilters((p) => ({ ...p, doctor_id: e.target.value }))}
              className={`${inputCls} w-28`} />
          </div>
          <Button size="sm" onClick={applyFilters}>Apply</Button>
          {Object.keys(appliedFilters).length > 0 && (
            <button onClick={clearFilters}
              className="text-xs text-text-muted hover:text-red-500 flex items-center gap-1">
              <X size={12} /> Clear
            </button>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title={`All Follow-Ups${totalItems ? ` (${totalItems})` : ''}`} />
        {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}
        {error && <ErrorState message={error} onRetry={() => load(page, appliedFilters)} />}
        {!isLoading && !error && followUps.length === 0 && (
          <EmptyState icon={CalendarCheck} title="No follow-ups found"
            description="Adjust filters or create follow-ups via the doctor portal." />
        )}
        {!isLoading && !error && followUps.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-3 font-medium text-text-secondary">#</th>
                    <th className="text-left py-3 px-3 font-medium text-text-secondary">Patient</th>
                    <th className="text-left py-3 px-3 font-medium text-text-secondary">Doctor</th>
                    <th className="text-left py-3 px-3 font-medium text-text-secondary">Scheduled</th>
                    <th className="text-left py-3 px-3 font-medium text-text-secondary">Notes</th>
                    <th className="text-left py-3 px-3 font-medium text-text-secondary">Status</th>
                    <th className="text-left py-3 px-3 font-medium text-text-secondary">Reminder</th>
                    <th className="py-3 px-3" />
                  </tr>
                </thead>
                <tbody>
                  {followUps.map((fu) => (
                    <tr key={fu.id} className="border-b border-slate-50 hover:bg-surface-subtle">
                      <td className="py-3 px-3 text-text-secondary">#{fu.id}</td>
                      <td className="py-3 px-3 text-text-primary">#{fu.patient_id}</td>
                      <td className="py-3 px-3 text-text-secondary">{fu.doctor_id ? `#${fu.doctor_id}` : '—'}</td>
                      <td className="py-3 px-3 text-text-primary font-medium">
                        {fu.scheduled_date ? format(new Date(fu.scheduled_date), 'dd MMM yyyy') : '—'}
                      </td>
                      <td className="py-3 px-3 text-text-secondary max-w-[160px] truncate" title={fu.notes}>
                        {fu.notes || '—'}
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant={STATUS_VARIANT[fu.status] || 'default'}>{fu.status}</Badge>
                      </td>
                      <td className="py-3 px-3">
                        {fu.reminder_sent
                          ? <Badge variant="success">Sent</Badge>
                          : <span className="text-text-muted text-xs">Pending</span>}
                      </td>
                      <td className="py-3 px-3">
                        {fu.status === 'pending' && (
                          <Button size="xs" variant="danger"
                            isLoading={cancelling === fu.id}
                            onClick={() => handleCancel(fu.id)}>
                            <X size={11} className="mr-1" /> Cancel
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-3 pt-3 pb-1">
                <span className="text-xs text-text-muted">{totalItems} records · page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <Button size="xs" variant="secondary" onClick={() => goToPage(page - 1)} disabled={page <= 1}>Prev</Button>
                  <Button size="xs" variant="secondary" onClick={() => goToPage(page + 1)} disabled={page >= totalPages}>Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default AdminFollowUps;
