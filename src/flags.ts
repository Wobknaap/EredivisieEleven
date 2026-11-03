import countryCodes from "./data/flag-codes.json";

export function flagCodeForNation(nation: string): string | null {
  return (countryCodes as Record<string, string>)[nation]?.toLowerCase() ?? null;
}
