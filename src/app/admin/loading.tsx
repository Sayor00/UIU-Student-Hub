import { Loader2 } from "lucide-react";

export default function AdminLoading() {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
