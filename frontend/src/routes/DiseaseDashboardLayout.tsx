import { Outlet, useOutletContext } from "react-router-dom";
import { PageSkeleton } from "@/components/disease/ui/Skeleton";
import { useDashboardData } from "@/context/disease/AppProviders";
import type { DashboardBundle } from "@/data/disease/types";

export function DashboardLayout() {
  const { state } = useDashboardData();

  if (state.status === "loading") {
    return <PageSkeleton />;
  }

  if (state.status === "error") {
    return (
      <div className="surface-panel p-8 text-center">
        <p className="text-lg font-semibold text-[var(--danger)]">Could not load dashboard data</p>
        <p className="mt-2 text-sm text-[var(--text-tertiary)]">{state.message}</p>
      </div>
    );
  }

  return <Outlet context={state.data} />;
}

export function useDashboardBundle(): DashboardBundle {
  return useOutletContext<DashboardBundle>();
}
