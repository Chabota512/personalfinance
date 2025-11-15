import { QueryClient, type QueryFunction } from "@tanstack/react-query";
import { API_BASE_URL } from "./api-config";

async function handleResponse(response: Response) {
  if (response.status === 401) {
    window.location.href = "/auth";
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response;
}

export async function fetchApi(
  url: string,
  options?: RequestInit,
): Promise<Response> {
  // Check if URL is absolute (external API) or relative (our API)
  const isAbsoluteUrl = url.startsWith('http://') || url.startsWith('https://');
  
  // Normalize relative URLs to ensure they start with /
  let normalizedUrl = url;
  if (!isAbsoluteUrl && !url.startsWith('/')) {
    normalizedUrl = `/${url}`;
  }
  
  const fullUrl = isAbsoluteUrl ? url : `${API_BASE_URL}${normalizedUrl}`;

  // Prepare headers using Headers API for proper handling of all header formats
  const headers = new Headers(options?.headers);
  const body = options?.body;
  
  // Detect special body types that should NOT get JSON content type
  const hasContentType = headers.has('content-type');
  const hasBody = body !== undefined && body !== null;
  const isFormData = body instanceof FormData;
  const isBlob = body instanceof Blob;
  const isArrayBuffer = body instanceof ArrayBuffer;
  const isArrayBufferView = ArrayBuffer.isView(body);
  const isURLSearchParams = body instanceof URLSearchParams;
  const isReadableStream = typeof ReadableStream !== 'undefined' && body instanceof ReadableStream;
  
  // Binary/multipart types that manage their own Content-Type
  const isBinaryType = isFormData || isBlob || isArrayBuffer || isArrayBufferView || 
                       isURLSearchParams || isReadableStream;
  
  // Add JSON content type when:
  // 1. Body exists
  // 2. Content-Type not already set
  // 3. Body is not a binary/multipart type that sets its own Content-Type
  // Note: String bodies are assumed to be JSON (from JSON.stringify) unless Content-Type is explicitly set
  if (hasBody && !hasContentType && !isBinaryType) {
    headers.set('content-type', 'application/json');
  }

  // Only send credentials for same-origin requests (our API), not external APIs
  const credentials = isAbsoluteUrl ? 'omit' : 'include';

  return fetch(fullUrl, {
    ...options,
    credentials,
    headers,
  });
}

export async function apiRequest(
  method: string,
  url: string,
  body?: any
): Promise<Response> {
  const baseUrl = API_BASE_URL;
  // url already includes /api/, so just append it to base
  const fullUrl = `${baseUrl}${url}`;

  return fetch(fullUrl, {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey, meta }) => {
    // Extract URL from queryKey - support multiple patterns:
    // 1. String first element: ["/api/users", params]
    // 2. Object with url property: [{ url: "/api/users" }, params]
    // 3. Object with entity property: [{ entity: "users" }, params] -> /api/users
    // 4. Fallback to first string in array
    // 5. Fallback to meta.url if provided
    const firstElement = queryKey[0];
    let url: string | undefined;
    
    if (typeof firstElement === 'string') {
      url = firstElement;
    } else if (typeof firstElement === 'object' && firstElement !== null) {
      if ('url' in firstElement) {
        url = (firstElement as any).url;
      } else if ('entity' in firstElement) {
        // Convert entity name to API path
        const entity = (firstElement as any).entity;
        url = `/api/${entity}`;
      }
    }
    
    // Fallback: find first string in queryKey array
    if (!url) {
      const stringKey = queryKey.find(key => typeof key === 'string');
      if (stringKey) {
        url = stringKey as string;
      }
    }
    
    // Last resort: check meta.url
    if (!url && meta && typeof meta === 'object' && 'url' in meta) {
      url = (meta as any).url;
    }
    
    if (!url) {
      throw new Error(`Invalid queryKey: could not derive URL from queryKey ${JSON.stringify(queryKey)} or meta`);
    }
    
    const fullUrl = `${API_BASE_URL}${url}`;
    const res = await fetch(fullUrl, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    if (unauthorizedBehavior === "throw" && res.status === 401) {
      window.location.href = "/auth";
      throw new Error("Unauthorized");
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 15 * 60 * 1000, // 15 minutes - reduce refetching
      gcTime: 30 * 60 * 1000, // 30 minutes - keep cache longer
    },
    mutations: {
      retry: false,
    },
  },
});

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}