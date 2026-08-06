'use client';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import z from 'zod';
import { useOnboardingContext } from '@/contexts/OnboardingContext';
import { useQuestionNavigaton } from '@/hooks/questions';
import { Button } from '../Button';
import Dropdown, { Option } from '../Dropdown';
import ErrorMessage from '../ErrorMessage';
import QuestionBack from '../questions/QuestionBack';
import { Textbox } from '../Textbox';

const sourceOptions: Option[] = [
  { label: 'WOM', value: 'WOM' },
  { label: 'Web Search', value: 'Web Search' },
  { label: 'AI Website', value: 'AI Website' },
  { label: 'Flier', value: 'Flier' },
  { label: 'Craigslist', value: 'Craigslist' },
  { label: 'United Way', value: 'United Way' },
  { label: 'Volunteer Match', value: 'Volunteer Match' },
  { label: 'Other', value: 'Other' },
];

const sourceFormSchema = z
  .object({
    howDidYouHear: z.string().min(1, 'Please select an option'),
    howDidYouHearOther: z.string().optional(),
  })
  .refine(
    data => {
      if (data.howDidYouHear === 'Other' && !data.howDidYouHearOther?.trim()) {
        return false;
      }
      return true;
    },
    {
      message: 'Please specify how you heard about us',
      path: ['howDidYouHearOther'],
    },
  );

type SourceFormValues = z.infer<typeof sourceFormSchema>;

export default function OnboardingQuestionSource() {
  const { onboardingInfo, setOnboardingInfo } = useOnboardingContext();
  const { nextQuestion } = useQuestionNavigaton();

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<SourceFormValues>({
    resolver: zodResolver(sourceFormSchema),
    defaultValues: {
      howDidYouHear: onboardingInfo.howDidYouHear || '',
      howDidYouHearOther: onboardingInfo.howDidYouHearOther || '',
    },
  });

  const selectedSource = watch('howDidYouHear');

  const onSubmit = (data: SourceFormValues) => {
    setOnboardingInfo(prev => ({
      ...prev,
      howDidYouHear: data.howDidYouHear,
      howDidYouHearOther: data.howDidYouHearOther,
    }));
    nextQuestion();
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
      <header className="flex flex-col gap-2">
        <h1>How did you hear about us?</h1>
      </header>

      <div className="flex flex-col gap-4">
        <ErrorMessage
          error={errors.howDidYouHear?.message}
          className="w-full"
        />

        <Controller
          name="howDidYouHear"
          control={control}
          render={({ field }) => (
            <Dropdown
              value={field.value}
              onChange={field.onChange}
              options={sourceOptions}
              placeholder="Select source..."
            />
          )}
        />

        {selectedSource === 'Other' && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-gray-11">For other, please specify</p>
            <Textbox
              placeholder="Tell us more..."
              {...register('howDidYouHearOther')}
            />
            <ErrorMessage
              error={errors.howDidYouHearOther?.message}
              className="w-full"
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <QuestionBack />
        <Button variant="primary" type="submit">
          Next
        </Button>
      </div>
    </form>
  );
}
