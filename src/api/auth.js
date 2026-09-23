// src/api/auth.js
// ------------------------------------------------
// Authentication API functions.
// This file contains all API calls related to login/auth.
// UI components import these functions — they never call Axios directly.
// ------------------------------------------------

import api from "@/lib/axios";

/**
 * loginUser — Sends username and password to the DummyJSON login API.
 *
 * @param {string} username - The username (e.g., "emilys")
 * @param {string} password - The password (e.g., "emilyspass")
 * @returns {object} - The user data with accessToken from the API
 *
 * API endpoint: POST https://dummyjson.com/auth/login
 * Request body: { username, password }
 * Response: { id, username, email, ..., accessToken }
 */
export async function loginUser(username, password) {
  // Send a POST request to /auth/login with the credentials
  const response = await api.post("/auth/login", {
    username,
    password,
  });

  // response.data contains the user object with accessToken
  return response.data;
}
