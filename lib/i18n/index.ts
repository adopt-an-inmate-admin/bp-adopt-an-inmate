import { en } from './locales/en';

type DeepKeyOf<T> = T extends object
  ? {
      [K in keyof T & string]: K extends string
        ? T[K] extends object
          ? `${K}.${DeepKeyOf<T[K]>}`
          : K
        : never;
    }[keyof T & string]
  : never;

export type MessageKey = DeepKeyOf<typeof en>;

/**
 * A simple translation function that retrieves messages from the locale file.
 * Supports dot notation for nested keys and variable replacement using {varName}.
 */
export function t(key: MessageKey, variables?: Record<string, string>): string {
  const keys = key.split('.');
  let value: unknown = en;

  for (const k of keys) {
    if (
      value &&
      typeof value === 'object' &&
      k in (value as Record<string, unknown>)
    ) {
      value = (value as Record<string, unknown>)[k];
    } else {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
  }

  if (typeof value !== 'string') {
    console.warn(`Translation key does not point to a string: ${key}`);
    return key;
  }

  let result = value;
  if (variables) {
    Object.entries(variables).forEach(([k, v]) => {
      result = result.replace(`{${k}}`, v);
    });
  }

  return result;
}
