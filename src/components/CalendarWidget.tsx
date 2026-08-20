import { useState, useMemo } from 'react';
import { CalendarEvent } from '../types';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  eachDayOfInterval, 
  parseISO,
  addDays,
  isWeekend
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon, 
  Trash2, 
  Edit2, 
  Check, 
  Sparkles, 
  Layers, 
  Sun, 
  Flag, 
  Search,
  ListFilter,
  ArrowUpRight,
  CalendarDays,
  BookmarkCheck,
  PartyPopper
} from 'lucide-react';
import { cn } from '../utils';
import { ConfirmModal } from './ConfirmModal';

interface Props {
  events: CalendarEvent[];
  setEvents: (events: CalendarEvent[] | ((prev: CalendarEvent[]) => CalendarEvent[])) => void;
}

const COMMON_EVENT_TAGS = [
  '陸運會',
  '教師發展日',
  '統測 / 段考',
  '家長日',
  '開學禮',
  '結業禮',
  '校外參觀',
  '公眾假期',
  '學校假期',
  'Mock Exam',
  'TSA 評估',
  'E-Day',
  '家長教師會周年大會'
];

export function CalendarWidget({ events, setEvents }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activePanelTab, setActivePanelTab] = useState<'selectedDay' | 'allActivities'>('selectedDay');
  
  // All Activities Filter states
  const [activityScope, setActivityScope] = useState<'month' | 'all'>('month');
  const [activityTypeFilter, setActivityTypeFilter] = useState<'all' | 'activity' | 'holiday'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Event form states
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventType, setNewEventType] = useState<'cycle' | 'activity' | 'holiday'>('activity');
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Batch cycle generator states
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchStartDay, setBatchStartDay] = useState<number>(1);
  const [batchDaysCount, setBatchDaysCount] = useState<number>(14);

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const safeEvents = Array.isArray(events) ? events : [];

  const isCycleEvent = (e: CalendarEvent) => {
    return e.type === 'cycle' || e.title.trim().toLowerCase().startsWith('day');
  };

  // Filter events for selected day
  const eventsForSelectedDay = safeEvents.filter(e => e.date === selectedDateStr);
  const currentCycleEvent = eventsForSelectedDay.find(isCycleEvent);

  // Quick helper to extract Day number (1-7)
  const currentCycleDayNum = (() => {
    if (!currentCycleEvent) return null;
    const match = currentCycleEvent.title.match(/Day\s*([1-7])/i);
    return match ? parseInt(match[1]) : null;
  })();

  // All activities except cycle days (chronologically sorted)
  const allNonCycleEvents = useMemo(() => {
    return safeEvents
      .filter(e => !isCycleEvent(e))
      .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  }, [safeEvents]);

  // Non-cycle events for the active visible month
  const currentMonthNonCycleEvents = useMemo(() => {
    const mStartStr = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const mEndStr = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
    return allNonCycleEvents.filter(e => e.date >= mStartStr && e.date <= mEndStr);
  }, [allNonCycleEvents, currentMonth]);

  // Filtered non-cycle events for the "All Activities" view panel
  const filteredActivitiesList = useMemo(() => {
    let list = activityScope === 'month' ? currentMonthNonCycleEvents : allNonCycleEvents;

    if (activityTypeFilter !== 'all') {
      list = list.filter(e => e.type === activityTypeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(e => 
        e.title.toLowerCase().includes(q) || 
        e.date.includes(q) || 
        (e.description && e.description.toLowerCase().includes(q))
      );
    }

    return list;
  }, [activityScope, currentMonthNonCycleEvents, allNonCycleEvents, activityTypeFilter, searchQuery]);

  // One-click Cycle Day Setter
  const handleSetCycleDay = (dayNumber: number | null) => {
    const filtered = safeEvents.filter(e => !(e.date === selectedDateStr && isCycleEvent(e)));
    
    if (dayNumber !== null) {
      const newCycleEvent: CalendarEvent = {
        id: `cycle-${selectedDateStr}`,
        date: selectedDateStr,
        title: `Day ${dayNumber}`,
        type: 'cycle',
        description: `7-Day Cycle: Day ${dayNumber}`
      };
      setEvents([...filtered, newCycleEvent]);
    } else {
      setEvents(filtered);
    }
  };

  // Add or Update Event
  const onSaveEvent = () => {
    const trimmedTitle = newEventTitle.trim();
    if (!trimmedTitle) return;
    
    if (editingEventId) {
      const updated = safeEvents.map(e => e.id === editingEventId ? {
        ...e,
        title: trimmedTitle,
        type: newEventType,
        description: newEventDescription.trim() || undefined
      } : e);
      setEvents(updated);
      setEditingEventId(null);
    } else {
      let baseEvents = safeEvents;
      if (newEventType === 'cycle') {
        baseEvents = safeEvents.filter(e => !(e.date === selectedDateStr && isCycleEvent(e)));
      }

      const newEvent: CalendarEvent = {
        id: `cal-${selectedDateStr}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        date: selectedDateStr,
        title: trimmedTitle,
        type: newEventType,
        description: newEventDescription.trim() || undefined
      };
      setEvents([...baseEvents, newEvent]);
    }
    
    setNewEventTitle('');
    setNewEventDescription('');
    setIsAddingMode(false);
  };

  const onStartEdit = (event: CalendarEvent) => {
    setSelectedDate(parseISO(event.date));
    setCurrentMonth(parseISO(event.date));
    setEditingEventId(event.id);
    setNewEventTitle(event.title);
    setNewEventType(event.type);
    setNewEventDescription(event.description || '');
    setIsAddingMode(true);
    setActivePanelTab('selectedDay');
  };

  const onDeleteEvent = (id: string) => {
    setEvents(safeEvents.filter(e => e.id !== id));
    setEventToDelete(null);
  };

  // Jump to specific activity in calendar
  const handleJumpToEventDate = (event: CalendarEvent) => {
    const targetDate = parseISO(event.date);
    setSelectedDate(targetDate);
    setCurrentMonth(targetDate);
  };

  // Batch Auto-Cycle Generator (Sequentially fills Day 1 -> Day 7 on weekdays)
  const handleBatchGenerateCycle = () => {
    let curr = new Date(selectedDate);
    let currentDayIndex = batchStartDay; // 1 to 7
    const newEventsList = [...safeEvents];

    for (let i = 0; i < batchDaysCount; i++) {
      if (!isWeekend(curr)) {
        const dateStr = format(curr, 'yyyy-MM-dd');
        const hasHoliday = newEventsList.some(e => e.date === dateStr && (e.type === 'holiday' || e.title.includes('假')));
        
        if (!hasHoliday) {
          const idx = newEventsList.findIndex(e => e.date === dateStr && isCycleEvent(e));
          if (idx >= 0) {
            newEventsList.splice(idx, 1);
          }

          newEventsList.push({
            id: `cycle-${dateStr}`,
            date: dateStr,
            title: `Day ${currentDayIndex}`,
            type: 'cycle',
            description: `7-Day Cycle: Day ${currentDayIndex}`
          });

          currentDayIndex = (currentDayIndex % 7) + 1;
        }
      }
      curr = addDays(curr, 1);
    }

    setEvents(newEventsList);
    setShowBatchModal(false);
  };

  // Calendar calculations
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dateFormat = "d";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  // Counts
  const monthActivityCount = currentMonthNonCycleEvents.filter(e => e.type !== 'holiday' && !e.title.includes('假')).length;
  const monthHolidayCount = currentMonthNonCycleEvents.filter(e => e.type === 'holiday' || e.title.includes('假')).length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#E9E3DB] overflow-hidden flex flex-col xl:flex-row h-full">
      {/* LEFT: CALENDAR GRID & MONTH OVERVIEW */}
      <div className="flex-1 p-5 md:p-6 border-b xl:border-b-0 xl:border-r border-[#E9E3DB] flex flex-col justify-between">
        <div>
          {/* Month Navigation & Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <h3 className="font-serif font-bold text-[#3D3833] text-xl md:text-2xl flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-[#88968A]" />
                {format(currentMonth, 'yyyy年 M月')}
              </h3>
              <button
                type="button"
                id="btn-calendar-return-today"
                onClick={() => {
                  const today = new Date();
                  setCurrentMonth(today);
                  setSelectedDate(today);
                }}
                className="px-2.5 py-1 text-xs font-semibold bg-[#FAF7F2] hover:bg-[#E9E3DB] text-[#5D554D] rounded-lg border border-[#E9E3DB] transition-colors cursor-pointer"
              >
                返回今天
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button 
                type="button"
                id="btn-calendar-batch-cycle"
                onClick={() => setShowBatchModal(true)}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="批次連續生成循環日"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>自動排 7-Day 循環</span>
              </button>

              <div className="flex items-center bg-[#FAF7F2] border border-[#E9E3DB] rounded-xl p-0.5 shadow-2xs">
                <button 
                  type="button"
                  id="btn-calendar-prev-month"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-1.5 hover:bg-white rounded-lg transition-colors text-[#5D554D] cursor-pointer"
                  title="上個月"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  type="button"
                  id="btn-calendar-next-month"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-1.5 hover:bg-white rounded-lg transition-colors text-[#5D554D] cursor-pointer"
                  title="下個月"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Month Non-Cycle Activities Stats Banner */}
          <div className="mb-4 px-3.5 py-2.5 bg-[#FAF7F2] rounded-xl border border-[#E9E3DB] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-bold text-[#3D3833] flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-[#88968A]" />
                本月活動總結（不含循環日）：
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100/80 text-amber-900 font-semibold rounded-md border border-amber-200">
                <Flag className="w-3 h-3 text-amber-700" />
                {monthActivityCount} 項校園活動
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100/80 text-red-900 font-semibold rounded-md border border-red-200">
                <Sun className="w-3 h-3 text-red-700" />
                {monthHolidayCount} 日假期
              </span>
            </div>

            <button
              type="button"
              id="btn-toggle-all-activities-tab"
              onClick={() => {
                setActivePanelTab('allActivities');
                setActivityScope('month');
              }}
              className="font-bold text-[#88968A] hover:text-[#3D3833] inline-flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>查看本月全部清單 ({currentMonthNonCycleEvents.length})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1.5 mb-1.5">
            {['日', '一', '二', '三', '四', '五', '六'].map((day, idx) => (
              <div 
                key={day} 
                className={cn(
                  "text-center text-xs font-bold py-1.5 rounded-lg",
                  idx === 0 || idx === 6 ? "text-amber-800 bg-amber-50/50" : "text-[#5D554D] bg-[#FAF7F2]"
                )}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((day) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const dayEvents = safeEvents.filter(e => e.date === dayStr);
              const cycleEvent = dayEvents.find(isCycleEvent);
              
              // Non-cycle events for this day
              const nonCycleDayEvents = dayEvents.filter(e => !isCycleEvent(e));
              const holidayEvents = nonCycleDayEvents.filter(e => e.type === 'holiday' || e.title.includes('假'));
              const activityEvents = nonCycleDayEvents.filter(e => e.type !== 'holiday' && !e.title.includes('假'));

              const isSelected = isSameDay(day, selectedDate);
              const isTodayDate = isSameDay(day, new Date());
              const isCurrentMonth = isSameMonth(day, monthStart);

              return (
                <div 
                  key={day.toString()} 
                  onClick={() => {
                    setSelectedDate(day);
                    setIsAddingMode(false);
                    setEditingEventId(null);
                  }}
                  className={cn(
                    "min-h-[86px] p-1.5 flex flex-col justify-between cursor-pointer transition-all border rounded-xl relative group",
                    !isCurrentMonth ? "opacity-35 bg-stone-50/40 border-transparent text-[#8E877F]" :
                      isSelected 
                        ? "bg-[#88968A]/12 border-[#88968A] shadow-xs ring-2 ring-[#88968A]/35" 
                        : "bg-white border-[#E9E3DB] hover:border-[#88968A]/60 hover:bg-[#FAF7F2]/60"
                  )}
                >
                  {/* Top: Date Number & Cycle Day Badge */}
                  <div className="flex items-center justify-between gap-1">
                    <span className={cn(
                      "text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full transition-transform group-hover:scale-105",
                      isTodayDate 
                        ? "bg-[#88968A] text-white shadow-2xs" 
                        : isSelected 
                        ? "text-[#3D3833] font-black bg-stone-200/70" 
                        : "text-[#3D3833]"
                    )}>
                      {format(day, dateFormat)}
                    </span>

                    {cycleEvent && (
                      <span className="px-1.5 py-0.2 bg-[#88968A] text-white text-[9px] font-bold rounded uppercase tracking-tight shadow-2xs">
                        {cycleEvent.title.replace('Day ', 'D')}
                      </span>
                    )}
                  </div>
                  
                  {/* Middle: ALL ACTIVITIES & HOLIDAYS (Excluding Cycle Days) */}
                  <div className="space-y-1 mt-1 w-full overflow-hidden flex-1 flex flex-col justify-start">
                    {/* Holidays List */}
                    {holidayEvents.map(h => (
                      <div 
                        key={h.id} 
                        title={`${h.title}${h.description ? ' - ' + h.description : ''}`}
                        className="px-1 py-0.5 bg-rose-100 text-rose-900 text-[9px] font-bold rounded truncate leading-tight flex items-center gap-0.5 border border-rose-200/80 shadow-2xs"
                      >
                        <Sun className="w-2.5 h-2.5 shrink-0 text-rose-700" />
                        <span className="truncate">{h.title}</span>
                      </div>
                    ))}

                    {/* All School Activities */}
                    {activityEvents.map(a => (
                      <div 
                        key={a.id} 
                        title={`${a.title}${a.description ? ' - ' + a.description : ''}`}
                        className={cn(
                          "px-1 py-0.5 text-[9px] font-semibold rounded truncate leading-tight flex items-center gap-0.5 border shadow-2xs",
                          a.title.toLowerCase().includes('exam') || a.title.includes('測') || a.title.includes('考')
                            ? "bg-indigo-50 text-indigo-900 border-indigo-200"
                            : a.title.toLowerCase().includes('camp') || a.title.includes('營') || a.title.includes('run')
                            ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                            : "bg-amber-50 text-amber-900 border-amber-200"
                        )}
                      >
                        <Flag className="w-2.5 h-2.5 shrink-0 opacity-80" />
                        <span className="truncate">{a.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-[#E9E3DB] text-xs text-[#8E877F]">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#88968A]"></span>
              <span className="font-medium text-[#5D554D]">循環日 (D1-D7)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300"></span>
              <span className="font-medium text-[#5D554D]">校園活動</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-indigo-100 border border-indigo-300"></span>
              <span className="font-medium text-[#5D554D]">測考評估</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-100 border border-rose-300"></span>
              <span className="font-medium text-[#5D554D]">學校假期</span>
            </div>
          </div>

          <div className="text-[11px] text-[#8E877F]">
            點擊任一日曆格可設定循環日或新增活動
          </div>
        </div>
      </div>

      {/* RIGHT: TABBED SIDEBAR (Selected Day Inspector VS All Non-Cycle Activities List) */}
      <div className="w-full xl:w-96 bg-[#FAF7F2] p-5 md:p-6 flex flex-col justify-between">
        <div className="space-y-4">
          {/* Top Panel Tab Toggle */}
          <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-xl border border-[#E9E3DB] shadow-2xs">
            <button
              type="button"
              id="tab-btn-selected-day"
              onClick={() => setActivePanelTab('selectedDay')}
              className={cn(
                "py-2 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                activePanelTab === 'selectedDay'
                  ? "bg-[#3D3833] text-white shadow-2xs"
                  : "text-[#8E877F] hover:text-[#3D3833] hover:bg-[#FAF7F2]"
              )}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>所選日期設定</span>
            </button>
            <button
              type="button"
              id="tab-btn-all-activities"
              onClick={() => setActivePanelTab('allActivities')}
              className={cn(
                "py-2 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer relative",
                activePanelTab === 'allActivities'
                  ? "bg-[#88968A] text-white shadow-2xs"
                  : "text-[#8E877F] hover:text-[#3D3833] hover:bg-[#FAF7F2]"
              )}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>全校活動清單</span>
              <span className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                activePanelTab === 'allActivities' ? "bg-white/20 text-white" : "bg-[#FAF7F2] text-[#88968A] border border-[#E9E3DB]"
              )}>
                {allNonCycleEvents.length}
              </span>
            </button>
          </div>

          {/* TAB 1: SELECTED DAY INSPECTOR & CYCLE DAY SETTER */}
          {activePanelTab === 'selectedDay' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Header of selected date */}
              <div className="pb-3 border-b border-[#E9E3DB] flex items-center justify-between">
                <div>
                  <div className="text-xs text-[#8E877F] font-medium">所選日期</div>
                  <h4 className="text-lg font-bold text-[#3D3833] mt-0.5">
                    {format(selectedDate, 'yyyy年 M月d日')}
                  </h4>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-white border border-[#E9E3DB] rounded-lg text-[#5D554D] shadow-2xs">
                  星期{['日', '一', '二', '三', '四', '五', '六'][selectedDate.getDay()]}
                </span>
              </div>

              {/* 1-TOUCH CYCLE DAY SELECTOR */}
              <div className="bg-white p-3.5 rounded-xl border border-[#E9E3DB] shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#3D3833] flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-[#88968A]" />
                    <span>循環日 (Cycle Day)</span>
                  </span>
                  <span className="text-xs font-bold text-[#88968A]">
                    {currentCycleDayNum ? `設定為 Day ${currentCycleDayNum}` : '未設定 / 非循環日'}
                  </span>
                </div>

                {/* Day 1 to 7 Pills */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 7].map((num) => {
                    const isActive = currentCycleDayNum === num;
                    return (
                      <button
                        key={num}
                        type="button"
                        id={`btn-set-cycle-day-${num}`}
                        onClick={() => handleSetCycleDay(isActive ? null : num)}
                        className={cn(
                          "py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer",
                          isActive
                            ? "bg-[#88968A] text-white shadow-xs scale-102"
                            : "bg-[#FAF7F2] hover:bg-[#E9E3DB] text-[#3D3833] border border-[#E9E3DB]"
                        )}
                      >
                        {isActive && <Check className="w-3 h-3" />}
                        <span>Day {num}</span>
                      </button>
                    );
                  })}
                  
                  <button
                    type="button"
                    id="btn-clear-cycle-day"
                    onClick={() => handleSetCycleDay(null)}
                    className="py-2 px-1 rounded-lg text-[11px] font-semibold text-[#8E877F] hover:text-red-600 bg-[#FAF7F2] hover:bg-red-50 border border-[#E9E3DB] transition-colors cursor-pointer"
                    title="清除此日循環日"
                  >
                    清除 Day
                  </button>
                </div>
              </div>

              {/* EVENTS / ACTIVITIES LIST FOR THIS DAY */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#3D3833]">本日活動與備註清單</span>
                  <span className="text-[11px] text-[#8E877F]">
                    {eventsForSelectedDay.filter(e => !isCycleEvent(e)).length} 個項目
                  </span>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {eventsForSelectedDay.filter(e => !isCycleEvent(e)).length > 0 ? (
                    eventsForSelectedDay.filter(e => !isCycleEvent(e)).map(event => (
                      <div 
                        key={event.id} 
                        className="bg-white p-3 rounded-xl border border-[#E9E3DB] shadow-2xs relative group hover:border-[#88968A] transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1">
                            <div className={cn(
                              "w-2.5 h-2.5 rounded-full mt-1 shrink-0",
                              event.type === 'holiday' ? "bg-red-500" : "bg-amber-500"
                            )} />
                            <div>
                              <p className="text-sm font-bold text-[#3D3833] leading-snug">{event.title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={cn(
                                  "text-[10px] font-bold px-1.5 py-0.2 rounded border",
                                  event.type === 'holiday' 
                                    ? "bg-red-50 text-red-700 border-red-200" 
                                    : "bg-amber-50 text-amber-800 border-amber-200"
                                )}>
                                  {event.type === 'holiday' ? '學校假期' : '校園活動'}
                                </span>
                              </div>
                              {event.description && (
                                <p className="text-xs text-[#8E877F] mt-1 leading-relaxed">{event.description}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => onStartEdit(event)}
                              className="p-1 text-[#8E877F] hover:text-[#3D3833] hover:bg-[#FAF7F2] rounded-md transition-colors"
                              title="編輯"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEventToDelete(event.id)}
                              className="p-1 text-[#8E877F] hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="刪除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-xs text-[#8E877F] bg-white/60 rounded-xl border border-dashed border-[#E9E3DB]">
                      此日暫無活動或假期
                    </div>
                  )}
                </div>
              </div>

              {/* ADD / EDIT EVENT FORM */}
              {isAddingMode ? (
                <div className="bg-white p-3.5 rounded-xl border border-[#88968A] shadow-xs space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-[#E9E3DB] pb-2">
                    <span className="text-xs font-bold text-[#3D3833]">
                      {editingEventId ? '編輯活動 / 假期' : '新增活動 / 假期'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingMode(false);
                        setEditingEventId(null);
                      }}
                      className="text-xs text-[#8E877F] hover:text-[#3D3833]"
                    >
                      取消
                    </button>
                  </div>

                  {/* Type Switcher */}
                  <div className="grid grid-cols-2 gap-1 bg-[#FAF7F2] p-1 rounded-lg border border-[#E9E3DB]">
                    <button
                      type="button"
                      onClick={() => setNewEventType('activity')}
                      className={cn(
                        "py-1.5 text-xs font-bold rounded-md transition-all text-center cursor-pointer",
                        newEventType === 'activity' ? "bg-amber-100 text-amber-900 shadow-2xs" : "text-[#8E877F]"
                      )}
                    >
                      校園活動
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewEventType('holiday')}
                      className={cn(
                        "py-1.5 text-xs font-bold rounded-md transition-all text-center cursor-pointer",
                        newEventType === 'holiday' ? "bg-red-100 text-red-900 shadow-2xs" : "text-[#8E877F]"
                      )}
                    >
                      學校假期
                    </button>
                  </div>

                  {/* Title input */}
                  <input 
                    id="calendar-event-title-input"
                    autoFocus
                    value={newEventTitle}
                    onChange={(e) => setNewEventTitle(e.target.value)}
                    placeholder="輸入名稱 (例如: 陸運會、中史科統測)..."
                    className="w-full text-xs p-2.5 bg-[#FAF7F2] rounded-lg border border-[#E9E3DB] focus:outline-none focus:ring-1 focus:ring-[#88968A] font-medium"
                  />

                  {/* Quick Tags */}
                  <div className="flex flex-wrap gap-1">
                    {COMMON_EVENT_TAGS.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setNewEventTitle(tag);
                          if (tag.includes('假')) {
                            setNewEventType('holiday');
                          } else {
                            setNewEventType('activity');
                          }
                        }}
                        className="px-2 py-0.5 bg-[#FAF7F2] hover:bg-[#E9E3DB] text-[#5D554D] text-[10px] font-medium rounded border border-[#E9E3DB] transition-colors cursor-pointer"
                      >
                        +{tag}
                      </button>
                    ))}
                  </div>

                  {/* Description input */}
                  <textarea 
                    id="calendar-event-desc-input"
                    value={newEventDescription}
                    onChange={(e) => setNewEventDescription(e.target.value)}
                    placeholder="備注 / 詳情 (選填)..."
                    rows={2}
                    className="w-full text-xs p-2 bg-[#FAF7F2] rounded-lg border border-[#E9E3DB] focus:outline-none focus:ring-1 focus:ring-[#88968A] resize-none"
                  />

                  <div className="flex gap-2 pt-1">
                    <button 
                      type="button"
                      id="btn-calendar-submit-event"
                      onClick={onSaveEvent}
                      disabled={!newEventTitle.trim()}
                      className="flex-1 bg-[#88968A] hover:bg-[#778579] disabled:opacity-50 text-white py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
                    >
                      {editingEventId ? '儲存變更' : '確認新增'}
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setIsAddingMode(false);
                        setEditingEventId(null);
                        setNewEventTitle('');
                        setNewEventDescription('');
                      }}
                      className="px-3 py-2 text-[#8E877F] hover:bg-[#FAF7F2] border border-[#E9E3DB] rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      關閉
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  type="button"
                  id="btn-calendar-add-event"
                  onClick={() => {
                    setIsAddingMode(true);
                    setEditingEventId(null);
                    setNewEventTitle('');
                    setNewEventDescription('');
                    setNewEventType('activity');
                  }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 border border-dashed border-[#88968A] text-[#88968A] hover:text-[#778579] hover:border-[#778579] rounded-xl hover:bg-emerald-50/50 transition-all text-xs font-bold cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> 新增校園活動或假期
                </button>
              )}
            </div>
          )}

          {/* TAB 2: ALL ACTIVITIES & HOLIDAYS (EXCLUDES CYCLE DAYS) */}
          {activePanelTab === 'allActivities' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              {/* Header */}
              <div className="pb-2 border-b border-[#E9E3DB] flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-[#3D3833] flex items-center gap-1.5">
                    <BookmarkCheck className="w-4 h-4 text-[#88968A]" />
                    <span>校園活動與假期總覽</span>
                  </h4>
                  <p className="text-[11px] text-[#8E877F]">已自動排除循環日 (Cycle Days)</p>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 bg-white border border-[#E9E3DB] rounded-md text-[#88968A]">
                  共 {filteredActivitiesList.length} 項
                </span>
              </div>

              {/* Scope Switch: Month vs All Year */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-[#E9E3DB]">
                <button
                  type="button"
                  id="btn-scope-month"
                  onClick={() => setActivityScope('month')}
                  className={cn(
                    "flex-1 py-1 text-xs font-bold rounded-md transition-all text-center cursor-pointer",
                    activityScope === 'month' ? "bg-[#FAF7F2] text-[#3D3833] border border-[#E9E3DB] shadow-2xs" : "text-[#8E877F]"
                  )}
                >
                  本月活動 ({currentMonthNonCycleEvents.length})
                </button>
                <button
                  type="button"
                  id="btn-scope-all"
                  onClick={() => setActivityScope('all')}
                  className={cn(
                    "flex-1 py-1 text-xs font-bold rounded-md transition-all text-center cursor-pointer",
                    activityScope === 'all' ? "bg-[#FAF7F2] text-[#3D3833] border border-[#E9E3DB] shadow-2xs" : "text-[#8E877F]"
                  )}
                >
                  全學年活動 ({allNonCycleEvents.length})
                </button>
              </div>

              {/* Type Filter Pills */}
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setActivityTypeFilter('all')}
                  className={cn(
                    "px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer",
                    activityTypeFilter === 'all' ? "bg-[#3D3833] text-white" : "bg-white text-[#8E877F] border border-[#E9E3DB]"
                  )}
                >
                  全部
                </button>
                <button
                  type="button"
                  onClick={() => setActivityTypeFilter('activity')}
                  className={cn(
                    "px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer flex items-center gap-1",
                    activityTypeFilter === 'activity' ? "bg-amber-100 text-amber-900 border border-amber-300" : "bg-white text-[#8E877F] border border-[#E9E3DB]"
                  )}
                >
                  <Flag className="w-3 h-3" />
                  校園活動
                </button>
                <button
                  type="button"
                  onClick={() => setActivityTypeFilter('holiday')}
                  className={cn(
                    "px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer flex items-center gap-1",
                    activityTypeFilter === 'holiday' ? "bg-red-100 text-red-900 border border-red-300" : "bg-white text-[#8E877F] border border-[#E9E3DB]"
                  )}
                >
                  <Sun className="w-3 h-3" />
                  學校假期
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#8E877F] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  id="input-search-activities"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜尋活動名稱或關鍵字 (例如: Mock, 假期)..."
                  className="w-full text-xs pl-8 pr-2.5 py-1.5 bg-white rounded-lg border border-[#E9E3DB] focus:outline-none focus:ring-1 focus:ring-[#88968A]"
                />
              </div>

              {/* Activities List Cards */}
              <div className="max-h-[340px] overflow-y-auto space-y-2 pr-1">
                {filteredActivitiesList.length > 0 ? (
                  filteredActivitiesList.map(event => {
                    const eventDate = parseISO(event.date);
                    const isHoliday = event.type === 'holiday' || event.title.includes('假');
                    const isSelected = event.date === selectedDateStr;

                    return (
                      <div
                        key={event.id}
                        onClick={() => handleJumpToEventDate(event)}
                        className={cn(
                          "p-2.5 rounded-xl border transition-all cursor-pointer group flex items-start gap-2.5",
                          isSelected
                            ? "bg-white border-[#88968A] ring-1 ring-[#88968A]/40 shadow-xs"
                            : "bg-white border-[#E9E3DB] hover:border-[#D9CEC1] hover:shadow-2xs"
                        )}
                      >
                        {/* Date Mini Badge */}
                        <div className={cn(
                          "w-11 h-11 shrink-0 rounded-lg flex flex-col items-center justify-center border text-center shadow-2xs",
                          isHoliday
                            ? "bg-rose-50 border-rose-200 text-rose-800"
                            : "bg-[#FAF7F2] border-[#E9E3DB] text-[#3D3833]"
                        )}>
                          <span className="text-[9px] uppercase font-bold opacity-75">
                            {format(eventDate, 'M月')}
                          </span>
                          <span className="text-sm font-bold leading-tight">
                            {format(eventDate, 'd日')}
                          </span>
                        </div>

                        {/* Event Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                            <span className={cn(
                              "text-[9px] font-bold px-1.5 py-0.2 rounded border",
                              isHoliday 
                                ? "bg-red-50 text-red-700 border-red-200" 
                                : "bg-amber-50 text-amber-900 border-amber-200"
                            )}>
                              {isHoliday ? '學校假期' : '校園活動'}
                            </span>
                            <span className="text-[10px] text-[#8E877F]">
                              星期{['日', '一', '二', '三', '四', '五', '六'][eventDate.getDay()]}
                            </span>
                          </div>

                          <h5 className="text-xs font-bold text-[#3D3833] truncate group-hover:text-[#88968A] transition-colors">
                            {event.title}
                          </h5>

                          {event.description && (
                            <p className="text-[11px] text-[#8E877F] truncate mt-0.5">
                              {event.description}
                            </p>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onStartEdit(event);
                            }}
                            className="p-1 text-[#8E877F] hover:text-[#3D3833] hover:bg-[#FAF7F2] rounded-md transition-colors"
                            title="編輯此活動"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-xs text-[#8E877F] bg-white rounded-xl border border-dashed border-[#E9E3DB]">
                    沒有符合篩選條件的校園活動
                  </div>
                )}
              </div>

              {/* Bottom Quick Add Trigger */}
              <button
                type="button"
                onClick={() => {
                  setActivePanelTab('selectedDay');
                  setIsAddingMode(true);
                  setEditingEventId(null);
                  setNewEventTitle('');
                  setNewEventDescription('');
                  setNewEventType('activity');
                }}
                className="w-full py-2 bg-white hover:bg-[#FAF7F2] border border-[#E9E3DB] hover:border-[#88968A] text-[#5D554D] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 text-[#88968A]" />
                <span>新增校園活動至所選日期</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={eventToDelete !== null}
        title="確認刪除事件"
        message="確定要刪除這個校曆事件嗎？"
        onConfirm={() => {
          if (eventToDelete) {
            onDeleteEvent(eventToDelete);
          }
        }}
        onCancel={() => setEventToDelete(null)}
        confirmText="刪除"
      />

      {/* BATCH CYCLE GENERATOR MODAL */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-[#E9E3DB] space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#E9E3DB] pb-3">
              <h3 className="font-serif font-bold text-lg text-[#3D3833] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                批次生成 7-Day Cycle
              </h3>
              <button 
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="text-[#8E877F] hover:text-[#3D3833] text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#8E877F] leading-relaxed">
              系統將會從所選日期（<strong>{format(selectedDate, 'yyyy-MM-dd')}</strong>）開始，自動於星期一至五按順序填入 Day 1 至 Day 7 循環日（自動避開週末與已設定之假期）。
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#3D3833] mb-1">
                  起始循環日 (Start Cycle Day)：
                </label>
                <div className="grid grid-cols-7 gap-1">
                  {[1, 2, 3, 4, 5, 6, 7].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setBatchStartDay(num)}
                      className={cn(
                        "py-2 rounded-lg text-xs font-bold border transition-colors",
                        batchStartDay === num 
                          ? "bg-[#88968A] text-white border-[#88968A]" 
                          : "bg-[#FAF7F2] text-[#3D3833] border-[#E9E3DB]"
                      )}
                    >
                      Day {num}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#3D3833] mb-1">
                  連續排程天數 (連續工作天)：
                </label>
                <select
                  value={batchDaysCount}
                  onChange={(e) => setBatchDaysCount(parseInt(e.target.value))}
                  className="w-full text-xs p-2.5 bg-[#FAF7F2] border border-[#E9E3DB] rounded-lg font-bold text-[#3D3833]"
                >
                  <option value={7}>1 週 (7 個自然日)</option>
                  <option value={14}>2 週 (14 個自然日)</option>
                  <option value={28}>4 週 (28 個自然日 / 約一個月)</option>
                  <option value={60}>2 個月 (60 個自然日)</option>
                  <option value={90}>整個學期 (90 個自然日)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleBatchGenerateCycle}
                className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white py-2.5 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                確認自動生成
              </button>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="px-4 py-2.5 border border-[#E9E3DB] text-[#8E877F] hover:bg-[#FAF7F2] rounded-xl text-xs font-semibold cursor-pointer"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
