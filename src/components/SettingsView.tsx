import { useState, ChangeEvent } from 'react';
import { 
  Settings, 
  CloudUpload, 
  Download, 
  Upload, 
  RotateCcw, 
  ShieldCheck, 
  AlertTriangle, 
  Check, 
  Database, 
  Info,
  CheckCircle2,
  Clock,
  Trash2,
  Sparkles,
  RefreshCw,
  FolderSync
} from 'lucide-react';
import { User } from 'firebase/auth';
import { 
  ClassGroup, 
  Task, 
  StudentPerformance, 
  SyllabusTemplate, 
  CalendarEvent, 
  CloudBackup,
  TeacherTimetable
} from '../types';
import { mockClasses, mockTasks, mockPerformance, defaultTemplates, defaultCalendarEvents, defaultTimetable } from '../data';

interface SettingsViewProps {
  user: User | null;
  hasLocalData: boolean;
  onSyncLocalData: () => Promise<void>;
  classes: ClassGroup[];
  setClasses: (val: any) => Promise<void> | void;
  tasks: Task[];
  setTasks: (val: any) => Promise<void> | void;
  performance: Record<string, StudentPerformance[]>;
  setPerformance: (val: any) => Promise<void> | void;
  templates: SyllabusTemplate[];
  setTemplates: (val: any) => Promise<void> | void;
  calendarEvents: CalendarEvent[];
  setCalendarEvents: (val: any) => Promise<void> | void;
  timetable?: TeacherTimetable;
  setTimetable?: (val: any) => Promise<void> | void;
  // Cloud Backup props
  cloudBackups: CloudBackup[];
  isBackingUp: boolean;
  lastBackupTime: Date | null;
  nextBackupTime: Date | null;
  onCreateCloudBackup: () => Promise<void> | void;
  onRestoreCloudBackup: (backup: CloudBackup) => Promise<void> | void;
  onDeleteCloudBackup: (id: string) => Promise<void> | void;
}

interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  onConfirm: () => Promise<void> | void;
}

export function SettingsView({
  user,
  hasLocalData,
  onSyncLocalData,
  classes,
  setClasses,
  tasks,
  setTasks,
  performance,
  setPerformance,
  templates,
  setTemplates,
  calendarEvents,
  setCalendarEvents,
  timetable,
  setTimetable,
  cloudBackups,
  isBackingUp,
  lastBackupTime,
  nextBackupTime,
  onCreateCloudBackup,
  onRestoreCloudBackup,
  onDeleteCloudBackup,
}: SettingsViewProps) {
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Format date helper
  const formatDate = (isoOrTs: string | number) => {
    const d = typeof isoOrTs === 'string' ? new Date(isoOrTs) : new Date(isoOrTs);
    return d.toLocaleString('zh-HK', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  // 1. Manual Cloud Backup with confirmation
  const requestManualCloudBackup = () => {
    if (!user) {
      setStatusMsg({ type: 'error', text: '請先登入 Google 帳號以啟用雲端備份！' });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: '二次確認：立即建立雲端備份',
      message: `即將為目前的 ${classes.length} 個班級、${tasks.length} 項待辦、${templates.length} 個課程範本與 ${calendarEvents.length} 個校曆事件建立雲端快照。目前已有 ${cloudBackups.length}/10 份備份（若達 10 份將自動替換最舊的一筆）。確定建立嗎？`,
      confirmText: '確認建立備份',
      cancelText: '取消',
      variant: 'primary',
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          await onCreateCloudBackup();
          setStatusMsg({ type: 'success', text: '✅ 雲端備份建立成功！已保存至您的 Firebase 帳號中。' });
        } catch (err) {
          setStatusMsg({ type: 'error', text: '建立備份失敗：' + String(err) });
        } finally {
          setIsProcessing(false);
          setConfirmDialog(null);
        }
      }
    });
  };

  // 2. Restore Cloud Backup with double confirmation
  const requestRestoreCloudBackup = (backup: CloudBackup) => {
    setConfirmDialog({
      isOpen: true,
      title: '二次確認：還原此雲端備份',
      message: `⚠️ 即將還原備份「${backup.label}」（建立於 ${formatDate(backup.createdAt)}）。此操作將會把現有資料替換為備份中的內容（${backup.summary.classesCount} 班級、${backup.summary.tasksCount} 待辦、${backup.summary.templatesCount} 範本、${backup.summary.calendarCount} 校曆事件）。確定要還原嗎？`,
      confirmText: '確認還原此備份',
      cancelText: '取消',
      variant: 'warning',
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          await onRestoreCloudBackup(backup);
          setStatusMsg({ type: 'success', text: `✅ 成功還原備份「${backup.label}」！` });
        } catch (err) {
          setStatusMsg({ type: 'error', text: '還原備份失敗：' + String(err) });
        } finally {
          setIsProcessing(false);
          setConfirmDialog(null);
        }
      }
    });
  };

  // 3. Delete Cloud Backup with double confirmation
  const requestDeleteCloudBackup = (backup: CloudBackup) => {
    setConfirmDialog({
      isOpen: true,
      title: '二次確認：刪除此雲端備份',
      message: `確定要刪除建立於 ${formatDate(backup.createdAt)} 的備份「${backup.label}」嗎？此操作無法復原。`,
      confirmText: '確認刪除',
      cancelText: '取消',
      variant: 'danger',
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          await onDeleteCloudBackup(backup.id);
          setStatusMsg({ type: 'info', text: `已刪除備份「${backup.label}」。` });
        } catch (err) {
          setStatusMsg({ type: 'error', text: '刪除失敗：' + String(err) });
        } finally {
          setIsProcessing(false);
          setConfirmDialog(null);
        }
      }
    });
  };

  // 4. Export JSON
  const handleExport = () => {
    try {
      const backupData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        userEmail: user?.email || 'offline_user',
        classes,
        tasks,
        performance,
        templates,
        calendarEvents,
        timetable,
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `eduflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatusMsg({ type: 'success', text: '✅ 備份檔案下載成功！請妥善保存此 JSON 檔案。' });
    } catch (e) {
      setStatusMsg({ type: 'error', text: '匯出備份失敗：' + String(e) });
    }
  };

  // 5. Import JSON with double confirmation
  const handleFileSelected = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        // Open double confirmation dialog
        setConfirmDialog({
          isOpen: true,
          title: '二次確認：匯入 JSON 備份檔案',
          message: `即將匯入檔案「${file.name}」。此操作將會用檔案內的資料覆蓋目前的班級、待辦、進度與日曆。確定要繼續嗎？`,
          confirmText: '確認匯入並覆蓋',
          cancelText: '取消',
          variant: 'warning',
          onConfirm: async () => {
            setIsProcessing(true);
            try {
              if (parsed.classes) await setClasses(parsed.classes);
              if (parsed.tasks) await setTasks(parsed.tasks);
              if (parsed.performance) await setPerformance(parsed.performance);
              if (parsed.templates) await setTemplates(parsed.templates);
              if (parsed.calendarEvents) await setCalendarEvents(parsed.calendarEvents);
              if (parsed.timetable && setTimetable) await setTimetable(parsed.timetable);

              setStatusMsg({ type: 'success', text: '✅ 成功還原所有 JSON 備份資料！' });
            } catch (err) {
              setStatusMsg({ type: 'error', text: '還原失敗：' + String(err) });
            } finally {
              setIsProcessing(false);
              setConfirmDialog(null);
            }
          }
        });
      } catch (err) {
        setStatusMsg({ type: 'error', text: '檔案格式不符或 JSON 讀取失敗：' + String(err) });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 6. Sync local data with double confirmation
  const requestSyncLocalData = () => {
    if (!user) {
      setStatusMsg({ type: 'error', text: '請先在頂部登入 Google 帳號，再進行雲端同步！' });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: '二次確認：立刻同步本機舊資料至雲端',
      message: '系統將會讀取此瀏覽器中儲存的舊版本機班級、待辦、進度與日曆資料，並同步上傳至您的 Firebase 雲端帳號。確定要執行同步嗎？',
      confirmText: '確認立刻同步',
      cancelText: '取消',
      variant: 'primary',
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          await onSyncLocalData();
          setStatusMsg({ type: 'success', text: '✅ 同步成功！舊版資料已安全上傳至您的雲端帳號！' });
        } catch (err) {
          setStatusMsg({ type: 'error', text: '同步失敗：' + String(err) });
        } finally {
          setIsProcessing(false);
          setConfirmDialog(null);
        }
      }
    });
  };

  // 7. Restore Defaults with double confirmation
  const requestRestoreDefaults = () => {
    setConfirmDialog({
      isOpen: true,
      title: '二次確認：載入標準香港中學預設範本',
      message: '⚠️ 注意：這將會把所有班級進度、待辦與校曆重設為初始的香港中學示範資料（包括中一至中六標準週期與課程大綱）。確定要重設嗎？',
      confirmText: '確認重設為預設範本',
      cancelText: '取消',
      variant: 'danger',
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          await setClasses(mockClasses);
          await setTasks(mockTasks);
          await setPerformance(mockPerformance);
          await setTemplates(defaultTemplates);
          await setCalendarEvents(defaultCalendarEvents);
          if (setTimetable) await setTimetable(defaultTimetable);
          setStatusMsg({ type: 'success', text: '✅ 已成功重設並載入標準預設範本！' });
        } catch (err) {
          setStatusMsg({ type: 'error', text: '重設失敗：' + String(err) });
        } finally {
          setIsProcessing(false);
          setConfirmDialog(null);
        }
      }
    });
  };

  // 8. Restore from Local Snapshot Archive with double confirmation
  const requestRecoverFromLocal = () => {
    setConfirmDialog({
      isOpen: true,
      title: '二次確認：從本機暫存歷史還原',
      message: '系統將會搜尋瀏覽器中先前的本機快照備份並嘗試還原。確定要繼續嗎？',
      confirmText: '確認搜尋並還原',
      cancelText: '取消',
      variant: 'warning',
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          let restoredCount = 0;
          const localClasses = localStorage.getItem('edutrack_classes_tc5') || localStorage.getItem('backup_edutrack_classes_tc5');
          if (localClasses) {
            await setClasses(JSON.parse(localClasses));
            restoredCount++;
          }

          const localTasks = localStorage.getItem('edutrack_tasks_tc5') || localStorage.getItem('backup_edutrack_tasks_tc5');
          if (localTasks) {
            await setTasks(JSON.parse(localTasks));
            restoredCount++;
          }

          const localPerf = localStorage.getItem('edutrack_perf_tc5') || localStorage.getItem('backup_edutrack_perf_tc5');
          if (localPerf) {
            await setPerformance(JSON.parse(localPerf));
            restoredCount++;
          }

          const localTemplates = localStorage.getItem('edutrack_templates_tc5') || localStorage.getItem('backup_edutrack_templates_tc5');
          if (localTemplates) {
            await setTemplates(JSON.parse(localTemplates));
            restoredCount++;
          }

          const localCalendar = localStorage.getItem('edutrack_calendar_tc18') || localStorage.getItem('backup_edutrack_calendar_tc18');
          if (localCalendar) {
            await setCalendarEvents(JSON.parse(localCalendar));
            restoredCount++;
          }

          if (restoredCount > 0) {
            setStatusMsg({ type: 'success', text: `✅ 成功從本機快照還原了 ${restoredCount} 個資料模組！` });
          } else {
            setStatusMsg({ type: 'info', text: '本機快照中未找到先前的暫存記錄。' });
          }
        } catch (e) {
          setStatusMsg({ type: 'error', text: '還原失敗：' + String(e) });
        } finally {
          setIsProcessing(false);
          setConfirmDialog(null);
        }
      }
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#D9CEC1] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#88968A]/20 text-[#88968A] rounded-xl">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#3D3833]">系統設定與資料管理</h1>
            <p className="text-xs text-[#8E877F]">全自動 30 分鐘雲端備份、歷史快照還原與安全管理中心</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-1.5 rounded-xl text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              雲端資料庫已連線 ({user.email})
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 px-3.5 py-1.5 rounded-xl text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              目前為離線／訪客模式（請登入以啟用自動雲端備份）
            </div>
          )}
        </div>
      </div>

      {/* Status Banner */}
      {statusMsg && (
        <div className={`p-4 rounded-xl text-sm font-medium flex items-center justify-between gap-3 shadow-xs ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
            : statusMsg.type === 'error'
            ? 'bg-red-50 text-red-900 border border-red-200'
            : 'bg-blue-50 text-blue-900 border border-blue-200'
        }`}>
          <div className="flex items-center gap-2.5">
            {statusMsg.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
            {statusMsg.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />}
            {statusMsg.type === 'info' && <Info className="w-5 h-5 text-blue-600 shrink-0" />}
            <span>{statusMsg.text}</span>
          </div>
          <button 
            onClick={() => setStatusMsg(null)}
            className="text-xs opacity-60 hover:opacity-100 font-bold px-2 py-1"
          >
            關閉
          </button>
        </div>
      )}

      {/* 🚀 Automated Cloud Backup System Section */}
      <div className="bg-white rounded-2xl border border-[#D9CEC1] p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E9E3DB]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#88968A]/15 text-[#88968A] rounded-lg">
              <FolderSync className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#3D3833] flex items-center gap-2">
                自動雲端備份系統
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  每 30 分鐘自動備份 · 上限 10 份
                </span>
              </h2>
              <p className="text-xs text-[#8E877F] mt-0.5">
                登入後系統每 30 分鐘自動在 Firebase 儲存歷史快照；超過 10 份時將自動替換最舊備份。
              </p>
            </div>
          </div>

          <button
            onClick={requestManualCloudBackup}
            disabled={!user || isBackingUp || isProcessing}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              user && !isBackingUp
                ? 'bg-[#3D3833] hover:bg-[#2B2723] text-white shadow-xs cursor-pointer'
                : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isBackingUp ? 'animate-spin' : ''}`} />
            {isBackingUp ? '備份建立中...' : '立即手動建立雲端備份'}
          </button>
        </div>

        {/* Real-time Status Card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-[#FAF7F2] rounded-xl border border-[#E9E3DB]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white rounded-lg border border-[#E9E3DB] text-[#88968A]">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-[#8E877F]">已儲存雲端備份</div>
              <div className="text-sm font-bold text-[#3D3833]">
                {user ? `${cloudBackups.length} / 10 份` : '請先登入'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white rounded-lg border border-[#E9E3DB] text-[#C59B83]">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-[#8E877F]">上次備份時間</div>
              <div className="text-xs font-bold text-[#3D3833]">
                {lastBackupTime ? formatDate(lastBackupTime.toISOString()) : (user ? '即將自動建立...' : '未連線')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white rounded-lg border border-[#E9E3DB] text-[#4A443F]">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-[#8E877F]">替換機制</div>
              <div className="text-xs font-bold text-[#3D3833]">
                FIFO (滿 10 份自動替換最舊)
              </div>
            </div>
          </div>
        </div>

        {/* Backups List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#7A4B3A] uppercase tracking-wider">
              可還原的雲端備份清單 ({cloudBackups.length})
            </h3>
            <span className="text-[11px] text-[#8E877F]">
              點選「還原」經二次確認後即可恢復至該時間點
            </span>
          </div>

          {!user ? (
            <div className="p-8 text-center bg-[#FAF7F2] rounded-xl border border-dashed border-[#D9CEC1] text-xs text-[#8E877F]">
              請先在系統頂部點擊「Sign in with Google」登入，系統將會為您的帳號啟用 30 分鐘定時自動備份。
            </div>
          ) : cloudBackups.length === 0 ? (
            <div className="p-8 text-center bg-[#FAF7F2] rounded-xl border border-dashed border-[#D9CEC1] text-xs text-[#8E877F]">
              目前尚未有備份記錄。系統將在 30 分鐘內自動建立第一筆備份，您也可以點擊右上角「立即手動建立雲端備份」。
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {cloudBackups.map((backup, idx) => (
                <div 
                  key={backup.id}
                  className="p-3.5 bg-white hover:bg-[#FAF7F2]/80 transition-all rounded-xl border border-[#E9E3DB] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-[#3D3833]">
                        #{idx + 1} {backup.label}
                      </span>
                      {backup.isAuto ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          定時自動
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          手動快照
                        </span>
                      )}
                      <span className="text-[11px] text-[#8E877F] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(backup.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-[#7A4B3A] flex-wrap">
                      <span className="bg-[#FAF7F2] px-2 py-0.5 rounded-md border border-[#E9E3DB]">
                        🏫 {backup.summary?.classesCount || 0} 個班級
                      </span>
                      <span className="bg-[#FAF7F2] px-2 py-0.5 rounded-md border border-[#E9E3DB]">
                        📝 {backup.summary?.tasksCount || 0} 項待辦
                      </span>
                      <span className="bg-[#FAF7F2] px-2 py-0.5 rounded-md border border-[#E9E3DB]">
                        📚 {backup.summary?.templatesCount || 0} 個課程範本
                      </span>
                      <span className="bg-[#FAF7F2] px-2 py-0.5 rounded-md border border-[#E9E3DB]">
                        📅 {backup.summary?.calendarCount || 0} 個校曆事件
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => requestRestoreCloudBackup(backup)}
                      disabled={isProcessing}
                      className="px-3 py-1.5 bg-[#88968A] hover:bg-[#778579] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      還原此備份
                    </button>
                    <button
                      onClick={() => requestDeleteCloudBackup(backup)}
                      disabled={isProcessing}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="刪除此備份"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cloud Sync Section */}
      <div className="bg-white rounded-2xl border border-[#D9CEC1] p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#E9E3DB]">
          <CloudUpload className="w-5 h-5 text-[#88968A]" />
          <h2 className="text-base font-bold text-[#3D3833]">本機舊資料同步 (Local to Cloud Sync)</h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#FAF7F2] rounded-xl border border-[#E9E3DB]">
          <div>
            <h3 className="text-sm font-bold text-[#3D3833] flex items-center gap-2">
              本機舊資料偵測狀態
              {hasLocalData ? (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  發現待同步舊資料
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                  無待同步舊資料
                </span>
              )}
            </h3>
            <p className="text-xs text-[#8E877F] mt-1">
              {hasLocalData 
                ? '此瀏覽器存有先前的離線設定資料。點擊按鈕即可進行二次確認並上傳到您的雲端帳號。' 
                : '本機目前沒有未同步的舊資料，所有操作皆已與雲端同步。'}
            </p>
          </div>
          <button
            onClick={requestSyncLocalData}
            disabled={!hasLocalData || isProcessing}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              hasLocalData
                ? 'bg-[#3D3833] hover:bg-[#2B2723] text-white shadow-sm cursor-pointer'
                : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
            }`}
          >
            <CloudUpload className="w-4 h-4" />
            立刻同步 (Sync Now)
          </button>
        </div>
      </div>

      {/* JSON File & Preset Tools */}
      <div className="bg-white rounded-2xl border border-[#D9CEC1] p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#E9E3DB]">
          <ShieldCheck className="w-5 h-5 text-[#88968A]" />
          <h2 className="text-base font-bold text-[#3D3833]">備用匯出與檔案還原工具</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Export JSON */}
          <div className="p-5 bg-[#FAF7F2] rounded-xl border border-[#E9E3DB] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-[#88968A]/20 text-[#88968A] rounded-lg">
                  <Download className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#3D3833]">匯出完整備份檔 (JSON)</h3>
              </div>
              <p className="text-xs text-[#8E877F] leading-relaxed">
                將您所有的班級資料、教學進度、待辦清單、成績記錄與校曆事件打包為標準 JSON 檔案下載至本機儲存。
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#E9E3DB]/60 flex justify-end">
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-[#88968A] hover:bg-[#778579] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                下載備份檔
              </button>
            </div>
          </div>

          {/* Card 2: Import Backup */}
          <div className="p-5 bg-[#FAF7F2] rounded-xl border border-[#E9E3DB] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-[#C59B83]/20 text-[#C59B83] rounded-lg">
                  <Upload className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#3D3833]">匯入 JSON 檔案還原 (需二次確認)</h3>
              </div>
              <p className="text-xs text-[#8E877F] leading-relaxed">
                選取先前匯出的 JSON 檔案。系統在還原前會提供預覽與二次確認提示，確保資料安全。
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#E9E3DB]/60 flex justify-end">
              <label className="px-4 py-2 bg-[#C59B83] hover:bg-[#B38A73] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs">
                <Upload className="w-3.5 h-3.5" />
                選擇檔案還原
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={handleFileSelected}
                  className="hidden" 
                />
              </label>
            </div>
          </div>

          {/* Card 3: Recover from Local Archive */}
          <div className="p-5 bg-[#FAF7F2] rounded-xl border border-[#E9E3DB] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-[#4A443F]/10 text-[#4A443F] rounded-lg">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#3D3833]">從本機暫存歷史還原 (需二次確認)</h3>
              </div>
              <p className="text-xs text-[#8E877F] leading-relaxed">
                若曾在此瀏覽器操作過，系統會嘗試掃描本地快照存檔並救回歷史記錄。
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#E9E3DB]/60 flex justify-end">
              <button
                onClick={requestRecoverFromLocal}
                disabled={isProcessing}
                className="px-4 py-2 bg-[#E9E3DB] hover:bg-[#D9CEC1] text-[#3D3833] text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                搜尋本機快照
              </button>
            </div>
          </div>

          {/* Card 4: Restore Defaults */}
          <div className="p-5 bg-[#FAF7F2] rounded-xl border border-[#E9E3DB] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-red-100 text-red-700 rounded-lg">
                  <Database className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#3D3833]">還原標準香港中學預設 (需二次確認)</h3>
              </div>
              <p className="text-xs text-[#8E877F] leading-relaxed">
                重新載入標準 7 天循環週期校曆、中一至中六 DSE 課程範本及示範資料。
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#E9E3DB]/60 flex justify-end">
              <button
                onClick={requestRestoreDefaults}
                disabled={isProcessing}
                className="px-4 py-2 bg-white hover:bg-red-50 text-red-700 border border-red-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Database className="w-3.5 h-3.5" />
                載入預設範本
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Safety Info Note */}
      <div className="p-4 bg-[#E9E3DB]/40 rounded-xl border border-[#D9CEC1] text-xs text-[#8E877F] flex items-start gap-2.5">
        <Info className="w-4 h-4 text-[#88968A] shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold text-[#3D3833]">安全保障機制：</span> 
          所有重設、同步與覆蓋還原操作均設有強制二次確認對話框。系統每 30 分鐘自動保存最新的 10 份快照至雲端，確保您的教務資料永遠安全無虞。
        </div>
      </div>

      {/* Double Confirmation Modal */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#FAF7F2] border border-[#D9CEC1] rounded-2xl w-full max-w-md shadow-2xl p-6 relative animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2.5 rounded-xl ${
                confirmDialog.variant === 'danger' 
                  ? 'bg-red-100 text-red-700' 
                  : confirmDialog.variant === 'warning'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-[#88968A]/20 text-[#88968A]'
              }`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#3D3833]">{confirmDialog.title}</h3>
                <span className="text-[11px] font-semibold text-[#8E877F] uppercase tracking-wider">Security Confirmation</span>
              </div>
            </div>

            <p className="text-sm text-[#4A443F] leading-relaxed my-4 bg-white p-3.5 rounded-xl border border-[#E9E3DB]">
              {confirmDialog.message}
            </p>

            <div className="flex items-center justify-end gap-3 mt-5">
              <button
                onClick={() => setConfirmDialog(null)}
                disabled={isProcessing}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#4A443F] hover:bg-[#E9E3DB] transition-colors"
              >
                {confirmDialog.cancelText || '取消'}
              </button>
              <button
                onClick={() => confirmDialog.onConfirm()}
                disabled={isProcessing}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-sm flex items-center gap-1.5 ${
                  confirmDialog.variant === 'danger'
                    ? 'bg-red-600 hover:bg-red-700'
                    : confirmDialog.variant === 'warning'
                    ? 'bg-[#C59B83] hover:bg-[#B38A73]'
                    : 'bg-[#3D3833] hover:bg-[#2B2723]'
                }`}
              >
                {isProcessing ? (
                  <>處理中...</>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {confirmDialog.confirmText}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
