import { useState } from 'react';
import { View, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertOctagon } from 'lucide-react-native';
import { colors } from '@/theme/tokens';
import { MachineStatus } from '@/types';
import { Screen, Text, Button, Chip } from '@/components/ui';

export default function CaretakerMachineDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [selectedStatus, setSelectedStatus] = useState<MachineStatus>('available');
  const [note, setNote] = useState('');

  const statusOptions: MachineStatus[] = ['available', 'maintenance', 'broken'];

  return (
    <Screen
      header={{
        title: `Verify Machine ${id || '01'}`,
        subtitle: 'Block A · Capacity 7 kg',
        onBack: () => router.back(),
      }}
      stickyFooter={
        <Button accessibilityLabel="Save verification status" onPress={() => router.back()}>
          Save verification
        </Button>
      }
    >
      {/* Status selection */}
      <View className="mt-2">
        <Text variant="section" style={{ marginBottom: 12 }}>
          Update machine state
        </Text>
        <View className="gap-2.5">
          {statusOptions.map((st) => {
            const isSelected = selectedStatus === st;
            return (
              <Chip
                key={st}
                variant={st}
                onPress={() => setSelectedStatus(st)}
                style={{
                  width: '100%',
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderWidth: isSelected ? 2 : 1,
                  borderColor: isSelected ? colors.sky[500] : colors.hairline,
                  backgroundColor: isSelected ? colors.sky[50] : colors.surface,
                }}
              />
            );
          })}
        </View>
      </View>

      {/* Optional note */}
      <View className="mt-6">
        <Text variant="section" style={{ marginBottom: 8 }}>
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
        <View className="flex-row items-center gap-2 p-3 bg-surface border border-hairline rounded-md">
          <AlertOctagon size={18} strokeWidth={1.75} color={colors.ink.muted} />
          <View className="flex-1">
            <Text variant="section">Force-clear session</Text>
            <Text variant="caption" color="muted">
              Frees machine if stuck in &quot;in use&quot; after wash finished
            </Text>
          </View>
        </View>
      </View>
    </Screen>
  );
}
