"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { CalendarDays, Bot, Trash2, Plus, Play, Square, Globe, User, Terminal, CheckCircle2, XCircle, Rocket } from "lucide-react";
import { useSession } from "next-auth/react";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
  const [datasets, setDatasets] = useState<any[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");

  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        const res = await fetch("/api/section-selector?action=list");
        if (res.ok) {
          const { datasets } = await res.json();
          setDatasets(datasets);
          const active = datasets.find((d: any) => d.isActive);
          if (active) setSelectedDatasetId(active._id);
          else if (datasets.length > 0) setSelectedDatasetId(datasets[0]._id);
        }
      } catch (err) {
        console.error("Failed to fetch datasets", err);
      }
    };
    fetchDatasets();
  }, []);

  const processJsonData = (data: any): Course[] => {
    const courses: Course[] = [];

    // Helper to format 'HH:MM' or 'HH:MM:SS' into 'h:mm AM/PM'
    const formatTime12Hour = (timeStr: string) => {
      if (!timeStr) return "";
      const [hoursStr, minutesStr] = timeStr.split(":");
      const hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);

      const period = hours >= 12 ? 'PM' : 'AM';
      const hours12 = hours % 12 || 12; // Convert 0 to 12

      return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
    };

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
                time1 = `${formatTime12Hour(schedule[0].start_time)}-${formatTime12Hour(schedule[0].end_time)}`;
              }
              if (schedule.length > 1) {
                day2 = schedule[1].day.substring(0, 3);
                time2 = `${formatTime12Hour(schedule[1].start_time)}-${formatTime12Hour(schedule[1].end_time)}`;
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
    if (!selectedDatasetId) {
      toast.error("Please select a dataset to load.");
      return;
    }

    setIsLoading(true);
    toast.info("Loading selected course data...");
    try {
      const response = await fetch(`/api/section-selector?id=${selectedDatasetId}`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to load course data.");
      }

      const responseBody = await response.json();

      let parsedCourses: Course[] = [];

      if (responseBody.type === "json") {
        parsedCourses = processJsonData(responseBody.data);
      } else if (responseBody.type === "pdf") {
        parsedCourses = parsePdfText(responseBody.data.text);
      }

      if (parsedCourses.length > 0) {
        onPdfProcessed(parsedCourses);
        toast.success(`Loaded ${parsedCourses.length} course sections directly from: ${responseBody.title}`);
      } else {
        throw new Error("No courses found in the selected dataset.");
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

              {datasets.length > 0 ? (
                <div className="my-3 text-left">
                  <Select value={selectedDatasetId} onValueChange={setSelectedDatasetId}>
                    <SelectTrigger className="w-full bg-background border-orange-200 dark:border-orange-800/50">
                      <SelectValue placeholder="Select a dataset..." />
                    </SelectTrigger>
                    <SelectContent>
                      {datasets.map((d: any) => (
                        <SelectItem key={d._id} value={d._id}>
                          {d.title} {d.isActive ? "(Default)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="my-3 text-sm text-center text-orange-600/70 dark:text-orange-400/70">
                  Loading available datasets...
                </div>
              )}

              <Button
                size="lg"
                onClick={handlePreUploadedLoad}
                className="w-full font-semibold py-3 px-6 shadow-lg hover:shadow-xl transition-all duration-200"
                disabled={datasets.length === 0}
              >
                Start with Selected Course Data
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

interface BotAccount {
  id: string;
  studentId: string;
  password: string;
  planId: string;      // which section plan to use
  status: 'idle' | 'running' | 'done' | 'error';
  logs: string[];
  result: { success: boolean; message?: string; results?: any[] } | null;
}

const DataView = ({ courses: initialCourses, onBack }: { courses: Course[], onBack: () => void }) => {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;
  const userPermissions: string[] = (session?.user as any)?.permissions || [];
  const hasBotAccess = userRole === 'admin' || userPermissions.includes('bot_access');

  const [sectionPlans, setSectionPlans] = useState<SectionPlan[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('uiu-section-plans');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Failed to load section plans from local storage", e);
        }
      }
    }
    return [
      { id: '1', name: 'Section Plan 1', courses: [] }
    ];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('uiu-section-plans', JSON.stringify(sectionPlans));
    }
  }, [sectionPlans]);

  // Multi-Account Bot State
  const [botAccounts, setBotAccounts] = useState<BotAccount[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('uiu-bot-accounts');
      if (saved) try { return JSON.parse(saved); } catch (_) { }
    }
    return [{ id: '1', studentId: '', password: '', planId: sectionPlans[0]?.id || '1', status: 'idle' as const, logs: [], result: null }];
  });
  const [botType, setBotType] = useState<'native' | 'puppeteer' | 'hybrid'>('native');
  const [isAnyBotRunning, setIsAnyBotRunning] = useState(false);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Save accounts without logs/results (those are transient)
      const toSave = botAccounts.map(a => ({ ...a, logs: [], result: null, status: 'idle' }));
      localStorage.setItem('uiu-bot-accounts', JSON.stringify(toSave));
    }
  }, [botAccounts]);

  // Legacy state preserved for backward compatibility (not shown in UI)
  const [registeringPlan, setRegisteringPlan] = useState<SectionPlan | null>(null);
  const [studentId, setStudentId] = useState("");
  const [ucamPassword, setUcamPassword] = useState("");
  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [liveLogs, setLiveLogs] = useState<string[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerResult, setRegisterResult] = useState<{ success: boolean; message?: string; results?: any[] } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleCancelRegistration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLiveLogs(prev => [...prev, "⚠️ Operation cancelled by user."]);
      setIsRegistering(false);
    }
  };

  const performAutoRegistration = async (botType: 'native' | 'puppeteer' | 'hybrid') => {
    if (!registeringPlan || !studentId || !ucamPassword) return;

    setIsRegistering(true);
    setRegisterResult(null);
    setLiveLogs([]); // Clear logs on new attempt

    // Format selected courses mapping
    const selectedCourses: { [key: string]: string } = {};
    registeringPlan.courses.forEach(c => {
      selectedCourses[`${c.courseCode} - ${c.title}`] = c.section;
    });

    try {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // All bot types route through the unified hybrid engine
      let endpoint = "/api/auto-register-hybrid";
      if (botType === 'puppeteer') endpoint = "/api/auto-register";

      // Determine mode: native-only, puppeteer-only, or full hybrid
      const mode = botType === 'native' ? 'native-only' : botType === 'hybrid' ? 'hybrid' : undefined;

      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          studentId,
          password: ucamPassword,
          selectedCourses,
          apiBaseUrl,
          ...(mode && { mode }),
        }),
      });

      if (!resp.ok) {
        setRegisterResult({ success: false, message: `Server error: ${resp.status}` });
        setIsRegistering(false);
        return;
      }

      if (botType === 'puppeteer') {
        setLiveLogs(["[Puppeteer] 🤖 Launching headless chromium browser in the cloud. This usually takes exactly 45 seconds. Do not close this window..."]);
        const data = await resp.json();
        setRegisterResult(data);
        return;
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No response body.");

      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let gotResult = false;

      // Stream processor
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let endOfEventIndex;
        while ((endOfEventIndex = buffer.indexOf("\n\n")) >= 0) {
          const eventData = buffer.substring(0, endOfEventIndex);
          buffer = buffer.substring(endOfEventIndex + 2);

          if (eventData.startsWith("data: ")) {
            try {
              const parsed = JSON.parse(eventData.substring(6));
              if (parsed.type === 'log') {
                setLiveLogs(prev => [...prev, parsed.message]);
              } else if (parsed.type === 'result') {
                gotResult = true;
                setRegisterResult(parsed.data);
              } else if (parsed.type === 'error') {
                gotResult = true;
                setRegisterResult({ success: false, message: parsed.message });
              }
            } catch (e) {
              console.error("Failed to parse SSE line", e);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Registration fetch aborted');
        return; // Handled by handleCancelRegistration
      }

      // Only show the error if the stream abruptly crashed BEFORE the backend finished its job.
      setRegisterResult(prev => {
        if (prev) return prev; // Keep the existing success/error state if already set
        return { success: false, message: err.message || "Network error occurred." };
      });
    } finally {
      setIsRegistering(false);
      abortControllerRef.current = null;
    }
  };
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'card' | 'table' | 'planner' | 'bot'>('card');
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set(sectionPlans.map(p => p.id)));
  const [sectionPlansVisible, setSectionPlansVisible] = useState(false);
  const [bulkProgramFilter, setBulkProgramFilter] = useState<string>("All");

  const availablePrograms = useMemo(() => {
    const programs = new Set(initialCourses.map(c => c.program).filter(Boolean));
    return Array.from(programs).sort();
  }, [initialCourses]);

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
    setSearchTerm(event.target.value);
  };

  const filteredCourses = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return initialCourses.filter((course) => {
      // Program filter check first
      if (bulkProgramFilter !== "All" && course.program !== bulkProgramFilter) {
        return false;
      }

      if (!term) return true; // If no search term but program matched (or all programs), return true

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
  }, [initialCourses, searchTerm, bulkProgramFilter]);

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

  // ===== CLIENT-SIDE BOT ENGINE (runs in-browser, no timeout) =====
  const proxyFetch = async (url: string, method = 'GET', headers: Record<string, string> = {}, body?: any) => {
    const res = await fetch('/api/bot-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, method, headers, body }),
    });
    return res.json();
  };

  const deepFindArray = (obj: any, predicate: (item: any) => boolean, maxDepth = 8): any[] | null => {
    if (maxDepth <= 0 || obj === null || obj === undefined) return null;
    if (Array.isArray(obj) && obj.length > 0 && obj.some(predicate)) return obj;
    if (typeof obj === "object") {
      for (const val of Object.values(obj)) {
        const found = deepFindArray(val, predicate, maxDepth - 1);
        if (found) return found;
      }
    }
    return null;
  };

  const deepFindValue = (obj: any, keyName: string, maxDepth = 8): any => {
    if (maxDepth <= 0 || obj === null || obj === undefined) return undefined;
    if (typeof obj === "object") {
      if (keyName in obj) return obj[keyName];
      for (const val of Object.values(obj)) {
        const found = deepFindValue(val, keyName, maxDepth - 1);
        if (found !== undefined) return found;
      }
    }
    return undefined;
  };

  const extractJwt = (data: any): string | null => {
    for (const key of ["token", "jwt", "access_token", "accessToken", "id_token"]) {
      const v = deepFindValue(data, key);
      if (typeof v === "string" && v.length > 20) return v;
    }
    return null;
  };

  const extractCourses = (data: any): any[] =>
    deepFindArray(data, (item: any) => typeof item === "object" && item !== null && (item.course_code || item.courseCode || item.code)) || [];

  const extractSections = (data: any): any[] =>
    deepFindArray(data, (item: any) => typeof item === "object" && item !== null && (item.section_name || item.sectionName || item.name || item.section)) || [];

  const getSectionName = (sec: any): string => sec.section_name || sec.sectionName || sec.name || sec.section || "";
  const getSectionId = (sec: any) => sec.section_id || sec.sectionId || sec.id || sec._id;
  const getCourseCode = (c: any) => c.course_code || c.courseCode || c.code;
  const getFormalCode = (c: any) => c.formal_code || c.formalCode || c.display_code || c.displayCode;

  const runClientSideBot = async (account: typeof botAccounts[0], selectedCourses: Record<string, string>, signal: AbortSignal) => {
    const log = (msg: string) => {
      setBotAccounts(prev => prev.map(a => a.id === account.id ? { ...a, logs: [...a.logs, msg] } : a));
    };

    const apiUrlOf = (baseUrl: string, version: string, path: string) => `${baseUrl}/${version}${path}`;

    try {
      log("[Native] 🚀 Deploying client-side API bot (no server timeout!)...");

      const targets = Object.keys(selectedCourses).map(key => ({
        courseCode: key.split(" - ")[0].trim(),
        targetSection: selectedCourses[key],
      }));

      // ── STEP 1: Discover API from frontend JS ──
      log("[Native] 🔍 Scraping frontend JS bundles for API architecture...");
      const frontendUrl = "https://cloud-v3.edusoft-ltd.workers.dev";
      let baseUrl = "", version = "", loginPath: string | null = null, preAdvisedPath: string | null = null;
      const allPaths: string[] = [];

      try {
        const htmlRes = await proxyFetch(frontendUrl);
        const html = htmlRes.text || "";
        const jsRegex = /(?:src|href)="([^"]+\.js[^"]*)"/g;
        let match;
        const scripts: string[] = [];
        while ((match = jsRegex.exec(html)) !== null) scripts.push(match[1]);

        for (const scriptPath of scripts) {
          if (signal.aborted) return;
          const url = scriptPath.startsWith("http") ? scriptPath : `${frontendUrl}${scriptPath.startsWith("/") ? "" : "/"}${scriptPath}`;
          const jsRes = await proxyFetch(url);
          const js = jsRes.text || "";

          if (!baseUrl || !version) {
            const fullUrlMatch = js.match(/["'`](https:\/\/[^"'`\s]{5,80}?)\/(v\d+)\/(?:auth|users|courses|command)/);
            if (fullUrlMatch) { baseUrl = baseUrl || fullUrlMatch[1]; version = version || fullUrlMatch[2]; }
            if (!baseUrl) {
              const urlRegex = /["'`](https:\/\/[a-zA-Z0-9._-]+(?:\.[a-zA-Z]{2,})+(?:\/[^"'`\s]*)?)\b["'`]/g;
              let urlMatch;
              while ((urlMatch = urlRegex.exec(js)) !== null) {
                const c = urlMatch[1].replace(/\/+$/, "");
                if (c.includes("edusoft-ltd") || c.includes("googleapis") || c.includes("cloudflare") || c.includes("sentry") || c.includes("cdn") || c.endsWith(".js") || c.endsWith(".css")) continue;
                const verInUrl = c.match(/^(https:\/\/[^/]+)\/(v\d+)/);
                if (verInUrl) { baseUrl = verInUrl[1]; version = verInUrl[2]; break; }
                if (c.match(/api|execute|gateway|backend|server/i)) { baseUrl = c.replace(/\/v\d+$/, ""); break; }
              }
            }
            if (!version) { const vm = js.match(/["'`/](v\d+)\/(?:auth|courses|users)/); if (vm) version = vm[1]; }
          }

          const pathRegex = /["'](\/(?:auth|users|courses|command|management|student)[^"']{2,80})["']/g;
          let pathMatch;
          while ((pathMatch = pathRegex.exec(js)) !== null) {
            const p = pathMatch[1];
            if (!p.includes("console/") && !p.includes(".js") && !p.includes(".css") && !allPaths.includes(p)) allPaths.push(p);
          }
        }

        for (const p of allPaths) {
          if (p.includes("auth/login") && !p.includes("logout")) loginPath = p;
          if (p.includes("preadvice") || p.includes("pre-advis")) preAdvisedPath = p;
        }

        if (baseUrl && version) {
          log(`[Native] 🌐 Discovered: ${baseUrl}/${version}`);
          log(`[Native] 📡 Found ${allPaths.length} API routes`);
        }
      } catch (e: any) {
        log(`[Native] ⚠️ Discovery error: ${e.message}`);
      }

      if (!baseUrl || !version) {
        log("[Native] ❌ Could not discover API. Aborting.");
        setBotAccounts(prev => prev.map(a => a.id === account.id ? { ...a, status: 'error', result: { success: false, message: "API discovery failed" } } : a));
        return;
      }

      // Custom API base URL override
      if (apiBaseUrl && apiBaseUrl.trim()) {
        const clean = apiBaseUrl.trim().replace(/\/$/, "");
        try {
          const res = await proxyFetch(clean);
          if (res.success && !res.text?.includes("<html")) {
            baseUrl = clean;
            log(`[Native] 🌐 Using custom base URL: ${clean}`);
          }
        } catch (_) { }
      }

      // ── STEP 2: Login ──
      let jwt: string | null = null;
      if (loginPath) {
        log("[Native] ⚡ Authenticating...");
        try {
          const loginRes = await proxyFetch(
            apiUrlOf(baseUrl, version, loginPath), "POST",
            { "Content-Type": "application/json", "Origin": "https://cloud-v3.edusoft-ltd.workers.dev", "Referer": "https://cloud-v3.edusoft-ltd.workers.dev/" },
            { user_id: account.studentId, password: account.password, logout_other_sessions: false }
          );
          if (loginRes.success && loginRes.data) {
            jwt = extractJwt(loginRes.data);
            if (jwt) log("[Native] 🔑 JWT acquired!");
            else {
              const preview = JSON.stringify(loginRes.data).slice(0, 300);
              log(`[Native] ⚠️ Login response but no JWT. Keys: ${Object.keys(loginRes.data).join(', ')}. Preview: ${preview}`);
            }
          } else {
            log(`[Native] ⚠️ Login failed: ${loginRes.message || 'Unknown'}`);
          }
        } catch (e: any) {
          log(`[Native] ❌ Login error: ${e.message}`);
        }
      }

      if (!jwt) {
        setBotAccounts(prev => prev.map(a => a.id === account.id ? { ...a, status: 'error', result: { success: false, message: "Could not acquire session token" } } : a));
        return;
      }

      // ── STEP 3: Resolve course IDs ──
      const courseIds: Record<string, string> = {};
      log("[Native] 📋 Fetching pre-advised courses...");

      // Probe pre-advised paths
      const preAdvisedCandidates = new Set<string>();
      if (preAdvisedPath) preAdvisedCandidates.add(preAdvisedPath);
      for (const p of allPaths) { if (p.includes("preadvice") || p.includes("pre-advis")) preAdvisedCandidates.add(p); }
      const userMePath = allPaths.find(p => p === "/users/me");
      if (userMePath) {
        preAdvisedCandidates.add(`${userMePath}/preadvice-courses`);
        allPaths.filter(p => p.includes("preadvice")).forEach(frag => {
          const keyword = frag.split("/").filter(Boolean).find(s => s.includes("preadvice"));
          if (keyword) preAdvisedCandidates.add(`${userMePath}/${keyword}`);
        });
      }

      for (const path of preAdvisedCandidates) {
        if (signal.aborted || Object.keys(courseIds).length > 0) break;
        try {
          const res = await proxyFetch(apiUrlOf(baseUrl, version, path), "GET", { Authorization: `Bearer ${jwt}`, Accept: "application/json" });
          if (res.success && res.data) {
            const courses = extractCourses(res.data);
            for (const c of courses) {
              const cc = getCourseCode(c);
              if (cc) { courseIds[cc] = cc; const fc = getFormalCode(c); if (fc) courseIds[fc] = cc; }
            }
            if (Object.keys(courseIds).length > 0) log(`[Native] 📋 Mapped ${Object.keys(courseIds).length} course entries`);
          }
        } catch (_) { }
      }

      // ── STEP 4: Discover sections path ──
      let sectionsPathTemplate: string | null = null;
      const firstCourseId = targets.map(t => courseIds[t.courseCode]).find(Boolean);

      if (firstCourseId) {
        log("[Native] 🔎 Discovering sections endpoint...");
        const sectionCandidates = new Set<string>();
        for (const p of allPaths) {
          if (p.includes("section")) {
            const clean = p.replace(/\/$/, "");
            sectionCandidates.add(`${clean}/${firstCourseId}`);
          }
          if (p.includes("course") && !p.includes("command") && !p.includes("management")) {
            sectionCandidates.add(`${p.replace(/\/$/, "")}/sections/${firstCourseId}`);
          }
        }
        if (allPaths.some(p => p.includes("course"))) {
          sectionCandidates.add(`/courses/sections/${firstCourseId}`);
        }

        for (const path of sectionCandidates) {
          if (signal.aborted) break;
          try {
            const res = await proxyFetch(apiUrlOf(baseUrl, version, path), "GET", { Authorization: `Bearer ${jwt}`, Accept: "application/json" });
            if (res.success && res.data) {
              const sections = res.data?.data?.sections || res.data?.data;
              if (sections && (Array.isArray(sections) || res.data?.data?.course_code)) {
                sectionsPathTemplate = path.replace(firstCourseId, "");
                log(`[Native] ✅ Sections path: ${sectionsPathTemplate}{courseId}`);
                break;
              }
            }
          } catch (_) { }
        }
      }

      if (!sectionsPathTemplate) {
        log("[Native] ❌ Could not discover sections endpoint.");
        setBotAccounts(prev => prev.map(a => a.id === account.id ? { ...a, status: 'error', result: { success: false, message: "No sections path found" } } : a));
        return;
      }

      // ── STEP 5: Per-course section selection (PARALLEL, with Death Strike pace control) ──
      const completedCourses = new Set<string>();
      const timerMs: Record<string, number> = {};
      const results: { course: string; success: boolean; reason: string }[] = [];

      const executeTasks = targets.map(target => (async () => {
        const courseId = courseIds[target.courseCode];
        if (!courseId) {
          log(`[${target.courseCode}] ⚠️ Could not resolve course ID. Skipping.`);
          results.push({ course: target.courseCode, success: false, reason: "Course ID not found" });
          return false;
        }

        const sectionsPath = `${sectionsPathTemplate}${courseId}`;
        const selectPath = `${sectionsPathTemplate}${courseId}/select`;
        let attempts = 0;

        log(`[${target.courseCode}] 🏁 Polling for section ${target.targetSection}...`);

        while (attempts < 5000 && !signal.aborted) {
          if (completedCourses.has(target.courseCode)) {
            log(`[${target.courseCode}] 🛑 Already completed! Stopping.`);
            return true;
          }
          attempts++;

          // Death Strike Pace Control
          let sleepTime = 1000;
          const timer = timerMs[target.courseCode];
          if (timer !== undefined) {
            if (timer > 10000) {
              sleepTime = 5000;
              if (attempts % 2 === 0) log(`[${target.courseCode}] 💤 Timer: ${Math.round(timer / 1000)}s. Idling...`);
            } else if (timer > 0 && timer <= 2000) {
              sleepTime = 250;
              if (attempts % 4 === 0) log(`[${target.courseCode}] 🔥 WARMUP! ${timer}ms left...`);
            } else if (timer <= 0) {
              sleepTime = 100;
              if (attempts % 10 === 0) log(`[${target.courseCode}] ⚔️ GATLING MODE!`);
            }
          }

          try {
            if (!jwt) { await new Promise(r => setTimeout(r, sleepTime)); continue; }

            if (sleepTime >= 1000 && (attempts === 1 || attempts % 5 === 0)) {
              log(`[${target.courseCode}] 📡 Polling sections...`);
            }

            const getRes = await proxyFetch(apiUrlOf(baseUrl, version, sectionsPath), "GET", { Authorization: `Bearer ${jwt}`, Accept: "application/json" });

            // JWT expired — re-login
            if (getRes.status === 401 && loginPath) {
              log(`[${target.courseCode}] 🔄 JWT expired. Re-authenticating...`);
              const reRes = await proxyFetch(apiUrlOf(baseUrl, version, loginPath), "POST",
                { "Content-Type": "application/json", Origin: "https://cloud-v3.edusoft-ltd.workers.dev" },
                { user_id: account.studentId, password: account.password, logout_other_sessions: false }
              );
              if (reRes.success && reRes.data) {
                const newJwt = extractJwt(reRes.data);
                if (newJwt) { jwt = newJwt; log(`[${target.courseCode}] 🔑 Re-login OK!`); }
              }
              await new Promise(r => setTimeout(r, sleepTime));
              continue;
            }

            if (!getRes.success || getRes.status !== 200) throw new Error("HTTP " + getRes.status);

            const sections = extractSections(getRes.data);
            const matched = sections.find((s: any) => getSectionName(s) === target.targetSection);
            if (!matched) throw new Error("Section unavailable");

            log(`[${target.courseCode}] 🎯 Section found! Striking...`);
            const selectRes = await proxyFetch(apiUrlOf(baseUrl, version, selectPath), "POST",
              { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
              { section_id: getSectionId(matched), action: "select", parent_course_code: courseId }
            );

            if (selectRes.success && selectRes.status === 200) {
              completedCourses.add(target.courseCode);
              log(`[${target.courseCode}] 🟩 SUCCESS! Section ${target.targetSection} registered!`);
              results.push({ course: target.courseCode, success: true, reason: "Registered" });
              return true;
            } else {
              throw new Error(selectRes.data?.message || "Rejected");
            }
          } catch (e: any) {
            if (!e.message?.includes("unavailable")) {
              log(`[${target.courseCode}] ❌ ${e.message}. Retrying...`);
            }
            await new Promise(r => setTimeout(r, sleepTime));
          }
        }

        if (!completedCourses.has(target.courseCode)) {
          results.push({ course: target.courseCode, success: false, reason: signal.aborted ? "Cancelled" : "Exhausted" });
        }
        return false;
      })());

      await Promise.all(executeTasks);

      log("[Native] 🏆 All operations completed.");
      setBotAccounts(prev => prev.map(a => a.id === account.id ? { ...a, status: 'done', result: { success: true, results } } : a));
    } catch (e: any) {
      log(`[Native] ❌ Fatal: ${e.message}`);
      setBotAccounts(prev => prev.map(a => a.id === account.id ? { ...a, status: 'error', result: { success: false, message: e.message } } : a));
    }
  };

  // ===== MAIN LAUNCH HANDLER =====
  const handleLaunchBots = async (accountIdsToLaunch: string[]) => {
    const accountsToLaunch = botAccounts.filter(a => accountIdsToLaunch.includes(a.id) && a.studentId && a.password);

    if (accountsToLaunch.length === 0) {
      toast.error('No valid accounts to launch. Check credentials.');
      return;
    }

    setBotAccounts(prev => prev.map(a =>
      accountIdsToLaunch.includes(a.id) ? { ...a, status: 'running' as const, logs: [], result: null } : a
    ));

    setIsAnyBotRunning(true);

    const launchPromises = accountsToLaunch.map(async (account) => {
      const plan = sectionPlans.find(p => p.id === account.planId);
      if (!plan || plan.courses.length === 0) {
        setBotAccounts(prev => prev.map(a => a.id === account.id ? { ...a, status: 'error', logs: ['❌ No plan or empty plan.'] } : a));
        return;
      }

      const selectedCourses: { [key: string]: string } = {};
      plan.courses.forEach(c => { selectedCourses[`${c.courseCode} - ${c.title}`] = c.section; });

      const controller = new AbortController();
      abortControllersRef.current.set(account.id, controller);

      try {
        // FAST MODE → Client-side (no timeout!)
        if (botType === 'native') {
          await runClientSideBot(account, selectedCourses, controller.signal);
          return;
        }

        // PUPPETEER / HYBRID → Server-side SSE (needs Node.js)
        const mode = botType === 'puppeteer' ? 'puppeteer-only' : 'hybrid';
        const res = await fetch('/api/auto-register-hybrid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId: account.studentId, password: account.password, selectedCourses, mode, apiBaseUrl }),
          signal: controller.signal,
        });

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error('No response stream');

        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'log') setBotAccounts(prev => prev.map(a => a.id === account.id ? { ...a, logs: [...a.logs, data.message] } : a));
                else if (data.type === 'result') {
                  const resultData = data.data;
                  setBotAccounts(prev => prev.map(a => a.id === account.id ? { ...a, status: 'done', result: { success: resultData?.success ?? true, results: resultData?.results || resultData } } : a));
                }
                else if (data.type === 'error') setBotAccounts(prev => prev.map(a => a.id === account.id ? { ...a, status: 'error', result: { success: false, message: data.message } } : a));
              } catch (_) { }
            }
          }
        }
        setBotAccounts(prev => prev.map(a => a.id === account.id && a.status === 'running' ? { ...a, status: 'done' } : a));
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          setBotAccounts(prev => prev.map(a => a.id === account.id ? { ...a, status: 'error', logs: [...a.logs, `❌ ${e.message}`] } : a));
        }
      } finally {
        abortControllersRef.current.delete(account.id);
      }
    });

    await Promise.all(launchPromises);

    setBotAccounts(current => {
      if (!current.some(a => a.status === 'running')) {
        setIsAnyBotRunning(false);
      }
      return current;
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
          {hasBotAccess && (
            <Button
              variant={viewMode === 'bot' ? 'default' : 'outline'}
              onClick={() => setViewMode('bot')}
              size="sm"
              className="flex-1 sm:flex-none text-xs sm:text-sm gap-1"
            >
              <Bot className="w-3.5 h-3.5" />
              Bot Registration
            </Button>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {/* Section Plans — visible in ALL views */}
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

                  {/* Bot button removed — use the Bot Registration tab instead */}
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

        {/* Content based on view mode — hidden in bot view */}
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
        ) : viewMode === 'table' ? (
          <div className="w-full">
            <Card>
              <CardHeader>
                <CardTitle>Available Courses</CardTitle>
                <CardDescription>
                  Found {initialCourses.length} course entries. Click on a row to select a course section.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <Input
                    type="text"
                    placeholder="Search by course, title, faculty, or section"
                    value={searchTerm}
                    onChange={handleSearch}
                    className="text-sm flex-grow"
                  />
                  <Select value={bulkProgramFilter} onValueChange={setBulkProgramFilter}>
                    <SelectTrigger className="w-full sm:w-[250px] text-sm">
                      <SelectValue placeholder="Filter by program" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Programs</SelectItem>
                      {availablePrograms.map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
        ) : null}

        {/* ============================================================ */}
        {/* BOT REGISTRATION TAB                                        */}
        {/* ============================================================ */}
        {viewMode === 'bot' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full bg-muted/30 px-3 sm:px-4 py-4 rounded-lg transition-colors border border-border shadow-sm">
            <div className="space-y-6 w-full">
              {/* Minimal Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5 w-full">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-orange-500/10 rounded-xl text-orange-500">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-foreground">Auto Registration Bot</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Automate your UIU section registration effortlessly</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex bg-background/40 backdrop-blur-xl p-1 rounded-lg border border-white/10">
                    <button
                      onClick={() => setBotType('native')}
                      className={`text-xs px-3 py-1.5 rounded-md transition-all font-semibold ${botType === 'native' ? 'bg-orange-500/90 text-white' : 'text-muted-foreground hover:text-foreground'}`}
                      disabled={isAnyBotRunning}
                    >
                      ⚡ Fast
                    </button>
                    <button
                      onClick={() => setBotType('hybrid')}
                      className={`text-xs px-3 py-1.5 rounded-md transition-all font-semibold ${botType === 'hybrid' ? 'bg-orange-500/90 text-white' : 'text-muted-foreground hover:text-foreground'}`}
                      disabled={isAnyBotRunning}
                    >
                      🚀 Hybrid
                    </button>
                    <button
                      onClick={() => setBotType('puppeteer')}
                      className={`text-xs px-3 py-1.5 rounded-md transition-all font-semibold ${botType === 'puppeteer' ? 'bg-orange-500/90 text-white' : 'text-muted-foreground hover:text-foreground'}`}
                      disabled={isAnyBotRunning}
                    >
                      🤖 Puppeteer
                    </button>
                  </div>
                </div>
              </div>

              {/* Custom Login URL */}
              <div className="space-y-3 w-full">
                <div className="flex items-center justify-between px-1 border-b border-white/5 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-orange-500/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                    Custom API URL
                  </h3>
                </div>
                <Input
                  placeholder="https://your-api-base-url.com/v3"
                  value={apiBaseUrl}
                  onChange={(e) => setApiBaseUrl(e.target.value)}
                  className="w-full h-10 border-white/10 text-sm"
                  disabled={isAnyBotRunning}
                />
              </div>

              {/* Account Rows Minimal List */}
              <div className="space-y-3 w-full">
                <div className="flex items-center justify-between px-1 border-b border-white/5 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-orange-500/70" /> Accounts ({botAccounts.length})
                  </h3>
                </div>

                <div className="rounded-xl border border-white/10 bg-background/30 backdrop-blur-xl shadow-sm w-full block">
                  {botAccounts.map((account, idx) => (
                    <div key={account.id} className={`grid grid-cols-1 lg:grid-cols-[1fr_1fr_1.5fr_auto] gap-4 items-center p-4 ${idx > 0 ? 'border-t border-white/5' : ''} hover:bg-white/5 transition-colors`}>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-muted-foreground bg-white/5 px-2 py-1 rounded-md shrink-0">{idx + 1}</span>
                        <Input placeholder="Student ID" value={account.studentId}
                          onChange={(e) => setBotAccounts(prev => prev.map(a => a.id === account.id ? { ...a, studentId: e.target.value } : a))}
                          className="h-10 text-sm w-full !bg-transparent border-white/10 focus:border-orange-500/50" disabled={isAnyBotRunning} />
                      </div>

                      <div>
                        <Input placeholder="Password" type="password" value={account.password}
                          onChange={(e) => setBotAccounts(prev => prev.map(a => a.id === account.id ? { ...a, password: e.target.value } : a))}
                          className="h-10 text-sm w-full !bg-transparent border-white/10 focus:border-orange-500/50" disabled={isAnyBotRunning} />
                      </div>

                      <div>
                        <Select value={account.planId}
                          onValueChange={(val) => setBotAccounts(prev => prev.map(a => a.id === account.id ? { ...a, planId: val } : a))}
                          disabled={isAnyBotRunning}>
                          <SelectTrigger className="h-10 text-sm w-full !bg-transparent border-white/10 focus:border-orange-500/50">
                            <SelectValue placeholder="Select plan" />
                          </SelectTrigger>
                          <SelectContent className="bg-background/95 backdrop-blur-xl border-white/10">
                            {sectionPlans.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name} <span className="text-muted-foreground text-xs ml-1">({p.courses.length})</span></SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between lg:justify-end gap-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${account.status === 'running' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 animate-pulse' :
                          account.status === 'done' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                            account.status === 'error' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                              'bg-background/50 text-muted-foreground border border-white/10'
                          }`}>
                          {account.status === 'running' ? 'Running' : account.status === 'done' ? 'Done' : account.status === 'error' ? 'Error' : 'Idle'}
                        </span>

                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {account.status === 'running' ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-8 px-3 text-xs bg-red-600/80 hover:bg-red-600"
                              onClick={() => {
                                const controller = abortControllersRef.current.get(account.id);
                                if (controller) {
                                  controller.abort();
                                  abortControllersRef.current.delete(account.id);
                                }
                                setBotAccounts(prev => prev.map(a => a.id === account.id ? { ...a, status: 'error', logs: [...a.logs, '⚠️ Cancelled by user.'] } : a));

                                // Check if any bots are still running
                                setBotAccounts(current => {
                                  if (!current.some(a => a.status === 'running')) {
                                    setIsAnyBotRunning(false);
                                  }
                                  return current;
                                });
                              }}
                            >
                              <Square className="w-3.5 h-3.5 mr-1" /> Stop
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-8 px-3 text-xs bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border border-orange-500/20"
                              disabled={!account.studentId || !account.password}
                              onClick={() => handleLaunchBots([account.id])}
                            >
                              <Play className="w-3.5 h-3.5 mr-1" /> Run
                            </Button>
                          )}
                          {!isAnyBotRunning && botAccounts.length > 1 && (
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setBotAccounts(prev => prev.filter(a => a.id !== account.id))}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons Row */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  {!isAnyBotRunning && (
                    <Button variant="outline" className="h-11 sm:w-auto w-full border-dashed border-white/20 hover:border-orange-500/50 hover:text-orange-500 bg-background/30 backdrop-blur-xl"
                      onClick={() => setBotAccounts(prev => [...prev, {
                        id: String(Date.now()), studentId: '', password: '',
                        planId: sectionPlans[0]?.id || '1', status: 'idle', logs: [], result: null,
                      }])}>
                      <Plus className="w-4 h-4 mr-2" /> Add Account
                    </Button>
                  )}

                  {isAnyBotRunning ? (
                    <Button variant="destructive" className="flex-1 h-11 font-bold shadow-md"
                      onClick={() => {
                        abortControllersRef.current.forEach(c => c.abort());
                        abortControllersRef.current.clear();
                        setIsAnyBotRunning(false);
                        setBotAccounts(prev => prev.map(a => a.status === 'running' ? { ...a, status: 'error', logs: [...a.logs, '⚠️ Cancelled.'] } : a));
                      }}>
                      <Square className="w-4 h-4 mr-2" /> Cancel All Running
                    </Button>
                  ) : (
                    <Button className="flex-1 h-11 bg-orange-500/90 hover:bg-orange-600 text-white font-bold shadow-md"
                      disabled={botAccounts.every(a => !a.studentId || !a.password)}
                      onClick={() => handleLaunchBots(botAccounts.map(a => a.id))}>
                      <Rocket className="w-4 h-4 mr-2" /> Launch All Bots
                    </Button>
                  )}
                </div>
              </div>

              {/* Results Grid - Minimal */}
              {(botAccounts.some(a => a.result) || botAccounts.some(a => a.logs.length > 0)) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">

                  {/* Console */}
                  {botAccounts.some(a => a.logs.length > 0) && (
                    <div className="rounded-xl border border-white/10 bg-black/50 backdrop-blur-xl flex flex-col h-64 overflow-hidden">
                      <div className="bg-white/5 px-4 py-2 text-xs font-bold tracking-wider text-muted-foreground border-b border-white/5 flex items-center">
                        <Terminal className="w-3.5 h-3.5 mr-2" /> Console Output
                      </div>
                      <div className="p-4 font-mono text-xs text-green-400 overflow-y-auto space-y-1 flex-1">
                        {botAccounts.flatMap(a =>
                          a.logs.map((log, i) => ({ key: `${a.id}-${i}`, text: botAccounts.length > 1 ? `[${a.studentId || '?'}] ${log}` : log }))
                        ).map(e => <div key={e.key} className="opacity-90"><span className="text-green-500/50 mr-2">›</span>{e.text}</div>)}
                        {isAnyBotRunning && <div className="animate-pulse text-green-500 mt-2">▌</div>}
                      </div>
                    </div>
                  )}

                  {/* Results */}
                  {botAccounts.some(a => a.result) && (
                    <div className="rounded-xl border border-white/10 bg-background/30 backdrop-blur-xl flex flex-col h-64 overflow-hidden">
                      <div className="bg-white/5 px-4 py-2 text-xs font-bold tracking-wider text-muted-foreground border-b border-white/5 flex items-center">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Results
                      </div>
                      <div className="p-4 overflow-y-auto space-y-3 flex-1">
                        {botAccounts.filter(a => a.result).map(account => (
                          <div key={account.id} className={`p-3 rounded-lg text-sm border ${account.result?.success ? 'bg-green-500/5 border-green-500/20 text-green-500' : 'bg-red-500/5 border-red-500/20 text-red-500'}`}>
                            <strong className="flex items-center gap-1.5 mb-1.5"><User className="w-3.5 h-3.5" />{account.studentId || 'Account'}:</strong>
                            {account.result?.success ? (
                              <ul className="space-y-1">
                                {Array.isArray(account.result.results) && account.result.results.map((r: any, i: number) => (
                                  <li key={i} className="flex text-xs items-start bg-background/50 p-1.5 rounded">
                                    {r.success ? '✅' : '❌'} <span className="ml-1.5 opacity-90">{r.course}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : <span className="text-xs">{account.result?.message || 'Error'}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
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
