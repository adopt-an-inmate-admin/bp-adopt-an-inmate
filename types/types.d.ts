export interface ApplicationState {
  appId: string;
  form: Partial<FormState>;
  matches: string[] | null;
  rankedMatches?: string[];
  selectedMatch: string | null;
  stillInCorrespondence?: boolean;
}

export interface FormState {
  bio: string;
  genderPreference: 'male' | 'female' | 'no_preference';
  agePreference: number[] | null;
  whyAdopting: string;
  whyEnded: string;
}

export interface EmailPasswordCredentials {
  email: string;
  password: string;
}

export interface OnboardingInfo {
  firstName: string;
  lastName: string;
  dob: Date; // date of birth
  gender: 'male' | 'female' | 'other';
  pronouns?: string;
  location: string; // full address string
  isVeteran: boolean;
  howDidYouHear: string;
  howDidYouHearOther?: string;
  adoptedBefore: boolean;
  stillActive?: boolean;
  numPastActive?: number;
  pastInactiveReason?: string;
}
