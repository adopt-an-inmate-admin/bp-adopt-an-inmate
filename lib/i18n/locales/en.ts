export const en = {
  common: {
    n_a: 'N/A',
    yes: 'Yes',
    no: 'No',
    none: 'None',
  },
  sidebar: {
    admin: 'Admin',
    user: 'User',
    applications: 'Applications ({count})',
    history: 'History ({count})',
    donate: 'Donate',
    learn_more: 'Learn More',
    greeting: 'Hi {name}!',
    profile: 'Profile',
    logout: 'Logout',
  },
  dashboard: {
    title: {
      applications: 'Applications',
      history: 'History',
    },
    stats: {
      total: 'Total Applications',
      total_desc: 'All time, incl. offline',
      portal: 'Portal Applications',
      portal_desc: 'Via this platform',
      external: 'External Applications',
      external_desc: 'Pre-platform records',
    },
    disclaimer: {
      text: "We don't have adoptee info for matches made on external platforms. Email {email} if this number is inaccurate.",
    },
    new_app_button: {
      creating: 'Creating...',
      create_new: 'Create new',
      error_fallback: 'An unexpected error occurred.',
    },
  },
  admin: {
    pending_applications: {
      title: 'Pending Applications',
      refresh: 'Refresh',
      loading: 'Loading applications...',
      no_apps: 'No pending applications found.',
      table: {
        adopter: 'Adopter',
        email: 'Email',
        submitted: 'Submitted',
        status: 'Status',
        matched_adoptee: 'Matched Adoptee',
        ranked_candidates: 'Ranked Candidates',
      },
    },
    reset_records: {
      title: 'Reset Test Records',
      description:
        "This will delete the user's profile, applications, and auth account. Use with caution.",
      label: 'User Email to Reset',
      placeholder: 'user@example.com',
      button: 'Reset User Data',
      processing: 'Processing...',
      confirm: {
        title: 'ARE YOU ABSOLUTELY SURE?',
        description:
          'This action is permanent and cannot be undone. Type "DELETE" below to confirm.',
        placeholder: 'Type DELETE',
        confirm_button: 'Confirm Delete',
        cancel_button: 'Cancel',
        alert_confirm: 'Please type DELETE to confirm.',
        alert_success: 'Test data for {email} reset successfully.',
        alert_error: 'Error resetting test data: {error}',
      },
    },
  },
  profile: {
    title: 'Profile',
    account: 'Account',
    edit_profile: 'Edit Profile',
    personal_info: 'Personal Information',
    fields: {
      name: 'Name',
      email: 'Email',
      dob: 'Date of Birth',
      gender: 'Gender',
      pronouns: 'Pronouns',
      location: 'Location',
      veteran: 'Veteran',
    },
    help: 'Need help or want to update your email address? Contact {email}.',
  },
  auth: {
    login: {
      title: 'Log in',
      email: 'Email',
      email_placeholder: 'jamie@example.com',
      password: 'Password',
      password_placeholder: 'Password',
      forgot_password: 'Forgot password?',
      login_button: 'Login',
      show_password: 'Show password',
      hide_password: 'Hide password',
      no_account: "Don't have an account?",
      sign_up: 'Sign Up',
      errors: {
        email_invalid: 'Email address not supported.',
        invalid_credentials: 'Either email or password is incorrect.',
        unexpected: 'An unexpected error occurred, please try again later.',
      },
    },
    preliminary: {
      title: 'Before You Begin',
      button: 'I have read and understood',
      scroll_instruction: 'Please scroll to the end of the text to proceed.',
    },
  },
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
