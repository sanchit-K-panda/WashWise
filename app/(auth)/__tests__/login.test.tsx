import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import LoginScreen from '../login';
import { useAuth } from '@/hooks/useAuth';

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

describe('LoginScreen', () => {
  const mockSignInWithOtp = jest.fn();
  const mockVerifyOtp = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      signInWithOtp: mockSignInWithOtp,
      verifyOtp: mockVerifyOtp,
      user: null,
      profile: null,
      isLoading: false,
      error: null,
    });
  });

  it('renders initial email step per DESIGN.md', async () => {
    const { getByText, getByTestId, getByLabelText } = await render(<LoginScreen />);

    expect(getByText('Sign in')).toBeTruthy();
    expect(getByTestId('email-input')).toBeTruthy();
    expect(getByLabelText('Send passcode')).toBeTruthy();
  });

  it('shows error if email format is invalid', async () => {
    const { getByTestId, getByLabelText, getByText } = await render(<LoginScreen />);

    await act(async () => {
      fireEvent.changeText(getByTestId('email-input'), 'invalid-email');
    });

    await act(async () => {
      fireEvent.press(getByLabelText('Send passcode'));
    });

    await waitFor(() => {
      expect(getByText(/Please enter a valid email address/)).toBeTruthy();
    });
    expect(mockSignInWithOtp).not.toHaveBeenCalled();
  });

  it('transitions to OTP step upon successful passcode request with any valid email', async () => {
    mockSignInWithOtp.mockResolvedValueOnce({ success: true });

    const { getByTestId, getByLabelText, getByText } = await render(<LoginScreen />);

    await act(async () => {
      fireEvent.changeText(getByTestId('email-input'), 'student@gmail.com');
    });

    await act(async () => {
      fireEvent.press(getByLabelText('Send passcode'));
    });

    await waitFor(() => {
      expect(mockSignInWithOtp).toHaveBeenCalledWith('student@gmail.com');
      expect(getByText('6-digit passcode')).toBeTruthy();
      expect(getByTestId('otp-input')).toBeTruthy();
    });
  });

  it('submits 6-digit passcode and verifies', async () => {
    mockSignInWithOtp.mockResolvedValueOnce({ success: true });
    mockVerifyOtp.mockResolvedValueOnce({ success: true });

    const { getByTestId, getByLabelText } = await render(<LoginScreen />);

    // Step 1: Send OTP
    await act(async () => {
      fireEvent.changeText(getByTestId('email-input'), 'student@college.edu');
    });

    await act(async () => {
      fireEvent.press(getByLabelText('Send passcode'));
    });

    // Step 2: Verify OTP
    await waitFor(() => {
      expect(getByTestId('otp-input')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.changeText(getByTestId('otp-input'), '654321');
    });

    await act(async () => {
      fireEvent.press(getByLabelText('Verify passcode'));
    });

    await waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalledWith('student@college.edu', '654321');
    });
  });
});
