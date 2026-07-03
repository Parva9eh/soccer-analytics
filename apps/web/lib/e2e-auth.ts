/** Playwright-only signed-in session (see e2e/signed-in.spec.ts). */
export const E2E_AUTH_ENABLED = process.env.NEXT_PUBLIC_E2E_AUTH === "true";

export const E2E_ACCESS_TOKEN = "e2e-smoke-token";

export const E2E_USER_ID = "11111111-1111-1111-1111-111111111111";

const E2E_AUTH_STORAGE_KEY = "e2e-auth";

/** True when a test opted into the mock signed-in session. */
export function isE2eAuthRequested(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(E2E_AUTH_STORAGE_KEY) === "1";
}

export function e2eAuthStorageKey(): string {
  return E2E_AUTH_STORAGE_KEY;
}