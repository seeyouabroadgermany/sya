import { Skeleton } from "@/components/ui/skeleton";

// Shown instantly while a page loads, so a click always gets an answer.

function Header() {
  return (
    <div className="px-4 pt-5 pb-4 md:px-6 md:pt-7 md:pb-5" aria-hidden>
      <Skeleton className="h-7 w-44 md:h-8" />
      <Skeleton className="mt-2 h-4 w-64" />
    </div>
  );
}

export function BoardSkeleton() {
  return (
    <div role="status" aria-label="Loading">
      <Header />
      <div className="flex gap-2 px-4 pb-4 md:px-6">
        <Skeleton className="h-10 w-full md:h-9 md:w-64" />
        <Skeleton className="hidden h-9 w-36 md:block" />
        <Skeleton className="hidden h-9 w-36 md:block" />
      </div>
      <div className="flex gap-3 overflow-hidden px-4 md:px-6">
        {Array.from({ length: 4 }).map((_, c) => (
          <div key={c} className="w-full shrink-0 space-y-2 rounded-[12px] bg-surface p-2 md:w-[284px]">
            <Skeleton className="m-1 h-5 w-40" />
            {Array.from({ length: 3 - (c % 2) }).map((_, i) => (
              <Skeleton key={i} className="h-[92px] w-full rounded-[12px]" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading">
      <Header />
      <div className="space-y-2 px-4 md:px-6">
        <Skeleton className="mb-4 h-10 w-full md:h-9 md:w-96" />
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-[12px]" />
        ))}
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="px-4 pt-4 md:px-6 md:pt-6">
      <Skeleton className="h-5 w-20" />
      <Skeleton className="mt-3 h-8 w-64" />
      <Skeleton className="mt-2 h-4 w-72" />
      <Skeleton className="mt-5 h-3 w-full max-w-xl" />
      <div className="mt-5 grid grid-cols-4 gap-2 sm:flex">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 sm:h-9 sm:w-28" />
        ))}
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_300px] lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-3">
          <Skeleton className="h-8 w-80" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-[12px]" />
          <Skeleton className="h-40 w-full rounded-[12px]" />
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading">
      <Header />
      <div className="space-y-4 px-4 md:px-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-[12px]" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
          <Skeleton className="h-72 rounded-[12px]" />
          <Skeleton className="h-72 rounded-[12px]" />
        </div>
      </div>
    </div>
  );
}
