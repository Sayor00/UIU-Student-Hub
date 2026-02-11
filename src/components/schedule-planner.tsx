"use client";

import { useState, useEffect } from "react";
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

interface SchedulePlannerProps {
  courses: Course[];
  onAddPlanFromSchedule: (courses: Course[], scheduleName: string) => void;
}

interface TimePreferences {
  startTimeLimit: string;
  endTimeLimit: string;
  classDaysPerWeek: string;
  classesPerDay: string;
}

interface CourseSelection {
  selectedCourses: string[];
  prioritizedFaculties: string[];
}

interface GeneratedSchedule {
  id: string;
  courses: Course[];
  missingFaculties: string[];
  totalDays: number;
  dailySchedule: { [day: string]: Course[] };
}

const SchedulePlanner = ({ courses, onAddPlanFromSchedule }: SchedulePlannerProps) => {
  const [program, setProgram] = useState<string>("BSCSE");
  const [timePreferences, setTimePreferences] = useState<TimePreferences>({
    startTimeLimit: "Any",
    endTimeLimit: "Any",
    classDaysPerWeek: "Any",
    classesPerDay: "Any",
  });
  const [courseSelection, setCourseSelection] = useState<CourseSelection>({
    selectedCourses: [],
    prioritizedFaculties: [],
  });
  const [generatedSchedules, setGeneratedSchedules] = useState<GeneratedSchedule[]>([]);
  const [allSchedules, setAllSchedules] = useState<GeneratedSchedule[]>([]);
  const [displayedCount, setDisplayedCount] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Search states
  const [courseSearchTerm, setCourseSearchTerm] = useState("");
  const [facultySearchTerm, setFacultySearchTerm] = useState("");
  const [isCourseSearchFocused, setIsCourseSearchFocused] = useState(false);
  const [isFacultySearchFocused, setIsFacultySearchFocused] = useState(false);

  // Filter courses by program
  const programCourses = courses.filter(course => course.program === program);

  // Extract unique start times
  const getStartTimes = () => {
    const times = new Set<string>();
    programCourses.forEach(course => {
      if (course.time1) {
        const startTime = course.time1.split(' - ')[0];
        times.add(startTime);
      }
    });
    return Array.from(times).sort();
  };

  // Extract unique end times
  const getEndTimes = () => {
    const times = new Set<string>();
    programCourses.forEach(course => {
      if (course.time1) {
        const endTime = course.time1.split(' - ')[1] || course.time1.split(' - ')[0];
        times.add(endTime);
      }
    });
    return Array.from(times).sort();
  };

  // Get unique courses for selection with search functionality
  const getUniqueCourses = () => {
    return Array.from(
      new Map(
        programCourses.map(course => [
          `${course.courseCode}-${course.title}`,
          { courseCode: course.courseCode, title: course.title }
        ])
      ).values()
    );
  };

  // Filter courses by search term with enhanced matching (same logic as Card Selector)
  const getFilteredCourses = () => {
    const uniqueCourses = getUniqueCourses();
    
    if (!courseSearchTerm) return uniqueCourses;
    
    return uniqueCourses.filter(course => {
      const searchLower = courseSearchTerm.toLowerCase().trim();
      const titleLower = course.title.toLowerCase();
      const codeLower = course.courseCode.toLowerCase();
      
      // Basic matching - most important, check first
      if (titleLower.includes(searchLower) || codeLower.includes(searchLower)) {
        return true;
      }
      
      // Dynamic uppercase letter extraction - extract all capital letters from title
      const upperCaseLetters = course.title.match(/[A-Z]/g);
      if (upperCaseLetters && upperCaseLetters.length >= 2) {
        const acronymFromUppercase = upperCaseLetters.join('').toLowerCase();
        
        // Exact match with full uppercase acronym
        if (acronymFromUppercase === searchLower) {
          return true;
        }
        
        // Check if search term matches start of uppercase acronym
        if (searchLower.length >= 2 && acronymFromUppercase.startsWith(searchLower)) {
          return true;
        }
        
        // Check if search term is contained within uppercase acronym
        if (searchLower.length >= 2 && acronymFromUppercase.includes(searchLower)) {
          return true;
        }
        
        // Check partial uppercase acronyms (first N letters)
        for (let i = 2; i <= Math.min(upperCaseLetters.length, searchLower.length + 1); i++) {
          const partialUppercaseAcronym = upperCaseLetters.slice(0, i).join('').toLowerCase();
          if (partialUppercaseAcronym === searchLower) {
            return true;
          }
        }
      }
      
      // Dynamic acronym from first letters of significant words
      const stopWords = ['and', 'of', 'the', 'for', 'in', 'on', 'to', 'a', 'an', 'with', 'by', 'from', 'at', 'as', 'is', 'are', 'was', 'were', 'i', 'ii', 'iii', 'iv', 'v', 'using', 'lab', 'laboratory', 'introduction', 'basic', 'advanced', 'theory', 'practical'];
      const titleWords = course.title.split(/\s+/).filter(word => 
        word.length > 1 && !stopWords.includes(word.toLowerCase())
      );
      
      if (titleWords.length >= 2) {
        // Full acronym from first letters of all significant words
        const firstLetterAcronym = titleWords.map(word => word[0]).join('').toLowerCase();
        
        // Exact match with full first-letter acronym
        if (firstLetterAcronym === searchLower) {
          return true;
        }
        
        // Check if search matches start of first-letter acronym
        if (searchLower.length >= 2 && firstLetterAcronym.startsWith(searchLower)) {
          return true;
        }
        
        // Check if search is contained in first-letter acronym
        if (searchLower.length >= 2 && firstLetterAcronym.includes(searchLower)) {
          return true;
        }
        
        // Dynamic partial acronyms - check all possible combinations
        for (let i = 2; i <= Math.min(titleWords.length, searchLower.length + 2); i++) {
          const partialAcronym = titleWords.slice(0, i).map(word => word[0]).join('').toLowerCase();
          if (partialAcronym === searchLower) {
            return true;
          }
        }
        
        // Check sliding window acronyms (e.g., for "DS" in "Data Structures and Algorithms")
        for (let start = 0; start <= titleWords.length - 2; start++) {
          for (let length = 2; length <= Math.min(4, titleWords.length - start); length++) {
            const slidingAcronym = titleWords.slice(start, start + length)
              .map(word => word[0]).join('').toLowerCase();
            if (slidingAcronym === searchLower) {
              return true;
            }
          }
        }
      }
      
      // Check for word-level matches (partial word matching)
      if (titleWords.length > 0) {
        // Check if search term matches the start of any significant word
        const matchesWordStart = titleWords.some(word => 
          word.toLowerCase().startsWith(searchLower) && searchLower.length >= 2
        );
        if (matchesWordStart) {
          return true;
        }
      }
      
      // Check common course number patterns (Roman numerals)
      const romanToNumber: { [key: string]: string } = {
        'i': '1', 'ii': '2', 'iii': '3', 'iv': '4', 'v': '5', 'vi': '6'
      };
      
      for (const [roman, number] of Object.entries(romanToNumber)) {
        if ((titleLower.includes(roman) && searchLower === number) ||
            (titleLower.includes(number) && searchLower === roman)) {
          return true;
        }
      }
      
      // Match individual words in title (for multi-word searches)
      if (searchLower.includes(' ')) {
        const searchWords = searchLower.split(/\s+/).filter(word => word.length > 1);
        if (searchWords.every(searchWord => 
          titleWords.some(titleWord => titleWord.toLowerCase().includes(searchWord))
        )) {
          return true;
        }
      }
      
      return false;
    });
  };

  // Get faculties for selected courses with search functionality
  const getAvailableFaculties = () => {
    if (courseSelection.selectedCourses.length === 0) return [];
    
    const faculties = new Set<string>();
    programCourses.forEach(course => {
      const courseKey = `${course.courseCode} - ${course.title}`;
      if (courseSelection.selectedCourses.includes(courseKey)) {
        faculties.add(`${course.facultyName} (${course.facultyInitial})`);
      }
    });
    
    return Array.from(faculties);
  };

  // Filter faculties by search term
  const getFilteredFaculties = () => {
    const availableFaculties = getAvailableFaculties();
    
    if (!facultySearchTerm) return availableFaculties;
    
    return availableFaculties.filter(faculty =>
      faculty.toLowerCase().includes(facultySearchTerm.toLowerCase())
    );
  };

  // Convert time string to minutes for comparison
  const timeToMinutes = (timeStr: string): number => {
    const [time, period] = timeStr.split(/\s*([AP]M)/);
    const [hours, minutes] = time.split(':').map(Number);
    const adjustedHours = period === 'PM' && hours !== 12 ? hours + 12 : period === 'AM' && hours === 12 ? 0 : hours;
    return adjustedHours * 60 + minutes;
  };

  // Check if a course meets time constraints
  const meetsTimeConstraints = (course: Course): boolean => {
    if (!course.time1) return false;
    
    const [startTime, endTime] = course.time1.split(' - ');
    
    // Check start time constraint
    if (timePreferences.startTimeLimit !== "Any") {
      const courseStartMinutes = timeToMinutes(startTime);
      const limitStartMinutes = timeToMinutes(timePreferences.startTimeLimit);
      if (courseStartMinutes < limitStartMinutes) return false;
    }
    
    // Check end time constraint
    if (timePreferences.endTimeLimit !== "Any") {
      const courseEndMinutes = timeToMinutes(endTime);
      const limitEndMinutes = timeToMinutes(timePreferences.endTimeLimit);
      if (courseEndMinutes > limitEndMinutes) return false;
    }
    
    return true;
  };

  // Check if two courses have time conflicts
  const hasTimeConflict = (course1: Course, course2: Course): boolean => {
    const days1 = [course1.day1, course1.day2].filter(Boolean);
    const days2 = [course2.day1, course2.day2].filter(Boolean);
    
    // Check if they share any common days
    const hasCommonDay = days1.some(day1 => days2.includes(day1));
    if (!hasCommonDay) return false;
    
    // If they share days, check time overlap
    if (!course1.time1 || !course2.time1) return false;
    
    try {
      const [start1Str, end1Str] = course1.time1.split(' - ');
      const [start2Str, end2Str] = course2.time1.split(' - ');
      
      const start1 = timeToMinutes(start1Str.trim());
      const end1 = timeToMinutes(end1Str.trim());
      const start2 = timeToMinutes(start2Str.trim());
      const end2 = timeToMinutes(end2Str.trim());
      
      // Times conflict if they overlap (not just touching)
      // Two time slots conflict if one starts before the other ends and vice versa
      return !(end1 <= start2 || end2 <= start1);
    } catch (error) {
      console.warn('Error parsing time for conflict detection:', course1.time1, course2.time1, error);
      return false; // Assume no conflict if we can't parse
    }
  };

  // Generate all possible combinations of courses with intelligent faculty prioritization
  const generateCombinations = (selectedCourseKeys: string[]): Course[][] => {
    // Step 1: Get all available sections for each selected course that meet time constraints and quality standards
    const courseSections: Course[][] = selectedCourseKeys.map(courseKey => {
      const allSections = programCourses.filter(course => 
        `${course.courseCode} - ${course.title}` === courseKey &&
        meetsTimeConstraints(course)
      );
      
      // Prioritize sections with proper faculty and time information
      const validSections = allSections.filter(course => 
        course.facultyName !== "TBA" && 
        course.facultyInitial !== "TBA" && 
        course.time1 && 
        course.time1 !== "TBA"
      );
      
      // If we have valid sections, use them; otherwise fall back to all sections
      // This ensures we don't exclude courses entirely but prefer quality data
      return validSections.length > 0 ? validSections : allSections;
    });
    
    // Check if any course has no available sections
    if (courseSections.some(sections => sections.length === 0)) {
      console.log('Some courses have no available sections that meet time constraints');
      return []; // No valid combinations possible
    }
    
    console.log('Starting combination generation for courses:', selectedCourseKeys);
    console.log('Preferred faculties:', courseSelection.prioritizedFaculties);
    console.log('Available sections per course:', courseSections.map((sections, i) => 
      `${selectedCourseKeys[i]}: ${sections.length} sections`
    ));

    // Step 2: Generate all valid combinations (no conflicts, meets constraints)
    const allValidCombinations: Course[][] = [];
    
    const generateCartesian = (index: number, current: Course[]) => {
      if (index === courseSections.length) {
        // Ensure we have exactly one course from each selected course
        if (current.length !== selectedCourseKeys.length) {
          return;
        }
        
        // Check if this combination has no time conflicts
        let hasConflict = false;
        for (let i = 0; i < current.length; i++) {
          for (let j = i + 1; j < current.length; j++) {
            if (hasTimeConflict(current[i], current[j])) {
              hasConflict = true;
              break;
            }
          }
          if (hasConflict) break;
        }
        
        if (!hasConflict) {
          // Check class days per week constraint
          if (timePreferences.classDaysPerWeek !== "Any") {
            const allDays = new Set<string>();
            current.forEach(course => {
              if (course.day1) allDays.add(course.day1);
              if (course.day2) allDays.add(course.day2);
            });
            
            const requiredDays = parseInt(timePreferences.classDaysPerWeek);
            if (allDays.size !== requiredDays) {
              return;
            }
          }
          
          // Check classes per day constraint
          if (timePreferences.classesPerDay !== "Any") {
            const dailyCount: { [day: string]: number } = {};
            current.forEach(course => {
              if (course.day1) dailyCount[course.day1] = (dailyCount[course.day1] || 0) + 1;
              if (course.day2) dailyCount[course.day2] = (dailyCount[course.day2] || 0) + 1;
            });
            
            const maxClassesPerDay = parseInt(timePreferences.classesPerDay);
            if (Object.values(dailyCount).some(count => count > maxClassesPerDay)) {
              return;
            }
          }
          
          // This is a valid combination that meets all course and time constraints
          allValidCombinations.push([...current]);
        }
        return;
      }
      
      // Try each available section for the current course
      for (const course of courseSections[index]) {
        generateCartesian(index + 1, [...current, course]);
      }
    };
    
    generateCartesian(0, []);
    
    console.log(`Generated ${allValidCombinations.length} valid combinations (before faculty prioritization)`);
    
    // Step 3: If no preferred faculties, return all valid combinations sorted by schedule efficiency
    if (courseSelection.prioritizedFaculties.length === 0) {
      console.log('No faculty preferences - sorting by schedule efficiency only');
      return allValidCombinations.sort((a, b) => {
        // Prefer fewer class days
        const aDays = new Set([...a.map(c => c.day1), ...a.map(c => c.day2)].filter(Boolean)).size;
        const bDays = new Set([...b.map(c => c.day1), ...b.map(c => c.day2)].filter(Boolean)).size;
        if (aDays !== bDays) return aDays - bDays;
        
        // Prefer earlier start times
        const aEarliestTime = Math.min(...a.map(c => c.time1 ? timeToMinutes(c.time1.split(' - ')[0]) : Infinity));
        const bEarliestTime = Math.min(...b.map(c => c.time1 ? timeToMinutes(c.time1.split(' - ')[0]) : Infinity));
        return aEarliestTime - bEarliestTime;
      });
    }

    console.log('=== ADVANCED FACULTY PRIORITIZATION ===');
    console.log(`Preferred faculties: ${courseSelection.prioritizedFaculties.length}`);
    
    // Group combinations by faculty metrics for intelligent prioritization
    const facultyAnalysis: {
      combination: Course[],
      uniqueFacultiesCount: number,
      totalFacultyMatches: number,
      matchedFaculties: string[],
      unmatchedFaculties: string[],
      tbaCount: number,
      missingTimeCount: number
    }[] = [];
    
    allValidCombinations.forEach(combination => {
      const combinationFaculties = combination.map(course => `${course.facultyName} (${course.facultyInitial})`);
      const matchedFaculties = courseSelection.prioritizedFaculties.filter(prefFaculty => 
        combinationFaculties.includes(prefFaculty)
      );
      const unmatchedFaculties = courseSelection.prioritizedFaculties.filter(prefFaculty => 
        !combinationFaculties.includes(prefFaculty)
      );
      
      // Count unique preferred faculties in this combination
      const uniquePreferredFaculties = new Set(matchedFaculties);
      
      // Count total assignments to preferred faculties (same faculty can teach multiple courses)
      const totalMatches = combinationFaculties.filter(faculty => 
        courseSelection.prioritizedFaculties.includes(faculty)
      ).length;
      
      // Count TBA faculties (penalty metric)
      const tbaCount = combination.filter(course => 
        course.facultyName === "TBA" || course.facultyInitial === "TBA"
      ).length;
      
      // Count missing time information (penalty metric)
      const missingTimeCount = combination.filter(course => 
        !course.time1 || course.time1 === "TBA"
      ).length;
      
      facultyAnalysis.push({
        combination,
        uniqueFacultiesCount: uniquePreferredFaculties.size,
        totalFacultyMatches: totalMatches,
        matchedFaculties,
        unmatchedFaculties,
        tbaCount,
        missingTimeCount
      });
    });
    
    // Step 5: Multi-tier sorting with sophisticated faculty logic
    facultyAnalysis.sort((a, b) => {
      // TIER 1: Prioritize by number of UNIQUE preferred faculties included
      // This ensures we try to include as many different preferred faculties as possible
      if (a.uniqueFacultiesCount !== b.uniqueFacultiesCount) {
        return b.uniqueFacultiesCount - a.uniqueFacultiesCount;
      }
      
      // TIER 2: Among schedules with same unique faculty count, prefer more total assignments
      // This rewards schedules where preferred faculties teach multiple courses
      if (a.totalFacultyMatches !== b.totalFacultyMatches) {
        return b.totalFacultyMatches - a.totalFacultyMatches;
      }
      
      // TIER 3: Avoid TBA faculties (data quality priority)
      if (a.tbaCount !== b.tbaCount) {
        return a.tbaCount - b.tbaCount; // Fewer TBA is better
      }
      
      // TIER 4: Avoid missing time information (data quality priority)
      if (a.missingTimeCount !== b.missingTimeCount) {
        return a.missingTimeCount - b.missingTimeCount; // Fewer missing times is better
      }
      
      // TIER 5: Prefer fewer total class days (more compact schedule)
      const aDays = new Set([...a.combination.map(c => c.day1), ...a.combination.map(c => c.day2)].filter(Boolean)).size;
      const bDays = new Set([...b.combination.map(c => c.day1), ...b.combination.map(c => c.day2)].filter(Boolean)).size;
      if (aDays !== bDays) {
        return aDays - bDays;
      }
      
      // TIER 6: Prefer earlier start times
      const aEarliestTime = Math.min(...a.combination.map(c => c.time1 ? timeToMinutes(c.time1.split(' - ')[0]) : Infinity));
      const bEarliestTime = Math.min(...b.combination.map(c => c.time1 ? timeToMinutes(c.time1.split(' - ')[0]) : Infinity));
      if (aEarliestTime !== bEarliestTime) {
        return aEarliestTime - bEarliestTime;
      }
      
      // TIER 7: Prefer later end times (less rushed schedule)
      const aLatestTime = Math.max(...a.combination.map(c => c.time1 ? timeToMinutes(c.time1.split(' - ')[1]) : 0));
      const bLatestTime = Math.max(...b.combination.map(c => c.time1 ? timeToMinutes(c.time1.split(' - ')[1]) : 0));
      if (aLatestTime !== bLatestTime) {
        return bLatestTime - aLatestTime;
      }
      
      // TIER 8: Prefer higher total credit hours (more academic value)
      const aTotalCredits = a.combination.reduce((sum, course) => sum + parseInt(course.credit || '0'), 0);
      const bTotalCredits = b.combination.reduce((sum, course) => sum + parseInt(course.credit || '0'), 0);
      if (aTotalCredits !== bTotalCredits) {
        return bTotalCredits - aTotalCredits;
      }
      
      // TIER 9: Alphabetical by first course code (consistent ordering)
      const aFirstCourse = a.combination[0]?.courseCode || '';
      const bFirstCourse = b.combination[0]?.courseCode || '';
      return aFirstCourse.localeCompare(bFirstCourse);
    });
    
    // Step 6: Detailed analysis and logging
    const resultsByTier: { [tier: string]: typeof facultyAnalysis } = {};
    
    facultyAnalysis.forEach(analysis => {
      const tierKey = `${analysis.uniqueFacultiesCount}-unique_${analysis.totalFacultyMatches}-total`;
      if (!resultsByTier[tierKey]) {
        resultsByTier[tierKey] = [];
      }
      resultsByTier[tierKey].push(analysis);
    });
    
    // Log comprehensive results
    const sortedTiers = Object.keys(resultsByTier).sort((a, b) => {
      const [aUnique, aTotal] = a.split('_').map(part => parseInt(part.split('-')[0]));
      const [bUnique, bTotal] = b.split('_').map(part => parseInt(part.split('-')[0]));
      
      if (aUnique !== bUnique) return bUnique - aUnique;
      return bTotal - aTotal;
    });
    
    console.log('=== FACULTY PRIORITIZATION RESULTS ===');
    sortedTiers.forEach(tierKey => {
      const [uniquePart, totalPart] = tierKey.split('_');
      const uniqueCount = parseInt(uniquePart.split('-')[0]);
      const totalCount = parseInt(totalPart.split('-')[0]);
      const tierCombinations = resultsByTier[tierKey];
      
      console.log(`\n📊 TIER: ${uniqueCount}/${courseSelection.prioritizedFaculties.length} unique faculties, ${totalCount} total assignments`);
      console.log(`   📈 ${tierCombinations.length} combinations in this tier`);
      
      // Show top 3 examples from this tier
      tierCombinations.slice(0, 3).forEach((analysis, index) => {
        const courses = analysis.combination.map(c => `${c.courseCode}(${c.section})`).join(', ');
        const faculties = analysis.matchedFaculties.map(f => f.split('(')[0].trim()).join(', ');
        const missing = analysis.unmatchedFaculties.map(f => f.split('(')[0].trim()).join(', ');
        const dataQuality = analysis.tbaCount === 0 && analysis.missingTimeCount === 0 ? '✅ Complete' : 
                          `⚠️ ${analysis.tbaCount} TBA, ${analysis.missingTimeCount} missing times`;
        
        console.log(`   ${index + 1}. Courses: ${courses}`);
        console.log(`      ✅ Matched: ${faculties || 'None'}`);
        console.log(`      ❌ Missing: ${missing || 'None'}`);
        console.log(`      📊 Data: ${dataQuality}`);
      });
    });
    
    // Step 7: Return prioritized combinations
    const finalResults = facultyAnalysis.map(analysis => analysis.combination);
    
    console.log(`\n🎯 FINAL: ${finalResults.length} combinations optimally sorted`);
    console.log('Priority order: 1) Max unique faculties 2) Max total assignments 3) Avoid TBA faculties 4) Complete time data 5) Fewer days 6) Earlier start 7) Later end 8) Higher credits 9) Alphabetical');
    
    return finalResults;
  };

  // Generate possible schedules
  const generateSchedules = () => {
    setIsGenerating(true);
    
    setTimeout(() => {
      console.log('=== SCHEDULE GENERATION STARTED ===');
      console.log('Selected courses:', courseSelection.selectedCourses);
      console.log('Time preferences:', timePreferences);
      console.log('Preferred faculties:', courseSelection.prioritizedFaculties);
      
      const combinations = generateCombinations(courseSelection.selectedCourses);
      console.log(`Found ${combinations.length} valid combinations after full analysis`);
      
      // Process ALL combinations, not just the first 10
      const allSchedules: GeneratedSchedule[] = combinations.map((combination, index) => {
        // Validate that we have exactly one course from each selected course
        const courseKeys = combination.map(course => `${course.courseCode} - ${course.title}`);
        const missingCourses = courseSelection.selectedCourses.filter(selectedCourse => 
          !courseKeys.includes(selectedCourse)
        );
        
        if (missingCourses.length > 0) {
          console.warn('Schedule missing courses:', missingCourses);
        }
        
        if (combination.length !== courseSelection.selectedCourses.length) {
          console.warn('Schedule has wrong number of courses:', combination.length, 'expected:', courseSelection.selectedCourses.length);
        }
        
        // Calculate daily schedule
        const dailySchedule: { [day: string]: Course[] } = {};
        const allDays = new Set<string>();
        
        combination.forEach(course => {
          // For courses with both day1 and day2, we'll show them as a single entry with combined days
          const courseDays = [course.day1, course.day2].filter(Boolean);
          courseDays.forEach(day => {
            allDays.add(day);
          });
          
          // Add course to the first day only to avoid duplicates in the table
          if (course.day1) {
            if (!dailySchedule[course.day1]) dailySchedule[course.day1] = [];
            dailySchedule[course.day1].push(course);
          }
        });
        
        // Sort courses by time for each day
        Object.keys(dailySchedule).forEach(day => {
          dailySchedule[day].sort((a, b) => {
            if (!a.time1 || !b.time1) return 0;
            return timeToMinutes(a.time1.split(' - ')[0]) - timeToMinutes(b.time1.split(' - ')[0]);
          });
        });
        
        // Calculate comprehensive faculty statistics
        const scheduleFaculties = combination.map(course => `${course.facultyName} (${course.facultyInitial})`);
        const matchedFaculties = courseSelection.prioritizedFaculties.filter(faculty => 
          scheduleFaculties.includes(faculty)
        );
        const missingFaculties = courseSelection.prioritizedFaculties.filter(faculty => 
          !scheduleFaculties.includes(faculty)
        ).map(faculty => faculty.split('(')[0].trim());
        
        // Calculate unique vs total matches
        const uniqueMatchedFaculties = new Set(matchedFaculties);
        const totalFacultyAssignments = scheduleFaculties.filter(faculty => 
          courseSelection.prioritizedFaculties.includes(faculty)
        ).length;
        
        const schedule = {
          id: `schedule-${index + 1}`,
          courses: combination,
          missingFaculties,
          totalDays: allDays.size,
          dailySchedule
        };
        
        // Only log first 10 in detail to avoid console spam
        if (index < 10) {
          console.log(`=== SCHEDULE ${index + 1} ===`);
          console.log('📚 Courses:', combination.map(c => `${c.courseCode} ${c.section} (${c.facultyName})`));
          console.log('👥 Faculty Analysis:');
          console.log(`   • Unique preferred faculties: ${uniqueMatchedFaculties.size}/${courseSelection.prioritizedFaculties.length}`);
          console.log(`   • Total preferred assignments: ${totalFacultyAssignments}/${combination.length}`);
          console.log(`   • Matched: ${matchedFaculties.map(f => f.split('(')[0].trim()).join(', ') || 'None'}`);
          console.log(`   • Missing: ${missingFaculties.join(', ') || 'None'}`);
          console.log('📅 Schedule:', `${allDays.size} days per week`);
        }
        
        return schedule;
      });
      
      // Store all schedules and reset pagination
      setAllSchedules(allSchedules);
      setDisplayedCount(10);
      setGeneratedSchedules(allSchedules.slice(0, 10));
      
      // The combinations are already optimally sorted by the advanced algorithm
      console.log('\n🏆 === FINAL SCHEDULE RANKING ===');
      console.log(`📊 Generated ${allSchedules.length} total schedules ranked by:`);
      console.log('   1️⃣ Maximum UNIQUE preferred faculties included');
      console.log('   2️⃣ Maximum TOTAL preferred faculty assignments');
      console.log('   3️⃣ Minimum class days per week (compact schedule)');
      console.log('   4️⃣ Earlier daily start times');
      console.log('   5️⃣ Later daily end times (less rushed)');
      console.log('   6️⃣ Higher total credit hours (academic value)');
      console.log('   7️⃣ Alphabetical consistency (reproducible results)');
      console.log(`\n💡 Showing first 10 schedules. Use "Show More" to see additional options!`);
      
      setIsGenerating(false);
    }, 1000);
  };

  // Function to show more schedules
  const showMoreSchedules = () => {
    const newDisplayedCount = displayedCount + 10;
    setDisplayedCount(newDisplayedCount);
    setGeneratedSchedules(allSchedules.slice(0, newDisplayedCount));
  };

  // Reset when program changes
  useEffect(() => {
    setCourseSelection({ selectedCourses: [], prioritizedFaculties: [] });
    setGeneratedSchedules([]);
    setAllSchedules([]);
    setDisplayedCount(10);
    setCourseSearchTerm("");
    setFacultySearchTerm("");
    setIsCourseSearchFocused(false);
    setIsFacultySearchFocused(false);
  }, [program]);

  return (
    <div className="space-y-6">
      {/* Program Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule Planner</CardTitle>
          <CardDescription>Generate optimal course schedules based on your preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Program</label>
            <Select value={program} onValueChange={setProgram}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BSCSE">BSCSE - Computer Science & Engineering</SelectItem>
                <SelectItem value="BSDS">BSDS - Data Science</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Time Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Time Preferences</CardTitle>
          <CardDescription>Set your scheduling constraints and preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Do not start classes before */}
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium">Do not start classes before</label>
              <Select
                value={timePreferences.startTimeLimit}
                onValueChange={(value) => setTimePreferences(prev => ({ ...prev, startTimeLimit: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Any">Any</SelectItem>
                  {getStartTimes().map(time => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Do not have classes after */}
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium">Do not have classes after</label>
              <Select
                value={timePreferences.endTimeLimit}
                onValueChange={(value) => setTimePreferences(prev => ({ ...prev, endTimeLimit: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Any">Any</SelectItem>
                  {getEndTimes().map(time => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Class days per week */}
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium">Class days per week</label>
              <Select
                value={timePreferences.classDaysPerWeek}
                onValueChange={(value) => setTimePreferences(prev => ({ ...prev, classDaysPerWeek: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Any">Any</SelectItem>
                  <SelectItem value="2">2 days</SelectItem>
                  <SelectItem value="3">3 days</SelectItem>
                  <SelectItem value="4">4 days</SelectItem>
                  <SelectItem value="5">5 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Classes per day */}
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium">Classes per day</label>
              <Select
                value={timePreferences.classesPerDay}
                onValueChange={(value) => setTimePreferences(prev => ({ ...prev, classesPerDay: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Any">Any</SelectItem>
                  <SelectItem value="1">1 class</SelectItem>
                  <SelectItem value="2">2 classes</SelectItem>
                  <SelectItem value="3">3 classes</SelectItem>
                  <SelectItem value="4">4 classes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Course Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Course Selection</CardTitle>
          <CardDescription>Select courses and prioritize faculties for your schedule</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Courses - Multi-select with search */}
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-medium">Search Courses (Select multiple)</label>
            <div className="space-y-2">
              {courseSelection.selectedCourses.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {courseSelection.selectedCourses.map((course, index) => (
                    <div key={index} className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
                      <span>{course.split(' - ')[0]}</span>
                      <button
                        onClick={() => {
                          setCourseSelection(prev => ({
                            ...prev,
                            selectedCourses: prev.selectedCourses.filter((_, i) => i !== index),
                            prioritizedFaculties: [] // Reset faculties when courses change
                          }));
                        }}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Search Input */}
              <div className="relative">
                <Input
                  type="text"
                  placeholder="DSA, DM, CSE 2218..."
                  value={courseSearchTerm}
                  onChange={(e) => setCourseSearchTerm(e.target.value)}
                  onFocus={() => setIsCourseSearchFocused(true)}
                  onBlur={() => {
                    // Delay hiding to allow clicking on dropdown items
                    setTimeout(() => setIsCourseSearchFocused(false), 150);
                  }}
                  className="w-full"
                />
                
                {/* Course Dropdown */}
                {(isCourseSearchFocused || courseSearchTerm) && getFilteredCourses().length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 bg-popover border rounded-md shadow-md mt-1 max-h-60 overflow-y-auto">
                    {getFilteredCourses()
                      .filter(course => !courseSelection.selectedCourses.includes(`${course.courseCode} - ${course.title}`))
                      .slice(0, 10)
                      .map((course, index) => (
                        <div
                          key={index}
                          className="flex flex-col p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer border-b last:border-b-0 transition-colors"
                          onClick={() => {
                            const courseKey = `${course.courseCode} - ${course.title}`;
                            setCourseSelection(prev => ({
                              ...prev,
                              selectedCourses: [...prev.selectedCourses, courseKey],
                              prioritizedFaculties: [] // Reset faculties when courses change
                            }));
                            setCourseSearchTerm("");
                            setIsCourseSearchFocused(false);
                          }}
                        >
                          <div className="font-medium text-sm">{course.courseCode}</div>
                          <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{course.title}</div>
                        </div>
                      ))}
                    {getFilteredCourses().filter(course => !courseSelection.selectedCourses.includes(`${course.courseCode} - ${course.title}`)).length > 10 && (
                      <div className="p-2 text-xs text-muted-foreground text-center bg-muted">
                        Showing first 10 results. Keep typing to narrow down...
                      </div>
                    )}
                  </div>
                )}
                
                {/* No results message */}
                {(isCourseSearchFocused || courseSearchTerm) && getFilteredCourses().length === 0 && courseSearchTerm && (
                  <div className="absolute top-full left-0 right-0 z-50 bg-popover border rounded-md shadow-md mt-1 p-3">
                    <div className="text-sm text-muted-foreground">No courses found matching &ldquo;{courseSearchTerm}&rdquo;</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Try searching with course code, full name, or abbreviations like &ldquo;DSA&rdquo;, &ldquo;DM&rdquo;, etc.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Prioritize by Faculties with search */}
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-medium">Prioritize by Faculties (Optional)</label>
            <div className="space-y-2">
              {courseSelection.prioritizedFaculties.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {courseSelection.prioritizedFaculties.map((faculty, index) => (
                    <div key={index} className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
                      <span>{faculty.split('(')[0].trim()}</span>
                      <button
                        onClick={() => {
                          setCourseSelection(prev => ({
                            ...prev,
                            prioritizedFaculties: prev.prioritizedFaculties.filter((_, i) => i !== index)
                          }));
                        }}
                        className="text-green-600 hover:text-green-800 dark:text-green-300 dark:hover:text-green-100"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Faculty Search Input */}
              <div className="relative">
                <Input
                  type="text"
                  placeholder={courseSelection.selectedCourses.length === 0 ? "Select courses first" : "Search faculty..."}
                  value={facultySearchTerm}
                  onChange={(e) => {
                    if (courseSelection.selectedCourses.length > 0) {
                      setFacultySearchTerm(e.target.value);
                    }
                  }}
                  onFocus={() => {
                    if (courseSelection.selectedCourses.length > 0) {
                      setIsFacultySearchFocused(true);
                    }
                  }}
                  onBlur={() => {
                    // Delay hiding to allow clicking on dropdown items
                    setTimeout(() => setIsFacultySearchFocused(false), 150);
                  }}
                  className={`w-full ${courseSelection.selectedCourses.length === 0 ? 'opacity-50' : ''}`}
                  disabled={courseSelection.selectedCourses.length === 0}
                />
                
                {/* Faculty Dropdown */}
                {courseSelection.selectedCourses.length > 0 && (isFacultySearchFocused || facultySearchTerm) && getFilteredFaculties().length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 bg-popover border rounded-md shadow-md mt-1 max-h-60 overflow-y-auto">
                    {getFilteredFaculties()
                      .filter(faculty => !courseSelection.prioritizedFaculties.includes(faculty))
                      .map((faculty, index) => (
                        <div
                          key={index}
                          className="p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer border-b last:border-b-0 transition-colors"
                          onClick={() => {
                            setCourseSelection(prev => ({
                              ...prev,
                              prioritizedFaculties: [...prev.prioritizedFaculties, faculty]
                            }));
                            setFacultySearchTerm("");
                            setIsFacultySearchFocused(false);
                          }}
                        >
                          <div className="font-medium text-sm">{faculty}</div>
                        </div>
                      ))}
                  </div>
                )}
                
                {/* No faculty results message */}
                {courseSelection.selectedCourses.length > 0 && (isFacultySearchFocused || facultySearchTerm) && getFilteredFaculties().length === 0 && facultySearchTerm && (
                  <div className="absolute top-full left-0 right-0 z-50 bg-popover border rounded-md shadow-md mt-1 p-3">
                    <div className="text-sm text-muted-foreground">No faculty found matching &ldquo;{facultySearchTerm}&rdquo;</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generate Button */}
      <div className="flex justify-center">
        <Button 
          onClick={generateSchedules}
          disabled={courseSelection.selectedCourses.length === 0 || isGenerating}
          size="lg"
          className="w-full max-w-md"
        >
          {isGenerating ? "Generating..." : "Generate Potential Routines"}
        </Button>
      </div>

      {/* Generated Schedules */}
      {generatedSchedules.length > 0 && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className="text-base sm:text-lg font-semibold">
              Generated Schedules ({generatedSchedules.length} of {allSchedules.length} shown)
            </h3>
            <div className="flex gap-2 items-center w-full sm:w-auto">
              {allSchedules.length > generatedSchedules.length && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={showMoreSchedules}
                  className="text-xs sm:text-sm flex-1 sm:flex-none"
                >
                  Show More (+10)
                </Button>
              )}
              <p className="text-xs sm:text-sm text-muted-foreground">
                Total: {allSchedules.length}
              </p>
            </div>
          </div>
          
          {generatedSchedules.map((schedule, index) => (
            <Card key={schedule.id}>
              <CardHeader className="px-4 sm:px-6">
                {/* Mobile Layout */}
                <div className="flex flex-col gap-2 sm:hidden">
                  {/* Row 1: Title and Button */}
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-base font-semibold">Schedule Option {index + 1}</span>
                    <Button
                      onClick={() => onAddPlanFromSchedule(schedule.courses, `Schedule Option ${index + 1}`)}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex-shrink-0"
                    >
                      + Add as Section Plan
                    </Button>
                  </div>
                  {/* Row 2: Badges */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                      {schedule.totalDays} days/week
                    </span>
                    {schedule.missingFaculties.length === 0 && (
                      <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                        All preferred faculties
                      </span>
                    )}
                  </div>
                </div>

                {/* Desktop Layout - Everything in one line */}
                <div className="hidden sm:flex sm:justify-between sm:items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold">Schedule Option {index + 1}</span>
                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-sm">
                      {schedule.totalDays} days/week
                    </span>
                    {schedule.missingFaculties.length === 0 && (
                      <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded text-sm">
                        All preferred faculties
                      </span>
                    )}
                  </div>
                  <Button
                    onClick={() => onAddPlanFromSchedule(schedule.courses, `Schedule Option ${index + 1}`)}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                  >
                    + Add as Section Plan
                  </Button>
                </div>

                {schedule.missingFaculties.length > 0 && (
                  <CardDescription className="text-orange-600 dark:text-orange-400 text-xs sm:text-sm mt-2">
                    ⚠️ Missing preferred faculties: {schedule.missingFaculties.join(", ")}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                {/* Weekly Schedule Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200 dark:border-gray-700 min-w-[640px]">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800">
                        <th className="border border-gray-200 dark:border-gray-700 px-2 sm:px-3 py-2 text-left font-medium text-xs sm:text-sm">Days</th>
                        <th className="border border-gray-200 dark:border-gray-700 px-2 sm:px-3 py-2 text-left font-medium text-xs sm:text-sm">Course</th>
                        <th className="border border-gray-200 dark:border-gray-700 px-2 sm:px-3 py-2 text-left font-medium text-xs sm:text-sm">Section</th>
                        <th className="border border-gray-200 dark:border-gray-700 px-2 sm:px-3 py-2 text-left font-medium text-xs sm:text-sm">Faculty</th>
                        <th className="border border-gray-200 dark:border-gray-700 px-2 sm:px-3 py-2 text-left font-medium text-xs sm:text-sm">Time</th>
                        <th className="border border-gray-200 dark:border-gray-700 px-2 sm:px-3 py-2 text-left font-medium text-xs sm:text-sm">Room</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedule.courses
                        .sort((a, b) => {
                          if (!a.time1 || !b.time1) return 0;
                          return timeToMinutes(a.time1.split(' - ')[0]) - timeToMinutes(b.time1.split(' - ')[0]);
                        })
                        .map((course, courseIndex) => (
                          <tr key={`course-${courseIndex}`} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="border border-gray-200 dark:border-gray-700 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium whitespace-nowrap">
                              {course.day1 && course.day2 ? `${course.day1} - ${course.day2}` : course.day1}
                            </td>
                            <td className="border border-gray-200 dark:border-gray-700 px-2 sm:px-3 py-2 text-xs sm:text-sm">
                              <div className="font-medium">{course.courseCode}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{course.title}</div>
                            </td>
                            <td className="border border-gray-200 dark:border-gray-700 px-2 sm:px-3 py-2 text-xs sm:text-sm">{course.section}</td>
                            <td className="border border-gray-200 dark:border-gray-700 px-2 sm:px-3 py-2 text-xs sm:text-sm">
                              <div className={courseSelection.prioritizedFaculties.includes(`${course.facultyName} (${course.facultyInitial})`) ? 'text-green-600 dark:text-green-400 font-medium' : ''}>
                                {course.facultyName === "TBA" ? "TBA" : `${course.facultyName} (${course.facultyInitial})`}
                              </div>
                            </td>
                            <td className="border border-gray-200 dark:border-gray-700 px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap">{course.time1}</td>
                            <td className="border border-gray-200 dark:border-gray-700 px-2 sm:px-3 py-2 text-xs sm:text-sm">{course.room1}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Schedule Summary */}
                <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
                  <div className="bg-gray-50 dark:bg-gray-800 p-2 sm:p-3 rounded">
                    <span className="font-medium text-gray-900 dark:text-gray-100">Total Courses: </span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">{schedule.courses.length}</span>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-2 sm:p-3 rounded">
                    <span className="font-medium text-gray-900 dark:text-gray-100">Total Credits: </span>
                    <span className="font-bold text-green-600 dark:text-green-400">
                      {schedule.courses.reduce((sum, course) => sum + parseInt(course.credit || '0'), 0)}
                    </span>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-2 sm:p-3 rounded">
                    <span className="font-medium text-gray-900 dark:text-gray-100">Class Days: </span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">{schedule.totalDays}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {/* Show More Button at the bottom */}
          {allSchedules.length > generatedSchedules.length && (
            <div className="text-center">
              <Button 
                variant="outline" 
                onClick={showMoreSchedules}
                className="w-full max-w-md"
              >
                Show More Schedules (+10) - {allSchedules.length - generatedSchedules.length} remaining
              </Button>
            </div>
          )}
        </div>
      )}

      {/* No schedules found message */}
      {!isGenerating && generatedSchedules.length === 0 && courseSelection.selectedCourses.length > 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-gray-500 dark:text-gray-400">
              <div className="text-lg font-medium mb-2">No valid schedules found</div>
              <div className="text-sm">
                Try adjusting your time preferences or selecting different courses.
                The current constraints may be too restrictive.
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SchedulePlanner;
