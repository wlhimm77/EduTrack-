import { CalendarEvent } from '../types';

/**
 * Returns current Date adjusted according to Hong Kong Time (Asia/Hong_Kong, UTC+8).
 */
export function getHongKongNow(): Date {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '00';
  
  const year = parseInt(getPart('year'), 10);
  const month = parseInt(getPart('month'), 10) - 1;
  const day = parseInt(getPart('day'), 10);
  const hour = parseInt(getPart('hour'), 10);
  const minute = parseInt(getPart('minute'), 10);
  const second = parseInt(getPart('second'), 10);

  return new Date(year, month, day, hour, minute, second);
}

/**
 * Returns YYYY-MM-DD in Hong Kong Time.
 */
export function getHongKongDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(date);
}

/**
 * Formats a Date or ISO string in Hong Kong Chinese locale (e.g. 2026年9月2日 星期三).
 */
export function formatHongKongDisplay(date: Date = new Date()): {
  dateStr: string;
  timeStr: string;
  weekdayStr: string;
  fullDateStr: string;
} {
  const hkDate = getHongKongNow();
  
  const dateOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  const weekdayOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Hong_Kong',
    weekday: 'long'
  };
  const timeOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Hong_Kong',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };

  const fullDateStr = new Intl.DateTimeFormat('zh-HK', dateOptions).format(date);
  const weekdayStr = new Intl.DateTimeFormat('zh-HK', weekdayOptions).format(date);
  const timeStr = new Intl.DateTimeFormat('zh-HK', timeOptions).format(date);
  const dateStr = getHongKongDateString(date);

  return {
    dateStr,
    timeStr,
    weekdayStr,
    fullDateStr
  };
}

export interface CycleDayInfo {
  date: string;
  cycleDay: number | null; // 1 to 7
  cycleTitle: string | null; // e.g. "Day 1"
  isHoliday: boolean;
  holidayTitle: string | null;
  activities: string[];
}

/**
 * Extracts cycle day (Day 1 - Day 7), holidays, and school activities for a given date
 * by looking up the school calendar events.
 */
export function getCycleInfoForDate(dateStr: string, calendarEvents: CalendarEvent[]): CycleDayInfo {
  const dayEvents = calendarEvents.filter(e => e.date === dateStr);
  
  let cycleDay: number | null = null;
  let cycleTitle: string | null = null;
  let isHoliday = false;
  let holidayTitle: string | null = null;
  const activities: string[] = [];

  for (const ev of dayEvents) {
    if (ev.type === 'cycle' || ev.title.toLowerCase().startsWith('day')) {
      const match = ev.title.match(/Day\s*([1-7])/i);
      if (match) {
        cycleDay = parseInt(match[1], 10);
        cycleTitle = `Day ${cycleDay}`;
      } else {
        cycleTitle = ev.title;
      }
    } else if (ev.type === 'holiday' || ev.title.toLowerCase().includes('holiday') || ev.title.includes('假')) {
      isHoliday = true;
      holidayTitle = ev.title;
    } else {
      activities.push(ev.title);
    }
  }

  return {
    date: dateStr,
    cycleDay,
    cycleTitle,
    isHoliday,
    holidayTitle,
    activities
  };
}
