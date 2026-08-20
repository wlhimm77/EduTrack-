import { useState, useEffect } from 'react';
import { Task, ClassGroup, StudentGrade } from '../types';
import { Check, ChevronRight, Save, ClipboardEdit, Loader2, FileSpreadsheet, ExternalLink } from 'lucide-react';
import { cn } from '../utils';
import { exportSingleTaskSheet } from '../lib/googleSheets';

interface Props {
  tasks: Task[];
  classes: ClassGroup[];
  updateTaskGrades: (taskId: string, maxScore: number, grades: StudentGrade[], complete?: boolean) => void;
}

export function GradingView({ tasks, classes, updateTaskGrades }: Props) {
  const gradingTasks = tasks.filter(t => t.status === 'grading');
  const completedGradingTasks = tasks.filter(t => t.status === 'completed' && t.grades && t.grades.length > 0);
  const allDisplayTasks = [...gradingTasks, ...completedGradingTasks];
  
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportedUrl, setExportedUrl] = useState<string | null>(null);

  const selectedTask = allDisplayTasks.find(t => t.id === selectedTaskId);
  const taskClass = selectedTask ? classes.find(c => c.id === selectedTask.classId) : null;
  const taskSubject = (taskClass && selectedTask) ? taskClass.subjects.find(s => s.id === selectedTask.subjectId) : null;

  const [maxScore, setMaxScore] = useState<number | ''>('');
  const [grades, setGrades] = useState<StudentGrade[]>([]);

  // Auto-save when grades or maxScore changes
  useEffect(() => {
    if (selectedTaskId && typeof maxScore === 'number') {
      updateTaskGrades(selectedTaskId, maxScore, grades, false);
    }
  }, [grades, maxScore]); // Intentionally excluding selectedTaskId to only fire on grade/score changes

  // When selecting a task, initialize grades
  const handleSelectTask = (task: Task, cls?: ClassGroup) => {
    setSelectedTaskId(task.id);
    setMaxScore(task.maxScore || '');
    setExportedUrl(null);
    
    if (task.grades && task.grades.length > 0) {
      setGrades(task.grades);
    } else {
      const size = cls?.size || 30; // default 30 students
      const initialGrades: StudentGrade[] = [];
      for (let i = 1; i <= size; i++) {
        initialGrades.push({
          studentNumber: i.toString().padStart(2, '0'),
          score: null,
          missing: false
        });
      }
      setGrades(initialGrades);
    }
  };

  const handleUpdateGrade = (studentNumber: string, field: 'score' | 'missing', value: any) => {
    setGrades(prev => prev.map(g => {
      if (g.studentNumber !== studentNumber) return g;
      return { ...g, [field]: value };
    }));
  };

  const handleSave = async (complete: boolean) => {
    if (selectedTaskId && typeof maxScore === 'number') {
      await updateTaskGrades(selectedTaskId, maxScore, grades, complete);
      if (complete) {
        setSelectedTaskId(null);
      }
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 h-full flex flex-col">
      <header className="flex flex-col mb-4">
        <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#3D3833]">成績輸入</h2>
        <p className="text-sm md:text-base text-[#8E877F] mt-1">為已完成批改的評估及任務輸入成績。</p>
      </header>

      {allDisplayTasks.length === 0 ? (
        <div className="flex-1 flex items-center justify-center bg-white rounded-2xl border border-[#E9E3DB]">
          <p className="text-[#8E877F] font-medium">目前沒有等待輸入或已完成的成績紀錄</p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 overflow-hidden">
          {/* Task List Sidebar */}
          <div className="w-full lg:w-1/3 flex flex-col gap-6 overflow-y-auto pr-2">
            {classes.map(cls => {
              // Get tasks for this class
              const classTasks = allDisplayTasks.filter(t => t.classId === cls.id);
              if (classTasks.length === 0) return null;

              return (
                <div key={cls.id} className="flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-[#3D3833] border-b border-[#E9E3DB] pb-2 sticky top-0 bg-[#F9F6F2] z-10">
                    {cls.name}
                  </h3>
                  
                  {cls.subjects.map(subject => {
                    const subjectTasks = classTasks.filter(t => t.subjectId === subject.id);
                    if (subjectTasks.length === 0) return null;

                    const grading = subjectTasks.filter(t => t.status === 'grading');
                    const completed = subjectTasks.filter(t => t.status === 'completed');

                    return (
                      <div key={subject.id} className="ml-2 flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "bg-blue-100" }}></div>
                          <h4 className="text-xs font-bold text-[#8E877F]">{subject.name}</h4>
                        </div>
                        
                        <div className="flex flex-col gap-2 pl-4 border-l-2 border-[#E9E3DB]/50">
                          {grading.map(task => {
                            const isSelected = selectedTaskId === task.id;
                            return (
                              <button
                                key={task.id}
                                onClick={() => handleSelectTask(task, cls)}
                                className={cn(
                                  "flex flex-col text-left p-3 rounded-lg border transition-all text-sm",
                                  isSelected 
                                    ? "bg-[#3D3833] border-[#3D3833] text-white shadow-md" 
                                    : "bg-white border-[#E9E3DB] hover:border-[#88968A] text-[#3D3833]"
                                )}
                              >
                                <span className="font-bold mb-1 truncate w-full">{task.title}</span>
                                <div className="flex justify-between items-center w-full mt-1">
                                  <span className={cn(
                                    "text-[10px] uppercase font-bold px-2 py-0.5 rounded",
                                    isSelected ? "bg-white/20" : "bg-[#F9F6F2] text-[#8E877F]"
                                  )}>
                                    待輸入成績
                                  </span>
                                  <ChevronRight size={14} className={isSelected ? "text-white" : "text-[#D9CEC1]"} />
                                </div>
                              </button>
                            );
                          })}

                          {completed.map(task => {
                            const isSelected = selectedTaskId === task.id;
                            return (
                              <button
                                key={task.id}
                                onClick={() => handleSelectTask(task, cls)}
                                className={cn(
                                  "flex flex-col text-left p-3 rounded-lg border transition-all text-sm",
                                  isSelected 
                                    ? "bg-[#88968A] border-[#88968A] text-white shadow-md" 
                                    : "bg-[#F9F6F2] border-[#E9E3DB] hover:border-[#88968A] text-[#3D3833] opacity-70 hover:opacity-100"
                                )}
                              >
                                <span className="font-bold mb-1 truncate w-full">{task.title}</span>
                                <div className="flex justify-between items-center w-full mt-1">
                                  <span className={cn(
                                    "text-[10px] uppercase font-bold px-2 py-0.5 rounded",
                                    isSelected ? "bg-white/20" : "bg-white text-[#88968A] border border-[#E9E3DB]"
                                  )}>
                                    已儲存
                                  </span>
                                  <ChevronRight size={14} className={isSelected ? "text-white" : "text-[#D9CEC1]"} />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Grading Area */}
          <div className="w-full lg:w-2/3 flex flex-col bg-white rounded-2xl border border-[#E9E3DB] shadow-sm overflow-hidden">
            {selectedTaskId && selectedTask ? (
              <>
                <div className="p-6 border-b border-[#E9E3DB] bg-[#F9F6F2] shrink-0">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-[#3D3833] mb-2">{selectedTask.title}</h3>
                      <div className="flex gap-2 text-sm text-[#4A443F]">
                        <span className="font-bold">{taskClass?.name}</span>
                        <span>•</span>
                        <span>{taskSubject?.name}</span>
                        <span>•</span>
                        <span>{selectedTask.type}</span>
                      </div>
                    </div>
                    
                    <div className="bg-white p-3 rounded-xl border border-[#E9E3DB] flex items-center gap-3 shadow-sm">
                      <label className="text-sm font-bold text-[#8E877F] whitespace-nowrap">最高分數</label>
                      <input
                        type="number"
                        min="1"
                        value={maxScore}
                        onChange={e => setMaxScore(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-20 bg-[#F9F6F2] border border-[#E9E3DB] px-3 py-1.5 rounded-lg text-[#3D3833] text-center font-bold focus:outline-none focus:ring-2 focus:ring-[#88968A]"
                        placeholder="100"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {grades.map(grade => (
                      <div 
                        key={grade.studentNumber} 
                        className={cn(
                          "flex flex-col p-3 rounded-xl border transition-colors",
                          grade.missing ? "bg-red-50 border-red-200" : "bg-[#F9F6F2] border-[#E9E3DB]"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                           <span className={cn(
                            "text-sm font-bold",
                            grade.missing ? "text-red-600" : "text-[#4A443F]"
                          )}>
                            {grade.studentNumber}
                          </span>
                          <label className="flex items-center gap-1.5 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={grade.missing}
                              onChange={e => handleUpdateGrade(grade.studentNumber, 'missing', e.target.checked)}
                              className="w-3.5 h-3.5 rounded text-red-500 focus:ring-red-500 border-gray-300"
                            />
                            <span className="text-[10px] text-[#8E877F] group-hover:text-red-500 transition-colors">欠交</span>
                          </label>
                        </div>
                        <input
                          type="number"
                          min="0"
                          max={maxScore || undefined}
                          value={grade.score === null ? '' : grade.score}
                          onChange={e => handleUpdateGrade(grade.studentNumber, 'score', e.target.value === '' ? null : Number(e.target.value))}
                          disabled={grade.missing}
                          placeholder={grade.missing ? '---' : '成績'}
                          className={cn(
                            "w-full bg-white border px-3 py-1.5 rounded-lg text-center font-medium focus:outline-none focus:ring-2 focus:ring-[#88968A]",
                            grade.missing ? "border-red-200 text-red-400 opacity-60" : "border-[#E9E3DB] text-[#3D3833]"
                          )}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 border-t border-[#E9E3DB] bg-white flex justify-end items-center gap-3 shrink-0">
                  <span className="text-sm font-medium text-[#8E877F] mr-auto pl-2 flex items-center gap-1.5">
                    <Check size={14} /> 已自動儲存
                  </span>
                  <button 
                    onClick={() => handleSave(true)}
                    disabled={maxScore === ''}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#88968A] hover:bg-[#78857a] text-white rounded-lg transition-all font-medium text-sm shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    <Check size={16} />
                    <span>完成並儲存</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-center text-[#8E877F]">
                <div>
                  <ClipboardEdit size={48} className="mx-auto mb-4 opacity-20" />
                  <p>請在左側選擇一個任務來輸入成績</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
