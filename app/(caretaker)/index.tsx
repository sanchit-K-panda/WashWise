import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { colors } from '@/theme/tokens';
import { Screen, Text, Chip, Button } from '@/components/ui';
import { Machine } from '@/types';

const INITIAL_MACHINES: (Machine & { verifiedAt: string })[] = [
  {
    id: '1',
    block_id: 'block-a',
    label: '01',
    capacity_kg: 7,
    status: 'available',
    status_updated_by: 'caretaker-1',
    status_updated_at: '',
    note: null,
    verifiedAt: '21:30',
    created_at: '',
  },
  {
    id: '2',
    block_id: 'block-a',
    label: '02',
    capacity_kg: 7,
    status: 'in_use',
    status_updated_by: 'caretaker-1',
    status_updated_at: '',
    note: null,
    verifiedAt: '21:30',
    created_at: '',
  },
  {
    id: '3',
    block_id: 'block-a',
    label: '03',
    capacity_kg: 7,
    status: 'available',
    status_updated_by: 'caretaker-1',
    status_updated_at: '',
    note: null,
    verifiedAt: '21:15',
    created_at: '',
  },
  {
    id: '4',
    block_id: 'block-a',
    label: '04',
    capacity_kg: 7,
    status: 'in_use',
    status_updated_by: 'caretaker-1',
    status_updated_at: '',
    note: null,
    verifiedAt: '21:15',
    created_at: '',
  },
  {
    id: '5',
    block_id: 'block-a',
    label: '05',
    capacity_kg: 7,
    status: 'available',
    status_updated_by: 'caretaker-1',
    status_updated_at: '',
    note: null,
    verifiedAt: '20:45',
    created_at: '',
  },
  {
    id: '6',
    block_id: 'block-a',
    label: '06',
    capacity_kg: 7,
    status: 'maintenance',
    status_updated_by: 'caretaker-1',
    status_updated_at: '',
    note: 'Filter cleaning in progress',
    verifiedAt: '19:00',
    created_at: '',
  },
  {
    id: '7',
    block_id: 'block-a',
    label: '07',
    capacity_kg: 7,
    status: 'broken',
    status_updated_by: 'caretaker-1',
    status_updated_at: '',
    note: 'Door latch fault',
    verifiedAt: '18:20',
    created_at: '',
  },
  {
    id: '8',
    block_id: 'block-a',
    label: '08',
    capacity_kg: 7,
    status: 'in_use',
    status_updated_by: 'caretaker-1',
    status_updated_at: '',
    note: null,
    verifiedAt: '21:30',
    created_at: '',
  },
];

export default function CaretakerHomeScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'machines' | 'issues'>('machines');

  return (
    <Screen
      scrollable
      header={{
        title: 'Machine verification',
        subtitle: 'Block A Caretaker',
        onBack: () => router.back(),
      }}
    >
      {/* Tab switcher */}
      <View className="flex-row gap-2 mb-4 bg-surface p-1 rounded-input border border-hairline">
        <Pressable
          onPress={() => setActiveTab('machines')}
          className={`flex-1 py-1.5 items-center rounded-sm ${
            activeTab === 'machines' ? 'bg-white border border-hairline' : ''
          }`}
        >
          <Text
            variant="caption"
            color={activeTab === 'machines' ? 'ink' : 'muted'}
            style={{ fontWeight: '600' }}
          >
            All Machines (8)
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('issues')}
          className={`flex-1 py-1.5 items-center rounded-sm ${
            activeTab === 'issues' ? 'bg-white border border-hairline' : ''
          }`}
        >
          <Text
            variant="caption"
            color={activeTab === 'issues' ? 'ink' : 'muted'}
            style={{ fontWeight: '600' }}
          >
            Issue Reports (2)
          </Text>
        </Pressable>
      </View>

      {activeTab === 'machines' ? (
        <View className="gap-2.5">
          {INITIAL_MACHINES.map((machine) => (
            <Pressable
              key={machine.id}
              accessibilityRole="button"
              accessibilityLabel={`Machine ${machine.label}, ${machine.status}, verified at ${machine.verifiedAt}`}
              onPress={() => router.push(`/(caretaker)/machine/${machine.id}`)}
              className="flex-row items-center justify-between p-3.5 bg-surface border border-hairline rounded-md active:bg-sky-50"
            >
              <View className="flex-row items-center gap-3">
                <Text variant="monoMachineId" style={{ width: 36 }}>
                  {machine.label}
                </Text>
                <View>
                  <Chip variant={machine.status} />
                  <Text variant="caption" color="muted" style={{ marginTop: 4 }}>
                    Verified at {machine.verifiedAt}
                  </Text>
                </View>
              </View>

              <ChevronRight size={18} strokeWidth={1.75} color={colors.ink.muted} />
            </Pressable>
          ))}
        </View>
      ) : (
        <View className="gap-3">
          <View className="p-4 bg-surface border border-hairline rounded-md">
            <View className="flex-row items-center justify-between mb-2">
              <Text variant="section">Machine 07</Text>
              <Text variant="caption" color="broken">
                Reported 45m ago
              </Text>
            </View>
            <Text variant="body" style={{ marginBottom: 12 }}>
              Door won&apos;t lock when wash cycle starts. Student reported latch feels loose.
            </Text>
            <Button variant="outline" size="sm">
              Mark as Resolved
            </Button>
          </View>

          <View className="p-4 bg-surface border border-hairline rounded-md">
            <View className="flex-row items-center justify-between mb-2">
              <Text variant="section">Machine 06</Text>
              <Text variant="caption" color="maintenance">
                Reported 2h ago
              </Text>
            </View>
            <Text variant="body" style={{ marginBottom: 12 }}>
              Water draining very slowly. Needs filter check.
            </Text>
            <Button variant="outline" size="sm">
              Mark as Resolved
            </Button>
          </View>
        </View>
      )}
    </Screen>
  );
}
