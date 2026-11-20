import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle2, Clock, Wrench, Ban, ArrowLeft } from 'lucide-react-native';
import { colors } from '@/theme/tokens';
import { Machine, MachineStatus } from '@/types';

// Mock initial data to ensure the screen matches DESIGN.md layout requirements
const INITIAL_MACHINES: (Machine & { timeLeftMinutes?: number })[] = [
  { id: '1', block_id: 'block-a', label: '01', capacity_kg: 7, status: 'available', status_updated_by: null, status_updated_at: '', note: null },
  { id: '2', block_id: 'block-a', label: '02', capacity_kg: 7, status: 'in_use', status_updated_by: null, status_updated_at: '', note: null, timeLeftMinutes: 14 },
  { id: '3', block_id: 'block-a', label: '03', capacity_kg: 7, status: 'available', status_updated_by: null, status_updated_at: '', note: null },
  { id: '4', block_id: 'block-a', label: '04', capacity_kg: 7, status: 'in_use', status_updated_by: null, status_updated_at: '', note: null, timeLeftMinutes: 32 },
  { id: '5', block_id: 'block-a', label: '05', capacity_kg: 7, status: 'available', status_updated_by: null, status_updated_at: '', note: null },
  { id: '6', block_id: 'block-a', label: '06', capacity_kg: 7, status: 'maintenance', status_updated_by: null, status_updated_at: '', note: 'Filter cleaning' },
  { id: '7', block_id: 'block-a', label: '07', capacity_kg: 7, status: 'broken', status_updated_by: null, status_updated_at: '', note: 'Door latch fault' },
  { id: '8', block_id: 'block-a', label: '08', capacity_kg: 7, status: 'in_use', status_updated_by: null, status_updated_at: '', note: null, timeLeftMinutes: 6 },
];

function getStatusBadge(status: MachineStatus, timeLeft?: number) {
  switch (status) {
    case 'available':
      return {
        label: 'Available',
        color: colors.status.available,
        Icon: CheckCircle2,
      };
    case 'in_use':
      return {
        label: timeLeft ? `${timeLeft}m left` : 'In use',
        color: colors.status.in_use,
        Icon: Clock,
      };
    case 'maintenance':
      return {
        label: 'Maintenance',
        color: colors.status.maintenance,
        Icon: Wrench,
      };
    case 'broken':
      return {
        label: 'Broken',
        color: colors.status.broken,
        Icon: Ban,
      };
  }
}

export default function StudentHomeScreen() {
  const router = useRouter();
  const availableCount = INITIAL_MACHINES.filter((m) => m.status === 'available').length;
  const totalCount = INITIAL_MACHINES.length;

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="px-screen pt-2 pb-4 border-b border-hairline">
        <View className="flex-row items-center justify-between mb-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center -ml-2 rounded-full active:bg-sky-50"
          >
            <ArrowLeft size={20} strokeWidth={1.75} color={colors.ink.DEFAULT} />
          </Pressable>
          <Text className="font-sans-medium text-ink-muted text-[13px]">
            Block A Laundry Room
          </Text>
        </View>

        <Text className="font-sans-semibold text-ink text-[28px] leading-[34px]">
          {availableCount} of {totalCount} free
        </Text>
      </View>

      <ScrollView className="flex-1 px-screen pt-4" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="flex-row flex-wrap justify-between gap-y-3">
          {INITIAL_MACHINES.map((machine) => {
            const badge = getStatusBadge(machine.status, machine.timeLeftMinutes);
            const isClickable = machine.status === 'available';
            const isBroken = machine.status === 'broken';
            const IconComponent = badge.Icon;

            return (
              <Pressable
                key={machine.id}
                disabled={!isClickable}
                accessibilityRole="button"
                accessibilityLabel={`Machine ${machine.label}, ${badge.label}`}
                onPress={() => router.push(`/(student)/start?machineId=${machine.id}`)}
                className={`w-[48%] p-3.5 rounded-md border bg-surface ${
                  isBroken ? 'opacity-40 border-hairline' : 'border-hairline active:border-sky-200 active:bg-sky-50'
                }`}
              >
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="font-mono-semibold text-ink text-[24px] tracking-tight">
                    {machine.label}
                  </Text>
                  <Text className="font-sans text-ink-muted text-[13px]">
                    {machine.capacity_kg}kg
                  </Text>
                </View>

                <View className="flex-row items-center gap-1.5 py-1 px-2 rounded-full self-start bg-white border border-hairline">
                  <IconComponent size={14} strokeWidth={2} color={badge.color} />
                  <Text
                    style={{ color: badge.color }}
                    className="font-sans-medium text-[12px]"
                  >
                    {badge.label}
                  </Text>
                </View>

                {machine.status === 'in_use' && (
                  <View className="mt-3 w-full bg-hairline h-1 rounded-full overflow-hidden">
                    <View
                      className="bg-sky-500 h-1 rounded-full"
                      style={{ width: `${Math.max(15, 100 - (machine.timeLeftMinutes || 10) * 2)}%` }}
                    />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
