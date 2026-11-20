import { useState } from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { Mail, ArrowRight, AlertCircle, KeyRound } from 'lucide-react-native';
import { colors } from '@/theme/tokens';
import { Screen, Text, Button } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { validateCollegeEmail, ALLOWED_EMAIL_DOMAIN } from '@/services/auth';

export default function LoginScreen() {
  const { signInWithOtp, verifyOtp } = useAuth();

  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const handleSendOtp = async () => {
    setErrorMessage(null);
    setResendStatus(null);

    const validation = validateCollegeEmail(email);
    if (!validation.isValid) {
      setErrorMessage(validation.error || 'Please enter a valid college email address');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signInWithOtp(email.trim());
      if (result.success) {
        setStep('otp');
      } else {
        setErrorMessage(result.error || 'Failed to send passcode. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    setErrorMessage(null);

    if (otp.trim().length !== 6) {
      setErrorMessage('Please enter the complete 6-digit passcode');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await verifyOtp(email.trim(), otp.trim());
      if (!result.success) {
        setErrorMessage(result.error || 'Invalid or expired passcode. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const result = await signInWithOtp(email.trim());
      if (result.success) {
        setResendStatus('A new passcode has been sent to your email.');
      } else {
        setErrorMessage(result.error || 'Failed to resend passcode');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeEmail = () => {
    setStep('email');
    setOtp('');
    setErrorMessage(null);
    setResendStatus(null);
  };

  return (
    <Screen
      header={{
        title: 'Sign in',
        subtitle:
          step === 'email'
            ? `Use your @${ALLOWED_EMAIL_DOMAIN} email to access hostel laundry.`
            : `Enter the 6-digit passcode sent to ${email}.`,
      }}
      stickyFooter={
        <View className="space-y-3 gap-2">
          {step === 'email' ? (
            <Button
              loading={isSubmitting}
              onPress={handleSendOtp}
              accessibilityLabel="Send passcode"
              rightIcon={<ArrowRight size={18} strokeWidth={1.75} color="#FFFFFF" />}
            >
              Send passcode
            </Button>
          ) : (
            <>
              <Button
                loading={isSubmitting}
                onPress={handleVerifyOtp}
                accessibilityLabel="Verify passcode"
              >
                Verify passcode
              </Button>

              <View className="flex-row items-center justify-between mt-1">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Change email address"
                  onPress={handleChangeEmail}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  className="py-3 px-1 min-h-[48px] justify-center active:opacity-70"
                >
                  <Text variant="caption" color="accent">
                    Change email
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Resend passcode"
                  disabled={isSubmitting}
                  onPress={handleResend}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  className="py-3 px-1 min-h-[48px] justify-center active:opacity-70"
                >
                  <Text variant="caption" color="muted">
                    Resend code
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      }
    >
      {/* Calm Error Alert (Anti-slop, left-aligned) */}
      {errorMessage && (
        <View
          accessibilityRole="alert"
          accessibilityLabel={errorMessage}
          className="flex-row items-center gap-2.5 p-3.5 bg-surface border border-status-broken rounded-md mb-4"
        >
          <AlertCircle size={18} strokeWidth={1.75} color={colors.status.broken} />
          <Text variant="caption" color="broken" style={{ flex: 1 }}>
            {errorMessage}
          </Text>
        </View>
      )}

      {/* Resend status banner */}
      {resendStatus && (
        <View
          accessibilityRole="text"
          className="flex-row items-center gap-2.5 p-3 bg-surface border border-hairline rounded-md mb-4"
        >
          <Text variant="caption" color="available">
            {resendStatus}
          </Text>
        </View>
      )}

      {step === 'email' ? (
        <View className="mt-2">
          <Text variant="caption" style={{ marginBottom: 8 }}>
            College email address
          </Text>
          <View className="flex-row items-center bg-surface border border-hairline rounded-input px-3 h-12">
            <Mail size={20} strokeWidth={1.75} color={colors.ink.muted} />
            <TextInput
              testID="email-input"
              accessibilityLabel="College email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={`student@${ALLOWED_EMAIL_DOMAIN}`}
              placeholderTextColor={colors.ink.muted}
              className="flex-1 font-sans text-ink text-[15px] ml-2"
              editable={!isSubmitting}
              onSubmitEditing={handleSendOtp}
            />
          </View>
          <Text variant="caption" color="muted" style={{ marginTop: 6 }}>
            Passcode will be delivered directly to your inbox.
          </Text>
        </View>
      ) : (
        <View className="mt-2">
          <Text variant="caption" style={{ marginBottom: 8 }}>
            6-digit passcode
          </Text>
          <View className="flex-row items-center bg-surface border border-hairline rounded-input px-3 h-12">
            <KeyRound size={20} strokeWidth={1.75} color={colors.ink.muted} />
            <TextInput
              testID="otp-input"
              accessibilityLabel="6-digit passcode"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
              placeholderTextColor={colors.ink.muted}
              className="flex-1 font-mono-semibold text-ink text-[20px] tracking-widest text-center"
              editable={!isSubmitting}
              onSubmitEditing={handleVerifyOtp}
              autoFocus
            />
          </View>
          <Text variant="caption" color="muted" style={{ marginTop: 6 }}>
            Check your spam folder if passcode does not appear within 60 seconds.
          </Text>
        </View>
      )}
    </Screen>
  );
}
