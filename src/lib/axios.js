// src/lib/axios.js
// ------------------------------------------------
// ONE shared Axios instance for the entire application.
// Every API call in the app uses this instance.
//
// What it does:
// 1. Sets the base URL to DummyJSON API
// 2. Automatically adds the auth token to every request
// 3. Handles common errors in one place
// ------------------------------------------------

import axios from "axios";
import { getToken, removeToken } from "./auth";

// Create a custom Axios instance with a base URL
// This means we only write "/products" instead of "https://dummyjson.com/products"
const api = axios.create({
  baseURL: "https://dummyjson.com",
  headers: {
    "Content-Type": "application/json",
  },
});

// ========== REQUEST INTERCEPTOR ==========
// Runs BEFORE every request is sent.
// Purpose: Automatically attach the auth token so we don't repeat this in every API call.
api.interceptors.request.use(
  (config) => {
    const token = getToken();

    // If user is logged in, add the token to the Authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config; // Must return config, otherwise the request won't be sent
  },
  (error) => {
    // If something goes wrong while preparing the request
    return Promise.reject(error);
  }
);

// ========== RESPONSE INTERCEPTOR ==========
// Runs AFTER every response is received.
// Purpose: Handle common errors in one place instead of in every component.
api.interceptors.response.use(
  (response) => {
    // If the request was successful, just return the response
    return response;
  },
  (error) => {
    // If the request was cancelled (e.g., user typed quickly in search),
    // don't treat it as a real error
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    // Get the HTTP status code (e.g., 401, 404, 500)
    const status = error.response?.status;

    // If the server says "not authorized" (token expired or invalid)
    if (status === 401) {
      removeToken(); // Clear the bad token

      // Redirect to login page (only in the browser)
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }

    // For all other errors, just pass them through
    // Each component can show its own error message
    return Promise.reject(error);
  }
);

export default api;
