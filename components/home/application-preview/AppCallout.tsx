'use client';

import { useMemo } from 'react';
import { LuArrowUpRight } from 'react-icons/lu';
import Link from 'next/link';
import { cva } from 'class-variance-authority';
import { CONFIG } from '@/config';
import { formatDate } from '@/lib/formatters';
import { t } from '@/lib/i18n';
import { AdopterApplication } from '@/types/schema';

const calloutStyles = cva(
  'rounded-lg px-6 py-5 flex flex-col gap-1 font-medium',
  {
    variants: {
      status: {
        PENDING: 'bg-yellow-3',
        PENDING_CONFIRMATION: 'bg-yellow-3',
        ACTIVE: 'bg-[#DEF4DF]',
        ACCEPTED: 'bg-[#DEF4DF]',
        REAPPLY: 'bg-[#EBD2FF]',
        REJECTED: 'bg-red-5',
        ENDED: 'bg-[#FDDEF3]',
        INCOMPLETE: '',
      },
      variant: {
        default: '',
        link: 'flex-row items-center justify-between gap-2 group',
      },
    },
  },
);

export default function AppCallout({
  app,
  children,
}: {
  app: AdopterApplication;
  children?: React.ReactNode;
}) {
  const calloutTitle = useMemo(() => {
    if (!app) return '';

    switch (app.status) {
      case 'REAPPLY':
        return t('app.callout.status.reapply.title');
      case 'ENDED':
        return t('app.callout.status.ended.title');
      case 'REJECTED':
        return t('app.callout.status.rejected.title', {
          email: CONFIG.adminEmail,
        });
      case 'PENDING':
        return t('app.callout.status.pending.title');
      default:
        return '';
    }
  }, [app]);

  const calloutDescription = useMemo(() => {
    if (!app) return '';

    switch (app.status) {
      case 'PENDING':
        return t('app.callout.status.pending.description');
      case 'PENDING_CONFIRMATION':
        return app.time_confirmation_due
          ? t('app.callout.status.pending_confirmation.description_with_date', {
              date: formatDate(app.time_confirmation_due),
            })
          : t('app.callout.status.pending_confirmation.description');
      case 'REAPPLY':
        return app.matched_adoptee
          ? t('app.callout.status.reapply.description_timeout')
          : t('app.callout.status.reapply.description_issue');
      case 'ENDED':
        return t('app.callout.status.ended.description_with_reason', {
          reason: app.ended_reason || 'N/A',
        });
      case 'REJECTED':
        return t('app.callout.status.rejected.description');
      default:
        return '';
    }
  }, [app]);

  // use confirmation control callout instead
  if (app.status === 'PENDING_CONFIRMATION') return null;

  if (app.status === 'ACTIVE')
    return (
      <CalloutLink
        href="https://docs.google.com/document/d/1ASL6ReAo3zyODDdqjf9bP3OWAWlZQG8bplheDCYFMRM/edit?usp=sharing"
        status={app.status}
      >
        {t('app.callout.status.active.link_text')}
      </CalloutLink>
    );

  return (
    <CalloutCard
      title={calloutTitle}
      description={calloutDescription}
      status={app.status}
    >
      {children}
    </CalloutCard>
  );
}

export function CalloutCard({
  title,
  description,
  status,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
  status: AdopterApplication['status'];
}) {
  return (
    <div className={calloutStyles({ status })}>
      <p className="text-md">{title}</p>
      <p className="text-sm text-black/40">{description}</p>

      {children}
    </div>
  );
}

export function CalloutLink({
  href,
  children,
  status,
}: {
  href: string;
  children?: React.ReactNode;
  status: AdopterApplication['status'];
}) {
  return (
    <Link
      href={href}
      className={calloutStyles({ status, variant: 'link' })}
      target="_blank"
    >
      {children}
      <LuArrowUpRight className="text-gray-11 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:scale-125" />
    </Link>
  );
}
