/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { DashboardView } from './components/DashboardView';
import { SyllabusView } from './components/SyllabusView';
import { TasksView } from './components/TasksView';
import { PerformanceView } from './components/PerformanceView';
import { GradingView } from './components/GradingView';
import { mockClasses, mockTasks, mockPerformance, defaultTemplates, defaultCalendarEvents } from './data';
import { TemplatesView } from './components/TemplatesView';
import { exportTaskToMasterSheet } from './lib/googleSheets';
import { ClassGroup, Task, StudentPerformance, SyllabusTemplate, CalendarEvent } from './types';
import { useFirebaseData } from './hooks/useFirebaseData';
import { auth } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [hasLocalData, setHasLocalData] = useState(false);

  const [classes, setClasses] = useFirebaseData<ClassGroup[]>('classes', mockClasses);
  const [tasks, setTasks] = useFirebaseData<Task[]>('tasks', mockTasks);
  const [performance, setPerformance] = useFirebaseData<Record<string, StudentPerformance[]>>('performance', mockPerformance);
  const [templates, setTemplates] = useFirebaseData<SyllabusTemplate[]>('templates', defaultTemplates);
  const [calendarEvents, setCalendarEvents] = useFirebaseData<CalendarEvent[]>('calendarEvents', defaultCalendarEvents);

  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    // Check if local data exists
    if (
      localStorage.getItem('edutrack_classes_tc5') ||
      localStorage.getItem('edutrack_tasks_tc5') ||
      localStorage.getItem('edutrack_perf_tc5') ||
      localStorage.getItem('edutrack_templates_tc5') ||
      localStorage.getItem('edutrack_calendar_tc18')
    ) {
      setHasLocalData(true);
    }
  }, []);

  const handleMigrate = async () => {
    if (!user) {
      alert("請先登入，然後再同步本機資料！(Please sign in first)");
      return;
    }
    
    try {
      const localClasses = localStorage.getItem('edutrack_classes_tc5');
      if (localClasses && localClasses !== '[]') await setClasses(JSON.parse(localClasses));

      const localTasks = localStorage.getItem('edutrack_tasks_tc5');
      if (localTasks && localTasks !== '[]') await setTasks(JSON.parse(localTasks));

      const localPerf = localStorage.getItem('edutrack_perf_tc5');
      if (localPerf && localPerf !== '{}') await setPerformance(JSON.parse(localPerf));

      const localTemplates = localStorage.getItem('edutrack_templates_tc5');
      if (localTemplates && localTemplates !== '[]') await setTemplates(JSON.parse(localTemplates));

      const localCalendar = localStorage.getItem('edutrack_calendar_tc18');
      if (localCalendar && localCalendar !== '[]') await setCalendarEvents(JSON.parse(localCalendar));
      
      localStorage.removeItem('edutrack_classes_tc5');
      localStorage.removeItem('edutrack_tasks_tc5');
      localStorage.removeItem('edutrack_perf_tc5');
      localStorage.removeItem('edutrack_templates_tc5');
      localStorage.removeItem('edutrack_calendar_tc18');
      
      setHasLocalData(false);
      alert("同步成功！資料已經上傳到雲端！(Sync successful!)");
    } catch (error) {
      console.error('Migration error:', error);
      alert("同步發生錯誤 (Sync Error): " + String(error));
    }
  };

  const updatePerformance = (assessmentKey: string, newPerformance: StudentPerformance[]) => {
    setPerformance((prev: Record<string, StudentPerformance[]>) => ({
      ...prev,
      [assessmentKey]: newPerformance
    }));
  };

  const toggleTopic = (classId: string, subjectId: string, topicId: string) => {
    setClasses(prev => prev.map(c => {
      if (c.id !== classId) return c;
      return {
        ...c,
        subjects: c.subjects.map(s => {
          if (s.id !== subjectId) return s;
          return {
            ...s,
            syllabus: s.syllabus.map(t =>
              t.id === topicId ? { ...t, completed: !t.completed } : t
            )
          };
        })
      };
    }));
  };

  const toggleTask = (taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      let newStatus = t.status;
      if (t.status === 'pending' || t.status === 'overdue') {
        newStatus = 'grading';
      } else if (t.status === 'grading') {
        newStatus = 'pending'; // rollback
      } else if (t.status === 'completed') {
        newStatus = 'pending';
      }
      return { ...t, status: newStatus as any };
    }));
  };

  const updateTaskGrades = async (taskId: string, maxScore: number, grades: any[], complete: boolean = false) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      return { ...t, maxScore, grades, status: complete ? 'completed' : t.status };
    }));

    if (complete) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        const cls = classes.find(c => c.id === task.classId);
        const subj = cls?.subjects.find(s => s.id === task.subjectId);
        if (cls && subj) {
          try {
            await exportTaskToMasterSheet(task.title, cls.name, subj.name, grades, maxScore);
            console.log('Successfully auto-exported to Google Sheets');
          } catch (e) {
            console.error('Failed to auto-export', e);
          }
        }
      }
    }
  };

  const addClass = (name: string, form: string, size?: number, language?: string, initialSubjects: string[] = []) => {
    const newClass: ClassGroup = { 
      id: `c${Date.now()}`, 
      name, 
      form,
      size,
      language,
      subjects: initialSubjects.map((subName, i) => {
        const template = templates.find(t => t.form === form && t.subject === subName && (t.language || '中文') === (language || '中文'));
        return {
          id: `s${Date.now()}-${i}`,
          name: subName,
          syllabus: template ? template.topics.map((t, j) => ({
            id: `t${Date.now()}-${i}-${j}`,
            title: t.title,
            completed: false
          })) : []
        };
      })
    };
    setClasses([...classes, newClass]);
  };

  const editClass = (classId: string, name: string, form: string, size?: number, language?: string, newSubjects: string[] = []) => {
    setClasses(prev => prev.map(c => {
      if (c.id !== classId) return c;
      const currentSubjects = c.subjects;
      const updatedSubjects = newSubjects.map((subName, i) => {
        const existing = currentSubjects.find(s => s.name === subName);
        if (existing) return existing;
        const template = templates.find(t => t.form === form && t.subject === subName && (t.language || '中文') === (language || '中文'));
        return {
          id: `s${Date.now()}-${i}`,
          name: subName,
          syllabus: template ? template.topics.map((t, j) => ({
            id: `t${Date.now()}-${i}-${j}`,
            title: t.title,
            completed: false
          })) : []
        };
      });
      return { ...c, name, form, size, language, subjects: updatedSubjects };
    }));
  };

  const deleteClass = (classId: string) => {
    setClasses(prev => prev.filter(c => c.id !== classId));
    setTasks(prev => prev.filter(t => t.classId !== classId));
  };

  const addSubject = (classId: string, name: string) => {
    setClasses(prev => prev.map(c => c.id === classId ? {
      ...c, subjects: [...c.subjects, { id: `s${Date.now()}`, name, syllabus: [] }]
    } : c));
  };

  const editSubject = (classId: string, subjectId: string, newName: string) => {
    setClasses(prev => prev.map(c => c.id === classId ? {
      ...c, subjects: c.subjects.map(s => s.id === subjectId ? { ...s, name: newName } : s)
    } : c));
  };

  const addTopic = (classId: string, subjectId: string, title: string) => {
    setClasses(prev => prev.map(c => c.id === classId ? {
      ...c, subjects: c.subjects.map(s => s.id === subjectId ? {
        ...s, syllabus: [...s.syllabus, { id: `t${Date.now()}`, title, completed: false }]
      } : s)
    } : c));
  };

  const deleteTopic = (classId: string, subjectId: string, topicId: string) => {
    setClasses(prev => prev.map(c => c.id === classId ? {
      ...c, subjects: c.subjects.map(s => s.id === subjectId ? {
        ...s, syllabus: s.syllabus.filter(t => t.id !== topicId)
      } : s)
    } : c));
  };

  const updateTopicRemarks = (classId: string, subjectId: string, topicId: string, remarks: string) => {
    setClasses(prev => prev.map(c => {
      if (c.id !== classId) return c;
      return {
        ...c,
        subjects: c.subjects.map(s => {
          if (s.id !== subjectId) return s;
          return {
            ...s,
            syllabus: s.syllabus.map(t =>
              t.id === topicId ? { ...t, remarks } : t
            )
          };
        })
      };
    }));
  };

  const addTask = (title: string, classId: string, subjectId: string, dueDate: string, type: string) => {
    const newTask: Task = {
      id: `t${Date.now()}`,
      title,
      classId,
      subjectId,
      dueDate,
      type,
      status: 'pending'
    };
    setTasks(prev => [...prev, newTask]);
  };

  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const addTemplate = (form: string, subject: string, language: string) => {
    setTemplates(prev => [...prev, {
      id: `tpl-${Date.now()}`,
      form,
      subject,
      language,
      topics: []
    }]);
  };

  const deleteTemplate = (templateId: string) => {
    setTemplates(prev => prev.filter(t => t.id !== templateId));
  };

  const addTemplateTopic = (templateId: string, title: string) => {
    setTemplates(prev => prev.map(t => t.id === templateId ? {
      ...t, topics: [...t.topics, { id: `tpl-t${Date.now()}`, title }]
    } : t));
  };

  const deleteTemplateTopic = (templateId: string, topicId: string) => {
    setTemplates(prev => prev.map(t => t.id === templateId ? {
      ...t, topics: t.topics.filter(tp => tp.id !== topicId)
    } : t));
  };

  const editTemplateTopic = (templateId: string, topicId: string, newTitle: string) => {
    setTemplates(prev => prev.map(t => t.id === templateId ? {
      ...t, topics: t.topics.map(tp => tp.id === topicId ? { ...tp, title: newTitle } : tp)
    } : t));
  };

  return (
    <>
      {hasLocalData && user && (
        <div className="fixed bottom-6 right-6 z-[100] bg-[#3D3833] text-white p-5 rounded-2xl shadow-2xl flex flex-col gap-2 max-w-sm border border-white/10">
          <p className="text-base font-bold flex items-center gap-2">☁️ 發現舊版的本機資料！</p>
          <p className="text-sm opacity-90 leading-relaxed mb-2">我們偵測到您的瀏覽器中存有之前設定的班級、日曆等資料。是否要將它們同步上傳到您的雲端帳號中？</p>
          <div className="flex gap-3">
            <button onClick={handleMigrate} className="flex-1 bg-white hover:bg-gray-100 text-[#3D3833] py-2.5 rounded-xl text-sm font-bold transition-colors">
              立刻同步 (Sync Now)
            </button>
            <button onClick={() => setHasLocalData(false)} className="px-4 py-2.5 hover:bg-white/10 rounded-xl text-sm font-medium transition-colors">
              忽略 (Ignore)
            </button>
          </div>
        </div>
      )}
      <Layout activeTab={activeTab} setActiveTab={setActiveTab} classes={classes}>
      {activeTab === 'dashboard' && (
        <DashboardView 
          classes={classes} 
          tasks={tasks} 
          calendarEvents={calendarEvents}
          setCalendarEvents={setCalendarEvents}
          onNavigateTasks={() => setActiveTab('tasks')}
          onNavigateSyllabus={() => setActiveTab('syllabus')}
        />
      )}
      {activeTab === 'templates' && (
        <TemplatesView
          templates={templates}
          addTemplate={addTemplate}
          deleteTemplate={deleteTemplate}
          addTemplateTopic={addTemplateTopic}
          deleteTemplateTopic={deleteTemplateTopic}
          editTemplateTopic={editTemplateTopic}
        />
      )}
      {activeTab === 'syllabus' && (
        <SyllabusView 
          classes={classes} 
          toggleTopic={toggleTopic} 
          addClass={addClass}
          editClass={editClass}
          deleteClass={deleteClass}
          addSubject={addSubject}
          editSubject={editSubject}
          addTopic={addTopic}
          deleteTopic={deleteTopic}
          updateTopicRemarks={updateTopicRemarks}
        />
      )}
      {activeTab === 'tasks' && (
        <TasksView 
          tasks={tasks} 
          classes={classes} 
          toggleTask={toggleTask} 
          addTask={addTask} 
          deleteTask={deleteTask}
        />
      )}
      {activeTab === 'grading' && (
        <GradingView 
          tasks={tasks} 
          classes={classes} 
          updateTaskGrades={updateTaskGrades}
        />
      )}
      {activeTab === 'performance' && (
        <PerformanceView 
          tasks={tasks}
          classes={classes}
        />
      )}
    </Layout>
    </>
  );
}
