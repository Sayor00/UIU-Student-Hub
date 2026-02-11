export default function CGPACalculatorLoading() {
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

      <div className="space-y-6">
        {/* Grading table skeleton */}
        <div className="rounded-xl border border-dashed p-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-muted" />
            <div className="h-4 w-36 rounded bg-muted" />
          </div>
        </div>

        {/* Previous info card skeleton */}
        <div className="rounded-xl border p-6 space-y-4">
          <div className="space-y-2">
            <div className="h-5 w-48 rounded bg-muted" />
            <div className="h-4 w-72 rounded bg-muted" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-10 w-full rounded-md bg-muted" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-28 rounded bg-muted" />
              <div className="h-10 w-full rounded-md bg-muted" />
            </div>
          </div>
        </div>

        {/* Trimester section header skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-muted" />
            <div className="h-5 w-24 rounded bg-muted" />
          </div>
          <div className="h-9 w-32 rounded-md bg-muted" />
        </div>

        {/* Trimester card skeleton */}
        <div className="rounded-xl border-2 overflow-hidden">
          <div className="bg-muted/20 px-4 py-3 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-muted" />
            <div className="h-5 w-48 rounded bg-muted" />
          </div>
          <div className="p-4 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <div className="col-span-12 sm:col-span-4">
                  <div className="h-3 w-20 rounded bg-muted mb-1.5" />
                  <div className="h-9 w-full rounded-md bg-muted" />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <div className="h-3 w-14 rounded bg-muted mb-1.5" />
                  <div className="h-9 w-full rounded-md bg-muted" />
                </div>
                <div className="col-span-4 sm:col-span-3">
                  <div className="h-3 w-12 rounded bg-muted mb-1.5" />
                  <div className="h-9 w-full rounded-md bg-muted" />
                </div>
                <div className="col-span-4 sm:col-span-3 flex items-end gap-1">
                  <div className="h-9 flex-1 rounded-md bg-muted" />
                  <div className="h-9 w-9 rounded-md bg-muted" />
                </div>
              </div>
            ))}
            <div className="border-t pt-3 flex gap-2">
              <div className="h-8 w-28 rounded-md bg-muted" />
              <div className="h-8 w-40 rounded-md bg-muted" />
            </div>
          </div>
        </div>

        {/* Action buttons skeleton */}
        <div className="flex flex-wrap gap-3">
          <div className="h-11 w-44 rounded-md bg-muted" />
          <div className="h-11 w-24 rounded-md bg-muted" />
        </div>
      </div>
    </div>
  );
}
