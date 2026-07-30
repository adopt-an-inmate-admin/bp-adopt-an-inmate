'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import z from 'zod';
import { useOnboardingContext } from '@/contexts/OnboardingContext';
import { useQuestionNavigaton } from '@/hooks/questions';
import { Button } from '../Button';
import ErrorMessage from '../ErrorMessage';
import QuestionBack from '../questions/QuestionBack';
import RadioCard from '../RadioCard';

const genderFormSchema = z.object({
  gender: z.enum(['male', 'female', 'other'], {
    message: 'Please select an option',
  }),
});

type GenderFormValues = z.infer<typeof genderFormSchema>;

export default function OnboardingQuestionGender() {
  const { onboardingInfo, setOnboardingInfo } = useOnboardingContext();
  const { nextQuestion } = useQuestionNavigaton();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GenderFormValues>({
    resolver: zodResolver(genderFormSchema),
    defaultValues: {
      gender: onboardingInfo.gender,
    },
  });

  const onSubmit = (data: GenderFormValues) => {
    setOnboardingInfo(prev => ({ ...prev, gender: data.gender }));
    nextQuestion();
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
      <header className="flex flex-col gap-2">
        <h1>What is your sex/gender?</h1>
      </header>

      <div className="flex flex-col gap-4">
        <ErrorMessage error={errors.gender?.message} className="w-full" />
        <div className="flex flex-col gap-1">
          <div className="flex flex-col gap-2">
            <RadioCard value="male" {...register('gender')}>
              <p>Male</p>
            </RadioCard>
            <RadioCard value="female" {...register('gender')}>
              <p>Female</p>
            </RadioCard>
            <RadioCard value="other" {...register('gender')}>
              <p>Other</p>
            </RadioCard>
          </div>
        </div>
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
