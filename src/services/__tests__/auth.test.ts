import {
  validateCollegeEmail,
  requestOtp,
  verifyOtp,
  signInWithPassword,
  signUpWithPassword,
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
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
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

  describe('signInWithPassword', () => {
    it('authenticates caretaker instantly with username_1 / caretaker123', async () => {
      const result = await signInWithPassword('username_1', 'caretaker123');
      expect(result.error).toBeUndefined();
      expect(result.profile?.role).toBe('caretaker');
      expect(result.profile?.name).toBe('Hostel Caretaker');
      expect(result.session).toBeTruthy();
    });

    it('rejects wrong caretaker password', async () => {
      const result = await signInWithPassword('username_1', 'wrongpass');
      expect(result.error).toBe('Invalid caretaker password');
      expect(result.session).toBeNull();
    });

    it('validates student email and password length', async () => {
      const res1 = await signInWithPassword('invalid-email', '123456');
      expect(res1.error).toContain('valid email address');

      const res2 = await signInWithPassword('student@college.edu', '123');
      expect(res2.error).toContain('at least 6 characters');
    });

    it('authenticates student via Supabase', async () => {
      const mockUser = { id: 's1', email: 'student@college.edu', user_metadata: {} };
      const mockSession = { access_token: 'token123', user: mockUser };
      const mockProfile = {
        id: 's1',
        name: 'student',
        role: 'student',
        hostel_block_id: 'a0000000-0000-0000-0000-000000000001',
        created_at: '',
        updated_at: '',
      };

      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce({
        data: { session: mockSession, user: mockUser },
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValueOnce({ data: mockProfile, error: null }),
      });

      const result = await signInWithPassword('student@college.edu', 'password123');
      expect(result.error).toBeUndefined();
      expect(result.profile?.role).toBe('student');
    });
  });

  describe('signUpWithPassword', () => {
    it('validates name, email, and password length', async () => {
      const res1 = await signUpWithPassword('', 'student@college.edu', '123456');
      expect(res1.error).toContain('enter your name');

      const res2 = await signUpWithPassword('John', 'invalid', '123456');
      expect(res2.error).toContain('valid email address');

      const res3 = await signUpWithPassword('John', 'student@college.edu', '123');
      expect(res3.error).toContain('at least 6 characters');
    });

    it('registers new student via Supabase', async () => {
      const mockUser = {
        id: 's2',
        email: 'new@college.edu',
        user_metadata: { full_name: 'New Student' },
      };
      const mockSession = { access_token: 'token456', user: mockUser };
      const mockProfile = {
        id: 's2',
        name: 'New Student',
        role: 'student',
        hostel_block_id: 'a0000000-0000-0000-0000-000000000001',
        created_at: '',
        updated_at: '',
      };

      (supabase.auth.signUp as jest.Mock).mockResolvedValueOnce({
        data: { session: mockSession, user: mockUser },
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValueOnce({ data: mockProfile, error: null }),
      });

      const result = await signUpWithPassword('New Student', 'new@college.edu', 'secure123');
      expect(result.error).toBeUndefined();
      expect(result.profile?.name).toBe('New Student');
    });
  });

  describe('fetchOrCreateProfile', () => {
    it('creates default student profile if user does not exist in DB', async () => {
      const mockUser = { id: 'u2', email: 'newstudent@college.edu', user_metadata: {} };
      const createdProfile = {
        id: 'u2',
        name: 'newstudent',
        role: 'student',
        hostel_block_id: 'a0000000-0000-0000-0000-000000000001',
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
