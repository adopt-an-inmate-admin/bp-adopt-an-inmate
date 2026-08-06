const parseDropdown = (labels: string[]) => {
  return { labels };
};

const parseEmail = (email: string) => {
  return { email, text: email };
};

const parseLocation = (address: string) => {
  return {
    address,
    lat: '0',
    lng: '0',
  };
};

export const parseMondayValue = (value: string, type: string) => {
  if (type === 'dropdown' || type === 'source') return parseDropdown([value]);
  else if (type === 'email') return parseEmail(value);
  else if (type === 'location') return parseLocation(value);
  return value;
};
