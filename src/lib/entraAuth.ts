// Interactive Entra ID (Azure AD) sign-in and token handling.
//
// Uses OAuth 2.0 Authorization Code + PKCE against the Microsoft identity
// platform. A temporary localhost server (the Tauri OAuth plugin) captures the
// redirect (RFC 8252 loopback), and token requests go through the app's routed
// `fetch` (the Tauri HTTP plugin), so there's no CORS and no client secret.
// Desktop (Tauri) only — throws in the browser.

import { isTauri } from "@tauri-apps/api/core";
import type { TokenCredential } from "@azure/core-auth";

// Resource scope for the Service Bus data/management plane. Using the explicit
// `user_impersonation` scope (rather than `.default`) triggers incremental
// consent at sign-in, so the API permission doesn't need pre-configuring on the
// app registration. `offline_access` asks for a refresh token so we can get new
// access tokens without re-prompting.
const SCOPE = "https://servicebus.azure.net/user_impersonation offline_access";

export interface EntraAuthConfig {
  tenantId: string;
  clientId: string;
}

export interface EntraTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // epoch milliseconds
}

function authorityBase(tenantId: string): string {
  return `https://login.microsoftonline.com/${encodeURIComponent(
    tenantId,
  )}/oauth2/v2.0`;
}

// --- PKCE helpers -------------------------------------------------------------

function base64Url(bytes: ArrayBuffer): string {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function randomString(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64Url(bytes.buffer);
}

async function codeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return base64Url(digest);
}

// --- Token endpoint -----------------------------------------------------------

async function tokenRequest(
  tenantId: string,
  body: URLSearchParams,
): Promise<EntraTokens> {
  const response = await fetch(`${authorityBase(tenantId)}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const json = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!response.ok || !json.access_token) {
    throw new Error(
      json.error_description ?? json.error ?? "Entra token request failed.",
    );
  }
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
}

/** Exchange a stored refresh token for a fresh access (and refresh) token. */
export function refreshEntraToken(
  auth: EntraAuthConfig & { refreshToken: string },
): Promise<EntraTokens> {
  const body = new URLSearchParams({
    client_id: auth.clientId,
    grant_type: "refresh_token",
    refresh_token: auth.refreshToken,
    scope: SCOPE,
  });
  return tokenRequest(auth.tenantId, body);
}

// --- Interactive sign-in ------------------------------------------------------

/**
 * Run the interactive Entra sign-in: start a loopback server, open the system
 * browser to the authorize URL, capture the redirect, and exchange the code for
 * tokens. Resolves with the access/refresh tokens.
 */
export async function signInWithEntra(
  auth: EntraAuthConfig,
): Promise<EntraTokens> {
  if (!isTauri()) {
    throw new Error("Entra sign-in is only available in the desktop app.");
  }

  const { start, cancel, onUrl } =
    await import("@fabianlars/tauri-plugin-oauth");
  const { openUrl } = await import("@tauri-apps/plugin-opener");

  const verifier = randomString(48);
  const challenge = await codeChallenge(verifier);
  const state = randomString(16);

  const port = await start();
  const redirectUri = `http://localhost:${port}`;

  try {
    const authUrl = new URL(`${authorityBase(auth.tenantId)}/authorize`);
    authUrl.searchParams.set("client_id", auth.clientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_mode", "query");
    authUrl.searchParams.set("scope", SCOPE);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("code_challenge", challenge);
    authUrl.searchParams.set("code_challenge_method", "S256");
    authUrl.searchParams.set("prompt", "select_account");

    const code = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Entra sign-in timed out.")),
        5 * 60 * 1000,
      );

      void onUrl((redirect) => {
        clearTimeout(timeout);
        try {
          const params = new URL(redirect).searchParams;
          const error = params.get("error");
          if (error) {
            reject(new Error(params.get("error_description") ?? error));
            return;
          }
          if (params.get("state") !== state) {
            reject(new Error("Entra sign-in state mismatch."));
            return;
          }
          const authCode = params.get("code");
          if (!authCode) {
            reject(new Error("No authorization code was returned."));
            return;
          }
          resolve(authCode);
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      }).then((unlisten) => {
        // Open the browser only once we're listening for the redirect.
        openUrl(authUrl.toString()).catch((err: unknown) => {
          clearTimeout(timeout);
          unlisten();
          reject(err instanceof Error ? err : new Error(String(err)));
        });
      });
    });

    const body = new URLSearchParams({
      client_id: auth.clientId,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
      scope: SCOPE,
    });
    return await tokenRequest(auth.tenantId, body);
  } finally {
    await cancel(port).catch(() => {});
  }
}

// --- Azure SDK credential -----------------------------------------------------

/**
 * A `TokenCredential` for `@azure/service-bus` backed by a stored refresh token.
 * Access tokens are cached in memory and refreshed shortly before expiry. When
 * the identity platform rotates the refresh token, `onRefreshToken` is invoked
 * so the caller can persist it.
 */
export function createEntraCredential(
  auth: EntraAuthConfig & { refreshToken: string },
  onRefreshToken?: (refreshToken: string) => void,
): TokenCredential {
  let cached: EntraTokens | undefined;
  let refreshToken = auth.refreshToken;

  return {
    async getToken() {
      if (!cached || cached.expiresAt < Date.now() + 60_000) {
        cached = await refreshEntraToken({ ...auth, refreshToken });
        if (cached.refreshToken && cached.refreshToken !== refreshToken) {
          refreshToken = cached.refreshToken;
          onRefreshToken?.(refreshToken);
        }
      }
      return {
        token: cached.accessToken,
        expiresOnTimestamp: cached.expiresAt,
      };
    },
  };
}
