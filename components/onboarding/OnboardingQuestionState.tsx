'use client';

import { useForm } from 'react-hook-form';
import { useOnboardingContext } from '@/contexts/OnboardingContext';
import { useQuestionNavigaton } from '@/hooks/questions';
import { capitalizeLocation } from '@/lib/formatters';
import { Button } from '../Button';
import QuestionBack from '../questions/QuestionBack';
import { Textbox } from '../Textbox';

interface StateForm {
  location: string;
}

export default function OnboardingQuestionState() {
  const { onboardingInfo, setOnboardingInfo } = useOnboardingContext();
  const { nextQuestion } = useQuestionNavigaton();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StateForm>({
    defaultValues: {
      location: onboardingInfo.location || '',
    },
  });

  const onSubmit = (data: StateForm) => {
    const formattedLocation = capitalizeLocation(data.location);
    setOnboardingInfo(prev => ({ ...prev, location: formattedLocation }));
    nextQuestion();
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
      <header className="flex flex-col gap-2">
        <h1>Where are you located?</h1>
      </header>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="location" className="text-sm text-gray-11">
            Location
          </label>
          <Textbox
            {...register('location', { required: 'Location is required' })}
            id="location"
            placeholder="e.g. Houston, TX 77021, USA"
            error={errors.location?.message}
          />
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
