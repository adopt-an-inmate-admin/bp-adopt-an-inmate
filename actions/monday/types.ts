export type MondayAdopteeStatus = 'WL' | 'OFC' | 'ADOPTED';

export type UpdateAdopteeMondayStatusResult = {
  data: string | null;
  error: string | null;
};
