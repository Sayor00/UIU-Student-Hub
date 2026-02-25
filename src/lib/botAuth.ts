import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

/**
 * Server-side check: user must be logged in AND have either
 * admin role or bot_access permission.
 * Returns the session if authorized, null otherwise.
 */
export async function requireBotAccess() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;

    const role = (session.user as any).role;
    if (role === "admin") return session;

    // Check permissions from DB (don't trust token alone)
    try {
        await dbConnect();
        const user = await User.findById((session.user as any).id)
            .select("permissions")
            .lean();
        if (user && (user as any).permissions?.includes("bot_access")) {
            return session;
        }
    } catch {
        // DB error — deny access
    }

    return null;
}
