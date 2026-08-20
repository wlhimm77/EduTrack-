import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  CloudBackup, 
  ClassGroup, 
  Task, 
  StudentPerformance, 
  SyllabusTemplate, 
  CalendarEvent,
  TeacherTimetable
} from '../types';

const MAX_CLOUD_BACKUPS = 10;
const AUTO_BACKUP_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

interface UseCloudBackupsProps {
  classes: ClassGroup[];
  tasks: Task[];
  performance: Record<string, StudentPerformance[]>;
  templates: SyllabusTemplate[];
  calendarEvents: CalendarEvent[];
  timetable?: TeacherTimetable;
  setClasses: (val: any) => Promise<void> | void;
  setTasks: (val: any) => Promise<void> | void;
  setPerformance: (val: any) => Promise<void> | void;
  setTemplates: (val: any) => Promise<void> | void;
  setCalendarEvents: (val: any) => Promise<void> | void;
  setTimetable?: (val: any) => Promise<void> | void;
}

export function useCloudBackups({
  classes,
  tasks,
  performance,
  templates,
  calendarEvents,
  timetable,
  setClasses,
  setTasks,
  setPerformance,
  setTemplates,
  setCalendarEvents,
  setTimetable,
}: UseCloudBackupsProps) {
  const [user, setUser] = useState<User | null>(null);
  const [backups, setBackups] = useState<CloudBackup[]>([]);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState<Date | null>(null);
  const [nextBackupTime, setNextBackupTime] = useState<Date | null>(null);

  // Keep latest data in ref so periodic timers always read current state
  const dataRef = useRef({
    classes,
    tasks,
    performance,
    templates,
    calendarEvents,
    timetable,
  });

  useEffect(() => {
    dataRef.current = {
      classes,
      tasks,
      performance,
      templates,
      calendarEvents,
      timetable,
    };
  }, [classes, tasks, performance, templates, calendarEvents, timetable]);

  // Create a backup implementation
  const createBackup = useCallback(async (isAuto = true, customLabel?: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      setIsBackingUp(true);
      const now = new Date();
      const timestamp = now.getTime();
      const backupId = `bk_${timestamp}`;

      const current = dataRef.current;
      const label = customLabel || (isAuto 
        ? `自動備份 (${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` 
        : `手動雲端備份 (${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
      );

      const newBackup: CloudBackup = {
        id: backupId,
        createdAt: now.toISOString(),
        timestamp,
        label,
        isAuto,
        summary: {
          classesCount: current.classes?.length || 0,
          tasksCount: current.tasks?.length || 0,
          perfCount: Object.keys(current.performance || {}).length,
          templatesCount: current.templates?.length || 0,
          calendarCount: current.calendarEvents?.length || 0,
          timetableLessonsCount: current.timetable?.lessons?.length || 0,
        },
        data: {
          classes: current.classes || [],
          tasks: current.tasks || [],
          performance: current.performance || {},
          templates: current.templates || [],
          calendarEvents: current.calendarEvents || [],
          timetable: current.timetable,
        }
      };

      // 1. Fetch current backups to enforce MAX_CLOUD_BACKUPS limit (FIFO / oldest replaced)
      const backupsCol = collection(db, `users/${currentUser.uid}/cloudBackups`);
      const existingSnapshot = await getDocs(backupsCol);
      const existingBackups: { id: string; timestamp: number }[] = [];
      existingSnapshot.forEach((d) => {
        const dData = d.data();
        existingBackups.push({
          id: d.id,
          timestamp: dData.timestamp || 0,
        });
      });

      // If count >= MAX_CLOUD_BACKUPS, sort ascending and delete oldest to leave room
      if (existingBackups.length >= MAX_CLOUD_BACKUPS) {
        existingBackups.sort((a, b) => a.timestamp - b.timestamp);
        const toDeleteCount = existingBackups.length - MAX_CLOUD_BACKUPS + 1;
        const toDelete = existingBackups.slice(0, toDeleteCount);

        for (const item of toDelete) {
          try {
            await deleteDoc(doc(db, `users/${currentUser.uid}/cloudBackups/${item.id}`));
          } catch (delErr) {
            console.warn('Failed to delete oldest backup doc:', item.id, delErr);
          }
        }
      }

      // 2. Save the new backup document
      await setDoc(doc(db, `users/${currentUser.uid}/cloudBackups/${backupId}`), newBackup);
      setLastBackupTime(now);
      setNextBackupTime(new Date(now.getTime() + AUTO_BACKUP_INTERVAL_MS));
    } catch (err) {
      console.error('Failed to create cloud backup:', err);
      handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}/cloudBackups`);
    } finally {
      setIsBackingUp(false);
    }
  }, []);

  // Listen to Auth State and listen to backups collection in real-time
  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);

      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (authUser) {
        const q = query(
          collection(db, `users/${authUser.uid}/cloudBackups`),
          orderBy('timestamp', 'desc')
        );

        unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const loaded: CloudBackup[] = [];
          snapshot.forEach((docSnap) => {
            loaded.push(docSnap.data() as CloudBackup);
          });
          setBackups(loaded);

          if (loaded.length > 0) {
            const mostRecent = loaded[0];
            setLastBackupTime(new Date(mostRecent.timestamp));
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, `users/${authUser.uid}/cloudBackups`);
        });
      } else {
        setBackups([]);
        setLastBackupTime(null);
        setNextBackupTime(null);
      }
    });

    return () => {
      if (unsubscribeSnapshot) unsubscribeSnapshot();
      unsubscribeAuth();
    };
  }, []);

  // Schedule auto-backup every 30 minutes when user is logged in
  useEffect(() => {
    if (!user) return;

    // Set initial next backup estimate
    setNextBackupTime(new Date(Date.now() + AUTO_BACKUP_INTERVAL_MS));

    // Optional: If user just logged in and has 0 backups, trigger initial backup after 30 seconds
    const initialTimeout = setTimeout(() => {
      if (backups.length === 0 && auth.currentUser) {
        createBackup(true, '首次登入自動備份');
      }
    }, 15000);

    // 30-minute interval
    const interval = setInterval(() => {
      if (auth.currentUser) {
        createBackup(true);
      }
    }, AUTO_BACKUP_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [user, createBackup, backups.length]);

  // Restore specific cloud backup
  const restoreBackup = async (backup: CloudBackup) => {
    if (!backup || !backup.data) {
      throw new Error('備份資料無效或損毀');
    }

    const { classes: bClasses, tasks: bTasks, performance: bPerf, templates: bTemplates, calendarEvents: bCal, timetable: bTimetable } = backup.data;

    if (bClasses) await setClasses(bClasses);
    if (bTasks) await setTasks(bTasks);
    if (bPerf) await setPerformance(bPerf);
    if (bTemplates) await setTemplates(bTemplates);
    if (bCal) await setCalendarEvents(bCal);
    if (bTimetable && setTimetable) await setTimetable(bTimetable);
  };

  // Delete a specific backup
  const deleteBackup = async (backupId: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, `users/${currentUser.uid}/cloudBackups/${backupId}`));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${currentUser.uid}/cloudBackups/${backupId}`);
    }
  };

  return {
    backups,
    isBackingUp,
    lastBackupTime,
    nextBackupTime,
    createManualBackup: () => createBackup(false),
    restoreBackup,
    deleteBackup,
  };
}
