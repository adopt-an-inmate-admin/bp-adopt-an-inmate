'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { t } from '@/lib/i18n';

export default function PreliminaryPage() {
  const [hasReadToBottom, setHasReadToBottom] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // Use a small threshold (2px) to avoid precision issues
      const isBottom = scrollHeight - scrollTop <= clientHeight + 2;
      if (isBottom) {
        setHasReadToBottom(true);
      }
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      // Check if content is shorter than container or already at bottom
      if (container.scrollHeight <= container.clientHeight) {
        setHasReadToBottom(true);
      }
    }
  }, []);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <div className="flex w-106 flex-col gap-4 rounded-2xl bg-gray-1 p-8">
        <p className="text-3xl font-medium">{t('auth.preliminary.title')}</p>

        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="max-h-[60vh] overflow-y-auto pr-2"
        >
          <div className="flex flex-col gap-4 text-sm text-gray-11">
            <p>
              Our new matching app is designed to help you find a thoughtful,
              appropriate match while making the process clearer and easier to
              complete.
            </p>

            <p>
              Please read all the information below before starting your
              application:
            </p>

            <ul className="flex list-disc flex-col gap-3 pl-5">
              <li>
                If you have adopted through Adopt An Inmate before, we&apos;ll
                ask whether you are still in contact with your previous
                adoptee(s). If you are no longer in contact, you&apos;ll have an
                opportunity to explain why. Some relationships end naturally—for
                example, because someone was released or both people agreed to
                stop corresponding. Simply losing touch without explanation may
                affect eligibility for another match.
              </li>

              <li>
                <strong>
                  Use an email address you expect to keep and check regularly.
                </strong>{' '}
                Your account and application are connected to that email
                address.
              </li>

              <li>
                <strong>You will request one match at a time.</strong> New
                adopters are initially matched with one incarcerated person.
              </li>

              <li>
                <strong>
                  You must wait at least six months before requesting another
                  match.
                </strong>{' '}
                This gives you time to build and maintain a consistent
                connection before adding a second adoptee.
              </li>

              <li>
                <strong>
                  Adopters may have up to two active adoptees at a time.
                </strong>
              </li>

              <li>
                <strong>Your written responses matter.</strong> Please take your
                time and answer thoughtfully. The more detail you share in
                &quot;What&apos;s your story?&quot;—about who you are, your
                interests, experiences, personality, and what you hope for in a
                connection—the better we can identify someone who may be a
                genuinely compatible match.
              </li>

              <li>
                After submitting your responses, the app will show you a small
                group of potential matches based on your preferences and written
                text. You&apos;ll be asked to rank those matches in order of
                preference.
              </li>

              <li>
                User-editable profile fields are:
                <ul className="mt-1 flex list-[circle] flex-col gap-1 pl-5">
                  <li>Name</li>
                  <li>Date of birth</li>
                  <li>State</li>
                  <li>Veteran status</li>
                </ul>
                <em className="mt-2 block not-italic">
                  Please contact us if you need to change your email address.
                </em>
              </li>

              <li>
                Once you submit your request, you will not be able to go back
                and change your responses or generate a new set of matches, so
                please review everything carefully before submitting.
              </li>

              <li>
                You may leave the application before finishing and return later
                to complete it.
              </li>

              <li>
                Submitting your choices does <strong>not</strong> automatically
                finalize an adoption. Adopt An Inmate reviews each request and
                confirms current custody and facility information before
                completing the match.
              </li>
            </ul>

            <p className="mt-2">
              Our goal is not simply to make a quick match. We want to help
              create connections that have the best chance of becoming
              consistent, meaningful, and supportive over time.
            </p>

            <p>When you&apos;re ready, use the link below to begin.</p>
          </div>
        </div>

        <div className="mt-4 flex flex-col items-center gap-2">
          <Button
            variant="primary"
            className="w-full"
            onClick={() => router.push('/sign-up')}
            disabled={!hasReadToBottom}
          >
            {t('auth.preliminary.button')}
          </Button>
          {!hasReadToBottom && (
            <p className="text-center text-xs text-gray-9 italic">
              {t('auth.preliminary.scroll_instruction')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
