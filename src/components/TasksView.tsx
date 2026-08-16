import { useState } from 'react';
import { Task, ClassGroup } from '../types';
import { format, parseISO } from 'date-fns';
import { CheckCircle2, Circle, Clock, Plus, Tag, BookOpen, X, Check, Trash2 } from 'lucide-react';
import { cn } from '../utils';
import { ConfirmModal } from './ConfirmModal';

interface Props {
  tasks: Task[];
  classes: ClassGroup[];
  toggleTask: (id: string) => void;
  addTask: (title: string, classId: string, subjectId: string, dueDate: string, type: string) => void;
  deleteTask: (id: string) => void;
}

export function TasksView({ tasks, classes, toggleTask, addTask, deleteTask }: Props) {
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskClass, setNewTaskClass] = useState('');
  const [newTaskSubject, setNewTaskSubject] = useState('');
  const [newTaskType, setNewTaskType] = useState('家課');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  const taskTypes = ['筆記檢查', '家課', '小測', '默書', '工作紙'];

  const handleAddTask = () => {
    if (newTaskTitle && newTaskClass && newTaskSubject && newTaskDueDate) {
      addTask(newTaskTitle, newTaskClass, newTaskSubject, newTaskDueDate, newTaskType);
      setAddingTask(false);
      setNewTaskTitle('');
      setNewTaskClass('');
      setNewTaskSubject('');
      setNewTaskDueDate('');
    }
  };

  const selectedClassSubjects = classes.find(c => c.id === newTaskClass)?.subjects || [];

  // Filter and sort tasks
  const filteredTasks = tasks.filter(t => selectedClassFilter === 'all' || t.classId === selectedClassFilter);
  
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const aVal = a.status === 'completed' ? 2 : a.status === 'grading' ? 1 : 0;
    const bVal = b.status === 'completed' ? 2 : b.status === 'grading' ? 1 : 0;
    if (aVal !== bVal) return aVal - bVal;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-4 md:mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#3D3833]">任務與截止日期</h2>
          <p className="text-sm md:text-base text-[#8E877F] mt-1">管理各班級的評估與功課進度。</p>
        </div>
        <button 
          onClick={() => setAddingTask(true)}
          className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-[#88968A] text-white rounded-full hover:opacity-90 transition-all font-medium text-sm shadow-sm hover:shadow-md"
        >
          <Plus className="w-4 h-4" />
          新增任務
        </button>
      </header>

      {/* Mobile Add Task Button */}
      <button 
        onClick={() => setAddingTask(true)}
        className="md:hidden w-full flex justify-center items-center gap-2 px-5 py-3.5 mb-2 bg-[#88968A] text-white rounded-full hover:opacity-90 transition-all font-medium text-sm shadow-sm active:scale-[0.98]"
      >
        <Plus className="w-5 h-5" />
        新增任務
      </button>

      {/* Class Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedClassFilter('all')}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-bold transition-all border",
            selectedClassFilter === 'all' 
              ? "bg-[#3D3833] text-white border-[#3D3833]" 
              : "bg-white text-[#8E877F] border-[#E9E3DB] hover:border-[#88968A] hover:text-[#88968A]"
          )}
        >
          全部班級
        </button>
        {classes.map(c => (
          <button
            key={c.id}
            onClick={() => setSelectedClassFilter(c.id)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-bold transition-all border",
              selectedClassFilter === c.id 
                ? "bg-[#88968A] text-white border-[#88968A]" 
                : "bg-white text-[#8E877F] border-[#E9E3DB] hover:border-[#88968A] hover:text-[#88968A]"
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      {addingTask && (
        <div className="bg-white p-6 rounded-xl border border-[#E9E3DB] shadow-sm mb-6 space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold text-[#3D3833]">新增任務資料</h3>
            <button onClick={() => setAddingTask(false)} className="text-[#8E877F] hover:text-[#3D3833]">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-[#8E877F] mb-1">任務名稱 (必填)</label>
              <input 
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                placeholder="例如: 歷史單元一工作紙"
                className="w-full bg-[#F9F6F2] border border-[#E9E3DB] px-4 py-2.5 rounded-lg text-[#3D3833] focus:outline-none focus:ring-2 focus:ring-[#88968A] text-sm"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-[#8E877F] mb-1">班級 (必填)</label>
              <select 
                value={newTaskClass}
                onChange={e => {
                  setNewTaskClass(e.target.value);
                  setNewTaskSubject(''); // reset subject when class changes
                }}
                className="w-full bg-[#F9F6F2] border border-[#E9E3DB] px-4 py-2.5 rounded-lg text-[#3D3833] focus:outline-none focus:ring-2 focus:ring-[#88968A] text-sm"
              >
                <option value="">選擇班級...</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-[#8E877F] mb-1">科目 (必填)</label>
              <select 
                value={newTaskSubject}
                onChange={e => setNewTaskSubject(e.target.value)}
                disabled={!newTaskClass}
                className="w-full bg-[#F9F6F2] border border-[#E9E3DB] px-4 py-2.5 rounded-lg text-[#3D3833] focus:outline-none focus:ring-2 focus:ring-[#88968A] text-sm disabled:opacity-50"
              >
                <option value="">選擇科目...</option>
                {selectedClassSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-[#8E877F] mb-1">評估類型</label>
              <select 
                value={newTaskType}
                onChange={e => setNewTaskType(e.target.value)}
                className="w-full bg-[#F9F6F2] border border-[#E9E3DB] px-4 py-2.5 rounded-lg text-[#3D3833] focus:outline-none focus:ring-2 focus:ring-[#88968A] text-sm"
              >
                {taskTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-[#8E877F] mb-1">截止日期 (必填)</label>
              <input 
                type="date"
                value={newTaskDueDate}
                onChange={e => setNewTaskDueDate(e.target.value)}
                className="w-full bg-[#F9F6F2] border border-[#E9E3DB] px-4 py-2.5 rounded-lg text-[#3D3833] focus:outline-none focus:ring-2 focus:ring-[#88968A] text-sm"
              />
            </div>
          </div>
          
          <div className="flex justify-end pt-2">
            <button 
              onClick={handleAddTask} 
              disabled={!newTaskTitle || !newTaskClass || !newTaskSubject || !newTaskDueDate}
              className="flex items-center gap-2 bg-[#88968A] text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" /> 新增任務
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3 md:space-y-4">
        {sortedTasks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-[#E9E3DB]">
            <p className="text-[#8E877F] font-medium">沒有找到任務</p>
          </div>
        ) : (
          sortedTasks.map(task => {
            const c = classes.find(c => c.id === task.classId);
            const subject = c?.subjects.find(s => s.id === task.subjectId);
            const isCompleted = task.status === 'completed';
            const isGrading = task.status === 'grading';
            const isOverdue = task.status === 'overdue';
            
            return (
              <div key={task.id} className={cn(
                "flex items-start gap-4 p-5 rounded-2xl border transition-all duration-300",
                isCompleted 
                  ? "bg-[#F9F6F2] border-[#E9E3DB] opacity-70" 
                  : isGrading
                  ? "bg-[#E9E3DB]/30 border-[#C59B83] shadow-sm"
                  : "bg-white border-[#E9E3DB] shadow-sm hover:shadow-md hover:border-[#D9CEC1]"
              )}>
                <button onClick={() => toggleTask(task.id)} className="mt-0.5 shrink-0 group">
                  {isCompleted ? (
                    <CheckCircle2 className="w-7 h-7 text-[#88968A]" />
                  ) : isGrading ? (
                    <CheckCircle2 className="w-7 h-7 text-[#C59B83]" />
                  ) : (
                    <Circle className="w-7 h-7 text-[#D9CEC1] group-hover:text-[#C59B83] transition-colors" />
                  )}
                </button>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2 mb-3">
                    <h4 className={cn(
                      "text-base md:text-lg font-bold truncate", 
                      isCompleted ? "text-[#8E877F] line-through" : "text-[#3D3833]"
                    )}>
                      {task.title}
                      {isGrading && <span className="ml-2 text-[10px] bg-[#C59B83] text-white px-2 py-0.5 rounded-full font-bold uppercase translate-y-[-2px] inline-block">等待成績</span>}
                    </h4>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold whitespace-nowrap bg-[#F9F6F2] px-3 py-1.5 rounded-lg border border-[#E9E3DB]">
                        <Clock className={cn("w-3.5 h-3.5", isOverdue && !isCompleted ? "text-[#C59B83]" : "text-[#8E877F]")} />
                        <span className={cn(isOverdue && !isCompleted ? "text-[#C59B83]" : "text-[#8E877F]")}>
                          {isOverdue && !isCompleted ? '已逾期：' : '截止：'}
                          {format(parseISO(task.dueDate), 'yyyy年M月d日')}
                        </span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          setTaskToDelete(task.id);
                        }}
                        className="text-[#8E877F] hover:text-[#C59B83] p-1.5 rounded-lg bg-white border border-[#E9E3DB] hover:border-[#C59B83] hover:bg-[#FDF8F5] transition-colors flex-shrink-0"
                        title="刪除任務"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#F1EDE9] text-[#4A443F]">
                      <BookOpen className="w-3.5 h-3.5" />
                      {c?.name}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E9E3DB] text-[#4A443F] border border-[#D9CEC1]">
                      {subject?.name}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-[#E9E3DB] text-[#8E877F] capitalize">
                      <Tag className="w-3 h-3" />
                      {task.type}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <ConfirmModal
        isOpen={taskToDelete !== null}
        title="確認刪除"
        message="確定要刪除這個任務嗎？刪除後無法復原。"
        onConfirm={() => {
          if (taskToDelete) {
            deleteTask(taskToDelete);
          }
        }}
        onCancel={() => setTaskToDelete(null)}
        confirmText="刪除"
      />
    </div>
  );
}
