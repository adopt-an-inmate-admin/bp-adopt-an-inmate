'use client';

import { Controller, useForm } from 'react-hook-form';
import Select, { SingleValue } from 'react-select';
import { useOnboardingContext } from '@/contexts/OnboardingContext';
import { statesDropdownOptions } from '@/data/states';
import { useQuestionNavigaton } from '@/hooks/questions';
import { reactSelectClassnames } from '@/styles/reactSelectClassnames';
import { Button } from '../Button';
import QuestionBack from '../questions/QuestionBack';
import { Textbox } from '../Textbox';

interface StateForm {
  city: string;
  state: string;
  zip: string;
}

interface StateOption {
  label: string;
  value: string;
}

export default function OnboardingQuestionState() {
  const { onboardingInfo, setOnboardingInfo } = useOnboardingContext();
  const { nextQuestion } = useQuestionNavigaton();

  // Try to parse existing location if it exists
  const initialLocation = onboardingInfo.location || '';
  const parts = initialLocation.split(',').map(p => p.trim());

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<StateForm>({
    defaultValues: {
      city: parts[0] || '',
      state: parts[1] || '',
      zip: parts[2] || '',
    },
  });

  const onSubmit = (data: StateForm) => {
    const location = `${data.city}, ${data.state}, ${data.zip}, USA`;
    setOnboardingInfo(prev => ({ ...prev, location }));
    nextQuestion();
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
      <header className="flex flex-col gap-2">
        <h1>Where are you located?</h1>
      </header>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="city" className="text-sm text-gray-11">
            City
          </label>
          <Textbox
            {...register('city', { required: 'City is required' })}
            id="city"
            placeholder="e.g. Houston"
            error={errors.city?.message}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="state" className="text-sm text-gray-11">
            State
          </label>
          <Controller
            control={control}
            name="state"
            rules={{ required: 'State is required' }}
            render={({ field: { onChange, value, ref } }) => (
              <Select<StateOption>
                ref={ref}
                options={statesDropdownOptions}
                value={statesDropdownOptions.find(c => c.value === value)}
                onChange={(val: SingleValue<StateOption>) =>
                  onChange(val?.value)
                }
                placeholder="Select state..."
                unstyled
                classNames={reactSelectClassnames}
                isSearchable
              />
            )}
          />
          {errors.state && (
            <p className="text-xs text-red-9">{errors.state.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="zip" className="text-sm text-gray-11">
            Zip Code
          </label>
          <Textbox
            {...register('zip', {
              required: 'Zip code is required',
              pattern: {
                value: /^\d{5}(-\d{4})?$/,
                message: 'Invalid zip code format',
              },
            })}
            id="zip"
            placeholder="e.g. 77021"
            error={errors.zip?.message}
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
