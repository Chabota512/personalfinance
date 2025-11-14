
// API Configuration for different environments
const getApiUrl = (): string => {
  // In production (mobile app), use the environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // In development, use relative paths (Vite proxy handles this)
  if (import.meta.env.DEV) {
    return '';
  }
  
  // Fallback to window location origin for web builds
  return window.location.origin;
};

export const API_BASE_URL = getApiUrl();

// Helper to construct full API URLs
export const getApiEndpoint = (path: string): string => {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // If API_BASE_URL is empty (dev mode), return path as-is
  if (!API_BASE_URL) {
    return normalizedPath;
  }
  
  // Otherwise, combine base URL with path
  return `${API_BASE_URL}${normalizedPath}`;
};
