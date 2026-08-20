import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { TeacherTimetable, TimetableLesson, TimetablePeriod } from '../types';
import * as XLSX from 'xlsx';
import { Upload, Download, Plus, Trash2, Edit3, CheckCircle2, AlertCircle, FileSpreadsheet, X, RefreshCw } from 'lucide-react';
import { cn } from '../utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  timetable?: TeacherTimetable;
  currentTimetable?: TeacherTimetable;
  onSaveTimetable?: (newTimetable: TeacherTimetable) => void | Promise<void>;
  onSave?: (newTimetable: TeacherTimetable) => void | Promise<void>;
}

export function TimetableUploadModal({ 
  isOpen, 
  onClose, 
  timetable, 
  currentTimetable, 
  onSaveTimetable, 
  onSave 
}: Props) {
  const activeTimetable = timetable || currentTimetable || { periods: [], lessons: [] };

  const [activeTab, setActiveTab] = useState<'upload' | 'manual' | 'periods'>('upload');
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewLessons, setPreviewLessons] = useState<TimetableLesson[] | null>(null);
  const [editingLessons, setEditingLessons] = useState<TimetableLesson[]>(activeTimetable?.lessons || []);
  const [editingPeriods, setEditingPeriods] = useState<TimetablePeriod[]>(activeTimetable?.periods || []);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with prop when opened
  useEffect(() => {
    if (isOpen) {
      setEditingLessons(activeTimetable?.lessons || []);
      setEditingPeriods(activeTimetable?.periods || []);
      setFileError(null);
      setSuccessMsg(null);
      setPreviewLessons(null);
    }
  }, [isOpen, activeTimetable]);

  if (!isOpen) return null;

  // Handle file upload (Excel or CSV)
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    setSuccessMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (json.length < 2) {
          setFileError('檔案內容為空或缺少資料標題列。');
          return;
        }

        // Identify header columns
        const headers: string[] = (json[0] || []).map((h: any) => String(h).trim().toLowerCase());
        
        // Match column indices
        const dayIdx = headers.findIndex(h => h.includes('day') || h.includes('循環') || h.includes('日') || h.includes('cycle'));
        const periodIdx = headers.findIndex(h => h.includes('period') || h.includes('節') || h.includes('堂'));
        const classIdx = headers.findIndex(h => h.includes('class') || h.includes('班') || h.includes('班別'));
        const subjectIdx = headers.findIndex(h => h.includes('subject') || h.includes('科') || h.includes('科目'));
        const roomIdx = headers.findIndex(h => h.includes('room') || h.includes('室') || h.includes('課室') || h.includes('地點'));
        const notesIdx = headers.findIndex(h => h.includes('note') || h.includes('備註') || h.includes('remark'));

        if (dayIdx === -1 || periodIdx === -1 || classIdx === -1 || subjectIdx === -1) {
          setFileError('無法自動辨識欄位。請確保包含「循環日 (Cycle Day: 1-7)」、「節數 (Period: 1-8)」、「班別 (Class)」、「科目 (Subject)」欄位，或下載標準範本。');
          return;
        }

        const parsedLessons: TimetableLesson[] = [];

        for (let i = 1; i < json.length; i++) {
          const row = json[i];
          if (!row || row.length === 0) continue;

          const rawDay = String(row[dayIdx] || '').replace(/[^0-9]/g, '');
          const rawPeriod = String(row[periodIdx] || '').replace(/[^0-9]/g, '');
          const className = String(row[classIdx] || '').trim();
          const subjectName = String(row[subjectIdx] || '').trim();
          const room = roomIdx !== -1 && row[roomIdx] ? String(row[roomIdx]).trim() : '';
          const notes = notesIdx !== -1 && row[notesIdx] ? String(row[notesIdx]).trim() : '';

          const cycleDay = parseInt(rawDay, 10);
          const period = parseInt(rawPeriod, 10);

          if (cycleDay >= 1 && cycleDay <= 7 && period >= 1 && className && subjectName) {
            parsedLessons.push({
              id: `lesson-import-${Date.now()}-${i}`,
              cycleDay,
              period,
              className,
              subjectName,
              room: room || undefined,
              notes: notes || undefined,
            });
          }
        }

        if (parsedLessons.length === 0) {
          setFileError('未找到有效的課堂資料。請檢查循環日（1-7）與節數（1-8）是否正確填寫。');
          return;
        }

        setPreviewLessons(parsedLessons);
        setEditingLessons(parsedLessons);
        setSuccessMsg(`成功解析 ${parsedLessons.length} 節課堂！請檢視下方預覽並點擊「儲存時間表」。`);
      } catch (err) {
        console.error('File parsing error:', err);
        setFileError('解析檔案失敗，請確保上傳標準的 Excel (.xlsx, .xls) 或 CSV 檔案。');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Download template Excel file
  const handleDownloadTemplate = () => {
    const templateData = [
      ['循環日 (Cycle Day 1-7)', '節數 (Period 1-8)', '班別 (Class)', '科目 (Subject)', '課室 (Room)', '備註 (Notes)'],
      [1, 1, '1A', '歷史', '102 室', '分組教學'],
      [1, 3, '2A', '歷史', '201 室', '帶筆記'],
      [1, 5, '4A', '歷史', '401 室', '高中必修'],
      [2, 2, '1A', '中國歷史', '102 室', ''],
      [2, 4, '2A', '中國歷史', '201 室', ''],
      [2, 6, '5B', '歷史', '502 室', 'DSE 課題'],
      [3, 1, '2A', '歷史', '201 室', ''],
      [3, 3, '4A', '歷史', '401 室', ''],
      [3, 6, '1A', '歷史', '102 室', '小測'],
      [4, 2, '1A', '中國歷史', '102 室', ''],
      [4, 5, '2A', '中國歷史', '201 室', ''],
      [4, 7, '2A', '歷史', '201 室', ''],
      [5, 1, '4A', '歷史', '401 室', ''],
      [5, 3, '1A', '歷史', '102 室', ''],
      [5, 6, '5B', '歷史', '502 室', ''],
      [6, 2, '2A', '中國歷史', '201 室', ''],
      [6, 4, '1A', '中國歷史', '102 室', ''],
      [6, 6, '4A', '歷史', '401 室', ''],
      [7, 1, '1A', '歷史', '102 室', ''],
      [7, 3, '2A', '歷史', '201 室', ''],
      [7, 5, '5B', '歷史', '502 室', '總結週記'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '任教時間表範本');
    XLSX.writeFile(wb, '教師任教時間表範本_7Day_Cycle.xlsx');
  };

  const handleSaveData = async () => {
    setIsSaving(true);
    try {
      const updated: TeacherTimetable = {
        periods: editingPeriods,
        lessons: editingLessons,
      };
      if (onSave) {
        await onSave(updated);
      } else if (onSaveTimetable) {
        await onSaveTimetable(updated);
      }
      setSuccessMsg('時間表已成功儲存並同步至雲端！');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error(err);
      setFileError('儲存失敗：' + String(err));
    } finally {
      setIsSaving(false);
    }
  };

  // Add new lesson manually
  const handleAddLesson = (day: number, period: number) => {
    const newLesson: TimetableLesson = {
      id: `lesson-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      cycleDay: day,
      period: period,
      className: '1A',
      subjectName: '歷史',
      room: '201 室',
    };
    setEditingLessons([...editingLessons, newLesson]);
  };

  const handleUpdateLesson = (id: string, updates: Partial<TimetableLesson>) => {
    setEditingLessons(editingLessons.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const handleDeleteLesson = (id: string) => {
    setEditingLessons(editingLessons.filter(l => l.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-[#E9E3DB] overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 md:p-6 border-b border-[#E9E3DB] flex items-center justify-between bg-[#FAF7F2]">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-[#88968A]/15 text-[#88968A] rounded-lg">
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              <h3 className="text-xl font-bold text-[#3D3833]">教師任教時間表管理 (7-Day Cycle)</h3>
            </div>
            <p className="text-sm text-[#8E877F] mt-1">
              支援上傳 Excel / CSV 時間表，系統將自動依照校曆表的「Day 1 - Day 7」呈現課堂。
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-[#8E877F] hover:text-[#3D3833] hover:bg-white rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#E9E3DB] px-6 bg-white shrink-0">
          <button
            onClick={() => setActiveTab('upload')}
            className={cn(
              "px-4 py-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors",
              activeTab === 'upload' 
                ? "border-[#88968A] text-[#88968A]" 
                : "border-transparent text-[#8E877F] hover:text-[#3D3833]"
            )}
          >
            <Upload className="w-4 h-4" /> 上傳 Excel / CSV
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={cn(
              "px-4 py-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors",
              activeTab === 'manual' 
                ? "border-[#88968A] text-[#88968A]" 
                : "border-transparent text-[#8E877F] hover:text-[#3D3833]"
            )}
          >
            <Edit3 className="w-4 h-4" /> 視覺化網格編輯 (Day 1 - 7)
          </button>
          <button
            onClick={() => setActiveTab('periods')}
            className={cn(
              "px-4 py-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors",
              activeTab === 'periods' 
                ? "border-[#88968A] text-[#88968A]" 
                : "border-transparent text-[#8E877F] hover:text-[#3D3833]"
            )}
          >
            <RefreshCw className="w-4 h-4" /> 鐘聲節數設定 ({editingPeriods.length} 節)
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6">
          {fileError && (
            <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">上傳或解析提示</p>
                <p className="mt-0.5">{fileError}</p>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-sm flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
              <p className="font-medium">{successMsg}</p>
            </div>
          )}

          {/* TAB 1: UPLOAD EXCEL / CSV */}
          {activeTab === 'upload' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-[#FAF7F2] border border-[#E9E3DB]">
                <div className="text-sm">
                  <h4 className="font-bold text-[#3D3833]">還沒有標準格式？</h4>
                  <p className="text-[#8E877F] text-xs mt-0.5">點擊右側按鈕下載預設的 7-Day Cycle Excel 範本，填寫後即可直接上傳。</p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-4 py-2.5 bg-white border border-[#E9E3DB] hover:border-[#88968A] text-[#3D3833] text-sm font-bold rounded-xl flex items-center gap-2 shadow-xs shrink-0 transition-colors"
                >
                  <Download className="w-4 h-4 text-[#88968A]" />
                  下載 Excel 範本
                </button>
              </div>

              {/* Upload Dropzone */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#D9CEC1] hover:border-[#88968A] bg-[#FAF7F2]/60 hover:bg-[#FAF7F2] rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-14 h-14 bg-white rounded-2xl border border-[#E9E3DB] flex items-center justify-center text-[#88968A] group-hover:scale-110 transition-transform mb-3 shadow-xs">
                  <Upload className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-[#3D3833]">點擊此處或拖放時間表檔案</h4>
                <p className="text-xs text-[#8E877F] mt-1 max-w-md">
                  支援 Microsoft Excel (.xlsx, .xls) 及 CSV 格式檔案，自動辨識循環日與節數
                </p>
                <div className="mt-4 px-3 py-1 bg-white rounded-lg border border-[#E9E3DB] text-[11px] font-semibold text-[#8E877F]">
                  已存在 {editingLessons.length} 節課堂資料
                </div>
              </div>

              {/* Preview Table */}
              {editingLessons.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-[#3D3833]">現有課堂清單 ({editingLessons.length} 節)</h4>
                    <span className="text-xs text-[#8E877F]">涵蓋 Day 1 至 Day 7</span>
                  </div>
                  <div className="border border-[#E9E3DB] rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#FAF7F2] text-[#8E877F] uppercase tracking-wider border-b border-[#E9E3DB] sticky top-0">
                        <tr>
                          <th className="py-2.5 px-3 font-bold">循環日</th>
                          <th className="py-2.5 px-3 font-bold">節數</th>
                          <th className="py-2.5 px-3 font-bold">班別</th>
                          <th className="py-2.5 px-3 font-bold">科目</th>
                          <th className="py-2.5 px-3 font-bold">課室</th>
                          <th className="py-2.5 px-3 font-bold">備註</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E9E3DB] bg-white">
                        {editingLessons.slice(0, 30).map((l, idx) => (
                          <tr key={l.id || idx} className="hover:bg-[#FAF7F2]/50">
                            <td className="py-2 px-3 font-bold text-[#88968A]">Day {l.cycleDay}</td>
                            <td className="py-2 px-3 font-medium text-[#3D3833]">第 {l.period} 節</td>
                            <td className="py-2 px-3 font-bold text-[#3D3833]">{l.className}</td>
                            <td className="py-2 px-3 text-[#3D3833]">{l.subjectName}</td>
                            <td className="py-2 px-3 text-[#8E877F]">{l.room || '-'}</td>
                            <td className="py-2 px-3 text-[#8E877F]">{l.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {editingLessons.length > 30 && (
                      <div className="p-2 text-center text-xs text-[#8E877F] bg-[#FAF7F2] border-t border-[#E9E3DB]">
                        還有 {editingLessons.length - 30} 節課堂...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MANUAL VISUAL GRID EDITOR */}
          {activeTab === 'manual' && (
            <div className="space-y-6">
              {/* Day Switcher */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setSelectedDay(day)}
                      className={cn(
                        "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0",
                        selectedDay === day
                          ? "bg-[#88968A] text-white shadow-xs"
                          : "bg-[#FAF7F2] text-[#8E877F] hover:bg-[#E9E3DB] hover:text-[#3D3833]"
                      )}
                    >
                      Day {day} ({editingLessons.filter(l => l.cycleDay === day).length} 堂)
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid of Periods for the selected day */}
              <div className="space-y-3">
                {editingPeriods.map((period) => {
                  const lesson = editingLessons.find(l => l.cycleDay === selectedDay && l.period === period.period);

                  return (
                    <div 
                      key={period.period}
                      className={cn(
                        "p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4",
                        lesson 
                          ? "bg-white border-[#D9CEC1] shadow-xs" 
                          : "bg-[#FAF7F2]/60 border-[#E9E3DB] border-dashed"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-[#FAF7F2] border border-[#E9E3DB] rounded-xl flex flex-col items-center justify-center shrink-0">
                          <span className="text-[10px] text-[#8E877F] font-bold">第 {period.period} 節</span>
                          <span className="text-xs font-bold text-[#3D3833]">{period.startTime}</span>
                        </div>
                        <div>
                          <div className="text-xs text-[#8E877F]">
                            {period.startTime} - {period.endTime}
                          </div>
                          <div className="font-bold text-sm text-[#3D3833]">
                            {period.name}
                          </div>
                        </div>
                      </div>

                      {/* Lesson Details or Add button */}
                      {lesson ? (
                        <div className="flex-1 flex flex-wrap items-center gap-3 md:justify-end">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#8E877F]">班別:</span>
                            <input
                              type="text"
                              value={lesson.className}
                              onChange={(e) => handleUpdateLesson(lesson.id, { className: e.target.value })}
                              className="w-16 px-2 py-1 text-xs font-bold border border-[#E9E3DB] rounded-lg bg-white"
                              placeholder="1A"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#8E877F]">科目:</span>
                            <input
                              type="text"
                              value={lesson.subjectName}
                              onChange={(e) => handleUpdateLesson(lesson.id, { subjectName: e.target.value })}
                              className="w-24 px-2 py-1 text-xs border border-[#E9E3DB] rounded-lg bg-white"
                              placeholder="歷史"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#8E877F]">課室:</span>
                            <input
                              type="text"
                              value={lesson.room || ''}
                              onChange={(e) => handleUpdateLesson(lesson.id, { room: e.target.value })}
                              className="w-20 px-2 py-1 text-xs border border-[#E9E3DB] rounded-lg bg-white"
                              placeholder="102 室"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteLesson(lesson.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="刪除此節課"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => handleAddLesson(selectedDay, period.period)}
                            className="px-3 py-1.5 bg-white border border-[#E9E3DB] hover:border-[#88968A] text-[#88968A] hover:bg-[#88968A]/10 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            安排課堂
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: PERIODS BELL SCHEDULE */}
          {activeTab === 'periods' && (
            <div className="space-y-4">
              <div className="text-sm text-[#8E877F]">
                調整每日每節課堂的標準時間（起止時間）。
              </div>
              <div className="space-y-2">
                {editingPeriods.map((period, idx) => (
                  <div key={period.period} className="flex items-center gap-3 p-3 bg-[#FAF7F2] rounded-xl border border-[#E9E3DB]">
                    <span className="w-16 font-bold text-xs text-[#88968A]">第 {period.period} 節</span>
                    <input
                      type="text"
                      value={period.name}
                      onChange={(e) => {
                        const newPeriods = [...editingPeriods];
                        newPeriods[idx].name = e.target.value;
                        setEditingPeriods(newPeriods);
                      }}
                      className="flex-1 px-2.5 py-1.5 text-xs border border-[#E9E3DB] rounded-lg bg-white"
                      placeholder="節數名稱 (如 第 1 節)"
                    />
                    <div className="flex items-center gap-1.5">
                      <input
                        type="time"
                        value={period.startTime}
                        onChange={(e) => {
                          const newPeriods = [...editingPeriods];
                          newPeriods[idx].startTime = e.target.value;
                          setEditingPeriods(newPeriods);
                        }}
                        className="px-2 py-1 text-xs border border-[#E9E3DB] rounded-lg bg-white"
                      />
                      <span className="text-xs text-[#8E877F]">-</span>
                      <input
                        type="time"
                        value={period.endTime}
                        onChange={(e) => {
                          const newPeriods = [...editingPeriods];
                          newPeriods[idx].endTime = e.target.value;
                          setEditingPeriods(newPeriods);
                        }}
                        className="px-2 py-1 text-xs border border-[#E9E3DB] rounded-lg bg-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 md:p-6 border-t border-[#E9E3DB] bg-[#FAF7F2] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-bold text-[#8E877F] hover:text-[#3D3833] transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSaveData}
            disabled={isSaving}
            className="px-6 py-2.5 bg-[#88968A] hover:bg-[#748276] text-white font-bold text-sm rounded-xl shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSaving ? '儲存中...' : '儲存任教時間表'}
          </button>
        </div>
      </div>
    </div>
  );
}
