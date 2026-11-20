import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Text, Chip } from '@/components/ui';
import { Machine } from '@/types';

const INITIAL_MACHINES: (Machine & { timeLeftMinutes?: number })[] = [
  {
    id: '1',
    block_id: 'block-a',
    label: '01',
    capacity_kg: 7,
    status: 'available',
    status_updated_by: null,
    status_updated_at: '',
    note: null,
    created_at: '',
  },
  {
    id: '2',
    block_id: 'block-a',
    label: '02',
    capacity_kg: 7,
    status: 'in_use',
    status_updated_by: null,
    status_updated_at: '',
    note: null,
    timeLeftMinutes: 14,
    created_at: '',
  },
  {
    id: '3',
    block_id: 'block-a',
    label: '03',
    capacity_kg: 7,
    status: 'available',
    status_updated_by: null,
    status_updated_at: '',
    note: null,
    created_at: '',
  },
  {
    id: '4',
    block_id: 'block-a',
    label: '04',
    capacity_kg: 7,
    status: 'in_use',
    status_updated_by: null,
    status_updated_at: '',
    note: null,
    timeLeftMinutes: 32,
    created_at: '',
  },
  {
    id: '5',
    block_id: 'block-a',
    label: '05',
    capacity_kg: 7,
    status: 'available',
    status_updated_by: null,
    status_updated_at: '',
    note: null,
    created_at: '',
  },
  {
    id: '6',
    block_id: 'block-a',
    label: '06',
    capacity_kg: 7,
    status: 'maintenance',
    status_updated_by: null,
    status_updated_at: '',
    note: 'Filter cleaning',
    created_at: '',
  },
  {
    id: '7',
    block_id: 'block-a',
    label: '07',
    capacity_kg: 7,
    status: 'broken',
    status_updated_by: null,
    status_updated_at: '',
    note: 'Door latch fault',
    created_at: '',
  },
  {
    id: '8',
    block_id: 'block-a',
    label: '08',
    capacity_kg: 7,
    status: 'in_use',
    status_updated_by: null,
    status_updated_at: '',
    note: null,
    timeLeftMinutes: 6,
    created_at: '',
  },
];

export default function StudentHomeScreen() {
  const router = useRouter();
  const availableCount = INITIAL_MACHINES.filter((m) => m.status === 'available').length;
  const totalCount = INITIAL_MACHINES.length;

  return (
    <Screen
      scrollable
      header={{
        title: `${availableCount} of ${totalCount} free`,
        subtitle: 'Block A Laundry Room',
        onBack: () => router.back(),
      }}
    >
      <View className="flex-row flex-wrap justify-between gap-y-3">
        {INITIAL_MACHINES.map((machine) => {
          const isClickable = machine.status === 'available';
          const isBroken = machine.status === 'broken';

          return (
            <Pressable
              key={machine.id}
              disabled={!isClickable}
              accessibilityRole="button"
              accessibilityLabel={`Machine ${machine.label}, ${machine.status}`}
              onPress={() => router.push(`/(student)/start?machineId=${machine.id}`)}
              className={`w-[48%] p-3.5 rounded-md border bg-surface ${
                isBroken
                  ? 'opacity-40 border-hairline'
                  : 'border-hairline active:border-sky-200 active:bg-sky-50'
              }`}
            >
              <View className="flex-row items-center justify-between mb-3">
                <Text variant="monoMachineId">{machine.label}</Text>
                <Text variant="caption" color="muted">
                  {machine.capacity_kg}kg
                </Text>
              </View>

              <Chip
                variant={machine.status}
                label={
                  machine.status === 'in_use' && machine.timeLeftMinutes
                    ? `${machine.timeLeftMinutes}m left`
                    : undefined
                }
              />

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
    </Screen>
  );
}
