import { useState, useEffect, useMemo } from 'react';
import { CalendarEvent, TeacherTimetable, TimetableLesson, ClassGroup } from '../types';
import { 
  getHongKongNow, 
  getHongKongDateString, 
  getCycleInfoForDate, 
  formatHongKongDisplay 
} from '../utils/hongKongTime';
import { 
  Clock, 
  Calendar as CalendarIcon, 
  BookOpen, 
  MapPin, 
  Upload, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  CalendarDays,
  Grid,
  List,
  Coffee,
  CheckCircle2,
  CalendarCheck,
  Users,
  Utensils,
  Sun,
  LogOut,
  Bell,
  Filter,
  GraduationCap,
  Layers
} from 'lucide-react';
import { cn } from '../utils';
import { TimetableUploadModal } from './TimetableUploadModal';

interface Props {
  timetable?: TeacherTimetable;
  calendarEvents: CalendarEvent[];
  setCalendarEvents?: (events: CalendarEvent[] | ((prev: CalendarEvent[]) => CalendarEvent[])) => void | Promise<void>;
  classes: ClassGroup[];
  onSaveTimetable: (newTimetable: TeacherTimetable) => void | Promise<void>;
  onNavigateTasks?: () => void;
  onNavigateSyllabus?: () => void;
}

// Daily schedule structure items
interface DailyScheduleItem {
  id: string;
  type: 'assembly' | 'lesson' | 'recess' | 'lunch' | 'dismissal';
  periodNumber?: number;
  label: string;
  subLabel?: string;
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
}

const DAILY_SCHEDULE_ITEMS: DailyScheduleItem[] = [
  {
    id: 'slot-assembly',
    type: 'assembly',
    label: 'Pre-School Assembly',
    subLabel: '全校早會 / 班主任節',
    startTime: '08:00',
    endTime: '08:25',
    startMinutes: 8 * 60,
    endMinutes: 8 * 60 + 25,
  },
  {
    id: 'slot-p1',
    type: 'lesson',
    periodNumber: 1,
    label: '(1) 第 1 節',
    startTime: '08:25',
    endTime: '09:05',
    startMinutes: 8 * 60 + 25,
    endMinutes: 9 * 60 + 5,
  },
  {
    id: 'slot-p2',
    type: 'lesson',
    periodNumber: 2,
    label: '(2) 第 2 節',
    startTime: '09:05',
    endTime: '09:45',
    startMinutes: 9 * 60 + 5,
    endMinutes: 9 * 60 + 45,
  },
  {
    id: 'slot-recess1',
    type: 'recess',
    label: '1st Recess',
    subLabel: '第一小息',
    startTime: '09:45',
    endTime: '10:00',
    startMinutes: 9 * 60 + 45,
    endMinutes: 10 * 60,
  },
  {
    id: 'slot-p3',
    type: 'lesson',
    periodNumber: 3,
    label: '(3) 第 3 節',
    startTime: '10:00',
    endTime: '10:40',
    startMinutes: 10 * 60,
    endMinutes: 10 * 60 + 40,
  },
  {
    id: 'slot-p4',
    type: 'lesson',
    periodNumber: 4,
    label: '(4) 第 4 節',
    startTime: '10:40',
    endTime: '11:20',
    startMinutes: 10 * 60 + 40,
    endMinutes: 11 * 60 + 20,
  },
  {
    id: 'slot-recess2',
    type: 'recess',
    label: '2nd Recess',
    subLabel: '第二小息',
    startTime: '11:20',
    endTime: '11:35',
    startMinutes: 11 * 60 + 20,
    endMinutes: 11 * 60 + 35,
  },
  {
    id: 'slot-p5',
    type: 'lesson',
    periodNumber: 5,
    label: '(5) 第 5 節',
    startTime: '11:35',
    endTime: '12:15',
    startMinutes: 11 * 60 + 35,
    endMinutes: 12 * 60 + 15,
  },
  {
    id: 'slot-p6',
    type: 'lesson',
    periodNumber: 6,
    label: '(6) 第 6 節',
    startTime: '12:15',
    endTime: '12:55',
    startMinutes: 12 * 60 + 15,
    endMinutes: 12 * 60 + 55,
  },
  {
    id: 'slot-lunch',
    type: 'lunch',
    label: 'Lunch',
    subLabel: '午膳時間',
    startTime: '12:55',
    endTime: '14:10',
    startMinutes: 12 * 60 + 55,
    endMinutes: 14 * 60 + 10,
  },
  {
    id: 'slot-p7',
    type: 'lesson',
    periodNumber: 7,
    label: '(7) 第 7 節',
    startTime: '14:10',
    endTime: '14:50',
    startMinutes: 14 * 60 + 10,
    endMinutes: 14 * 60 + 50,
  },
  {
    id: 'slot-p8',
    type: 'lesson',
    periodNumber: 8,
    label: '(8) 第 8 節',
    startTime: '14:50',
    endTime: '15:30',
    startMinutes: 14 * 60 + 50,
    endMinutes: 15 * 60 + 30,
  },
  {
    id: 'slot-dismissal',
    type: 'dismissal',
    label: '16:00 End of Work',
    subLabel: '放學及結束工作',
    startTime: '15:30',
    endTime: '16:00',
    startMinutes: 15 * 60 + 30,
    endMinutes: 16 * 60,
  }
];

export function TeachingTimetableWidget({
  timetable,
  calendarEvents,
  setCalendarEvents,
  classes,
  onSaveTimetable,
  onNavigateTasks,
  onNavigateSyllabus
}: Props) {
  // Live HK Time state (updates every 10 seconds)
  const [hkNow, setHkNow] = useState<Date>(getHongKongNow());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setHkNow(getHongKongNow());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Selected date in HKT (default to today's date in HKT)
  const todayHkDateStr = useMemo(() => getHongKongDateString(hkNow), [hkNow]);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayHkDateStr);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'matrix'>('list');
  const [filterOnlyClasses, setFilterOnlyClasses] = useState(false);
  const [isExplicitPreview, setIsExplicitPreview] = useState(false);

  // Cycle day info for the currently selected date
  const selectedDateCycleInfo = useMemo(() => {
    return getCycleInfoForDate(selectedDateStr, calendarEvents);
  }, [selectedDateStr, calendarEvents]);

  // Today's cycle day info
  const todayCycleInfo = useMemo(() => {
    return getCycleInfoForDate(todayHkDateStr, calendarEvents);
  }, [todayHkDateStr, calendarEvents]);

  // Active viewing Cycle Day tab (1 to 7)
  const [activeCycleDay, setActiveCycleDay] = useState<number>(() => {
    return selectedDateCycleInfo.cycleDay || todayCycleInfo.cycleDay || 1;
  });

  // Keep activeCycleDay and preview state synchronized when selectedDateStr changes
  useEffect(() => {
    if (selectedDateCycleInfo.cycleDay) {
      setActiveCycleDay(selectedDateCycleInfo.cycleDay);
      setIsExplicitPreview(false);
    } else {
      setIsExplicitPreview(false);
    }
  }, [selectedDateStr, selectedDateCycleInfo]);

  // Check if selected date is weekend
  const isWeekendDay = useMemo(() => {
    const d = new Date(selectedDateStr + 'T00:00:00');
    const dayOfWeek = d.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  }, [selectedDateStr]);

  // Quick 1-click cycle day assigner for selected date
  const handleAssignCycleDay = async (dayNum: number) => {
    if (!setCalendarEvents) return;
    const safeList = Array.isArray(calendarEvents) ? calendarEvents : [];
    const filtered = safeList.filter(e => !(e.date === selectedDateStr && (e.type === 'cycle' || e.title.toLowerCase().startsWith('day'))));
    const newCycleEvent: CalendarEvent = {
      id: `cycle-${selectedDateStr}`,
      date: selectedDateStr,
      title: `Day ${dayNum}`,
      type: 'cycle',
      description: `7-Day Cycle: Day ${dayNum}`
    };
    await setCalendarEvents([...filtered, newCycleEvent]);
    setActiveCycleDay(dayNum);
    setIsExplicitPreview(false);
  };

  // Format current HK time string for live badge
  const hkDisplay = useMemo(() => formatHongKongDisplay(hkNow), [hkNow]);

  // Get lessons for the active cycle day
  const currentDayLessons = useMemo(() => {
    return (timetable?.lessons || []).filter(l => l.cycleDay === activeCycleDay);
  }, [timetable?.lessons, activeCycleDay]);

  // Sorted list of taught classes for straight viewing
  const taughtLessonsSorted = useMemo(() => {
    return [...currentDayLessons].sort((a, b) => a.period - b.period);
  }, [currentDayLessons]);

  // Calculate current active schedule slot based on live HK time
  const currentActiveSlot = useMemo(() => {
    // Only highlight if today matches selected date and cycle day
    if (selectedDateStr !== todayHkDateStr || todayCycleInfo.cycleDay !== activeCycleDay) {
      return null;
    }

    const currentMinutes = hkNow.getHours() * 60 + hkNow.getMinutes();

    for (const slot of DAILY_SCHEDULE_ITEMS) {
      if (currentMinutes >= slot.startMinutes && currentMinutes <= slot.endMinutes) {
        let activeLesson: TimetableLesson | null = null;
        if (slot.periodNumber) {
          activeLesson = currentDayLessons.find(l => l.period === slot.periodNumber) || null;
        }
        return {
          slot,
          lesson: activeLesson,
        };
      }
    }

    if (currentMinutes > 16 * 60) {
      return {
        slot: {
          id: 'slot-afterwork',
          type: 'dismissal' as const,
          label: 'End of Work',
          subLabel: '今日已放學及工作結束',
          startTime: '16:00',
          endTime: '23:59',
          startMinutes: 16 * 60,
          endMinutes: 24 * 60,
        },
        lesson: null,
      };
    }

    return null;
  }, [hkNow, selectedDateStr, todayHkDateStr, todayCycleInfo.cycleDay, activeCycleDay, currentDayLessons]);

  // Quick date jump helpers
  const handleJumpDays = (offset: number) => {
    const current = new Date(selectedDateStr + 'T00:00:00');
    current.setDate(current.getDate() + offset);
    setSelectedDateStr(getHongKongDateString(current));
  };

  const handleResetToToday = () => {
    setSelectedDateStr(todayHkDateStr);
    if (todayCycleInfo.cycleDay) {
      setActiveCycleDay(todayCycleInfo.cycleDay);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#E9E3DB] overflow-hidden">
      {/* SECTION HEADER */}
      <div className="p-5 md:p-6 border-b border-[#E9E3DB] bg-[#FAF7F2]/70">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="p-2 bg-[#88968A]/15 text-[#88968A] rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </span>
              <h3 className="text-xl font-serif font-bold text-[#3D3833]">今日任教時間表</h3>
              
              {/* Hong Kong Time Live Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-[#E9E3DB] rounded-full text-xs font-semibold text-[#3D3833] shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>香港時間 (HKT):</span>
                <span className="font-bold text-[#88968A]">{hkDisplay.timeStr.slice(0, 5)}</span>
              </div>
            </div>
            <p className="text-sm text-[#8E877F]">
              08:00-16:00 完整校園作息時間（早會、小息、午膳、第 1 至 8 節課堂）直式時序排程
            </p>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-white border border-[#E9E3DB] rounded-xl p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer",
                  viewMode === 'list' 
                    ? "bg-[#88968A] text-white" 
                    : "text-[#8E877F] hover:text-[#3D3833]"
                )}
                title="直式時序清單"
              >
                <List className="w-4 h-4" />
                <span>直式課堂表</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('matrix')}
                className={cn(
                  "p-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer",
                  viewMode === 'matrix' 
                    ? "bg-[#88968A] text-white" 
                    : "text-[#8E877F] hover:text-[#3D3833]"
                )}
                title="全循環總覽矩陣"
              >
                <Grid className="w-4 h-4" />
                <span className="hidden sm:inline">全循環總覽</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="px-3.5 py-2 bg-white border border-[#E9E3DB] hover:border-[#88968A] text-[#3D3833] text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-[#88968A]" />
              上傳 / 編輯時間表
            </button>
          </div>
        </div>

        {/* DATE & CALENDAR BAR */}
        <div className="mt-5 pt-4 border-t border-[#E9E3DB]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Target Date Controller */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleJumpDays(-1)}
              className="p-1.5 bg-white border border-[#E9E3DB] rounded-lg text-[#8E877F] hover:text-[#3D3833] hover:border-[#88968A] transition-colors"
              title="前一天"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="relative flex items-center">
              <input
                type="date"
                value={selectedDateStr}
                onChange={(e) => setSelectedDateStr(e.target.value)}
                className="bg-white border border-[#E9E3DB] hover:border-[#88968A] rounded-xl px-3 py-1.5 text-xs font-bold text-[#3D3833] shadow-2xs focus:outline-hidden focus:ring-1 focus:ring-[#88968A]"
              />
            </div>

            <button
              type="button"
              onClick={() => handleJumpDays(1)}
              className="p-1.5 bg-white border border-[#E9E3DB] rounded-lg text-[#8E877F] hover:text-[#3D3833] hover:border-[#88968A] transition-colors"
              title="後一天"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {selectedDateStr !== todayHkDateStr && (
              <button
                type="button"
                onClick={handleResetToToday}
                className="px-2.5 py-1 bg-[#88968A]/15 text-[#88968A] hover:bg-[#88968A] hover:text-white rounded-lg text-xs font-bold transition-colors"
              >
                返回今天
              </button>
            )}
          </div>

          {/* Calender Event & Cycle Indicator for Selected Date */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-[#8E877F]">校曆對應：</span>
            {selectedDateCycleInfo.cycleDay ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#88968A] text-white rounded-lg text-xs font-bold shadow-2xs">
                <CalendarCheck className="w-3.5 h-3.5" />
                Day {selectedDateCycleInfo.cycleDay}
              </span>
            ) : selectedDateCycleInfo.isHoliday ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/15 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold">
                🏖️ {selectedDateCycleInfo.holidayTitle || '學校假期'}
              </span>
            ) : selectedDateCycleInfo.activities.length > 0 ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold">
                ⭐ {selectedDateCycleInfo.activities.join(' / ')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#FAF7F2] text-[#8E877F] border border-[#E9E3DB] rounded-lg text-xs font-semibold">
                非上課日 / 無循環日安排
              </span>
            )}

            {selectedDateCycleInfo.activities.length > 0 && selectedDateCycleInfo.cycleDay && (
              <span className="text-xs text-[#8E877F] hidden md:inline">
                ({selectedDateCycleInfo.activities.join(', ')})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* CYCLE DAY TABS */}
      <div className="flex items-center gap-1.5 px-5 md:px-6 py-3 bg-[#FAF7F2]/40 border-b border-[#E9E3DB] overflow-x-auto">
        <span className="text-xs font-bold text-[#8E877F] mr-2 shrink-0 flex items-center gap-1">
          <Layers className="w-3.5 h-3.5 text-[#88968A]" />
          <span>循環日切換:</span>
        </span>
        {[1, 2, 3, 4, 5, 6, 7].map((day) => {
          const isSelected = activeCycleDay === day;
          const isDateMatching = selectedDateCycleInfo.cycleDay === day;
          const dayLessonsCount = (timetable?.lessons || []).filter(l => l.cycleDay === day).length;

          return (
            <button
              key={day}
              type="button"
              onClick={() => {
                setActiveCycleDay(day);
                if (!selectedDateCycleInfo.cycleDay) {
                  setIsExplicitPreview(true);
                }
              }}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer",
                isSelected
                  ? "bg-[#3D3833] text-white shadow-xs"
                  : "bg-white border border-[#E9E3DB] text-[#8E877F] hover:text-[#3D3833] hover:border-[#88968A]"
              )}
            >
              <span>Day {day}</span>
              <span className={cn(
                "px-1.5 py-0.2 text-[10px] rounded-full font-semibold",
                isSelected ? "bg-white/20 text-white" : "bg-[#FAF7F2] text-[#8E877F]"
              )}>
                {dayLessonsCount} 堂
              </span>
              {isDateMatching && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#88968A]" title="校曆當日" />
              )}
            </button>
          );
        })}
      </div>

      {/* CONTENT: STRAIGHT TIMELINE LIST VIEW OR MATRIX VIEW */}
      <div className="p-5 md:p-6">
        {viewMode === 'list' ? (
          !selectedDateCycleInfo.cycleDay && !isExplicitPreview ? (
            /* NON-SCHOOL / NO CYCLE DAY: HIDE TIMETABLE AND SHOW RESTFUL CARD */
            <div className="py-8 px-6 rounded-2xl bg-[#FAF7F2]/80 border border-[#E9E3DB] text-center max-w-2xl mx-auto space-y-5 my-2">
              <div className="w-16 h-16 rounded-2xl bg-white border border-[#E9E3DB] shadow-xs flex items-center justify-center mx-auto text-[#88968A]">
                {selectedDateCycleInfo.isHoliday ? (
                  <Sun className="w-8 h-8 text-amber-500" />
                ) : isWeekendDay ? (
                  <Coffee className="w-8 h-8 text-amber-700" />
                ) : selectedDateCycleInfo.activities.length > 0 ? (
                  <Sparkles className="w-8 h-8 text-indigo-500" />
                ) : (
                  <CalendarIcon className="w-8 h-8 text-[#88968A]" />
                )}
              </div>

              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white border border-[#E9E3DB] text-[#5D554D]">
                  <span>{selectedDateStr} (星期{['日', '一', '二', '三', '四', '五', '六'][new Date(selectedDateStr + 'T00:00:00').getDay()]})</span>
                </div>

                <h4 className="text-lg font-serif font-bold text-[#3D3833]">
                  {selectedDateCycleInfo.isHoliday
                    ? `學校假期：${selectedDateCycleInfo.holidayTitle || '假期'}`
                    : isWeekendDay
                    ? '週末作息日（非上課日）'
                    : selectedDateCycleInfo.activities.length > 0
                    ? `特別活動日：${selectedDateCycleInfo.activities.join('、')}`
                    : '非上課日 / 無循環日安排'}
                </h4>

                <p className="text-xs text-[#8E877F] max-w-md mx-auto">
                  {selectedDateCycleInfo.isHoliday || isWeekendDay
                    ? '今日為非上課日，無任教課堂排程。祝你有愉快充實的一天！'
                    : selectedDateCycleInfo.activities.length > 0
                    ? '今日為校園特別活動日，無常規循環教學課堂。'
                    : '今日校曆尚未設定循環日（Day 1 - Day 7），因此無課堂時間表顯示。'}
                </p>
              </div>

              {/* Quick action pill buttons */}
              <div className="pt-3 border-t border-[#E9E3DB]/80 space-y-3">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                  <span className="text-xs font-bold text-[#5D554D] flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-[#88968A]" />
                    <span>快速設定此日為循環日：</span>
                  </span>
                  <div className="flex items-center gap-1 flex-wrap justify-center">
                    {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleAssignCycleDay(d)}
                        className="px-2.5 py-1 text-xs font-bold bg-white hover:bg-[#88968A] text-[#3D3833] hover:text-white border border-[#E9E3DB] rounded-lg transition-all shadow-2xs cursor-pointer"
                        title={`將 ${selectedDateStr} 設為 Day ${d}`}
                      >
                        Day {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setIsExplicitPreview(true);
                      setActiveCycleDay(1);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold bg-white hover:bg-[#FAF7F2] text-[#5D554D] border border-[#E9E3DB] rounded-xl transition-colors cursor-pointer"
                  >
                    展開預覽 7-Day 時間表
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('matrix')}
                    className="px-3 py-1.5 text-xs font-semibold bg-white hover:bg-[#FAF7F2] text-[#5D554D] border border-[#E9E3DB] rounded-xl transition-colors cursor-pointer"
                  >
                    全循環矩陣總覽
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ACTIVE TIMETABLE VIEW */
            <div className="space-y-4">
              {/* Preview Mode Notification Banner */}
              {isExplicitPreview && !selectedDateCycleInfo.cycleDay && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-amber-900 text-xs shadow-2xs">
                  <div className="flex items-center gap-2 font-medium">
                    <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded font-bold text-[11px]">預覽模式</span>
                    <span>正在預覽 <strong>Day {activeCycleDay}</strong> 時間表（當前日期為非上課日 / 無循環日安排）</span>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleAssignCycleDay(activeCycleDay)}
                      className="px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer"
                    >
                      設定此日為 Day {activeCycleDay}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsExplicitPreview(false)}
                      className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg font-semibold text-xs transition-colors cursor-pointer"
                    >
                      關閉預覽
                    </button>
                  </div>
                </div>
              )}

              {/* Top Summary Banner & Filter Toggle */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-xl bg-[#FAF7F2] border border-[#E9E3DB]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-[#3D3833]">
                      Day {activeCycleDay} 今日授課概要：
                    </span>
                    <span className="px-2.5 py-0.5 bg-[#88968A] text-white text-xs font-bold rounded-lg shadow-2xs">
                      共 {currentDayLessons.length} 節課堂
                    </span>
                  </div>

                  {/* List of taught classes straight in badge line */}
                  {taughtLessonsSorted.length > 0 ? (
                    <div className="flex items-center gap-2 flex-wrap text-xs text-[#5D554D] pt-0.5">
                      <span className="text-[#8E877F]">任教班別與節數：</span>
                      {taughtLessonsSorted.map(l => (
                        <span 
                          key={`${l.cycleDay}-${l.period}-${l.className}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-[#E9E3DB] rounded-md font-semibold text-[#3D3833]"
                        >
                          <span className="text-[#88968A] font-bold">({l.period})</span>
                          <span>{l.className}</span>
                          <span className="text-[11px] text-[#8E877F]">{l.subjectName}</span>
                          {l.room && <span className="text-[10px] text-[#88968A]">({l.room})</span>}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#8E877F] italic">
                      今日無任教課堂安排（全日備課 / 行政日）
                    </p>
                  )}
                </div>

                {/* Straight filter mode button */}
                <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                  <div className="flex items-center bg-white border border-[#E9E3DB] rounded-xl p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setFilterOnlyClasses(false)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer",
                        !filterOnlyClasses ? "bg-[#3D3833] text-white shadow-2xs" : "text-[#8E877F] hover:text-[#3D3833]"
                      )}
                    >
                      直式完整作息 (08:00-16:00)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterOnlyClasses(true)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer",
                        filterOnlyClasses ? "bg-[#3D3833] text-white shadow-2xs" : "text-[#8E877F] hover:text-[#3D3833]"
                      )}
                    >
                      僅列出任教課堂 ({currentDayLessons.length} 堂)
                    </button>
                  </div>
                </div>
              </div>

            {/* Current In-Session Live Banner */}
            {currentActiveSlot && (
              <div className="flex items-center justify-between gap-2 text-emerald-800 bg-emerald-50/80 px-4 py-2.5 rounded-xl font-bold border border-emerald-200 shadow-2xs text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>
                    現正進行 (HKT {hkDisplay.timeStr.slice(0, 5)})：{currentActiveSlot.slot.label} {currentActiveSlot.slot.subLabel ? `(${currentActiveSlot.slot.subLabel})` : ''}
                  </span>
                </div>
                {currentActiveSlot.lesson ? (
                  <span className="px-2 py-0.5 bg-emerald-700 text-white rounded-md text-[11px]">
                    {currentActiveSlot.lesson.className} {currentActiveSlot.lesson.subjectName} {currentActiveSlot.lesson.room || ''}
                  </span>
                ) : (
                  <span className="text-emerald-700 text-[11px] font-medium">
                    非授課時間
                  </span>
                )}
              </div>
            )}

            {/* STRAIGHT VERTICAL CHRONOLOGICAL TIMELINE (SINGLE COLUMN) */}
            <div className="flex flex-col space-y-2.5">
              {DAILY_SCHEDULE_ITEMS
                .filter(item => {
                  if (!filterOnlyClasses) return true;
                  // If filter is active, only show lessons that the teacher actually teaches
                  if (item.type === 'lesson' && item.periodNumber) {
                    return currentDayLessons.some(l => l.period === item.periodNumber);
                  }
                  return false;
                })
                .map((item) => {
                  const isCurrent = currentActiveSlot?.slot.id === item.id;
                  
                  // Teaching period slot (1 to 8)
                  if (item.type === 'lesson' && item.periodNumber) {
                    const lesson = currentDayLessons.find(l => l.period === item.periodNumber);

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative",
                          isCurrent 
                            ? "bg-emerald-50/60 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs"
                            : lesson 
                              ? "bg-white border-[#E9E3DB] hover:border-[#88968A] shadow-2xs hover:shadow-xs" 
                              : "bg-[#FAF7F2]/40 border-[#E9E3DB]/70 border-dashed"
                        )}
                      >
                        {/* Left Period & Time Information */}
                        <div className="flex items-center gap-3.5 shrink-0 min-w-52">
                          <div className={cn(
                            "w-13 h-13 rounded-xl flex flex-col items-center justify-center shrink-0 border",
                            isCurrent
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                              : lesson
                                ? "bg-[#FAF7F2] text-[#3D3833] border-[#E9E3DB]"
                                : "bg-white text-[#8E877F] border-[#E9E3DB]"
                          )}>
                            <span className="text-[10px] font-bold uppercase">({item.periodNumber})</span>
                            <span className="text-xs font-bold leading-tight mt-0.5">{item.startTime}</span>
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sm text-[#3D3833]">
                                第 {item.periodNumber} 節課堂
                              </span>
                              {isCurrent && (
                                <span className="px-2 py-0.2 bg-emerald-600 text-white text-[10px] font-bold rounded-full animate-pulse">
                                  進行中
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-[#8E877F] font-medium mt-0.5">
                              {item.startTime} – {item.endTime} (40分鐘)
                            </div>
                          </div>
                        </div>

                        {/* Middle: Lesson Details (Straight across) */}
                        <div className="flex-1 min-w-0">
                          {lesson ? (
                            <div className="flex flex-wrap items-center gap-3">
                              {/* Class Pill */}
                              <span className="px-3 py-1 bg-[#88968A]/20 text-[#2D2A26] font-extrabold text-base rounded-lg border border-[#88968A]/30">
                                {lesson.className}
                              </span>

                              {/* Subject Name */}
                              <div>
                                <span className="text-base font-bold text-[#3D3833]">
                                  {lesson.subjectName}
                                </span>
                                {lesson.notes && (
                                  <span className="text-xs text-[#8E877F] ml-2 italic">
                                    • {lesson.notes}
                                  </span>
                                )}
                              </div>

                              {/* Room Badge */}
                              {lesson.room && (
                                <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#FAF7F2] border border-[#E9E3DB] rounded-lg text-xs font-semibold text-[#5D554D]">
                                  <MapPin className="w-3.5 h-3.5 text-[#88968A]" />
                                  <span>{lesson.room}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-xs text-[#8E877F] italic">
                              <Coffee className="w-4 h-4 text-[#C59B83]" />
                              <span>空堂 / 備課、批改及教務行政時間</span>
                            </div>
                          )}
                        </div>

                        {/* Right Quick Actions */}
                        {lesson && (
                          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                            {onNavigateSyllabus && (
                              <button
                                type="button"
                                onClick={onNavigateSyllabus}
                                className="px-2.5 py-1 text-[11px] font-semibold text-[#88968A] hover:text-[#3D3833] hover:bg-[#FAF7F2] border border-transparent hover:border-[#E9E3DB] rounded-lg transition-colors cursor-pointer"
                              >
                                查看進度
                              </button>
                            )}
                            {onNavigateTasks && (
                              <button
                                type="button"
                                onClick={onNavigateTasks}
                                className="px-2.5 py-1 text-[11px] font-semibold text-[#C59B83] hover:text-[#3D3833] hover:bg-[#FAF7F2] border border-transparent hover:border-[#E9E3DB] rounded-lg transition-colors cursor-pointer"
                              >
                                課堂任務
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Routine Slot (Assembly, Recess, Lunch, Dismissal)
                  let icon = <Bell className="w-4 h-4" />;
                  let slotBg = "bg-[#FAF7F2]/60 border-[#E9E3DB]";
                  let badgeText = "全校日常排程";

                  if (item.type === 'assembly') {
                    icon = <Users className="w-4 h-4 text-sky-700" />;
                    slotBg = "bg-sky-50/40 border-sky-200";
                    badgeText = "全校早會 / 班主任節";
                  } else if (item.type === 'recess') {
                    icon = <Coffee className="w-4 h-4 text-amber-700" />;
                    slotBg = "bg-amber-50/30 border-amber-200/80";
                    badgeText = "小息休息時間";
                  } else if (item.type === 'lunch') {
                    icon = <Utensils className="w-4 h-4 text-emerald-700" />;
                    slotBg = "bg-emerald-50/30 border-emerald-200/80";
                    badgeText = "全校午膳時間";
                  } else if (item.type === 'dismissal') {
                    icon = <LogOut className="w-4 h-4 text-[#8E877F]" />;
                    slotBg = "bg-stone-50 border-[#E9E3DB]";
                    badgeText = "放學及結束工作";
                  }

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                        slotBg,
                        isCurrent ? "ring-2 ring-emerald-500/30 bg-emerald-50 border-emerald-300 shadow-2xs" : ""
                      )}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-white border border-[#E9E3DB] flex items-center justify-center shrink-0 text-[#8E877F] shadow-2xs">
                          {icon}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-[#3D3833]">
                              {item.label}
                            </span>
                            {item.subLabel && (
                              <span className="text-xs text-[#8E877F]">
                                ({item.subLabel})
                              </span>
                            )}
                            {isCurrent && (
                              <span className="px-2 py-0.2 bg-emerald-600 text-white text-[10px] font-bold rounded-full">
                                進行中
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#8E877F] mt-0.5">
                            {badgeText}
                          </div>
                        </div>
                      </div>

                      <div className="text-xs font-bold text-[#5D554D] self-end sm:self-auto bg-white/70 px-2.5 py-1 rounded-lg border border-[#E9E3DB]">
                        {item.startTime} – {item.endTime}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )) : (
          /* MATRIX VIEW: FULL 7-DAY TIMETABLE GRID */
          <div className="space-y-4">
            <div className="border border-[#E9E3DB] rounded-xl overflow-x-auto shadow-2xs">
              <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                <thead>
                  <tr className="bg-[#FAF7F2] text-[#8E877F] uppercase tracking-wider border-b border-[#E9E3DB]">
                    <th className="py-3 px-3.5 font-bold w-32 border-r border-[#E9E3DB]">節數 / 時間</th>
                    {[1, 2, 3, 4, 5, 6, 7].map(day => (
                      <th 
                        key={day} 
                        className={cn(
                          "py-3 px-3 font-bold border-r border-[#E9E3DB] last:border-r-0 text-center",
                          activeCycleDay === day ? "bg-[#88968A]/15 text-[#3D3833]" : ""
                        )}
                      >
                        <div className="text-sm font-bold">Day {day}</div>
                        <div className="text-[10px] text-[#8E877F] font-normal lowercase">
                          {(timetable?.lessons || []).filter(l => l.cycleDay === day).length} 堂
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9E3DB] bg-white">
                  {/* 08:00 - 08:25 Pre-School Assembly Row */}
                  <tr className="bg-sky-50/30 hover:bg-sky-50/60 transition-colors">
                    <td className="py-2.5 px-3.5 font-bold text-[#3D3833] bg-sky-50/50 border-r border-[#E9E3DB]">
                      <div className="flex items-center gap-1 text-[11px]">
                        <Users className="w-3.5 h-3.5 text-[#88968A]" />
                        <span>早會</span>
                      </div>
                      <div className="text-[10px] text-[#8E877F] font-normal">08:00 - 08:25</div>
                    </td>
                    {[1, 2, 3, 4, 5, 6, 7].map(day => (
                      <td key={day} className="py-2 px-2 text-center border-r border-[#E9E3DB] last:border-r-0">
                        <span className="inline-block px-2 py-0.5 bg-sky-100/70 text-sky-800 text-[10px] font-semibold rounded-md">
                          Pre-School Assembly
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* (1) 08:25 - 09:05 */}
                  {renderPeriodMatrixRow(1, '08:25 - 09:05')}

                  {/* (2) 09:05 - 09:45 */}
                  {renderPeriodMatrixRow(2, '09:05 - 09:45')}

                  {/* 09:45 - 10:00 1st Recess */}
                  <tr className="bg-amber-50/25 hover:bg-amber-50/50 transition-colors">
                    <td className="py-2.5 px-3.5 font-bold text-[#3D3833] bg-amber-50/40 border-r border-[#E9E3DB]">
                      <div className="flex items-center gap-1 text-[11px]">
                        <Coffee className="w-3.5 h-3.5 text-amber-700" />
                        <span>第一小息</span>
                      </div>
                      <div className="text-[10px] text-[#8E877F] font-normal">09:45 - 10:00</div>
                    </td>
                    {[1, 2, 3, 4, 5, 6, 7].map(day => (
                      <td key={day} className="py-2 px-2 text-center border-r border-[#E9E3DB] last:border-r-0">
                        <span className="inline-block px-2 py-0.5 bg-amber-100/70 text-amber-800 text-[10px] font-semibold rounded-md">
                          1st Recess
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* (3) 10:00 - 10:40 */}
                  {renderPeriodMatrixRow(3, '10:00 - 10:40')}

                  {/* (4) 10:40 - 11:20 */}
                  {renderPeriodMatrixRow(4, '10:40 - 11:20')}

                  {/* 11:20 - 11:35 2nd Recess */}
                  <tr className="bg-amber-50/25 hover:bg-amber-50/50 transition-colors">
                    <td className="py-2.5 px-3.5 font-bold text-[#3D3833] bg-amber-50/40 border-r border-[#E9E3DB]">
                      <div className="flex items-center gap-1 text-[11px]">
                        <Coffee className="w-3.5 h-3.5 text-amber-700" />
                        <span>第二小息</span>
                      </div>
                      <div className="text-[10px] text-[#8E877F] font-normal">11:20 - 11:35</div>
                    </td>
                    {[1, 2, 3, 4, 5, 6, 7].map(day => (
                      <td key={day} className="py-2 px-2 text-center border-r border-[#E9E3DB] last:border-r-0">
                        <span className="inline-block px-2 py-0.5 bg-amber-100/70 text-amber-800 text-[10px] font-semibold rounded-md">
                          2nd Recess
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* (5) 11:35 - 12:15 */}
                  {renderPeriodMatrixRow(5, '11:35 - 12:15')}

                  {/* (6) 12:15 - 12:55 */}
                  {renderPeriodMatrixRow(6, '12:15 - 12:55')}

                  {/* 12:55 - 14:10 Lunch */}
                  <tr className="bg-emerald-50/25 hover:bg-emerald-50/50 transition-colors">
                    <td className="py-2.5 px-3.5 font-bold text-[#3D3833] bg-emerald-50/40 border-r border-[#E9E3DB]">
                      <div className="flex items-center gap-1 text-[11px]">
                        <Utensils className="w-3.5 h-3.5 text-emerald-700" />
                        <span>午膳時間</span>
                      </div>
                      <div className="text-[10px] text-[#8E877F] font-normal">12:55 - 14:10</div>
                    </td>
                    {[1, 2, 3, 4, 5, 6, 7].map(day => (
                      <td key={day} className="py-2 px-2 text-center border-r border-[#E9E3DB] last:border-r-0">
                        <span className="inline-block px-2.5 py-0.5 bg-emerald-100/70 text-emerald-800 text-[10px] font-semibold rounded-md">
                          Lunch 午膳
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* (7) 14:10 - 14:50 */}
                  {renderPeriodMatrixRow(7, '14:10 - 14:50')}

                  {/* (8) 14:50 - 15:30 */}
                  {renderPeriodMatrixRow(8, '14:50 - 15:30')}

                  {/* 16:00 End of Work */}
                  <tr className="bg-stone-50 hover:bg-stone-100/60 transition-colors">
                    <td className="py-2.5 px-3.5 font-bold text-[#3D3833] bg-[#FAF7F2]/60 border-r border-[#E9E3DB]">
                      <div className="flex items-center gap-1 text-[11px]">
                        <LogOut className="w-3.5 h-3.5 text-[#8E877F]" />
                        <span>放學</span>
                      </div>
                      <div className="text-[10px] text-[#8E877F] font-normal">16:00</div>
                    </td>
                    {[1, 2, 3, 4, 5, 6, 7].map(day => (
                      <td key={day} className="py-2 px-2 text-center border-r border-[#E9E3DB] last:border-r-0">
                        <span className="inline-block px-2 py-0.5 bg-[#FAF7F2] text-[#8E877F] text-[10px] font-medium rounded-md border border-[#E9E3DB]">
                          End of Work
                        </span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* TIMETABLE UPLOAD MODAL */}
      <TimetableUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        currentTimetable={timetable}
        onSave={onSaveTimetable}
      />
    </div>
  );

  // Helper renderer for each teaching period in matrix view
  function renderPeriodMatrixRow(periodNum: number, timeStr: string) {
    return (
      <tr key={periodNum} className="hover:bg-[#FAF7F2]/40 transition-colors">
        <td className="py-3 px-3.5 font-bold text-[#3D3833] bg-[#FAF7F2]/40 border-r border-[#E9E3DB]">
          <div>({periodNum}) 第 {periodNum} 節</div>
          <div className="text-[10px] text-[#8E877F] font-normal">{timeStr}</div>
        </td>

        {[1, 2, 3, 4, 5, 6, 7].map(day => {
          const lesson = (timetable?.lessons || []).find(l => l.cycleDay === day && l.period === periodNum);
          const isCurrent = currentActiveSlot?.slot.periodNumber === periodNum && activeCycleDay === day;

          return (
            <td 
              key={day} 
              className={cn(
                "py-2.5 px-2.5 text-center border-r border-[#E9E3DB] last:border-r-0 align-middle",
                isCurrent ? "bg-emerald-50" : day === activeCycleDay ? "bg-[#FAF7F2]/30" : ""
              )}
            >
              {lesson ? (
                <div className="p-2 rounded-lg bg-[#FAF7F2] border border-[#E9E3DB] text-left hover:border-[#88968A] transition-colors shadow-2xs">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-xs text-[#3D3833]">{lesson.className}</span>
                    {lesson.room && (
                      <span className="text-[10px] font-semibold text-[#88968A]">{lesson.room}</span>
                    )}
                  </div>
                  <div className="text-xs text-[#3D3833] font-medium truncate mt-0.5">
                    {lesson.subjectName}
                  </div>
                </div>
              ) : (
                <span className="text-[11px] text-[#D9CEC1]">-</span>
              )}
            </td>
          );
        })}
      </tr>
    );
  }
}
