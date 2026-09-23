// src/lib/auth.js
// ------------------------------------------------
// Simple helper functions to manage the login token.
// We store the token in localStorage so it survives page refreshes.
// ------------------------------------------------

// Key name used in localStorage — keeps it consistent everywhere
const TOKEN_KEY = "auth_token";

/**
 * Get the saved token from localStorage.
 * Returns the token string, or null if not logged in.
 */
export function getToken() {
  // Check if we're in the browser (localStorage doesn't exist on the server)
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Save the token to localStorage after successful login.
 */
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Remove the token from localStorage (used for logout).
 */
export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Check if the user is logged in.
 * Returns true if a token exists, false otherwise.
 */
export function isAuthenticated() {
  return !!getToken(); // !! converts any value to true/false
}
