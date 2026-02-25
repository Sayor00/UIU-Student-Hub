import { NextResponse } from "next/server";
import { requireBotAccess } from "@/lib/botAuth";

async function resolveApiBaseUrl(inputUrl: string | undefined): Promise<string> {
    const defaultUrl = "https://m5p10igya2.execute-api.ap-southeast-1.amazonaws.com";
    if (!inputUrl || inputUrl.trim() === "") return defaultUrl;

    let cleanUrl = inputUrl.trim();
    if (cleanUrl.endsWith('/')) {
        cleanUrl = cleanUrl.slice(0, -1);
    }

    try {
        const checkRes = await fetch(cleanUrl);
        const contentType = checkRes.headers.get("content-type") || "";

        // If the user provided the visually facing React Frontend URL (HTML)
        if (contentType.includes("text/html")) {
            console.log(`[Auto-Register Native] Analyzing custom frontend domain ${cleanUrl} to extract hidden API logic...`);
            const html = await checkRes.text();

            // Extract all injected JS bundles
            const jsRegex = /(?:src|href)="([^"]+\.js(?:[^"]*)?)"/g;
            let match;
            const scripts = [];
            while ((match = jsRegex.exec(html)) !== null) {
                scripts.push(match[1]);
            }

            const urlObj = new URL(cleanUrl);
            const origin = urlObj.origin;

            // Parse each JS file to find the hardcoded Amazon AWS /v3 API link
            for (const scriptPath of scripts) {
                const fullUrl = scriptPath.startsWith('http') ? scriptPath : `${origin}${scriptPath.startsWith('/') ? '' : '/'}${scriptPath}`;
                const scriptRes = await fetch(fullUrl);
                const scriptContent = await scriptRes.text();

                const v3Regex = /"https:\/\/[^"]+\/v3"/g;
                let apiMatch;
                while ((apiMatch = v3Regex.exec(scriptContent)) !== null) {
                    const candidate = apiMatch[0].replace(/"/g, '');
                    if (candidate.endsWith('/v3')) {
                        const finalBase = candidate.slice(0, -3); // Strip /v3
                        console.log(`[Auto-Register Native] SUCCESS! Autonomously discovered hidden backend API: ${finalBase}`);
                        return finalBase;
                    }
                }
            }
        }
    } catch (e) {
        console.error(`[Auto-Register Native] Failed to autonomously scrape custom URL ${cleanUrl}. Proceeding with input as direct API.`, e);
    }

    // If it wasn't HTML or extraction failed, assume they provided the actual backend API URL
    return cleanUrl;
}

export async function POST(req: Request) {
    // Server-side bot access check
    const botSession = await requireBotAccess();
    if (!botSession) {
        return NextResponse.json(
            { success: false, message: "Unauthorized: bot access required" },
            { status: 403 }
        );
    }

    try {
        const { studentId, password, selectedCourses, apiBaseUrl } = await req.json();

        if (!studentId || !password || !selectedCourses) {
            return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
        }

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                const log = (msg: string) => {
                    console.log(msg);
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'log', message: msg })}\n\n`));
                };

                const emitError = (msg: string) => {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: msg })}\n\n`));
                    controller.close();
                };

                try {
                    log(`Initializing automation engine...`);
                    const baseUrl = await resolveApiBaseUrl(apiBaseUrl);

                    log(`Discovered UCAM API Node: ${baseUrl}`);
                    log(`Authenticating user ${studentId}...`);

                    const loginRes = await fetch(`${baseUrl}/v3/auth/login`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Origin": "https://cloud-v3.edusoft-ltd.workers.dev",
                            "Referer": "https://cloud-v3.edusoft-ltd.workers.dev/",
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                        },
                        body: JSON.stringify({
                            user_id: studentId,
                            password: password,
                            logout_other_sessions: false
                        })
                    });

                    if (!loginRes.ok) {
                        const err = await loginRes.json().catch(() => ({}));
                        console.error("[Auto-Register Native] Login failed", err);
                        emitError("Invalid credentials or UCAM is down.");
                        return;
                    }

                    const loginData = await loginRes.json();
                    const jwt = loginData?.data?.access_token;

                    if (!jwt) {
                        emitError("Login succeeded but no JWT token was returned.");
                        return;
                    }

                    log(`Authentication successful. Mapping course variables...`);

                    const profileRes = await fetch(`${baseUrl}/v3/users/me/preadvice-courses`, {
                        headers: {
                            "Authorization": `Bearer ${jwt}`,
                            "Accept": "application/json"
                        }
                    });

                    let dashboardCourses: any[] = [];
                    if (profileRes.ok) {
                        const profileData = await profileRes.json();
                        dashboardCourses = profileData?.data?.courses || [];
                        log(`Successfully mapped ${dashboardCourses.length} mapped courses.`);
                    } else {
                        console.error("[Auto-Register Native] Could not fetch mapped courses.");
                        emitError("Could not fetch pre-advised courses mapping.");
                        return;
                    }

                    // Map targets
                    const targets = Object.keys(selectedCourses).map(courseKey => {
                        const courseCode = courseKey.split(" - ")[0].trim(); // e.g. "CSE 4165"
                        const targetSection = selectedCourses[courseKey];

                        const matchedCourse = dashboardCourses.find(c => {
                            const formalCode = c.formal_code || "";
                            return formalCode.toLowerCase().includes(courseCode.toLowerCase());
                        });

                        return {
                            courseCode,
                            targetSection,
                            courseId: matchedCourse?.course_code // Internal UUID like '1301-1-1'
                        };
                    });

                    log(`Starting parallel execution for ${targets.length} subjects...`);

                    // 3. Execute all section selections in parallel natively
                    const executeTasks = targets.map(async (target) => {
                        if (!target.courseId) {
                            log(`⚠️ Failed: Course ${target.courseCode} not found in UCAM API.`);
                            return { course: target.courseCode, success: false, reason: "Course ID not found in UCAM API. Check if it's active." };
                        }

                        let attempts = 0;
                        const maxAttempts = 1800; // ~30 minutes at 1 req/sec
                        while (attempts < maxAttempts && !req.signal.aborted) {
                            attempts++;
                            try {
                                if (attempts === 1 || attempts % 5 === 0) {
                                    log(`[${target.courseCode}] 📡 The Poll: Checking /v3/courses/sections for Section ${target.targetSection}... (Attempt ${attempts})`);
                                }

                                const getRes = await fetch(`${baseUrl}/v3/courses/sections/${target.courseId}`, {
                                    headers: {
                                        "Authorization": `Bearer ${jwt}`,
                                        "Accept": "application/json"
                                    }
                                });

                                if (!getRes.ok) throw new Error(`Portal returned status: ${getRes.status}`);

                                const sectionsData = await getRes.json();
                                const sections = sectionsData?.data?.sections || [];

                                const matchedSection = sections.find((s: any) => {
                                    const secName = s.section_name || s.name || "";
                                    return new RegExp(`\\b${target.targetSection}\\b`, 'i').test(secName) || secName === target.targetSection;
                                });

                                if (!matchedSection) {
                                    throw new Error(`POLL_FAILED: Section ${target.targetSection} not active yet. Portal may be closed.`);
                                }

                                const sectionId = matchedSection.section_id || matchedSection.id;
                                log(`[${target.courseCode}] 🎯 The Strike: Found Section ${target.targetSection} ID: ${sectionId}. Firing POST payload...`);

                                const postRes = await fetch(`${baseUrl}/v3/courses/sections/${target.courseId}/select`, {
                                    method: "POST",
                                    headers: {
                                        "Authorization": `Bearer ${jwt}`,
                                        "Content-Type": "application/json",
                                        "Accept": "application/json"
                                    },
                                    body: JSON.stringify({
                                        section_id: sectionId,
                                        action: "select",
                                        parent_course_code: target.courseId
                                    })
                                });

                                if (!postRes.ok) {
                                    const errData = await postRes.json().catch(() => ({}));
                                    const errMsg = errData.message || "Unknown error";
                                    throw new Error(`STRIKE_FAILED: ${errMsg}`);
                                }

                                log(`[${target.courseCode}] 🟩 The Exit: Success! Section ${target.targetSection} officially registered at ${new Date().toLocaleTimeString()}! Killing loop.`);
                                return { course: target.courseCode, success: true };

                            } catch (err: any) {
                                const msg = err.message || "";

                                if (msg.startsWith("STRIKE_FAILED:")) {
                                    log(`[${target.courseCode}] ❌ The Result: Seat Full or Rejected => ${msg.replace("STRIKE_FAILED: ", "")}. Sleeping 1s and looping...`);
                                } else if (msg.startsWith("POLL_FAILED:")) {
                                    if (attempts === 1 || attempts % 5 === 0) {
                                        log(`[${target.courseCode}] ⏳ The Result: Portal Closed/Missing => ${msg.replace("POLL_FAILED: ", "")} Sleeping 1s and looping...`);
                                    }
                                } else {
                                    if (attempts === 1 || attempts % 5 === 0) {
                                        log(`[${target.courseCode}] ⚠️ The Result: Network Error => ${msg}. Sleeping 1s and looping...`);
                                    }
                                }

                                if (attempts >= maxAttempts) {
                                    log(`[${target.courseCode}] 🔚 The Exit: Timeout reached after ${maxAttempts} attempts. Giving up.`);
                                    return { course: target.courseCode, success: false, reason: "Timeout reached." };
                                }

                                // Wait 1000ms before checking again to avoid severe rate limiting
                                await new Promise(r => setTimeout(r, 1000));
                            }
                        }

                        // If it exited purely from req.signal.aborted
                        return { course: target.courseCode, success: false, reason: "User cancelled the operation." };
                    });

                    const results = await Promise.all(executeTasks);

                    log(`All operations completed.`);
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'result', data: { success: true, results } })}\n\n`));
                    controller.close();
                } catch (error: any) {
                    emitError(error.message || "Internal Server Error");
                }
            }
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive"
            }
        });

    } catch (error: any) {
        console.error("[Auto-Register Native] Error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
