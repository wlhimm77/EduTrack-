import { Task, ClassGroup } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Trophy, Users, Save, Loader2, ExternalLink, FileSpreadsheet } from 'lucide-react';
import { useState, useMemo } from 'react';
import { cn } from '../utils';
import { exportComprehensiveAssessmentSheet } from '../lib/googleSheets';

interface Props {
  tasks: Task[];
  classes: ClassGroup[];
}

export function PerformanceView({ tasks, classes }: Props) {
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const selectedClass = classes.find(c => c.id === selectedClassId);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(selectedClass?.subjects[0]?.id || '');

  // Reset subject when class changes
  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    const cls = classes.find(c => c.id === classId);
    if (cls && cls.subjects.length > 0) {
      setSelectedSubjectId(cls.subjects[0].id);
    } else {
      setSelectedSubjectId('');
    }
  };

  const [isSaving, setIsSaving] = useState(false);
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);

  const currentSubject = selectedClass?.subjects.find(s => s.id === selectedSubjectId);

  // Relevant tasks for this class & subject
  const subjectTasks = useMemo(() => {
    if (!selectedClass || !selectedSubjectId) return [];
    return tasks.filter(t => t.classId === selectedClassId && t.subjectId === selectedSubjectId);
  }, [tasks, selectedClassId, selectedSubjectId, selectedClass]);

  const data = useMemo(() => {
    if (!selectedClass || !selectedSubjectId) return [];

    const completedTasks = subjectTasks.filter(t => t.status === 'completed' && t.maxScore);

    const size = selectedClass.size || 30;
    const studentStats = Array.from({ length: size }, (_, i) => {
      return {
        studentNumber: (i + 1).toString().padStart(2, '0'),
        totalPercent: 0,
        taskCount: 0,
        scoresHistory: [] as number[],
        score: 0,
        trend: 'stable' as 'up' | 'down' | 'stable'
      };
    });

    completedTasks.forEach(task => {
      task.grades?.forEach(g => {
        if (!g.missing && g.score !== null && g.score !== undefined) {
          const stat = studentStats.find(s => s.studentNumber === g.studentNumber);
          if (stat && task.maxScore) {
            const percent = (Number(g.score) / task.maxScore) * 100;
            stat.totalPercent += percent;
            stat.taskCount += 1;
            stat.scoresHistory.push(percent);
          }
        }
      });
    });

    return studentStats.map(stat => {
      const avg = stat.taskCount > 0 ? Math.round(stat.totalPercent / stat.taskCount) : 0;
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (stat.scoresHistory.length >= 2) {
        const diff = stat.scoresHistory[stat.scoresHistory.length - 1] - stat.scoresHistory[0];
        if (diff >= 5) trend = 'up';
        else if (diff <= -5) trend = 'down';
      } else if (stat.taskCount > 0) {
        trend = avg >= 80 ? 'up' : avg < 50 ? 'down' : 'stable';
      }

      return {
        studentNumber: stat.studentNumber,
        score: avg,
        taskCount: stat.taskCount,
        trend
      };
    }).filter(s => s.score > 0 || s.taskCount > 0);
  }, [subjectTasks, selectedClassId, selectedSubjectId, selectedClass]);

  const classAvg = data.length > 0 
    ? Math.round(data.reduce((acc, curr) => acc + curr.score, 0) / data.length)
    : 0;

  const topScore = data.length > 0
    ? Math.max(...data.map(d => d.score))
    : 0;

  const handleExportToSheets = async () => {
    if (!selectedClass || !currentSubject) return;
    try {
      setIsSaving(true);
      setSheetUrl(null);
      const url = await exportComprehensiveAssessmentSheet({
        classGroup: selectedClass,
        subjectName: currentSubject.name,
        tasks
      });
      setSheetUrl(url);
    } catch (error: any) {
      console.error('Failed to save to Google Sheets:', error);
      const errMsg = error?.message || (typeof error === 'string' ? error : '未知錯誤');
      alert(`匯出至 Google Sheets 失敗：${errMsg}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (classes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white rounded-2xl border border-[#E9E3DB] p-8">
        <p className="text-[#8E877F] font-medium">請先在課程進度中新增班級</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <header className="mb-4 md:mb-8">
        <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#3D3833]">學生表現</h2>
        <p className="text-sm md:text-base text-[#8E877F] mt-1">分析各科評估平均分數，追蹤學業趨勢並找出學生需求。</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-6">
        <div className="bg-[#88968A] rounded-2xl p-6 text-white flex justify-between items-center shadow-lg">
          <div>
            <p className="text-white/80 font-medium text-sm mb-1 uppercase tracking-widest text-xs">班級平均分</p>
            <h3 className="text-4xl font-bold">{classAvg}%</h3>
          </div>
          <div className="p-4 bg-white/20 rounded-xl backdrop-blur-md">
            <Users className="w-8 h-8 text-white" />
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-[#E9E3DB] shadow-sm flex justify-between items-center">
          <div>
            <p className="text-[#8E877F] font-bold text-xs uppercase tracking-widest mb-1">最高分</p>
            <h3 className="text-4xl font-bold text-[#3D3833]">{topScore}%</h3>
          </div>
          <div className="p-4 bg-[#F9F6F2] rounded-xl border border-[#E9E3DB]">
            <Trophy className="w-8 h-8 text-[#C59B83]" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#E9E3DB] p-6 md:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#8E877F]">學生表現追蹤</h3>
          
          <div className="flex gap-3">
            <div className="relative">
              <select
                value={selectedClassId}
                onChange={(e) => handleClassChange(e.target.value)}
                className="appearance-none bg-[#F9F6F2] border border-[#E9E3DB] text-[#4A443F] text-xs font-medium rounded-lg focus:ring-2 focus:ring-[#D9CEC1] block py-2 pl-3 pr-8 cursor-pointer outline-none"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            
            <div className="relative">
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="appearance-none bg-[#F9F6F2] border border-[#E9E3DB] text-[#4A443F] text-xs font-medium rounded-lg focus:ring-2 focus:ring-[#D9CEC1] block py-2 pl-3 pr-8 cursor-pointer outline-none"
              >
                {selectedClass?.subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {data.length === 0 ? (
          <div className="h-80 w-full mb-8 flex items-center justify-center border-2 border-dashed border-[#E9E3DB] rounded-xl bg-[#F9F6F2]">
            <p className="text-[#8E877F]">此科目目前沒有已完成並輸入成績的評估。</p>
          </div>
        ) : (
          <div className="h-80 w-full mb-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E9E3DB" />
                <XAxis 
                  dataKey="studentNumber" 
                  tick={{ fill: '#8E877F', fontSize: 10, fontWeight: 700 }} 
                  axisLine={false} 
                  tickLine={false} 
                  dy={10}
                />
                <YAxis 
                  tick={{ fill: '#8E877F', fontSize: 10, fontWeight: 700 }} 
                  axisLine={false} 
                  tickLine={false} 
                  dx={-10}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #E9E3DB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', fontWeight: 600, color: '#3D3833' }}
                  cursor={{ fill: '#F9F6F2' }}
                />
                <Bar dataKey="score" radius={[8, 8, 0, 0]} maxBarSize={60}>
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.score >= 85 ? '#88968A' : entry.score >= 65 ? '#E9E3DB' : '#F1EDE9'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {data.length > 0 && (
          <div className="mt-8 pt-8 border-t border-[#E9E3DB]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-[#8E877F]">學生洞察分析</h4>
                <p className="text-xs text-[#8E877F] mt-0.5">匯出專屬試算表（含每項評估成績、平均百分比及學生趨勢）</p>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                {sheetUrl && (
                  <a 
                    id="link-view-exported-sheet"
                    href={sheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-sm font-semibold transition-colors shadow-xs"
                  >
                    <ExternalLink size={16} /> 開啟已匯出試算表
                  </a>
                )}
                <button
                  id="btn-export-comprehensive-sheet"
                  onClick={handleExportToSheets}
                  disabled={isSaving}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-[#88968A] hover:bg-[#78857a] text-white border border-transparent rounded-lg text-sm font-semibold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
                  <span>{isSaving ? '正在生成試算表...' : `匯出 ${selectedClass?.name} - ${currentSubject?.name || ''} 試算表`}</span>
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.map((student, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-[#F9F6F2] hover:bg-[#E9E3DB]/50 transition-colors">
                  <div>
                    <p className="text-sm font-bold text-[#3D3833]">學號 {student.studentNumber}</p>
                    <p className="text-xs font-medium text-[#8E877F] mt-0.5">平均分數：{student.score}%</p>
                  </div>
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm border border-[#E9E3DB]">
                    {student.trend === 'up' && <TrendingUp className="w-5 h-5 text-[#88968A]" />}
                    {student.trend === 'down' && <TrendingDown className="w-5 h-5 text-[#C59B83]" />}
                    {student.trend === 'stable' && <Minus className="w-5 h-5 text-[#D9CEC1]" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
