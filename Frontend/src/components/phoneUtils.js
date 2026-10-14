const countryFlag = (code) => String.fromCodePoint(...code.toUpperCase().split("").map((letter) => 127397 + letter.charCodeAt(0)));

export const phoneCountries = [
  { name: "India", code: "IN", dial: "+91" },
  { name: "United States", code: "US", dial: "+1" },
  { name: "Canada", code: "CA", dial: "+1" },
  { name: "United Kingdom", code: "GB", dial: "+44" },
  { name: "Australia", code: "AU", dial: "+61" },
  { name: "United Arab Emirates", code: "AE", dial: "+971" },
  { name: "Saudi Arabia", code: "SA", dial: "+966" },
  { name: "Singapore", code: "SG", dial: "+65" },
  { name: "Germany", code: "DE", dial: "+49" },
  { name: "France", code: "FR", dial: "+33" },
  { name: "Nepal", code: "NP", dial: "+977" },
].map((country) => ({ ...country, flag: countryFlag(country.code) }));

export const searchPhoneCountries = (query = "") => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return phoneCountries;
  const dialDigits = normalized.replace(/\D/g, "");
  const hasExactDialMatch = normalized.startsWith("+") && phoneCountries.some((country) => country.dial === `+${dialDigits}`);
  return phoneCountries.filter((country) =>
    country.name.toLowerCase().includes(normalized) ||
    country.code.toLowerCase() === normalized ||
    (dialDigits && (hasExactDialMatch ? country.dial === `+${dialDigits}` : country.dial.slice(1).startsWith(dialDigits)))
  );
};

const normalizeParts = (value = "") => {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  const country = trimmed.startsWith("+")
    ? [...phoneCountries].sort((a, b) => b.dial.length - a.dial.length).find((item) => digits.startsWith(item.dial.slice(1)))
    : phoneCountries[0];
  const dial = country?.dial || phoneCountries[0].dial;
  let national = trimmed.startsWith("+") && country ? digits.slice(dial.length - 1) : digits;
  if (["+44", "+61", "+971", "+966", "+49", "+33"].includes(dial) && national.startsWith("0")) national = national.slice(1);
  return { dial, national };
};

export const normalizePhoneNumber = (value) => {
  const { dial, national } = normalizeParts(value);
  return `${dial}${national}`;
};

export const isValidPhoneNumber = (value) => {
  const { dial, national } = normalizeParts(value);
  const exactLengths = { "+91": [10], "+1": [10], "+44": [10], "+61": [9], "+971": [9], "+966": [9], "+65": [8], "+33": [9], "+977": [10] };
  if (dial === "+49") return national.length >= 7 && national.length <= 12;
  const allowed = exactLengths[dial];
  return allowed ? allowed.includes(national.length) : national.length >= 7 && national.length <= 15;
};
