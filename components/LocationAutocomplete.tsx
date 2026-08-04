'use client';

import { useMemo } from 'react';
import { ClassNamesConfig, GroupBase } from 'react-select';
import AsyncSelect from 'react-select/async';
import { capitalizeLocation, getDisplayAddress } from '@/lib/formatters';
import { reactSelectClassnames } from '@/styles/reactSelectClassnames';

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  id?: string;
  variant?: 'default' | 'borderless';
}

interface LocationOption {
  label: string;
  value: string;
}

interface PhotonFeature {
  properties: {
    name?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  geometry: {
    coordinates: [number, number];
  };
}

export function LocationAutocomplete({
  value,
  onChange,
  placeholder,
  error,
  id,
  variant = 'default',
}: LocationAutocompleteProps) {
  const loadOptions = async (inputValue: string) => {
    if (!inputValue || inputValue.length < 3) return [];

    try {
      // Use Photon API (OpenStreetMap-based) for free geocoding
      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(inputValue)}&limit=5`,
      );
      const data = await response.json();

      return data.features.map((feature: PhotonFeature) => {
        const { name, city, state, postcode, country } = feature.properties;
        const lat = feature.geometry.coordinates[1];
        const lng = feature.geometry.coordinates[0];

        // Build a unique set of location parts
        const parts = [name, city, state, postcode, country].filter(
          (val, index, self) => val && self.indexOf(val) === index,
        );

        const rawLabel = parts.join(', ');
        const label = capitalizeLocation(rawLabel);
        const value = JSON.stringify({ address: label, lat, lng });

        return { label, value };
      });
    } catch (err) {
      console.error('Error fetching address suggestions:', err);
      return [];
    }
  };

  const customClassNames: ClassNamesConfig<
    LocationOption,
    false,
    GroupBase<LocationOption>
  > = useMemo(() => {
    if (variant === 'borderless') {
      return {
        ...reactSelectClassnames,
        control: () =>
          'bg-transparent border-none ring-0 shadow-none p-0 min-h-0',
        valueContainer: () => 'p-0',
        input: () => 'p-0 m-0',
        placeholder: () => 'text-gray-8',
      };
    }
    return reactSelectClassnames as ClassNamesConfig<
      LocationOption,
      false,
      GroupBase<LocationOption>
    >;
  }, [variant]);

  return (
    <div className="w-full">
      <AsyncSelect
        id={id}
        instanceId={id}
        cacheOptions
        loadOptions={loadOptions}
        value={value ? { label: getDisplayAddress(value), value } : null}
        onChange={option => onChange((option as LocationOption)?.value || '')}
        placeholder={placeholder}
        classNames={customClassNames}
        unstyled
        isClearable
        noOptionsMessage={({ inputValue }) =>
          inputValue.length < 3 ? 'Type 3+ characters...' : 'No results found'
        }
        loadingMessage={() => 'Searching...'}
      />
      {error && <p className="mt-1 text-sm text-red-12">{error}</p>}
    </div>
  );
}
