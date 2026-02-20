import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Dashboard from "@/components/Dashboard";

export const metadata = {
    title: "Student Dashboard - UIU Student Hub",
    description: "Your unified view of trimesters, tools, career planning, and more.",
};

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        redirect("/api/auth/signin?callbackUrl=/dashboard");
    }

    return <Dashboard userName={session.user.name || "Student"} />;
}
