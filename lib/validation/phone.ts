const E164_PATTERN = /^\+[1-9][0-9]{7,14}$/;

/**
 * Normalizes Brazilian mobile/landline input to E.164 while still accepting
 * an explicit international number beginning with `+`.
 */
export function normalizePhone(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const explicitInternational = trimmed.startsWith("+");
  let digits = trimmed.replace(/\D/g, "");

  if (!explicitInternational) {
    if (digits.length === 10 || digits.length === 11) {
      digits = `55${digits}`;
    } else if (!digits.startsWith("55") || (digits.length !== 12 && digits.length !== 13)) {
      return null;
    }
  }

  const normalized = `+${digits}`;
  return E164_PATTERN.test(normalized) ? normalized : null;
}

