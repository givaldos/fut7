const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

export function safeInternalPath(
  candidate: string | null | undefined,
  fallback = "/app",
): string {
  if (
    !candidate ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    CONTROL_CHARACTERS.test(candidate)
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(candidate, "https://fut7.invalid");
    if (parsed.origin !== "https://fut7.invalid") {
      return fallback;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

