import { NextResponse } from "next/server";
import { requireBotAccess } from "@/lib/botAuth";

// Allow up to 5 minutes for bot operations on Vercel Pro
export const maxDuration = 300;

// URL to the Chromium binary package hosted in /public
const CHROMIUM_PACK_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/chromium-pack.tar`
    : "https://github.com/gabenunez/puppeteer-on-vercel/raw/refs/heads/main/example/chromium-dont-use-in-prod.tar";

let cachedExecutablePath: string | null = null;
let downloadPromise: Promise<string> | null = null;

async function getChromiumPath(): Promise<string> {
    if (cachedExecutablePath) return cachedExecutablePath;
    if (!downloadPromise) {
        const chromium = (await import("@sparticuz/chromium-min")).default;
        downloadPromise = chromium
            .executablePath(CHROMIUM_PACK_URL)
            .then((path: string) => { cachedExecutablePath = path; return path; })
            .catch((error: any) => { downloadPromise = null; throw error; });
    }
    return downloadPromise;
}

async function launchBrowser() {
    const isVercel = !!process.env.VERCEL_ENV;
    if (isVercel) {
        const chromium = (await import("@sparticuz/chromium-min")).default;
        const puppeteer = await import("puppeteer-core");
        const executablePath = await getChromiumPath();
        return puppeteer.launch({ headless: true, args: chromium.args, executablePath });
    } else {
        const puppeteer = await import("puppeteer");
        return puppeteer.launch({ headless: false, defaultViewport: null, args: ['--start-maximized'] });
    }
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
        const { studentId, password, selectedCourses } = await req.json();

        if (!studentId || !password || !selectedCourses) {
            return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
        }

        console.log(`[Auto-Register] Starting PARALLEL registration for user ${studentId}...`);

        const browser = await launchBrowser();

        const mainPage = await browser.newPage();

        console.log(`[Auto-Register] Navigating to login page...`);
        await mainPage.goto("https://cloud-v3.edusoft-ltd.workers.dev/console", { waitUntil: "networkidle2" });

        const inputs = await mainPage.$$("input");
        if (inputs.length >= 2) {
            await inputs[0].type(studentId);
            await inputs[1].type(password);

            // Press enter to login
            await mainPage.keyboard.press('Enter');
            console.log(`[Auto-Register] Logging in...`);
        } else {
            throw new Error("Could not find login input fields. Page may have changed.");
        }

        // Wait for the dashboard to load (Pre-Advised Courses text)
        await mainPage.waitForFunction(() => {
            return document.body.innerText.includes("Pre-Advised Courses") || document.body.innerText.includes("Welcome");
        }, { timeout: 15000 });

        console.log(`[Auto-Register] Logged in successfully! Dashboard loaded.`);

        // 1. Scrape all course registration URLs from the dashboard
        const courseLinks = await mainPage.evaluate(() => {
            const links: Record<string, string> = {};
            const rows = document.querySelectorAll("tr");
            for (const row of Array.from(rows)) {
                // Get the text content of the row (e.g., "CSE 4165 Web Programming")
                const text = (row as HTMLElement).innerText;
                // Find any link that contains '/section-select/'
                const selectLink = row.querySelector("a[href*='/section-select/']");

                if (selectLink) {
                    links[text] = (selectLink as HTMLAnchorElement).href;
                }
            }
            return links;
        });

        // 2. Spawn parallel pages/tabs for every single course
        const registrationTasks = Object.keys(selectedCourses).map(async (courseKey) => {
            const targetSection = selectedCourses[courseKey];
            const courseCode = courseKey.split(" - ")[0].trim(); // e.g. "CSE 4165"

            console.log(`[Auto-Register] Parallel Task: Attempting to register ${courseCode} -> Section: ${targetSection}`);

            // Find the matching URL from our scraped list
            // courseLinks keys look like "CSE 4165\nWeb Programming\n..."
            const matchedKey = Object.keys(courseLinks).find(k => k.includes(courseCode));
            const targetUrl = matchedKey ? courseLinks[matchedKey] : null;

            if (!targetUrl) {
                console.warn(`[Auto-Register] ❌ Could not find URL on dashboard for ${courseCode}. Skipping.`);
                return { course: courseCode, success: false, reason: "Select button URL not found on dashboard" };
            }

            // Create a new browser tab concurrently
            const coursePage = await browser.newPage();

            try {
                // Navigate directly to the section selection page
                console.log(`[Auto-Register] 🚀 Navigating directly to selection page for ${courseCode}...`);
                await coursePage.goto(targetUrl, { waitUntil: "networkidle2", timeout: 10000 }).catch(() => { });

                let sectionSelected = false;
                let attempts = 0;
                const maxAttempts = 900; // ~30 minutes at 2 seconds each

                while (!sectionSelected && attempts < maxAttempts) {
                    attempts++;

                    // Evaluate the DOM to check the timer AND the button status simultaneously
                    let state = { isButtonFoundAndEnabled: false, isTimerZero: false };

                    try {
                        state = await coursePage.evaluate((target) => {
                            let isButtonFoundAndEnabled = false;
                            let isTimerZero = false;
                            let timerText = "";

                            // 1. Check Timer
                            const timerElement = document.querySelector("#countdown-timer, .timer, span[timer]"); // Replace with actual timer selector if known
                            // If no specific timer element is easily identifiable, we can look for "00:00:00" strings on the page
                            if (timerElement) {
                                timerText = (timerElement as HTMLElement).innerText.trim();
                                if (timerText === "00:00:00" || timerText === "00:00") {
                                    isTimerZero = true;
                                }
                            } else {
                                // Fallback: check if the page literally says "00:00:00" anywhere
                                isTimerZero = document.body.innerText.includes("00:00:00") || document.body.innerText.includes("00:00");
                            }

                            // 2. Check for Target Section Button
                            const elements = document.querySelectorAll("tr, div.card, div.section-item, li");
                            for (const el of Array.from(elements)) {
                                const text = (el as HTMLElement).innerText;
                                const isMatch = new RegExp(`\\b${target}\\b`, 'i').test(text);

                                if (isMatch) {
                                    const buttons = Array.from(el.querySelectorAll("button, a"));
                                    const selectBtn = buttons.find(b => {
                                        const bText = (b as HTMLElement).innerText;
                                        return bText.includes("Select") || bText.includes("Register");
                                    });

                                    if (selectBtn) {
                                        if (!(selectBtn as HTMLButtonElement).disabled) {
                                            (selectBtn as HTMLElement).click();
                                            isButtonFoundAndEnabled = true;
                                        }
                                    }
                                }
                            }

                            return { isButtonFoundAndEnabled, isTimerZero };
                        }, targetSection);
                    } catch (e: any) {
                        // Ignore "detached frame" specifically. It just means the page reloaded while we were scanning.
                        if (!e.message.includes("detached")) {
                            console.warn(`[Auto-Register] Non-fatal evaluation warning for ${courseCode}:`, e.message);
                        }
                    }

                    if (state.isButtonFoundAndEnabled) {
                        sectionSelected = true;
                        break;
                    }

                    // If button is not enabled yet
                    if (state.isTimerZero) {
                        // Timer has hit zero, but button was still grey!
                        console.log(`[Auto-Register] ⏳ Timer hit 0 for ${courseCode}, but button did not dynamically unlock...`);
                        await new Promise(r => setTimeout(r, 1000)); // Wait exactly 1 second as user requested

                        // After waiting 1 sec, refresh the page to forcefully grab the live button
                        console.log(`[Auto-Register] 🔄 Forcing HARD REFRESH for ${courseCode}...`);
                        await coursePage.reload({ waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => { });
                    } else {
                        // Timer is still counting down. Sleep 1 second and check DOM again.
                        if (attempts === 1 || attempts % 5 === 0) {
                            console.log(`[Auto-Register] 🕒 Timer running for ${courseCode}. Scanning DOM (Attempt ${attempts})...`);
                        }
                        await new Promise(r => setTimeout(r, 1000));
                    }
                }

                if (sectionSelected) {
                    console.log(`[Auto-Register] ✅ Successfully clicked register for ${courseCode} Section ${targetSection}`);
                    return { course: courseCode, success: true };
                } else {
                    console.warn(`[Auto-Register] ❌ Could not find register button for ${courseCode} Section ${targetSection}.`);
                    return { course: courseCode, success: false, reason: "Section button not found/Timeout reached" };
                }

            } catch (err) {
                console.error(`[Auto-Register] ❌ Error processing ${courseCode}:`, err);
                return { course: courseCode, success: false, reason: (err as Error).message };
            } finally {
                // Pause slightly before the promise finishes so the page doesn't instantly close or error network
                await new Promise(r => setTimeout(r, 2000));
            }
        });

        // wait for all parallel tabs to execute and fetch their individual results!
        const results = await Promise.all(registrationTasks);

        // Optional: Keep browser open so user can easily verify the final selections.
        // await browser.close();

        return NextResponse.json({ success: true, results });
    } catch (error) {
        console.error("[Auto-Register] Fast error:", error);
        return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
    }
}
