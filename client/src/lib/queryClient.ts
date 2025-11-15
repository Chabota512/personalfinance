import { QueryClient, type QueryFunction } from "@tanstack/react-query";
import { getApiEndpoint } from "./api-config";

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
  const baseUrl = API_BASE_URL;
  // url already includes /api/, so just append it to base
  const fullUrl = `${baseUrl}${url}`;

  return fetch(fullUrl, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
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
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
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