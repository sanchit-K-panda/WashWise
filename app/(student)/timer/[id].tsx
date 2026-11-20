import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, AlertTriangle } from 'lucide-react-native';
import { colors } from '@/theme/tokens';
import { Screen, Text, Button } from '@/components/ui';

export default function TimerScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Screen
      header={{
        title: `Machine ${id || '01'}`,
        subtitle: 'Running cycle',
        onBack: () => router.replace('/(student)'),
      }}
      stickyFooter={
        <View className="space-y-3 gap-3">
          <Button
            variant="primary"
            leftIcon={<Check size={18} strokeWidth={2} color="#FFFFFF" />}
            onPress={() => router.replace('/(student)')}
            accessibilityLabel="Mark laundry collected and free machine"
          >
            Collected
          </Button>

          <Button
            variant="outline"
            leftIcon={<AlertTriangle size={18} strokeWidth={1.75} color={colors.ink.muted} />}
            accessibilityLabel="Report issue with this machine"
          >
            Report issue
          </Button>
        </View>
      }
    >
      <View className="items-center py-10">
        <Text variant="caption" color="muted" style={{ marginBottom: 8 }}>
          Time remaining
        </Text>
        <Text variant="monoTimer">28:45</Text>
        <Text variant="caption" color="muted" style={{ marginTop: 8 }}>
          Normal · 40° · Med spin · 4 kg
        </Text>
      </View>

      {/* Progress representation */}
      <View className="w-full bg-hairline h-2 rounded-full overflow-hidden mb-6">
        <View className="bg-sky-500 h-2 rounded-full w-[35%]" />
      </View>

      <View className="p-4 bg-surface rounded-md border border-hairline">
        <Text variant="section" style={{ marginBottom: 4 }}>
          Ends at approx. 6:42 PM
        </Text>
        <Text variant="caption" color="muted">
          Local notification will alert you 5 minutes before completion.
        </Text>
      </View>
    </Screen>
  );
}
