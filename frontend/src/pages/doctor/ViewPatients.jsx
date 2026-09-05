import { useState } from 'react';
import { getDoctorPatients } from '@/api/doctor';
import usePaginatedFetch from '@/hooks/usePaginatedFetch';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';
import Avatar from '@/components/ui/Avatar';
import { Users, Search, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ViewPatients = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: filteredPatients, isLoading, error, currentPage, totalPages, totalItems, pageSize, setPage, refetch } = usePaginatedFetch(getDoctorPatients, { name: searchQuery || undefined });

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="My Patients" />

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input type="text" placeholder="Search patients by name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500" />
      </div>

      <Card>
        {isLoading && (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        )}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && filteredPatients.length === 0 && <EmptyState icon={Users} title={searchQuery ? 'No matching patients' : 'No patients yet'} description={searchQuery ? 'Try adjusting your search.' : "Patients you've seen will appear here."} />}
        {!isLoading && !error && filteredPatients.length > 0 && (
          <div className="space-y-3">
            {filteredPatients.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-xl bg-surface-subtle hover:bg-surface-warm transition-colors flex items-center gap-4 cursor-pointer"
                onClick={() => navigate(`/doctor/patient-timeline?patientId=${p.id}`)}
              >
                <Avatar name={p.full_name || `Patient ${p.id}`} size={56} />
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-text-primary">{p.full_name || `Patient #${p.id}`}</p>
                  <div className="flex items-center gap-4 mt-1 text-sm text-text-secondary">
                    {p.blood_group && <span>Blood: {p.blood_group}</span>}
                    {p.allergies && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-[200px]" title={p.allergies}>
                          Allergies: {p.allergies}
                        </span>
                      </>
                    )}
                  </div>
                  {p.chronic_conditions && <p className="text-xs text-text-muted mt-1 line-clamp-1">Conditions: {p.chronic_conditions}</p>}
                </div>
                <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); navigate('/doctor/appointments'); }}>
                  <Calendar size={14} />
                  Book
                </Button>
              </div>
            ))}
          </div>
        )}
        <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
      </Card>
    </div>
  );
};

export default ViewPatients;
