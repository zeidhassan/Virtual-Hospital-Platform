import { getPlans } from '@/api/doctor';
import useFetch from '@/hooks/useFetch';
import Card, { CardHeader } from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { Star } from 'lucide-react';

const Plans = () => {
  const { data, isLoading, error, refetch } = useFetch(getPlans);
  const plans = data?.plans || data?.data || data || [];

  return (
    <div className="animate-fade-in">
      <h1 className="page-title mb-6">Available Plans</h1>
      {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}
      {error && <ErrorState message={error} onRetry={refetch} />}
      {!isLoading && !error && plans.length === 0 && (
        <EmptyState icon={Star} title="No plans available" />
      )}
      {!isLoading && !error && plans.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <Card key={plan.id} className="flex flex-col">
              <div className="flex-1">
                <h3 className="section-title">{plan.name}</h3>
                <p className="text-text-secondary text-sm mt-1">{plan.description}</p>
                <p className="text-3xl font-bold text-brand-700 mt-4">
                  {plan.currency || 'MYR'} {plan.price}
                  <span className="text-sm font-normal text-text-muted">/{plan.duration || 'mo'}</span>
                </p>
              </div>
              {plan.features && (
                <ul className="mt-4 space-y-1 text-sm text-text-secondary">
                  {(Array.isArray(plan.features) ? plan.features : Object.keys(plan.features)).map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Plans;
