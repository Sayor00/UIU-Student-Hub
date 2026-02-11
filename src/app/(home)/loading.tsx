export default function HomeLoading() {
  return (
    <div className="animate-pulse">
      {/* Hero skeleton */}
      <section className="container mx-auto px-4 py-20 sm:py-32">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="mx-auto h-8 w-56 rounded-full bg-muted" />
          <div className="space-y-3">
            <div className="mx-auto h-12 w-96 max-w-full rounded-lg bg-muted" />
            <div className="mx-auto h-12 w-72 max-w-full rounded-lg bg-muted" />
          </div>
          <div className="mx-auto h-5 w-[500px] max-w-full rounded bg-muted" />
          <div className="mx-auto h-5 w-80 max-w-full rounded bg-muted" />
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <div className="h-11 w-56 rounded-md bg-muted mx-auto sm:mx-0" />
            <div className="h-11 w-48 rounded-md bg-muted mx-auto sm:mx-0" />
          </div>
        </div>
      </section>

      {/* Tools section skeleton */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12 space-y-3">
          <div className="mx-auto h-8 w-48 rounded-lg bg-muted" />
          <div className="mx-auto h-4 w-80 rounded bg-muted" />
        </div>
        <div className="max-w-2xl mx-auto">
          <div className="rounded-xl border-2 p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="h-14 w-14 rounded-xl bg-muted" />
              <div className="h-5 w-5 rounded bg-muted" />
            </div>
            <div className="h-6 w-40 rounded bg-muted mt-4" />
            <div className="space-y-2">
              <div className="h-4 w-full rounded bg-muted" />
              <div className="h-4 w-3/4 rounded bg-muted" />
            </div>
            <div className="flex gap-2 pt-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-7 w-36 rounded-full bg-muted" />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features skeleton */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12 space-y-3">
          <div className="mx-auto h-8 w-56 rounded-lg bg-muted" />
          <div className="mx-auto h-4 w-64 rounded bg-muted" />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border-2 p-6 text-center space-y-3">
              <div className="mx-auto h-12 w-12 rounded-lg bg-muted" />
              <div className="mx-auto h-5 w-28 rounded bg-muted" />
              <div className="space-y-1.5">
                <div className="mx-auto h-3 w-full rounded bg-muted" />
                <div className="mx-auto h-3 w-4/5 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
