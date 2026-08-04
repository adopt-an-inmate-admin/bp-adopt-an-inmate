import Logger from '@/actions/logging';
import { mondayApiClient } from './core';

export interface MondayColumn {
  id: string;
  title: string;
  type: string;
  settings_str?: string;
}

const boardColumnsCache = new Map<string, MondayColumn[]>();

/**
 * Fetches all columns for a given board ID.
 * Uses a simple in-memory cache for the duration of the request/process.
 */
export async function getBoardColumns(
  boardId: string,
): Promise<MondayColumn[]> {
  if (boardColumnsCache.has(boardId)) {
    return boardColumnsCache.get(boardId)!;
  }

  const query = `
    query ($boardId: [ID!]!) {
      boards(ids: $boardId) {
        columns {
          id
          title
          type
          settings_str
        }
      }
    }
  `;

  try {
    const response = await mondayApiClient.request<{
      boards: { columns: MondayColumn[] }[];
    }>(query, { boardId: [boardId] });

    const columns = response.boards[0]?.columns || [];
    boardColumnsCache.set(boardId, columns);
    return columns;
  } catch (error) {
    Logger.error(`Error fetching columns for board ${boardId}: ${error}`);
    return [];
  }
}

/**
 * Finds a column ID by its title (case-insensitive).
 */
export async function getColumnIdByTitle(
  boardId: string,
  title: string,
): Promise<string | undefined> {
  const columns = await getBoardColumns(boardId);
  return columns.find(col => col.title.toLowerCase() === title.toLowerCase())
    ?.id;
}

/**
 * Finds a column by its title (case-insensitive).
 */
export async function getColumnByTitle(
  boardId: string,
  title: string,
): Promise<MondayColumn | undefined> {
  const columns = await getBoardColumns(boardId);
  return columns.find(col => col.title.toLowerCase() === title.toLowerCase());
}
