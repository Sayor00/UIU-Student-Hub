"use client";

import { useState, useEffect, useRef } from "react";
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

interface CourseCardData {
  id: string;
  selectedCourse: string;
  selectedFaculty: string;
  selectedDay: string;
  selectedTime: string;
  finalSection?: Course;
  targetPlanId?: string; // New field to track which plan this card should add to
}

interface SectionPlan {
  id: string;
  name: string;
  courses: Course[];
}

interface ConflictInfo {
  course: Course;
  planId: string;
  planName: string;
}

interface CourseCardSelectorProps {
  courses: Course[];
  sectionPlans: SectionPlan[];
  onCourseSelect: (course: Course, planId?: string) => void;
  onClearAllSelected: () => void;
  onNavigateToPlan?: (planId: string) => void;
}

const CourseCard = ({
  cardData,
  courses,
  program,
  selectedCourses,
  sectionPlans,
  allCards,
  onUpdate,
  onDelete,
  onAddSection,
  onRemoveSection,
  checkConflict,
  onNavigateToPlan,
}: {
  cardData: CourseCardData;
  courses: Course[];
  program: string;
  selectedCourses: Course[];
  sectionPlans: SectionPlan[];
  allCards: CourseCardData[];
  onUpdate: (id: string, updates: Partial<CourseCardData>) => void;
  onDelete: (id: string) => void;
  onAddSection: (course: Course, planId?: string) => void;
  onRemoveSection: (course: Course) => void;
  checkConflict: (newCourse: Course, targetPlanId?: string) => ConflictInfo[];
  onNavigateToPlan?: (planId: string) => void;
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [facultySearchTerm, setFacultySearchTerm] = useState("");
  const [isCourseFocused, setIsCourseFocused] = useState(false);
  const [isFacultyFocused, setIsFacultyFocused] = useState(false);

  // Filter courses by program
  const programCourses = courses.filter(course => course.program === program);

  // Get unique courses for search
  const uniqueCourses = Array.from(
    new Map(
      programCourses.map(course => [
        `${course.courseCode}-${course.title}`,
        { courseCode: course.courseCode, title: course.title }
      ])
    ).values()
  );

  // Filter courses by search term with enhanced matching
  const filteredCourses = uniqueCourses.filter(course => {
    const searchLower = searchTerm.toLowerCase().trim();
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

  // Get available faculties for selected course
  // Only exclude a faculty if ALL their sections for this course are already used
  const availableFaculties = cardData.selectedCourse
    ? Array.from(
        new Set(
          programCourses
            .filter(course => `${course.courseCode} - ${course.title}` === cardData.selectedCourse)
            .map(course => `${course.facultyName} (${course.facultyInitial})`)
        )
      ).filter(facultyString => {
        // Get all sections for this course+faculty combination
        const allSectionsForThisFaculty = programCourses.filter(course => 
          `${course.courseCode} - ${course.title}` === cardData.selectedCourse &&
          `${course.facultyName} (${course.facultyInitial})` === facultyString
        );
        
        // Check how many of these sections are used in other cards
        const usedSections = allSectionsForThisFaculty.filter(course =>
          allCards.some(otherCard => 
            otherCard.id !== cardData.id &&
            otherCard.finalSection &&
            otherCard.finalSection.courseCode === course.courseCode &&
            otherCard.finalSection.section === course.section
          )
        );
        
        // Only hide this faculty if ALL their sections are used
        return usedSections.length < allSectionsForThisFaculty.length;
      })
    : [];

  // Filter faculties by search term
  const filteredFaculties = availableFaculties.filter(faculty =>
    faculty.toLowerCase().includes(facultySearchTerm.toLowerCase())
  );

  // Get available days for selected course and faculty
  // Only exclude a day if ALL sections with this course+faculty+day are already used
  const availableDays = cardData.selectedFaculty
    ? Array.from(
        new Set(
          programCourses
            .filter(course => {
              const courseMatch = `${course.courseCode} - ${course.title}` === cardData.selectedCourse;
              const facultyMatch = `${course.facultyName} (${course.facultyInitial})` === cardData.selectedFaculty;
              return courseMatch && facultyMatch;
            })
            .map(course => {
              // Create day combination string like the table shows
              if (course.day1 && course.day2) {
                return `${course.day1} - ${course.day2}`;
              } else if (course.day1) {
                return course.day1;
              }
              return '';
            })
            .filter(Boolean)
        )
      ).filter(dayString => {
        // Get all sections for this course+faculty+day combination
        const allSectionsForThisDay = programCourses.filter(course => {
          const courseMatch = `${course.courseCode} - ${course.title}` === cardData.selectedCourse;
          const facultyMatch = `${course.facultyName} (${course.facultyInitial})` === cardData.selectedFaculty;
          const courseDayString = course.day1 && course.day2 
            ? `${course.day1} - ${course.day2}` 
            : course.day1;
          return courseMatch && facultyMatch && courseDayString === dayString;
        });
        
        // Check how many of these sections are used in other cards
        const usedSections = allSectionsForThisDay.filter(course =>
          allCards.some(otherCard => 
            otherCard.id !== cardData.id &&
            otherCard.finalSection &&
            otherCard.finalSection.courseCode === course.courseCode &&
            otherCard.finalSection.section === course.section
          )
        );
        
        // Only hide this day if ALL sections for this day are used
        return usedSections.length < allSectionsForThisDay.length;
      })
    : [];

  // Get available times for selected course, faculty, and day
  // Exclude times that are already used (exact section match)
  const availableTimes = cardData.selectedDay
    ? Array.from(
        new Set(
          programCourses
            .filter(course => {
              const courseMatch = `${course.courseCode} - ${course.title}` === cardData.selectedCourse;
              const facultyMatch = `${course.facultyName} (${course.facultyInitial})` === cardData.selectedFaculty;
              
              // Match the day combination
              let dayMatch = false;
              if (course.day1 && course.day2) {
                dayMatch = `${course.day1} - ${course.day2}` === cardData.selectedDay;
              } else if (course.day1) {
                dayMatch = course.day1 === cardData.selectedDay;
              }
              
              if (!courseMatch || !facultyMatch || !dayMatch) return false;
              
              // Check if this EXACT section is already used in another card
              const isUsedInOtherCard = allCards.some(otherCard => 
                otherCard.id !== cardData.id &&
                otherCard.finalSection &&
                otherCard.finalSection.courseCode === course.courseCode &&
                otherCard.finalSection.section === course.section
              );
              
              return !isUsedInOtherCard;
            })
            .map(course => {
              // Return the time that corresponds to the selected day pattern
              if (course.day1 && course.day2) {
                // For courses with two days, typically they have the same time
                return course.time1;
              } else {
                // For single day courses
                return course.time1;
              }
            })
            .filter(Boolean)
        )
      )
    : [];

  // Get final section when all selections are made
  useEffect(() => {
    if (cardData.selectedCourse && cardData.selectedFaculty && cardData.selectedDay && cardData.selectedTime) {
      const matchingCourse = programCourses.find(course => {
        const courseMatch = `${course.courseCode} - ${course.title}` === cardData.selectedCourse;
        const facultyMatch = `${course.facultyName} (${course.facultyInitial})` === cardData.selectedFaculty;
        
        // Match the day combination
        let dayMatch = false;
        if (course.day1 && course.day2) {
          dayMatch = `${course.day1} - ${course.day2}` === cardData.selectedDay;
        } else if (course.day1) {
          dayMatch = course.day1 === cardData.selectedDay;
        }
        
        const timeMatch = course.time1 === cardData.selectedTime || course.time2 === cardData.selectedTime;
        return courseMatch && facultyMatch && dayMatch && timeMatch;
      });

      if (matchingCourse && matchingCourse !== cardData.finalSection) {
        onUpdate(cardData.id, { finalSection: matchingCourse });
        // Removed automatic adding - user must click "Add to [Plan]" button
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardData.selectedCourse, cardData.selectedFaculty, cardData.selectedDay, cardData.selectedTime, cardData.targetPlanId]);

  const handleCourseSelect = (courseString: string) => {
    onUpdate(cardData.id, {
      selectedCourse: courseString,
      selectedFaculty: "",
      selectedDay: "",
      selectedTime: "",
      finalSection: undefined,
    });
    setSearchTerm("");
  };

  const handleFacultySelect = (facultyString: string) => {
    onUpdate(cardData.id, {
      selectedFaculty: facultyString,
      selectedDay: "",
      selectedTime: "",
      finalSection: undefined,
    });
    setFacultySearchTerm("");
  };

  const handleClear = () => {
    // If there's a final section, remove it from all plans
    if (cardData.finalSection) {
      onRemoveSection(cardData.finalSection);
    }
    
    onUpdate(cardData.id, {
      selectedCourse: "",
      selectedFaculty: "",
      selectedDay: "",
      selectedTime: "",
      finalSection: undefined,
    });
    setSearchTerm("");
    setFacultySearchTerm("");
    setIsCourseFocused(false);
    setIsFacultyFocused(false);
  };

  // Check if the final section is already selected
  const isAlreadySelected = cardData.finalSection ? 
    selectedCourses.some(course => 
      course.courseCode === cardData.finalSection!.courseCode && 
      course.section === cardData.finalSection!.section
    ) : false;

  // Find all plans that contain this course
  const plansWithThisCourse = cardData.finalSection 
    ? sectionPlans.filter(plan => 
        plan.courses.some(c => 
          c.courseCode === cardData.finalSection!.courseCode && 
          c.section === cardData.finalSection!.section
        )
      )
    : [];

  // Check for conflicts in each plan that has this course
  const conflicts = cardData.finalSection && isAlreadySelected
    ? plansWithThisCourse.flatMap(plan => checkConflict(cardData.finalSection!, plan.id))
    : [];

  // Check if this exact course selection already exists in another card
  const isDuplicate = cardData.finalSection ? allCards.some(card => 
    card.id !== cardData.id && 
    card.finalSection && 
    card.finalSection.courseCode === cardData.finalSection!.courseCode &&
    card.finalSection.section === cardData.finalSection!.section
  ) : false;

  // Deduplicate conflicts (same course + same plan)
  const uniqueConflicts = Array.from(
    new Map(
      conflicts.map(c => [
        `${c.course.courseCode}-${c.course.section}-${c.planId}`,
        c
      ])
    ).values()
  );

  return (
    <Card className="w-full">
      <CardHeader className="px-4 sm:px-6">
        <CardTitle className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <span className="text-lg sm:text-xl">Course Selection</span>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleClear} 
              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 flex-1 sm:flex-none text-xs sm:text-sm"
            >
              Clear
            </Button>
            <Button variant="outline" size="sm" onClick={() => onDelete(cardData.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-1 sm:flex-none text-xs sm:text-sm">
              Delete
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-4 sm:px-6">
        {/* All Selection Inputs - Grid Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Course Search */}
          <div className="space-y-2 sm:col-span-2 lg:col-span-1">
            <label className="text-xs sm:text-sm font-medium">Search course</label>
            <div className="relative">
              <Input
                type="text"
                placeholder="DSA, DM, CSE 2218..."
                value={cardData.selectedCourse ? `${cardData.selectedCourse.split(' - ')[0]} (${cardData.selectedCourse.split(' - ')[1]})` : searchTerm}
                onChange={(e) => {
                  if (!cardData.selectedCourse && !isAlreadySelected) {
                    setSearchTerm(e.target.value);
                  }
                }}
                onFocus={() => {
                  if (!cardData.selectedCourse && !isAlreadySelected) {
                    setIsCourseFocused(true);
                  }
                }}
                onBlur={() => {
                  // Delay hiding to allow clicking on dropdown items
                  setTimeout(() => setIsCourseFocused(false), 150);
                }}
                className={`w-full text-xs sm:text-sm ${cardData.selectedCourse ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' : ''}`}
                readOnly={!!cardData.selectedCourse || isAlreadySelected}
                disabled={isAlreadySelected}
              />
              {!cardData.selectedCourse && (isCourseFocused || searchTerm) && filteredCourses.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 bg-popover border rounded-md shadow-md mt-1 max-h-60 overflow-y-auto">
                  {filteredCourses.slice(0, 10).map((course, index) => (
                    <div
                      key={index}
                      className="flex flex-col p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer border-b last:border-b-0 transition-colors"
                      onClick={() => {
                        handleCourseSelect(`${course.courseCode} - ${course.title}`);
                        setIsCourseFocused(false);
                      }}
                    >
                      <div className="font-medium text-sm">{course.courseCode}</div>
                      <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{course.title}</div>
                    </div>
                  ))}
                  {filteredCourses.length > 10 && (
                    <div className="p-2 text-xs text-muted-foreground text-center bg-muted">
                      Showing first 10 results. Keep typing to narrow down...
                    </div>
                  )}
                </div>
              )}
              {!cardData.selectedCourse && (isCourseFocused || searchTerm) && filteredCourses.length === 0 && searchTerm && (
                <div className="absolute top-full left-0 right-0 z-50 bg-popover border rounded-md shadow-md mt-1 p-3">
                  <div className="text-sm text-muted-foreground">No courses found matching &ldquo;{searchTerm}&rdquo;</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Try searching with course code, full name, or abbreviations like &ldquo;DSA&rdquo;, &ldquo;DM&rdquo;, etc.
                  </div>
                </div>
              )}
              {cardData.selectedCourse && !isAlreadySelected && (
                <button
                  onClick={() => {
                    // If there's a final section when clearing course, remove it
                    if (cardData.finalSection) {
                      onRemoveSection(cardData.finalSection);
                    }
                    
                    onUpdate(cardData.id, { selectedCourse: "", selectedFaculty: "", selectedDay: "", selectedTime: "", finalSection: undefined });
                    setSearchTerm("");
                    setFacultySearchTerm("");
                    setIsCourseFocused(false);
                    setIsFacultyFocused(false);
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-emerald-600 hover:text-emerald-700 text-sm"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Faculty Selection */}
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-medium">Select faculty</label>
            <div className="relative">
              <Input
                type="text"
                placeholder={!cardData.selectedCourse ? "Select course first" : "Search faculty..."}
                value={cardData.selectedFaculty ? cardData.selectedFaculty.split('(')[0].trim() : facultySearchTerm}
                onChange={(e) => {
                  if (!cardData.selectedFaculty && cardData.selectedCourse && !isAlreadySelected) {
                    setFacultySearchTerm(e.target.value);
                  }
                }}
                onFocus={() => {
                  if (!cardData.selectedFaculty && cardData.selectedCourse && !isAlreadySelected) {
                    setIsFacultyFocused(true);
                  }
                }}
                onBlur={() => {
                  // Delay hiding to allow clicking on dropdown items
                  setTimeout(() => setIsFacultyFocused(false), 150);
                }}
                className={`w-full text-xs sm:text-sm ${
                  !cardData.selectedCourse ? 'opacity-50' : ''
                } ${cardData.selectedFaculty ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' : ''}`}
                disabled={!cardData.selectedCourse || isAlreadySelected}
                readOnly={!!cardData.selectedFaculty || isAlreadySelected}
              />
              {!cardData.selectedFaculty && cardData.selectedCourse && (isFacultyFocused || facultySearchTerm) && filteredFaculties.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 bg-popover border rounded-md shadow-md mt-1 max-h-60 overflow-y-auto">
                  {filteredFaculties.map((faculty, index) => (
                    <div
                      key={index}
                      className="p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer border-b last:border-b-0 transition-colors"
                      onClick={() => {
                        handleFacultySelect(faculty);
                        setIsFacultyFocused(false);
                      }}
                    >
                      <div className="font-medium text-sm">{faculty}</div>
                    </div>
                  ))}
                </div>
              )}
              {!cardData.selectedFaculty && cardData.selectedCourse && (isFacultyFocused || facultySearchTerm) && filteredFaculties.length === 0 && facultySearchTerm && (
                <div className="absolute top-full left-0 right-0 z-50 bg-popover border rounded-md shadow-md mt-1 p-3">
                  <div className="text-sm text-muted-foreground">No faculty found matching &ldquo;{facultySearchTerm}&rdquo;</div>
                </div>
              )}
              {cardData.selectedFaculty && !isAlreadySelected && (
                <button
                  onClick={() => {
                    // If there's a final section when clearing faculty, remove it  
                    if (cardData.finalSection) {
                      onRemoveSection(cardData.finalSection);
                    }
                    
                    onUpdate(cardData.id, { selectedFaculty: "", selectedDay: "", selectedTime: "", finalSection: undefined });
                    setFacultySearchTerm("");
                    setIsFacultyFocused(false);
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-emerald-600 hover:text-emerald-700 text-sm"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Day Selection */}
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-medium">Select day</label>
            <Select
              value={cardData.selectedDay}
              onValueChange={(value: string) => onUpdate(cardData.id, { selectedDay: value, selectedTime: "", finalSection: undefined })}
              disabled={!cardData.selectedFaculty || isAlreadySelected}
            >
              <SelectTrigger className={`text-xs sm:text-sm ${!cardData.selectedFaculty ? "opacity-50" : ""} ${cardData.selectedDay ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' : ''}`}>
                <SelectValue placeholder={!cardData.selectedFaculty ? "Select faculty first" : "Choose day"} />
              </SelectTrigger>
              <SelectContent>
                {availableDays.map((day, index) => (
                  <SelectItem key={index} value={day}>
                    {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time Selection */}
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-medium">Select time</label>
            <Select
              value={cardData.selectedTime}
              onValueChange={(value: string) => onUpdate(cardData.id, { selectedTime: value })}
              disabled={!cardData.selectedDay || isAlreadySelected}
            >
              <SelectTrigger className={`text-xs sm:text-sm ${!cardData.selectedDay ? "opacity-50" : ""} ${cardData.selectedTime ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' : ''}`}>
                <SelectValue placeholder={!cardData.selectedDay ? "Select day first" : "Choose time"} />
              </SelectTrigger>
              <SelectContent>
                {availableTimes.map((time, index) => (
                  <SelectItem key={index} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Final Section Display */}
        {cardData.finalSection && (
          <div className={`space-y-3 p-3 sm:p-4 rounded-lg border ${
            isDuplicate
              ? "bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 border-yellow-200 dark:border-yellow-800"
              : uniqueConflicts.length > 0
                ? "bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border-red-200 dark:border-red-800"
                : isAlreadySelected 
                  ? "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800"
                  : "bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-950/20 dark:to-slate-950/20 border border-gray-200 dark:border-gray-800"
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  isDuplicate
                    ? "bg-yellow-500"
                    : uniqueConflicts.length > 0 
                      ? "bg-red-500" 
                      : isAlreadySelected 
                        ? "bg-blue-500" 
                        : "bg-gray-500"
                }`}></div>
                <span className={`font-semibold text-sm sm:text-base ${
                  isDuplicate
                    ? "text-yellow-800 dark:text-yellow-200"
                    : uniqueConflicts.length > 0
                      ? "text-red-800 dark:text-red-200"
                      : isAlreadySelected 
                        ? "text-blue-800 dark:text-blue-200" 
                        : "text-gray-800 dark:text-gray-200"
                }`}>
                  {isDuplicate ? "Duplicate Card" : uniqueConflicts.length > 0 ? "Schedule Conflict" : isAlreadySelected ? "Added to Selection" : "Section Found"}
                </span>
                {isDuplicate && (
                  <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded-full">
                    Same as another card
                  </span>
                )}
                {isAlreadySelected && (
                  <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                    Selected
                  </span>
                )}
                {uniqueConflicts.length > 0 && (
                  <span className="text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-1 rounded-full">
                    {uniqueConflicts.length} Conflict{uniqueConflicts.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              
              {/* Add to Plan Button/Dropdown - Always visible */}
              <div className="flex gap-2">
                {sectionPlans.length === 1 ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      if (cardData.finalSection && !isDuplicate) {
                        onAddSection(cardData.finalSection, sectionPlans[0].id);
                      }
                    }}
                    className="text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700"
                    disabled={isDuplicate || sectionPlans[0].courses.some(c => 
                      cardData.finalSection && c.courseCode === cardData.finalSection.courseCode
                    )}
                  >
                    {sectionPlans[0].courses.some(c => 
                      cardData.finalSection && c.courseCode === cardData.finalSection.courseCode
                    ) ? 'Added' : isDuplicate ? 'Duplicate' : 'Add'}
                  </Button>
                ) : (
                  <Select 
                    value="" // Always reset to empty after selection
                    onValueChange={(planId) => {
                      if (cardData.finalSection && !isDuplicate) {
                        onAddSection(cardData.finalSection, planId);
                        // Select will automatically reset to empty due to value=""
                      }
                    }}
                    disabled={isDuplicate}
                  >
                    <SelectTrigger className="h-8 text-xs w-full sm:w-[90px] bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600">
                      <SelectValue placeholder={isDuplicate ? "Duplicate" : "Add to..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {sectionPlans.map(plan => {
                        const alreadyHasCourse = plan.courses.some(c => 
                          cardData.finalSection && c.courseCode === cardData.finalSection.courseCode
                        );
                        const wouldConflict = cardData.finalSection ? checkConflict(cardData.finalSection, plan.id).length > 0 : false;
                        
                        return (
                          <SelectItem 
                            key={plan.id} 
                            value={plan.id} 
                            className={`text-xs ${wouldConflict ? 'text-red-600 dark:text-red-400' : ''}`}
                            disabled={alreadyHasCourse}
                          >
                            {wouldConflict && '⚠️ '}
                            {plan.name} 
                            {alreadyHasCourse ? ' (Has this)' : wouldConflict ? ' (Will conflict)' : ''}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            
            {/* Duplicate Warning */}
            {isDuplicate && (
              <div className="bg-yellow-100 dark:bg-yellow-900/20 p-2 sm:p-3 rounded-md">
                <div className="font-medium text-xs sm:text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ This exact course section is already selected in another card. Please use a different card or delete the duplicate.
                </div>
              </div>
            )}
            
            {/* Conflict Details */}
            {uniqueConflicts.length > 0 && (
              <div className="bg-red-100 dark:bg-red-900/20 p-2 sm:p-3 rounded-md">
                <div className="font-medium text-xs sm:text-sm text-red-800 dark:text-red-200 mb-2">
                  This section conflicts with:
                </div>
                {uniqueConflicts.map((conflictInfo, index) => (
                  <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-2 last:mb-0">
                    <div className="flex-1 text-xs sm:text-sm text-red-700 dark:text-red-300">
                      • {conflictInfo.course.courseCode} {conflictInfo.course.section} - {conflictInfo.course.day1}{conflictInfo.course.day2 ? ` - ${conflictInfo.course.day2}` : ''} at {conflictInfo.course.time1}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs px-2 py-1 h-auto bg-red-200 dark:bg-red-800 border-red-300 dark:border-red-700 hover:bg-red-300 dark:hover:bg-red-700 whitespace-nowrap w-full sm:w-auto"
                      onClick={() => onNavigateToPlan?.(conflictInfo.planId)}
                    >
                      📍 {conflictInfo.planName}
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
              <div className="space-y-1">
                <div><span className="font-medium">Section:</span> {cardData.finalSection.section}</div>
                <div><span className="font-medium">Credit:</span> {cardData.finalSection.credit}</div>
              </div>
              <div className="space-y-1">
                <div><span className="font-medium">Time:</span> {cardData.finalSection.time1}</div>
                <div><span className="font-medium">Room:</span> {cardData.finalSection.room1}</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function CourseCardSelector({ courses, sectionPlans, onCourseSelect, onClearAllSelected, onNavigateToPlan }: CourseCardSelectorProps) {
  const [program, setProgram] = useState<string>("BSCSE");
  const [cards, setCards] = useState<CourseCardData[]>([{ 
    id: "1", 
    selectedCourse: "", 
    selectedFaculty: "", 
    selectedDay: "", 
    selectedTime: "",
    targetPlanId: sectionPlans[0]?.id // Default to first plan
  }]);
  const lastSelectedCoursesRef = useRef<Course[]>([]);
  const previousProgramRef = useRef<string>("BSCSE");

  // Derive selectedCourses from all section plans
  const selectedCourses = sectionPlans.flatMap(plan => plan.courses);

  // Effect to sync cards with selected courses - create cards for externally selected courses
  useEffect(() => {
    // Check if selectedCourses actually changed
    const selectedCoursesChanged = 
      selectedCourses.length !== lastSelectedCoursesRef.current.length ||
      selectedCourses.some((course, index) => {
        const lastCourse = lastSelectedCoursesRef.current[index];
        return !lastCourse || course.courseCode !== lastCourse.courseCode || course.section !== lastCourse.section;
      });
    
    if (!selectedCoursesChanged) {
      return;
    }
    
    lastSelectedCoursesRef.current = [...selectedCourses];
    
    setCards(prevCards => {
      const existingCardCourses = prevCards
        .filter(card => card.finalSection)
        .map(card => `${card.finalSection!.courseCode}-${card.finalSection!.section}`);
      
      const selectedCoursesIds = selectedCourses.map(course => `${course.courseCode}-${course.section}`);
      
      // Find courses that are selected but don't have cards
      const coursesNeedingCards = selectedCourses.filter(course => {
        const courseId = `${course.courseCode}-${course.section}`;
        return !existingCardCourses.includes(courseId) && course.program === program;
      });
      
      let newCards = [...prevCards];
      
      // Create cards for newly selected courses (skip if exact same card already exists)
      coursesNeedingCards.forEach(course => {
        // Check if a card with the exact same selections already exists
        const exactCardExists = newCards.some(card => 
          card.selectedCourse === `${course.courseCode} - ${course.title}` &&
          card.selectedFaculty === `${course.facultyName} (${course.facultyInitial})` &&
          card.selectedDay === (course.day1 && course.day2 ? `${course.day1} - ${course.day2}` : course.day1) &&
          card.selectedTime === course.time1
        );
        
        // Skip creating this card if an exact match already exists
        if (exactCardExists) {
          return;
        }
        
        // Find which plan this course belongs to
        const planWithCourse = sectionPlans.find(plan => 
          plan.courses.some(c => c.courseCode === course.courseCode && c.section === course.section)
        );
        
        // Check if we have an empty card we can use
        const emptyCardIndex = newCards.findIndex(card => 
          !card.selectedCourse && !card.selectedFaculty && !card.selectedDay && !card.selectedTime && !card.finalSection
        );
        
        if (emptyCardIndex !== -1) {
          // Use existing empty card
          newCards[emptyCardIndex] = {
            ...newCards[emptyCardIndex],
            selectedCourse: `${course.courseCode} - ${course.title}`,
            selectedFaculty: `${course.facultyName} (${course.facultyInitial})`,
            selectedDay: course.day1 && course.day2 ? `${course.day1} - ${course.day2}` : course.day1,
            selectedTime: course.time1,
            finalSection: course,
            targetPlanId: planWithCourse?.id || sectionPlans[0]?.id,
          };
        } else {
          // Create new card
          const newId = (Math.max(...newCards.map(c => parseInt(c.id))) + 1).toString();
          newCards.push({
            id: newId,
            selectedCourse: `${course.courseCode} - ${course.title}`,
            selectedFaculty: `${course.facultyName} (${course.facultyInitial})`,
            selectedDay: course.day1 && course.day2 ? `${course.day1} - ${course.day2}` : course.day1,
            selectedTime: course.time1,
            finalSection: course,
            targetPlanId: planWithCourse?.id || sectionPlans[0]?.id,
          });
        }
      });
      
      // Remove cards for courses that are no longer selected
      newCards = newCards.map(card => {
        if (card.finalSection) {
          const courseId = `${card.finalSection.courseCode}-${card.finalSection.section}`;
          if (!selectedCoursesIds.includes(courseId)) {
            // Course was removed externally, clear the card
            return {
              ...card,
              selectedCourse: "",
              selectedFaculty: "",
              selectedDay: "",
              selectedTime: "",
              finalSection: undefined,
            };
          }
        }
        return card;
      });
      
      return newCards;
    });
  }, [selectedCourses, program, sectionPlans]);

  // Effect to clear cards when program changes if their courses don't match the new program  
  useEffect(() => {
    // Only clear if program actually changed
    if (previousProgramRef.current !== program) {
      previousProgramRef.current = program;
      
      setCards(prevCards => {
        return prevCards.map(card => {
          // Clear ALL card data (both complete and partial selections) when program changes
          return {
            ...card,
            selectedCourse: "",
            selectedFaculty: "",
            selectedDay: "",
            selectedTime: "",
            finalSection: undefined,
          };
        });
      });
      
      // Clear all selected courses when program changes
      onClearAllSelected();
    }
  }, [program, onClearAllSelected]);

  // Function to check for schedule conflicts within a specific plan
  const checkScheduleConflict = (newCourse: Course, targetPlanId?: string): ConflictInfo[] => {
    const conflicts: ConflictInfo[] = [];
    
    // Determine which plan to check against
    const planToCheck = targetPlanId 
      ? sectionPlans.find(p => p.id === targetPlanId)
      : sectionPlans[0]; // Default to first plan if no target specified
    
    if (!planToCheck) return conflicts;
    
    // Extract days and times from the new course
    const newCourseDays = [newCourse.day1, newCourse.day2].filter(Boolean);
    const newCourseTimes = [newCourse.time1, newCourse.time2].filter(Boolean);
    
    // Helper function to parse time string to minutes
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
      
      // Convert to 24-hour format
      if (effectiveStartPeriod === 'PM' && startHour !== 12) startHour += 12;
      if (effectiveStartPeriod === 'AM' && startHour === 12) startHour = 0;
      if (effectiveEndPeriod === 'PM' && endHour !== 12) endHour += 12;
      if (effectiveEndPeriod === 'AM' && endHour === 12) endHour = 0;
      
      return {
        start: startHour * 60 + startMin,
        end: endHour * 60 + endMin
      };
    };
    
    // Helper function to check if two time ranges overlap
    const timesOverlap = (time1: string, time2: string): boolean => {
      const t1 = parseTime(time1);
      const t2 = parseTime(time2);
      
      if (!t1 || !t2) return false;
      
      // Check if ranges overlap: (start1 < end2) && (start2 < end1)
      return (t1.start < t2.end) && (t2.start < t1.end);
    };
    
    planToCheck.courses.forEach(existingCourse => {
      // Skip if it's the same course (updating existing selection)
      if (existingCourse.courseCode === newCourse.courseCode && 
          existingCourse.section === newCourse.section) {
        return;
      }
      
      const existingDays = [existingCourse.day1, existingCourse.day2].filter(Boolean);
      const existingTimes = [existingCourse.time1, existingCourse.time2].filter(Boolean);
      
      // Check for day overlap
      const hasCommonDay = newCourseDays.some(newDay => 
        existingDays.some(existingDay => existingDay === newDay)
      );
      
      if (!hasCommonDay) return; // No conflict if no common day
      
      // Check for time overlap with proper time range checking
      const hasTimeConflict = newCourseTimes.some(newTime => 
        existingTimes.some(existingTime => timesOverlap(newTime, existingTime))
      );
      
      // If both day and time overlap, it's a conflict
      if (hasTimeConflict) {
        conflicts.push({
          course: existingCourse,
          planId: planToCheck.id,
          planName: planToCheck.name
        });
      }
    });
    
    return conflicts;
  };

  const updateCard = (id: string, updates: Partial<CourseCardData>) => {
    setCards(prev => prev.map(card => card.id === id ? { ...card, ...updates } : card));
  };

  const deleteCard = (id: string) => {
    if (cards.length > 1) {
      // Find the card being deleted and remove its course from selected courses
      const cardToDelete = cards.find(card => card.id === id);
      if (cardToDelete?.finalSection) {
        onCourseSelect(cardToDelete.finalSection); // This will remove it since it's already selected
      }
      setCards(prev => prev.filter(card => card.id !== id));
    }
  };

  const addCard = () => {
    const newId = (Math.max(...cards.map(c => parseInt(c.id))) + 1).toString();
    setCards(prev => [...prev, { 
      id: newId, 
      selectedCourse: "", 
      selectedFaculty: "", 
      selectedDay: "", 
      selectedTime: "",
      targetPlanId: sectionPlans[0]?.id // Default to first plan
    }]);
  };

  const handleAddSection = (course: Course, planId?: string) => {
    onCourseSelect(course, planId);
  };

  const handleRemoveSection = (course: Course) => {
    onCourseSelect(course); // This toggles the selection
  };

  return (
    <div className="space-y-6">
      {/* Program Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Program Selector</CardTitle>
          <CardDescription>Choose your program to filter available courses</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={program} onValueChange={setProgram}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select program" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BSCSE">BSCSE - Computer Science & Engineering</SelectItem>
              <SelectItem value="BSDS">BSDS - Data Science</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
            <div className="font-medium mb-1">Search Tips:</div>
            <div>• Use course codes: CSE 2218, MAT 1101</div>
            <div>• Use abbreviations: DSA, DM, AI, ML, OS</div>
            <div>• Use numbers for Roman numerals: 1 for I, 2 for II</div>
          </div>
        </CardContent>
      </Card>

      {/* Course Cards */}
      <div className="space-y-4">
        {cards.map((card) => (
          <CourseCard
            key={card.id}
            cardData={card}
            courses={courses}
            program={program}
            selectedCourses={selectedCourses}
            sectionPlans={sectionPlans}
            allCards={cards}
            onUpdate={updateCard}
            onDelete={deleteCard}
            onAddSection={handleAddSection}
            onRemoveSection={handleRemoveSection}
            checkConflict={checkScheduleConflict}
            onNavigateToPlan={onNavigateToPlan}
          />
        ))}
      </div>

      {/* Add More Button */}
      <Button 
        onClick={addCard} 
        variant="outline" 
        className="w-full border-dashed border-2 hover:border-solid hover:bg-muted/50 h-10 sm:h-12 text-xs sm:text-base text-muted-foreground hover:text-foreground"
      >
        <span className="text-base sm:text-lg mr-2">+</span>
        Add More Course Card
      </Button>
    </div>
  );
}
