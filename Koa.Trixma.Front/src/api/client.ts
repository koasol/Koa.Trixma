import {auth} from "../assets/firebase";
import type {TrixmaResponse} from "./types";

export const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://localhost:8080";

export const getHeaders = async (): Promise<HeadersInit> => {
  const user = auth.currentUser;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (user) {
    const token = await user.getIdToken();
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

/**
 * Generic fetch wrapper. Handles auth headers, error normalisation, and
 * optional response body parsing (set `parseResponse: false` for DELETE-style
 * endpoints that return no body).
 */
export async function request<T>(
  path: string,
  options: RequestInit & {parseResponse?: boolean} = {},
  fallbackError = "Request failed",
): Promise<TrixmaResponse<T>> {
  const {parseResponse = true, ...fetchOptions} = options;
  try {
    const headers = await getHeaders();
    const response = await fetch(`${BASE_URL}${path}`, {
      ...fetchOptions,
      headers,
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data: T = parseResponse ? await response.json() : undefined;
    return {data, error: null};
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : fallbackError,
    };
  }
}
