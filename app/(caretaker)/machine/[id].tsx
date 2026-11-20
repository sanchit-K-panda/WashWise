import { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle2, Wrench, Ban, AlertOctagon } from 'lucide-react-native';
import { colors } from '@/theme/tokens';
import { MachineStatus } from '@/types';

export default function CaretakerMachineDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [selectedStatus, setSelectedStatus] = useState<MachineStatus>('available');
  const [note, setNote] = useState('');

  const statusOptions: { key: MachineStatus; label: string; color: string; Icon: typeof CheckCircle2 }[] = [
    { key: 'available', label: 'Free', color: colors.status.available, Icon: CheckCircle2 },
    { key: 'maintenance', label: 'Maintenance', color: colors.status.maintenance, Icon: Wrench },
    { key: 'broken', label: 'Broken', color: colors.status.broken, Icon: Ban },
  ];

  return (
    <SafeAreaView className="flex-1 bg-bg justify-between px-screen pt-2 pb-6">
      <View>
        <View className="flex-row items-center gap-3 pb-3 border-b border-hairline">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to machines list"
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center -ml-2 rounded-full active:bg-sky-50"
          >
            <ArrowLeft size={20} strokeWidth={1.75} color={colors.ink.DEFAULT} />
          </Pressable>
          <View>
            <Text className="font-sans-semibold text-ink text-[17px]">
              Verify Machine {id || '01'}
            </Text>
            <Text className="font-sans text-ink-muted text-[13px]">
              Block A · Capacity 7 kg
            </Text>
          </View>
        </View>

        {/* Status selection */}
        <View className="mt-6">
          <Text className="font-sans-semibold text-ink text-[15px] mb-3">
            Update machine state
          </Text>
          <View className="gap-2.5">
            {statusOptions.map((opt) => {
              const isSelected = selectedStatus === opt.key;
              const Icon = opt.Icon;

              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setSelectedStatus(opt.key)}
                  className={`flex-row items-center justify-between p-3.5 rounded-md border ${
                    isSelected
                      ? 'bg-sky-50 border-sky-500'
                      : 'bg-surface border-hairline active:bg-sky-50'
                  }`}
                >
                  <View className="flex-row items-center gap-2.5">
                    <Icon size={18} strokeWidth={2} color={opt.color} />
                    <Text className="font-sans-semibold text-ink text-[15px]">
                      {opt.label}
                    </Text>
                  </View>
                  <View
                    className={`w-4 h-4 rounded-full border items-center justify-center ${
                      isSelected ? 'border-sky-500 bg-sky-500' : 'border-ink-muted'
                    }`}
                  >
                    {isSelected && <View className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Optional note */}
        <View className="mt-6">
          <Text className="font-sans-semibold text-ink text-[15px] mb-2">
            Status note (optional)
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="e.g. Technician called for door latch"
            placeholderTextColor={colors.ink.muted}
            multiline
            numberOfLines={3}
            className="p-3 bg-surface border border-hairline rounded-input font-sans text-ink text-[15px] min-h-[80px]"
            textAlignVertical="top"
          />
        </View>

        {/* Force-clear action */}
        <View className="mt-6 pt-4 border-t border-hairline">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Force-clear stuck in-use status"
            className="flex-row items-center gap-2 p-3 bg-surface border border-hairline rounded-md active:bg-sky-50"
          >
            <AlertOctagon size={18} strokeWidth={1.75} color={colors.ink.muted} />
            <View className="flex-1">
              <Text className="font-sans-semibold text-ink text-[14px]">
                Force-clear session
              </Text>
              <Text className="font-sans text-ink-muted text-[12px]">
                Frees machine if stuck in &quot;in use&quot; after wash finished
              </Text>
            </View>
          </Pressable>
        </View>
      </View>

      <View className="gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save verification status"
          onPress={() => router.back()}
          className="h-12 bg-sky-500 active:bg-sky-700 rounded-input items-center justify-center"
        >
          <Text className="font-sans-semibold text-white text-[15px]">
            Save verification
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
