"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  addProduct,
  deleteProduct,
  getCategories,
  getProducts,
  getProductsByCategory,
  searchProducts,
  updateProduct,
} from "@/api/products";
import { isAuthenticated, removeToken } from "@/lib/auth";

const PAGE_SIZES = [10, 20, 50];
const API_DEBOUNCE_MS = 400;
const EMPTY_FORM = {
  title: "",
  description: "",
  price: "",
  category: "",
  stock: "",
  rating: "",
  image: "",
};

function readPageValue(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readLimitValue(value) {
  const parsed = Number.parseInt(value ?? "", 10);
  return PAGE_SIZES.includes(parsed) ? parsed : 10;
}

function getSortParts(rawValue) {
  if (!rawValue) {
    return { sortBy: "", order: "" };
  }

  const [field, direction = "asc"] = rawValue.split("-");
  const normalizedField = ["price", "rating", "title"].includes(field) ? field : "";
  const normalizedDirection = direction === "desc" ? "desc" : "asc";

  return {
    sortBy: normalizedField,
    order: normalizedField ? normalizedDirection : "",
  };
}

function formatIndianPrice(value) {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return "₹0.00";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getSafeImageSource(src, fallback = "/placeholder.png") {
  if (!src || typeof src !== "string") {
    return fallback;
  }

  const trimmed = src.trim();

  if (!trimmed || trimmed === "null") {
    return fallback;
  }

  if (trimmed.startsWith("/") || trimmed.startsWith("data:")) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    const allowedHosts = ["cdn.dummyjson.com", "www.flipkart.com", "www.mywishcare.com"];
    return allowedHosts.includes(url.hostname.toLowerCase()) ? trimmed : fallback;
  } catch {
    return fallback;
  }
}

export default function ProductDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestRef = useRef(null);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("add");
  const [editingProduct, setEditingProduct] = useState(null);
  const [formValues, setFormValues] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const currentPage = readPageValue(searchParams.get("page"), 1);
  const pageSize = readLimitValue(searchParams.get("limit"));
  const searchTerm = searchParams.get("q") ?? "";
  const categoryFilter = searchParams.get("category") ?? "";
  const sortValue = searchParams.get("sort") ?? "";
  const { sortBy, order } = useMemo(() => getSortParts(sortValue), [sortValue]);
  const hasConflict = Boolean(searchTerm && categoryFilter);
  const activeCategory = searchTerm ? "" : categoryFilter;

  const isLoggedIn = isAuthenticated();

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }
  }, [isLoggedIn, router]);

  useEffect(() => {
    async function loadCategories() {
      try {
        const list = await getCategories();
        const normalized = Array.isArray(list)
          ? list
              .map((category) => {
                if (typeof category === "string") {
                  return category;
                }
                if (category && typeof category === "object") {
                  return category.slug || category.name || category.value || "";
                }
                return "";
              })
              .filter(Boolean)
          : [];

        setCategories(normalized);
      } catch {
        setCategories([]);
      }
    }

    loadCategories();
  }, []);

  const updateQuery = useCallback(
    (updates) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === undefined || value === "") {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });

      const nextQuery = params.toString();
      router.replace(nextQuery ? `/?${nextQuery}` : "/");
    },
    [router, searchParams]
  );

  const fetchProducts = useCallback(
    async (signalOverride) => {
      if (!isLoggedIn) {
        return;
      }

      const signal = signalOverride ?? new AbortController().signal;
      setLoading(true);
      setError("");

      try {
        const skip = (currentPage - 1) * pageSize;
        let response;

        if (searchTerm) {
          response = await searchProducts({
            query: searchTerm,
            limit: pageSize,
            skip,
            sortBy,
            order,
            signal,
          });
        } else if (activeCategory) {
          response = await getProductsByCategory(activeCategory, {
            limit: pageSize,
            skip,
            sortBy,
            order,
          });
        } else {
          response = await getProducts({
            limit: pageSize,
            skip,
            sortBy,
            order,
          });
        }

        if (signal?.aborted) {
          return;
        }

        const nextTotal = Number(response?.total ?? 0);
        const nextProducts = Array.isArray(response?.products) ? response.products : [];
        setProducts(nextProducts);
        setTotal(nextTotal);

        const maxPage = Math.max(1, Math.ceil(nextTotal / pageSize));
        if (currentPage > maxPage) {
          updateQuery({ page: maxPage });
        }
      } catch (exception) {
        if (signal?.aborted) {
          return;
        }

        setProducts([]);
        setTotal(0);
        setError("We couldn’t load the products right now.");
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [activeCategory, currentPage, isLoggedIn, order, pageSize, searchTerm, sortBy, updateQuery]
  );

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    const controller = new AbortController();
    requestRef.current = controller;

    const timeoutId = setTimeout(() => {
      void fetchProducts(controller.signal);
    }, API_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
      if (requestRef.current === controller) {
        requestRef.current = null;
      }
    };
  }, [fetchProducts, isLoggedIn]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageStart = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, total);

  const pageNumbers = useMemo(() => {
    const pages = [];
    const startIndex = Math.max(1, currentPage - 2);
    const endIndex = Math.min(totalPages, currentPage + 2);

    for (let page = startIndex; page <= endIndex; page += 1) {
      pages.push(page);
    }

    return pages;
  }, [currentPage, totalPages]);

  const handleLogout = () => {
    removeToken();
    router.replace("/login");
  };

  const handleSearchChange = (event) => {
    updateQuery({ q: event.target.value, page: 1 });
  };

  const handleCategoryChange = (event) => {
    updateQuery({ category: event.target.value, page: 1 });
  };

  const handleSortChange = (event) => {
    updateQuery({ sort: event.target.value, page: 1 });
  };

  const handlePageSizeChange = (event) => {
    updateQuery({ limit: event.target.value, page: 1 });
  };

  const openAddModal = () => {
    setFormMode("add");
    setEditingProduct(null);
    setFormValues(EMPTY_FORM);
    setFormError("");
    setIsFormOpen(true);
  };

  const openEditModal = (product) => {
    setFormMode("edit");
    setEditingProduct(product);
    setFormValues({
      title: product.title || "",
      description: product.description || "",
      price: product.price ?? "",
      category: product.category || "",
      stock: product.stock ?? "",
      rating: product.rating ?? "",
      image: product.thumbnail || product.images?.[0] || "",
    });
    setFormError("");
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setFormMode("add");
    setFormValues(EMPTY_FORM);
    setEditingProduct(null);
    setFormError("");
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormValues((previous) => ({ ...previous, [name]: value }));
  };

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormValues((previous) => ({ ...previous, image: String(reader.result || "") }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProduct = async (event) => {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    const price = Number(formValues.price);
    const stock = Number(formValues.stock);
    const rating = Number(formValues.rating);

    if (!formValues.title.trim() || !formValues.description.trim() || !formValues.category.trim()) {
      setFormError("Title, description, and category are required.");
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      setFormError("Price must be a valid number greater than zero.");
      return;
    }

    if (!Number.isFinite(stock) || stock < 0) {
      setFormError("Stock must be zero or higher.");
      return;
    }

    if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
      setFormError("Rating must be between 0 and 5.");
      return;
    }

    setIsSaving(true);
    setFormError("");

    try {
      const productImage = (formValues.image || "").trim();
      const payload = {
        title: formValues.title.trim(),
        description: formValues.description.trim(),
        price: Number(price),
        category: formValues.category.trim(),
        stock: Number(stock),
        rating: Number(rating),
        thumbnail: productImage || undefined,
        images: productImage ? [productImage] : undefined,
      };

      if (formMode === "edit" && editingProduct) {
        const response = await updateProduct(editingProduct.id, payload);
        const normalizedImage = response?.thumbnail || response?.images?.[0] || productImage || editingProduct.thumbnail || editingProduct.images?.[0];
        setProducts((previous) =>
          previous.map((product) =>
            String(product.id) === String(editingProduct.id)
              ? {
                  ...product,
                  ...response,
                  id: product.id,
                  thumbnail: normalizedImage,
                  images: response?.images?.length ? response.images : [normalizedImage].filter(Boolean),
                }
              : product
          )
        );
      } else {
        const response = await addProduct(payload);
        const createdImage = response?.thumbnail || response?.images?.[0] || productImage;
        const createdProduct = {
          ...response,
          id: response.id ?? Date.now(),
          title: response.title ?? payload.title,
          description: response.description ?? payload.description,
          price: response.price ?? payload.price,
          category: response.category ?? payload.category,
          stock: response.stock ?? payload.stock,
          rating: response.rating ?? payload.rating,
          thumbnail: createdImage,
          images: response?.images?.length ? response.images : createdImage ? [createdImage] : [],
        };

        setProducts((previous) => [createdProduct, ...previous]);
        setTotal((previous) => previous + 1);
      }

      closeForm();
    } catch (exception) {
      setFormError(
        exception?.response?.data?.message || "The product could not be saved. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (product) => {
    if (!window.confirm(`Delete ${product.title}?`)) {
      return;
    }

    try {
      await deleteProduct(product.id);
      setProducts((previous) => previous.filter((item) => item.id !== product.id));
      setTotal((previous) => Math.max(0, previous - 1));

      if (searchParams.get("edit") === String(product.id)) {
        updateQuery({ edit: "" });
      }
    } catch {
      setError("The product could not be deleted. Please retry.");
    }
  };

  const openEditFromUrl = useMemo(() => searchParams.get("edit") ?? "", [searchParams]);

  useEffect(() => {
    if (!openEditFromUrl) {
      return;
    }

    const timeoutId = setTimeout(() => {
      const target = products.find((product) => String(product.id) === openEditFromUrl);
      if (target) {
        openEditModal(target);
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [openEditFromUrl, products]);

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60 sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Dashboard</p>
              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Products</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={openAddModal}
                className="rounded-xl bg-sky-600 px-4 py-2.5 font-medium text-white transition hover:bg-sky-500"
              >
                + Add product
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex-1">
              <label htmlFor="search" className="mb-2 block text-sm font-medium text-slate-700">
                Search products
              </label>
              <input
                id="search"
                type="search"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search by title..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              />
            </div>

            <div className="min-w-[180px]">
              <label htmlFor="category" className="mb-2 block text-sm font-medium text-slate-700">
                Category
              </label>
              <select
                id="category"
                value={categoryFilter}
                onChange={handleCategoryChange}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-[180px]">
              <label htmlFor="sort" className="mb-2 block text-sm font-medium text-slate-700">
                Sort by
              </label>
              <select
                id="sort"
                value={sortValue}
                onChange={handleSortChange}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              >
                <option value="">Default</option>
                <option value="title-asc">Title A–Z</option>
                <option value="title-desc">Title Z–A</option>
                <option value="price-asc">Price low–high</option>
                <option value="price-desc">Price high–low</option>
                <option value="rating-asc">Rating low–high</option>
                <option value="rating-desc">Rating high–low</option>
              </select>
            </div>
          </div>

          {hasConflict ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              The search query takes priority because DummyJSON cannot search and filter by category in the same request.
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-slate-600">
              {total > 0 ? `Showing ${pageStart}–${pageEnd} of ${total}` : "Showing 0 of 0"}
            </div>

            <div className="flex items-center gap-3">
              <label htmlFor="page-size" className="text-sm font-medium text-slate-700">
                Rows
              </label>
              <select
                id="page-size"
                value={pageSize}
                onChange={handlePageSizeChange}
                className="rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-2 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-slate-600">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600" />
                Loading products...
              </div>
            </div>
          ) : error ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-700">
              <p className="text-lg font-semibold">Something went wrong</p>
              <p>{error}</p>
              <button
                type="button"
                onClick={fetchProducts}
                className="rounded-xl bg-rose-600 px-4 py-2.5 font-medium text-white transition hover:bg-rose-500"
              >
                Retry
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-600">
              <p className="text-xl font-semibold text-slate-800">No products found</p>
              <p className="mt-2 max-w-md">Try a different search, choose another category, or add a new item.</p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-2xl border border-slate-200 lg:block">
                <table className="min-w-full divide-y divide-slate-200 text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-sm font-semibold text-slate-700">Product</th>
                      <th className="px-4 py-3 text-sm font-semibold text-slate-700">Category</th>
                      <th className="px-4 py-3 text-sm font-semibold text-slate-700">Price</th>
                      <th className="px-4 py-3 text-sm font-semibold text-slate-700">Rating</th>
                      <th className="px-4 py-3 text-sm font-semibold text-slate-700">Stock</th>
                      <th className="px-4 py-3 text-sm font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {products.map((product) => (
                      <tr key={product.id} className="hover:bg-slate-50">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                              <Image
                                src={getSafeImageSource(product.thumbnail || product.images?.[0])}
                                alt={product.title}
                                fill
                                className="object-cover"
                                sizes="48px"
                              />
                            </div>
                            <Link href={`/products/${product.id}`} className="font-medium text-slate-900 hover:text-sky-600">
                              {product.title}
                            </Link>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-slate-600">{product.category}</td>
                        <td className="px-4 py-4 font-medium text-slate-900">{formatIndianPrice(product.price)}</td>
                        <td className="px-4 py-4 text-slate-600">{Number(product.rating ?? 0).toFixed(1)}</td>
                        <td className="px-4 py-4 text-slate-600">{product.stock}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(product)}
                              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(product)}
                              className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-100"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:hidden">
                {products.map((product) => (
                  <div key={product.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <Image
                          src={getSafeImageSource(product.thumbnail || product.images?.[0])}
                          alt={product.title}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link href={`/products/${product.id}`} className="block font-semibold text-slate-900 hover:text-sky-600">
                          {product.title}
                        </Link>
                        <p className="mt-1 text-sm text-slate-500">{product.category}</p>
                        <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
                          <span>{formatIndianPrice(product.price)}</span>
                          <span>⭐ {Number(product.rating ?? 0).toFixed(1)}</span>
                          <span>Stock: {product.stock}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(product)}
                        className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(product)}
                        className="flex-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {!loading && !error && products.length > 0 ? (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => updateQuery({ page: Math.max(1, currentPage - 1) })}
                disabled={currentPage <= 1}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              {pageNumbers.map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => updateQuery({ page: page })}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    page === currentPage
                      ? "bg-sky-600 text-white"
                      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                onClick={() => updateQuery({ page: Math.min(totalPages, currentPage + 1) })}
                disabled={currentPage >= totalPages}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          ) : null}
        </section>
      </div>

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-2xl font-bold text-slate-900">
                {formMode === "edit" ? "Edit product" : "Add product"}
              </h2>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="title" className="mb-2 block text-sm font-medium text-slate-700">
                    Title
                  </label>
                  <input
                    id="title"
                    name="title"
                    value={formValues.title}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="description" className="mb-2 block text-sm font-medium text-slate-700">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formValues.description}
                    onChange={handleFormChange}
                    rows={4}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  />
                </div>

                <div>
                  <label htmlFor="price" className="mb-2 block text-sm font-medium text-slate-700">
                    Price
                  </label>
                  <input
                    id="price"
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formValues.price}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  />
                </div>

                <div>
                  <label htmlFor="category" className="mb-2 block text-sm font-medium text-slate-700">
                    Category
                  </label>
                  <input
                    id="category"
                    name="category"
                    value={formValues.category}
                    onChange={handleFormChange}
                    list="category-options"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  />
                  <datalist id="category-options">
                    {categories.map((category) => (
                      <option key={category} value={category} />
                    ))}
                  </datalist>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="product-image" className="mb-2 block text-sm font-medium text-slate-700">
                    Product image
                  </label>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <input
                      id="product-image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
                    />
                    <input
                      id="image-url"
                      name="image"
                      type="url"
                      value={formValues.image}
                      onChange={handleFormChange}
                      placeholder="https://example.com/image.jpg"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="stock" className="mb-2 block text-sm font-medium text-slate-700">
                    Stock
                  </label>
                  <input
                    id="stock"
                    name="stock"
                    type="number"
                    min="0"
                    value={formValues.stock}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  />
                </div>

                <div>
                  <label htmlFor="rating" className="mb-2 block text-sm font-medium text-slate-700">
                    Rating
                  </label>
                  <input
                    id="rating"
                    name="rating"
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={formValues.rating}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  />
                </div>
              </div>

              {formError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {formError}
                </div>
              ) : null}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-sky-600 px-4 py-2.5 font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-sky-300"
                >
                  {isSaving ? "Saving..." : formMode === "edit" ? "Save changes" : "Create product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
