import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Minus, Plus } from 'lucide-react-native';
import { colors } from '@/theme/tokens';
import { calculateWashDuration } from '@/lib/timer';

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
    <SafeAreaView className="flex-1 bg-bg justify-between">
      <View className="flex-1">
        <View className="px-screen pt-2 pb-3 border-b border-hairline flex-row items-center gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to machines"
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center -ml-2 rounded-full active:bg-sky-50"
          >
            <ArrowLeft size={20} strokeWidth={1.75} color={colors.ink.DEFAULT} />
          </Pressable>
          <View>
            <Text className="font-sans-semibold text-ink text-[17px]">
              Start Machine 01
            </Text>
            <Text className="font-sans text-ink-muted text-[13px]">
              Max capacity {machineCapacity} kg
            </Text>
          </View>
        </View>

        <ScrollView className="flex-1 px-screen pt-4" contentContainerStyle={{ paddingBottom: 24 }}>
          {/* Wash Program */}
          <View className="mb-6">
            <Text className="font-sans-semibold text-ink text-[15px] mb-2.5">
              Wash program
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {PROGRAMS.map((prog) => {
                const isSelected = selectedProgram.id === prog.id;
                return (
                  <Pressable
                    key={prog.id}
                    onPress={() => setSelectedProgram(prog)}
                    className={`px-3.5 py-2 rounded-full border ${
                      isSelected
                        ? 'bg-sky-50 border-sky-500'
                        : 'bg-surface border-hairline'
                    }`}
                  >
                    <Text
                      className={`font-sans-medium text-[13px] ${
                        isSelected ? 'text-sky-700' : 'text-ink'
                      }`}
                    >
                      {prog.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Temperature */}
          <View className="mb-6">
            <Text className="font-sans-semibold text-ink text-[15px] mb-2.5">
              Temperature
            </Text>
            <View className="flex-row gap-2">
              {TEMPS.map((temp) => {
                const isSelected = selectedTemp.label === temp.label;
                return (
                  <Pressable
                    key={temp.label}
                    onPress={() => setSelectedTemp(temp)}
                    className={`flex-1 py-2 rounded-full border items-center ${
                      isSelected
                        ? 'bg-sky-50 border-sky-500'
                        : 'bg-surface border-hairline'
                    }`}
                  >
                    <Text
                      className={`font-sans-medium text-[13px] ${
                        isSelected ? 'text-sky-700' : 'text-ink'
                      }`}
                    >
                      {temp.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Spin speed */}
          <View className="mb-6">
            <Text className="font-sans-semibold text-ink text-[15px] mb-2.5">
              Spin speed
            </Text>
            <View className="flex-row gap-2">
              {SPINS.map((spin) => {
                const isSelected = selectedSpin.label === spin.label;
                return (
                  <Pressable
                    key={spin.label}
                    onPress={() => setSelectedSpin(spin)}
                    className={`flex-1 py-2 rounded-full border items-center ${
                      isSelected
                        ? 'bg-sky-50 border-sky-500'
                        : 'bg-surface border-hairline'
                    }`}
                  >
                    <Text
                      className={`font-sans-medium text-[13px] ${
                        isSelected ? 'text-sky-700' : 'text-ink'
                      }`}
                    >
                      {spin.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Weight Stepper */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-2.5">
              <Text className="font-sans-semibold text-ink text-[15px]">
                Load weight
              </Text>
              <Text className="font-mono-semibold text-ink text-[15px]">
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

              <Text className="font-mono-semibold text-ink text-[20px]">
                {weightKg} kg
              </Text>

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
                  backgroundColor: durationResult.isOverloaded
                    ? colors.status.broken
                    : colors.sky[500],
                }}
                className="h-1.5 rounded-full"
              />
            </View>

            {durationResult.isOverloaded && (
              <Text className="font-sans text-status-broken text-[13px] mt-1.5">
                Load exceeds machine capacity ({machineCapacity} kg). Please reduce weight.
              </Text>
            )}
          </View>
        </ScrollView>
      </View>

      {/* Sticky footer */}
      <View className="px-screen py-4 border-t border-hairline bg-bg">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="font-sans text-ink-muted text-[13px]">
            Estimated duration
          </Text>
          <Text className="font-mono-semibold text-ink text-[15px]">
            {durationResult.isValid
              ? `${durationResult.durationMinutes} min`
              : 'Invalid configuration'}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start wash session"
          disabled={!durationResult.isValid}
          onPress={handleStart}
          className={`h-12 rounded-input items-center justify-center ${
            durationResult.isValid ? 'bg-sky-500 active:bg-sky-700' : 'bg-hairline'
          }`}
        >
          <Text
            className={`font-sans-semibold text-[15px] ${
              durationResult.isValid ? 'text-white' : 'text-ink-muted'
            }`}
          >
            Start wash
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
