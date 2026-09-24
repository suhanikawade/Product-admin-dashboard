"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { deleteProduct, getProduct } from "@/api/products";
import { isAuthenticated } from "@/lib/auth";

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

export default function ProductDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id;

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }

    async function fetchProduct() {
      try {
        setLoading(true);
        setError("");
        const result = await getProduct(productId);
        setProduct(result);
      } catch (exception) {
        if (exception?.response?.status === 404) {
          setError("not-found");
        } else {
          setError("error");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [productId, router]);

  const formatIndianPrice = (value) => {
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
  };

  const handleDelete = async () => {
    if (!product || !window.confirm(`Delete ${product.title}?`)) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteProduct(product.id);
      router.push("/");
    } catch {
      setError("error");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isAuthenticated()) {
    return null;
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-slate-600 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600" />
            Loading product...
          </div>
        </div>
      </main>
    );
  }

  if (error === "not-found") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg shadow-slate-200/60">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Product</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">Not found</h1>
          <p className="mt-3 text-slate-600">The product you tried to open no longer exists or the ID is invalid.</p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-xl bg-sky-600 px-4 py-2.5 font-medium text-white transition hover:bg-sky-500"
          >
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  if (error === "error" || !product) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-700 shadow-sm">
          <p className="text-lg font-semibold">Something went wrong</p>
          <p className="mt-2">We couldn’t load this product.</p>
          <Link href="/" className="mt-4 inline-flex rounded-xl bg-rose-600 px-4 py-2.5 font-medium text-white hover:bg-rose-500">
            Go back
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-3 py-2 font-medium text-slate-700 hover:bg-slate-50">
            ← Back to products
          </Link>

          <div className="flex gap-3">
            <Link
              href={`/?edit=${product.id}`}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
            >
              Edit product
            </Link>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 font-medium text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>

        <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-200/60">
          <div className="grid gap-8 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
            <div>
              <div className="grid gap-4 sm:grid-cols-2">
                {product.images?.length ? (
                  product.images.map((image, index) => (
                    <div key={`${product.id}-${index}`} className="relative h-72 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                      <Image src={getSafeImageSource(image)} alt={`${product.title} ${index + 1}`} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
                    </div>
                  ))
                ) : (
                  <div className="relative h-72 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 sm:col-span-2">
                    <Image src={getSafeImageSource(product.thumbnail || "/placeholder.png")} alt={product.title} fill className="object-cover" sizes="100vw" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">{product.category}</p>
              <h1 className="mt-3 text-3xl font-bold text-slate-900">{product.title}</h1>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-slate-600">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium">⭐ {Number(product.rating ?? 0).toFixed(1)}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium">Stock: {product.stock}</span>
              </div>
              <p className="mt-5 text-3xl font-bold text-slate-900">{formatIndianPrice(product.price)}</p>
              <p className="mt-5 text-base leading-7 text-slate-600">{product.description}</p>

              {Array.isArray(product.reviews) && product.reviews.length > 0 ? (
                <div className="mt-8">
                  <h2 className="text-xl font-bold text-slate-900">Reviews</h2>
                  <div className="mt-4 space-y-4">
                    {product.reviews.map((review) => (
                      <div key={`${product.id}-${review.date || review.reviewerName}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-slate-900">{review.reviewerName}</p>
                          <span className="text-sm text-slate-500">{review.rating}/5</span>
                        </div>
                        <p className="mt-2 text-slate-600">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}
