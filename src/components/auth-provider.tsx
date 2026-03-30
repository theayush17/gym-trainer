"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { getSubscriptionState, type SubscriptionState, type UserProfile } from "@/lib/auth";
import { STORAGE_UID_KEY } from "@/lib/plans";

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  authLoading: boolean;
  profileLoading: boolean;
  loading: boolean;
  subscriptionState: SubscriptionState;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  const loadProfile = useCallback(async (uid: string) => {
    setProfileLoading(true);

    try {
      const { doc, getDoc } = await import("firebase/firestore");
      const snapshot = await getDoc(doc(db, "users", uid));

      if (!snapshot.exists()) {
        setProfile(null);
        console.log("No Firestore user document found for UID:", uid);
        return;
      }

      setProfile(snapshot.data() as UserProfile);
      console.log("Loaded Firestore profile for UID:", uid);
    } catch (error) {
      console.error("Profile load error:", error);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!auth.currentUser?.uid) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    await loadProfile(auth.currentUser.uid);
  }, [loadProfile]);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    const attachAuthListener = async () => {
      try {
        const { onAuthStateChanged } = await import("firebase/auth");

        unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (!active) {
            return;
          }

          setUser(firebaseUser);
          setAuthLoading(false);

          if (!firebaseUser) {
            localStorage.removeItem(STORAGE_UID_KEY);
            setProfile(null);
            setProfileLoading(false);
            console.log("No active Firebase session");
            return;
          }

          localStorage.setItem(STORAGE_UID_KEY, firebaseUser.uid);
          await loadProfile(firebaseUser.uid);
        });
      } catch (error) {
        console.error("Auth listener error:", error);
        setUser(null);
        setProfile(null);
        setAuthLoading(false);
        setProfileLoading(false);
      }
    };

    void attachAuthListener();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      authLoading,
      profileLoading,
      loading: authLoading || profileLoading,
      subscriptionState: getSubscriptionState(profile?.subscription),
      refreshProfile
    }),
    [authLoading, profile, profileLoading, refreshProfile, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuthContext must be used inside AuthProvider");
  }

  return context;
}
