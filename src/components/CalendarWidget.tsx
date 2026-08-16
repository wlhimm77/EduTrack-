import { useState } from 'react';
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
  subDays
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, X, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import { cn } from '../utils';
import { ConfirmModal } from './ConfirmModal';

interface Props {
  events: CalendarEvent[];
  setEvents: (events: CalendarEvent[] | ((prev: CalendarEvent[]) => CalendarEvent[])) => void;
}

export function CalendarWidget({ events, setEvents }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventType, setNewEventType] = useState<'cycle' | 'activity' | 'holiday'>('activity');
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);

  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const onAddEvent = () => {
    if (!newEventTitle.trim()) return;
    
    if (editingEventId) {
      setEvents((prev: CalendarEvent[]) => prev.map(e => e.id === editingEventId ? {
        ...e,
        title: newEventTitle,
        type: newEventType,
        description: newEventDescription
      } : e));
      setEditingEventId(null);
    } else {
      const newEvent: CalendarEvent = {
        id: `cal-${Date.now()}`,
        date: format(selectedDate, 'yyyy-MM-dd'),
        title: newEventTitle,
        type: newEventType,
        description: newEventDescription
      };
      setEvents((prev: CalendarEvent[]) => [...prev, newEvent]);
    }
    
    setNewEventTitle('');
    setNewEventDescription('');
    setIsAddingMode(false);
  };

  const onEditEvent = (event: CalendarEvent) => {
    setEditingEventId(event.id);
    setNewEventTitle(event.title);
    setNewEventType(event.type);
    setNewEventDescription(event.description || '');
    setIsAddingMode(true);
  };

  const onDeleteEvent = (id: string) => {
    setEvents((prev: CalendarEvent[]) => prev.filter(e => e.id !== id));
  };

  // Calendar rendering logic
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dateFormat = "d";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const eventsForSelectedDay = events.filter(e => e.date === format(selectedDate, 'yyyy-MM-dd'));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#E9E3DB] overflow-hidden flex flex-col md:flex-row h-full">
      {/* Calendar Grid */}
      <div className="flex-1 p-5 md:p-6 border-b md:border-b-0 md:border-r border-[#E9E3DB]">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[#3D3833] text-lg flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-[#88968A]" />
              {format(currentMonth, 'yyyy年 M月')}
            </h3>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-1.5 hover:bg-[#F9F6F2] rounded-lg transition-colors text-[#8E877F]"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-1.5 hover:bg-[#F9F6F2] rounded-lg transition-colors text-[#8E877F]"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="px-2">
            <input 
              type="range" 
              min="0" 
              max="11" 
              value={currentMonth.getMonth()} 
              onChange={(e) => {
                const newMonth = new Date(currentMonth);
                newMonth.setMonth(parseInt(e.target.value));
                setCurrentMonth(newMonth);
              }}
              className="w-full h-1 bg-[#E9E3DB] rounded-lg appearance-none cursor-pointer accent-[#88968A]"
            />
            <div className="flex justify-between text-[10px] text-[#8E877F] mt-1 font-bold px-1">
              <span>1月</span>
              <span>12月</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {['日', '一', '二', '三', '四', '五', '六'].map(day => (
            <div key={day} className="text-center text-xs font-bold text-[#8E877F] py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const dayEvents = events.filter(e => e.date === dayStr);
            const cycleEvent = dayEvents.find(e => e.type === 'cycle');
            
            // To render continuous blocks, we just stack them. But since we use CSS grid per cell,
            // we will render tiny strips that span the cell width.
            const renderEventStrips = () => {
              const otherEvents = dayEvents.filter(e => e.type !== 'cycle');
              return otherEvents.map(event => {
                const isHoliday = event.type === 'holiday';
                
                const prevDayStr = format(subDays(day, 1), 'yyyy-MM-dd');
                const nextDayStr = format(addDays(day, 1), 'yyyy-MM-dd');
                
                const hasPrev = events.some(e => e.date === prevDayStr && e.title === event.title);
                const hasNext = events.some(e => e.date === nextDayStr && e.title === event.title);
                
                const isSingleDay = !hasPrev && !hasNext;

                return (
                  <div 
                    key={event.id}
                    title={event.title}
                    className={cn(
                      "h-1.5 shrink-0 text-[0px]",
                      isSingleDay ? "w-[50%] mx-auto rounded-full" : "w-[120%] -ml-[10%]",
                      isHoliday ? "bg-[#8BC34A]" : "bg-[#C59B83]"
                    )}
                  />
                );
              });
            };

            return (
              <div 
                key={day.toString()} 
                onClick={() => {
                  setSelectedDate(day);
                  setIsAddingMode(false);
                }}
                className={cn(
                  "min-h-[60px] p-1 flex flex-col items-center justify-start cursor-pointer transition-all border",
                  !isSameMonth(day, monthStart) ? "text-[#D9CEC1] border-transparent" : 
                    isSameDay(day, selectedDate) ? "bg-[#88968A] text-white border-[#88968A] shadow-md z-10 rounded-xl" : 
                    "text-[#3D3833] border-transparent hover:border-[#E9E3DB] hover:bg-[#F9F6F2] rounded-xl",
                )}
              >
                <div className="flex flex-col items-center w-full">
                  <span className={cn(
                    "text-sm font-medium mt-1 w-6 h-6 flex items-center justify-center rounded-full",
                    isSameDay(day, new Date()) && !isSameDay(day, selectedDate) ? "bg-[#C59B83] text-white" : ""
                  )}>
                    {format(day, dateFormat)}
                  </span>
                  {cycleEvent && (
                    <span className={cn(
                      "text-[9px] font-bold uppercase mt-0.5",
                      isSameDay(day, selectedDate) ? "text-white" : "text-[#88968A]"
                    )}>
                      ({cycleEvent.title.replace('Day ', '')})
                    </span>
                  )}
                </div>
                
                <div className="flex flex-col gap-0.5 mt-auto w-full mb-1">
                  {renderEventStrips()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day Details */}
      <div className="w-full md:w-64 bg-[#F9F6F2] p-5 md:p-6 flex flex-col">
        <h4 className="font-bold text-[#3D3833] mb-4">
          {format(selectedDate, 'M月d日')} 事件
        </h4>
        
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4">
          {eventsForSelectedDay.length > 0 ? (
            eventsForSelectedDay.map(event => (
              <div key={event.id} className="bg-white p-3 rounded-xl border border-[#E9E3DB] shadow-sm relative group cursor-pointer hover:border-[#D9CEC1]" onClick={() => onEditEvent(event)}>
                <div className="flex items-start gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full mt-1.5 shrink-0",
                    event.type === 'cycle' ? "bg-[#88968A]" : 
                    event.type === 'holiday' ? "bg-red-400" : "bg-[#C59B83]"
                  )} />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-[#3D3833]">{event.title}</p>
                    <p className="text-xs text-[#8E877F] uppercase tracking-wider mt-0.5">
                      {event.type === 'cycle' ? '循環週' : event.type === 'holiday' ? '假期' : '活動'}
                    </p>
                    {event.description && (
                      <p className="text-xs text-[#8E877F] mt-1 line-clamp-2">{event.description}</p>
                    )}
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setEventToDelete(event.id);
                    }}
                    className="p-1 text-[#D9CEC1] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-[#8E877F] text-center py-4">這天沒有安排事件</p>
          )}
        </div>

        {isAddingMode ? (
          <div className="bg-white p-3 rounded-xl border border-[#E9E3DB] shadow-sm">
            <input 
              autoFocus
              value={newEventTitle}
              onChange={(e) => setNewEventTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onAddEvent()}
              placeholder="事件名稱..."
              className="w-full text-sm p-2 bg-[#F9F6F2] rounded-lg border-none focus:ring-1 focus:ring-[#88968A] mb-2"
            />
            <input 
              value={newEventDescription}
              onChange={(e) => setNewEventDescription(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onAddEvent()}
              placeholder="備注 (選填)..."
              className="w-full text-sm p-2 bg-[#F9F6F2] rounded-lg border-none focus:ring-1 focus:ring-[#88968A] mb-2"
            />
            <select 
              value={newEventType}
              onChange={(e) => setNewEventType(e.target.value as any)}
              className="w-full text-sm p-2 bg-[#F9F6F2] rounded-lg border-none focus:ring-1 focus:ring-[#88968A] mb-3"
            >
              <option value="activity">活動</option>
              <option value="cycle">循環週 (Day A/B)</option>
              <option value="holiday">假期</option>
            </select>
            <div className="flex gap-2">
              <button 
                onClick={onAddEvent}
                className="flex-1 bg-[#88968A] text-white py-1.5 rounded-lg text-sm font-bold hover:bg-opacity-90"
              >
                {editingEventId ? '儲存' : '新增'}
              </button>
              <button 
                onClick={() => {
                  setIsAddingMode(false);
                  setEditingEventId(null);
                  setNewEventTitle('');
                  setNewEventDescription('');
                }}
                className="p-1.5 text-[#8E877F] hover:bg-[#F9F6F2] rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setIsAddingMode(true)}
            className="flex items-center justify-center gap-2 w-full py-2 border border-dashed border-[#C59B83] text-[#C59B83] rounded-xl hover:bg-[#FDF8F5] transition-colors text-sm font-bold"
          >
            <Plus className="w-4 h-4" /> 加入事件
          </button>
        )}
      </div>

      <ConfirmModal
        isOpen={eventToDelete !== null}
        title="確認刪除事件"
        message="確定要刪除這個事件嗎？刪除後無法復原。"
        onConfirm={() => {
          if (eventToDelete) {
            onDeleteEvent(eventToDelete);
          }
        }}
        onCancel={() => setEventToDelete(null)}
        confirmText="刪除"
      />
    </div>
  );
}
