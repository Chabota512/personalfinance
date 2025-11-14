// API Configuration for different environments
export const API_BASE_URL = import.meta.env.VITE_API_URL || (
  import.meta.env.DEV
    ? 'http://localhost:5000'
    : window.location.origin
);

export const API_URL = `${API_BASE_URL}/api`;

// Helper to construct full API URLs
export const getApiEndpoint = (path: string): string => {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  // If API_BASE_URL is empty (dev mode), return path as-is
  if (!API_BASE_URL) {
    return normalizedPath;
  }

  // Otherwise, combine base URL with path
  return `${API_URL}${normalizedPath}`;
};