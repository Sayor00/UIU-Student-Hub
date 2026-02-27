export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <p className="mt-4 text-lg text-muted-foreground">Loading Section Planner...</p>
    </div>
  );
}
