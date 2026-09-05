import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getTimeline, getSummary } from '@/api/consultationHistory';
import { getDoctorPatients, getQuestionBank, assignQuestionsToPatient, getPatientQuestionAssignments } from '@/api/doctor';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import PageHeader from '@/components/ui/PageHeader';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { Clock, Activity, Calendar, FileText, Pill, ClipboardList, Heart, ChevronLeft, ChevronRight, User, HelpCircle, CheckCircle2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const TYPE_META = {
  triage: { label: 'Triage', icon: Activity, variant: 'error', color: 'bg-red-100 text-red-600' },
  appointment: { label: 'Appointment', icon: Calendar, variant: 'info', color: 'bg-blue-100 text-blue-600' },
  prescription: { label: 'Prescription', icon: Pill, variant: 'success', color: 'bg-green-100 text-green-600' },
  medical_record: { label: 'Medical Record', icon: FileText, variant: 'warning', color: 'bg-amber-100 text-amber-600' },
  follow_up: { label: 'Follow-Up', icon: ClipboardList, variant: 'default', color: 'bg-slate-100 text-slate-600' },
  health_log: { label: 'Health Log', icon: Heart, variant: 'info', color: 'bg-pink-100 text-pink-600' },
};

const TYPES = Object.keys(TYPE_META);
const LIMIT = 10;

const TimelineEntry = ({ entry }) => {
  const [expanded, setExpanded] = useState(false);
  const meta = TYPE_META[entry.type] || { label: entry.type, icon: Clock, variant: 'default', color: 'bg-slate-100 text-slate-600' };
  const Icon = meta.icon;
  const date = entry.date ? format(parseISO(entry.date), 'dd MMM yyyy') : '—';

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-xl ${meta.color} flex items-center justify-center flex-shrink-0`}>
          <Icon size={18} />
        </div>
        <div className="flex-1 w-0.5 bg-slate-200 my-2" />
      </div>
      <div className="flex-1 pb-6">
        <div className="bg-surface-subtle hover:bg-surface-warm border border-slate-100 rounded-xl p-4 transition-colors">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
            <div className="flex items-center gap-2">
              <Badge variant={meta.variant}>{meta.label}</Badge>
              <span className="text-xs text-text-muted">{date}</span>
            </div>
            <button onClick={() => setExpanded((e) => !e)} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
              {expanded ? 'Hide Details' : 'Show Details'}
            </button>
          </div>
          <p className="text-sm text-text-primary">{entry.summary || '—'}</p>
          {expanded && entry.details && <pre className="mt-3 text-xs bg-surface-muted rounded-lg p-3 overflow-x-auto text-text-secondary whitespace-pre-wrap border border-slate-200">{JSON.stringify(entry.details, null, 2)}</pre>}
        </div>
      </div>
    </div>
  );
};

const PatientTimeline = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState(searchParams.get('patientId') || null);
  const [summary, setSummary] = useState(null);
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const page = Math.floor(offset / LIMIT) + 1;
  const pages = Math.max(1, Math.ceil(total / LIMIT));

  useEffect(() => {
    getDoctorPatients({ limit: 500 })
      .then((res) => setPatients(res.data?.data || []))
      .catch(() => {});
  }, []);

  const load = async (pid, off = 0) => {
    setLoading(true);
    setError('');
    try {
      const params = { limit: LIMIT, offset: off };
      if (typeFilter) params.type = typeFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const [tRes, sRes] = await Promise.all([getTimeline(pid, params), getSummary(pid)]);
      setEntries(tRes.data.data || []);
      setTotal(tRes.data.total || 0);
      setSummary(sRes.data);
      setOffset(off);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load timeline.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) load(patientId, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const handleSelectPatient = (pid) => {
    setPatientId(pid || null);
    setSearchParams(pid ? { patientId: pid } : {});
    setEntries([]);
    setSummary(null);
    setError('');
  };

  const patientOptions = patients.map((p) => ({ value: p.id, label: p.full_name || `Patient #${p.id}` }));

  // ── Assign health questions ─────────────────────────────────────────────
  const [assignModal, setAssignModal] = useState(false);
  const [bankQuestions, setBankQuestions] = useState([]);
  const [existingAssignments, setExistingAssignments] = useState([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [customQuestions, setCustomQuestions] = useState([]);
  const [customDraft, setCustomDraft] = useState('');
  const [assigning, setAssigning] = useState(false);

  const loadAssignments = () => {
    if (!patientId) return;
    getPatientQuestionAssignments(patientId)
      .then((res) => setExistingAssignments(res.data?.data || []))
      .catch(() => {});
  };

  useEffect(loadAssignments, [patientId]);

  const openAssignModal = () => {
    setSelectedQuestionIds([]);
    setCustomQuestions([]);
    setCustomDraft('');
    getQuestionBank({ limit: 100 })
      .then((res) => setBankQuestions(res.data?.data || []))
      .catch(() => {});
    setAssignModal(true);
  };

  const toggleQuestion = (id) => {
    setSelectedQuestionIds((prev) => (prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id]));
  };

  const addCustomQuestion = () => {
    const text = customDraft.trim();
    if (!text) return;
    setCustomQuestions((prev) => [...prev, text]);
    setCustomDraft('');
  };

  const removeCustomQuestion = (index) => {
    setCustomQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAssignQuestions = async () => {
    if (selectedQuestionIds.length === 0 && customQuestions.length === 0) {
      toast.error('Select at least one question or add a custom one.');
      return;
    }
    setAssigning(true);
    try {
      await assignQuestionsToPatient({ patient_id: patientId, question_ids: selectedQuestionIds, custom_questions: customQuestions });
      toast.success('Questions assigned to patient');
      setAssignModal(false);
      loadAssignments();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to assign questions');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Patient Care Timeline" />

      {/* Patient search */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <User size={20} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">Load Patient Timeline</p>
            <p className="text-xs text-text-muted">Search for a patient to view their care history</p>
          </div>
        </div>
        <SearchableSelect
          options={patientOptions}
          value={patientId}
          onChange={handleSelectPatient}
          placeholder="Search patients by name…"
          emptyText="No patients found"
        />
      </Card>

      {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3 border border-red-200">{error}</div>}

      {patientId && (
        <Card>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-text-primary">Health Questions</p>
              <p className="text-xs text-text-muted">
                {existingAssignments.length === 0
                  ? 'No questions assigned yet.'
                  : `${existingAssignments.filter((a) => a.response_id).length} of ${existingAssignments.length} answered.`}
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={openAssignModal}>
              <HelpCircle size={14} className="mr-1" /> Assign Questions
            </Button>
          </div>
          {existingAssignments.length > 0 && (
            <div className="mt-3 space-y-2">
              {existingAssignments.map((a) => (
                <div key={a.id} className="flex items-start gap-2 text-sm p-2.5 rounded-lg bg-surface-subtle">
                  {a.response_id ? <CheckCircle2 size={15} className="text-emerald-600 mt-0.5 flex-shrink-0" /> : <Clock size={15} className="text-amber-500 mt-0.5 flex-shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-text-primary">{a.question_text}</p>
                    {a.answer && <p className="text-text-secondary text-xs mt-0.5">{a.answer}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {patientId && summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(summary).map(([key, count]) => {
            const meta = TYPE_META[key] || { label: key, icon: Clock, color: 'bg-slate-100 text-slate-600' };
            const Icon = meta.icon;
            return (
              <div key={key} className="bg-surface-subtle border border-slate-200 rounded-xl p-3 text-center hover:bg-surface-warm transition-colors">
                <div className={`w-8 h-8 rounded-lg ${meta.color} flex items-center justify-center mx-auto mb-2`}>
                  <Icon size={16} />
                </div>
                <p className="text-xl font-bold text-text-primary">{count}</p>
                <p className="text-xs text-text-muted capitalize">{meta.label}</p>
              </div>
            );
          })}
        </div>
      )}

      {patientId && (
        <Card>
          <p className="text-sm font-semibold text-text-primary mb-3">Filters</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-300">
              <option value="">All types</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_META[t].label}
                </option>
              ))}
            </select>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="From" />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="To" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => load(patientId, 0)}>
              Apply Filters
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setTypeFilter('');
                setDateFrom('');
                setDateTo('');
                load(patientId, 0);
              }}
            >
              Clear
            </Button>
          </div>
        </Card>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}
      {!loading && patientId && entries.length === 0 && !error && <EmptyState icon={Clock} title="No records" description="No care records found for this patient." />}
      {!loading && entries.length > 0 && (
        <Card>
          <div className="space-y-0">
            {entries.map((entry, i) => (
              <TimelineEntry key={`${entry.type}-${entry.id}-${i}`} entry={entry} />
            ))}
          </div>
        </Card>
      )}

      {total > LIMIT && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted">
            Page {page} of {pages} ({total} total)
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" disabled={offset === 0} onClick={() => load(patientId, offset - LIMIT)}>
              <ChevronLeft size={16} />
              Previous
            </Button>
            <Button size="sm" variant="ghost" disabled={offset + LIMIT >= total} onClick={() => load(patientId, offset + LIMIT)}>
              Next
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* Assign Questions Modal */}
      <Modal
        isOpen={assignModal}
        onClose={() => setAssignModal(false)}
        title="Assign Health Questions"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssignModal(false)}>Cancel</Button>
            <Button onClick={handleAssignQuestions} isLoading={assigning}>
              Assign {(selectedQuestionIds.length + customQuestions.length) > 0 && `(${selectedQuestionIds.length + customQuestions.length})`}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Write a Custom Question</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={customDraft}
                onChange={(e) => setCustomDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomQuestion(); } }}
                placeholder="Type a question specific to this patient…"
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
              <Button type="button" size="sm" variant="secondary" onClick={addCustomQuestion}>Add</Button>
            </div>
            {customQuestions.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {customQuestions.map((q, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
                    <span className="text-sm text-text-primary">{q}</span>
                    <button type="button" onClick={() => removeCustomQuestion(i)} className="text-xs text-red-600 hover:text-red-700 font-medium">Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Or Pick From the Bank</p>
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {bankQuestions.length === 0 && <p className="text-sm text-text-muted">No approved questions available.</p>}
              {bankQuestions.map((q) => (
                <label key={q.id} className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-surface-subtle cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedQuestionIds.includes(q.id)}
                    onChange={() => toggleQuestion(q.id)}
                    className="mt-0.5 accent-emerald-600"
                  />
                  <span className="text-sm text-text-primary">{q.question_text}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PatientTimeline;
