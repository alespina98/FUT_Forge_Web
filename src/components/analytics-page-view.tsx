"use client";
import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { attachAnalyticsLifecycleListeners, track } from "@/lib/analytics/client";

function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => {
    attachAnalyticsLifecycleListeners();
    track("page_view", { path: pathname, query: searchParams.toString() || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- track by the string value, not the URLSearchParams identity
  }, [pathname, searchParams.toString()]);
  return null;
}

export function AnalyticsPageView() {
  return (
    <Suspense fallback={null}>
      <PageViewTracker />
    </Suspense>
  );
}
