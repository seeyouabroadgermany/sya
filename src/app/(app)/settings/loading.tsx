import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="space-y-2">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="mb-4 h-4 w-80" />
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-[12px]" />
      ))}
    </div>
  );
}
