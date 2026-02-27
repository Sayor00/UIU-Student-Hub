import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import SectionData from "@/models/SectionData";
import Program from "@/models/Program";
import Course from "@/models/Course";
import Faculty from "@/models/Faculty";
import Settings from "@/models/Settings";

// Helper for recursive search
function extractEntities(node: any, programs: Set<string>, courses: any[], faculties: any[], departments: Set<string>, currentDepartment: string = "Unknown") {
    if (!node || typeof node !== "object") return;

    if (Array.isArray(node)) {
        for (const item of node) {
            extractEntities(item, programs, courses, faculties, departments, currentDepartment);
        }
        return;
    }

    // It's an object. Check if it looks like a course
    if (node.course_code || node.formal_code || node.course_name) {
        if (node.formal_code && node.course_name) {
            courses.push({
                formal_code: node.formal_code,
                course_name: node.course_name,
                credits: node.credits || 3,
                department: currentDepartment,
            });
        }
    }

    // Check if it looks like a section/faculty
    if (node.faculty_name || node.faculty_code) {
        if (node.faculty_code && node.faculty_name) {
            faculties.push({
                name: node.faculty_name,
                initials: node.faculty_code,
                email: node.faculty_email || "",
                department: currentDepartment,
            });
        }
    }

    for (const [key, value] of Object.entries(node)) {
        let nextDept = currentDepartment;

        // Check for alphabetical program codes (e.g. BSCSE, BBA)
        if (key === key.toUpperCase() && key.length > 2 && key.length < 10 && typeof value === "object" && !/^\d+$/.test(key)) {
            // Highly likely to be a program code like BSCSE
            programs.add(key);

            // Map common program codes to their actual department name
            if (key === "BSCSE") nextDept = "CSE";
            else if (key === "BSEEE") nextDept = "EEE";
            else if (key === "BSCE") nextDept = "CE";
            else nextDept = key; // Use the raw key usually (like BBA, BSDS)
        }
        // Check for numeric program codes (e.g. 011 for CSE)
        else if (/^\d{3}$/.test(key) && typeof value === "object") {
            programs.add(key);

            if (key === "011") nextDept = "CSE";
            else if (key === "015") nextDept = "BSDS"; // Data Science
            else if (key === "111") nextDept = "BBA";
            else if (key === "114") nextDept = "BBA in AIS"; // Accounting
            else if (key === "121") nextDept = "EEE";
            else nextDept = "Unknown";
        }

        if (nextDept !== "Unknown" && nextDept !== "TBD" && nextDept) {
            departments.add(nextDept);
        }

        extractEntities(value, programs, courses, faculties, departments, nextDept);
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const adminUserId = (session.user as any).id;
        const { id } = await Promise.resolve(params);

        await connectDB();

        const dataset = await SectionData.findById(id);
        if (!dataset || dataset.type !== "json") {
            return NextResponse.json({ error: "Valid JSON dataset not found" }, { status: 404 });
        }

        const rawData = dataset.data;

        // Dynamic extract
        const programsSet = new Set<string>();
        const departmentsSet = new Set<string>();
        const extractedCourses: any[] = [];
        const extractedFaculties: any[] = [];

        extractEntities(rawData, programsSet, extractedCourses, extractedFaculties, departmentsSet);

        // Deduplicate
        const uniquePrograms = Array.from(programsSet);
        const uniqueCoursesMap = new Map();
        for (const c of extractedCourses) {
            uniqueCoursesMap.set(c.formal_code, c);
        }
        const uniqueCourses = Array.from(uniqueCoursesMap.values());

        const uniqueFacultiesMap = new Map();
        for (const f of extractedFaculties) {
            uniqueFacultiesMap.set(f.initials, f);
        }
        const uniqueFaculties = Array.from(uniqueFacultiesMap.values());

        // We don't want to assign default program to courses if we can't map them reliably,
        // so we just upsert Programs and Faculty, and conditionally Courses

        // 1. Upsert Programs
        let defaultProgramId = null;
        for (const progCode of uniquePrograms) {
            const p = await Program.findOneAndUpdate(
                { code: progCode },
                {
                    $setOnInsert: {
                        name: progCode + " Program",
                        code: progCode,
                        totalCredits: 130, // generic fallback
                        department: "TBD",
                    }
                },
                { upsert: true, new: true }
            );
            if (!defaultProgramId) defaultProgramId = p._id; // Just pick the first as a fallback
        }

        // If no programs found, we need a root program so Course validation doesn't fail
        if (!defaultProgramId && uniqueCourses.length > 0) {
            const fallbackProg = await Program.findOneAndUpdate(
                { code: "GENERIC" },
                {
                    $setOnInsert: {
                        name: "Generic Program",
                        code: "GENERIC",
                        totalCredits: 130,
                        department: "TBD",
                    }
                },
                { upsert: true, new: true }
            );
            defaultProgramId = fallbackProg._id;
        }

        // 2. Upsert Courses
        const courseOps = uniqueCourses.map(c => ({
            updateOne: {
                filter: { code: c.formal_code },
                update: {
                    $set: {
                        title: c.course_name,
                        credit: c.credits,
                    },
                    $setOnInsert: {
                        code: c.formal_code,
                        programId: defaultProgramId || undefined,
                        type: "Core" as const,
                        department: c.department || "Unknown",
                    }
                },
                upsert: true
            }
        }));
        if (courseOps.length > 0) {
            await Course.bulkWrite(courseOps);
        }

        // 3. Upsert Faculties
        const facultyOps = uniqueFaculties.map(f => ({
            updateOne: {
                filter: { initials: f.initials },
                update: {
                    $set: {
                        name: f.name,
                    },
                    $setOnInsert: {
                        initials: f.initials,
                        email: f.email,
                        department: f.department,
                        addedBy: adminUserId,
                        isApproved: true,
                    }
                },
                upsert: true
            }
        }));
        if (facultyOps.length > 0) {
            await Faculty.bulkWrite(facultyOps);
        }

        // 4. Upsert Departments into Settings
        const uniqueDepartments = Array.from(departmentsSet);
        if (uniqueDepartments.length > 0) {
            await Settings.findOneAndUpdate(
                { key: "academic_departments" },
                { $addToSet: { value: { $each: uniqueDepartments } } },
                { upsert: true }
            );
        }

        return NextResponse.json({
            success: true,
            summary: {
                programsFound: uniquePrograms.length,
                coursesFound: uniqueCourses.length,
                facultiesFound: uniqueFaculties.length,
                departmentsFound: uniqueDepartments.length,
            }
        });

    } catch (error: any) {
        console.error("Extraction error:", error);
        return NextResponse.json(
            { error: "Internal server error during extraction" },
            { status: 500 }
        );
    }
}
