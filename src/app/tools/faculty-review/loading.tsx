export default function FacultyReviewLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-muted" />
          <div className="space-y-2">
            <div className="h-7 w-48 rounded-md bg-muted" />
            <div className="h-4 w-72 rounded-md bg-muted" />
          </div>
        </div>
        <div className="h-10 w-32 rounded-md bg-muted" />
      </div>

      {/* Search & Filters skeleton */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="h-10 flex-1 rounded-md bg-muted" />
        <div className="flex gap-2">
          <div className="h-10 w-[160px] rounded-md bg-muted" />
          <div className="h-10 w-[120px] rounded-md bg-muted" />
          <div className="h-10 w-10 rounded-md bg-muted" />
        </div>
      </div>

      {/* Count skeleton */}
      <div className="h-4 w-32 rounded bg-muted mb-4" />

      {/* Faculty Grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="rounded-xl border p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-12 w-12 rounded-full bg-muted" />
              <div className="space-y-1.5 flex-1">
                <div className="h-4 w-3/4 rounded bg-muted" />
                <div className="h-3 w-1/2 rounded bg-muted" />
              </div>
            </div>
            <div className="h-3 w-full rounded bg-muted mb-2" />
            <div className="h-3 w-2/3 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
