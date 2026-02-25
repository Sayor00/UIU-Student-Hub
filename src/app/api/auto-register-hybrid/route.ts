import { NextResponse } from "next/server";
import { requireBotAccess } from "@/lib/botAuth";

// Allow up to 5 minutes for bot operations on Vercel Pro
export const maxDuration = 300;

// URL to the Chromium binary package hosted in /public
const CHROMIUM_PACK_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/chromium-pack.tar`
    : "https://github.com/gabenunez/puppeteer-on-vercel/raw/refs/heads/main/example/chromium-dont-use-in-prod.tar";

// Cache the Chromium executable path to avoid re-downloading
let cachedExecutablePath: string | null = null;
let downloadPromise: Promise<string> | null = null;

async function getChromiumPath(): Promise<string> {
    if (cachedExecutablePath) return cachedExecutablePath;
    if (!downloadPromise) {
        const chromium = (await import("@sparticuz/chromium-min")).default;
        downloadPromise = chromium
            .executablePath(CHROMIUM_PACK_URL)
            .then((path: string) => {
                cachedExecutablePath = path;
                return path;
            })
            .catch((error: any) => {
                downloadPromise = null;
                throw error;
            });
    }
    return downloadPromise;
}

/** Launch a Puppeteer browser — works both locally and on Vercel */
async function launchBrowser(headless: boolean = true) {
    const isVercel = !!process.env.VERCEL_ENV;
    if (isVercel) {
        const chromium = (await import("@sparticuz/chromium-min")).default;
        const puppeteer = await import("puppeteer-core");
        const executablePath = await getChromiumPath();
        return puppeteer.launch({
            headless: true, // Always headless on Vercel
            args: chromium.args,
            executablePath,
        });
    } else {
        const puppeteer = await import("puppeteer");
        return puppeteer.launch({
            headless: headless ? true : false,
            defaultViewport: null,
            args: ["--start-maximized"],
        });
    }
}

// =============================================================================
// STRUCTURE-AGNOSTIC JSON UTILITIES
// Deep-search any JSON response regardless of nesting. Survives ANY restructuring.
// =============================================================================

/** Recursively find an array of objects where at least one item matches the predicate */
function deepFindArray(obj: any, predicate: (item: any) => boolean, maxDepth = 8): any[] | null {
    if (maxDepth <= 0) return null;
    if (Array.isArray(obj)) {
        if (obj.length > 0 && obj.some(predicate)) return obj;
        for (const item of obj) {
            const found = deepFindArray(item, predicate, maxDepth - 1);
            if (found) return found;
        }
    }
    if (obj && typeof obj === "object") {
        for (const val of Object.values(obj)) {
            const found = deepFindArray(val as any, predicate, maxDepth - 1);
            if (found) return found;
        }
    }
    return null;
}

/** Recursively find a value by key name at any depth */
function deepFindValue(obj: any, keyName: string, maxDepth = 8): any {
    if (maxDepth <= 0 || !obj || typeof obj !== "object") return undefined;
    if (obj[keyName] !== undefined) return obj[keyName];
    for (const val of Object.values(obj)) {
        const found = deepFindValue(val, keyName, maxDepth - 1);
        if (found !== undefined) return found;
    }
    return undefined;
}

/** Extract JWT from any login response structure */
function extractJwt(data: any): string | null {
    // Common key names for JWT tokens
    for (const key of ["access_token", "token", "jwt", "accessToken", "auth_token"]) {
        const val = deepFindValue(data, key);
        if (typeof val === "string" && val.length > 20) return val;
    }
    return null;
}

/** Find courses array from any response structure */
function extractCourses(data: any): any[] {
    return deepFindArray(data, (item: any) =>
        typeof item === "object" && item !== null &&
        (item.course_code || item.courseCode || item.code)
    ) || [];
}

/** Find sections array from any response structure */
function extractSections(data: any): any[] {
    return deepFindArray(data, (item: any) =>
        typeof item === "object" && item !== null &&
        (item.section_name || item.sectionName || item.name || item.section)
    ) || [];
}

/** Get section name from a section object (handles any field name) */
function getSectionName(sec: any): string {
    return sec.section_name || sec.sectionName || sec.name || sec.section || "";
}

/** Get section ID from a section object (handles any field name) */
function getSectionId(sec: any): string | number | undefined {
    return sec.section_id || sec.sectionId || sec.id || sec._id;
}

/** Get course code from a course object (handles any field name) */
function getCourseCode(c: any): string | undefined {
    return c.course_code || c.courseCode || c.code;
}

/** Get formal/display code from a course object */
function getFormalCode(c: any): string | undefined {
    return c.formal_code || c.formalCode || c.display_code || c.displayCode;
}

// =============================================================================
// ZERO-HARDCODE DYNAMIC API DISCOVERY ENGINE
// Scrapes the UCAM frontend JS bundles to discover:
//   1. The API base URL (e.g. https://xxx.execute-api.xxx)
//   2. The API version (e.g. "v3", "v4")
//   3. ALL API route paths as string literals from the JS source code
// The bot then auto-categorizes them by purpose (login, courses, sections, etc.)
// If UCAM changes ANY endpoint, the bot adapts automatically.
// =============================================================================

interface DiscoveredApi {
    baseUrl: string;
    version: string;
    routes: {
        login: string | null;
        preAdvised: string | null;
        courses: string | null;
        userProfile: string | null;
        allPaths: string[];   // Every API-looking path found in JS
    };
}

async function discoverApiFromFrontend(): Promise<DiscoveredApi> {
    const frontendUrl = "https://cloud-v3.edusoft-ltd.workers.dev";
    const result: DiscoveredApi = {
        baseUrl: "",
        version: "",
        routes: { login: null, preAdvised: null, courses: null, userProfile: null, allPaths: [] },
    };

    try {
        const html = await (await fetch(frontendUrl)).text();
        const jsRegex = /(?:src|href)="([^"]+\.js[^"]*)"/g;
        let match;
        const scripts: string[] = [];
        while ((match = jsRegex.exec(html)) !== null) scripts.push(match[1]);

        const allApiPaths = new Set<string>();

        for (const scriptPath of scripts) {
            const url = scriptPath.startsWith("http")
                ? scriptPath
                : `${frontendUrl}${scriptPath.startsWith("/") ? "" : "/"}${scriptPath}`;
            const js = await (await fetch(url)).text();

            // ── HOST-AGNOSTIC BASE URL DISCOVERY ──
            // Strategy: Find any HTTPS URL in the JS that's paired with a versioned API path.
            // This works regardless of hosting (AWS, GCP, Azure, Cloudflare, self-hosted, etc.)
            if (!result.baseUrl || !result.version) {
                // 1. Try: full URL with version baked in, e.g. "https://xxx.com/v3/auth/login"
                const fullUrlMatch = js.match(/["'`](https:\/\/[^"'`\s]{5,80}?)\/(v\d+)\/(?:auth|users|courses|command)/);
                if (fullUrlMatch) {
                    result.baseUrl = result.baseUrl || fullUrlMatch[1];
                    result.version = result.version || fullUrlMatch[2];
                }

                // 2. Try: base URL and version as separate concatenated strings
                //    e.g. baseUrl = "https://xxx.com"  then later  baseUrl + "/v3/" + path
                if (!result.baseUrl) {
                    // Find any HTTPS URL that's NOT the frontend itself and NOT a CDN/static resource
                    const urlRegex = /["'`](https:\/\/[a-zA-Z0-9._-]+(?:\.[a-zA-Z]{2,})+(?:\/[^"'`\s]*)?)["'`]/g;
                    let urlMatch;
                    while ((urlMatch = urlRegex.exec(js)) !== null) {
                        const candidateUrl = urlMatch[1].replace(/\/+$/, "");
                        // Skip: frontend URL, CDN, static files, Google, common SaaS
                        if (candidateUrl.includes("edusoft-ltd") ||
                            candidateUrl.includes("googleapis") ||
                            candidateUrl.includes("cloudflare") ||
                            candidateUrl.includes("sentry") ||
                            candidateUrl.includes("cdn") ||
                            candidateUrl.endsWith(".js") ||
                            candidateUrl.endsWith(".css")) continue;

                        // Check if this URL has a versioned API path
                        const verInUrl = candidateUrl.match(/^(https:\/\/[^/]+)\/(v\d+)/);
                        if (verInUrl) {
                            result.baseUrl = verInUrl[1];
                            result.version = verInUrl[2];
                            break;
                        }
                        // Check if it looks like a standalone API base (has API-like hostname)
                        if (candidateUrl.match(/api|execute|gateway|backend|server/i)) {
                            result.baseUrl = candidateUrl.replace(/\/v\d+$/, "");
                            break;
                        }
                    }
                }

                // 3. Discover version separately if we found base URL but not version
                if (!result.version) {
                    const verMatch = js.match(/["'`/](v\d+)\/(?:auth|courses|users)/);
                    if (verMatch) result.version = verMatch[1];
                }
            }

            // Extract ALL path-like strings that start with "/" and contain API keywords
            const pathRegex = /["'](\/(?:auth|users|courses|command|management|student)[^"']{2,80})["']/g;
            let pathMatch;
            while ((pathMatch = pathRegex.exec(js)) !== null) {
                const p = pathMatch[1];
                // Filter out frontend routes (those containing "console/" or ".js")
                if (!p.includes("console/") && !p.includes(".js") && !p.includes(".css")) {
                    allApiPaths.add(p);
                }
            }
        }

        result.routes.allPaths = [...allApiPaths];

        // Auto-categorize discovered paths by purpose
        for (const path of result.routes.allPaths) {
            if (path.includes("auth/login") && !path.includes("logout")) {
                result.routes.login = path;
            }
            if (path.includes("preadvice") || path.includes("pre-advis")) {
                result.routes.preAdvised = path;
            }
            if (path === "/courses" || path.match(/^\/courses$/)) {
                result.routes.courses = path;
            }
            if (path.includes("users/me") && !path.includes("eligibility")) {
                result.routes.userProfile = path;
            }
        }

        // SMART DERIVATION: The pre-advised courses listing path isn't always a literal
        // in the JS bundles. It's often constructed at runtime by appending to /users/me.
        // If we found /users/me but NOT a specific preAdvised path, derive candidates.
        if (!result.routes.preAdvised && result.routes.userProfile) {
            // Look for any discovered fragment containing "preadvice" or "courses" 
            // and combine it with the user profile path
            const courseFragments = result.routes.allPaths.filter(p => p.includes("preadvice"));
            for (const frag of courseFragments) {
                // Extract just the last segment, e.g. "/users/preadvice-courses/sync" -> "preadvice-courses"
                const parts = frag.split("/").filter(Boolean);
                const keyword = parts.find(p => p.includes("preadvice"));
                if (keyword) {
                    // Derive: /users/me + /preadvice-courses
                    result.routes.preAdvised = `${result.routes.userProfile}/${keyword}`;
                    break;
                }
            }
        }
    } catch (e) { /* Discovery failed, will use Puppeteer interception as fallback */ }

    return result;
}

/**
 * Runtime path prober: Tests candidate pre-advised course paths against the live API.
 * Returns the first path that returns actual course data.
 */
async function probePreAdvisedPath(
    baseUrl: string, version: string, jwt: string,
    discoveredPaths: string[], log: (msg: string) => void
): Promise<{ path: string; courses: any[] } | null> {
    // Build candidate list from discovered paths + smart derivations
    const candidates = new Set<string>();

    // Add any discovered preadvice-related paths
    for (const p of discoveredPaths) {
        if (p.includes("preadvice") || p.includes("pre-advis")) {
            candidates.add(p);
        }
    }

    // Derive: /users/me/preadvice-courses (common pattern)
    const userMePath = discoveredPaths.find(p => p === "/users/me");
    if (userMePath) {
        const preadviceFrags = discoveredPaths.filter(p => p.includes("preadvice"));
        for (const frag of preadviceFrags) {
            const keyword = frag.split("/").filter(Boolean).find(s => s.includes("preadvice"));
            if (keyword) candidates.add(`${userMePath}/${keyword}`);
        }
        // Also try the plural form
        candidates.add(`${userMePath}/preadvice-courses`);
    }

    // All course-related paths as last resort
    for (const p of discoveredPaths) {
        if (p.includes("course") && !p.includes("command") && !p.includes("management")) {
            candidates.add(p);
        }
    }

    const apiUrl = (path: string) => `${baseUrl}/${version}${path}`;

    for (const path of candidates) {
        try {
            log(`[Native] 🔎 Probing: ${path}`);
            const res = await fetch(apiUrl(path), {
                headers: { Authorization: `Bearer ${jwt}`, Accept: "application/json" },
            });
            if (res.ok) {
                const data = await res.json();
                const courses = extractCourses(data);
                if (courses.length > 0 && getCourseCode(courses[0])) {
                    log(`[Native] ✅ Found ${courses.length} courses via ${path}`);
                    return { path, courses };
                }
            }
        } catch (_) { }
    }
    return null;
}

/**
 * Runtime sections path prober: Discovers the correct sections API endpoint
 * by trying derived path patterns with a known courseId.
 */
async function probeSectionsPath(
    baseUrl: string, version: string, jwt: string,
    courseId: string, discoveredPaths: string[], log: (msg: string) => void
): Promise<string | null> {
    const candidates = new Set<string>();

    // Derive candidates from discovered fragments
    // Look for paths containing "section" and "course"
    const sectionPaths = discoveredPaths.filter(p => p.includes("section"));
    const coursePaths = discoveredPaths.filter(p => p.includes("course") && !p.includes("command") && !p.includes("management"));

    // Build derived patterns by combining fragments
    for (const sp of sectionPaths) {
        // e.g. /student-sections/ + courseId
        const clean = sp.replace(/\/$/, "");
        candidates.add(`${clean}/${courseId}`);
    }
    for (const cp of coursePaths) {
        // e.g. /courses + /sections/ + courseId
        const clean = cp.replace(/\/$/, "");
        candidates.add(`${clean}/sections/${courseId}`);
    }
    // Also try: /courses/sections/{courseId} (common REST pattern from fragments)
    if (discoveredPaths.some(p => p.includes("course"))) {
        candidates.add(`/courses/sections/${courseId}`);
    }

    const url = (path: string) => `${baseUrl}/${version}${path}`;

    for (const path of candidates) {
        try {
            log(`[Native] 🔎 Probing sections: ${path}`);
            const res = await fetch(url(path), {
                headers: { Authorization: `Bearer ${jwt}`, Accept: "application/json" },
            });
            if (res.ok) {
                const data = await res.json();
                const sections = data?.data?.sections || data?.data;
                if (sections && (Array.isArray(sections) || data?.data?.course_code)) {
                    // Extract the path template (replace courseId with empty to get the prefix)
                    const template = path.replace(courseId, "");
                    log(`[Native] ✅ Sections path discovered: ${template}{courseId}`);
                    return template;
                }
            }
        } catch (_) { }
    }
    return null;
}

// =============================================================================
// SHARED STATE — The Neural Link Between Both Bots
// =============================================================================

interface SharedState {
    jwt: string | null;
    baseUrl: string;        // Discovered from JS bundles — empty until found
    apiVersion: string;     // Discovered from JS bundles — empty until found
    courseIds: Record<string, string>;
    visualUrls: Record<string, string>;
    completedCourses: Set<string>;
    timerMs: Record<string, number>;
    // ALL paths discovered dynamically — no hardcoded fallbacks
    paths: {
        login: string | null;
        preAdvised: string | null;
        sections: string | null;   // e.g. "/courses/sections/" — discovered by probing
        select: string | null;
        allDiscovered: string[];   // Every path found in JS bundles
    };
}

function apiUrl(state: SharedState, path: string): string {
    return `${state.baseUrl}/${state.apiVersion}${path}`;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export async function POST(req: Request) {
    // Server-side bot access check
    const botSession = await requireBotAccess();
    if (!botSession) {
        return NextResponse.json(
            { success: false, message: "Unauthorized: bot access required" },
            { status: 403 }
        );
    }

    let browser: any = null;

    const shared: SharedState = {
        jwt: null,
        baseUrl: "",       // Will be discovered from JS bundles
        apiVersion: "",    // Will be discovered from JS bundles
        courseIds: {},
        visualUrls: {},
        completedCourses: new Set<string>(),
        timerMs: {},
        paths: { login: null, preAdvised: null, sections: null, select: null, allDiscovered: [] },
    };

    try {
        const { studentId, password, selectedCourses, apiBaseUrl, mode } = await req.json();
        const runPuppeteer = mode !== 'native-only';
        const runNative = mode !== 'puppeteer-only';
        if (!studentId || !password || !selectedCourses) {
            return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
        }

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                const log = (msg: string) => {
                    console.log(msg);
                    try { controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "log", message: msg })}\n\n`)); } catch (_) { }
                };
                const emitResult = (data: any) => {
                    try { controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "result", data })}\n\n`)); controller.close(); } catch (_) { }
                };
                const emitError = (msg: string) => {
                    try { controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: msg })}\n\n`)); controller.close(); } catch (_) { }
                };

                try {
                    log(runPuppeteer ? "[Hybrid] 🚀 Deploying dual-intelligence system..." : "[Native] 🚀 Deploying pure API bot (no Puppeteer)...");

                    const targets = Object.keys(selectedCourses).map(key => ({
                        courseCode: key.split(" - ")[0].trim(),
                        targetSection: selectedCourses[key],
                    }));

                    // ==========================================================
                    // NATIVE BOT INIT — Completely independent, zero hardcoded paths
                    // (Skipped in puppeteer-only mode)
                    // ==========================================================
                    const nativeBotInit = runNative ? (async () => {
                        try {
                            // Step 1: Discover ALL API routes from frontend JS
                            log("[Native] 🔍 Scraping frontend JS bundles for API architecture...");
                            const discovered = await discoverApiFromFrontend();

                            if (!discovered.baseUrl || !discovered.version) {
                                log("[Native] ❌ Failed to discover API base URL or version from frontend JS!");
                            } else {
                                shared.baseUrl = discovered.baseUrl;
                                shared.apiVersion = discovered.version;
                                shared.paths.login = discovered.routes.login;
                                shared.paths.preAdvised = discovered.routes.preAdvised;
                                shared.paths.allDiscovered = discovered.routes.allPaths;

                                log(`[Native] 🌐 Discovered: ${shared.baseUrl}/${shared.apiVersion}`);
                                log(`[Native] 📡 Found ${discovered.routes.allPaths.length} API routes: ${discovered.routes.allPaths.join(", ")}`);
                            }

                            if (discovered.routes.login) {
                                log(`[Native] 🔓 Login route: ${discovered.routes.login}`);
                            }
                            if (discovered.routes.preAdvised) {
                                log(`[Native] 📋 Pre-advised route: ${discovered.routes.preAdvised}`);
                            }

                            // If user provided a custom API URL, use it
                            if (apiBaseUrl && apiBaseUrl.trim()) {
                                const clean = apiBaseUrl.trim().replace(/\/$/, "");
                                try {
                                    const res = await fetch(clean);
                                    const ct = res.headers.get("content-type") || "";
                                    if (!ct.includes("text/html")) {
                                        shared.baseUrl = clean;
                                        log(`[Native] 🌐 Using user-provided base URL: ${clean}`);
                                    }
                                } catch (_) { }
                            }

                            // Step 2: Login using discovered login route
                            if (!shared.jwt && shared.paths.login) {
                                log("[Native] ⚡ Authenticating via discovered login route...");
                                try {
                                    const res = await fetch(apiUrl(shared, shared.paths.login), {
                                        method: "POST",
                                        headers: {
                                            "Content-Type": "application/json",
                                            "Origin": "https://cloud-v3.edusoft-ltd.workers.dev",
                                            "Referer": "https://cloud-v3.edusoft-ltd.workers.dev/",
                                        },
                                        body: JSON.stringify({ user_id: studentId, password, logout_other_sessions: false }),
                                    });
                                    const data = await res.json();
                                    // Structure-agnostic JWT extraction
                                    const jwt = extractJwt(data);
                                    if (jwt && !shared.jwt) {
                                        shared.jwt = jwt;
                                        log("[Native] 🔑 JWT acquired independently!");
                                    }
                                } catch (_) {
                                    log("[Native] ⚠️ Login failed. Will use Puppeteer's JWT if available.");
                                }
                            }

                            // Step 3: Fetch course IDs via runtime path probing
                            if (shared.jwt) {
                                const probeResult = await probePreAdvisedPath(
                                    shared.baseUrl, shared.apiVersion, shared.jwt,
                                    shared.paths.allDiscovered, log
                                );
                                if (probeResult) {
                                    shared.paths.preAdvised = probeResult.path;
                                    for (const c of probeResult.courses) {
                                        const cc = getCourseCode(c);
                                        if (cc) {
                                            shared.courseIds[cc] = cc;
                                            const fc = getFormalCode(c);
                                            if (fc) shared.courseIds[fc] = cc;
                                        }
                                    }
                                    log(`[Native] 📋 Mapped ${Object.keys(shared.courseIds).length} course entries.`);
                                }
                            }
                        } catch (e: any) {
                            log(`[Native] ⚠️ Init error (non-fatal): ${e.message}`);
                        }
                    })() : Promise.resolve();

                    // ==========================================================
                    // PUPPETEER BOT INIT — Completely independent (skipped in native-only mode)
                    // ==========================================================
                    const puppeteerBotInit = runPuppeteer ? (async () => {
                        try {
                            log("[Visual] 🖥️ Launching Chromium...");
                            browser = await launchBrowser(false);
                            const page = await browser.newPage();

                            // Network interceptor — captures JWT + ALL live API paths
                            await page.setRequestInterception(true);
                            page.on("request", (request: any) => {
                                const url: string = request.url();
                                const headers = request.headers();

                                // Steal JWT
                                if (!shared.jwt && headers.authorization?.startsWith("Bearer ")) {
                                    shared.jwt = headers.authorization.replace("Bearer ", "");
                                    log("[Visual] 🔑 Intercepted JWT from live traffic!");
                                }

                                // Extract base URL + version from any API call
                                const apiMatch = url.match(/(https:\/\/[^/]+)\/(v\d+)\//);
                                if (apiMatch) {
                                    shared.baseUrl = apiMatch[1];
                                    shared.apiVersion = apiMatch[2];
                                }

                                // Intercept specific route patterns from live traffic
                                const pathAfterVersion = url.match(/\/v\d+(\/.*?)(?:\?|$)/);
                                if (pathAfterVersion) {
                                    const livePath = pathAfterVersion[1];

                                    if (livePath.includes("preadvice") || livePath.includes("pre-advis")) {
                                        shared.paths.preAdvised = livePath;
                                        log(`[Visual] 📡 Intercepted pre-advised path: ${livePath}`);
                                    }
                                    if (livePath.includes("/sections/") && request.method() === "GET") {
                                        // Extract the path template up to (but not including) the courseId
                                        const templateMatch = livePath.match(/(.*\/sections\/)/);
                                        if (templateMatch) {
                                            shared.paths.sections = templateMatch[1];
                                            log(`[Visual] 📡 Intercepted sections path: ${templateMatch[1]}`);
                                        }
                                    }
                                    if (livePath.includes("/select") && request.method() === "POST") {
                                        shared.paths.select = livePath;
                                    }
                                    if (livePath.includes("/auth/login")) {
                                        shared.paths.login = livePath;
                                    }
                                }

                                request.continue();
                            });

                            // Visual login
                            await page.goto("https://cloud-v3.edusoft-ltd.workers.dev/console", { waitUntil: "networkidle2" }).catch(() => null);
                            const inputs = await page.$$("input");
                            if (inputs.length >= 2) {
                                await inputs[0].type(studentId);
                                await inputs[1].type(password);
                                await page.keyboard.press("Enter");
                                log("[Visual] 📝 Credentials submitted.");
                            }

                            // Wait for dashboard
                            await page.waitForFunction(
                                () => document.body.innerText.includes("Pre-Advised") || document.body.innerText.includes("Welcome"),
                                { timeout: 20000 }
                            ).catch(() => null);

                            // Scrape visual section URLs
                            const links: Record<string, string> = await page.evaluate(() => {
                                const result: Record<string, string> = {};
                                document.querySelectorAll("tr").forEach((row: any) => {
                                    const text = row.innerText;
                                    const btn = row.querySelector("a[href*='/section-select/']");
                                    if (btn) result[text] = btn.href;
                                });
                                return result;
                            });

                            for (const target of targets) {
                                const match = Object.keys(links).find(k => k.includes(target.courseCode));
                                if (match) shared.visualUrls[target.courseCode] = links[match];
                            }
                            log(`[Visual] 🔗 Found ${Object.keys(shared.visualUrls).length} section URLs.`);
                        } catch (e: any) {
                            log(`[Visual] ⚠️ Init error (non-fatal): ${e.message}`);
                        }
                    })() : Promise.resolve();

                    // Both run in parallel — neither blocks the other
                    await Promise.allSettled([nativeBotInit, puppeteerBotInit]);

                    if (!shared.jwt) {
                        emitError("Neither bot could acquire a session token. Check credentials.");
                        return;
                    }

                    log(`[Hybrid] ✅ Bots initialized. JWT: ✓ | API: ${shared.baseUrl}/${shared.apiVersion}`);
                    log(`[Hybrid] 📡 Paths — login: ${shared.paths.login}, preAdvised: ${shared.paths.preAdvised}, sections: ${shared.paths.sections}`);

                    // ==========================================================
                    // PHASE 2: PER-COURSE RACING LOOPS
                    // ==========================================================

                    const executeTasks = targets.map(async (target) => {

                        // ---- NATIVE LOOP ----
                        const runNativeLoop = async (): Promise<boolean> => {
                            // Retry fetching courseId — uses dynamically discovered path
                            let retries = 0;
                            while (!shared.courseIds[target.courseCode] && retries < 30 && !req.signal.aborted) {
                                retries++;
                                if (shared.jwt) {
                                    try {
                                        if (shared.paths.preAdvised) {
                                            const res = await fetch(apiUrl(shared, shared.paths.preAdvised), {
                                                headers: { Authorization: `Bearer ${shared.jwt}`, Accept: "application/json" },
                                            });
                                            if (res.ok) {
                                                const data = await res.json();
                                                const courses = extractCourses(data);
                                                if (courses.length > 0) {
                                                    for (const c of courses) {
                                                        const cc = getCourseCode(c);
                                                        if (cc) {
                                                            shared.courseIds[cc] = cc;
                                                            const fc = getFormalCode(c);
                                                            if (fc) shared.courseIds[fc] = cc;
                                                        }
                                                    }
                                                }
                                            }
                                        } else if (retries % 5 === 0) {
                                            // If path wasn't found during init, run the prober again
                                            const probeResult = await probePreAdvisedPath(
                                                shared.baseUrl, shared.apiVersion, shared.jwt,
                                                shared.paths.allDiscovered, log
                                            );
                                            if (probeResult) {
                                                shared.paths.preAdvised = probeResult.path;
                                                for (const c of probeResult.courses) {
                                                    const cc = getCourseCode(c);
                                                    if (cc) {
                                                        shared.courseIds[cc] = cc;
                                                        const fc = getFormalCode(c);
                                                        if (fc) shared.courseIds[fc] = cc;
                                                    }
                                                }
                                            }
                                        }
                                    } catch (_) { }
                                }
                                await new Promise(r => setTimeout(r, 1000));
                            }

                            const courseId = shared.courseIds[target.courseCode];
                            if (!courseId) {
                                log(`[${target.courseCode} | Native] ⚠️ Could not resolve course ID. Skipping.`);
                                return false;
                            }

                            // Discover sections path dynamically (probe once, cache forever)
                            if (!shared.paths.sections && shared.jwt) {
                                log(`[${target.courseCode} | Native] 🔎 Discovering sections endpoint...`);
                                const template = await probeSectionsPath(
                                    shared.baseUrl, shared.apiVersion, shared.jwt,
                                    courseId, shared.paths.allDiscovered, log
                                );
                                if (template) {
                                    shared.paths.sections = template;
                                } else {
                                    log(`[${target.courseCode} | Native] ⚠️ Could not discover sections path. Waiting for Puppeteer interception...`);
                                    // Wait for Puppeteer to intercept the path from live traffic
                                    let waitCount = 0;
                                    while (!shared.paths.sections && waitCount < 30 && !req.signal.aborted) {
                                        waitCount++;
                                        await new Promise(r => setTimeout(r, 1000));
                                    }
                                    if (!shared.paths.sections) {
                                        log(`[${target.courseCode} | Native] ❌ No sections path discovered. Skipping.`);
                                        return false;
                                    }
                                }
                            }

                            const sectionsPath = `${shared.paths.sections}${courseId}`;
                            const selectPath = `${shared.paths.sections}${courseId}/select`;

                            let attempts = 0;
                            while (attempts < 5000 && !req.signal.aborted) {
                                if (shared.completedCourses.has(target.courseCode)) {
                                    log(`[${target.courseCode} | Native] 🛑 Sibling succeeded! Aborting.`);
                                    return true;
                                }
                                attempts++;

                                // Death Strike Pace Control
                                let sleepTime = 1000;
                                const timer = shared.timerMs[target.courseCode];
                                if (timer !== undefined) {
                                    if (timer > 10000) {
                                        sleepTime = 5000;
                                        if (attempts % 2 === 0) log(`[${target.courseCode} | Native] 💤 Timer: ${Math.round(timer / 1000)}s. Idling...`);
                                    } else if (timer > 0 && timer <= 2000) {
                                        sleepTime = 250;
                                        if (attempts % 4 === 0) log(`[${target.courseCode} | Native] 🔥 WARMUP! ${timer}ms left...`);
                                    } else if (timer <= 0) {
                                        sleepTime = 100;
                                        if (attempts % 10 === 0) log(`[${target.courseCode} | Native] ⚔️ GATLING MODE!`);
                                    }
                                }

                                try {
                                    if (!shared.jwt) { await new Promise(r => setTimeout(r, sleepTime)); continue; }

                                    if (sleepTime >= 1000 && (attempts === 1 || attempts % 5 === 0)) {
                                        log(`[${target.courseCode} | Native] 📡 Polling sections...`);
                                    }

                                    const getRes = await fetch(apiUrl(shared, sectionsPath), {
                                        headers: { Authorization: `Bearer ${shared.jwt}`, Accept: "application/json", Connection: "keep-alive" },
                                    });

                                    // JWT expired — auto re-login
                                    if (getRes.status === 401 && shared.paths.login) {
                                        log(`[${target.courseCode} | Native] 🔄 JWT expired. Re-authenticating...`);
                                        shared.jwt = null;
                                        try {
                                            const reRes = await fetch(apiUrl(shared, shared.paths.login), {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json", Origin: "https://cloud-v3.edusoft-ltd.workers.dev" },
                                                body: JSON.stringify({ user_id: studentId, password, logout_other_sessions: false }),
                                            });
                                            const reData = await reRes.json();
                                            const newJwt = extractJwt(reData);
                                            if (newJwt) {
                                                shared.jwt = newJwt;
                                                log(`[${target.courseCode} | Native] 🔑 Re-login successful!`);
                                            }
                                        } catch (_) { }
                                        await new Promise(r => setTimeout(r, sleepTime));
                                        continue;
                                    }

                                    if (!getRes.ok) throw new Error("HTTP " + getRes.status);

                                    const data = await getRes.json();
                                    const sections = extractSections(data);
                                    const matched = sections.find((s: any) => getSectionName(s) === target.targetSection);
                                    if (!matched) throw new Error("Section unavailable");

                                    log(`[${target.courseCode} | Native] 🎯 Section found! Striking...`);
                                    const selectRes = await fetch(apiUrl(shared, selectPath), {
                                        method: "POST",
                                        headers: { Authorization: `Bearer ${shared.jwt}`, "Content-Type": "application/json" },
                                        body: JSON.stringify({ section_id: getSectionId(matched), action: "select", parent_course_code: courseId }),
                                    });

                                    if (selectRes.ok) {
                                        if (!shared.completedCourses.has(target.courseCode)) {
                                            shared.completedCourses.add(target.courseCode);
                                            log(`[${target.courseCode} | Native] 🟩 SUCCESS! Section ${target.targetSection} registered!`);
                                        }
                                        return true;
                                    } else {
                                        const err = await selectRes.json().catch(() => ({}));
                                        throw new Error(err.message || "Rejected");
                                    }
                                } catch (e: any) {
                                    if (!e.message?.includes("unavailable")) {
                                        log(`[${target.courseCode} | Native] ❌ ${e.message}. Retrying...`);
                                    }
                                    await new Promise(r => setTimeout(r, sleepTime));
                                }
                            }
                            return false;
                        };

                        // ---- VISUAL LOOP ----
                        const runPuppeteerLoop = async (): Promise<boolean> => {
                            let waitAttempts = 0;
                            while (!shared.visualUrls[target.courseCode] && waitAttempts < 60 && !req.signal.aborted) {
                                waitAttempts++;
                                await new Promise(r => setTimeout(r, 500));
                            }

                            const targetUrl = shared.visualUrls[target.courseCode];
                            if (!targetUrl || !browser) {
                                log(`[${target.courseCode} | Visual] ⚠️ No URL or browser. Skipping.`);
                                return false;
                            }

                            let page: any = null;
                            try { page = await browser.newPage(); } catch (_) { return false; }

                            try {
                                await page.goto(targetUrl, { waitUntil: "networkidle2", timeout: 15000 }).catch(() => { });
                                let attempts = 0;

                                while (attempts < 5000 && !req.signal.aborted) {
                                    if (shared.completedCourses.has(target.courseCode)) {
                                        log(`[${target.courseCode} | Visual] 🛑 Sibling succeeded! Aborting.`);
                                        await page.close().catch(() => null);
                                        return true;
                                    }
                                    attempts++;

                                    let state = { ok: false, timerMs: -1 };
                                    try {
                                        state = await page.evaluate((tSec: string) => {
                                            let ok = false, timerMs = -1;

                                            const timerEl = document.querySelector("#countdown-timer, .timer, [class*='timer'], [class*='countdown']");
                                            if (timerEl) {
                                                const txt = (timerEl as HTMLElement).innerText.trim();
                                                if (txt === "00:00:00" || txt === "00:00" || txt.includes("-")) {
                                                    timerMs = 0;
                                                } else {
                                                    const parts = txt.split(":").map(Number);
                                                    if (parts.length === 3) timerMs = (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
                                                    else if (parts.length === 2) timerMs = (parts[0] * 60 + parts[1]) * 1000;
                                                }
                                            }

                                            document.querySelectorAll("tr, div.card, div.section-item, li").forEach(el => {
                                                if (new RegExp(`\\b${tSec}\\b`, "i").test((el as HTMLElement).innerText)) {
                                                    const btn = Array.from(el.querySelectorAll("button, a")).find(
                                                        b => (b as HTMLElement).innerText.includes("Select") || (b as HTMLElement).innerText.includes("Register")
                                                    );
                                                    if (btn && !(btn as HTMLButtonElement).disabled) {
                                                        (btn as HTMLElement).click();
                                                        ok = true;
                                                    }
                                                }
                                            });
                                            return { ok, timerMs };
                                        }, target.targetSection);
                                    } catch (_) { }

                                    if (state.timerMs >= 0) shared.timerMs[target.courseCode] = state.timerMs;

                                    if (state.ok) {
                                        if (!shared.completedCourses.has(target.courseCode)) {
                                            shared.completedCourses.add(target.courseCode);
                                            log(`[${target.courseCode} | Visual] 🟩 SUCCESS! Clicked Section ${target.targetSection}!`);
                                        }
                                        await page.close().catch(() => null);
                                        return true;
                                    }

                                    if (state.timerMs === 0) {
                                        await new Promise(r => setTimeout(r, 1000));
                                        await page.reload({ waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => null);
                                    } else {
                                        if (attempts === 1 || attempts % 5 === 0) {
                                            log(`[${target.courseCode} | Visual] 🕒 Scanning...${state.timerMs > 0 ? ` Timer: ${Math.round(state.timerMs / 1000)}s` : ""}`);
                                        }
                                        await new Promise(r => setTimeout(r, 1000));
                                    }
                                }
                                await page.close().catch(() => null);
                                return false;
                            } catch (_) {
                                if (page) await page.close().catch(() => null);
                                return false;
                            }
                        };

                        log(`[${target.courseCode}] 🏁 ${runPuppeteer ? 'Launching parallel threads!' : 'Launching native API thread!'}`);
                        const loops: Promise<boolean>[] = [];
                        if (runNative) loops.push(runNativeLoop());
                        if (runPuppeteer) loops.push(runPuppeteerLoop());
                        await Promise.all(loops);

                        return {
                            course: target.courseCode,
                            success: shared.completedCourses.has(target.courseCode),
                            reason: shared.completedCourses.has(target.courseCode) ? "Registered" : "Bot(s) exhausted",
                        };
                    });

                    const results = await Promise.all(executeTasks);
                    log("[Hybrid] 🏆 All operations completed.");
                    emitResult({ success: true, results });
                } catch (error: any) {
                    emitError(error.message || "Internal Server Error");
                }
            },
        });

        return new Response(stream, {
            headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
        });
    } catch (error: any) {
        if (browser) await browser.close().catch(() => null);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
