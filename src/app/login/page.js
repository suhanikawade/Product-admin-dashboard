"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser } from "@/api/auth";
import { getToken, setToken } from "@/lib/auth";

const initialValues = {
  username: "",
  password: "",
};

export default function LoginPage() {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (getToken()) {
      router.replace("/");
    }
  }, [router]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: "" }));
    setSubmitError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const username = values.username.trim();
    const password = values.password.trim();

    const nextErrors = {};
    if (!username) {
      nextErrors.username = "Username is required.";
    }
    if (!password) {
      nextErrors.password = "Password is required.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const user = await loginUser(username, password);
      const token = user.token || user.accessToken;

      if (!token) {
        throw new Error("Missing auth token");
      }

      setToken(token);
      router.replace("/");
    } catch (error) {
      setSubmitError(
        error?.response?.data?.message ||
          "The username or password is incorrect. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/60">
        <div className="mb-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
            Product Admin
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Log in</h1>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="username" className="mb-2 block text-sm font-medium text-slate-700">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              value={values.username}
              onChange={handleChange}
              placeholder="emilys"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              aria-invalid={Boolean(errors.username)}
            />
            {errors.username ? (
              <p className="mt-1 text-sm text-rose-600">{errors.username}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={values.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              aria-invalid={Boolean(errors.password)}
            />
            {errors.password ? (
              <p className="mt-1 text-sm text-rose-600">{errors.password}</p>
            ) : null}
          </div>

          {submitError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {submitError}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center rounded-xl bg-sky-600 px-4 py-3 font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-sky-300"
          >
            {isSubmitting ? "Signing in..." : "Login"}
          </button>
        </form>

        <div className="mt-6 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600">
          Demo credentials: <span className="font-semibold">emilys</span> / <span className="font-semibold">emilyspass</span>
        </div>
      </div>
    </main>
  );
}
