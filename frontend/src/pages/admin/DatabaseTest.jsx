import Card, { CardHeader } from '@/components/ui/Card';
import { Settings } from 'lucide-react';

// The database admin board exists in /public/database-test.html
// This page links there for backwards compatibility
const DatabaseTest = () => (
  <div className="animate-fade-in">
    <h1 className="page-title mb-6">Database Admin</h1>
    <Card>
      <CardHeader title="Raw Database Access" subtitle="Full CRUD access to all platform entities" />
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
          <Settings size={32} className="text-slate-500" />
        </div>
        <p className="text-text-secondary text-sm text-center max-w-sm">
          The full database admin board (25+ entity panels) is available at the legacy HTML interface.
        </p>
        <a
          href="/database-test.html"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          Open Database Board
        </a>
      </div>
    </Card>
  </div>
);

export default DatabaseTest;
