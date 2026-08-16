import { ClassGroup, Task, CalendarEvent } from '../types';
import { format, isPast, isToday, parseISO } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { AlertCircle, Clock, CheckCircle2, BookOpen, CheckSquare, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '../utils';
import { CalendarWidget } from './CalendarWidget';

interface Props {
  classes: ClassGroup[];
  tasks: Task[];
  calendarEvents: CalendarEvent[];
  setCalendarEvents: (events: CalendarEvent[] | ((prev: CalendarEvent[]) => CalendarEvent[])) => void;
  onNavigateTasks?: () => void;
  onNavigateSyllabus?: () => void;
}

export function DashboardView({ classes, tasks, calendarEvents, setCalendarEvents, onNavigateTasks, onNavigateSyllabus }: Props) {
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

  // Filter Tasks
  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'overdue');
  const urgentTasks = pendingTasks.filter(t => {
    const due = parseISO(t.dueDate);
    return isPast(due) || isToday(due);
  });

  const todaysEvents = calendarEvents.filter(e => e.date === format(new Date(), 'yyyy-MM-dd'));
  const cycleDayEvent = todaysEvents.find(e => e.type === 'cycle');
  const otherEvents = todaysEvents.filter(e => e.type !== 'cycle');

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
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#8E877F] mb-2">待辦事項</h3>
              <h3 className="text-4xl font-bold text-[#3D3833] leading-tight">{pendingTasks.length}</h3>
            </div>
            <div className="p-3 bg-[#F9F6F2] text-[#C59B83] rounded-xl border border-[#E9E3DB] group-hover:scale-110 transition-transform">
              <CheckSquare className="w-6 h-6" />
            </div>
          </div>
          <div className="text-sm font-medium text-[#C59B83] flex items-center gap-1">
            {urgentTasks.length} 項即將到期 <ChevronRight className="w-4 h-4" />
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Urgent Tasks Panel */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E9E3DB] p-5 md:p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#8E877F]">即將到期</h3>
            {urgentTasks.length > 0 && (
              <span className="text-[10px] font-bold px-2 py-1 bg-[#F9F6F2] text-[#C59B83] rounded border border-[#E9E3DB]">
                {urgentTasks.length} 項待辦
              </span>
            )}
          </div>
          <div className="space-y-4">
            {urgentTasks.length > 0 ? urgentTasks.map(task => {
              const c = classes.find(c => c.id === task.classId);
              const isOverdue = task.status === 'overdue' || isPast(parseISO(task.dueDate));
              
              const taskTypeMap: Record<string, string> = {
                homework: '功課',
                exam: '考試',
                reminder: '提醒'
              };

              return (
                <div key={task.id} className="flex gap-4 items-start p-3 rounded-xl bg-[#F9F6F2] hover:bg-[#E9E3DB]/50 transition-colors">
                   <div className="w-12 h-12 shrink-0 bg-white rounded-lg flex flex-col items-center justify-center border border-[#E9E3DB]">
                     <span className={cn("text-[10px] uppercase font-bold", isOverdue ? "text-[#C59B83]" : "text-[#88968A]")}>
                       {format(parseISO(task.dueDate), 'M月')}
                     </span>
                     <span className="text-lg font-bold leading-tight text-[#3D3833]">
                       {format(parseISO(task.dueDate), 'd日')}
                     </span>
                   </div>
                   <div className="flex-1 overflow-hidden mt-0.5">
                     <h4 className="text-sm font-bold text-[#3D3833] truncate">{task.title}</h4>
                     <div className="text-xs text-[#8E877F] mt-0.5">
                       {c?.name} • {taskTypeMap[task.type] || task.type}
                     </div>
                   </div>
                </div>
              );
            }) : (
              <div className="text-center py-10 text-[#8E877F] flex flex-col items-center">
                <div className="w-16 h-16 bg-[#F1EDE9] rounded-2xl flex items-center justify-center mb-4 border border-[#E9E3DB]">
                  <CheckCircle2 className="w-8 h-8 text-[#88968A]" />
                </div>
                <p className="font-semibold text-[#3D3833]">全部完成！</p>
                <p className="text-sm mt-1">暫無即將到期的緊急任務。</p>
              </div>
            )}
          </div>
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

      <div className="mt-6 md:mt-8">
        <header className="mb-4">
          <h3 className="text-lg md:text-xl font-bold text-[#3D3833]">校曆表</h3>
          <p className="text-sm text-[#8E877F] mt-1">管理循環週與學校活動</p>
        </header>
        <CalendarWidget events={calendarEvents} setEvents={setCalendarEvents} />
      </div>
    </div>
  );
}
