import { cn } from '@/lib/utils';

/**
 * Skeleton primitives.
 *
 * Rule for the whole app: never render a blank region. Every async surface has
 * a skeleton whose shape matches the real content, so the layout does not jump
 * when data arrives.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn('skeleton-shimmer rounded-lg bg-white/[0.05]', className)}
      {...props}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#10141A] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-3">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="size-11 rounded-xl" />
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#10141A]">
          <Skeleton className="h-32 w-full rounded-none" />
          <div className="space-y-3 p-5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-9 w-full rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[#10141A] p-4"
        >
          <Skeleton className="size-10 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-7 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div
      className="flex items-end gap-2 rounded-2xl border border-white/[0.07] bg-[#10141A] p-5"
      style={{ height }}
    >
      {[40, 65, 35, 80, 55, 70, 45, 90, 60, 50, 75, 38].map((h, index) => (
        <Skeleton key={index} className="flex-1 rounded-md" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <StatCardSkeleton key={index} />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartSkeleton />
        </div>
        <ChartSkeleton height={280} />
      </div>
      <ListSkeleton rows={5} />
    </div>
  );
}