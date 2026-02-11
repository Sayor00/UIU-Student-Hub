import dbConnect from "@/lib/mongodb";
import Settings, { DEFAULT_EMAIL_DOMAINS } from "@/models/Settings";

/**
 * Get allowed email domains from database, or use defaults
 */
export async function getAllowedEmailDomains(): Promise<string[]> {
  try {
    await dbConnect();
    const setting = await Settings.findOne({ key: "allowed_email_domains" });
    if (setting && Array.isArray(setting.value) && setting.value.length > 0) {
      return setting.value;
    }
    return DEFAULT_EMAIL_DOMAINS;
  } catch {
    return DEFAULT_EMAIL_DOMAINS;
  }
}

/**
 * Validate that an email belongs to an allowed UIU domain
 */
export async function validateEmailDomain(email: string): Promise<boolean> {
  const domains = await getAllowedEmailDomains();
  const emailDomain = email.split("@")[1]?.toLowerCase();
  if (!emailDomain) return false;
  return domains.some((d) => d.toLowerCase() === emailDomain);
}

/**
 * Validate student ID is numeric only
 */
export function validateStudentId(studentId: string): boolean {
  return /^\d+$/.test(studentId);
}
