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
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(collection(db, `users/${user.uid}/${collectionName}`));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          if (Array.isArray(defaultData)) {
            const items: any[] = [];
            snapshot.forEach((doc) => {
              items.push({ id: doc.id, ...doc.data() });
            });
            setData(items as unknown as T);
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
        return () => unsubscribe();
      } else {
        setData(defaultData);
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, [collectionName]);

  const updateData = async (newDataOrUpdater: any) => {
    const newData = typeof newDataOrUpdater === 'function' ? newDataOrUpdater(data) : newDataOrUpdater;
    const user = auth.currentUser;
    if (!user) {
      setData(newData); // fallback to local state if not logged in
      return;
    }
    try {
      if (Array.isArray(newData)) {
        // Find deleted
        const oldData = data as any[];
        const deleted = oldData.filter(o => !newData.find(n => n.id === o.id));
        for (const item of deleted) {
          await deleteDoc(doc(db, `users/${user.uid}/${collectionName}/${item.id}`));
        }
        for (const item of newData) {
          const { id, ...itemData } = item;
          // Firestore does not allow undefined values, we must clean the object
          const cleanData = Object.entries(itemData).reduce((acc, [key, value]) => {
            if (value !== undefined) {
              acc[key] = value;
            }
            return acc;
          }, {} as Record<string, any>);
          
          await setDoc(doc(db, `users/${user.uid}/${collectionName}/${id}`), cleanData);
        }
      } else {
        // Record object mapping (Performance)
        const oldKeys = Object.keys(data);
        const newKeys = Object.keys(newData);
        const deleted = oldKeys.filter(k => !newKeys.includes(k));
        for (const key of deleted) {
          await deleteDoc(doc(db, `users/${user.uid}/${collectionName}/${key}`));
        }
        for (const [key, records] of Object.entries(newData)) {
          await setDoc(doc(db, `users/${user.uid}/${collectionName}/${key}`), { records });
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/${collectionName}`);
    }
  };

  return [data, updateData, loading] as const;
}
