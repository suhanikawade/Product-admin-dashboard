// src/api/products.js
// ------------------------------------------------
// Product API functions.
// This file contains ALL API calls related to products.
// UI components import these functions — they never call Axios directly.
// ------------------------------------------------

import api from "@/lib/axios";

/**
 * getProducts — Fetch a paginated list of products.
 *
 * @param {object} params
 * @param {number} params.limit  - How many products per page (e.g., 10, 20, 50)
 * @param {number} params.skip   - How many products to skip (e.g., skip 20 = page 3 with limit 10)
 * @param {string} params.sortBy - Field to sort by (e.g., "price", "rating", "title")
 * @param {string} params.order  - Sort direction ("asc" or "desc")
 * @returns {object} - { products: [...], total, skip, limit }
 *
 * API: GET /products?limit=10&skip=0&sortBy=price&order=asc
 */
export async function getProducts({ limit = 10, skip = 0, sortBy = "", order = "" } = {}) {
  const params = { limit, skip };

  // Only add sort params if they are provided
  if (sortBy) params.sortBy = sortBy;
  if (order) params.order = order;

  const response = await api.get("/products", { params });
  return response.data;
}

/**
 * searchProducts — Search products by a query string.
 *
 * @param {object} params
 * @param {string} params.query   - Search term (e.g., "phone")
 * @param {number} params.limit   - Products per page
 * @param {number} params.skip    - Products to skip
 * @param {string} params.sortBy  - Sort field
 * @param {string} params.order   - Sort direction
 * @param {object} params.signal  - AbortController signal to cancel old requests
 * @returns {object} - { products: [...], total, skip, limit }
 *
 * API: GET /products/search?q=phone&limit=10&skip=0
 */
export async function searchProducts({ query = "", limit = 10, skip = 0, sortBy = "", order = "", signal } = {}) {
  const params = { q: query, limit, skip };

  if (sortBy) params.sortBy = sortBy;
  if (order) params.order = order;

  const response = await api.get("/products/search", { params, signal });
  return response.data;
}

/**
 * getCategories — Get list of all product categories.
 *
 * @returns {Array} - Array of category objects [{ slug, name, url }, ...]
 *
 * API: GET /products/categories
 */
export async function getCategories() {
  const response = await api.get("/products/categories");
  return response.data;
}

/**
 * getProductsByCategory — Get products filtered by category.
 *
 * @param {string} category        - Category slug (e.g., "smartphones")
 * @param {object} params
 * @param {number} params.limit    - Products per page
 * @param {number} params.skip     - Products to skip
 * @param {string} params.sortBy   - Sort field
 * @param {string} params.order    - Sort direction
 * @returns {object} - { products: [...], total, skip, limit }
 *
 * API: GET /products/category/smartphones?limit=10&skip=0
 */
export async function getProductsByCategory(category, { limit = 10, skip = 0, sortBy = "", order = "" } = {}) {
  const params = { limit, skip };

  if (sortBy) params.sortBy = sortBy;
  if (order) params.order = order;

  const response = await api.get(`/products/category/${category}`, { params });
  return response.data;
}

/**
 * getProduct — Get a single product by its ID.
 *
 * @param {number|string} id - Product ID
 * @returns {object} - Full product object with images, reviews, etc.
 *
 * API: GET /products/1
 */
export async function getProduct(id) {
  const response = await api.get(`/products/${id}`);
  return response.data;
}

/**
 * addProduct — Create a new product.
 * NOTE: DummyJSON simulates this — the product is NOT permanently saved.
 *
 * @param {object} productData - { title, description, price, category, stock }
 * @returns {object} - The "created" product with a fake ID
 *
 * API: POST /products/add
 */
export async function addProduct(productData) {
  const response = await api.post("/products/add", productData);
  return response.data;
}

/**
 * updateProduct — Update an existing product.
 * NOTE: DummyJSON simulates this — the change is NOT permanent.
 *
 * @param {number|string} id - Product ID
 * @param {object} productData - Fields to update
 * @returns {object} - The "updated" product
 *
 * API: PUT /products/1
 */
export async function updateProduct(id, productData) {
  const response = await api.put(`/products/${id}`, productData);
  return response.data;
}

/**
 * deleteProduct — Delete a product.
 * NOTE: DummyJSON simulates this — the product is NOT permanently deleted.
 *
 * @param {number|string} id - Product ID
 * @returns {object} - The "deleted" product with isDeleted: true
 *
 * API: DELETE /products/1
 */
export async function deleteProduct(id) {
  const response = await api.delete(`/products/${id}`);
  return response.data;
}
