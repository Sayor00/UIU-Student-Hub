"use client";

export default function CodeRunnerLoading() {
    return (
        <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-7xl animate-pulse">
            {/* Page Header skeleton */}
            <div className="flex items-center gap-3 mb-6 sm:mb-8">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-muted" />
                <div className="space-y-2">
                    <div className="h-7 w-32 sm:w-40 rounded-lg bg-muted" />
                    <div className="h-4 w-56 sm:w-72 rounded bg-muted" />
                </div>
                <div className="flex-1" />
                <div className="hidden sm:flex gap-2">
                    <div className="h-9 w-[140px] rounded-md bg-muted" />
                    <div className="h-9 w-[180px] rounded-md bg-muted" />
                    <div className="h-9 w-16 rounded-md bg-muted" />
                </div>
            </div>

            {/* Three-panel skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left: Editor */}
                <div className="rounded-xl border bg-card/60 overflow-hidden">
                    <div className="h-[38px] bg-muted/20 border-b" />
                    <div className="p-3 space-y-2">
                        {Array.from({ length: 16 }).map((_, i) => (
                            <div key={i} className="h-[18px] rounded bg-muted/40"
                                style={{ width: `${35 + Math.sin(i * 0.7) * 30 + 20}%` }} />
                        ))}
                    </div>
                    <div className="h-7 border-t bg-muted/20" />
                </div>

                {/* Center: Controls */}
                <div className="space-y-4">
                    <div className="rounded-xl border bg-card/60 p-4 space-y-3">
                        <div className="h-5 w-40 rounded bg-muted" />
                        <div className="h-8 w-full rounded bg-muted" />
                    </div>
                    <div className="rounded-xl border bg-card/60 p-4 space-y-3">
                        <div className="h-5 w-24 rounded bg-muted" />
                        <div className="space-y-1.5">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-5 w-full rounded bg-muted/40" />
                            ))}
                        </div>
                    </div>
                    <div className="rounded-xl border bg-card/60 p-4 space-y-3">
                        <div className="h-5 w-24 rounded bg-muted" />
                        <div className="h-20 rounded bg-muted/40" />
                    </div>
                </div>

                {/* Right: Visualizations */}
                <div className="space-y-4">
                    <div className="rounded-xl border bg-card/60 p-4">
                        <div className="h-5 w-32 rounded bg-muted mb-3" />
                        <div className="h-[200px] rounded bg-muted/30" />
                    </div>
                    <div className="rounded-xl border bg-card/60 p-4">
                        <div className="h-5 w-40 rounded bg-muted mb-3" />
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="h-16 rounded-lg bg-muted/30" />
                            <div className="h-16 rounded-lg bg-muted/30" />
                        </div>
                        <div className="h-[120px] rounded bg-muted/30" />
                    </div>
                </div>
            </div>
        </div>
    );
}
