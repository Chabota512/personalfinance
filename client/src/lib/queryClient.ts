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
  options: RequestInit = {},
): Promise<Response> {
  // In production, prepend the backend URL
  const fullUrl = import.meta.env.PROD && API_BASE_URL
    ? `${API_BASE_URL}${url}`
    : url;

  return fetch(fullUrl, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
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
      refetchOnWindowFocus: true, // Refetch on window focus for fresh data
      retry: 1,
      staleTime: 30 * 1000, // 30 seconds - fresher data
      gcTime: 5 * 60 * 1000, // 5 minutes cache
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