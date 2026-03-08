"use client";

export default function ChatLoading() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="animate-pulse flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-muted" />
                    <div className="space-y-2">
                        <div className="h-6 w-40 rounded bg-muted" />
                        <div className="h-4 w-56 rounded bg-muted" />
                    </div>
                </div>
            </div>
            <div className="flex gap-4 h-[calc(100vh-12rem)]">
                <div className="w-80 shrink-0 hidden md:block space-y-3">
                    <div className="h-10 rounded-lg bg-muted" />
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                            <div className="h-10 w-10 rounded-full bg-muted shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-3/4 rounded bg-muted" />
                                <div className="h-3 w-1/2 rounded bg-muted" />
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex-1 rounded-xl border bg-card p-4 flex flex-col">
                    <div className="flex items-center gap-3 pb-4 border-b">
                        <div className="h-10 w-10 rounded-full bg-muted" />
                        <div className="space-y-2">
                            <div className="h-4 w-32 rounded bg-muted" />
                            <div className="h-3 w-20 rounded bg-muted" />
                        </div>
                    </div>
                    <div className="flex-1" />
                    <div className="h-12 rounded-lg bg-muted mt-4" />
                </div>
            </div>
        </div>
    );
}
