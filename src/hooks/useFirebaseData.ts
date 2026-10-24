import { useState, useEffect, useRef } from 'react';
import { 
  collection, doc, onSnapshot, setDoc, deleteDoc, query 
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';

const retryWithBackoff = async <TResult>(fn: () => Promise<TResult>, retries = 3, delay = 1000): Promise<TResult> => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryWithBackoff(fn, retries - 1, delay * 2);
  }
};

export function useFirebaseData<T>(collectionName: string, defaultData: T) {
  const storageKey = `edutrack_v2_${collectionName}`;

  const [data, setData] = useState<T>(() => {
    try {
      const local = localStorage.getItem(storageKey);
      if (local) {
        return JSON.parse(local);
      }
    } catch (e) {
      console.warn('Error reading localStorage for', collectionName, e);
    }
    return defaultData;
  });

  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Keep latest data in ref for cleanup/debounced flush and beforeunload
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const syncToFirestore = async (currentData: T) => {
    let user = auth.currentUser;
    if (!user) {
      try {
        const cred = await signInAnonymously(auth);
        user = cred.user;
      } catch (e) {
        console.warn('Could not authenticate for Firestore write:', e);
        return;
      }
    }

    if (!user) return;

    setIsSyncing(true);
    setSyncError(null);

    try {
      await retryWithBackoff(async () => {
        if (Array.isArray(currentData)) {
          await Promise.all(
            currentData.map(item => {
              const { id, ...itemData } = item as any;
              const safeDocId = String(id || 'item').replace(/[^a-zA-Z0-9_-]/g, '_');
              
              const cleanData = Object.entries(itemData).reduce((acc, [key, value]) => {
                if (value !== undefined) {
                  acc[key] = value;
                }
                return acc;
              }, {} as Record<string, any>);

              return setDoc(doc(db, `users/${user!.uid}/${collectionName}/${safeDocId}`), cleanData);
            })
          );
        } else if (collectionName === 'timetable') {
          const cleanData = JSON.parse(JSON.stringify(currentData));
          await setDoc(doc(db, `users/${user!.uid}/${collectionName}/main`), cleanData);
        } else {
          await Promise.all(
            Object.entries(currentData as Record<string, any>).map(([key, records]) => 
              setDoc(doc(db, `users/${user!.uid}/${collectionName}/${key}`), { records })
            )
          );
        }
      }, 3, 1000);
      setSyncError(null);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('edutrack-sync-success', { 
          detail: { collection: collectionName } 
        }));
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const isQuota = errMsg.includes('quota') || errMsg.includes('resource-exhausted');
      const friendlyMsg = isQuota
        ? '雲端儲存配額已達上限，資料已安全暫存於本機。'
        : '雲端同步寫入失敗，資料已安全暫存於本機。';
      setSyncError(friendlyMsg);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('edutrack-sync-error', { 
          detail: { 
            collection: collectionName, 
            error: errMsg,
            friendlyMsg,
            isQuota 
          } 
        }));
      }
      try {
        handleFirestoreError(err, OperationType.WRITE, `users/${user!.uid}/${collectionName}`);
      } catch (logErr) {
        console.warn('Firestore write error recorded:', logErr);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle beforeunload to flush pending writes immediately before refresh/close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
        syncToFirestore(dataRef.current);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, [collectionName]);

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      let activeUser = user;
      if (!activeUser) {
        try {
          const cred = await signInAnonymously(auth);
          activeUser = cred.user;
        } catch (err) {
          console.warn('Anonymous sign-in failed, using local storage fallback:', err);
          setLoading(false);
          return;
        }
      }

      if (activeUser) {
        const q = query(collection(db, `users/${activeUser.uid}/${collectionName}`));
        unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          if (Array.isArray(defaultData)) {
            const items: any[] = [];
            snapshot.forEach((doc) => {
              items.push({ id: doc.id, ...doc.data() });
            });
            if (items.length > 0) {
              setData(items as unknown as T);
              localStorage.setItem(storageKey, JSON.stringify(items));
            } else {
              const local = localStorage.getItem(storageKey);
              if (local) {
                try {
                  const parsedLocal = JSON.parse(local);
                  if (Array.isArray(parsedLocal) && parsedLocal.length > 0) {
                    setData(parsedLocal as unknown as T);
                    parsedLocal.forEach(async (item) => {
                      const { id, ...itemData } = item;
                      const safeDocId = String(id || 'item').replace(/[^a-zA-Z0-9_-]/g, '_');
                      const cleanData = Object.entries(itemData).reduce((acc, [k, v]) => {
                        if (v !== undefined) acc[k] = v;
                        return acc;
                      }, {} as Record<string, any>);
                      await setDoc(doc(db, `users/${activeUser!.uid}/${collectionName}/${safeDocId}`), cleanData).catch(() => {});
                    });
                  }
                } catch {}
              }
            }
          } else if (collectionName === 'timetable') {
            let timetableObj: any = null;
            snapshot.forEach((doc) => {
              if (doc.id === 'main') {
                timetableObj = doc.data();
              }
            });
            if (timetableObj) {
              const merged = {
                periods: Array.isArray(timetableObj.periods) ? timetableObj.periods : ((defaultData as any)?.periods || []),
                lessons: Array.isArray(timetableObj.lessons) ? timetableObj.lessons : ((defaultData as any)?.lessons || []),
              };
              setData(merged as unknown as T);
              localStorage.setItem(storageKey, JSON.stringify(merged));
            } else {
              const local = localStorage.getItem(storageKey);
              if (local) {
                try {
                  setData(JSON.parse(local));
                } catch {}
              }
            }
          } else {
            const items: Record<string, any> = {};
            let hasDocs = false;
            snapshot.forEach((doc) => {
              hasDocs = true;
              items[doc.id] = doc.data().records;
            });
            if (hasDocs) {
              setData(items as unknown as T);
              localStorage.setItem(storageKey, JSON.stringify(items));
            } else {
              const local = localStorage.getItem(storageKey);
              if (local) {
                try {
                  setData(JSON.parse(local));
                } catch {}
              }
            }
          }
          setLoading(false);
        }, (error) => {
          setLoading(false);
          const errMsg = error?.message || String(error);
          const isQuota = errMsg.includes('quota') || errMsg.includes('resource-exhausted');
          const friendlyMsg = isQuota
            ? '雲端儲存配額已達上限，已切換至本機模式。'
            : '無法連接 Firebase 雲端伺服器，已切換至本機模式。';
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('edutrack-sync-error', { 
              detail: { 
                collection: collectionName, 
                error: errMsg,
                friendlyMsg,
                isQuota 
              } 
            }));
          }
          try {
            handleFirestoreError(error, OperationType.LIST, `users/${activeUser!.uid}/${collectionName}`);
          } catch (logErr) {
            console.warn('Firestore snapshot error recorded:', logErr);
          }
        });
      }
    });

    return () => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
      unsubscribeAuth();
    };
  }, [collectionName]);

  const updateData = (newDataOrUpdater: any) => {
    const newData = typeof newDataOrUpdater === 'function' ? newDataOrUpdater(data) : newDataOrUpdater;
    
    setData(newData);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newData));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      syncToFirestore(newData);
    }, 400);
  };

  const ret = [data, updateData, loading] as const;
  (ret as any).syncError = syncError;
  (ret as any).isSyncing = isSyncing;
  return ret;
}
