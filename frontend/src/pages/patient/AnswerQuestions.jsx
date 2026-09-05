import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getQuestions, submitAnswers, getMyQuestionAssignments } from '@/api/patient';
import Card, { CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { HelpCircle, Stethoscope } from 'lucide-react';

const AnswerQuestions = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      getQuestions({ approval: true, limit: 100 }),
      getMyQuestionAssignments(),
    ])
      .then(([qRes, aRes]) => {
        setQuestions(qRes.data?.data || []);
        setAssignments((aRes.data?.data || []).filter((a) => !a.response_id));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const setAnswer = (questionId, value) =>
    setAnswers((prev) => ({ ...prev, [questionId]: value }));

  const assignedIds = new Set(assignments.map((a) => a.question_id));
  const generalQuestions = questions.filter((q) => !assignedIds.has(q.id));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = Object.entries(answers)
      .filter(([, value]) => value?.trim())
      .map(([question_id, answer]) => ({ question_id: Number(question_id), answer }));

    if (payload.length === 0) {
      toast.error('Answer at least one question before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      await submitAnswers({ answers: payload });
      toast.success('Answers submitted successfully!');
      navigate('/patient/my-answers');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit answers.');
    } finally {
      setSubmitting(false);
    }
  };

  const QuestionField = ({ id, text }) => (
    <div className="space-y-2">
      <p className="text-sm font-medium text-text-primary">{text}</p>
      <textarea
        rows={2}
        placeholder="Your answer..."
        value={answers[id] || ''}
        onChange={(e) => setAnswer(id, e.target.value)}
        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-none"
      />
    </div>
  );

  return (
    <div className="max-w-2xl animate-fade-in space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="page-title">Health Questions</h1>
        <Button variant="secondary" size="sm" onClick={() => navigate('/patient/my-answers')}>
          View My Answers
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {assignments.length > 0 && (
            <Card>
              <CardHeader title="Assigned by your doctor" subtitle="Your doctor asked these specifically for you." />
              <div className="space-y-5">
                {assignments.map((a) => (
                  <div key={a.id}>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="brand">
                        <Stethoscope size={11} className="mr-1" />{a.doctor_name}
                      </Badge>
                    </div>
                    <QuestionField id={a.question_id} text={a.question_text} />
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <CardHeader title="General health questions" subtitle="Your answers help your doctor understand your health better." />
            {generalQuestions.length === 0 && assignments.length === 0 ? (
              <EmptyState icon={HelpCircle} title="No questions available" description="Check back later." />
            ) : generalQuestions.length === 0 ? (
              <p className="text-sm text-text-muted">No general questions right now.</p>
            ) : (
              <div className="space-y-5">
                {generalQuestions.map((q) => (
                  <QuestionField key={q.id} id={q.id} text={q.question_text} />
                ))}
              </div>
            )}
          </Card>

          {(generalQuestions.length > 0 || assignments.length > 0) && (
            <Button type="submit" isLoading={submitting} className="w-full">
              Submit Answers
            </Button>
          )}
        </form>
      )}
    </div>
  );
};

export default AnswerQuestions;
