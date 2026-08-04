'use client';

import { Controller, useForm } from 'react-hook-form';
import { useOnboardingContext } from '@/contexts/OnboardingContext';
import { useQuestionNavigaton } from '@/hooks/questions';
import { Button } from '../Button';
import { LocationAutocomplete } from '../LocationAutocomplete';
import QuestionBack from '../questions/QuestionBack';

interface StateForm {
  location: string;
}

export default function OnboardingQuestionState() {
  const { onboardingInfo, setOnboardingInfo } = useOnboardingContext();
  const { nextQuestion } = useQuestionNavigaton();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<StateForm>({
    defaultValues: {
      location: onboardingInfo.location || '',
    },
  });

  const onSubmit = (data: StateForm) => {
    setOnboardingInfo(prev => ({ ...prev, location: data.location }));
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
          <Controller
            name="location"
            control={control}
            rules={{ required: 'Location is required' }}
            render={({ field }) => (
              <LocationAutocomplete
                id="location"
                value={field.value}
                onChange={field.onChange}
                placeholder="e.g. Houston, TX 77021, USA"
                error={errors.location?.message}
              />
            )}
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
