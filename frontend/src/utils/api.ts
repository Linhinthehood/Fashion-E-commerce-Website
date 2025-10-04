export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export function buildUrl(path: string): string {
  const trimmed = path.startsWith('/') ? path : `/${path}`;
  // Avoid double "/api" when callers pass "/api/..."
  const normalized = trimmed.startsWith('/api/') ? trimmed.slice(4) : trimmed;
  return `${API_BASE_URL}${normalized}`;
}


