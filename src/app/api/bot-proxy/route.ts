import { NextResponse } from "next/server";
import { requireBotAccess } from "@/lib/botAuth";

export const maxDuration = 10; // Each individual proxy call is fast

/**
 * Thin CORS proxy for the client-side bot.
 * Accepts a target URL + method + headers + body, forwards the request server-side,
 * and returns the response. Each call handles ONE HTTP request (<2s).
 */
export async function POST(req: Request) {
    const botSession = await requireBotAccess();
    if (!botSession) {
        return NextResponse.json(
            { success: false, message: "Unauthorized: bot access required" },
            { status: 403 }
        );
    }

    try {
        const { url, method = "GET", headers = {}, body } = await req.json();

        if (!url || typeof url !== "string") {
            return NextResponse.json({ success: false, message: "Missing 'url'" }, { status: 400 });
        }

        // Only allow proxying to known safe domains
        const allowed = [
            "cloud-v3.edusoft-ltd.workers.dev",
            "execute-api.ap-southeast-1.amazonaws.com",
            "execute-api.ap-south-1.amazonaws.com",
            "execute-api.us-east-1.amazonaws.com",
        ];
        const parsed = new URL(url);
        if (!allowed.some(d => parsed.hostname.includes(d))) {
            return NextResponse.json({ success: false, message: "Domain not allowed" }, { status: 403 });
        }

        const fetchOptions: RequestInit = {
            method,
            headers: {
                "Content-Type": "application/json",
                ...headers,
            },
        };

        if (body && method !== "GET") {
            fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
        }

        const res = await fetch(url, fetchOptions);
        const contentType = res.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            const data = await res.json();
            return NextResponse.json({ success: true, status: res.status, data });
        } else {
            // Return text (for HTML/JS bundle scraping)
            const text = await res.text();
            return NextResponse.json({ success: true, status: res.status, text });
        }
    } catch (error: any) {
        return NextResponse.json(
            { success: false, message: error.message || "Proxy error" },
            { status: 500 }
        );
    }
}
