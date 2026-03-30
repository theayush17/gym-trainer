"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
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
const AUTH_INIT_TIMEOUT_MS = 4000;
const PROFILE_LOAD_TIMEOUT_MS = 5000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const loadProfile = useCallback(async (uid: string) => {
    try {
      const snapshot = await withTimeout(getDoc(doc(db, "users", uid)), PROFILE_LOAD_TIMEOUT_MS, "Profile load");

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

    setProfileLoading(true);
    await loadProfile(auth.currentUser.uid);
  }, [loadProfile]);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    const authTimeoutId = window.setTimeout(() => {
      if (!active) {
        return;
      }

      console.warn("Auth bootstrap timed out. Falling back to signed-out state.");
      setUser(null);
      setProfile(null);
      setAuthLoading(false);
      setProfileLoading(false);
    }, AUTH_INIT_TIMEOUT_MS);

    try {
      unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (!active) {
          return;
        }

        window.clearTimeout(authTimeoutId);

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
        setProfileLoading(true);
        loadProfile(firebaseUser.uid).catch(console.error);
      });
    } catch (error) {
      console.error("Auth listener error:", error);
      setUser(null);
      setProfile(null);
      setAuthLoading(false);
      setProfileLoading(false);
    }

    return () => {
      active = false;
      window.clearTimeout(authTimeoutId);
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
