import {
  validateCollegeEmail,
  requestOtp,
  verifyOtp,
  fetchOrCreateProfile,
  signOut,
  getCurrentSession,
} from '../auth';
import { supabase } from '../supabase';

jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: jest.fn(),
      verifyOtp: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    from: jest.fn(),
  },
}));

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateCollegeEmail', () => {
    it('accepts valid college.edu email addresses', () => {
      expect(validateCollegeEmail('student@college.edu').isValid).toBe(true);
      expect(validateCollegeEmail('john.doe@hostel.college.edu').isValid).toBe(true);
      expect(validateCollegeEmail('CARETAKER@COLLEGE.EDU').isValid).toBe(true);
    });

    it('rejects non-college domains', () => {
      const result = validateCollegeEmail('user@gmail.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('college.edu');
    });

    it('rejects invalid email formats', () => {
      expect(validateCollegeEmail('invalid-email').isValid).toBe(false);
      expect(validateCollegeEmail('@college.edu').isValid).toBe(false);
      expect(validateCollegeEmail('').isValid).toBe(false);
    });
  });

  describe('requestOtp', () => {
    it('rejects non-college email without calling Supabase', async () => {
      const result = await requestOtp('hacker@external.com');
      expect(result.success).toBe(false);
      expect(result.error).toContain('college.edu');
      expect(supabase.auth.signInWithOtp).not.toHaveBeenCalled();
    });

    it('calls supabase signInWithOtp for valid college email', async () => {
      (supabase.auth.signInWithOtp as jest.Mock).mockResolvedValueOnce({
        data: {},
        error: null,
      });

      const result = await requestOtp('student@college.edu');
      expect(result.success).toBe(true);
      expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'student@college.edu',
        options: { shouldCreateUser: true },
      });
    });

    it('returns error message if supabase signInWithOtp fails', async () => {
      (supabase.auth.signInWithOtp as jest.Mock).mockResolvedValueOnce({
        data: {},
        error: { message: 'Rate limit exceeded' },
      });

      const result = await requestOtp('student@college.edu');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Rate limit exceeded');
    });
  });

  describe('verifyOtp', () => {
    it('rejects incomplete tokens before calling Supabase', async () => {
      const result = await verifyOtp('student@college.edu', '123');
      expect(result.error).toContain('6-digit');
      expect(supabase.auth.verifyOtp).not.toHaveBeenCalled();
    });

    it('verifies OTP and loads profile', async () => {
      const mockUser = { id: 'u1', email: 'student@college.edu', user_metadata: {} };
      const mockSession = { access_token: 'abc', user: mockUser };
      const mockProfile = {
        id: 'u1',
        name: 'Student One',
        role: 'student',
        hostel_block_id: 'b1',
        created_at: '',
        updated_at: '',
      };

      (supabase.auth.verifyOtp as jest.Mock).mockResolvedValueOnce({
        data: { session: mockSession, user: mockUser },
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValueOnce({ data: mockProfile, error: null }),
      });

      const result = await verifyOtp('student@college.edu', '123456');
      expect(result.error).toBeUndefined();
      expect(result.session).toBe(mockSession);
      expect(result.profile).toEqual(mockProfile);
    });
  });

  describe('fetchOrCreateProfile', () => {
    it('creates default student profile if user does not exist in DB', async () => {
      const mockUser = { id: 'u2', email: 'newstudent@college.edu', user_metadata: {} };
      const createdProfile = {
        id: 'u2',
        name: 'newstudent',
        role: 'student',
        hostel_block_id: null,
        created_at: '',
        updated_at: '',
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValueOnce({ data: null, error: null }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValueOnce({ data: createdProfile, error: null }),
        });

      const result = await fetchOrCreateProfile(mockUser as never);
      expect(result.profile).toEqual(createdProfile);
    });
  });

  describe('signOut and getCurrentSession', () => {
    it('signs out user via Supabase', async () => {
      (supabase.auth.signOut as jest.Mock).mockResolvedValueOnce({ error: null });
      const result = await signOut();
      expect(result.error).toBeUndefined();
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('retrieves active session', async () => {
      const mockSession = { user: { id: 'u1' } };
      (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      const result = await getCurrentSession();
      expect(result.session).toBe(mockSession);
    });
  });
});
