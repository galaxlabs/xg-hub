const US_STATE_CODES = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
  'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
  'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
  'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
  'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
  'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
  'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY'
};

export async function parseFullAddress(fullAddress) {
  if (!fullAddress || !fullAddress.trim()) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&q=${encodeURIComponent(fullAddress)}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data || data.length === 0) return null;

    const result = data[0];
    const addr = result.address || {};

    // Pehle official ISO code try karo, agar na mile to state naam se khud nikalo
    let stateCode = result['iso3166-2-lvl4'] ? result['iso3166-2-lvl4'].split('-')[1] : '';
    if (!stateCode && addr.state) {
      stateCode = US_STATE_CODES[addr.state.toLowerCase()] || '';
    }

    return {
      address: [addr.house_number, addr.road].filter(Boolean).join(' '),
      city: addr.city || addr.town || addr.village || addr.county || '',
      stateProvince: addr.state || '',
      stateCode: stateCode,
      zipCode: addr.postcode || '',
      country: addr.country || ''
    };
  } catch (err) {
    console.error('Geocode error:', err);
    return null;
  }
}