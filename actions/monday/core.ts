import { ApiClient } from '@mondaydotcomorg/api';

const getClient = () => {
  const token = process.env.MONDAY_API_TOKEN || process.env.MONDAY_API_KEY;

  if (!token) {
    // If we're in a build environment or missing the token, we return a proxy or handle it gracefully
    // to avoid throwing at the top level during module evaluation.
    // In actual execution, this will still fail if the token is missing.
    console.warn('MONDAY_API_TOKEN or MONDAY_API_KEY is not set.');
    return new ApiClient({ token: 'dummy' });
  }

  return new ApiClient({
    token: token,
  });
};

export const mondayApiClient = getClient();
