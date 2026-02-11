import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

/**
 * Check if the current user is an admin.
 * Returns the session if admin, null otherwise.
 */
export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "admin") {
    return null;
  }
  return session;
}

/**
 * Ensure at least one admin exists. If no admin, makes the first user admin.
 * Call this during seeding or first startup.
 */
export async function ensureAdmin() {
  await dbConnect();
  const adminCount = await User.countDocuments({ role: "admin" });
  if (adminCount === 0) {
    // Make the first user admin
    const firstUser = await User.findOne().sort({ createdAt: 1 });
    if (firstUser) {
      firstUser.role = "admin";
      await firstUser.save();
      console.log(`Made ${firstUser.email} the first admin.`);
    }
  }
}
