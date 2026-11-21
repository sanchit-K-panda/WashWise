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
    it('accepts any valid email address by default', () => {
      expect(validateCollegeEmail('student@college.edu').isValid).toBe(true);
      expect(validateCollegeEmail('john.doe@gmail.com').isValid).toBe(true);
      expect(validateCollegeEmail('user@yahoo.co.in').isValid).toBe(true);
      expect(validateCollegeEmail('CARETAKER@OUTLOOK.COM').isValid).toBe(true);
    });

    it('rejects invalid email formats', () => {
      expect(validateCollegeEmail('invalid-email').isValid).toBe(false);
      expect(validateCollegeEmail('@college.edu').isValid).toBe(false);
      expect(validateCollegeEmail('').isValid).toBe(false);
    });

    it('enforces specific domain when restricted domain is provided', () => {
      expect(validateCollegeEmail('student@college.edu', 'college.edu').isValid).toBe(true);
      const result = validateCollegeEmail('user@gmail.com', 'college.edu');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('college.edu');
    });
  });

  describe('requestOtp', () => {
    it('rejects invalid email format without calling Supabase', async () => {
      const result = await requestOtp('invalid-email-address');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Please enter a valid email address');
      expect(supabase.auth.signInWithOtp).not.toHaveBeenCalled();
    });

    it('calls supabase signInWithOtp for valid email', async () => {
      (supabase.auth.signInWithOtp as jest.Mock).mockResolvedValueOnce({
        data: {},
        error: null,
      });

      const result = await requestOtp('student@gmail.com');
      expect(result.success).toBe(true);
      expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'student@gmail.com',
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
