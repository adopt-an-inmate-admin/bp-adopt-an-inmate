'use server';

import Logger from '@/actions/logging';
import { CONFIG } from '@/config';
import { dangerous_getSupabaseServiceClient } from '@/lib/supabase/service';
import { assertEnvVarExists } from '@/lib/utils';
import { mondayApiClient } from '../core';

assertEnvVarExists('MONDAY_WL_PIPS_BOARD_ID');
assertEnvVarExists('MONDAY_ADOPTED_BOARD_ID');

const MONDAY_ADOPTED_BOARD_ID = process.env.MONDAY_ADOPTED_BOARD_ID ?? '';

export type MondayAdopteeStatus = 'WL' | 'OFC';

//as other server
export type UpdateAdopteeMondayStatusResult = {
  data: string | null;
  error: string | null;
};

const OFC_STATUS_LABEL = 'OFC: Out For Consideration';
const WL_STATUS_LABEL = 'WL: Wait Listed';
const WLFA_STATUS_LABEL = 'WLFA: Wait Listed Formerly Adopted';

//build mutation operations
export async function buildStatusMutationFields(
  adopteeMondayIds: string[],
  statusLabelsById: Record<string, string>,
  aliasPrefix: string = 'update',
) {
  const query = `
    query ($ids: [ID!]!) {
      items(ids: $ids) {
        id
        board {
          id
          columns {
            id
            title
            type
          }
        }
      }
    }
  `;

  const response = await mondayApiClient.request<{
    items: {
      id: string;
      board: {
        id: string;
        columns: { id: string; title: string; type: string }[];
      };
    }[];
  }>(query, {
    ids: adopteeMondayIds,
  });

  const boardInfoByItemId = new Map(
    response.items.map(item => [item.id, item.board]),
  );

  return adopteeMondayIds
    .map((id, idx) => {
      const board = boardInfoByItemId.get(id);
      if (!board) {
        Logger.warn(
          `Item ${id} not found in Monday when building status mutation`,
        );
        return '';
      }

      const value = statusLabelsById[id];
      const columns = board.columns || [];

      // Look for a column titled "Status"
      const statusColumn = columns.find(
        col => col.title.toLowerCase() === 'status',
      );

      let columnId = statusColumn?.id;

      if (!columnId) {
        // Fallback to legacy hardcoded logic if dynamic lookup fails
        columnId =
          board.id === MONDAY_ADOPTED_BOARD_ID ? 'status4' : 'status__1';
      }

      const alias =
        adopteeMondayIds.length === 1
          ? aliasPrefix
          : `${aliasPrefix}${idx + 1}`;

      return `${alias}:change_simple_column_value(
        board_id: "${board.id}",
        item_id: "${id}",
        column_id: "${columnId}",
        value: "${value}"
      ) { id }`;
    })
    .filter(Boolean)
    .join(',');
}

type WaitListLabelsResult =
  | { success: true; statusLabelsById: Record<string, string> }
  | { success: false; message: string };

//determine if adoptee is formerly adopted
async function getWaitListStatusLabels(
  adopteeMondayIds: string[],
): Promise<WaitListLabelsResult> {
  let supabaseService;
  try {
    supabaseService = await dangerous_getSupabaseServiceClient();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    Logger.error(
      `getWaitListStatusLabels: could not create Supabase service client: ${message}`,
    );
    return { success: false, message };
  }

  const { data, error } = await supabaseService
    .from('adoptee_vector_test')
    .select('id, formerly_adopted')
    .in('id', adopteeMondayIds);

  if (error) {
    Logger.error(
      `getWaitListStatusLabels: failed to fetch formerly_adopted: ${error.message}`,
    );
    return { success: false, message: error.message };
  }

  //2 step process to avoid O(N^2) - faster lookup with Map
  const formerlyAdoptedById = new Map(
    (data ?? []).map(row => [String(row.id), Boolean(row.formerly_adopted)]),
  );

  const statusLabelsById = adopteeMondayIds.reduce(
    (acc, id) => {
      acc[id] = formerlyAdoptedById.get(id)
        ? WLFA_STATUS_LABEL
        : WL_STATUS_LABEL;
      return acc;
    },
    {} as Record<string, string>,
  );

  return { success: true, statusLabelsById };
}

//main function
//for OFC, will return the query
//for WL, will make the change
export async function updateAdopteeMondayStatus(
  adopteeMondayIds: string[],
  status: MondayAdopteeStatus,
): Promise<UpdateAdopteeMondayStatusResult> {
  if (!CONFIG.enableMondayMutations)
    return { data: '', error: 'Forbidden action.' };
  if (adopteeMondayIds.length === 0) {
    return { data: '', error: null };
  }

  let statusLabelsById: Record<string, string>;
  if (status === 'WL') {
    const wlLabels = await getWaitListStatusLabels(adopteeMondayIds);
    if (!wlLabels.success) {
      Logger.error(
        `updateAdopteeMondayStatus(WL): skipping Monday update for ids [${adopteeMondayIds.join(', ')}]: ${wlLabels.message}`,
      );
      return {
        data: null,
        error: 'An unexpected error occurred.',
      };
    }
    statusLabelsById = wlLabels.statusLabelsById;
  } else {
    statusLabelsById = Object.fromEntries(
      adopteeMondayIds.map(id => [id, OFC_STATUS_LABEL]),
    );
  }

  const mutationFields = await buildStatusMutationFields(
    adopteeMondayIds,
    statusLabelsById,
  );

  if (!mutationFields) {
    return { data: '', error: null };
  }

  //only run if WL to avoid extra queries
  if (status === 'WL') {
    const mutationQuery = ` 
      mutation {
        ${mutationFields}
      }
    `;

    try {
      await mondayApiClient.request(mutationQuery);
      return { data: mutationFields, error: null };
    } catch (error) {
      Logger.error(
        `Failed to update adoptee Monday status to WL for ids ${adopteeMondayIds.join(',')}: ${JSON.stringify(error, null, 2)}`,
      );
      return {
        data: null,
        error: 'An unexpected error occurred.',
      };
    }
  }

  return { data: mutationFields, error: null };
}
