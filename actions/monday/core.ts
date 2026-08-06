import { ApiClient } from '@mondaydotcomorg/api';

const token = process.env.MONDAY_API_TOKEN || process.env.MONDAY_API_KEY;

if (!token) {
  throw new Error('MONDAY_API_TOKEN or MONDAY_API_KEY must be set');
}

export const mondayApiClient = new ApiClient({
  token: token,
});
