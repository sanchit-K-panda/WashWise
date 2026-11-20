import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WashingMachine, User, ShieldCheck } from 'lucide-react-native';
import { colors } from '@/theme/tokens';

export default function IndexScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-bg px-screen pt-4">
      <View className="mb-8">
        <Text className="font-sans-semibold text-ink text-[28px] leading-[34px]">
          WashWise
        </Text>
        <Text className="font-sans text-ink-muted text-[15px] mt-1">
          Hostel laundry status and timers
        </Text>
      </View>

      <View className="space-y-3 gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open student view"
          onPress={() => router.push('/(student)')}
          className="flex-row items-center justify-between p-4 bg-surface rounded-md border border-hairline active:bg-sky-50"
        >
          <View className="flex-row items-center gap-3">
            <WashingMachine size={20} strokeWidth={1.75} color={colors.sky[500]} />
            <View>
              <Text className="font-sans-semibold text-ink text-[17px]">
                Student View
              </Text>
              <Text className="font-sans text-ink-muted text-[13px]">
                Live machine grid & wash timer
              </Text>
            </View>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open caretaker view"
          onPress={() => router.push('/(caretaker)')}
          className="flex-row items-center justify-between p-4 bg-surface rounded-md border border-hairline active:bg-sky-50"
        >
          <View className="flex-row items-center gap-3">
            <ShieldCheck size={20} strokeWidth={1.75} color={colors.sky[500]} />
            <View>
              <Text className="font-sans-semibold text-ink text-[17px]">
                Caretaker View
              </Text>
              <Text className="font-sans text-ink-muted text-[13px]">
                Machine verification & issues
              </Text>
            </View>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open login screen"
          onPress={() => router.push('/(auth)/login')}
          className="flex-row items-center justify-between p-4 bg-surface rounded-md border border-hairline active:bg-sky-50"
        >
          <View className="flex-row items-center gap-3">
            <User size={20} strokeWidth={1.75} color={colors.ink.muted} />
            <View>
              <Text className="font-sans-semibold text-ink text-[17px]">
                Sign In
              </Text>
              <Text className="font-sans text-ink-muted text-[13px]">
                College email OTP
              </Text>
            </View>
          </View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
