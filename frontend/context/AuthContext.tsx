"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { 
  User, 
  onAuthStateChanged, 
  signOut as firebaseSignOut, 
  GoogleAuthProvider, 
  signInWithPopup, 
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { fetchUserSettings, updateUserSettings } from "@/api/user";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  user: User | null;
  dbUser: any | null; // Database user profile
  loading: boolean;
  authLoading: boolean;
  profileLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  updateUserSetting: (key: string, value: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();

  // Fetch DB Profile when Firebase user is set
  const {
    data: dbUser,
    isLoading: profileLoading,
  } = useQuery({
    queryKey: ["userProfile", currentUser?.uid],
    queryFn: fetchUserSettings,
    enabled: !!currentUser,
    staleTime: 30 * 1000, // 30 seconds
    retry: 1,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);

      if (!user) {
        queryClient.removeQueries({ queryKey: ["userProfile"] });
      }
    });

    return () => unsubscribe();
  }, [queryClient]);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    queryClient.clear();
    router.push("/login");
  }, [queryClient, router]);

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    router.push("/");
  }, [router]);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    router.push("/");
  }, [router]);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
    }
    router.push("/");
  }, [router]);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  }, []);

  const updateUserSetting = useCallback(async (key: string, value: any) => {
    if (!currentUser) throw new Error("No authenticated user");
    await updateUserSettings(key, value);
    queryClient.invalidateQueries({ queryKey: ["userProfile", currentUser.uid] });
  }, [currentUser, queryClient]);

  const value = useMemo(() => ({
    user: currentUser,
    dbUser: dbUser || null,
    loading: authLoading || (!!currentUser && profileLoading), // combined loading
    authLoading,
    profileLoading,
    isAuthenticated: !!currentUser,
    signOut,
    signInWithGoogle,
    resetPassword,
    signIn,
    signUp,
    updateUserSetting
  }), [
    currentUser, dbUser, authLoading, profileLoading, signOut, signInWithGoogle, resetPassword, signIn, signUp, updateUserSetting
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
