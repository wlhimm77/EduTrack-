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

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [classes, setClasses] = useState<ClassGroup[]>(() => {
    const saved = localStorage.getItem('edutrack_classes_tc5');
    return saved ? JSON.parse(saved) : mockClasses;
  });
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('edutrack_tasks_tc5');
    return saved ? JSON.parse(saved) : mockTasks;
  });
  const [performance, setPerformance] = useState<Record<string, StudentPerformance[]>>(() => {
    const saved = localStorage.getItem('edutrack_perf_tc5');
    return saved ? JSON.parse(saved) : mockPerformance;
  });
  const [templates, setTemplates] = useState<SyllabusTemplate[]>(() => {
    const saved = localStorage.getItem('edutrack_templates_tc5');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge in any new default templates the user doesn't have yet
      const missingDefaults = defaultTemplates.filter(dt => !parsed.some((p: SyllabusTemplate) => p.id === dt.id));
      return [...parsed, ...missingDefaults];
    }
    return defaultTemplates;
  });
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(() => {
    const saved = localStorage.getItem('edutrack_calendar_tc18');
    return saved ? JSON.parse(saved) : defaultCalendarEvents;
  });

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem('edutrack_classes_tc5', JSON.stringify(classes));
    localStorage.setItem('edutrack_tasks_tc5', JSON.stringify(tasks));
    localStorage.setItem('edutrack_perf_tc5', JSON.stringify(performance));
    localStorage.setItem('edutrack_templates_tc5', JSON.stringify(templates));
    localStorage.setItem('edutrack_calendar_tc18', JSON.stringify(calendarEvents));
  }, [classes, tasks, performance, templates, calendarEvents]);

  const updatePerformance = (assessmentKey: string, newPerformance: StudentPerformance[]) => {
    setPerformance(prev => ({
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
  );
}
