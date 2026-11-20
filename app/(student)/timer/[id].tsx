import { View, Text, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, AlertTriangle, ArrowLeft } from 'lucide-react-native';
import { colors } from '@/theme/tokens';

export default function TimerScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView className="flex-1 bg-bg justify-between px-screen pt-2 pb-6">
      <View>
        <View className="flex-row items-center justify-between pb-4 border-b border-hairline">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to machines"
            onPress={() => router.replace('/(student)')}
            className="w-10 h-10 items-center justify-center -ml-2 rounded-full active:bg-sky-50"
          >
            <ArrowLeft size={20} strokeWidth={1.75} color={colors.ink.DEFAULT} />
          </Pressable>
          <Text className="font-mono-semibold text-ink-muted text-[15px]">
            Machine {id || '01'}
          </Text>
        </View>

        <View className="items-center py-12">
          <Text className="font-sans text-ink-muted text-[15px] mb-2">
            Time remaining
          </Text>
          <Text className="font-mono-semibold text-ink text-[56px] leading-[64px] tracking-tight">
            28:45
          </Text>
          <Text className="font-sans text-ink-muted text-[13px] mt-2">
            Normal · 40° · Med spin · 4 kg
          </Text>
        </View>

        {/* Progress representation */}
        <View className="w-full bg-hairline h-2 rounded-full overflow-hidden mb-6">
          <View className="bg-sky-500 h-2 rounded-full w-[35%]" />
        </View>

        <View className="p-4 bg-surface rounded-md border border-hairline">
          <Text className="font-sans-semibold text-ink text-[15px] mb-1">
            Ends at approx. 6:42 PM
          </Text>
          <Text className="font-sans text-ink-muted text-[13px]">
            Local notification will alert you 5 minutes before completion.
          </Text>
        </View>
      </View>

      <View className="space-y-3 gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mark laundry collected and free machine"
          onPress={() => router.replace('/(student)')}
          className="h-12 bg-sky-500 active:bg-sky-700 rounded-input items-center justify-center flex-row gap-2"
        >
          <Check size={18} strokeWidth={2} color="#FFFFFF" />
          <Text className="font-sans-semibold text-white text-[15px]">
            Collected
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Report issue with this machine"
          className="h-12 bg-white border border-hairline rounded-input items-center justify-center flex-row gap-2 active:bg-surface"
        >
          <AlertTriangle size={18} strokeWidth={1.75} color={colors.ink.muted} />
          <Text className="font-sans-medium text-ink-muted text-[15px]">
            Report issue
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
