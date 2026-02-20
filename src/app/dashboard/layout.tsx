import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Lock, LogIn } from "lucide-react";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center space-y-8 animate-in fade-in duration-500">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                    <div className="bg-background/80 backdrop-blur-xl border border-border p-8 rounded-full shadow-2xl relative">
                        <Lock className="h-16 w-16 text-primary" />
                    </div>
                </div>

                <div className="space-y-4 max-w-md">
                    <h1 className="text-4xl font-black tracking-tight">Access Restricted</h1>
                    <p className="text-muted-foreground text-lg">
                        You need to be logged in to access the Student Dashboard and academic tools.
                    </p>
                </div>

                <div className="flex gap-4">
                    <Button asChild size="lg" className="text-lg font-bold px-8 h-14 shadow-lg shadow-primary/20">
                        <Link href="/api/auth/signin?callbackUrl=/dashboard">
                            <LogIn className="mr-2 h-5 w-5" />
                            Sign In to Continue
                        </Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="text-lg font-bold px-8 h-14">
                        <Link href="/">
                            Go Home
                        </Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative">
            {children}
        </div>
    );
}
