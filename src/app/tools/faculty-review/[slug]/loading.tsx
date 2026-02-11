export default function FacultyDetailLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl animate-pulse">
      {/* Back button */}
      <div className="h-9 w-48 rounded-md bg-muted mb-6" />

      {/* Faculty Profile Card */}
      <div className="rounded-xl border p-6 mb-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="h-16 w-16 rounded-2xl bg-muted shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-64 rounded bg-muted" />
            <div className="flex gap-2">
              <div className="h-5 w-12 rounded-full bg-muted" />
              <div className="h-5 w-20 rounded-full bg-muted" />
              <div className="h-5 w-28 rounded-full bg-muted" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="h-14 w-14 rounded-full bg-muted" />
            <div className="h-3 w-16 rounded bg-muted" />
          </div>
        </div>

        {/* Bio skeleton */}
        <div className="h-4 w-full rounded bg-muted mb-2" />
        <div className="h-4 w-3/4 rounded bg-muted mb-4" />

        {/* Rating bars */}
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-20 rounded bg-muted" />
              <div className="h-2 w-full rounded-full bg-muted" />
            </div>
          ))}
        </div>
      </div>

      {/* Reviews section */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 w-32 rounded bg-muted" />
        <div className="h-10 w-36 rounded-md bg-muted" />
      </div>

      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-xl border p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-8 w-8 rounded-full bg-muted" />
              <div className="space-y-1 flex-1">
                <div className="h-4 w-32 rounded bg-muted" />
                <div className="h-3 w-24 rounded bg-muted" />
              </div>
              <div className="h-5 w-16 rounded-full bg-muted" />
            </div>
            <div className="h-4 w-full rounded bg-muted mb-2" />
            <div className="h-4 w-5/6 rounded bg-muted mb-2" />
            <div className="h-4 w-2/3 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
