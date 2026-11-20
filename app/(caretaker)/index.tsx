import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle2, Clock, Wrench, Ban, ChevronRight } from 'lucide-react-native';
import { colors } from '@/theme/tokens';
import { Machine, MachineStatus } from '@/types';

const INITIAL_MACHINES: (Machine & { verifiedAt: string })[] = [
  { id: '1', block_id: 'block-a', label: '01', capacity_kg: 7, status: 'available', status_updated_by: 'caretaker-1', status_updated_at: '', note: null, verifiedAt: '21:30' },
  { id: '2', block_id: 'block-a', label: '02', capacity_kg: 7, status: 'in_use', status_updated_by: 'caretaker-1', status_updated_at: '', note: null, verifiedAt: '21:30' },
  { id: '3', block_id: 'block-a', label: '03', capacity_kg: 7, status: 'available', status_updated_by: 'caretaker-1', status_updated_at: '', note: null, verifiedAt: '21:15' },
  { id: '4', block_id: 'block-a', label: '04', capacity_kg: 7, status: 'in_use', status_updated_by: 'caretaker-1', status_updated_at: '', note: null, verifiedAt: '21:15' },
  { id: '5', block_id: 'block-a', label: '05', capacity_kg: 7, status: 'available', status_updated_by: 'caretaker-1', status_updated_at: '', note: null, verifiedAt: '20:45' },
  { id: '6', block_id: 'block-a', label: '06', capacity_kg: 7, status: 'maintenance', status_updated_by: 'caretaker-1', status_updated_at: '', note: 'Filter cleaning in progress', verifiedAt: '19:00' },
  { id: '7', block_id: 'block-a', label: '07', capacity_kg: 7, status: 'broken', status_updated_by: 'caretaker-1', status_updated_at: '', note: 'Door latch fault', verifiedAt: '18:20' },
  { id: '8', block_id: 'block-a', label: '08', capacity_kg: 7, status: 'in_use', status_updated_by: 'caretaker-1', status_updated_at: '', note: null, verifiedAt: '21:30' },
];

function getStatusBadge(status: MachineStatus) {
  switch (status) {
    case 'available':
      return { label: 'Free', color: colors.status.available, Icon: CheckCircle2 };
    case 'in_use':
      return { label: 'In use', color: colors.status.in_use, Icon: Clock };
    case 'maintenance':
      return { label: 'Maintenance', color: colors.status.maintenance, Icon: Wrench };
    case 'broken':
      return { label: 'Broken', color: colors.status.broken, Icon: Ban };
  }
}

export default function CaretakerHomeScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'machines' | 'issues'>('machines');

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="px-screen pt-2 pb-3 border-b border-hairline">
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
            Block A Caretaker
          </Text>
        </View>

        <Text className="font-sans-semibold text-ink text-[28px] leading-[34px]">
          Machine verification
        </Text>

        {/* Tab switcher */}
        <View className="flex-row gap-2 mt-4 bg-surface p-1 rounded-input border border-hairline">
          <Pressable
            onPress={() => setActiveTab('machines')}
            className={`flex-1 py-1.5 items-center rounded-sm ${
              activeTab === 'machines' ? 'bg-white border border-hairline' : ''
            }`}
          >
            <Text
              className={`font-sans-semibold text-[13px] ${
                activeTab === 'machines' ? 'text-ink' : 'text-ink-muted'
              }`}
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
              className={`font-sans-semibold text-[13px] ${
                activeTab === 'issues' ? 'text-ink' : 'text-ink-muted'
              }`}
            >
              Issue Reports (2)
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1 px-screen pt-3" contentContainerStyle={{ paddingBottom: 32 }}>
        {activeTab === 'machines' ? (
          <View className="gap-2.5">
            {INITIAL_MACHINES.map((machine) => {
              const badge = getStatusBadge(machine.status);
              const Icon = badge.Icon;

              return (
                <Pressable
                  key={machine.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Machine ${machine.label}, ${badge.label}, verified at ${machine.verifiedAt}`}
                  onPress={() => router.push(`/(caretaker)/machine/${machine.id}`)}
                  className="flex-row items-center justify-between p-3.5 bg-surface border border-hairline rounded-md active:bg-sky-50"
                >
                  <View className="flex-row items-center gap-3">
                    <Text className="font-mono-semibold text-ink text-[20px] w-8">
                      {machine.label}
                    </Text>
                    <View>
                      <View className="flex-row items-center gap-1.5">
                        <Icon size={14} strokeWidth={2} color={badge.color} />
                        <Text
                          style={{ color: badge.color }}
                          className="font-sans-medium text-[13px]"
                        >
                          {badge.label}
                        </Text>
                      </View>
                      <Text className="font-sans text-ink-muted text-[12px] mt-0.5">
                        Verified at {machine.verifiedAt}
                      </Text>
                    </View>
                  </View>

                  <ChevronRight size={18} strokeWidth={1.75} color={colors.ink.muted} />
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View className="gap-3">
            <View className="p-4 bg-surface border border-hairline rounded-md">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="font-mono-semibold text-ink text-[17px]">
                  Machine 07
                </Text>
                <Text className="font-sans text-status-broken text-[12px] font-medium">
                  Reported 45m ago
                </Text>
              </View>
              <Text className="font-sans text-ink text-[14px] mb-3">
                Door won&apos;t lock when wash cycle starts. Student reported latch feels loose.
              </Text>
              <Pressable className="h-9 bg-white border border-hairline rounded-input items-center justify-center active:bg-sky-50">
                <Text className="font-sans-semibold text-sky-700 text-[13px]">
                  Mark as Resolved
                </Text>
              </Pressable>
            </View>

            <View className="p-4 bg-surface border border-hairline rounded-md">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="font-mono-semibold text-ink text-[17px]">
                  Machine 06
                </Text>
                <Text className="font-sans text-status-maintenance text-[12px] font-medium">
                  Reported 2h ago
                </Text>
              </View>
              <Text className="font-sans text-ink text-[14px] mb-3">
                Water draining very slowly. Needs filter check.
              </Text>
              <Pressable className="h-9 bg-white border border-hairline rounded-input items-center justify-center active:bg-sky-50">
                <Text className="font-sans-semibold text-sky-700 text-[13px]">
                  Mark as Resolved
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
