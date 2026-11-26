/** Phone handling for contact links. Inputs should include a country code. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizePhone(input: string): string {
  const trimmed = input.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  return hasPlus ? `+${digits}` : `+${digits}`;
}

export function isValidPhone(input: string): boolean {
  const digits = normalizePhone(input).slice(1);
  return digits.length >= 7 && digits.length <= 15;
}

export function phoneDigits(input: string): string {
  return normalizePhone(input).slice(1);
}

export function isValidOptionalEmail(input: string): boolean {
  return input.trim() === "" || EMAIL_PATTERN.test(input.trim());
}

export function telHref(input: string): string {
  return `tel:${phoneDigits(input)}`;
}

export function whatsappHref(input: string): string {
  return `https://wa.me/${phoneDigits(input)}`;
}
