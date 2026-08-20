import { useState, useEffect } from 'react';
import { 
  collection, doc, onSnapshot, setDoc, deleteDoc, query 
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

export function useFirebaseData<T>(collectionName: string, defaultData: T) {
  const [data, setData] = useState<T>(defaultData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (user) {
        const q = query(collection(db, `users/${user.uid}/${collectionName}`));
        unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          if (Array.isArray(defaultData)) {
            const items: any[] = [];
            snapshot.forEach((doc) => {
              items.push({ id: doc.id, ...doc.data() });
            });
            setData(items as unknown as T);
          } else if (collectionName === 'timetable') {
            let timetableObj: any = defaultData || { periods: [], lessons: [] };
            snapshot.forEach((doc) => {
              if (doc.id === 'main') {
                const docData = doc.data();
                if (docData) {
                  timetableObj = {
                    periods: Array.isArray(docData.periods) ? docData.periods : ((defaultData as any)?.periods || []),
                    lessons: Array.isArray(docData.lessons) ? docData.lessons : ((defaultData as any)?.lessons || []),
                  };
                }
              }
            });
            setData(timetableObj as unknown as T);
          } else {
            const items: Record<string, any> = {};
            snapshot.forEach((doc) => {
              items[doc.id] = doc.data().records; // For performance mapping
            });
            setData(items as unknown as T);
          }
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/${collectionName}`);
          setLoading(false);
        });
      } else {
        setData(defaultData);
        setLoading(false);
      }
    });

    return () => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
      unsubscribeAuth();
    };
  }, [collectionName]);

  const updateData = async (newDataOrUpdater: any) => {
    const newData = typeof newDataOrUpdater === 'function' ? newDataOrUpdater(data) : newDataOrUpdater;
    
    // Always update React local state immediately for instant responsive UI
    setData(newData);

    const user = auth.currentUser;
    if (!user) {
      return;
    }

    try {
      if (Array.isArray(newData)) {
        const oldData = (Array.isArray(data) ? data : []) as any[];
        const deleted = oldData.filter(o => !newData.find(n => n.id === o.id));
        
        // Delete removed items in parallel
        await Promise.all(
          deleted.map(item => 
            deleteDoc(doc(db, `users/${user.uid}/${collectionName}/${item.id}`)).catch(err => {
              console.warn(`Failed to delete ${item.id}:`, err);
            })
          )
        );

        // Upsert new/updated items in parallel
        await Promise.all(
          newData.map(item => {
            const { id, ...itemData } = item;
            // Ensure safe ID string (only valid Firestore document ID chars)
            const safeDocId = String(id).replace(/[^a-zA-Z0-9_-]/g, '_');
            
            // Firestore does not allow undefined values, clean the object
            const cleanData = Object.entries(itemData).reduce((acc, [key, value]) => {
              if (value !== undefined) {
                acc[key] = value;
              }
              return acc;
            }, {} as Record<string, any>);

            return setDoc(doc(db, `users/${user.uid}/${collectionName}/${safeDocId}`), cleanData);
          })
        );
      } else if (collectionName === 'timetable') {
        const cleanData = JSON.parse(JSON.stringify(newData));
        await setDoc(doc(db, `users/${user.uid}/${collectionName}/main`), cleanData);
      } else {
        // Record object mapping (Performance)
        const oldKeys = Object.keys(data || {});
        const newKeys = Object.keys(newData || {});
        const deleted = oldKeys.filter(k => !newKeys.includes(k));
        
        await Promise.all(
          deleted.map(key => 
            deleteDoc(doc(db, `users/${user.uid}/${collectionName}/${key}`)).catch(err => {
              console.warn(`Failed to delete ${key}:`, err);
            })
          )
        );

        await Promise.all(
          Object.entries(newData).map(([key, records]) => 
            setDoc(doc(db, `users/${user.uid}/${collectionName}/${key}`), { records })
          )
        );
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/${collectionName}`);
    }
  };

  return [data, updateData, loading] as const;
}
