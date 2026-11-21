import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { useRouter, useSegments } from 'expo-router';
import { supabase } from '@/services/supabase';
import {
  requestOtp as serviceRequestOtp,
  verifyOtp as serviceVerifyOtp,
  signInWithPassword as serviceSignInWithPassword,
  signUpWithPassword as serviceSignUpWithPassword,
  fetchOrCreateProfile,
  signOut as serviceSignOut,
  getCurrentSession,
} from '@/services/auth';
import { Profile, UserRole } from '@/types';

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: UserRole | null;
  isLoading: boolean;
  error: string | null;
  signInWithOtp: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (email: string, token: string) => Promise<{ success: boolean; error?: string }>;
  signInWithPassword: (
    identifier: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  signUpWithPassword: (
    name: string,
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useProtectedRoute(user: User | null, profile: Profile | null, isLoading: boolean) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inStudentGroup = segments[0] === '(student)';
    const inCaretakerGroup = segments[0] === '(caretaker)';

    // Not authenticated
    if (!user || !profile) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
      return;
    }

    // Authenticated: route according to profile role
    if (profile.role === 'student') {
      if (inAuthGroup || inCaretakerGroup || !segments[0]) {
        router.replace('/(student)');
      }
    } else if (profile.role === 'caretaker') {
      if (inAuthGroup || inStudentGroup || !segments[0]) {
        router.replace('/(caretaker)');
      }
    }
  }, [user, profile, isLoading, segments, router]);
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Restore session on mount
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const { session: currentSession, user: currentUser } = await getCurrentSession();
        if (!isMounted) return;

        if (currentSession && currentUser) {
          setSession(currentSession);
          setUser(currentUser);
          const profileResult = await fetchOrCreateProfile(currentUser);
          if (isMounted) {
            setProfile(profileResult.profile);
            if (profileResult.error) {
              setError(profileResult.error);
            }
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Session restoration failed');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    restoreSession();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT' || !newSession) {
        setSession(null);
        setUser(null);
        setProfile(null);
        setIsLoading(false);
        return;
      }

      setSession(newSession);
      setUser(newSession.user);

      if (newSession.user) {
        const profileResult = await fetchOrCreateProfile(newSession.user);
        if (isMounted) {
          setProfile(profileResult.profile);
        }
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Enforce route protection
  useProtectedRoute(user, profile, isLoading);

  const signInWithOtp = useCallback(async (email: string) => {
    setError(null);
    const result = await serviceRequestOtp(email);
    if (!result.success && result.error) {
      setError(result.error);
    }
    return result;
  }, []);

  const verifyOtp = useCallback(async (email: string, token: string) => {
    setError(null);
    const result = await serviceVerifyOtp(email, token);
    if (result.error) {
      setError(result.error);
      return { success: false, error: result.error };
    }

    setSession(result.session);
    setUser(result.user);
    setProfile(result.profile);
    return { success: true };
  }, []);

  const signInWithPassword = useCallback(async (identifier: string, password: string) => {
    setError(null);
    const result = await serviceSignInWithPassword(identifier, password);
    if (result.error) {
      setError(result.error);
      return { success: false, error: result.error };
    }
    setSession(result.session);
    setUser(result.user);
    setProfile(result.profile);
    return { success: true };
  }, []);

  const signUpWithPassword = useCallback(async (name: string, email: string, password: string) => {
    setError(null);
    const result = await serviceSignUpWithPassword(name, email, password);
    if (result.error) {
      setError(result.error);
      return { success: false, error: result.error };
    }
    setSession(result.session);
    setUser(result.user);
    setProfile(result.profile);
    return { success: true };
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    await serviceSignOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const result = await fetchOrCreateProfile(user);
    if (result.profile) {
      setProfile(result.profile);
    }
  }, [user]);

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      role: profile?.role ?? null,
      isLoading,
      error,
      signInWithOtp,
      verifyOtp,
      signInWithPassword,
      signUpWithPassword,
      signOut,
      refreshProfile,
    }),
    [
      session,
      user,
      profile,
      isLoading,
      error,
      signInWithOtp,
      verifyOtp,
      signInWithPassword,
      signUpWithPassword,
      signOut,
      refreshProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default useAuth;
