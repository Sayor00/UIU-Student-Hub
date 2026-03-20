import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import * as cheerio from 'cheerio';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import { createHash } from 'crypto';
import { getTrimesterName, parseStudentId } from './trimesterUtils';

const REQUEST_TIMEOUT = 8000; // 8 seconds per individual HTTP request
const MAX_RETRIES = 3;
const BACKOFF_BASE = 1000; // 1s, 2s, 4s

async function fetchWithRetry(
    client: AxiosInstance,
    config: AxiosRequestConfig & { url: string; method?: string },
    onRetry?: (msg: string) => Promise<void>
): Promise<any> {
    let lastError: any;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const res = config.method === 'post'
                ? await client.post(config.url, config.data, { ...config, timeout: REQUEST_TIMEOUT })
                : await client.get(config.url, { ...config, timeout: REQUEST_TIMEOUT });
            return res;
        } catch (err: any) {
            lastError = err;
            if (attempt < MAX_RETRIES) {
                const delay = BACKOFF_BASE * Math.pow(2, attempt - 1);
                if (onRetry) {
                    await onRetry(`UCAM slow — retrying (${attempt}/${MAX_RETRIES})...`);
                }
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }
    throw lastError;
}

/**
 * Lightweight fingerprint check: login + fetch transcript page + SHA-256 hash.
 * Takes ~3 seconds. Used to detect if UCAM data changed since last sync.
 */
export async function fetchTranscriptFingerprint(ucamId: string, ucamPassword: string): Promise<string> {
    const jar = new CookieJar();
    const client = wrapper(axios.create({ jar, withCredentials: true }));
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
    };

    // 1. Get login page
    const loginPage = await fetchWithRetry(client, {
        url: 'https://ucam.uiu.ac.bd/Security/LogIn.aspx',
        headers
    });

    const $login = cheerio.load(loginPage.data);
    const params = new URLSearchParams();
    $login('input[type="hidden"]').each((_, el) => {
        const name = $login(el).attr('name');
        const value = $login(el).attr('value') || '';
        if (name) params.append(name, value);
    });
    params.set('logMain$UserName', ucamId);
    params.set('logMain$Password', ucamPassword);
    params.set('logMain$Button1', 'Log In');

    // 2. Login
    await fetchWithRetry(client, {
        url: 'https://ucam.uiu.ac.bd/Security/LogIn.aspx',
        method: 'post',
        data: params.toString(),
        headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded', 'Origin': 'https://ucam.uiu.ac.bd', 'Referer': 'https://ucam.uiu.ac.bd/Security/LogIn.aspx' },
        maxRedirects: 0,
        validateStatus: (s: number) => s >= 200 && s < 400
    });

    const cookies = await jar.getCookies('https://ucam.uiu.ac.bd');
    if (!cookies.some(c => c.key === '.ASPXAUTH')) {
        throw new Error('Invalid UCAM Credentials or UCAM is down.');
    }

    // 3. Fetch transcript page
    const historyUrl = 'https://ucam.uiu.ac.bd/Student/StudentCourseHistory.aspx?mmi=40545a1642555b514e63';
    const historyRes = await fetchWithRetry(client, { url: historyUrl, headers });

    // 4. SHA-256 hash the body
    return createHash('sha256').update(historyRes.data).digest('hex');
}

/**
 * Lightweight attendance fetch: login + AJAX call to GetStudentAttendanceSummary.
 * Takes ~3 seconds. Returns current trimester attendance data.
 */
export async function fetchAttendanceSummary(ucamId: string, ucamPassword: string): Promise<any[]> {
    const jar = new CookieJar();
    const client = wrapper(axios.create({ jar, withCredentials: true }));
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
    };

    // 1. Get login page
    const loginPage = await fetchWithRetry(client, {
        url: 'https://ucam.uiu.ac.bd/Security/LogIn.aspx',
        headers
    });

    const $login = cheerio.load(loginPage.data);
    const params = new URLSearchParams();
    $login('input[type="hidden"]').each((_, el) => {
        const name = $login(el).attr('name');
        const value = $login(el).attr('value') || '';
        if (name) params.append(name, value);
    });
    params.set('logMain$UserName', ucamId);
    params.set('logMain$Password', ucamPassword);
    params.set('logMain$Button1', 'Log In');

    // 2. Login
    await fetchWithRetry(client, {
        url: 'https://ucam.uiu.ac.bd/Security/LogIn.aspx',
        method: 'post',
        data: params.toString(),
        headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded', 'Origin': 'https://ucam.uiu.ac.bd', 'Referer': 'https://ucam.uiu.ac.bd/Security/LogIn.aspx' },
        maxRedirects: 0,
        validateStatus: (s: number) => s >= 200 && s < 400
    });

    const cookies = await jar.getCookies('https://ucam.uiu.ac.bd');
    if (!cookies.some(c => c.key === '.ASPXAUTH')) {
        throw new Error('Invalid UCAM Credentials or UCAM is down.');
    }

    // 3. Call the attendance AJAX endpoint
    const attendanceRes = await fetchWithRetry(client, {
        url: 'https://ucam.uiu.ac.bd/Security/StudentHome.aspx/GetStudentAttendanceSummary',
        method: 'post',
        data: JSON.stringify({ roll: ucamId }),
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Accept': 'application/json',
            'Referer': 'https://ucam.uiu.ac.bd/Security/StudentHome.aspx'
        }
    });

    const rawData = attendanceRes.data?.d || [];
    return rawData.map((item: any) => ({
        courseCode: (item.FormalCode || '').replace(/\s+/g, ''),
        title: item.Title || '',
        section: item.SectionName || '',
        present: item.PresentCount || 0,
        absent: item.AbsentCount || 0,
        held: item.TotalClassHeld || 0,
        remaining: item.RemainClass || 0,
        total: (item.TotalClassHeld || 0) + (item.RemainClass || 0),
        percentage: item.TotalClassHeld > 0
            ? Math.round((item.PresentCount / item.TotalClassHeld) * 100)
            : 100
    }));
}


function parseAssessmentsTable($c: any, studentId: string): any[] {
    const assessments: any[] = [];
    const table = $c('#markTable').first();
    if (!table.length) {
        // Fallback for older non-OBE courses using standard GridViews
        const gridView = $c('#ctl00_MainContainer_gvAssessments');
        if (gridView.length) {
            gridView.find('tr').each((i: number, tr: any) => {
                if (i === 0) return; // Skip Header
                const tds = $c(tr).find('td');
                if (tds.length >= 3) {
                    const name = $c(tds[0]).text().trim();
                    const obtainedText = $c(tds[1]).text().trim().toUpperCase();
                    const totalText = $c(tds[2]).text().trim();
                    
                    let obtained = parseFloat(obtainedText);
                    if (obtainedText === 'A' || obtainedText.includes('ABSENT')) obtained = 0;
                    const total = parseFloat(totalText);

                    if (!isNaN(obtained) && !isNaN(total)) {
                        assessments.push({
                            name,
                            totalMarks: total,
                            obtainedMarks: obtained
                        });
                    }
                }
            });
            return assessments;
        }
        return assessments;
    }

    const grid: string[][] = [];
    table.find('thead tr').each((r: number, tr: any) => {
        if (!grid[r]) grid[r] = [];
        let c = 0;
        $c(tr).find('th, td').each((_: number, cell: any) => {
            while (grid[r][c]) c++; 
            const text = $c(cell).text().trim();
            const rowspan = parseInt($c(cell).attr('rowspan') || '1', 10);
            const colspan = parseInt($c(cell).attr('colspan') || '1', 10);
            
            for (let i = 0; i < rowspan; i++) {
                for (let j = 0; j < colspan; j++) {
                    if (!grid[r + i]) grid[r + i] = [];
                    grid[r + i][c + j] = text;
                }
            }
        });
    });

    const dataRow = table.find('tbody tr').first();
    if (!dataRow.length) return assessments;

    let totalClasses = 0;
    let presentClasses = 0;

    const tds = dataRow.find('td');
    tds.each((c: number, td: any) => {
        const combinedHeaderParts: string[] = [];
        for (let r = 0; r < grid.length; r++) {
            const part = grid[r][c];
            if (part && !combinedHeaderParts.includes(part)) {
                combinedHeaderParts.push(part);
            }
        }
        const fullHeader = combinedHeaderParts.join(" | ");
        const valText = $c(td).text().trim();
        let obtained = parseFloat(valText);

        if (valText.toUpperCase() === 'A' || valText.toUpperCase().includes('ABSENT')) obtained = 0;

        if (isNaN(obtained)) return;

        // Sniff for standalone Attendance tracking columns (usually present in active semester tables)
        if (fullHeader.toLowerCase().includes('total class')) totalClasses = obtained;
        if (fullHeader.toLowerCase().includes('present')) presentClasses = obtained;

        const marksMatch = fullHeader.match(/\(([\d.]+)\)/);
        if (marksMatch) {
            const total = parseFloat(marksMatch[1]);
            const name = fullHeader.replace(/\(([\d.]+)\)/g, '').replace(/\|/g, '-').trim();
            
            if (!isNaN(total) && !name.toLowerCase().includes("out of")) {
                assessments.push({
                    name,
                    totalMarks: total,
                    obtainedMarks: obtained
                });
            }
        }
    });

    if (totalClasses > 0 && presentClasses >= 0) {
        const isBPharm = parseStudentId(studentId)?.program === 'BPharm';

        const ratio = presentClasses / totalClasses;
        let outOf5 = 0;
        if (isBPharm) {
            if (ratio >= 25 / 30) outOf5 = 5;
            else if (ratio >= 19 / 30) outOf5 = 4;
            else if (ratio >= 13 / 30) outOf5 = 3;
            else if (ratio >= 7 / 30) outOf5 = 2;
            else if (ratio > 0) outOf5 = 1;
        } else {
            if (ratio >= 21 / 24) outOf5 = 5;
            else if (ratio >= 16 / 24) outOf5 = 4;
            else if (ratio >= 11 / 24) outOf5 = 3;
            else if (ratio >= 6 / 24) outOf5 = 2;
            else if (ratio > 0) outOf5 = 1;
        }
        
        // Push the synthesized Attendance mark!
        // We only push if it doesn't already exist natively in the grid to gracefully handle edge cases.
        if (!assessments.find(a => a.name.toLowerCase().includes("attend"))) {
             assessments.push({
                 name: "Attendance",
                 totalMarks: 5,
                 obtainedMarks: outOf5,
                 weight: 5
             });
        }
    }

    return assessments;
}


export async function syncUcamData(ucamId: string, ucamPassword: string, onProgress?: (msg: string) => Promise<void>) {
    const progress = onProgress || (async () => {});
    const jar = new CookieJar();
    const client = wrapper(axios.create({ jar, withCredentials: true }));

    // 1. Get Login Page for ViewState
    await progress('Logging in to UCAM...');
    const loginPage = await fetchWithRetry(client, {
        url: 'https://ucam.uiu.ac.bd/Security/LogIn.aspx',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5'
        }
    }, progress);

    const $login = cheerio.load(loginPage.data);

    // 2. Perform Login
    const params = new URLSearchParams();
    $login('input[type="hidden"]').each((_, el) => {
        const name = $login(el).attr('name');
        const value = $login(el).attr('value') || '';
        if (name) {
            params.append(name, value);
        }
    });

    params.set('logMain$UserName', ucamId);
    params.set('logMain$Password', ucamPassword);
    params.set('logMain$Button1', 'Log In');

    await fetchWithRetry(client, {
        url: 'https://ucam.uiu.ac.bd/Security/LogIn.aspx',
        method: 'post',
        data: params.toString(),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Origin': 'https://ucam.uiu.ac.bd',
            'Referer': 'https://ucam.uiu.ac.bd/Security/LogIn.aspx'
        },
        maxRedirects: 0,
        validateStatus: (s: number) => s >= 200 && s < 400
    }, progress);

    const cookies = await jar.getCookies('https://ucam.uiu.ac.bd');
    if (!cookies.some(c => c.key === '.ASPXAUTH')) {
        throw new Error('Invalid UCAM Credentials or UCAM is down.');
    }

    // 3. Fetch Transcript / Result History
    await progress('Fetching transcript history...');
    const historyUrl = 'https://ucam.uiu.ac.bd/Student/StudentCourseHistory.aspx?mmi=40545a1642555b514e63';
    const historyRes = await fetchWithRetry(client, { url: historyUrl }, progress);
    const $h = cheerio.load(historyRes.data);

    // Compute fingerprint of transcript for change detection
    const ucamFingerprint = createHash('sha256').update(historyRes.data).digest('hex');

    // Parse extracted trimesters from #ctl00_MainContainer_gvResult
    const trimesters: any[] = [];
    const results: any[] = [];
    let earnedCreditsTotal = 0;

    const termRows = $h('#ctl00_MainContainer_gvResult tr').slice(1);
    termRows.each((_, el) => {
        const tds = $h(el).find('td');
        if (tds.length >= 4) {
            const trimesterName = $h(tds[0]).text().trim();
            const termCredit = parseFloat($h(tds[4]).text().trim()) || 0; // Credit(Transcript)
            const termGPA = parseFloat($h(tds[5]).text().trim()) || 0; // GPA(Transcript)
            const cgpa = parseFloat($h(tds[6]).text().trim()) || 0; // CGPA(Transcript)

            // Basic parsing of name: "243 - Fall 2024" to extract code "243" and name "Fall 2024"
            const codeMatch = trimesterName.match(/^(\d+) - (.*)$/);
            let trimesterCode = codeMatch ? codeMatch[1] : trimesterName;
            trimesterCode = trimesterCode.replace(/\s+/g, '');
            
            // Expand "243" into "Fall 2024" if the HTML only provided "243"
            const expandedName = getTrimesterName(trimesterCode);

            earnedCreditsTotal += termCredit;

            results.push({
                trimesterName: expandedName,
                trimesterCode,
                gpa: termGPA,
                cgpa: cgpa,
                trimesterCredits: termCredit,
                totalCredits: 0, // Will calculate later
                earnedCredits: termCredit,
            });

            trimesters.push({
                name: expandedName,
                code: trimesterCode,
                isCompleted: true,
                courses: []
            });
        }
    });

    // Parse course wise results from #ctl00_MainContainer_gvRegisteredCourse
    const courseRows = $h('#ctl00_MainContainer_gvRegisteredCourse tr').slice(1);
    courseRows.each((_, el) => {
        const tds = $h(el).find('td');
        if (tds.length >= 7) {
            const trimesterId = $h(tds[0]).text().trim(); // "243"
            let courseCode = $h(tds[1]).text().trim();
            // User requested no spaces in course codes
            courseCode = courseCode.replace(/\s+/g, '');
            
            const courseName = $h(tds[2]).text().trim();
            const credit = parseFloat($h(tds[3]).text().trim()) || 0;
            const grade = $h(tds[4]).text().trim();
            const point = parseFloat($h(tds[5]).text().trim()) || 0;
            const status = $h(tds[6]).text().trim(); // Status

            // Find the matching trimester
            let t = trimesters.find(t => t.code === trimesterId);
            if (!t) {
                // Course from a trimester not in the GPA table (e.g., current non-completed trimester)
                t = {
                    name: `Trimester ${trimesterId}`,
                    code: trimesterId,
                    isCompleted: false,
                    courses: []
                };
                trimesters.push(t);
            }

            t.courses.push({
                name: courseName,
                code: courseCode,
                credit,
                grade: grade || undefined,
                isRetake: status.toLowerCase().includes('retake'),
                assessments: [] // Will fetch marks next if possible
            });
        }
    });

    // We successfully have the transcript. 
    
    // ======================================
    // 4. FETCH ASSESSMENTS FOR ALL COURSES (ACTIVE & COMPLETED)
    // ======================================
    try {
        const targetUrls = [
            'https://ucam.uiu.ac.bd/Result/ItemWiseDetailsMarksForStudent.aspx?mmi=415d552c795d4d494e63', // Historical
            'https://ucam.uiu.ac.bd/Student/ItemWiseCrsDeshiMarksDetails.aspx?mmi=5a8ddv' // Active
        ];

        for (const marksUrl of targetUrls) {
            const marksRes = await fetchWithRetry(client, { url: marksUrl, validateStatus: (status: number) => status < 500 }, progress);
            if (marksRes.status === 404) continue;
            let $m = cheerio.load(marksRes.data);

            const batchMap = new Map<string, string>();
            $m('#ctl00_MainContainer_ddlAcaCalBatch option').each((_, el) => {
                const val = $m(el).attr('value');
                const text = $m(el).text();
                // Usually matches [108] or similar batch ids. BUT Active courses sometimes don't have brackets.
                // UCAM mixes formats. Let's just extract the raw text and map it via Trimester Code!
                if (val && val !== "0") {
                    const match = text.match(/\[(\d+)\]/);
                    if (match) {
                         batchMap.set(match[1], val); // e.g., '251' -> '108'
                    } else {
                         // Fallback matching: 'Spring 2025' -> '251'
                         const nameMatch = text.match(/(Spring|Summer|Fall)\s+(\d{4})/i);
                         if (nameMatch) {
                              // Spring 2025 -> 251
                              const termNum = nameMatch[1] === 'Spring' ? '1' : (nameMatch[1] === 'Summer' ? '2' : '3');
                              const yearCode = nameMatch[2].substring(2);
                              batchMap.set(`${yearCode}${termNum}`, val);
                         }
                    }
                }
            });

            for (const t of trimesters) {
                if (batchMap.has(t.code)) {
                    const batchVal = batchMap.get(t.code)!;
                    await progress(`Loading assessments for ${t.name}...`);
                    const postTrim = new URLSearchParams();
                    $m('input[type="hidden"]').each((_, el) => {
                        const name = $m(el).attr('name');
                        if (name && !postTrim.has(name)) postTrim.append(name, $m(el).attr('value') || '');
                    });
                    postTrim.set('__EVENTTARGET', 'ctl00$MainContainer$ddlAcaCalBatch');
                    postTrim.set('__EVENTARGUMENT', '');
                    postTrim.set('ctl00$MainContainer$ddlAcaCalBatch', batchVal);
                    
                    const postResTrim = await fetchWithRetry(client, {
                        url: marksUrl,
                        method: 'post',
                        data: postTrim.toString(),
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Referer': marksUrl }
                    }, progress);
                    
                    $m = cheerio.load(postResTrim.data);
                    
                    const marksCourses: any[] = [];
                    $m('#ctl00_MainContainer_ddlCourse option').each((_, el) => {
                        const val = $m(el).attr('value');
                        const text = $m(el).text();
                        if (val && val !== "0") marksCourses.push({ val, text });
                    });

                    for (const mc of marksCourses) {
                        const courseCodeMatch = mc.text.split(':')[0].replace(/\s+/g, '').toUpperCase();
                        const transcriptCourse = t.courses.find((c: any) => c.code.toUpperCase() === courseCodeMatch);
                        
                        // We only fetch if it hasn't successfully acquired valid assessments yet
                        if (transcriptCourse && (!transcriptCourse.assessments || transcriptCourse.assessments.length === 0)) {
                            try {
                                await progress(`Fetching marks for ${transcriptCourse.code}...`);
                                const postCourse = new URLSearchParams();
                                $m('input[type="hidden"]').each((_, el) => {
                                    const name = $m(el).attr('name');
                                    if (name && !postCourse.has(name)) postCourse.append(name, $m(el).attr('value') || '');
                                });
                                postCourse.set('ctl00$MainContainer$ddlAcaCalBatch', batchVal);
                                postCourse.set('ctl00$MainContainer$ddlCourse', mc.val);
                                postCourse.set('ctl00$MainContainer$btnLoad', 'Load');

                                const postResCourse = await fetchWithRetry(client, {
                                    url: marksUrl,
                                    method: 'post',
                                    data: postCourse.toString(),
                                    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Referer': marksUrl }
                                }, progress);
                                
                                const data = postResCourse.data;
                                if (!data.includes("No marks found") && !data.includes("Teacher did not visible")) {
                                    const $c = cheerio.load(data);
                                    const courseAssessments = parseAssessmentsTable($c, ucamId);
                                    if (courseAssessments.length > 0) {
                                        transcriptCourse.assessments = courseAssessments;
                                    }
                                }
                            } catch (courseErr) {
                                // One course failed — skip it, don't kill remaining courses
                                console.error(`Failed to fetch marks for ${transcriptCourse.code}:`, courseErr);
                                await progress(`Skipped ${transcriptCourse.code} (UCAM unresponsive)`);
                            }
                        }
                    }
                }
            }
        }
    } catch (err) {
        console.error("Non-fatal error fetching course assessments:", err);
    }

    // ======================================
    // 5. FALLBACK: Attendance from Student Home for current courses
    // ======================================
    try {
        // Find courses in non-completed trimesters that have no attendance assessment
        const currentCourses = trimesters
            .filter((t: any) => !t.isCompleted)
            .flatMap((t: any) => t.courses || []);

        const coursesNeedingAttendance = currentCourses.filter((c: any) => {
            const hasAttendance = (c.assessments || []).some(
                (a: any) => a.name?.toLowerCase().includes('attendance')
            );
            return !hasAttendance;
        });

        if (coursesNeedingAttendance.length > 0) {
            await progress('Fetching attendance from Student Home...');
            try {
                const attendanceRes = await fetchWithRetry(client, {
                    url: 'https://ucam.uiu.ac.bd/Security/StudentHome.aspx/GetStudentAttendanceSummary',
                    method: 'post',
                    data: JSON.stringify({ roll: ucamId }),
                    headers: {
                        'Content-Type': 'application/json; charset=utf-8',
                        'Accept': 'application/json',
                        'Referer': 'https://ucam.uiu.ac.bd/Security/StudentHome.aspx'
                    }
                }, progress);

                const attData: any[] = attendanceRes.data?.d || [];
                for (const course of coursesNeedingAttendance) {
                    const match = attData.find(
                        (a: any) => (a.FormalCode || '').replace(/\s+/g, '').toUpperCase() === course.code?.toUpperCase()
                    );
                    if (match && match.TotalClassHeld > 0) {
                        if (!course.assessments) course.assessments = [];
                        const present = match.PresentCount || 0;
                        const held = match.TotalClassHeld || 1;
                        const weight = 5;
                        const calculatedMark = Math.round((present / held) * weight * 100) / 100;
                        course.assessments.push({
                            name: 'Attendance',
                            totalMarks: weight,
                            obtainedMarks: calculatedMark,
                            weight,
                            isAttendance: true,
                        });
                    }
                }
            } catch (attErr) {
                console.error('Non-fatal: attendance fallback failed:', attErr);
            }
        }
    } catch (err) {
        console.error("Non-fatal error in attendance fallback:", err);
    }

    // Calculate total credits running total
    let runningTotal = 0;
    for (const r of results) {
        runningTotal += r.trimesterCredits;
        r.totalCredits = runningTotal;
    }

    // Try to get overall CGPA
    const overallCgpaText = $h('#ctl00_MainContainer_lblCGPA').text().replace('CGPA :', '').trim();
    const previousCGPA = parseFloat(overallCgpaText) || (results.length > 0 ? results[results.length-1].cgpa : 0);

    return {
        previousCredits: runningTotal,
        previousCGPA,
        earnedCredits: earnedCreditsTotal,
        trimesters,
        results,
        ucamFingerprint
    };
}
