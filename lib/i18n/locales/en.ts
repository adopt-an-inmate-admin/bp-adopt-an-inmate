export const en = {
  app: {
    callout: {
      status: {
        pending: {
          title: 'Our staff is reviewing your application',
          description:
            'It will take about 5-7 days. Check your email to be updated!',
        },
        pending_confirmation: {
          description: 'You have two weeks to respond.',
          description_with_date: 'You have until {date} to respond.',
        },
        reapply: {
          title: 'Please reapply!',
          description_timeout: "We didn't hear from you within 2 weeks.",
          description_issue: 'There was an issue with your application.',
        },
        ended: {
          title: 'Your application has ended.',
          description_with_reason: 'Reason: {reason}',
        },
        rejected: {
          title: 'Email {email}',
          description:
            'for appeals or reasoning, and to submit further applications.',
        },
        active: {
          link_text: 'Click here to see mailing regulation by state',
        },
      },
    },
  },
} as const;

export type TranslationKeys = typeof en;
