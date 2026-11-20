import { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, ArrowRight } from 'lucide-react-native';
import { colors } from '@/theme/tokens';

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
    <SafeAreaView className="flex-1 bg-bg px-screen pt-8 justify-between pb-8">
      <View>
        <Text className="font-sans-semibold text-ink text-[28px] leading-[34px]">
          Sign in
        </Text>
        <Text className="font-sans text-ink-muted text-[15px] mt-2">
          Use your college email address to receive a one-time passcode.
        </Text>

        <View className="mt-8">
          <Text className="font-sans-medium text-ink text-[13px] mb-2">
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
        </View>

        {step === 'otp' && (
          <View className="mt-6">
            <Text className="font-sans-medium text-ink text-[13px] mb-2">
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

      <View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={step === 'email' ? 'Send OTP' : 'Verify and enter'}
          onPress={step === 'email' ? handleSendOtp : undefined}
          className="h-12 bg-sky-500 active:bg-sky-700 rounded-input items-center justify-center flex-row gap-2"
        >
          <Text className="font-sans-semibold text-white text-[15px]">
            {step === 'email' ? 'Send passcode' : 'Verify'}
          </Text>
          <ArrowRight size={18} strokeWidth={1.75} color="#FFFFFF" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
