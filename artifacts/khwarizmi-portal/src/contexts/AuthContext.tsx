import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db, TEACHER_EMAIL } from '@/lib/firebase';
import type { UserData } from '@/lib/types';

interface AuthContextType {
  firebaseUser: User | null;
  userData: UserData | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  userData: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubUser: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubUser) { unsubUser(); unsubUser = null; }

      if (user) {
        setFirebaseUser(user);
        // Ensure teacher doc is always synced
        if (user.email?.toLowerCase() === TEACHER_EMAIL.toLowerCase()) {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email,
            role: 'teacher',
            approved: true
          }, { merge: true });
        }
        unsubUser = onSnapshot(doc(db, 'users', user.uid), (snap) => {
          if (snap.exists()) {
            setUserData(snap.data() as UserData);
          } else {
            setUserData(null);
          }
          setLoading(false);
        });
      } else {
        setFirebaseUser(null);
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubUser) unsubUser();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ firebaseUser, userData, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
