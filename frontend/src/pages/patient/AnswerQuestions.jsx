import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getQuestions, submitAnswers } from '@/api/patient';
import Card, { CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { HelpCircle } from 'lucide-react';

const AnswerQuestions = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getQuestions({ is_approved: true })
      .then(({ data }) => setQuestions(data?.questions || data?.data || data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const setAnswer = (questionId, value) =>
    setAnswers((prev) => ({ ...prev, [questionId]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = Object.entries(answers).map(([question_id, answer]) => ({
        question_id: Number(question_id),
        answer,
      }));
      await submitAnswers({ responses: payload });
      toast.success('Answers submitted successfully!');
      navigate('/patient/my-answers');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit answers.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl animate-fade-in">
      <h1 className="page-title mb-6">Health Questions</h1>
      <Card>
        <CardHeader title="Please answer the following questions" subtitle="Your answers help your doctor understand your health better." />
        {loading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : questions.length === 0 ? (
          <EmptyState icon={HelpCircle} title="No questions available" description="Check back later." />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {questions.map((q, i) => (
              <div key={q.id} className="space-y-2">
                <p className="text-sm font-medium text-text-primary">
                  {i + 1}. {q.question_text}
                </p>
                <textarea
                  rows={2}
                  placeholder="Your answer..."
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-none"
                />
              </div>
            ))}
            <Button type="submit" isLoading={submitting} className="w-full">
              Submit Answers
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
};

export default AnswerQuestions;
