import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { createEvents, EventAttributes } from 'ics';

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

interface SectionPlan {
  id: string;
  name: string;
  courses: Course[];
}

// Helper function to create a printable DOM element for export
const createPrintableElement = (plan: SectionPlan): HTMLElement => {
  const container = document.createElement('div');
  container.style.cssText = `
    font-family: 'Arial', sans-serif;
    padding: 40px;
    background: white;
    color: black;
    width: 1200px;
  `;

  // Header
  const header = document.createElement('div');
  header.style.cssText = `
    margin-bottom: 30px;
    border-bottom: 3px solid #2563eb;
    padding-bottom: 20px;
  `;
  header.innerHTML = `
    <h1 style="margin: 0; font-size: 32px; color: #1e40af; font-weight: bold;">${plan.name}</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px; color: #64748b;">
      Total Courses: ${plan.courses.length} | 
      Total Credits: ${plan.courses.reduce((sum, c) => sum + parseInt(c.credit || '0'), 0)}
    </p>
  `;
  container.appendChild(header);

  // Table
  const table = document.createElement('table');
  table.style.cssText = `
    width: 100%;
    border-collapse: collapse;
    margin-top: 20px;
  `;

  // Table Header
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);">
      <th style="padding: 14px 12px; text-align: left; color: white; font-weight: 600; font-size: 14px; border: 1px solid #2563eb;">Course Code</th>
      <th style="padding: 14px 12px; text-align: left; color: white; font-weight: 600; font-size: 14px; border: 1px solid #2563eb;">Course Name</th>
      <th style="padding: 14px 12px; text-align: left; color: white; font-weight: 600; font-size: 14px; border: 1px solid #2563eb;">Section</th>
      <th style="padding: 14px 12px; text-align: left; color: white; font-weight: 600; font-size: 14px; border: 1px solid #2563eb;">Faculty</th>
      <th style="padding: 14px 12px; text-align: left; color: white; font-weight: 600; font-size: 14px; border: 1px solid #2563eb;">Credit</th>
      <th style="padding: 14px 12px; text-align: left; color: white; font-weight: 600; font-size: 14px; border: 1px solid #2563eb;">Days</th>
      <th style="padding: 14px 12px; text-align: left; color: white; font-weight: 600; font-size: 14px; border: 1px solid #2563eb;">Time</th>
      <th style="padding: 14px 12px; text-align: left; color: white; font-weight: 600; font-size: 14px; border: 1px solid #2563eb;">Room</th>
    </tr>
  `;
  table.appendChild(thead);

  // Table Body
  const tbody = document.createElement('tbody');
  plan.courses.forEach((course, index) => {
    const row = document.createElement('tr');
    const bgColor = index % 2 === 0 ? '#f8fafc' : 'white';
    row.style.cssText = `background: ${bgColor};`;
    
    row.innerHTML = `
      <td style="padding: 12px; border: 1px solid #e2e8f0; font-size: 13px; font-weight: 600; color: #1e293b;">${course.courseCode}</td>
      <td style="padding: 12px; border: 1px solid #e2e8f0; font-size: 13px; color: #334155;">${course.title}</td>
      <td style="padding: 12px; border: 1px solid #e2e8f0; font-size: 13px; text-align: center; font-weight: 600; color: #3b82f6;">${course.section}</td>
      <td style="padding: 12px; border: 1px solid #e2e8f0; font-size: 13px; color: #334155;">${course.facultyName === 'TBA' ? 'TBA' : `${course.facultyName} (${course.facultyInitial})`}</td>
      <td style="padding: 12px; border: 1px solid #e2e8f0; font-size: 13px; text-align: center; font-weight: 600; color: #059669;">${course.credit}</td>
      <td style="padding: 12px; border: 1px solid #e2e8f0; font-size: 13px; color: #334155;">${course.day1}${course.day2 ? ` - ${course.day2}` : ''}</td>
      <td style="padding: 12px; border: 1px solid #e2e8f0; font-size: 13px; color: #334155;">${course.time1}</td>
      <td style="padding: 12px; border: 1px solid #e2e8f0; font-size: 13px; text-align: center; color: #334155;">${course.room1}</td>
    `;
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  container.appendChild(table);

  // Footer
  const footer = document.createElement('div');
  footer.style.cssText = `
    margin-top: 30px;
    padding-top: 20px;
    border-top: 2px solid #e2e8f0;
    text-align: center;
    color: #94a3b8;
    font-size: 12px;
  `;
  footer.innerHTML = `Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
  container.appendChild(footer);

  return container;
};

// Helper function to parse time string to hours and minutes
const parseTime = (timeStr: string): { hours: number; minutes: number } => {
  const [time, period] = timeStr.split(/\s*([AP]M)/);
  const [hours, minutes] = time.split(':').map(Number);
  const adjustedHours = period === 'PM' && hours !== 12 ? hours + 12 : period === 'AM' && hours === 12 ? 0 : hours;
  return { hours: adjustedHours, minutes };
};

// Helper function to get day of week number (0 = Sunday, 1 = Monday, etc.)
const getDayNumber = (day: string): number => {
  const days: { [key: string]: number } = {
    'Sun': 0,
    'Mon': 1,
    'Tue': 2,
    'Wed': 3,
    'Thu': 4,
    'Fri': 5,
    'Sat': 6
  };
  return days[day] || 0;
};

// Helper function to get next occurrence of a day
const getNextOccurrence = (dayOfWeek: number): Date => {
  const today = new Date();
  const currentDay = today.getDay();
  const daysUntilTarget = (dayOfWeek - currentDay + 7) % 7;
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + daysUntilTarget);
  return targetDate;
};

// Export single plan as PDF
// Export single plan as PDF
export const exportPlanAsPDF = async (plan: SectionPlan) => {
  // Skip if plan has no courses
  if (!plan.courses || plan.courses.length === 0) {
    console.warn('Cannot export empty plan');
    return;
  }

  try {
    // Create a clean printable version
    const printElement = createPrintableElement(plan);
    document.body.appendChild(printElement);

    // Capture the element as canvas with high quality
    const canvas = await html2canvas(printElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 1280,
      width: 1280,
      onclone: (clonedDoc) => {
        // Replace any oklch colors that might be inherited from the parent document
        const allElements = clonedDoc.querySelectorAll('*');
        allElements.forEach((el: Element) => {
          const htmlEl = el as HTMLElement;
          const computedStyle = window.getComputedStyle(el);
          
          if (computedStyle.backgroundColor?.includes('oklch')) {
            htmlEl.style.backgroundColor = 'rgb(255, 255, 255)';
          }
          if (computedStyle.color?.includes('oklch')) {
            htmlEl.style.color = 'rgb(0, 0, 0)';
          }
          if (computedStyle.borderColor?.includes('oklch')) {
            htmlEl.style.borderColor = 'rgb(200, 200, 200)';
          }
        });
      }
    });

    // Remove the temporary element
    document.body.removeChild(printElement);

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = 10;

    pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
    pdf.save(`${plan.name}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
  }
};

// Export all plans as PDF
export const exportAllPlansAsPDF = async (plans: SectionPlan[]) => {
  // Filter out plans with no courses
  const plansWithCourses = plans.filter(p => p.courses && p.courses.length > 0);
  
  if (plansWithCourses.length === 0) {
    console.warn('No plans with courses to export');
    return;
  }

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  for (let i = 0; i < plansWithCourses.length; i++) {
    try {
      const printElement = createPrintableElement(plansWithCourses[i]);
      document.body.appendChild(printElement);

      const canvas = await html2canvas(printElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1280,
        width: 1280,
        onclone: (clonedDoc) => {
          // Replace any oklch colors that might be inherited from the parent document
          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach((el: Element) => {
            const htmlEl = el as HTMLElement;
            const computedStyle = window.getComputedStyle(el);
            
            if (computedStyle.backgroundColor?.includes('oklch')) {
              htmlEl.style.backgroundColor = 'rgb(255, 255, 255)';
            }
            if (computedStyle.color?.includes('oklch')) {
              htmlEl.style.color = 'rgb(0, 0, 0)';
            }
            if (computedStyle.borderColor?.includes('oklch')) {
              htmlEl.style.borderColor = 'rgb(200, 200, 200)';
            }
          });
        }
      });

      document.body.removeChild(printElement);

      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;

      if (i > 0) {
        pdf.addPage();
      }

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
    } catch (error) {
      console.error(`Error generating PDF for plan ${i}:`, error);
    }
  }

  pdf.save('All_Section_Plans.pdf');
};

// Export single plan as PNG
export const exportPlanAsPNG = async (plan: SectionPlan) => {
  // Skip if plan has no courses
  if (!plan.courses || plan.courses.length === 0) {
    console.warn('Cannot export empty plan');
    return;
  }

  try {
    const printElement = createPrintableElement(plan);
    document.body.appendChild(printElement);

    const canvas = await html2canvas(printElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 1280,
      width: 1280,
      onclone: (clonedDoc) => {
        // Replace any oklch colors that might be inherited from the parent document
        const allElements = clonedDoc.querySelectorAll('*');
        allElements.forEach((el: Element) => {
          const htmlEl = el as HTMLElement;
          const computedStyle = window.getComputedStyle(el);
          
          if (computedStyle.backgroundColor?.includes('oklch')) {
            htmlEl.style.backgroundColor = 'rgb(255, 255, 255)';
          }
          if (computedStyle.color?.includes('oklch')) {
            htmlEl.style.color = 'rgb(0, 0, 0)';
          }
          if (computedStyle.borderColor?.includes('oklch')) {
            htmlEl.style.borderColor = 'rgb(200, 200, 200)';
          }
        });
      }
    });

    document.body.removeChild(printElement);

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${plan.name}.png`;
        link.click();
        URL.revokeObjectURL(url);
      }
    });
  } catch (error) {
    console.error('Error generating PNG:', error);
  }
};

// Export all plans as PNG (combined into one image)
export const exportAllPlansAsPNG = async (plans: SectionPlan[]) => {
  // Filter out plans with no courses
  const plansWithCourses = plans.filter(p => p.courses && p.courses.length > 0);
  
  if (plansWithCourses.length === 0) {
    console.warn('No plans with courses to export');
    return;
  }

  try {
    // Create a container for all plans
    const container = document.createElement('div');
    container.style.cssText = `
      padding: 40px;
      background-color: white;
      width: 1200px;
      display: flex;
      flex-direction: column;
      gap: 40px;
      font-family: Arial, sans-serif;
    `;

    // Add each plan to the container
    plansWithCourses.forEach((plan) => {
      const printElement = createPrintableElement(plan);
      printElement.style.marginBottom = '0';
      printElement.style.padding = '0';
      container.appendChild(printElement);
    });

    document.body.appendChild(container);

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 1280,
      width: 1280,
      onclone: (clonedDoc) => {
        // Replace any oklch colors that might be inherited from the parent document
        const allElements = clonedDoc.querySelectorAll('*');
        allElements.forEach((el: Element) => {
          const htmlEl = el as HTMLElement;
          const computedStyle = window.getComputedStyle(el);
          
          if (computedStyle.backgroundColor?.includes('oklch')) {
            htmlEl.style.backgroundColor = 'rgb(255, 255, 255)';
          }
          if (computedStyle.color?.includes('oklch')) {
            htmlEl.style.color = 'rgb(0, 0, 0)';
          }
          if (computedStyle.borderColor?.includes('oklch')) {
            htmlEl.style.borderColor = 'rgb(200, 200, 200)';
          }
        });
      }
    });

    document.body.removeChild(container);

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'All_Section_Plans.png';
        link.click();
        URL.revokeObjectURL(url);
      }
    });
  } catch (error) {
    console.error('Error generating combined PNG:', error);
  }
};

// Export single plan as Excel
export const exportPlanAsExcel = (plan: SectionPlan) => {
  // Skip if plan has no courses
  if (!plan.courses || plan.courses.length === 0) {
    console.warn('Cannot export empty plan');
    return;
  }

  const data = plan.courses.map(course => ({
    'Course Code': course.courseCode,
    'Course Name': course.title,
    'Section': course.section,
    'Faculty': course.facultyName === 'TBA' ? 'TBA' : `${course.facultyName} (${course.facultyInitial})`,
    'Credit': course.credit,
    'Days': course.day1 && course.day2 ? `${course.day1} - ${course.day2}` : course.day1,
    'Time': course.time1,
    'Room': course.room1 && course.room2 && course.room1 !== course.room2 ? `${course.room1} - ${course.room2}` : course.room1
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, plan.name.substring(0, 31));
  XLSX.writeFile(workbook, `${plan.name}.xlsx`);
};

// Export all plans as Excel (multiple sheets)
export const exportAllPlansAsExcel = (plans: SectionPlan[]) => {
  // Filter out plans with no courses
  const plansWithCourses = plans.filter(p => p.courses && p.courses.length > 0);
  
  if (plansWithCourses.length === 0) {
    console.warn('No plans with courses to export');
    return;
  }

  const workbook = XLSX.utils.book_new();

  plansWithCourses.forEach(plan => {
    const data = plan.courses.map(course => ({
      'Course Code': course.courseCode,
      'Course Name': course.title,
      'Section': course.section,
      'Faculty': course.facultyName === 'TBA' ? 'TBA' : `${course.facultyName} (${course.facultyInitial})`,
      'Credit': course.credit,
      'Days': course.day1 && course.day2 ? `${course.day1} - ${course.day2}` : course.day1,
      'Time': course.time1,
      'Room': course.room1 && course.room2 && course.room1 !== course.room2 ? `${course.room1} - ${course.room2}` : course.room1
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    // Sheet names have a 31 character limit
    XLSX.utils.book_append_sheet(workbook, worksheet, plan.name.substring(0, 31));
  });

  XLSX.writeFile(workbook, 'All_Section_Plans.xlsx');
};

// Export single plan as Calendar (ICS)
export const exportPlanAsCalendar = (plan: SectionPlan) => {
  // Skip if plan has no courses
  if (!plan.courses || plan.courses.length === 0) {
    console.warn('Cannot export empty plan');
    return;
  }

  const events: EventAttributes[] = [];

  plan.courses.forEach(course => {
    const days = [course.day1, course.day2].filter(Boolean);
    
    days.forEach(day => {
      if (!course.time1 || !day) return;

      const [startTimeStr, endTimeStr] = course.time1.split(' - ');
      const startTime = parseTime(startTimeStr.trim());
      const endTime = parseTime(endTimeStr.trim());
      const dayNumber = getDayNumber(day);
      const startDate = getNextOccurrence(dayNumber);

      // Set the time
      startDate.setHours(startTime.hours, startTime.minutes, 0);
      const endDate = new Date(startDate);
      endDate.setHours(endTime.hours, endTime.minutes, 0);

      events.push({
        start: [startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate(), startTime.hours, startTime.minutes],
        end: [endDate.getFullYear(), endDate.getMonth() + 1, endDate.getDate(), endTime.hours, endTime.minutes],
        title: `${course.courseCode} - ${course.title}`,
        description: `Section: ${course.section}\nFaculty: ${course.facultyName} (${course.facultyInitial})\nRoom: ${course.room1}`,
        location: course.room1,
        status: 'CONFIRMED',
        busyStatus: 'BUSY',
        recurrenceRule: 'FREQ=WEEKLY;COUNT=15' // 15 weeks semester
      });
    });
  });

  createEvents(events, (error, value) => {
    if (error) {
      console.error('Error creating calendar:', error);
      return;
    }

    const blob = new Blob([value], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${plan.name}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  });
};

// Export all plans as Calendar (single ICS file with all events)
export const exportAllPlansAsCalendar = (plans: SectionPlan[]) => {
  // Filter out plans with no courses
  const plansWithCourses = plans.filter(p => p.courses && p.courses.length > 0);
  
  if (plansWithCourses.length === 0) {
    console.warn('No plans with courses to export');
    return;
  }

  const events: EventAttributes[] = [];

  plansWithCourses.forEach(plan => {
    plan.courses.forEach(course => {
      const days = [course.day1, course.day2].filter(Boolean);
      
      days.forEach(day => {
        if (!course.time1 || !day) return;

        const [startTimeStr, endTimeStr] = course.time1.split(' - ');
        const startTime = parseTime(startTimeStr.trim());
        const endTime = parseTime(endTimeStr.trim());
        const dayNumber = getDayNumber(day);
        const startDate = getNextOccurrence(dayNumber);

        startDate.setHours(startTime.hours, startTime.minutes, 0);
        const endDate = new Date(startDate);
        endDate.setHours(endTime.hours, endTime.minutes, 0);

        events.push({
          start: [startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate(), startTime.hours, startTime.minutes],
          end: [endDate.getFullYear(), endDate.getMonth() + 1, endDate.getDate(), endTime.hours, endTime.minutes],
          title: `${course.courseCode} - ${course.title} [${plan.name}]`,
          description: `Plan: ${plan.name}\nSection: ${course.section}\nFaculty: ${course.facultyName} (${course.facultyInitial})\nRoom: ${course.room1}`,
          location: course.room1,
          status: 'CONFIRMED',
          busyStatus: 'BUSY',
          recurrenceRule: 'FREQ=WEEKLY;COUNT=15'
        });
      });
    });
  });

  createEvents(events, (error, value) => {
    if (error) {
      console.error('Error creating calendar:', error);
      return;
    }

    const blob = new Blob([value], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'All_Section_Plans.ics';
    link.click();
    URL.revokeObjectURL(url);
  });
};
