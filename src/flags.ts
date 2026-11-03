// Country names in the current player export are English Transfermarkt labels.
// The flag is display-only; player matching never depends on this map.
const countryCodes: Record<string, string> = {
  Afghanistan:'AF', Albania:'AL', Algeria:'DZ', Angola:'AO', Argentina:'AR', Armenia:'AM', Aruba:'AW',
  Australia:'AU', Austria:'AT', Azerbaijan:'AZ', Barbados:'BB', Belgium:'BE', Bonaire:'BQ',
  'Bosnia-Herzegovina':'BA', Brazil:'BR', Bulgaria:'BG', 'Burkina Faso':'BF', Burundi:'BI',
  Cameroon:'CM', Canada:'CA', 'Cape Verde':'CV', Chile:'CL', China:'CN', Colombia:'CO',
  Comoros:'KM', 'Costa Rica':'CR', "Cote d'Ivoire":'CI', Croatia:'HR', Curacao:'CW', Cyprus:'CY',
  'Czech Republic':'CZ', 'DR Congo':'CD', Denmark:'DK', 'Dominican Republic':'DO', Ecuador:'EC',
  Egypt:'EG', 'El Salvador':'SV', England:'GB-ENG', 'Equatorial Guinea':'GQ', Eritrea:'ER',
  Estonia:'EE', Finland:'FI', France:'FR', Gabon:'GA', Georgia:'GE', Germany:'DE', Ghana:'GH',
  Greece:'GR', Grenada:'GD', Guadeloupe:'GP', Guatemala:'GT', Guinea:'GN', 'Guinea-Bissau':'GW',
  Guyana:'GY', Haiti:'HT', Hungary:'HU', Iceland:'IS', Indonesia:'ID', Iran:'IR', Iraq:'IQ',
  Ireland:'IE', Israel:'IL', Italy:'IT', Jamaica:'JM', Japan:'JP', Kazakhstan:'KZ',
  'Korea, South':'KR', Kosovo:'XK', Latvia:'LV', Lithuania:'LT', Luxembourg:'LU', Malaysia:'MY',
  Mali:'ML', Mexico:'MX', Moldova:'MD', Montenegro:'ME', Montserrat:'MS', Morocco:'MA',
  Netherlands:'NL', 'New Zealand':'NZ', Nigeria:'NG', 'North Macedonia':'MK', Norway:'NO',
  Palestine:'PS', Paraguay:'PY', Peru:'PE', Philippines:'PH', Poland:'PL', Portugal:'PT',
  Romania:'RO', Russia:'RU', Rwanda:'RW', 'Saudi Arabia':'SA', Scotland:'GB-SCT', Senegal:'SN',
  Serbia:'RS', 'Sierra Leone':'SL', 'Sint Maarten':'SX', Slovakia:'SK', Slovenia:'SI',
  'South Africa':'ZA', Spain:'ES', Suriname:'SR', Sweden:'SE', Switzerland:'CH', Syria:'SY',
  'The Gambia':'GM', Togo:'TG', 'Trinidad and Tobago':'TT', Tunisia:'TN', Turkey:'TR',
  'Türkiye':'TR', Uganda:'UG', Ukraine:'UA', 'United States':'US', Uruguay:'UY',
  Venezuela:'VE', Wales:'GB-WLS', Zambia:'ZM', Zimbabwe:'ZW'
};

export function flagForNation(nation: string): string {
  const code = countryCodes[nation];
  if (!code) return '🌐';
  if (code.startsWith('GB-')) {
    const subdivision = code.slice(3).toLowerCase();
    return '🏴' + [...subdivision].map(char => String.fromCodePoint(0xe0061 + char.charCodeAt(0) - 97)).join('') + String.fromCodePoint(0xe007f);
  }
  return [...code].map(char => String.fromCodePoint(0x1f1e6 + char.charCodeAt(0) - 65)).join('');
}
