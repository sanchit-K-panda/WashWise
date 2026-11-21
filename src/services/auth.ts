import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { Profile, UserRole } from '@/types';

export const ALLOWED_EMAIL_DOMAIN =
  process.env.EXPO_PUBLIC_COLLEGE_EMAIL_DOMAIN ||
  process.env.EXPO_PUBLIC_ALLOWED_EMAIL_DOMAIN ||
  '*';

/**
 * Validates that an email is well-formed.
 * If allowedDomain is set to a specific domain (e.g. 'college.edu'), enforces that domain.
 * If allowedDomain is '*' or empty, permits any valid email address.
 */
export function validateCollegeEmail(
  email: string,
  allowedDomain: string = ALLOWED_EMAIL_DOMAIN
): { isValid: boolean; error?: string } {
  const trimmed = email.trim().toLowerCase();

  // Basic RFC 5322 regex validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return {
      isValid: false,
      error: 'Please enter a valid email address',
    };
  }

  const parts = trimmed.split('@');
  if (parts.length !== 2 || !parts[1].includes('.')) {
    return {
      isValid: false,
      error: 'Invalid email format',
    };
  }

  // If allowedDomain is '*' or empty, all domains are permitted
  if (!allowedDomain || allowedDomain === '*' || allowedDomain.toLowerCase() === 'all') {
    return { isValid: true };
  }

  const domain = parts[1];
  const normalizedAllowed = allowedDomain.toLowerCase().replace(/^@/, '');

  if (domain !== normalizedAllowed && !domain.endsWith(`.${normalizedAllowed}`)) {
    return {
      isValid: false,
      error: `Only @${normalizedAllowed} email addresses are permitted`,
    };
  }

  return { isValid: true };
}

/**
 * Request an email OTP for sign in. Restricted to authorized college domain.
 */
export async function requestOtp(email: string): Promise<{ success: boolean; error?: string }> {
  const validation = validateCollegeEmail(email);
  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }

  try {
    const trimmed = email.trim().toLowerCase();
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        shouldCreateUser: true,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send passcode';
    return { success: false, error: message };
  }
}

/**
 * Verifies the 6-digit OTP passcode with Supabase.
 */
export async function verifyOtp(
  email: string,
  token: string
): Promise<{
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  error?: string;
}> {
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedToken = token.trim();

  if (trimmedToken.length < 6) {
    return {
      session: null,
      user: null,
      profile: null,
      error: 'Please enter the 6-digit passcode',
    };
  }

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email: trimmedEmail,
      token: trimmedToken,
      type: 'email',
    });

    if (error) {
      return {
        session: null,
        user: null,
        profile: null,
        error: error.message || 'Invalid or expired passcode',
      };
    }

    if (!data.user) {
      return {
        session: null,
        user: null,
        profile: null,
        error: 'Authentication failed. Please try again.',
      };
    }

    // Load or initialize user profile
    const profileResult = await fetchOrCreateProfile(data.user);

    return {
      session: data.session,
      user: data.user,
      profile: profileResult.profile,
      error: profileResult.error,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Passcode verification failed';
    return { session: null, user: null, profile: null, error: message };
  }
}

/**
 * Fetches user profile from profiles table, creating a default student profile if needed.
 */
export async function fetchOrCreateProfile(
  user: User
): Promise<{ profile: Profile | null; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      return { profile: null, error: error.message };
    }

    if (data) {
      return { profile: data as Profile };
    }

    // Default profile for new signup if not yet seeded
    const fallbackName =
      (user.user_metadata?.full_name as string | undefined) ||
      user.email?.split('@')[0] ||
      'Student';

    const newProfile: {
      id: string;
      name: string;
      role: UserRole;
    } = {
      id: user.id,
      name: fallbackName,
      role: 'student',
    };

    const { data: inserted, error: insertError } = await supabase
      .from('profiles')
      .insert(newProfile)
      .select()
      .single();

    if (insertError) {
      return { profile: null, error: insertError.message };
    }

    return { profile: inserted as Profile };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch user profile';
    return { profile: null, error: message };
  }
}

/**
 * Signs the user out and clears session storage.
 */
export async function signOut(): Promise<{ error?: string }> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { error: error.message };
    }
    return {};
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sign out failed';
    return { error: message };
  }
}

/**
 * Retrieves the current active Supabase session.
 */
export async function getCurrentSession(): Promise<{
  session: Session | null;
  user: User | null;
}> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
      return { session: null, user: null };
    }
    return { session: data.session, user: data.session.user };
  } catch {
    return { session: null, user: null };
  }
}
