export default function FeeCalculatorLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 mb-8">
        <div className="h-12 w-12 rounded-xl bg-muted" />
        <div className="space-y-2">
          <div className="h-7 w-52 rounded-md bg-muted" />
          <div className="h-4 w-80 rounded-md bg-muted" />
        </div>
      </div>

      {/* Fee policy info skeleton */}
      <div className="rounded-xl border border-dashed p-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-muted" />
          <div className="h-4 w-56 rounded bg-muted" />
        </div>
      </div>

      {/* Tab navigation skeleton */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 w-28 rounded-md bg-muted" />
        ))}
      </div>

      {/* Card skeleton */}
      <div className="rounded-xl border p-6 space-y-5">
        <div className="space-y-2">
          <div className="h-5 w-32 rounded bg-muted" />
          <div className="h-4 w-72 rounded bg-muted" />
        </div>

        {/* Form fields skeleton */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="h-4 w-20 rounded bg-muted" />
            <div className="h-10 w-full rounded-md bg-muted" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-28 rounded bg-muted" />
            <div className="h-10 w-full rounded-md bg-muted" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-36 rounded bg-muted" />
            <div className="h-10 w-full rounded-md bg-muted" />
          </div>
        </div>

        {/* Button skeleton */}
        <div className="flex gap-2 pt-2">
          <div className="h-10 flex-1 rounded-md bg-muted" />
          <div className="h-10 w-10 rounded-md bg-muted" />
        </div>
      </div>

      {/* Disclaimer skeleton */}
      <div className="mt-8 rounded-lg border border-dashed bg-muted/50 p-4">
        <div className="flex gap-2">
          <div className="h-4 w-4 rounded bg-muted shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-3 w-full rounded bg-muted" />
            <div className="h-3 w-3/4 rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
