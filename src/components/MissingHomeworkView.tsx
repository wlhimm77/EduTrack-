import { useState } from 'react';
import { ClassGroup, Task } from '../types';
import { AlertCircle, Search, ExternalLink, UserX } from 'lucide-react';
import { cn } from '../utils';

interface MissingHomeworkViewProps {
  classes: ClassGroup[];
  tasks: Task[];
  updateTaskGrades: (taskId: string, maxScore: number, grades: any[], complete?: boolean) => void;
  setActiveTab: (tab: string) => void;
}

export function MissingHomeworkView({ classes, tasks, updateTaskGrades, setActiveTab }: MissingHomeworkViewProps) {
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filter classes
  const targetClasses = selectedClassId === 'all' 
    ? classes 
    : classes.filter(c => c.id === selectedClassId);

  // Helper to get missing or absent students for a task
  const getMissingOrAbsentForTask = (task: Task) => {
    if (!task.grades || task.grades.length === 0) return [];
    return task.grades.filter(g => g.missing || g.absent);
  };

  // Toggle individual student missing status
  const handleToggleMissing = (task: Task, studentNum: string) => {
    if (!task.grades) return;
    const updatedGrades = task.grades.map(g => {
      if (g.studentNumber === studentNum) {
        return { ...g, missing: !g.missing };
      }
      return g;
    });
    updateTaskGrades(task.id, task.maxScore || 100, updatedGrades, task.status === 'completed');
  };

  // Toggle individual student absent status
  const handleToggleAbsent = (task: Task, studentNum: string) => {
    if (!task.grades) return;
    const updatedGrades = task.grades.map(g => {
      if (g.studentNumber === studentNum) {
        return { ...g, absent: !g.absent };
      }
      return g;
    });
    updateTaskGrades(task.id, task.maxScore || 100, updatedGrades, task.status === 'completed');
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-4 md:mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#3D3833]">欠交功課總覽</h2>
          <p className="text-sm md:text-base text-[#8E877F] mt-1">按班級與科目檢視學生未交功課及評估名單（點擊學生編號的 × 可快速標記為已交）。</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E877F]" />
            <input
              type="text"
              placeholder="搜尋學生編號/功課..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-white border border-[#E9E3DB] pl-9 pr-4 py-2 rounded-xl text-sm text-[#3D3833] focus:outline-none focus:ring-2 focus:ring-[#88968A] shadow-2xs"
            />
          </div>
        </div>
      </header>

      {/* Class Filter Tabs */}
      <div className="flex gap-2 border-b border-[#E9E3DB] mb-6 overflow-x-auto pb-px scrollbar-hide">
        <button
          onClick={() => setSelectedClassId('all')}
          className={cn(
            "px-4 py-2.5 text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer",
            selectedClassId === 'all'
              ? "border-[#88968A] text-[#3D3833]"
              : "border-transparent text-[#8E877F] hover:text-[#4A443F]"
          )}
        >
          全部班級 ({classes.length})
        </button>
        {classes.map(c => (
          <button
            key={c.id}
            onClick={() => setSelectedClassId(c.id)}
            className={cn(
              "px-4 py-2.5 text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer",
              selectedClassId === c.id
                ? "border-[#88968A] text-[#3D3833]"
                : "border-transparent text-[#8E877F] hover:text-[#4A443F]"
            )}
          >
            {c.name} {c.form ? `(${c.form})` : ''}
          </button>
        ))}
      </div>

      {/* Main Content grouped by Class */}
      <div className="space-y-6">
        {targetClasses.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-[#D9CEC1]">
            <p className="text-[#8E877F]">暫無班級資料。</p>
          </div>
        ) : (
          targetClasses.map(cls => {
            const classTasks = tasks.filter(t => t.classId === cls.id);
            let totalMissingCount = 0;
            const taskMissingMap: { task: Task; missingStudents: { studentNumber: string; score: number | null; missing: boolean }[] }[] = [];

            classTasks.forEach(t => {
              const relevantStudents = getMissingOrAbsentForTask(t).filter(g => {
                if (!searchQuery.trim()) return true;
                return g.studentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       t.title.toLowerCase().includes(searchQuery.toLowerCase());
              });
              if (relevantStudents.length > 0) {
                totalMissingCount += relevantStudents.length;
                taskMissingMap.push({ task: t, missingStudents: relevantStudents });
              }
            });

            return (
              <div key={cls.id} className="bg-white rounded-2xl shadow-sm border border-[#E9E3DB] overflow-hidden">
                {/* Class Header */}
                <div className="bg-[#F9F6F2] border-b border-[#E9E3DB] px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#88968A]/10 text-[#88968A] flex items-center justify-center font-bold">
                      {cls.name}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#3D3833] flex items-center gap-2">
                        {cls.name} 欠交統計
                        {cls.form && <span className="text-xs px-2 py-0.5 bg-white border border-[#E9E3DB] rounded text-[#88968A]">{cls.form}</span>}
                      </h3>
                      <p className="text-xs text-[#8E877F]">
                        {cls.subjects.length} 個科目 · 學生人數: {cls.size || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5",
                      totalMissingCount > 0 ? "bg-red-50 text-red-600 border border-red-200" : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                    )}>
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{totalMissingCount > 0 ? `共有 ${totalMissingCount} 項欠交紀錄` : '全班無欠交紀錄'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('grading')}
                      className="text-xs text-[#88968A] hover:text-[#3D3833] font-medium flex items-center gap-1 bg-white border border-[#E9E3DB] px-3 py-1.5 rounded-lg shadow-2xs cursor-pointer"
                    >
                      前往成績輸入 <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  {taskMissingMap.length === 0 ? (
                    <div className="text-center py-8 text-[#8E877F] text-sm italic">
                      此班級目前沒有符合條件的欠交作業。
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {taskMissingMap.map(({ task, missingStudents }) => {
                        const subjectObj = cls.subjects.find(s => s.id === task.subjectId);
                        const subjectName = subjectObj ? subjectObj.name : task.subjectId;

                        return (
                          <div key={task.id} className="bg-[#FAF7F2] border border-[#E9E3DB] rounded-xl p-4 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-white border border-[#E9E3DB] text-[#88968A] rounded">
                                  {subjectName}
                                </span>
                                <span className="text-[11px] text-[#8E877F]">
                                  截止: {task.dueDate}
                                </span>
                              </div>
                              <h4 className="font-bold text-[#3D3833] text-sm mb-3 line-clamp-2" title={task.title}>
                                {task.title} <span className="text-xs font-normal text-[#8E877F]">({task.type})</span>
                              </h4>

                              <div className="space-y-1.5 mb-4">
                                <p className="text-xs font-bold text-[#3D3833] flex items-center gap-1 mb-1">
                                  <UserX className="w-3.5 h-3.5 text-[#88968A]" /> 需關注學生名單 ({missingStudents.length}人):
                                </p>
                                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                                  {missingStudents.map((student: any) => {
                                    const isAbsent = student.absent;
                                    const isMissing = student.missing;
                                    return (
                                      <div 
                                        key={student.studentNumber}
                                        className={cn(
                                          "group relative flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium shadow-2xs border",
                                          isAbsent 
                                            ? "bg-blue-50 border-blue-200 text-blue-700" 
                                            : "bg-white border-red-200 text-red-700"
                                        )}
                                      >
                                        <span>{student.studentNumber} {isAbsent ? '(缺席)' : ''}</span>
                                        <button
                                          type="button"
                                          onClick={() => isAbsent ? handleToggleAbsent(task, student.studentNumber) : handleToggleMissing(task, student.studentNumber)}
                                          title={isAbsent ? "點擊取消缺席" : "點擊標記為已交"}
                                          className={cn(
                                            "w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors cursor-pointer ml-1",
                                            isAbsent
                                              ? "bg-blue-100 hover:bg-emerald-100 text-blue-600 hover:text-emerald-700"
                                              : "bg-red-100 hover:bg-emerald-100 text-red-600 hover:text-emerald-700"
                                          )}
                                        >
                                          ×
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            <div className="pt-3 border-t border-[#E9E3DB] flex items-center justify-between text-xs text-[#8E877F]">
                              <span>需關注人數: <span className="font-bold text-[#3D3833]">{missingStudents.length} 人</span></span>
                              <button
                                type="button"
                                onClick={() => setActiveTab('grading')}
                                className="text-[#88968A] hover:underline font-medium cursor-pointer"
                              >
                                去評分頁面
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
