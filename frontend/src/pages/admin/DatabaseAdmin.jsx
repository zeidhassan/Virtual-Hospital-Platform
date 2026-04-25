import { useState, useEffect, useCallback } from 'react';
import { abGetAll, abGetById, abCreate, abUpdate, abDelete } from '@/api/adminBoard';
import { ENTITIES } from './dbEntities';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { Database, Plus, Edit2, Trash2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Filter, X } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

// ── Shared input class ────────────────────────────────────────────────────────
const inputCls = 'w-full text-sm rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300';

// ── Form field (modal) ────────────────────────────────────────────────────────
const FormField = ({ field, value, onChange }) => {
  if (field.type === 'select') {
    return (
      <div>
        <label className="text-xs font-medium text-text-secondary mb-1 block">{field.label}</label>
        <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={inputCls}>
          <option value="">— select —</option>
          {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }
  if (field.type === 'textarea') {
    return (
      <div>
        <label className="text-xs font-medium text-text-secondary mb-1 block">{field.label}</label>
        <textarea rows={3} value={value ?? ''} onChange={(e) => onChange(e.target.value)}
          className={`${inputCls} resize-y`} />
      </div>
    );
  }
  return (
    <div>
      <label className="text-xs font-medium text-text-secondary mb-1 block">{field.label}</label>
      <input type={field.type} value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        step={field.type === 'number' ? 'any' : undefined}
        className={inputCls} />
    </div>
  );
};

// ── Filter field (filter panel) ───────────────────────────────────────────────
// Textarea → plain text input; all other types respected
const FilterField = ({ field, value, onChange }) => {
  const type = field.type === 'textarea' ? 'text' : field.type;
  if (type === 'select') {
    return (
      <div>
        <label className="text-xs font-medium text-text-secondary mb-1 block">{field.label}</label>
        <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={inputCls}>
          <option value="">Any</option>
          {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }
  return (
    <div>
      <label className="text-xs font-medium text-text-secondary mb-1 block">{field.label}</label>
      <input type={type} value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={type === 'date' || type === 'time' ? undefined : `Filter by ${field.label.toLowerCase()}…`}
        step={type === 'number' ? 'any' : undefined}
        className={inputCls} />
    </div>
  );
};

// ── Truncate helper ───────────────────────────────────────────────────────────
const trunc = (val, n = 28) => {
  if (val === null || val === undefined) return '—';
  const s = String(val);
  return s.length > n ? s.slice(0, n) + '…' : s;
};

// ── Main component ────────────────────────────────────────────────────────────
const DatabaseAdmin = () => {
  const [entity, setEntity]             = useState(ENTITIES[0]);
  const [rows, setRows]                 = useState([]);
  const [pagination, setPagination]     = useState({ page: 1, totalPages: 1, totalItems: 0 });
  const [loading, setLoading]           = useState(false);
  const [apiResponse, setApiResponse]   = useState(null);
  const [responseOpen, setResponseOpen] = useState(false);

  // CRUD modal
  const [modal, setModal]       = useState(null);
  const [formVals, setFormVals] = useState({});
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(null);

  // Controls
  const [sortVal, setSortVal]   = useState('+id');
  const [limitVal, setLimitVal] = useState('10');
  const [idInput, setIdInput]   = useState('');

  // Filters
  const [filters, setFilters]         = useState({});       // { fieldName: value }
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pendingFilters, setPendingFilters] = useState({}); // edited but not yet applied

  const activeCount = Object.values(filters).filter(Boolean).length;

  // ── Helpers ────────────────────────────────────────────────────────────────
  const showResp = (data) => { setApiResponse(data); setResponseOpen(true); };

  const applyPage = (data, page) => {
    setRows(data.data || []);
    setPagination({
      page: data.currentPage || page,
      totalPages: data.totalPages || 1,
      totalItems: data.totalItems || 0,
    });
    showResp(data);
  };

  // ── Load page ──────────────────────────────────────────────────────────────
  const loadPage = useCallback(async (page = 1, overrideFilters) => {
    setLoading(true);
    try {
      const activeFilters = overrideFilters !== undefined ? overrideFilters : filters;
      const params = { page, limit: parseInt(limitVal) || 10, sort: sortVal || '+id' };
      Object.entries(activeFilters).forEach(([k, v]) => { if (v !== '' && v !== undefined) params[k] = v; });
      const { data } = await abGetAll(entity.key, params);
      applyPage(data, page);
    } catch (err) {
      showResp(err.response?.data || { error: err.message });
      toast.error('Failed to load');
    } finally {
      setLoading(false);
    }
  }, [entity.key, filters, limitVal, sortVal]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load on entity switch ──────────────────────────────────────────────────
  useEffect(() => {
    setSortVal('+id');
    setIdInput('');
    setRows([]);
    setApiResponse(null);
    const empty = {};
    setFilters(empty);
    setPendingFilters(empty);
    setLoading(true);
    abGetAll(entity.key, { page: 1, limit: 10, sort: '+id' })
      .then(({ data }) => applyPage(data, 1))
      .catch((err) => showResp(err.response?.data || { error: err.message }))
      .finally(() => setLoading(false));
  }, [entity.key]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Apply filters ──────────────────────────────────────────────────────────
  const applyFilters = () => {
    setFilters(pendingFilters);
    loadPage(1, pendingFilters);
  };

  const clearFilters = () => {
    const empty = {};
    setFilters(empty);
    setPendingFilters(empty);
    loadPage(1, empty);
  };

  const setPendingField = (name, val) =>
    setPendingFilters((prev) => ({ ...prev, [name]: val }));

  // ── Get by ID ─────────────────────────────────────────────────────────────
  const getById = async () => {
    if (!idInput) return toast.error('Enter an ID');
    setLoading(true);
    try {
      const { data } = await abGetById(entity.key, idInput);
      showResp(data);
      setRows(Array.isArray(data) ? data : [data]);
      setPagination({ page: 1, totalPages: 1, totalItems: 1 });
    } catch (err) {
      showResp(err.response?.data || { error: err.message });
      toast.error('Not found');
    } finally {
      setLoading(false);
    }
  };

  // ── Save (create or update) ───────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const isEdit = modal.mode === 'edit';
      const resp = isEdit
        ? await abUpdate(entity.key, modal.row.id, formVals)
        : await abCreate(entity.key, formVals);
      showResp(resp.data);
      toast.success(isEdit ? 'Updated' : 'Created');
      setModal(null);
      loadPage(pagination.page);
    } catch (err) {
      showResp(err.response?.data || { error: err.message });
      toast.error(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm(`Delete ${entity.label} #${id}? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      const { data } = await abDelete(entity.key, id);
      showResp(data);
      toast.success('Deleted');
      setRows((prev) => prev.filter((r) => r.id !== id));
      setPagination((p) => ({ ...p, totalItems: p.totalItems - 1 }));
    } catch (err) {
      showResp(err.response?.data || { error: err.message });
      toast.error(err.response?.data?.error || 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  // ── Table columns ─────────────────────────────────────────────────────────
  const displayCols = rows.length > 0 ? Object.keys(rows[0]).slice(0, 6) : [];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in flex gap-5 min-h-0">

      {/* ── Entity sidebar ────────────────────────────────────────────────── */}
      <aside className="w-48 flex-shrink-0">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 px-1">
          Entities
        </p>
        <nav className="space-y-0.5 max-h-[calc(100vh-140px)] overflow-y-auto pr-1">
          {ENTITIES.map((e) => (
            <button key={e.key} onClick={() => setEntity(e)}
              className={clsx(
                'w-full text-left text-sm px-3 py-2 rounded-lg transition-colors',
                entity.key === e.key
                  ? 'bg-brand-600 text-white font-medium'
                  : 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary'
              )}>
              {e.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Main panel ───────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="page-title">{entity.label}</h1>
          <Button size="sm" onClick={() => { setFormVals({}); setModal({ mode: 'create' }); }}>
            <Plus size={14} className="mr-1.5" /> Create
          </Button>
        </div>

        {/* Controls */}
        <Card className="!p-4">
          <div className="flex flex-wrap gap-3 items-end">
            {/* Get by ID */}
            <div className="w-28">
              <label className="text-xs font-medium text-text-secondary mb-1 block">Get by ID</label>
              <input type="number" value={idInput} onChange={(e) => setIdInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && getById()}
                placeholder="ID…"
                className={inputCls} />
            </div>
            <Button size="sm" variant="secondary" onClick={getById}>Fetch</Button>

            <div className="h-6 w-px bg-slate-200 self-center" />

            {/* Sort / Limit */}
            <div className="w-32">
              <label className="text-xs font-medium text-text-secondary mb-1 block">Sort</label>
              <input value={sortVal} onChange={(e) => setSortVal(e.target.value)}
                placeholder="+id"
                className={inputCls} />
            </div>
            <div className="w-20">
              <label className="text-xs font-medium text-text-secondary mb-1 block">Limit</label>
              <input type="number" value={limitVal} onChange={(e) => setLimitVal(e.target.value)}
                className={inputCls} />
            </div>
            <Button size="sm" onClick={() => loadPage(1)}>Load</Button>

            <div className="h-6 w-px bg-slate-200 self-center" />

            {/* Filter toggle */}
            <button
              onClick={() => {
                if (!filtersOpen) setPendingFilters({ ...filters });
                setFiltersOpen((o) => !o);
              }}
              className={clsx(
                'flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border transition-colors',
                filtersOpen || activeCount > 0
                  ? 'border-brand-600 bg-brand-50 text-brand-600'
                  : 'border-slate-200 bg-white text-text-secondary hover:border-slate-300'
              )}>
              <Filter size={13} />
              Filters
              {activeCount > 0 && (
                <span className="ml-0.5 bg-brand-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {activeCount}
                </span>
              )}
            </button>

            {activeCount > 0 && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 transition-colors">
                <X size={12} /> Clear filters
              </button>
            )}
          </div>
        </Card>

        {/* Filter panel */}
        {filtersOpen && (
          <Card className="!p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-text-primary">Filter by field</p>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={clearFilters}>
                  <X size={12} className="mr-1" /> Clear
                </Button>
                <Button size="sm" onClick={applyFilters}>
                  <Filter size={12} className="mr-1" /> Apply Filters
                </Button>
              </div>
            </div>

            {/* id filter always shown */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">ID</label>
                <input type="number" value={pendingFilters['id'] ?? ''}
                  onChange={(e) => setPendingField('id', e.target.value)}
                  placeholder="Filter by ID…"
                  className={inputCls} />
              </div>
              {entity.fields.map((field) => (
                <FilterField
                  key={field.name}
                  field={field}
                  value={pendingFilters[field.name] ?? ''}
                  onChange={(v) => setPendingField(field.name, v)}
                />
              ))}
            </div>

            {/* Active filter chips */}
            {activeCount > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                <span className="text-xs text-text-muted self-center">Active:</span>
                {Object.entries(filters).map(([k, v]) =>
                  v ? (
                    <span key={k}
                      className="inline-flex items-center gap-1 text-xs bg-brand-50 text-brand-700 border border-brand-200 px-2 py-0.5 rounded-full">
                      <span className="font-medium">{k}</span>
                      <span className="text-brand-500">= {trunc(v, 20)}</span>
                      <button
                        onClick={() => {
                          const next = { ...filters, [k]: '' };
                          setFilters(next);
                          setPendingFilters((p) => ({ ...p, [k]: '' }));
                          loadPage(1, next);
                        }}
                        className="ml-0.5 hover:text-red-500 transition-colors">
                        <X size={10} />
                      </button>
                    </span>
                  ) : null
                )}
              </div>
            )}
          </Card>
        )}

        {/* Table */}
        <Card>
          {loading && (
            <div className="flex justify-center py-14"><Spinner size="lg" /></div>
          )}
          {!loading && rows.length === 0 && (
            <EmptyState icon={Database} title="No records"
              description="Load an entity or adjust your filters." />
          )}
          {!loading && rows.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {displayCols.map((col) => (
                        <th key={col}
                          className="text-left py-3 px-3 font-medium text-text-secondary whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                      <th className="py-3 px-3 text-right font-medium text-text-secondary">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={row.id ?? i}
                        className="border-b border-slate-50 hover:bg-surface-subtle">
                        {displayCols.map((col) => (
                          <td key={col}
                            className="py-2.5 px-3 text-text-primary max-w-[180px] truncate"
                            title={String(row[col] ?? '')}>
                            {trunc(row[col])}
                          </td>
                        ))}
                        <td className="py-2.5 px-3">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => { setFormVals({ ...row }); setModal({ mode: 'edit', row }); }}
                              className="p-1.5 rounded-lg text-text-muted hover:bg-blue-50 hover:text-blue-600 transition-colors"
                              title="Edit">
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(row.id)}
                              disabled={deleting === row.id}
                              className="p-1.5 rounded-lg text-text-muted hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40"
                              title="Delete">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-3 pt-3 pb-1">
                <span className="text-xs text-text-muted">
                  {pagination.totalItems} record{pagination.totalItems !== 1 ? 's' : ''}
                  {' · '}page {pagination.page} of {pagination.totalPages}
                  {activeCount > 0 && (
                    <span className="ml-2 text-brand-600 font-medium">({activeCount} filter{activeCount !== 1 ? 's' : ''} active)</span>
                  )}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => loadPage(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="p-1.5 rounded-lg hover:bg-surface-subtle disabled:opacity-30 transition-colors">
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs text-text-secondary px-1">{pagination.page}</span>
                  <button onClick={() => loadPage(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="p-1.5 rounded-lg hover:bg-surface-subtle disabled:opacity-30 transition-colors">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </Card>

        {/* API Response accordion */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <button
            onClick={() => setResponseOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors">
            <span className="text-sm font-medium text-text-secondary">API Response</span>
            {responseOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {responseOpen && (
            <div className="bg-[#111827] p-4 max-h-72 overflow-y-auto">
              <pre className="text-[#4ade80] text-xs font-mono whitespace-pre-wrap break-all leading-relaxed">
                {apiResponse
                  ? JSON.stringify(apiResponse, null, 2)
                  : 'No response yet — load an entity or perform an action.'}
              </pre>
            </div>
          )}
        </div>

      </div>

      {/* ── Create / Edit modal ───────────────────────────────────────────── */}
      <Modal
        isOpen={!!modal}
        onClose={() => setModal(null)}
        title={
          modal?.mode === 'edit'
            ? `Edit ${entity.label} #${modal.row?.id}`
            : `Create ${entity.label}`
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={handleSave} isLoading={saving}>
              {modal?.mode === 'edit' ? 'Save Changes' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
          {entity.fields.map((field) => (
            <FormField
              key={field.name}
              field={field}
              value={formVals[field.name]}
              onChange={(v) => setFormVals((prev) => ({ ...prev, [field.name]: v }))}
            />
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default DatabaseAdmin;
