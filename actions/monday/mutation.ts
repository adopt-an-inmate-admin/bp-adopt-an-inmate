'use server';

import { parseMondayValue } from '@/lib/monday/parser';
import { assertEnvVarExists } from '@/lib/utils';
import { Profile } from '@/types/schema';
import { mondayApiClient } from './core';
import { getColumnIdByTitle } from './utils';

assertEnvVarExists('BOARD_ID');
assertEnvVarExists('GROUP_ID');

export const createRow = async (profile: Profile) => {
  const boardId = process.env.BOARD_ID ?? '';
  const groupId = process.env.GROUP_ID ?? '';

  // Dynamic column mapping by title
  const columnTitles = {
    email: 'Email',
    first_name: 'First Name',
    last_name: 'Last Name',
    gender: 'Gender',
    date_of_birth: 'Date of Birth',
    pronouns: 'Pronouns',
    state: 'Location',
    veteran_status: 'Veteran Status',
  };

  const columnIdTranslation: Record<string, string> = {};
  for (const [key, title] of Object.entries(columnTitles)) {
    const id = await getColumnIdByTitle(boardId, title);
    if (id) {
      columnIdTranslation[key] = id;
    }
  }

  const genderToMonday: Record<string, string> = {
    male: 'Male',
    female: 'Female',
    lgbtqi: 'LGBTQI+',
    'lgbtqi+': 'LGBTQI+',
    other: 'Other', // In this context, we might want to send 'Other' or let it be blank
    both: 'Both (for group)',
    prefer_not_to_say: 'Prefer Not To Say',
  };

  // process profile values according to monday requirements
  const processedProfile: Record<string, unknown> = Object.entries(
    profile,
  ).reduce((agg: Record<string, unknown>, [key, val]) => {
    if (key === 'veteran_status') {
      agg[key] = val ? 'Yes' : 'No';
    } else if (key === 'gender') {
      const g = ((val as string) || '').toLowerCase();
      agg[key] = genderToMonday[g] || 'Prefer Not To Say';
      // If the user wants 'Other' to be blank on Monday:
      if (g === 'other') agg[key] = undefined;
    } else {
      agg[key] = val;
    }
    return agg;
  }, {});

  // translate keys to column ids
  // process values according to monday types
  const parsedProfile = Object.entries(processedProfile).reduce(
    (agg: Record<string, unknown>, [key, val]) => {
      const translatedKey =
        columnIdTranslation[key as keyof typeof columnIdTranslation];
      if (!translatedKey || val === undefined) return agg;

      const [type] = translatedKey.split('_');
      agg[translatedKey] = parseMondayValue(val as string, type);

      return agg;
    },
    {},
  );

  const gpl = `mutation { create_item(board_id: "${boardId}", group_id: "${groupId}", item_name: "Incoming form answer", create_labels_if_missing: true, column_values: "${JSON.stringify(parsedProfile).replaceAll('"', '\\"')}") { id } }`;

  try {
    await mondayApiClient.request(gpl);
    return { success: true };
  } catch (error) {
    return { success: false, error: new String(error) };
  }
};
