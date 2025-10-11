export function escapeHtml(str?: string): string {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

export function generateState(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

export function parseQuery(query: any): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === 'string') {
      result[key] = value;
    }
  }
  return result;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function createErrorResponse(error: string, description?: string) {
  const response: any = { error };
  if (description) {
    response.error_description = description;
  }
  return response;
}