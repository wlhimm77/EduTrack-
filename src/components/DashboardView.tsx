import { useState, useMemo } from 'react';
import { ClassGroup, Task, CalendarEvent, TeacherTimetable } from '../types';
import { defaultTimetable } from '../data';
import { format, parseISO, differenceInCalendarDays, startOfDay } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  BookOpen, 
  CheckSquare, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  FileText, 
  GraduationCap, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { cn } from '../utils';
import { CalendarWidget } from './CalendarWidget';
import { TeachingTimetableWidget } from './TeachingTimetableWidget';

interface Props {
  classes: ClassGroup[];
  tasks: Task[];
  calendarEvents: CalendarEvent[];
  timetable?: TeacherTimetable;
  setCalendarEvents: (events: CalendarEvent[] | ((prev: CalendarEvent[]) => CalendarEvent[])) => void;
  setTimetable: (newTimetable: TeacherTimetable | ((prev: TeacherTimetable) => TeacherTimetable)) => void | Promise<void>;
  onNavigateTasks?: () => void;
  onNavigateSyllabus?: () => void;
}

export function DashboardView({ 
  classes, 
  tasks, 
  calendarEvents, 
  timetable = defaultTimetable,
  setCalendarEvents, 
  setTimetable,
  onNavigateTasks, 
  onNavigateSyllabus 
}: Props) {
  const [taskFilter, setTaskFilter] = useState<'all' | 'assessments' | 'homework'>('all');

  // Calculate Syllabus Progress
  let totalTopics = 0;
  let completedTopics = 0;
  classes.forEach(c => {
    c.subjects.forEach(s => {
      s.syllabus.forEach(t => {
        totalTopics++;
        if (t.completed) completedTopics++;
      });
    });
  });

  const syllabusData = [
    { name: 'Completed', value: completedTopics, color: '#88968A' }, // Sage
    { name: 'Remaining', value: totalTopics - completedTopics, color: '#F1EDE9' }, // Light neutral
  ];

  const syllabusPercentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  // Filter Tasks due within 3 days
  const now = startOfDay(new Date());
  const pendingTasks = tasks.filter(t => t.status !== 'completed');

  const isAssessmentTask = (type: string, title: string = '') => {
    const t = (type + ' ' + title).toLowerCase();
    return (
      t.includes('測') ||
      t.includes('默') ||
      t.includes('考') ||
      t.includes('評估') ||
      t.includes('exam') ||
      t.includes('test') ||
      t.includes('quiz') ||
      t.includes('dictation') ||
      t.includes('sba')
    );
  };

  // Due within 3 days (including overdue and today)
  const dueWithin3DaysTasks = useMemo(() => {
    return pendingTasks
      .filter(t => {
        if (!t.dueDate) return false;
        const due = startOfDay(parseISO(t.dueDate));
        const diffDays = differenceInCalendarDays(due, now);
        return diffDays <= 3; // <= 3 days (e.g. overdue < 0, today 0, tomorrow 1, 2d 2, 3d 3)
      })
      .sort((a, b) => {
        const diffA = differenceInCalendarDays(startOfDay(parseISO(a.dueDate)), now);
        const diffB = differenceInCalendarDays(startOfDay(parseISO(b.dueDate)), now);
        if (diffA !== diffB) return diffA - diffB;
        return a.title.localeCompare(b.title);
      });
  }, [pendingTasks, now]);

  const displayedDueTasks = useMemo(() => {
    if (taskFilter === 'assessments') {
      return dueWithin3DaysTasks.filter(t => isAssessmentTask(t.type, t.title));
    }
    if (taskFilter === 'homework') {
      return dueWithin3DaysTasks.filter(t => !isAssessmentTask(t.type, t.title));
    }
    return dueWithin3DaysTasks;
  }, [dueWithin3DaysTasks, taskFilter]);

  const assessmentCount = dueWithin3DaysTasks.filter(t => isAssessmentTask(t.type, t.title)).length;
  const homeworkCount = dueWithin3DaysTasks.length - assessmentCount;

  const todaysEvents = calendarEvents.filter(e => e.date === format(new Date(), 'yyyy-MM-dd'));
  const cycleDayEvent = todaysEvents.find(e => e.type === 'cycle');
  const otherEvents = todaysEvents.filter(e => e.type !== 'cycle');

  const taskTypeMap: Record<string, string> = {
    homework: '家課',
    exam: '考試',
    reminder: '提醒',
    '筆記檢查': '筆記檢查',
    '家課': '家課',
    '小測': '小測',
    '默書': '默書',
    '工作紙': '工作紙'
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <header className="mb-4 md:mb-8">
        <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#3D3833]">儀表板</h2>
        <p className="text-sm md:text-base text-[#8E877F] mt-1">早晨。這是您的教學概況。</p>
      </header>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#E9E3DB] flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#8E877F] mb-2">今日日程</h3>
              <div className="flex flex-col gap-1.5 mt-1">
                {cycleDayEvent && (
                  <span className="inline-block px-2 py-0.5 bg-[#88968A] text-white text-[10px] font-bold rounded uppercase tracking-wider w-fit">
                    {cycleDayEvent.title}
                  </span>
                )}
                <h3 className="text-lg font-bold text-[#3D3833] leading-tight line-clamp-2" title={otherEvents.map(e => e.title).join(', ')}>
                  {otherEvents.length > 0 ? otherEvents.map(e => e.title).join(', ') : '無特別安排'}
                </h3>
              </div>
            </div>
            <div className="p-3 bg-[#F9F6F2] text-[#88968A] rounded-xl border border-[#E9E3DB] shrink-0 ml-2">
              <CalendarIcon className="w-6 h-6" />
            </div>
          </div>
          <div className="text-sm text-[#8E877F] font-medium flex items-center gap-1">
            {format(new Date(), 'yyyy年M月d日')}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#E9E3DB] flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#8E877F] mb-2">活躍班級</h3>
              <h3 className="text-4xl font-bold text-[#3D3833] leading-tight">{classes.length}</h3>
            </div>
            <div className="p-3 bg-[#F9F6F2] text-[#88968A] rounded-xl border border-[#E9E3DB]">
              <BookOpen className="w-6 h-6" />
            </div>
          </div>
          <div className="text-sm text-[#8E877F] font-medium">共 {classes.reduce((acc, c) => acc + c.subjects.length, 0)} 個科目</div>
        </div>

        <div 
          onClick={onNavigateTasks}
          className="bg-white rounded-2xl p-5 shadow-sm border border-[#E9E3DB] flex flex-col justify-between cursor-pointer hover:border-[#D9CEC1] hover:shadow-md transition-all group"
        >
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#8E877F] mb-2">評估與待辦</h3>
              <h3 className="text-4xl font-bold text-[#3D3833] leading-tight">{pendingTasks.length}</h3>
            </div>
            <div className="p-3 bg-[#F9F6F2] text-[#C59B83] rounded-xl border border-[#E9E3DB] group-hover:scale-110 transition-transform">
              <CheckSquare className="w-6 h-6" />
            </div>
          </div>
          <div className="text-sm font-medium text-[#C59B83] flex items-center gap-1">
            {dueWithin3DaysTasks.length} 項於 3 日內到期 <ChevronRight className="w-4 h-4" />
          </div>
        </div>

        <div 
          onClick={onNavigateSyllabus}
          className="bg-white rounded-2xl p-5 shadow-sm border border-[#E9E3DB] flex flex-col justify-between sm:col-span-2 md:col-span-1 cursor-pointer hover:border-[#D9CEC1] hover:shadow-md transition-all group"
        >
           <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#8E877F] mb-2">整體課程進度</h3>
              <h3 className="text-4xl font-bold text-[#3D3833] leading-tight">{syllabusPercentage}%</h3>
            </div>
            <div className="w-16 h-16 group-hover:scale-105 transition-transform">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={syllabusData}
                    innerRadius={22}
                    outerRadius={32}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={4}
                  >
                    {syllabusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="text-sm font-medium text-[#88968A] flex items-center gap-1 mt-4">
            查看詳細分析 <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* TEACHING TIMETABLE SECTION (HONG KONG TIME & 7-DAY CYCLE) */}
      <section className="mt-6 md:mt-8">
        <TeachingTimetableWidget
          timetable={timetable}
          calendarEvents={calendarEvents}
          setCalendarEvents={setCalendarEvents}
          classes={classes}
          onSaveTimetable={setTimetable}
          onNavigateTasks={onNavigateTasks}
          onNavigateSyllabus={onNavigateSyllabus}
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Urgent Tasks & Assessments Panel (Due Within 3 Days) */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E9E3DB] p-5 md:p-6 flex flex-col justify-between">
          <div>
            {/* Header with Title and Filter Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm md:text-base font-bold text-[#3D3833]">
                    3 日內到期評估與任務
                  </h3>
                  <p className="text-[11px] text-[#8E877F]">
                    包含今日、未來 3 天內截止或逾期未完成之項目
                  </p>
                </div>
              </div>

              {dueWithin3DaysTasks.length > 0 && (
                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  <span className="text-xs font-bold px-2.5 py-1 bg-amber-100/80 text-amber-900 rounded-lg border border-amber-200">
                    共 {dueWithin3DaysTasks.length} 項
                  </span>
                </div>
              )}
            </div>

            {/* Filter Toggle Pills */}
            {dueWithin3DaysTasks.length > 0 && (
              <div className="flex items-center gap-1.5 mb-4 p-1 bg-[#FAF7F2] border border-[#E9E3DB] rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setTaskFilter('all')}
                  className={cn(
                    "px-3 py-1 rounded-lg font-bold transition-all cursor-pointer",
                    taskFilter === 'all'
                      ? "bg-[#3D3833] text-white shadow-2xs"
                      : "text-[#8E877F] hover:text-[#3D3833]"
                  )}
                >
                  全部 ({dueWithin3DaysTasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter('assessments')}
                  className={cn(
                    "px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1",
                    taskFilter === 'assessments'
                      ? "bg-[#88968A] text-white shadow-2xs"
                      : "text-[#8E877F] hover:text-[#3D3833]"
                  )}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  評估/測驗 ({assessmentCount})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter('homework')}
                  className={cn(
                    "px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1",
                    taskFilter === 'homework'
                      ? "bg-[#88968A] text-white shadow-2xs"
                      : "text-[#8E877F] hover:text-[#3D3833]"
                  )}
                >
                  <FileText className="w-3.5 h-3.5" />
                  課業/工作紙 ({homeworkCount})
                </button>
              </div>
            )}

            {/* Task Cards List */}
            <div className="space-y-3">
              {displayedDueTasks.length > 0 ? (
                displayedDueTasks.map(task => {
                  const c = classes.find(c => c.id === task.classId);
                  const s = c?.subjects.find(sub => sub.id === task.subjectId);
                  const dueDate = parseISO(task.dueDate);
                  const diffDays = differenceInCalendarDays(startOfDay(dueDate), now);
                  const isOverdue = diffDays < 0;
                  const isDueToday = diffDays === 0;
                  const isDueTomorrow = diffDays === 1;
                  const isAssessment = isAssessmentTask(task.type, task.title);

                  // Urgency badge configuration
                  let dueBadge = {
                    text: `${diffDays} 天後截止`,
                    bg: 'bg-[#FAF7F2] text-[#5D554D] border-[#E9E3DB]'
                  };
                  if (isOverdue) {
                    dueBadge = {
                      text: `已逾期 ${Math.abs(diffDays)} 天`,
                      bg: 'bg-rose-50 text-rose-700 border-rose-200 font-bold'
                    };
                  } else if (isDueToday) {
                    dueBadge = {
                      text: '今日截止',
                      bg: 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                    };
                  } else if (isDueTomorrow) {
                    dueBadge = {
                      text: '明日截止 (1天後)',
                      bg: 'bg-amber-50 text-amber-800 border-amber-200 font-semibold'
                    };
                  } else if (diffDays === 2) {
                    dueBadge = {
                      text: '2 天後截止',
                      bg: 'bg-[#88968A]/15 text-[#3D3833] border-[#88968A]/30 font-semibold'
                    };
                  }

                  return (
                    <div 
                      key={task.id} 
                      onClick={onNavigateTasks}
                      className={cn(
                        "flex gap-3.5 items-center p-3 rounded-xl border transition-all cursor-pointer group",
                        isOverdue 
                          ? "bg-rose-50/40 border-rose-200/80 hover:bg-rose-50/80 hover:border-rose-300"
                          : isDueToday
                          ? "bg-amber-50/40 border-amber-200 hover:bg-amber-50/80 hover:border-amber-300"
                          : "bg-[#FAF7F2] border-[#E9E3DB] hover:bg-white hover:border-[#D9CEC1] hover:shadow-2xs"
                      )}
                    >
                      {/* Date Badge */}
                      <div className={cn(
                        "w-12 h-12 shrink-0 bg-white rounded-xl flex flex-col items-center justify-center border shadow-2xs",
                        isOverdue 
                          ? "border-rose-200 text-rose-700" 
                          : isDueToday 
                          ? "border-amber-300 text-amber-800" 
                          : "border-[#E9E3DB] text-[#3D3833]"
                      )}>
                        <span className="text-[10px] uppercase font-bold tracking-tight opacity-75">
                          {format(dueDate, 'M月')}
                        </span>
                        <span className="text-base font-bold leading-tight">
                          {format(dueDate, 'd日')}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span className={cn(
                            "px-2 py-0.5 text-[10px] rounded-md border",
                            dueBadge.bg
                          )}>
                            {dueBadge.text}
                          </span>

                          <span className={cn(
                            "px-2 py-0.5 text-[10px] rounded-md border font-semibold",
                            isAssessment 
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200" 
                              : "bg-white text-[#5D554D] border-[#E9E3DB]"
                          )}>
                            {taskTypeMap[task.type] || task.type}
                          </span>

                          {task.status === 'grading' && (
                            <span className="px-2 py-0.5 text-[10px] rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                              批改中
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-[#3D3833] truncate group-hover:text-[#88968A] transition-colors">
                          {task.title}
                        </h4>

                        <div className="text-xs text-[#8E877F] mt-0.5 flex items-center gap-1.5">
                          <span className="font-semibold text-[#5D554D]">{c?.name || '班級'}</span>
                          {s?.name && <span>• {s.name}</span>}
                          {task.maxScore && <span className="text-[11px]">• 滿分 {task.maxScore} 分</span>}
                        </div>
                      </div>

                      {/* Right Chevron */}
                      <div className="text-[#8E877F] group-hover:text-[#3D3833] group-hover:translate-x-0.5 transition-all shrink-0 pr-1">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-[#8E877F] flex flex-col items-center">
                  <div className="w-14 h-14 bg-[#F1EDE9] rounded-2xl flex items-center justify-center mb-3 border border-[#E9E3DB]">
                    <CheckCircle2 className="w-7 h-7 text-[#88968A]" />
                  </div>
                  <p className="font-semibold text-[#3D3833]">全部搞掂！</p>
                  <p className="text-xs mt-1">
                    {taskFilter !== 'all' 
                      ? '此分類下 3 日內暫無待辦項目。'
                      : '未來 3 天內暫無即將到期的評估或課業任務。'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Card Footer with Navigation link */}
          {onNavigateTasks && (
            <div className="mt-5 pt-3 border-t border-[#E9E3DB] flex items-center justify-between text-xs">
              <span className="text-[#8E877F]">在「任務與截止日期」管理完整清單</span>
              <button
                type="button"
                onClick={onNavigateTasks}
                className="font-bold text-[#88968A] hover:text-[#3D3833] inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>前往任務中心</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Syllabus Breakdown by Class */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E9E3DB] p-5 md:p-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#8E877F] mb-6">課程涵蓋率</h3>
          <div className="space-y-6">
            {classes.map((c, cIdx) => {
              return c.subjects.map((s, sIdx) => {
                const tTotal = s.syllabus.length;
                const tComp = s.syllabus.filter(t => t.completed).length;
                const pct = tTotal > 0 ? Math.round((tComp / tTotal) * 100) : 0;
                
                // Alternate colors for visual interest as per design
                const barColor = (cIdx + sIdx) % 2 === 0 ? "bg-[#88968A]" : "bg-[#C59B83]";
                const textColor = (cIdx + sIdx) % 2 === 0 ? "text-[#88968A]" : "text-[#C59B83]";

                return (
                  <div key={`${c.id}-${s.id}`} className="group">
                    <div className="flex justify-between items-end mb-1">
                      <div>
                        <span className="text-sm font-medium text-[#3D3833]">{s.name} ({c.name})</span>
                      </div>
                      <span className={cn("text-sm font-bold", textColor)}>{pct}%</span>
                    </div>
                    <div className="h-2 w-full bg-[#F1EDE9] rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-1000 ease-out", barColor)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              });
            })}
          </div>
        </div>
      </div>

      <div id="school-calendar-section" className="mt-6 md:mt-8 space-y-4">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-lg md:text-xl font-serif font-bold text-[#3D3833]">校曆表與活動日程</h3>
            <p className="text-sm text-[#8E877F] mt-0.5">檢視全校校園活動、學校假期與 7-Day 循環日排程</p>
          </div>
        </header>
        <CalendarWidget events={calendarEvents} setEvents={setCalendarEvents} />
      </div>
    </div>
  );
}
