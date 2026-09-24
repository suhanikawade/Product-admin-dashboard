import { Suspense } from "react";
import ProductDashboard from "@/components/ProductDashboard";

export default function HomePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-600">Loading dashboard...</div>}>
      <ProductDashboard />
    </Suspense>
  );
}
