import { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';

export function AuthStatus() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
  }, []);

  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login failed', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-[#88968A] hidden sm:inline-block">{user.email}</span>
        <button 
          onClick={handleSignOut}
          className="text-sm px-3 py-1.5 rounded-lg border border-[#E9E3DB] text-[#88968A] hover:bg-[#F9F6F2] transition-colors"
        >
          登出 (Sign Out)
        </button>
      </div>
    );
  }

  return (
    <button 
      onClick={handleSignIn}
      className="text-sm px-4 py-1.5 rounded-lg bg-[#3D3833] text-white hover:bg-[#5C554D] transition-colors"
    >
      登入 (Sign in with Google)
    </button>
  );
}
