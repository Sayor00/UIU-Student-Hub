export default function ToolsLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl animate-pulse">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="flex justify-center mb-4">
          <div className="h-14 w-14 rounded-2xl bg-muted" />
        </div>
        <div className="h-9 w-32 rounded-md bg-muted mx-auto mb-2" />
        <div className="h-4 w-72 rounded bg-muted mx-auto" />
      </div>

      {/* Search */}
      <div className="max-w-md mx-auto mb-8">
        <div className="h-10 w-full rounded-md bg-muted" />
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border p-5">
            <div className="flex items-start gap-4">
              <div className="h-11 w-11 rounded-xl bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-36 rounded bg-muted" />
                <div className="h-4 w-full rounded bg-muted" />
                <div className="h-4 w-3/4 rounded bg-muted" />
                <div className="flex gap-1.5 pt-1">
                  <div className="h-4 w-14 rounded-full bg-muted" />
                  <div className="h-4 w-12 rounded-full bg-muted" />
                  <div className="h-4 w-16 rounded-full bg-muted" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
