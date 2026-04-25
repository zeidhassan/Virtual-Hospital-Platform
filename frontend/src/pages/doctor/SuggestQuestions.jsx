import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { suggestQuestion } from '@/api/doctor';
import Card, { CardHeader } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';

const schema = z.object({
  question_text: z.string().min(10, 'Question must be at least 10 characters'),
  question_type: z.string().min(1, 'Select a type'),
  specialty: z.string().optional(),
});

const SuggestQuestions = () => {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      await suggestQuestion(data);
      toast.success('Question submitted for review!');
      reset();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit question');
    }
  };

  return (
    <div className="max-w-2xl animate-fade-in">
      <h1 className="page-title mb-6">Suggest a Question</h1>
      <Card>
        <CardHeader title="New Health Question" subtitle="Suggest a question to be added to the patient question bank." />
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input
            label="Question"
            placeholder="e.g. Do you have a family history of diabetes?"
            error={errors.question_text?.message}
            {...register('question_text')}
          />
          <Select label="Question Type" error={errors.question_type?.message} {...register('question_type')}>
            <option value="">Select type...</option>
            <option value="text">Text</option>
            <option value="yes_no">Yes / No</option>
            <option value="multiple_choice">Multiple Choice</option>
          </Select>
          <Input
            label="Specialty (optional)"
            placeholder="e.g. Cardiology"
            error={errors.specialty?.message}
            {...register('specialty')}
          />
          <Button type="submit" isLoading={isSubmitting}>Submit for Review</Button>
        </form>
      </Card>
    </div>
  );
};

export default SuggestQuestions;
