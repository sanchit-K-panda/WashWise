import { useState } from 'react';
import { View, TextInput } from 'react-native';
import { Mail, ArrowRight } from 'lucide-react-native';
import { colors } from '@/theme/tokens';
import { Screen, Text, Button } from '@/components/ui';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [otp, setOtp] = useState('');

  const handleSendOtp = () => {
    if (email.trim().length > 0) {
      setStep('otp');
    }
  };

  return (
    <Screen
      header={{
        title: 'Sign in',
        subtitle: 'Use your college email address to receive a one-time passcode.',
      }}
      stickyFooter={
        <Button
          accessibilityLabel={step === 'email' ? 'Send passcode' : 'Verify passcode'}
          onPress={step === 'email' ? handleSendOtp : undefined}
          rightIcon={<ArrowRight size={18} strokeWidth={1.75} color="#FFFFFF" />}
        >
          {step === 'email' ? 'Send passcode' : 'Verify'}
        </Button>
      }
    >
      <View className="mt-4">
        <Text variant="caption" style={{ marginBottom: 8 }}>
          College email
        </Text>
        <View className="flex-row items-center bg-surface border border-hairline rounded-input px-3 h-12">
          <Mail size={20} strokeWidth={1.75} color={colors.ink.muted} />
          <TextInput
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="student@college.edu"
            placeholderTextColor={colors.ink.muted}
            className="flex-1 font-sans text-ink text-[15px] ml-2"
            editable={step === 'email'}
          />
        </View>

        {step === 'otp' && (
          <View className="mt-6">
            <Text variant="caption" style={{ marginBottom: 8 }}>
              6-digit passcode
            </Text>
            <View className="flex-row items-center bg-surface border border-hairline rounded-input px-3 h-12">
              <TextInput
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="000000"
                placeholderTextColor={colors.ink.muted}
                className="flex-1 font-mono-semibold text-ink text-[17px] tracking-widest text-center"
              />
            </View>
          </View>
        )}
      </View>
    </Screen>
  );
}
