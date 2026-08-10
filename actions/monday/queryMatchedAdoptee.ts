'use server';

import { dangerous_getSupabaseServiceClient } from '@/lib/supabase/service';
import { assertEnvVarExists, getEnvVar } from '@/lib/utils';
import Logger from '../logging';
import { mondayApiClient } from './core';

assertEnvVarExists('MONDAY_WL_PIPS_BOARD_ID');
assertEnvVarExists('MONDAY_ADOPTED_BOARD_ID');

const MONDAY_WL_PIPS_BOARD_ID = getEnvVar('MONDAY_WL_PIPS_BOARD_ID');
const MONDAY_ADOPTED_BOARD_ID = getEnvVar('MONDAY_ADOPTED_BOARD_ID');

export interface MatchedAdopteeResult {
  data: {
    matchedAdopteeId: string;
    unmatchedAdopteeIds: string[];
    isDefaultMatch: boolean;
    adopteeBoardIds: Record<string, string>;
  } | null;
  error: string | null;
}

interface MondayResponse {
  items: {
    id: string;
    board: {
      id: string;
    };
  }[];
}

/**
 * Checks whether given item IDs exist in either the adopted or waitlist boards.
 * Returns a map of item IDs to their board IDs.
 */
async function validateItemIds(
  adoptedBoardId: string,
  wlBoardId: string,
  itemIds: string[],
): Promise<{ data: Record<string, string> | null; error: string | null }> {
  if (itemIds.length === 0) {
    return { data: {}, error: null };
  }

  const query = `
    query ($ids: [ID!]!) {
      items(ids: $ids) {
        id
        board {
          id
        }
      }
    }
  `;

  const boardIds: Record<string, string> = {};
  for (const id of itemIds) {
    boardIds[id] = '';
  }

  const response = await mondayApiClient.request<MondayResponse>(query, {
    ids: itemIds,
  });

  if (!response || !response.items) {
    Logger.warn(`Unexpected response from Monday: ${JSON.stringify(response)}`);
    return { data: null, error: 'An unexpected error occurred.' };
  }

  const returnedItems = response.items;

  for (const item of returnedItems) {
    boardIds[item.id] = item.board.id;
  }

  return { data: boardIds, error: null };
}

/**
 * Retrieves adoptee candidates for an application and determines
 * the single matched adoptee along with unmatched candidates.
 */
export async function queryMatchedAdoptees(
  applicationId: string,
): Promise<MatchedAdopteeResult> {
  const supabase = await dangerous_getSupabaseServiceClient();
  const { data: appData, error } = await supabase
    .from('adopter_applications')
    .select('ranked_cards')
    .eq('app_uuid', applicationId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch ranked_cards: ${error.message}`);

  if (!appData) {
    Logger.error(`Unable to find application info for ${applicationId}`);
    throw new Error(`Unable to find application info for ${applicationId}`);
  }

  const candidateIds: string[] = appData.ranked_cards ?? [];

  if (candidateIds.length === 0) {
    Logger.warn(`No candidate IDs found for application ${applicationId}`);
    return { data: null, error: 'An unexpected error occurred.' };
  }

  const { data: adopteeBoardIds, error: boardInfoError } =
    await validateItemIds(
      MONDAY_ADOPTED_BOARD_ID,
      MONDAY_WL_PIPS_BOARD_ID,
      candidateIds,
    );

  if (!adopteeBoardIds || boardInfoError) {
    Logger.error(
      `Error checking candidate board information: ${boardInfoError}`,
    );
    return { data: null, error: 'An unexpected error occurred.' };
  }

  let matchedAdopteeId = null;
  let isDefaultMatch = false;

  // 1. Look for someone already in the Adopted board
  for (const id of candidateIds) {
    if (adopteeBoardIds[id] === MONDAY_ADOPTED_BOARD_ID) {
      matchedAdopteeId = id;
      break;
    }
  }

  // 2. If no one is in the Adopted board, pick the first one from the ranked list
  if (!matchedAdopteeId && candidateIds.length > 0) {
    matchedAdopteeId = candidateIds[0];
    isDefaultMatch = true;
    Logger.info(
      `No candidate found in Adopted board for application ${applicationId}. Using first candidate ${matchedAdopteeId} as default match.`,
    );
  }

  if (!matchedAdopteeId) {
    Logger.error(
      `No matched adoptee found for application ${applicationId} with candidateIds ${candidateIds}`,
    );
    return { data: null, error: 'An unexpected error occurred.' };
  }

  const unmatchedAdopteeIds = candidateIds.filter(
    id => id !== matchedAdopteeId,
  );

  return {
    data: {
      matchedAdopteeId,
      unmatchedAdopteeIds,
      isDefaultMatch,
      adopteeBoardIds,
    },
    error: null,
  };
}
