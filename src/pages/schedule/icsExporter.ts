/**
 * Helper to export calendar events and recurring garbage schedules as an .ics file
 * for syncing with Google Calendar, Apple Calendar, and Outlook.
 */

export interface ExportCalendarItem {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  time?: string;
  location?: string;
  category?: string;
}

export function exportToICS(items: ExportCalendarItem[], calendarName = 'EcoBarangay Schedule') {
  const formatDateToICS = (dateStr: string, timeStr = '07:00 AM'): string => {
    // Parse date YYYY-MM-DD
    const [year, month, day] = dateStr.split('-').map(Number);
    
    // Parse time if available (e.g. "07:00 AM" or "6:00 AM - 9:00 AM")
    let hours = 7;
    let minutes = 0;
    const timeMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const m = parseInt(timeMatch[2], 10);
      const ampm = timeMatch[3]?.toUpperCase();
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      hours = h;
      minutes = m;
    }

    const pad = (n: number) => String(n).padStart(2, '0');
    return `${year}${pad(month)}${pad(day)}T${pad(hours)}${pad(minutes)}00`;
  };

  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EcoBarangay Pilipinas//Eco Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calendarName}`,
    'X-WR-TIMEZONE:Asia/Manila',
  ];

  items.forEach(item => {
    const dtStart = formatDateToICS(item.date, item.time);
    // End 1 hour later
    const [y, m, d] = item.date.split('-').map(Number);
    const pad = (n: number) => String(n).padStart(2, '0');
    
    let hours = 8;
    const timeMatch = item.time?.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const ampm = timeMatch[3]?.toUpperCase();
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      hours = Math.min(23, h + 1);
    }
    const dtEnd = `${y}${pad(m)}${pad(d)}T${pad(hours)}0000`;

    icsContent.push(
      'BEGIN:VEVENT',
      `UID:${item.id}@ecobarangay.ph`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${item.title.replace(/[,;]/g, ' ')}`,
      `DESCRIPTION:${(item.description || '').replace(/[\r\n]+/g, ' ').replace(/[,;]/g, ' ')}`,
      `LOCATION:${(item.location || 'Local Barangay Area').replace(/[,;]/g, ' ')}`,
      `CATEGORIES:${item.category || 'ENVIRONMENTAL'}`,
      'STATUS:CONFIRMED',
      'END:VEVENT'
    );
  });

  icsContent.push('END:VCALENDAR');

  const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `ecobarangay-schedule-${new Date().toISOString().split('T')[0]}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
