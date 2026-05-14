import { Skeleton } from "@/components/ui/skeleton";

export function DateCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-5 w-2/3 rounded-md" />
          <Skeleton className="h-3 w-16 rounded-full" />
        </div>
        <Skeleton className="h-3 w-full rounded-md" />
        <Skeleton className="h-3 w-1/2 rounded-md" />
      </div>
    </div>
  );
}
