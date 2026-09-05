import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button';

// currentPage/totalPages/totalItems/pageSize match the paginate() utility's
// response shape directly, so callers can spread that result straight in.
const Pagination = ({ currentPage, totalPages, totalItems, pageSize, onPageChange }) => {
  if (!totalPages || totalPages <= 1) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between gap-3 pt-4 mt-4 border-t border-slate-100">
      <p className="text-xs text-text-muted">
        Showing {start}–{end} of {totalItems}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1}>
          <ChevronLeft size={14} />
        </Button>
        <span className="text-xs text-text-secondary px-1 whitespace-nowrap">
          Page {currentPage} of {totalPages}
        </span>
        <Button variant="secondary" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= totalPages}>
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
};

export default Pagination;
