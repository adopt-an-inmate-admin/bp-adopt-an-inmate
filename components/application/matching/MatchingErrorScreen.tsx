import React from 'react';
import { LuCircleAlert } from 'react-icons/lu';
import { Button, ButtonLink } from '@/components/Button';

interface MatchingErrorScreenProps {
  error: string;
  onRetry: () => void;
}

export default function MatchingErrorScreen({
  error,
  onRetry,
}: MatchingErrorScreenProps) {
  return (
    <div className="flex w-8/10 flex-col gap-6 rounded-lg bg-gray-1 px-8 py-12 sm:w-[clamp(400px,50%,500px)]">
      <div className="flex justify-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-red-3 text-red-11">
          <LuCircleAlert className="size-10" />
        </div>
      </div>

      <div className="flex flex-col gap-3 text-center">
        <h1 className="text-2xl font-semibold text-gray-12">
          Unable to generate matches
        </h1>
        <p className="font-golos text-sm text-gray-11">
          {error ||
            'We encountered an unexpected issue while finding matches for your application.'}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={onRetry}
          variant="primary"
          className="flex-1 py-2.5 font-medium"
        >
          Try again
        </Button>
        <ButtonLink
          href="/"
          variant="secondary"
          className="flex-1 py-2.5 font-medium"
        >
          Go to dashboard
        </ButtonLink>
      </div>
    </div>
  );
}
