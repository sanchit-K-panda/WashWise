import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import LoginScreen from '../login';
import { useAuth } from '@/hooks/useAuth';

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

describe('LoginScreen', () => {
  const mockSignInWithPassword = jest.fn();
  const mockSignUpWithPassword = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      signInWithPassword: mockSignInWithPassword,
      signUpWithPassword: mockSignUpWithPassword,
      user: null,
      profile: null,
      isLoading: false,
      error: null,
    });
  });

  it('renders student sign in form by default per DESIGN.md', async () => {
    const { getAllByText, getByTestId, getByLabelText } = await render(<LoginScreen />);

    expect(getAllByText('Sign in').length).toBeGreaterThan(0);
    expect(getByTestId('email-input')).toBeTruthy();
    expect(getByTestId('password-input')).toBeTruthy();
    expect(getByLabelText('Sign in')).toBeTruthy();
  });

  it('validates email format before submitting student sign in', async () => {
    const { getByTestId, getByLabelText, getByText } = await render(<LoginScreen />);

    await act(async () => {
      fireEvent.changeText(getByTestId('email-input'), 'invalid-email');
      fireEvent.changeText(getByTestId('password-input'), 'password123');
    });

    await act(async () => {
      fireEvent.press(getByLabelText('Sign in'));
    });

    await waitFor(() => {
      expect(getByText(/Please enter a valid email address/)).toBeTruthy();
    });
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it('submits student sign in with email and password', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({ success: true });

    const { getByTestId, getByLabelText } = await render(<LoginScreen />);

    await act(async () => {
      fireEvent.changeText(getByTestId('email-input'), 'student@gmail.com');
      fireEvent.changeText(getByTestId('password-input'), 'secret123');
    });

    await act(async () => {
      fireEvent.press(getByLabelText('Sign in'));
    });

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith('student@gmail.com', 'secret123');
    });
  });

  it('switches to register mode and registers a new student', async () => {
    mockSignUpWithPassword.mockResolvedValueOnce({ success: true });

    const { getByTestId, getByLabelText } = await render(<LoginScreen />);

    // Switch to register mode
    await act(async () => {
      fireEvent.press(getByLabelText('Switch to registration'));
    });

    await waitFor(() => {
      expect(getByTestId('name-input')).toBeTruthy();
      expect(getByLabelText('Create account')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.changeText(getByTestId('name-input'), 'Rahul Sharma');
      fireEvent.changeText(getByTestId('email-input'), 'rahul@gmail.com');
      fireEvent.changeText(getByTestId('password-input'), 'rahul123');
    });

    await act(async () => {
      fireEvent.press(getByLabelText('Create account'));
    });

    await waitFor(() => {
      expect(mockSignUpWithPassword).toHaveBeenCalledWith(
        'Rahul Sharma',
        'rahul@gmail.com',
        'rahul123'
      );
    });
  });

  it('switches to staff sign in and signs in with caretaker credentials', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({ success: true });

    const { getByTestId, getByLabelText, getByText } = await render(<LoginScreen />);

    // Switch to Staff mode
    await act(async () => {
      fireEvent.press(getByTestId('staff-toggle-button'));
    });

    await waitFor(() => {
      expect(getByText('Staff sign in')).toBeTruthy();
      expect(getByTestId('username-input')).toBeTruthy();
      expect(getByTestId('password-input')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.changeText(getByTestId('username-input'), 'username_1');
      fireEvent.changeText(getByTestId('password-input'), 'caretaker123');
    });

    await act(async () => {
      fireEvent.press(getByLabelText('Sign in'));
    });

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith('username_1', 'caretaker123');
    });
  });
});
