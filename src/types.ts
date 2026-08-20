export type TaskType = '筆記檢查' | '家課' | '小測' | '默書' | '工作紙' | string;
export type TaskStatus = 'pending' | 'grading' | 'completed' | 'overdue';

export interface StudentGrade {
  studentNumber: string;
  score: number | null;
  missing: boolean;
}

export interface Task {
  id: string;
  title: string;
  classId: string;
  subjectId: string;
  dueDate: string;
  type: TaskType;
  status: TaskStatus;
  maxScore?: number;
  grades?: StudentGrade[];
}

export interface Topic {
  id: string;
  title: string;
  completed: boolean;
  remarks?: string;
}

export interface Subject {
  id: string;
  name: string;
  syllabus: Topic[];
}

export interface ClassGroup {
  id: string;
  name: string;
  form?: string;
  size?: number;
  language?: string;
  subjects: Subject[];
}

export interface TemplateTopic {
  id: string;
  title: string;
}

export interface SyllabusTemplate {
  id: string;
  form: string;
  subject: string;
  language: string;
  topics: TemplateTopic[];
}

export interface StudentPerformance {
  studentNumber: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
}

export type CalendarEventType = 'cycle' | 'activity' | 'holiday';

export interface CalendarEvent {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  title: string;
  type: CalendarEventType;
  description?: string;
}

export interface TimetablePeriod {
  period: number;
  name: string;
  startTime: string; // e.g. "08:30"
  endTime: string; // e.g. "09:15"
  isBreak?: boolean;
}

export interface TimetableLesson {
  id: string;
  cycleDay: number; // 1 to 7
  period: number; // 1 to 8
  className: string; // e.g. "1A", "2A", "4A"
  subjectName: string; // e.g. "歷史", "中國歷史"
  room?: string; // e.g. "201 室", "歷史專室"
  notes?: string;
}

export interface TeacherTimetable {
  periods: TimetablePeriod[];
  lessons: TimetableLesson[];
}

export interface CloudBackup {
  id: string;
  createdAt: string; // ISO string
  timestamp: number; // Unix timestamp for sorting
  label: string;
  isAuto: boolean;
  summary: {
    classesCount: number;
    tasksCount: number;
    perfCount: number;
    templatesCount: number;
    calendarCount: number;
    timetableLessonsCount?: number;
  };
  data: {
    classes: ClassGroup[];
    tasks: Task[];
    performance: Record<string, StudentPerformance[]>;
    templates: SyllabusTemplate[];
    calendarEvents: CalendarEvent[];
    timetable?: TeacherTimetable;
  };
}
