"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState
} from "react";

import {
  onAuthStateChanged,
  User
} from "firebase/auth";

import {
  doc,
  onSnapshot
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

const AuthContext =
  createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true
  });

export function AuthProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] =
    useState<User | null>(null);

  const [profile, setProfile] =
    useState<any>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        firebaseAuth(),
        (firebaseUser) => {
          setUser(firebaseUser);

          if (!firebaseUser) {
            setProfile(null);
            setLoading(false);
            return;
          }

          const profileUnsubscribe =
            onSnapshot(
              doc(
                firebaseDb(),
                "users",
                firebaseUser.uid
              ),
              (snapshot) => {
                setProfile(
                  snapshot.exists()
                    ? snapshot.data()
                    : null
                );

                setLoading(false);
              }
            );

          return profileUnsubscribe;
        }
      );

    return unsubscribe;
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
