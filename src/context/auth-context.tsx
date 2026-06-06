"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState
} from "react";

import {
  onAuthStateChanged,
  type User
} from "firebase/auth";

import {
  doc,
  onSnapshot,
  type Unsubscribe
} from "firebase/firestore";

import {
  firebaseAuth,
  firebaseDb
} from "@/lib/firebase/client";

interface AuthContextType {
  user: User | null;
  profile: any;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true
});

export function AuthProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let profileUnsubscribe: Unsubscribe | null = null;

    const authUnsubscribe = onAuthStateChanged(
      firebaseAuth(),
      (firebaseUser) => {
        setUser(firebaseUser);

        if (profileUnsubscribe) {
          profileUnsubscribe();
          profileUnsubscribe = null;
        }

        if (!firebaseUser) {
          setProfile(null);
          setLoading(false);
          return;
        }

        profileUnsubscribe = onSnapshot(
          doc(firebaseDb(), "users", firebaseUser.uid),
          (snapshot) => {
            setProfile(snapshot.exists() ? snapshot.data() : null);
            setLoading(false);
          }
        );
      }
    );

    return () => {
      if (profileUnsubscribe) {
        profileUnsubscribe();
      }
      authUnsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}
