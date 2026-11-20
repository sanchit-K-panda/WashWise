import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Minus, Plus } from 'lucide-react-native';
import { colors } from '@/theme/tokens';
import { calculateWashDuration } from '@/lib/timer';
import { Screen, Text, Button, Chip } from '@/components/ui';

const PROGRAMS = [
  { id: 'normal', name: 'Normal', base: 35, perKg: 2 },
  { id: 'quick', name: 'Quick', base: 20, perKg: 1 },
  { id: 'heavy', name: 'Heavy', base: 45, perKg: 3 },
  { id: 'delicates', name: 'Delicates', base: 30, perKg: 1.5 },
  { id: 'wool', name: 'Wool', base: 35, perKg: 1.5 },
];

const TEMPS = [
  { label: 'Cold', minutes: 0 },
  { label: '30°', minutes: 3 },
  { label: '40°', minutes: 5 },
  { label: '60°', minutes: 8 },
];

const SPINS = [
  { label: 'Low', minutes: 0 },
  { label: 'Medium', minutes: 2 },
  { label: 'High', minutes: 4 },
];

export default function StartWashScreen() {
  const router = useRouter();
  const machineCapacity = 7;
  const [selectedProgram, setSelectedProgram] = useState(PROGRAMS[0]);
  const [selectedTemp, setSelectedTemp] = useState(TEMPS[1]);
  const [selectedSpin, setSelectedSpin] = useState(SPINS[1]);
  const [weightKg, setWeightKg] = useState(4);

  const durationResult = calculateWashDuration({
    baseMinutes: selectedProgram.base,
    perKgMinutes: selectedProgram.perKg,
    weightKg,
    capacityKg: machineCapacity,
    tempMinutes: selectedTemp.minutes,
    spinMinutes: selectedSpin.minutes,
  });

  const handleStart = () => {
    if (durationResult.isValid) {
      router.push('/(student)/timer/01');
    }
  };

  return (
    <Screen
      scrollable
      header={{
        title: 'Start Machine 01',
        subtitle: `Max capacity ${machineCapacity} kg`,
        onBack: () => router.back(),
      }}
      stickyFooter={
        <View>
          <View className="flex-row items-center justify-between mb-3">
            <Text variant="caption" color="muted">
              Estimated duration
            </Text>
            <Text variant="body" tabular>
              {durationResult.isValid
                ? `${durationResult.durationMinutes} min`
                : 'Invalid configuration'}
            </Text>
          </View>
          <Button
            disabled={!durationResult.isValid}
            onPress={handleStart}
            accessibilityLabel="Start wash session"
          >
            Start wash
          </Button>
        </View>
      }
    >
      {/* Wash Program */}
      <View className="mb-6">
        <Text variant="section" style={{ marginBottom: 10 }}>
          Wash program
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {PROGRAMS.map((prog) => (
            <Chip
              key={prog.id}
              variant="filter"
              label={prog.name}
              selected={selectedProgram.id === prog.id}
              onPress={() => setSelectedProgram(prog)}
            />
          ))}
        </View>
      </View>

      {/* Temperature */}
      <View className="mb-6">
        <Text variant="section" style={{ marginBottom: 10 }}>
          Temperature
        </Text>
        <View className="flex-row gap-2">
          {TEMPS.map((temp) => (
            <Chip
              key={temp.label}
              variant="filter"
              label={temp.label}
              selected={selectedTemp.label === temp.label}
              onPress={() => setSelectedTemp(temp)}
              style={{ flex: 1, justifyContent: 'center' }}
            />
          ))}
        </View>
      </View>

      {/* Spin speed */}
      <View className="mb-6">
        <Text variant="section" style={{ marginBottom: 10 }}>
          Spin speed
        </Text>
        <View className="flex-row gap-2">
          {SPINS.map((spin) => (
            <Chip
              key={spin.label}
              variant="filter"
              label={spin.label}
              selected={selectedSpin.label === spin.label}
              onPress={() => setSelectedSpin(spin)}
              style={{ flex: 1, justifyContent: 'center' }}
            />
          ))}
        </View>
      </View>

      {/* Weight Stepper */}
      <View className="mb-6">
        <View className="flex-row items-center justify-between mb-2.5">
          <Text variant="section">Load weight</Text>
          <Text variant="body" tabular>
            {weightKg} kg / {machineCapacity} kg
          </Text>
        </View>

        <View className="flex-row items-center justify-between bg-surface border border-hairline rounded-input p-3 mb-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Decrease weight"
            disabled={weightKg <= 1}
            onPress={() => setWeightKg((w) => Math.max(1, w - 1))}
            className="w-10 h-10 items-center justify-center rounded-full bg-white border border-hairline active:bg-sky-50"
          >
            <Minus size={18} strokeWidth={1.75} color={colors.ink.DEFAULT} />
          </Pressable>

          <Text variant="monoMachineId">{weightKg} kg</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Increase weight"
            onPress={() => setWeightKg((w) => w + 1)}
            className="w-10 h-10 items-center justify-center rounded-full bg-white border border-hairline active:bg-sky-50"
          >
            <Plus size={18} strokeWidth={1.75} color={colors.ink.DEFAULT} />
          </Pressable>
        </View>

        {/* Capacity fill indicator */}
        <View className="w-full bg-hairline h-1.5 rounded-full overflow-hidden">
          <View
            style={{
              width: `${Math.min(100, (weightKg / machineCapacity) * 100)}%`,
              backgroundColor: durationResult.isOverloaded ? colors.status.broken : colors.sky[500],
            }}
            className="h-1.5 rounded-full"
          />
        </View>

        {durationResult.isOverloaded && (
          <Text variant="caption" color="broken" style={{ marginTop: 6 }}>
            Load exceeds machine capacity ({machineCapacity} kg). Please reduce weight.
          </Text>
        )}
      </View>
    </Screen>
  );
}
