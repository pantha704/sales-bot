export function safeErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "The provider request failed.";
  }

  if (error.name.includes("RateLimit")) {
    return "The provider rate limit was reached.";
  }

  if (error.name.includes("Timeout")) {
    return "The provider request timed out.";
  }

  return "The provider is temporarily unavailable.";
}
