import { ConvexClient, ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

let client: ConvexClient | null = null;

function getConvexUrl(): string {
  const url = (import.meta as any).env?.VITE_CONVEX_URL;
  if (!url) throw new Error("VITE_CONVEX_URL not set");
  return url;
}

export function getConvexClient(): ConvexClient {
  if (!client) {
    client = new ConvexClient(getConvexUrl());
  }
  return client;
}

// HTTP client for token refresh — bypasses WebSocket to avoid deadlock
// when AuthenticationManager stops the socket during reauthentication
export function createHttpClient(): ConvexHttpClient {
  return new ConvexHttpClient(getConvexUrl());
}

export function setConvexAuth(token: string | null) {
  const c = getConvexClient();
  if (!token) {
    c.setAuth(() => Promise.resolve(null));
    return;
  }

  c.setAuth(async ({ forceRefreshToken }) => {
    if (!forceRefreshToken) {
      return localStorage.getItem("convex_auth_token");
    }

    const refreshToken = localStorage.getItem("convex_refresh_token");
    if (!refreshToken) return null;

    try {
      const http = createHttpClient();
      const result = await http.action(api.auth.signIn, { refreshToken });
      if (result && typeof result === "object" && "tokens" in result) {
        const newTokens = (result as any).tokens;
        localStorage.setItem("convex_auth_token", newTokens.token);
        localStorage.setItem("convex_refresh_token", newTokens.refreshToken);
        return newTokens.token;
      }
    } catch (err) {
      console.warn("Token refresh failed, keeping tokens for retry:", err);
    }
    return null;
  });
}
