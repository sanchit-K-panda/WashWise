import { useEffect } from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { WashingMachine, User, ShieldCheck } from 'lucide-react-native';
import { colors } from '@/theme/tokens';
import { Screen, Text, Skeleton } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

export default function IndexScreen() {
  const router = useRouter();
  const { user, profile, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!user || !profile) {
        router.replace('/(auth)/login');
      } else if (profile.role === 'student') {
        router.replace('/(student)');
      } else if (profile.role === 'caretaker') {
        router.replace('/(caretaker)');
      }
    }
  }, [user, profile, isLoading, router]);

  if (isLoading) {
    return (
      <Screen>
        <View className="space-y-4 gap-4 pt-8">
          <Skeleton.Line width="60%" />
          <Skeleton.Line width="40%" />
          <Skeleton.Card />
          <Skeleton.Card />
        </View>
      </Screen>
    );
  }

  return (
    <Screen header={{ title: 'WashWise', subtitle: 'Hostel laundry status and timers' }}>
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
              <Text variant="section">Student View</Text>
              <Text variant="caption" color="muted">
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
              <Text variant="section">Caretaker View</Text>
              <Text variant="caption" color="muted">
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
              <Text variant="section">Sign In</Text>
              <Text variant="caption" color="muted">
                College email OTP
              </Text>
            </View>
          </View>
        </Pressable>
      </View>
    </Screen>
  );
}
