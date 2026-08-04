import { AdopterApplication } from '@/types/schema';
import { FormState } from '@/types/types';

/**
 * Formats an application status value into a
 * display-appropriate string.
 */
export function formatAppStatus(status: AdopterApplication['status']) {
  // custom mapping
  if (status === 'ACTIVE') return 'Active';
  if (status === 'PENDING_CONFIRMATION') return 'Pending';

  // generic
  return capitalize(status.toLowerCase().replaceAll('_', ' '));
}

/**
 * Formats a gender preference value into a
 * display-appropriate string.
 */
export function formatGenderPreference(genderPreference?: string | null) {
  if (!genderPreference) return 'N/A';

  if (genderPreference === 'no_preference') return 'No preference';

  return capitalize(genderPreference);
}

/**
 * Formats an age preference range into a
 * display-appropriate string.
 */
export function formatAgePreference(
  agePreference?: FormState['agePreference'],
) {
  if (!agePreference || agePreference.length === 0) return 'N/A';
  if (agePreference.length > 2) return 'Error';
  if (agePreference.length === 1) return agePreference[0];

  // return agePreference;
  return `${agePreference[0]} - ${agePreference[1]}`;
}

/**
 * Formats a timestamp string or a date object
 * into a American time notation (mm/dd/yyyy)
 */
export function formatAmericanTime(dateParam: Date | string) {
  const date = new Date(dateParam);
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * Formats a timestamp string or a date object
 * into an English date (e.g. Mar 28, 2026)
 */
export function formatDate(dateParam: Date | string) {
  const date = new Date(dateParam);
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Returns an appropriate display text for a relevant
 * date for an application, based on the application's
 * status and various times.
 */
export function formatAppDateByStatus(app: AdopterApplication) {
  switch (app.status) {
    case 'ACTIVE':
      return `Started: ${formatDate(app.time_started || '')}`;
    case 'PENDING':
    case 'REAPPLY':
    case 'REJECTED':
      return `Submitted: ${formatDate(app.time_submitted || '')}`;
    case 'PENDING_CONFIRMATION':
      return `Confirm by: ${formatDate(app.time_confirmation_due || '')}`;
    case 'ENDED':
      return `Ended: ${formatDate(app.time_ended || '')}`;
    case 'INCOMPLETE':
      return `Created: ${formatDate(app.time_created)}`;
    default:
      return '';
  }
}

/**
 * Capitalize the first letter.
 */
export function capitalize(s: string) {
  if (!s) return s;
  return `${s.charAt(0).toUpperCase()}${s.slice(1)}`;
}

/**
 * Capitalizes pronouns (e.g. "he/him" -> "He / Him")
 */
export function capitalizePronouns(pronouns: string) {
  if (!pronouns) return '';
  return pronouns
    .split('/')
    .map(p => capitalize(p.trim()))
    .join(' / ');
}

/**
 * Capitalizes a location string (City, State Zip, USA)
 */
export function capitalizeLocation(location: string) {
  if (!location) return '';

  return location
    .split(',')
    .map(part => {
      return part
        .trim()
        .split(' ')
        .map(word => {
          const lower = word.toLowerCase();
          if (lower === 'usa') return 'USA';
          // If it's a 2-letter state abbreviation, uppercase it
          if (word.length === 2 && /^[a-zA-Z]{2}$/.test(word))
            return word.toUpperCase();
          return word.charAt(0).toUpperCase() + lower.slice(1);
        })
        .join(' ');
    })
    .join(', ');
}

export interface MondayLocation {
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  countryShortName?: string;
  lat?: number;
  lng?: number;
}

/**
 * Parses a location string into its components for Monday.com.
 */
export function parseLocationForMonday(location: string): MondayLocation {
  if (!location) {
    return {
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
      countryShortName: '',
    };
  }

  let address = location;
  let lat: number | undefined;
  let lng: number | undefined;

  // Try to parse as JSON first (new format)
  try {
    const parsed = JSON.parse(location);
    if (parsed && typeof parsed === 'object' && parsed.address) {
      address = parsed.address;
      lat = parsed.lat;
      lng = parsed.lng;
    }
  } catch {
    // Not JSON, continue with plain string
  }

  const parts = address.split(',').map(p => p.trim());
  let city = '';
  let state = '';
  let zip = '';
  const country = parts[parts.length - 1] || 'United States';

  if (parts.length >= 3) {
    // Check if the second to last part contains both state and zip (common in US addresses)
    // e.g., "Prescott, Arizona 86301, USA"
    const stateZipPart = parts[parts.length - 2];
    const stateZipMatch = stateZipPart.match(/^(.+?)\s+(\d{5}(?:-\d{4})?)$/);

    if (stateZipMatch) {
      state = stateZipMatch[1];
      zip = stateZipMatch[2];
      city = parts[parts.length - 3] || '';
    } else {
      // If no match, check if zip is separate
      // e.g., "Prescott, Arizona, 86301, USA"
      if (
        parts.length >= 4 &&
        /^\d{5}(?:-\d{4})?$/.test(parts[parts.length - 2])
      ) {
        zip = parts[parts.length - 2];
        state = parts[parts.length - 3];
        city = parts[parts.length - 4] || '';
      } else {
        // Just state and country
        // e.g., "Prescott, Arizona, USA"
        state = parts[parts.length - 2];
        city = parts[parts.length - 3] || '';
      }
    }
  } else if (parts.length === 2) {
    city = parts[0];
  }

  const countryShortName =
    country.toLowerCase().includes('usa') ||
    country.toLowerCase().includes('united states')
      ? 'US'
      : '';

  const result: MondayLocation = {
    address,
    city,
    state,
    zipCode: zip,
    country,
    countryShortName,
  };
  if (lat !== undefined) result.lat = lat;
  if (lng !== undefined) result.lng = lng;

  // Remove empty strings or undefined
  (Object.keys(result) as Array<keyof MondayLocation>).forEach(key => {
    if (result[key] === '' || result[key] === undefined) {
      delete result[key];
    }
  });

  return result;
}

/**
 * Extracts just the state from a full location string.
 */
export function parseStateFromLocation(location: string) {
  if (!location) return '';

  let address = location;
  try {
    const parsed = JSON.parse(location);
    if (parsed && typeof parsed === 'object' && parsed.address) {
      address = parsed.address;
    }
  } catch {
    // Not JSON, use as is
  }

  const parts = address.split(',').map(p => p.trim());
  if (parts.length >= 3) {
    const stateZipPart = parts[parts.length - 2];
    const stateZipMatch = stateZipPart.match(/^(.+?)\s+(\d{5}(?:-\d{4})?)$/);
    if (stateZipMatch) return stateZipMatch[1];
    return parts[parts.length - 2];
  }
  if (parts.length === 2) return parts[0];
  return address;
}

/**
 * Extracts the display address from a location string (which might be JSON).
 */
export function getDisplayAddress(location: string) {
  if (!location) return '';
  try {
    const parsed = JSON.parse(location);
    if (parsed && typeof parsed === 'object' && parsed.address) {
      return parsed.address;
    }
  } catch {
    // Not JSON
  }
  return location;
}
