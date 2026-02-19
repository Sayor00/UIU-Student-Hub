import mongoose from "mongoose";
import Program from "../models/Program";
import Course from "../models/Course";
import CareerPath from "../models/CareerPath";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("Please define the MONGODB_URI environment variable inside .env.local");
    process.exit(1);
}

const seedAcademicData = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB for seeding...");

        // 1. Clear existing data (optional, maybe safe to keep to avoid duplicates if running multiple times, but for seed let's upsert or clear)
        // For this implementation, I will upsert based on unique codes.

        // --- PROGRAMS ---
        console.log("Seeding Programs...");
        const programs = [
            {
                name: "Bachelor of Science in Computer Science and Engineering",
                code: "BSCSE",
                totalCredits: 137,
                department: "CSE",
                description: "Focuses on computing, programming, definitions, and problem-solving.",
            },
            {
                name: "Bachelor of Science in Data Science",
                code: "BSDS",
                totalCredits: 138, // Approximate based on typical engineering degrees
                department: "CSE",
                description: "Prepares graduates for the technological challenges of the 21st century with a focus on data.",
            },
        ];

        const programDocs = [];
        for (const prog of programs) {
            const doc = await Program.findOneAndUpdate(
                { code: prog.code },
                prog,
                { upsert: true, new: true }
            );
            programDocs.push(doc);
        }
        const bscseId = programDocs.find((p) => p.code === "BSCSE")?._id;
        const bsdsId = programDocs.find((p) => p.code === "BSDS")?._id;

        // --- COURSES ---
        console.log("Seeding Courses...");
        const courses = [
            // BSCSE Core / Common
            { code: "CSE 1110", title: "Introduction to Computer Systems", credit: 1, programId: bscseId, type: "Core" },
            { code: "CSE 1111", title: "Structured Programming Language", credit: 3, programId: bscseId, type: "Core" },
            { code: "CSE 1112", title: "Structured Programming Language Lab", credit: 1, programId: bscseId, type: "Core" },
            { code: "CSE 2213", title: "Discrete Mathematics", credit: 3, programId: bscseId, type: "Core" },
            { code: "CSE 1325", title: "Digital Logic Design", credit: 3, programId: bscseId, type: "Core" },
            { code: "CSE 2215", title: "Data Structures and Algorithms I", credit: 3, programId: bscseId, type: "Core" },
            { code: "CSE 2216", title: "Data Structures and Algorithms I Lab", credit: 1, programId: bscseId, type: "Core" },
            { code: "CSE 2218", title: "Data Structures and Algorithms II", credit: 3, programId: bscseId, type: "Core" }, // Sometimes II
            { code: "CSE 3411", title: "System Analysis and Design", credit: 3, programId: bscseId, type: "Core", careerTags: ["Software Engineering", "Product Management"] },
            { code: "CSE 3521", title: "Database Management Systems", credit: 3, programId: bscseId, type: "Core", careerTags: ["Software Engineering", "Data Science", "Backend"] },
            { code: "CSE 4451", title: "Human Computer Interaction", credit: 3, programId: bscseId, type: "Elective", careerTags: ["Frontend", "UX/UI"] },
            { code: "CSE 4165", title: "Web Programming", credit: 3, programId: bscseId, type: "Elective", careerTags: ["Frontend", "Full Stack", "Software Engineering"] },
            { code: "CSE 4889", title: "Machine Learning", credit: 3, programId: bscseId, type: "Elective", careerTags: ["AI", "Data Science"] },
            { code: "CSE 4891", title: "Data Mining", credit: 3, programId: bscseId, type: "Elective", careerTags: ["Data Science", "AI"] },

            // Math & Science
            { code: "MATH 1151", title: "Fundamental Calculus", credit: 3, programId: bscseId, type: "Core" },
            { code: "MATH 2183", title: "Calculus and Linear Algebra", credit: 3, programId: bscseId, type: "Core" },
            { code: "MATH 2205", title: "Probability and Statistics", credit: 3, programId: bscseId, type: "Core", careerTags: ["Data Science"] },
            { code: "PHY 2105", title: "Physics", credit: 3, programId: bscseId, type: "Core" },
            { code: "BIO 3105", title: "Biology for Engineers", credit: 3, programId: bscseId, type: "Core" },

            // GED
            { code: "ENG 1011", title: "English I", credit: 3, programId: bscseId, type: "GED" },
            { code: "SOC 2101", title: "Society, Environment and Engineering Ethics", credit: 3, programId: bscseId, type: "GED" },

            // BSDS Specific (if any unique ones mentioned)
            { code: "DS 1101", title: "Programming for Data Science", credit: 3, programId: bsdsId, type: "Core", careerTags: ["Data Science"] },
            // Reuse common courses for BSDS by creating duplicates linked to BSDS ID if needed, 
            // or just assume for this prototype we are mostly showing BSCSE structure but referencing them in "recommended" lists correctly.
            // For simplicity in this seed, I'll add a few BSDS specific ones.
        ];

        const courseDocs = [];
        for (const c of courses) {
            const doc = await Course.findOneAndUpdate(
                { code: c.code, programId: c.programId },
                c,
                { upsert: true, new: true }
            );
            courseDocs.push(doc);
        }

        // --- CAREER PATHS ---
        console.log("Seeding Career Paths...");
        const careerPaths = [
            {
                title: "Software Engineer",
                description: "Design, develop, and maintain software systems. Focus on coding, architecture, and system design.",
                programId: bscseId,
                recommendedCourses: ["CSE 1111", "CSE 2215", "CSE 3411", "CSE 3521", "CSE 4165"],
                requiredSkills: ["JavaScript", "Python", "System Design", "Databases"],
                jobRoles: ["Frontend Developer", "Backend Developer", "Full Stack Engineer"],
            },
            {
                title: "Data Scientist",
                description: "Analyze complex data to help organizations make better decisions. Focus on statistics, machine learning, and data mining.",
                programId: bscseId, // Also applicable to BSDS, but linking to BSCSE for now as per courses
                recommendedCourses: ["MATH 2205", "CSE 3521", "CSE 4889", "CSE 4891"],
                requiredSkills: ["Python", "SQL", "Statistics", "Machine Learning"],
                jobRoles: ["Data Analyst", "ML Engineer", "Data Scientist"],
            },
            {
                title: "AI Specialist",
                description: "Build intelligent systems that can simulate human cognitive functions.",
                programId: bscseId,
                recommendedCourses: ["CSE 1111", "CSE 2213", "MATH 2183", "CSE 4889"],
                requiredSkills: ["Python", "TensorFlow", "Math", "Neural Networks"],
                jobRoles: ["AI Researcher", "NLP Engineer", "Computer Vision Engineer"],
            },
        ];

        for (const cp of careerPaths) {
            await CareerPath.findOneAndUpdate(
                { title: cp.title },
                cp,
                { upsert: true, new: true }
            );
        }

        console.log("Seeding completed successfully!");
        mongoose.connection.close();
    } catch (error) {
        console.error("Error seeding data:", error);
        process.exit(1);
    }
};

seedAcademicData();
