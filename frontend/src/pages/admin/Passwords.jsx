import { getAdminPasswords } from '@/api/admin';
import useFetch from '@/hooks/useFetch';
import Card, { CardHeader } from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { Lock } from 'lucide-react';

const AdminPasswords = () => {
  const { data, isLoading, error, refetch } = useFetch(getAdminPasswords);
  const passwords = Array.isArray(data) ? data : (data?.data || []);

  return (
    <div className="animate-fade-in">
      <h1 className="page-title mb-6">Password Management</h1>
      <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
        This page displays demo/plaintext passwords stored in the <code>user_passwords</code> table for testing purposes only.
      </div>
      <Card>
        <CardHeader title="User Passwords" />
        {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!isLoading && !error && passwords.length === 0 && (
          <EmptyState icon={Lock} title="No passwords stored" description="The user_passwords table is empty." />
        )}
        {!isLoading && !error && passwords.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Email</th>
                  <th className="text-left py-3 px-2 font-medium text-text-secondary">Password</th>
                </tr>
              </thead>
              <tbody>
                {passwords.map((row, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-surface-subtle">
                    <td className="py-3 px-2 text-text-primary">{row.email}</td>
                    <td className="py-3 px-2 font-mono text-text-secondary">{row.password}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminPasswords;
