import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { AccountView } from '../AccountView';
import * as useAuthModule from '@/hooks/useAuth';
import * as useMachinesModule from '@/hooks/useMachines';

const mockSignOut = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: jest.fn(),
  }),
}));

describe('AccountView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: { id: 'u1', email: 'sanchit@college.edu' } as any,
      profile: { id: 'u1', name: 'Sanchit', role: 'student', hostel_block_id: 'b1' },
      role: 'student',
      session: {} as any,
      isLoading: false,
      error: null,
      signInWithOtp: jest.fn(),
      verifyOtp: jest.fn(),
      signInWithPassword: jest.fn(),
      signUpWithPassword: jest.fn(),
      signOut: mockSignOut,
      refreshProfile: jest.fn(),
    });

    jest.spyOn(useMachinesModule, 'useMachines').mockReturnValue({
      machines: [],
      block: { id: 'b1', name: 'Block A' },
      totalCount: 0,
      availableCount: 0,
      inUseCount: 0,
      brokenCount: 0,
      maintenanceCount: 0,
      isLoading: false,
      isRefetching: false,
      isError: false,
      error: null,
      isOffline: false,
      lastSyncedAt: new Date(),
      refetch: jest.fn(),
    });
  });

  it('renders student name, role, email and block', async () => {
    const { getByText } = await render(<AccountView />);

    expect(getByText('Sanchit')).toBeTruthy();
    expect(getByText('Student')).toBeTruthy();
    expect(getByText('sanchit@college.edu')).toBeTruthy();
    expect(getByText('Block A')).toBeTruthy();
  });

  it('renders caretaker role subtitle when user is caretaker', async () => {
    jest.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: { id: 'c1', email: 'username_1@washwise.app' } as any,
      profile: { id: 'c1', name: 'Caretaker', role: 'caretaker', hostel_block_id: 'b1' },
      role: 'caretaker',
      session: {} as any,
      isLoading: false,
      error: null,
      signInWithOtp: jest.fn(),
      verifyOtp: jest.fn(),
      signInWithPassword: jest.fn(),
      signUpWithPassword: jest.fn(),
      signOut: mockSignOut,
      refreshProfile: jest.fn(),
    });

    const { getByText } = await render(<AccountView />);

    expect(getByText('Caretaker')).toBeTruthy();
    expect(getByText('Caretaker · Block A')).toBeTruthy();
  });

  it('opens sign out sheet and confirms sign out', async () => {
    const { getByLabelText, findByText } = await render(<AccountView />);

    await act(async () => {
      fireEvent.press(getByLabelText('Sign out'));
    });
    expect(await findByText('Sign out?')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByLabelText('Confirm sign out'));
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
  });

  it('opens how it works modal', async () => {
    const { getByLabelText, findByText } = await render(<AccountView />);

    await act(async () => {
      fireEvent.press(getByLabelText('How WashWise works'));
    });
    expect(
      await findByText('Tap any available washing machine in your hostel block.')
    ).toBeTruthy();
  });
});
