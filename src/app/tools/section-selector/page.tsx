"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CourseCardSelector from "@/components/course-card-selector";
import SchedulePlanner from "@/components/schedule-planner";
import {
  exportPlanAsPDF,
  exportPlanAsPNG,
  exportPlanAsExcel,
  exportPlanAsCalendar,
  exportAllPlansAsPDF,
  exportAllPlansAsPNG,
  exportAllPlansAsExcel,
  exportAllPlansAsCalendar
} from "@/lib/exportUtils";

interface Course {
  program: string;
  courseCode: string;
  title: string;
  section: string;
  room1: string;
  room2: string;
  day1: string;
  day2: string;
  time1: string;
  time2: string;
  facultyName: string;
  facultyInitial: string;
  credit: string;
}

const parsePdfText = (text: string): Course[] => {


  const courses: Course[] = [];

  const cleanedText = text.replace(/(\d{1,2}:\d{2}:[AP]M)\s-\s(\d{1,2}:\d{2}:[AP]M)/g, '$1-$2');

  // Detect PDF format by looking for table headers
  // Format 1 (252): "Credit" header
  // Format 2 (253): "Cr." header
  let isFormat253 = false;
  let headerEndMarker = "";
  let startIndex = -1;

  // Try Format 1 (252) header
  startIndex = cleanedText.indexOf("Credit");
  if (startIndex !== -1) {
    headerEndMarker = "Credit";
    isFormat253 = false;

  } else {
    // Try Format 2 (253) header
    startIndex = cleanedText.indexOf("Cr.");
    if (startIndex !== -1) {
      headerEndMarker = "Cr.";
      isFormat253 = true;

    }
  }

  if (startIndex === -1) {
    console.error("Could not find the header in the PDF text.");

    toast.error("Parsing Error: Could not find the data table header in the PDF. The PDF format might be unsupported.");
    return [];
  }

  const courseDataText = cleanedText.substring(startIndex + headerEndMarker.length).trim();

  // Split courses based on format
  // Format 1 (252): Starts with serial number + program (e.g., "1 BSCSE")
  // Format 2 (253): Starts directly with program (e.g., "BSCSE" or "BSDS")
  const courseBlocks = isFormat253
    ? courseDataText.split(/(?=(?:BSCSE|BSDS)\s+[A-Z]{2,4}\s+\d{4})/).filter(block => block.trim() !== "")
    : courseDataText.split(/(?=\d+\s+(?:BSCSE|BSDS))/).filter(block => block.trim() !== "");



  courseBlocks.forEach((block) => {
    try {
      // Remove footer junk (Format 252: "CLASS ROUTINE 252", Format 253: "monir@admin.uiu.ac.bd")
      const junkKeywords = ['CLASS ROUTINE', 'United International University', 'Course Offerings', 'monir@admin.uiu'];
      let cleanText = block;
      junkKeywords.forEach((kw) => {
        const idx = cleanText.indexOf(kw);
        if (idx !== -1) {
          cleanText = cleanText.substring(0, idx).trim();
        }
      });
      let remainingBlock = cleanText.trim();

      // 1. Extract SL (if Format 252), Program, and Course Code
      let program = "";
      let courseCode = "";

      if (isFormat253) {
        // Format 253: No serial number, starts with "BSCSE CSE 2218" or "BSDS CSE 2218"
        const initialMatch = remainingBlock.match(/^(BSCSE|BSDS)\s+([A-Z]{2,4}\s+\d{4}[A-Z]?)/);
        if (!initialMatch) {
          console.warn(`Skipping block with unexpected start (253): ${block.substring(0, 100)}`);
          return;
        }
        program = initialMatch[1];
        courseCode = initialMatch[2];
        remainingBlock = remainingBlock.substring(initialMatch[0].length).trim();
      } else {
        // Format 252: Has serial number "1 BSCSE CSE 2218"
        const initialMatch = remainingBlock.match(/^(\d+)\s+(BSCSE|BSDS)\s+([A-Z]{2,4}\s+\d{4}[A-Z]?)/);
        if (!initialMatch) {
          console.warn(`Skipping block with unexpected start (252): ${block.substring(0, 100)}`);
          return;
        }
        program = initialMatch[2];
        courseCode = initialMatch[3];
        remainingBlock = remainingBlock.substring(initialMatch[0].length).trim();
      }

      // 4. Extract Faculty Name, Initial, and Credit by finding the last occurrence in the block
      // Extract faculty info by scanning for the last pattern of "Name Initial Credit"
      let facultyName = "TBA";
      let facultyInitial = "TBA";
      let credit = "0";
      const facultyPattern = /([A-Za-z.\s]+?)\s*([A-Za-z]{1,5}|TBA)\s*(\d)\b/g;
      let match: RegExpExecArray | null = null;
      let lastMatch: RegExpExecArray | null = null;
      while ((match = facultyPattern.exec(remainingBlock)) !== null) {
        lastMatch = match;
      }
      if (lastMatch) {
        facultyName = lastMatch[1].trim();
        facultyInitial = lastMatch[2];
        credit = lastMatch[3];
        remainingBlock = remainingBlock.substring(0, lastMatch.index).trim();
      } else {
        // If faculty info missing, still extract credit at end
        const creditOnlyMatch = remainingBlock.match(/(\d)\s*$/);
        if (creditOnlyMatch) {
          credit = creditOnlyMatch[1];
          // Remove credit from remainingBlock
          remainingBlock = remainingBlock.substring(0, creditOnlyMatch.index).trim();
        }
      }
      // Remove stray AM/PM tokens that belong to time, not name
      facultyName = facultyName.replace(/\b(AM|PM)\b/g, '').trim();

      // 5. Extract Times (one or two exact as in PDF)
      const timeRegex = /\d{1,2}:\d{2}:[AP]M-\d{1,2}:\d{2}:[AP]M/g;
      const rawTimeMatches = remainingBlock.match(timeRegex) || [];
      const times = rawTimeMatches.map(t => t.replace(/-/g, ' - '));
      const time1 = times[0] || '';
      const time2 = times[1] || '';
      if (rawTimeMatches.length > 0 && rawTimeMatches[0]) {
        const firstTime = rawTimeMatches[0];
        const idx = remainingBlock.indexOf(firstTime);
        if (idx !== -1) {
          remainingBlock = remainingBlock.substring(0, idx).trim();
        }
      }

      // 6. Extract Days (one or two exact as in PDF)
      const dayRegex = /Sat|Sun|Mon|Tue|Wed|Thu|Fri/g;
      const rawDayMatches = remainingBlock.match(dayRegex) || [];
      const day1 = rawDayMatches[0] || '';
      const day2 = rawDayMatches[1] || '';
      if (rawDayMatches.length > 0 && rawDayMatches[0]) {
        const firstDay = rawDayMatches[0];
        const idx = remainingBlock.indexOf(firstDay);
        if (idx !== -1) {
          remainingBlock = remainingBlock.substring(0, idx).trim();
        }
      }

      // 7. Extract Rooms (can be one or two, or none)
      const roomRegex = /\d{3}/g;
      const roomMatches = remainingBlock.match(roomRegex) || [];
      const room1 = roomMatches[0] || "TBA";
      const room2 = roomMatches[1] || (room1 === "TBA" ? "TBA" : room1);
      if (roomMatches.length > 0 && roomMatches[0]) {
        const firstRoomIndex = remainingBlock.indexOf(roomMatches[0]);
        if (firstRoomIndex !== -1) {
          remainingBlock = remainingBlock.substring(0, firstRoomIndex).trim();
        }
      }

      // 8. Extract Section (now supports multi-character sections like AC, AD, AE, AF)
      const sectionMatch = remainingBlock.match(/([A-Z]{1,2})(?:\s*\(If\s+Required\))?$/i);
      let section = "TBA";
      if (sectionMatch) {
        section = sectionMatch[1];
        remainingBlock = remainingBlock.substring(0, sectionMatch.index).trim();
      }

      // 9. Whatever is left is the Title
      const title = remainingBlock.trim();

      const course: Course = {
        program,
        courseCode,
        title,
        section,
        room1,
        room2,
        day1,
        day2,
        time1,
        time2,
        facultyName,
        facultyInitial,
        credit,
      };

      courses.push(course);
    } catch (e) {
      console.error(`Failed to parse block: "${block}"`, e);
    }
  });

  if (courses.length === 0 && courseBlocks.length > 0) {
    toast.error("Parsing Failed: Could not extract any course data, though blocks were found. The PDF structure might have changed.");
  }


  return courses;
};

const UploadView = ({ onPdfProcessed }: { onPdfProcessed: (courses: Course[]) => void }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const processJsonData = (data: any): Course[] => {
    const courses: Course[] = [];

    // Process each program (BSCSE, BSDS, etc.)
    Object.keys(data).forEach((programName) => {
      const programData = data[programName];
      if (programData && programData.status === "success" && programData.data && programData.data.courses) {

        programData.data.courses.forEach((courseObj: any) => {
          const formalCode = courseObj.formal_code || courseObj.course_code;
          const courseTitle = courseObj.course_name || "";

          if (courseObj.sections && Array.isArray(courseObj.sections)) {
            courseObj.sections.forEach((sec: any) => {
              const schedule = sec.schedule || [];
              let time1 = "", time2 = "";
              let day1 = "", day2 = "";

              if (schedule.length > 0) {
                day1 = schedule[0].day.substring(0, 3); // e.g., "Saturday" -> "Sat"
                time1 = `${schedule[0].start_time}-${schedule[0].end_time}`;
              }
              if (schedule.length > 1) {
                day2 = schedule[1].day.substring(0, 3);
                time2 = `${schedule[1].start_time}-${schedule[1].end_time}`;
              }

              courses.push({
                program: programName,
                courseCode: formalCode,
                title: courseTitle,
                section: sec.section_name || "TBA",
                room1: sec.room_details || "TBA",
                room2: sec.room_details || "TBA",
                day1,
                day2,
                time1,
                time2,
                facultyName: sec.faculty_name || "TBA",
                facultyInitial: sec.faculty_code || "TBA",
                credit: String(courseObj.credits || sec.credits || "0")
              });
            });
          }
        });
      }
    });

    return courses;
  };

  const handleFileChange = async (file: File | null) => {
    if (!file) return;

    setIsLoading(true);
    toast.info("Uploading and processing PDF...");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "An unknown error occurred during upload.");
      }

      const data = await response.json();
      if (data.text) {
        const parsedCourses = parsePdfText(data.text);
        onPdfProcessed(parsedCourses);
      } else {
        throw new Error("The PDF could not be read or is empty.");
      }
    } catch (error) {
      console.error("Error processing file:", error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("An unexpected error occurred.");
      }
      onPdfProcessed([]); // Send empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreUploadedLoad = async () => {
    setIsLoading(true);
    toast.info("Loading latest course data from UCAM...");
    try {
      const response = await fetch("/courses.json", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to load course data.");
      }

      const data = await response.json();
      const parsedCourses = processJsonData(data);
      if (parsedCourses.length > 0) {
        onPdfProcessed(parsedCourses);
        toast.success(`Loaded ${parsedCourses.length} course sections directly from UCAM!`);
      } else {
        throw new Error("No courses found in the data.");
      }
    } catch (error) {
      console.error("Error loading course data:", error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("An unexpected error occurred while loading data minimize your worries.");
      }
      onPdfProcessed([]); // Send empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") {
      handleFileChange(file);
    } else {
      toast.error("Please drop a PDF file.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4 text-lg">Processing PDF...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] px-3 pb-3 sm:px-4 sm:pb-4 md:px-6 md:pb-6">
      <Card
        className={`w-full max-w-lg border-2 border-dashed transition-colors ${isDragging ? 'border-primary bg-muted/50' : 'border-border'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardHeader className="text-center px-4 sm:px-6">
          <CardTitle className="text-xl sm:text-2xl">Choose Your Course Data</CardTitle>
          <CardDescription className="text-sm">Use pre-uploaded course data or upload your own PDF file</CardDescription>
        </CardHeader>
        <CardContent className="text-center p-4 sm:p-6">
          <div className="space-y-6">
            {/* Pre-uploaded Section */}
            <div className="space-y-3 p-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex items-center justify-center space-x-2">
                <span className="text-xl">🚀</span>
                <h3 className="font-semibold text-orange-700 dark:text-orange-300">Use Live UCAM Data</h3>
              </div>
              <Button
                size="lg"
                onClick={handlePreUploadedLoad}
                className="w-full font-semibold py-3 px-6 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Start with Latest Course Data
              </Button>
              <p className="text-sm text-orange-600 dark:text-orange-400">
                100% accurate formal data drawn straight from the cloud! No upload required.
              </p>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm uppercase">
                <span className="bg-background px-3 text-muted-foreground font-medium">Or</span>
              </div>
            </div>

            {/* Upload Section */}
            <div className="space-y-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-center space-x-2">
                <span className="text-xl">📁</span>
                <h3 className="font-semibold text-green-700 dark:text-green-300">Upload Your Own PDF</h3>
              </div>
              <div>
                <Input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)}
                  accept=".pdf"
                />
                <label htmlFor="file-upload" className="cursor-pointer block">
                  <Button asChild size="lg" className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 px-6 shadow-lg hover:shadow-xl transition-all duration-200">
                    <span>Select Your PDF File</span>
                  </Button>
                </label>
              </div>
              <p className="text-sm text-green-600 dark:text-green-400">
                Drag and drop or click to browse your files
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface SectionPlan {
  id: string;
  name: string;
  courses: Course[];
}

const DataView = ({ courses: initialCourses, onBack }: { courses: Course[], onBack: () => void }) => {
  const [filteredCourses, setFilteredCourses] = useState<Course[]>(initialCourses);
  const [sectionPlans, setSectionPlans] = useState<SectionPlan[]>([
    { id: '1', name: 'Section Plan 1', courses: [] }
  ]);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'card' | 'table' | 'planner'>('card');
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set(sectionPlans.map(p => p.id)));
  const [sectionPlansVisible, setSectionPlansVisible] = useState(false);

  // Refs for scrolling to specific plans
  const planRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  // Computed: all selected courses across all plans
  const selectedCourses = sectionPlans.flatMap(plan => plan.courses);

  const togglePlanExpanded = (planId: string) => {
    setExpandedPlans(prev => {
      const newSet = new Set(prev);
      if (newSet.has(planId)) {
        newSet.delete(planId);
      } else {
        newSet.add(planId);
      }
      return newSet;
    });
  };

  // Function to navigate to a specific plan
  const handleNavigateToPlan = (planId: string) => {
    // First, make sure Section Plans is visible
    setSectionPlansVisible(true);

    // Then, make sure the specific plan is expanded
    setExpandedPlans(prev => {
      const newSet = new Set(prev);
      newSet.add(planId);
      return newSet;
    });

    // Wait for state updates to render, then scroll
    setTimeout(() => {
      const planElement = planRefs.current.get(planId);
      if (planElement) {
        planElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });

        // Highlight the plan briefly
        planElement.classList.add('ring-4', 'ring-red-500');
        setTimeout(() => {
          planElement.classList.remove('ring-4', 'ring-red-500');
        }, 2000);
      }
    }, 100);
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const rawTerm = event.target.value;
    setSearchTerm(rawTerm);
    const term = rawTerm.toLowerCase().trim();

    const filtered = initialCourses.filter((course) => {
      const titleLower = course.title.toLowerCase();
      const codeLower = course.courseCode.toLowerCase();
      const facultyLower = course.facultyName.toLowerCase();
      const sectionLower = course.section.toLowerCase();
      const initialLower = course.facultyInitial.toLowerCase();

      // Basic matching
      if (titleLower.includes(term) || codeLower.includes(term) ||
        facultyLower.includes(term) || initialLower.includes(term) ||
        sectionLower.includes(term)) {
        return true;
      }

      // Dynamic uppercase letter extraction
      const upperCaseLetters = course.title.match(/[A-Z]/g);
      if (upperCaseLetters && upperCaseLetters.length >= 2) {
        const acronymFromUppercase = upperCaseLetters.join('').toLowerCase();
        if (acronymFromUppercase === term || acronymFromUppercase.includes(term) ||
          (term.length >= 2 && acronymFromUppercase.startsWith(term))) {
          return true;
        }
      }

      // Dynamic acronym from title, skipping common stop words
      const stopWords = ['and', 'of', 'the', 'for', 'if', 'required', 'a', 'an', 'in', 'on', 'to', 'using', 'lab', 'laboratory', 'introduction', 'basic', 'advanced', 'theory', 'practical'];
      const titleWords = course.title.split(/\s+/).filter(w =>
        w.length > 1 && !stopWords.includes(w.toLowerCase())
      );

      if (titleWords.length >= 2) {
        // Full acronym from first letters
        const acronym = titleWords.map(w => w[0]).join('').toLowerCase();
        if (acronym === term || acronym.includes(term) || term.includes(acronym)) {
          return true;
        }

        // Partial acronyms
        for (let i = 2; i <= Math.min(titleWords.length, term.length + 2); i++) {
          const partialAcronym = titleWords.slice(0, i).map(w => w[0]).join('').toLowerCase();
          if (partialAcronym === term) {
            return true;
          }
        }

        // Sliding window acronyms
        for (let start = 0; start <= titleWords.length - 2; start++) {
          for (let length = 2; length <= Math.min(4, titleWords.length - start); length++) {
            const slidingAcronym = titleWords.slice(start, start + length)
              .map(w => w[0]).join('').toLowerCase();
            if (slidingAcronym === term) {
              return true;
            }
          }
        }
      }

      // Check if search term matches the start of any significant word
      if (titleWords.length > 0) {
        const matchesWordStart = titleWords.some(word =>
          word.toLowerCase().startsWith(term) && term.length >= 2
        );
        if (matchesWordStart) {
          return true;
        }
      }

      return false;
    });
    setFilteredCourses(filtered);
  };

  const handleSelectCourse = (course: Course, planId?: string) => {
    // If planId is not provided, check if course exists in any plan and remove it from ALL plans
    if (!planId) {
      const plansWithCourse = sectionPlans.filter(plan =>
        plan.courses.some(c => c.courseCode === course.courseCode && c.section === course.section)
      );

      if (plansWithCourse.length > 0) {
        // Remove from all plans that have this course
        setSectionPlans(prev => prev.map(plan => ({
          ...plan,
          courses: plan.courses.filter(c => !(c.courseCode === course.courseCode && c.section === course.section))
        })));
        toast.info(`Removed ${course.courseCode} ${course.section} from all plans`);
        return;
      }

      // If not in any plan and no planId specified, add to first plan
      planId = sectionPlans[0].id;
    }

    // Determine target plan
    const targetPlanId = planId;
    const targetPlan = sectionPlans.find(p => p.id === targetPlanId);

    if (!targetPlan) return;

    // Check if target plan already has this exact course (same course code AND section)
    const exactCourseInTargetPlan = targetPlan.courses.find(
      c => c.courseCode === course.courseCode && c.section === course.section
    );

    if (exactCourseInTargetPlan) {
      // This exact course is already in the target plan, so remove it
      const planName = targetPlan.name;
      setSectionPlans(prev => prev.map(plan =>
        plan.id === targetPlanId
          ? { ...plan, courses: plan.courses.filter(c => !(c.courseCode === course.courseCode && c.section === course.section)) }
          : plan
      ));
      toast.info(`Removed ${course.courseCode} ${course.section} from ${planName}`);
      return;
    }

    // Check if target plan already has this course with a different section
    const existingCourseInPlan = targetPlan.courses.find(c => c.courseCode === course.courseCode);

    if (existingCourseInPlan) {
      // Don't allow adding the same course (different section) to the same plan
      toast.error(`${course.courseCode} is already in ${targetPlan.name}. Use move/swap to exchange sections.`);
      return;
    }

    // Add to target plan
    const planName = targetPlan.name;
    setSectionPlans(prev => prev.map(plan =>
      plan.id === targetPlanId
        ? { ...plan, courses: [...plan.courses, course] }
        : plan
    ));

    toast.success(`Added ${course.courseCode} ${course.section} to ${planName}`);
  };

  const handleMoveCourse = (course: Course, fromPlanId: string, toPlanId: string) => {
    setSectionPlans(prev => {
      const newPlans = prev.map(plan => ({ ...plan, courses: [...plan.courses] }));

      // Find the source and target plans
      const fromPlan = newPlans.find(p => p.id === fromPlanId);
      const toPlan = newPlans.find(p => p.id === toPlanId);

      if (!fromPlan || !toPlan) return prev;

      // Find the course in the source plan
      const courseIndex = fromPlan.courses.findIndex(
        c => c.courseCode === course.courseCode && c.section === course.section
      );

      if (courseIndex === -1) return prev;

      // Check if target plan has the same course (same course code, any section)
      const existingCourseIndex = toPlan.courses.findIndex(
        c => c.courseCode === course.courseCode
      );

      if (existingCourseIndex !== -1) {
        // SWAP: Exchange the courses
        const existingCourse = toPlan.courses[existingCourseIndex];
        const movingCourse = fromPlan.courses[courseIndex];

        // Get plan names for toast
        const fromPlanName = prev.find(p => p.id === fromPlanId)?.name || 'Plan';
        const toPlanName = prev.find(p => p.id === toPlanId)?.name || 'Plan';

        // Replace in target plan
        toPlan.courses[existingCourseIndex] = movingCourse;

        // Replace in source plan
        fromPlan.courses[courseIndex] = existingCourse;

        toast.success(`Swapped ${course.courseCode} sections between plans`, {
          description: `${fromPlanName}: Section ${existingCourse.section} ↔ ${toPlanName}: Section ${movingCourse.section}`
        });
      } else {
        // MOVE: Just move the course
        const [movedCourse] = fromPlan.courses.splice(courseIndex, 1);
        toPlan.courses.push(movedCourse);

        const fromPlanName = prev.find(p => p.id === fromPlanId)?.name || 'Plan';
        const toPlanName = prev.find(p => p.id === toPlanId)?.name || 'Plan';

        toast.success(`Moved ${course.courseCode} from ${fromPlanName} to ${toPlanName}`);
      }

      return newPlans;
    });
  };

  const handleRemoveCourse = (course: Course, planId: string) => {
    setSectionPlans(prev => prev.map(plan =>
      plan.id === planId
        ? { ...plan, courses: plan.courses.filter(c => !(c.courseCode === course.courseCode && c.section === course.section)) }
        : plan
    ));
  };

  const handleAddNewPlan = () => {
    const newId = (Math.max(...sectionPlans.map(p => parseInt(p.id)), 0) + 1).toString();
    setSectionPlans(prev => [...prev, {
      id: newId,
      name: `Section Plan ${newId}`,
      courses: []
    }]);
    // Expand the newly created plan
    setExpandedPlans(prev => new Set([...prev, newId]));
    toast.success('New section plan added');
  };

  const handleAddPlanFromSchedule = (courses: Course[], scheduleName: string) => {
    // Find a unique name by checking existing plan names
    let finalName = scheduleName;
    let counter = 1;

    // Extract the base name and number if it exists
    const baseNameMatch = scheduleName.match(/^(.*?)(\d+)$/);
    const baseName = baseNameMatch ? baseNameMatch[1].trim() : scheduleName;

    // Check if name exists and increment until we find a unique one
    while (sectionPlans.some(plan => plan.name === finalName)) {
      counter++;
      finalName = `${baseName} ${counter}`;
    }

    const newId = (Math.max(...sectionPlans.map(p => parseInt(p.id)), 0) + 1).toString();
    setSectionPlans(prev => [...prev, {
      id: newId,
      name: finalName,
      courses: courses
    }]);
    // Expand the newly created plan
    setExpandedPlans(prev => new Set([...prev, newId]));
    // Stay in Schedule Planner view
    toast.success(`Added "${finalName}" as a new section plan`);
  };

  const handleDeletePlan = (planId: string) => {
    if (sectionPlans.length === 1) {
      toast.error('Cannot delete the last plan');
      return;
    }
    setSectionPlans(prev => prev.filter(p => p.id !== planId));
    // Remove from expanded plans
    setExpandedPlans(prev => {
      const newSet = new Set(prev);
      newSet.delete(planId);
      return newSet;
    });
    toast.success('Section plan deleted');
  };

  const handleRenamePlan = (planId: string, newName: string) => {
    setSectionPlans(prev => prev.map(plan =>
      plan.id === planId ? { ...plan, name: newName } : plan
    ));
  };

  const handleClearAllSelected = () => {
    setSectionPlans(prev => prev.map(plan => ({ ...plan, courses: [] })));
  };

  const isCourseSelected = (course: Course) => {
    return selectedCourses.some(c => c.courseCode === course.courseCode && c.section === course.section);
  }

  // Helper function to check for conflicts within a specific plan
  const hasConflictInPlan = (course: Course, plan: SectionPlan): boolean => {
    const parseTime = (timeStr: string): { start: number; end: number } | null => {
      if (!timeStr) return null;

      // Updated regex to handle formats like "11:11:AM - 12:30:PM" (no space before AM/PM)
      const match = timeStr.match(/(\d+):(\d+)\s*:?\s*([AP]M)?\s*-\s*(\d+):(\d+)\s*:?\s*([AP]M)?/i);

      if (!match) return null;

      let startHour = parseInt(match[1]);
      const startMin = parseInt(match[2]);
      const startPeriod = match[3]?.toUpperCase();
      let endHour = parseInt(match[4]);
      const endMin = parseInt(match[5]);
      const endPeriod = match[6]?.toUpperCase();

      // If no period specified for start, inherit from end
      const effectiveStartPeriod = startPeriod || endPeriod;
      const effectiveEndPeriod = endPeriod || startPeriod;

      if (effectiveStartPeriod === 'PM' && startHour !== 12) startHour += 12;
      if (effectiveStartPeriod === 'AM' && startHour === 12) startHour = 0;
      if (effectiveEndPeriod === 'PM' && endHour !== 12) endHour += 12;
      if (effectiveEndPeriod === 'AM' && endHour === 12) endHour = 0;

      return {
        start: startHour * 60 + startMin,
        end: endHour * 60 + endMin
      };
    };

    const timesOverlap = (time1: string, time2: string): boolean => {
      const t1 = parseTime(time1);
      const t2 = parseTime(time2);
      if (!t1 || !t2) return false;
      return (t1.start < t2.end) && (t2.start < t1.end);
    };

    const courseDays = [course.day1, course.day2].filter(Boolean);
    const courseTimes = [course.time1, course.time2].filter(Boolean);

    return plan.courses.some(existingCourse => {
      if (existingCourse.courseCode === course.courseCode &&
        existingCourse.section === course.section) {
        return false;
      }

      const existingDays = [existingCourse.day1, existingCourse.day2].filter(Boolean);
      const existingTimes = [existingCourse.time1, existingCourse.time2].filter(Boolean);

      const hasCommonDay = courseDays.some(day => existingDays.includes(day));
      if (!hasCommonDay) return false;

      return courseTimes.some(time =>
        existingTimes.some(existingTime => timesOverlap(time, existingTime))
      );
    });
  };

  return (
    <div className="container mx-auto px-3 pb-3 sm:px-4 sm:pb-4 md:px-6 md:pb-6 min-h-[calc(100vh-8rem)]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4">
        <Button onClick={onBack} size="sm" className="w-full sm:w-auto">Back to Upload</Button>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button
            variant={viewMode === 'card' ? 'default' : 'outline'}
            onClick={() => setViewMode('card')}
            size="sm"
            className="flex-1 sm:flex-none text-xs sm:text-sm"
          >
            Card Selector
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            onClick={() => setViewMode('table')}
            size="sm"
            className="flex-1 sm:flex-none text-xs sm:text-sm"
          >
            Bulk Selector
          </Button>
          <Button
            variant={viewMode === 'planner' ? 'default' : 'outline'}
            onClick={() => setViewMode('planner')}
            size="sm"
            className="flex-1 sm:flex-none text-xs sm:text-sm"
          >
            Schedule Planner
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {/* Show Section Plans in all views */}
        <div className="w-full space-y-4">
          {/* Add New Plan and Export All Buttons */}
          <div className="flex flex-col gap-3">
            <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between bg-muted/30 hover:bg-muted/60 px-3 sm:px-4 py-3 rounded-lg transition-colors border border-border shadow-sm gap-2">
              <button
                onClick={() => setSectionPlansVisible(!sectionPlansVisible)}
                className="flex items-center gap-2 cursor-pointer flex-1 w-full sm:w-auto"
              >
                <span className="text-lg font-semibold">
                  {sectionPlansVisible ? '▼' : '▶'}
                </span>
                <h2 className="text-lg sm:text-xl font-semibold">Section Plans</h2>
                <span className="text-xs sm:text-sm text-muted-foreground ml-1">
                  ({sectionPlans.length} plan{sectionPlans.length !== 1 ? 's' : ''})
                </span>
              </button>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <Button onClick={handleAddNewPlan} size="sm" variant="outline" className="text-xs sm:text-sm flex-1 sm:flex-none">
                  + Add New Plan
                </Button>
                {sectionPlans.length > 0 && sectionPlans.some(p => p.courses.length > 0) && (
                  <Select value="" onValueChange={(value) => {
                    const plansWithCourses = sectionPlans.filter(p => p.courses.length > 0);
                    if (value === 'pdf') exportAllPlansAsPDF(plansWithCourses);
                    else if (value === 'png') exportAllPlansAsPNG(plansWithCourses);
                    else if (value === 'excel') exportAllPlansAsExcel(plansWithCourses);
                    else if (value === 'calendar') exportAllPlansAsCalendar(plansWithCourses);
                  }}>
                    <SelectTrigger className="h-9 text-xs sm:text-sm w-full sm:w-[140px] md:w-[160px]">
                      <SelectValue placeholder="Export All as..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">📄 PDF</SelectItem>
                      <SelectItem value="png">🖼️ PNG</SelectItem>
                      <SelectItem value="excel">📊 Excel</SelectItem>
                      <SelectItem value="calendar">📅 Calendar</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>

          {/* Section Plans */}
          {sectionPlansVisible && sectionPlans.map((plan) => (
            <Card
              key={plan.id}
              id={`plan-card-${plan.id}`}
              className="transition-all duration-300"
              ref={(el) => {
                if (el) {
                  planRefs.current.set(plan.id, el);
                } else {
                  planRefs.current.delete(plan.id);
                }
              }}
            >
              <CardHeader className="px-4 sm:px-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => togglePlanExpanded(plan.id)}
                      className="p-1 h-auto"
                    >
                      {expandedPlans.has(plan.id) ? '▼' : '▶'}
                    </Button>
                    <Input
                      value={plan.name}
                      onChange={(e) => handleRenamePlan(plan.id, e.target.value)}
                      className="text-base sm:text-lg font-semibold max-w-xs"
                    />
                    <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                      ({plan.courses.length} course{plan.courses.length !== 1 ? 's' : ''})
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
                    {plan.courses.length > 0 && (
                      <Select value="" onValueChange={(value) => {
                        if (value === 'pdf') exportPlanAsPDF(plan);
                        else if (value === 'png') exportPlanAsPNG(plan);
                        else if (value === 'excel') exportPlanAsExcel(plan);
                        else if (value === 'calendar') exportPlanAsCalendar(plan);
                      }}>
                        <SelectTrigger className="h-8 text-xs w-full sm:w-[100px] md:w-[120px]">
                          <SelectValue placeholder="Export as..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pdf">📄 PDF</SelectItem>
                          <SelectItem value="png">🖼️ PNG</SelectItem>
                          <SelectItem value="excel">📊 Excel</SelectItem>
                          <SelectItem value="calendar">📅 Calendar</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    {sectionPlans.length > 1 && (
                      <Button
                        onClick={() => handleDeletePlan(plan.id)}
                        size="sm"
                        variant="destructive"
                        className="text-xs w-full sm:w-auto"
                      >
                        Delete Plan
                      </Button>
                    )}
                  </div>
                </div>
                <CardDescription>
                  {plan.courses.length === 0
                    ? 'No sections selected in this plan.'
                    : 'Selected sections for this plan.'}
                </CardDescription>
              </CardHeader>
              {expandedPlans.has(plan.id) && (
                <CardContent className="px-4 sm:px-6">
                  {plan.courses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Start selecting courses from the options below.
                    </p>
                  ) : (
                    <div className="overflow-x-auto max-h-[40vh] w-full border rounded-md" id={`plan-table-${plan.id}`}>
                      <table className="w-full border-collapse min-w-[900px]">
                        <thead>
                          <tr>
                            <th className="sticky top-0 bg-background z-20 border-b px-2 py-2 sm:py-3 text-left font-medium text-xs sm:text-sm">Course Code</th>
                            <th className="sticky top-0 bg-background z-20 border-b px-2 py-2 sm:py-3 text-left font-medium text-xs sm:text-sm">Course Name</th>
                            <th className="sticky top-0 bg-background z-20 border-b px-2 py-2 sm:py-3 text-left font-medium text-xs sm:text-sm">Section</th>
                            <th className="sticky top-0 bg-background z-20 border-b px-2 py-2 sm:py-3 text-left font-medium text-xs sm:text-sm">Faculty</th>
                            <th className="sticky top-0 bg-background z-20 border-b px-2 py-2 sm:py-3 text-left font-medium text-xs sm:text-sm">Credit</th>
                            <th className="sticky top-0 bg-background z-20 border-b px-2 py-2 sm:py-3 text-left font-medium text-xs sm:text-sm">Days</th>
                            <th className="sticky top-0 bg-background z-20 border-b px-2 py-2 sm:py-3 text-left font-medium text-xs sm:text-sm">Time</th>
                            <th className="sticky top-0 bg-background z-20 border-b px-2 py-2 sm:py-3 text-left font-medium text-xs sm:text-sm">Room</th>
                            <th className="sticky top-0 bg-background z-20 border-b px-2 py-2 sm:py-3 text-left font-medium text-xs sm:text-sm">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {plan.courses.map((course, index) => {
                            const hasConflict = hasConflictInPlan(course, plan);
                            return (
                              <tr
                                key={`${plan.id}-${course.courseCode}-${course.section}-${index}`}
                                className={`border-b hover:bg-muted/50 ${hasConflict ? 'bg-red-50 dark:bg-red-950/20' : ''}`}
                              >
                                <td className="px-2 py-1 break-words text-xs sm:text-sm">
                                  {hasConflict && <span className="text-red-600 mr-1">⚠️</span>}
                                  {course.courseCode}
                                </td>
                                <td className="px-2 py-1 break-words text-xs sm:text-sm">{course.title}</td>
                                <td className="px-2 py-1 break-words text-xs sm:text-sm">{course.section}</td>
                                <td className="px-2 py-1 break-words text-xs sm:text-sm">
                                  {course.facultyName === "TBA"
                                    ? "TBA"
                                    : `${course.facultyName} (${course.facultyInitial})`}
                                </td>
                                <td className="px-2 py-1 break-words text-xs sm:text-sm">{course.credit}</td>
                                <td className="px-2 py-1 break-words text-xs sm:text-sm whitespace-nowrap">
                                  {course.day1}{course.day2 ? ` - ${course.day2}` : ''}
                                </td>
                                <td className="px-2 py-1 break-words text-xs sm:text-sm whitespace-nowrap">
                                  {course.time1}
                                  {course.time2 && course.time2 !== course.time1 && (
                                    <div>{course.time2}</div>
                                  )}
                                </td>
                                <td className="px-2 py-1 break-words text-xs sm:text-sm">
                                  {course.room1}{course.room2 && course.room2 !== course.room1 ? ` - ${course.room2}` : ''}
                                </td>
                                <td className="px-2 py-1">
                                  <div className="flex gap-1 whitespace-nowrap">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleRemoveCourse(course, plan.id)}
                                      className="text-xs"
                                    >
                                      Remove
                                    </Button>
                                    {sectionPlans.length > 1 && (
                                      <Select
                                        value=""
                                        onValueChange={(toPlanId) => handleMoveCourse(course, plan.id, toPlanId)}
                                      >
                                        <SelectTrigger className="h-8 text-xs w-[100px]">
                                          <SelectValue placeholder="Move to..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {sectionPlans
                                            .filter(p => p.id !== plan.id)
                                            .map(p => {
                                              const wouldConflict = hasConflictInPlan(course, p);
                                              const alreadyHasCourse = p.courses.some(c =>
                                                c.courseCode === course.courseCode && c.section === course.section
                                              );

                                              return (
                                                <SelectItem
                                                  key={p.id}
                                                  value={p.id}
                                                  className={`text-xs ${wouldConflict ? 'text-red-600 dark:text-red-400' : ''}`}
                                                  disabled={alreadyHasCourse}
                                                >
                                                  {wouldConflict && '⚠️ '}
                                                  {p.name}
                                                  {alreadyHasCourse ? ' (Has this)' : wouldConflict ? ' (Will conflict)' : ''}
                                                </SelectItem>
                                              );
                                            })}
                                        </SelectContent>
                                      </Select>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {/* Content based on view mode */}
        {viewMode === 'planner' ? (
          <SchedulePlanner courses={initialCourses} onAddPlanFromSchedule={handleAddPlanFromSchedule} />
        ) : viewMode === 'card' ? (
          <CourseCardSelector
            courses={initialCourses}
            sectionPlans={sectionPlans}
            onCourseSelect={handleSelectCourse}
            onClearAllSelected={handleClearAllSelected}
            onNavigateToPlan={handleNavigateToPlan}
          />
        ) : (
          <div className="w-full">
            <Card>
              <CardHeader>
                <CardTitle>Available Courses</CardTitle>
                <CardDescription>
                  Found {initialCourses.length} course entries. Click on a row to select a course section.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  type="text"
                  placeholder="Search by course, title, faculty, or section"
                  value={searchTerm}
                  onChange={handleSearch}
                  className="mb-4 text-sm"
                />
                <div className="overflow-x-auto max-h-[60vh] w-full border rounded-md">
                  <table className="w-full border-collapse min-w-[800px]">
                    <thead>
                      <tr>
                        <th className="sticky top-0 bg-background z-20 border-b px-2 py-2 sm:py-3 text-left font-medium text-xs sm:text-sm">Code</th>
                        <th className="sticky top-0 bg-background z-20 border-b px-2 py-2 sm:py-3 text-left font-medium text-xs sm:text-sm">Title</th>
                        <th className="sticky top-0 bg-background z-20 border-b px-2 py-2 sm:py-3 text-left font-medium text-xs sm:text-sm">Sec</th>
                        <th className="sticky top-0 bg-background z-20 border-b px-2 py-2 sm:py-3 text-left font-medium text-xs sm:text-sm">Faculty</th>
                        <th className="sticky top-0 bg-background z-20 border-b px-2 py-2 sm:py-3 text-left font-medium text-xs sm:text-sm">Credit</th>
                        <th className="sticky top-0 bg-background z-20 border-b px-2 py-2 sm:py-3 text-left font-medium text-xs sm:text-sm">Schedule</th>
                        <th className="sticky top-0 bg-background z-20 border-b px-2 py-2 sm:py-3 text-left font-medium text-xs sm:text-sm">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCourses.map((course, index) => (
                        <tr
                          key={`${course.courseCode}-${course.section}-${index}`}
                          className={`border-b hover:bg-muted/50 ${isCourseSelected(course) ? 'bg-muted' : ''}`}
                        >
                          <td className="px-2 py-1 break-words text-xs sm:text-sm">{course.courseCode}</td>
                          <td className="px-2 py-1 break-words text-xs sm:text-sm">{course.title}</td>
                          <td className="px-2 py-1 break-words text-xs sm:text-sm">{course.section}</td>
                          <td className="px-2 py-1 break-words text-xs sm:text-sm">
                            {course.facultyName === "TBA"
                              ? "TBA"
                              : `${course.facultyName} (${course.facultyInitial})`}
                          </td>
                          <td className="px-2 py-1 break-words text-xs sm:text-sm">{course.credit}</td>
                          <td className="px-2 py-1 text-xs sm:text-sm">
                            <div className="whitespace-nowrap">Day(s): {course.day1}{course.day2 ? ` - ${course.day2}` : ''}</div>
                            {course.time1 && (<div className="whitespace-nowrap">Time: {course.time1}</div>)}
                            {course.room1 && (<div>Room: {course.room1}</div>)}
                          </td>
                          <td className="px-2 py-1">
                            {sectionPlans.length === 1 ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSelectCourse(course, sectionPlans[0].id)}
                                className="text-xs"
                                disabled={sectionPlans[0].courses.some(c => c.courseCode === course.courseCode)}
                                title={sectionPlans[0].courses.some(c => c.courseCode === course.courseCode)
                                  ? `${course.courseCode} already in plan`
                                  : 'Add to plan'}
                              >
                                {sectionPlans[0].courses.some(c => c.courseCode === course.courseCode)
                                  ? 'Already Added'
                                  : 'Add'}
                              </Button>
                            ) : (
                              <Select onValueChange={(planId) => handleSelectCourse(course, planId)}>
                                <SelectTrigger className="h-8 text-xs w-[90px]">
                                  <SelectValue placeholder="Add to..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {sectionPlans.map(p => {
                                    const alreadyHasCourse = p.courses.some(c => c.courseCode === course.courseCode);
                                    return (
                                      <SelectItem
                                        key={p.id}
                                        value={p.id}
                                        className="text-xs"
                                        disabled={alreadyHasCourse}
                                      >
                                        {p.name} {alreadyHasCourse ? '(Has this)' : ''}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};


export default function SectionSelectorPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [view, setView] = useState<'upload' | 'data'>('upload');

  const handlePdfProcessed = (parsedCourses: Course[]) => {
    if (parsedCourses.length > 0) {
      setCourses(parsedCourses);
      setView('data');
      toast.success(`Successfully parsed ${parsedCourses.length} courses.`);
    } else {
      // Error toast is handled in UploadView
      setView('upload');
    }
  };

  const handleBack = () => {
    setView('upload');
    setCourses([]);
  }

  return (
    <>
      <div className="container mx-auto px-3 sm:px-4 md:px-6 pt-6 sm:pt-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 sm:gap-4 mb-6 sm:mb-8"
        >
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-orange-500/20">
            <CalendarDays className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl font-bold">UIU Section Selector</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Smart course scheduling for university students
            </p>
          </div>
        </motion.div>
      </div>

      {view === 'upload' ? (
        <UploadView onPdfProcessed={handlePdfProcessed} />
      ) : (
        <DataView courses={courses} onBack={handleBack} />
      )}
    </>
  );
}
