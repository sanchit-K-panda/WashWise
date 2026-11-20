import React, { useState, useMemo, useEffect } from 'react';
import { View, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Minus, Plus, AlertTriangle, AlertCircle } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { colors } from '@/theme/tokens';
import { calculateWashDuration, formatEndTime } from '@/lib/timer';
import { Screen, Text, Button, Chip, Skeleton } from '@/components/ui';
import { useWashConfig } from '@/hooks/useWashConfig';
import { startWash } from '@/services/wash';
import { scheduleWashNotifications } from '@/services/notifications';

export default function StartWashScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { machineId } = useLocalSearchParams<{ machineId?: string }>();
  const { machine, config, isLoading } = useWashConfig(machineId);

  const programs = config.programs;
  const tempAdjustments = config.tempAdjustments;
  const spinAdjustments = config.spinAdjustments;

  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [selectedTempName, setSelectedTempName] = useState<string | null>(null);
  const [selectedSpinName, setSelectedSpinName] = useState<string | null>(null);
  const [weightKg, setWeightKg] = useState<number>(4);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isRaceConflict, setIsRaceConflict] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-redirect if race conflict occurs, with cleanup on unmount
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (isRaceConflict) {
      timer = setTimeout(() => {
        router.replace('/(student)');
      }, 2000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isRaceConflict, router]);

  // Default selections
  const activeProgram = useMemo(() => {
    return (
      programs.find((p) => p.id === selectedProgramId) ||
      programs[0] || {
        id: 'normal',
        name: 'Normal',
        base_minutes: 35,
        per_kg_minutes: 2.0,
        active: true,
      }
    );
  }, [programs, selectedProgramId]);

  const activeTemp = useMemo(() => {
    return (
      tempAdjustments.find((t) => t.temp === selectedTempName) ||
      tempAdjustments[0] || {
        temp: 'Cold',
        minutes: 0,
      }
    );
  }, [tempAdjustments, selectedTempName]);

  const activeSpin = useMemo(() => {
    return (
      spinAdjustments.find((s) => s.spin === selectedSpinName) ||
      spinAdjustments[0] || {
        spin: 'Low',
        minutes: 0,
      }
    );
  }, [spinAdjustments, selectedSpinName]);

  const machineCapacity = machine?.capacity_kg || 7;

  // Pure timer calculation
  const durationResult = useMemo(() => {
    return calculateWashDuration({
      baseMinutes: activeProgram.base_minutes,
      perKgMinutes: Number(activeProgram.per_kg_minutes),
      weightKg,
      capacityKg: machineCapacity,
      tempMinutes: activeTemp.minutes,
      spinMinutes: activeSpin.minutes,
    });
  }, [activeProgram, activeTemp, activeSpin, weightKg, machineCapacity]);

  const handleStartWash = async () => {
    if (!machine || !durationResult.isValid || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await startWash({
      machineId: machine.id,
      programId: activeProgram.id,
      temp: activeTemp.temp,
      spin: activeSpin.spin,
      weightKg,
    });

    setIsSubmitting(false);

    if (result.isRaceConflict) {
      setIsRaceConflict(true);
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      return;
    }

    if (!result.success || !result.session) {
      setErrorMessage(result.error || 'Failed to start wash cycle.');
      return;
    }

    // Schedule local notifications for 5m before and at completion
    scheduleWashNotifications(
      result.session.session_id,
      result.session.machine_label,
      new Date(result.session.ends_at)
    ).catch(() => {});

    queryClient.invalidateQueries({ queryKey: ['machines'] });
    queryClient.invalidateQueries({ queryKey: ['active_session'] });
    router.replace(`/(student)/timer/${result.session.session_id}`);
  };

  // Loading skeleton state
  if (isLoading) {
    return (
      <Screen
        header={{
          title: 'Start Wash',
          subtitle: 'Loading machine settings…',
          onBack: () => router.back(),
        }}
      >
        <View testID="start-loading" className="space-y-6 gap-6 py-2">
          <View>
            <Skeleton.Line width={120} style={{ marginBottom: 12, height: 20 }} />
            <View className="flex-row gap-2">
              <Skeleton.Line width={90} style={{ height: 32 }} />
              <Skeleton.Line width={90} style={{ height: 32 }} />
              <Skeleton.Line width={90} style={{ height: 32 }} />
            </View>
          </View>
          <View>
            <Skeleton.Line width={100} style={{ marginBottom: 12, height: 20 }} />
            <View className="flex-row gap-2">
              <Skeleton.Line width="30%" style={{ height: 32 }} />
              <Skeleton.Line width="30%" style={{ height: 32 }} />
              <Skeleton.Line width="30%" style={{ height: 32 }} />
            </View>
          </View>
          <View>
            <Skeleton.Line width={110} style={{ marginBottom: 12, height: 20 }} />
            <Skeleton.Card height={96} />
          </View>
        </View>
      </Screen>
    );
  }

  // Guard: Machine not found
  if (!isLoading && !machine) {
    return (
      <Screen header={{ title: 'Start Wash', onBack: () => router.back() }}>
        <View
          testID="machine-not-found"
          className="p-6 rounded-md border border-hairline bg-surface items-center text-center my-6"
        >
          <AlertCircle size={24} strokeWidth={1.75} color={colors.ink.muted} />
          <Text variant="section" color="ink" style={{ textAlign: 'center', marginTop: 12 }}>
            Machine not found
          </Text>
          <Text
            variant="body"
            color="muted"
            style={{ textAlign: 'center', marginTop: 4, marginBottom: 16 }}
          >
            The selected washing machine could not be loaded.
          </Text>
          <Button variant="secondary" onPress={() => router.replace('/(student)')}>
            Back to machines
          </Button>
        </View>
      </Screen>
    );
  }

  // Guard: Machine is no longer available upfront
  if (!isLoading && machine && machine.status !== 'available') {
    return (
      <Screen header={{ title: `Machine ${machine.label}`, onBack: () => router.back() }}>
        <View
          testID="machine-unavailable"
          className="p-6 rounded-md border border-hairline bg-surface items-center text-center my-6"
        >
          <AlertCircle size={24} strokeWidth={1.75} color={colors.status[machine.status]} />
          <Text variant="section" color="ink" style={{ textAlign: 'center', marginTop: 12 }}>
            Machine is currently {machine.status}
          </Text>
          <Text
            variant="body"
            color="muted"
            style={{ textAlign: 'center', marginTop: 4, marginBottom: 16 }}
          >
            Please select an available machine from the laundry room.
          </Text>
          <Button variant="secondary" onPress={() => router.replace('/(student)')}>
            Back to machines
          </Button>
        </View>
      </Screen>
    );
  }

  const finishSummary = durationResult.isValid
    ? formatEndTime(durationResult.endsAt, durationResult.durationMinutes)
    : durationResult.isOverloaded
      ? 'Overloaded'
      : 'Invalid configuration';

  return (
    <Screen
      scrollable
      header={{
        title: machine ? `Machine ${machine.label}` : 'Start Wash',
        subtitle: machine ? `${machine.capacity_kg} kg capacity` : 'Configure settings',
        onBack: () => router.back(),
      }}
      stickyFooter={
        <View>
          <View className="flex-row items-center justify-between mb-3">
            <Text variant="caption" color="muted">
              Estimated finish
            </Text>
            <Text variant="body" tabular>
              {finishSummary}
            </Text>
          </View>
          <Button
            testID="start-wash-button"
            disabled={!durationResult.isValid || isSubmitting || isRaceConflict}
            loading={isSubmitting}
            onPress={handleStartWash}
            accessibilityLabel="Start wash cycle"
          >
            {durationResult.isOverloaded ? 'Load exceeds capacity' : 'Start wash'}
          </Button>
        </View>
      }
    >
      {/* Race condition alert: Machine was just taken */}
      {isRaceConflict && (
        <View
          testID="race-conflict-alert"
          accessibilityRole="alert"
          className="p-4 rounded-md border border-status-maintenance/30 bg-surface mb-6 flex-row items-center gap-3"
        >
          <AlertTriangle size={20} strokeWidth={1.75} color={colors.status.maintenance} />
          <View className="flex-1">
            <Text variant="caption" style={{ color: colors.status.maintenance, fontWeight: '600' }}>
              Machine already in use
            </Text>
            <Text variant="body" color="ink" style={{ marginTop: 2 }}>
              This machine was just taken by someone else. Redirecting to machines…
            </Text>
          </View>
          <Button
            size="sm"
            variant="secondary"
            fullWidth={false}
            onPress={() => router.replace('/(student)')}
          >
            Return
          </Button>
        </View>
      )}

      {/* Generic error banner */}
      {errorMessage && (
        <View
          testID="start-error-alert"
          className="p-3.5 rounded-md border border-status-broken/30 bg-surface mb-6 flex-row items-center gap-2.5"
        >
          <AlertCircle size={18} strokeWidth={1.75} color={colors.status.broken} />
          <Text variant="body" color="broken" style={{ flex: 1 }}>
            {errorMessage}
          </Text>
        </View>
      )}

      {/* 1. Wash Program Segmented Control */}
      <View className="mb-6">
        <Text variant="section" style={{ marginBottom: 10 }}>
          Wash program
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {programs.map((prog) => (
            <Chip
              key={prog.id}
              variant="filter"
              label={`${prog.name} (${prog.base_minutes}m)`}
              selected={activeProgram.id === prog.id}
              onPress={() => setSelectedProgramId(prog.id)}
            />
          ))}
        </View>
      </View>

      {/* 2. Temperature Segmented Control */}
      <View className="mb-6">
        <Text variant="section" style={{ marginBottom: 10 }}>
          Temperature
        </Text>
        <View className="flex-row gap-2">
          {tempAdjustments.map((temp) => (
            <Chip
              key={temp.temp}
              variant="filter"
              label={temp.minutes > 0 ? `${temp.temp}° (+${temp.minutes}m)` : `${temp.temp}`}
              selected={activeTemp.temp === temp.temp}
              onPress={() => setSelectedTempName(temp.temp)}
              style={{ flex: 1, justifyContent: 'center' }}
            />
          ))}
        </View>
      </View>

      {/* 3. Spin Speed Segmented Control */}
      <View className="mb-6">
        <Text variant="section" style={{ marginBottom: 10 }}>
          Spin speed
        </Text>
        <View className="flex-row gap-2">
          {spinAdjustments.map((spin) => (
            <Chip
              key={spin.spin}
              variant="filter"
              label={spin.minutes > 0 ? `${spin.spin} (+${spin.minutes}m)` : `${spin.spin}`}
              selected={activeSpin.spin === spin.spin}
              onPress={() => setSelectedSpinName(spin.spin)}
              style={{ flex: 1, justifyContent: 'center' }}
            />
          ))}
        </View>
      </View>

      {/* 4. Weight Stepper with Capacity Bar */}
      <View className="mb-6">
        <View className="flex-row items-center justify-between mb-2.5">
          <Text variant="section">Load weight</Text>
          <Text variant="body" tabular>
            {weightKg} kg / {machineCapacity} kg
          </Text>
        </View>

        <View className="flex-row items-center justify-between bg-surface border border-hairline rounded-input p-3 mb-2">
          <Pressable
            testID="decrease-weight-button"
            accessibilityRole="button"
            accessibilityLabel="Decrease weight"
            disabled={weightKg <= 1}
            onPress={() => setWeightKg((w) => Math.max(1, w - 1))}
            className={`w-12 h-12 items-center justify-center rounded-full bg-white border border-hairline active:bg-sky-50 ${
              weightKg <= 1 ? 'opacity-40' : ''
            }`}
          >
            <Minus size={18} strokeWidth={1.75} color={colors.ink.DEFAULT} />
          </Pressable>

          <Text testID="weight-display" variant="monoMachineId">
            {weightKg} kg
          </Text>

          <Pressable
            testID="increase-weight-button"
            accessibilityRole="button"
            accessibilityLabel="Increase weight"
            onPress={() => setWeightKg((w) => w + 1)}
            className="w-12 h-12 items-center justify-center rounded-full bg-white border border-hairline active:bg-sky-50"
          >
            <Plus size={18} strokeWidth={1.75} color={colors.ink.DEFAULT} />
          </Pressable>
        </View>

        {/* Capacity fill indicator bar */}
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{
            min: 0,
            max: machineCapacity,
            now: Math.min(machineCapacity, weightKg),
          }}
          accessibilityLabel={`Capacity bar: ${weightKg} of ${machineCapacity} kg`}
          className="w-full bg-hairline h-2 rounded-full overflow-hidden"
        >
          <View
            style={{
              width: `${Math.min(100, (weightKg / machineCapacity) * 100)}%`,
              backgroundColor: durationResult.isOverloaded ? colors.status.broken : colors.sky[500],
            }}
            className="h-2 rounded-full"
          />
        </View>

        {durationResult.isOverloaded && (
          <Text testID="overload-warning" variant="caption" color="broken" style={{ marginTop: 6 }}>
            Load exceeds machine capacity ({machineCapacity} kg). Please reduce weight to start.
          </Text>
        )}
      </View>
    </Screen>
  );
}
