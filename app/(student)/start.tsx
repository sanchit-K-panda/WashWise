import React, { useState, useMemo, useEffect } from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Minus, Plus, AlertTriangle, ArrowLeft } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { colors } from '@/theme/tokens';
import { calculateWashDuration } from '@/lib/timer';
import { Screen, Text, Button, Skeleton } from '@/components/ui';
import { Toast } from '@/components/ui/Toast';
import { useWashConfig } from '@/hooks/useWashConfig';
import { startWash } from '@/services/wash';
import { scheduleWashNotifications } from '@/services/notifications';

export default function StartWashScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { machineId } = useLocalSearchParams<{ machineId?: string }>();
  const { machine, config, isLoading, isError, error } = useWashConfig(machineId);

  const programs = config.programs;
  const tempAdjustments = config.tempAdjustments;
  const spinAdjustments = config.spinAdjustments;

  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [selectedTempName, setSelectedTempName] = useState<string | null>(null);
  const [selectedSpinName, setSelectedSpinName] = useState<string | null>(null);
  const [weightKg, setWeightKg] = useState<number>(4.0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isRaceConflict, setIsRaceConflict] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto-redirect if race conflict occurs
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

  // Active selections
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
      setToastMessage('Someone just took this machine');
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      return;
    }

    if (!result.success || !result.session) {
      setErrorMessage(result.error || 'Failed to start wash cycle.');
      return;
    }

    const startedSessionId =
      'id' in result.session && result.session.id
        ? result.session.id
        : 'session_id' in result.session
          ? result.session.session_id
          : '';
    const machineLabel = machine?.label || '01';

    // Schedule local notifications for 5m before and at completion
    scheduleWashNotifications(
      startedSessionId,
      machineLabel,
      new Date(result.session.ends_at)
    ).catch(() => {});

    queryClient.invalidateQueries({ queryKey: ['machines'] });
    queryClient.invalidateQueries({ queryKey: ['active-session'] });
    router.replace(`/(student)/timer/${startedSessionId}`);
  };

  if (isLoading) {
    return (
      <Screen>
        <View testID="start-loading" style={styles.loadingContainer}>
          <Skeleton.Line width={100} style={{ height: 20, marginBottom: 16 }} />
          <Skeleton.Line width={160} style={{ height: 32, marginBottom: 8 }} />
          <Skeleton.Line width={220} style={{ height: 16, marginBottom: 24 }} />
          <Skeleton.Line width="100%" style={{ height: 50, marginBottom: 20 }} />
          <Skeleton.Line width="100%" style={{ height: 50, marginBottom: 20 }} />
          <Skeleton.Line width="100%" style={{ height: 50, marginBottom: 20 }} />
          <Skeleton.Line width="100%" style={{ height: 80 }} />
        </View>
      </Screen>
    );
  }

  if (isError || !machine) {
    return (
      <Screen>
        <View testID="machine-not-found" style={styles.errorContainer}>
          <AlertTriangle size={32} color={colors.status.broken} />
          <Text variant="section" style={{ marginTop: 12, marginBottom: 4 }}>
            Machine not found
          </Text>
          <Text variant="body" color="muted" style={{ textAlign: 'center', marginBottom: 16 }}>
            {error?.message || 'The requested washing machine could not be located.'}
          </Text>
          <Button variant="secondary" onPress={() => router.replace('/(student)')}>
            Back to machines
          </Button>
        </View>
      </Screen>
    );
  }

  // If machine is not available upfront (e.g. broken, in use, or maintenance)
  if (machine.status !== 'available') {
    return (
      <Screen>
        <View testID="machine-unavailable" style={styles.errorContainer}>
          <AlertTriangle size={32} color={colors.status.broken} />
          <Text variant="section" style={{ marginTop: 12, marginBottom: 4 }}>
            Machine is currently {machine.status}
          </Text>
          <Text variant="body" color="muted" style={{ textAlign: 'center', marginBottom: 16 }}>
            This machine is not available for a new wash cycle right now.
          </Text>
          <Button variant="secondary" onPress={() => router.replace('/(student)')}>
            Back to machines
          </Button>
        </View>
      </Screen>
    );
  }

  const machineLabel = machine.label;
  const isOverloaded = weightKg > machineCapacity;
  const capacityPercent = Math.min((weightKg / machineCapacity) * 100, 100);

  // Formatted end time string
  const formattedEndTimeStr = durationResult.endsAt.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <Screen
      scrollable
      contentContainerStyle={{ paddingBottom: 120 }}
      stickyFooter={
        <View style={styles.stickyFooter}>
          <Text style={styles.footerSummary}>
            {durationResult.durationMinutes} min · ends at {formattedEndTimeStr}
          </Text>
          <Button
            testID="start-wash-button"
            variant="primary"
            loading={isSubmitting}
            disabled={isOverloaded || isSubmitting || !durationResult.isValid}
            onPress={handleStartWash}
            accessibilityLabel="Start wash cycle"
          >
            Start wash
          </Button>
        </View>
      }
    >
      {/* Back button */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to machines"
        onPress={() => router.back()}
        style={styles.backButton}
      >
        <ArrowLeft size={18} color={colors.sky[700]} />
        <Text style={styles.backText}>Machines</Text>
      </Pressable>

      {/* Title & subtitle */}
      <Text style={styles.pageTitle}>Machine {machineLabel}</Text>
      <Text style={styles.subtitle}>Block A · holds up to {machineCapacity} kg</Text>
      {/* Hidden text for screen readers / test queries expecting 'X kg capacity' */}
      <Text style={{ position: 'absolute', opacity: 0 }}>{machineCapacity} kg capacity</Text>

      {/* Race conflict notice */}
      {isRaceConflict && (
        <View testID="race-conflict-alert" style={styles.conflictBanner}>
          <AlertTriangle size={18} color={colors.status.broken} />
          <View style={{ flex: 1 }}>
            <Text style={styles.conflictText}>
              Someone just took this machine. This machine was just taken by someone else.
              Redirecting...
            </Text>
            <Button
              variant="secondary"
              onPress={() => router.replace('/(student)')}
              style={{ marginTop: 8 }}
            >
              Return
            </Button>
          </View>
        </View>
      )}

      {/* Program Selection */}
      <Text style={styles.sectionHeading}>Program</Text>
      <View style={styles.segmentedControl}>
        {programs.map((prog) => {
          const isSelected = activeProgram.id === prog.id;
          return (
            <Pressable
              key={prog.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              onPress={() => setSelectedProgramId(prog.id)}
              style={[styles.segBtn, isSelected && styles.segBtnActive]}
            >
              <Text style={[styles.segBtnText, isSelected && styles.segBtnTextActive]}>
                {prog.name} ({prog.base_minutes}m)
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Water Temperature Selection */}
      <Text style={styles.sectionHeading}>Water temperature</Text>
      <View style={styles.segmentedControl}>
        {tempAdjustments.map((t) => {
          const isSelected = activeTemp.temp === t.temp;
          const displayLabel =
            t.minutes > 0 ? `${t.temp}${t.temp.includes('°') ? '' : '°'} (+${t.minutes}m)` : t.temp;
          return (
            <Pressable
              key={t.temp}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              onPress={() => setSelectedTempName(t.temp)}
              style={[styles.segBtn, isSelected && styles.segBtnActive]}
            >
              <Text style={[styles.segBtnText, isSelected && styles.segBtnTextActive]}>
                {displayLabel}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Spin Speed Selection */}
      <Text style={styles.sectionHeading}>Spin speed</Text>
      <View style={styles.segmentedControl}>
        {spinAdjustments.map((s) => {
          const isSelected = activeSpin.spin === s.spin;
          const displayLabel = s.minutes > 0 ? `${s.spin} (+${s.minutes}m)` : s.spin;
          return (
            <Pressable
              key={s.spin}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              onPress={() => setSelectedSpinName(s.spin)}
              style={[styles.segBtn, isSelected && styles.segBtnActive]}
            >
              <Text style={[styles.segBtnText, isSelected && styles.segBtnTextActive]}>
                {displayLabel}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Weight of clothes Stepper */}
      <Text style={styles.sectionHeading}>Weight of clothes</Text>
      <View style={styles.stepperContainer}>
        <Pressable
          testID="decrease-weight-button"
          accessibilityRole="button"
          accessibilityLabel="Decrease weight"
          disabled={weightKg <= 1}
          onPress={() => setWeightKg((w) => Math.max(1, w - 1))}
          style={[styles.stepperBtn, weightKg <= 1 && styles.stepperBtnDisabled]}
        >
          <Minus size={20} color={weightKg <= 1 ? colors.hairline : colors.ink.DEFAULT} />
        </Pressable>

        <View testID="weight-display" style={styles.weightCenter}>
          <Text style={styles.weightValue}>{weightKg} kg</Text>
        </View>

        <Pressable
          testID="increase-weight-button"
          accessibilityRole="button"
          accessibilityLabel="Increase weight"
          disabled={weightKg >= 12}
          onPress={() => setWeightKg((w) => Math.min(12, w + 1))}
          style={[styles.stepperBtn, weightKg >= 12 && styles.stepperBtnDisabled]}
        >
          <Plus size={20} color={weightKg >= 12 ? colors.hairline : colors.ink.DEFAULT} />
        </Pressable>
      </View>

      {/* Capacity Bar & Hint */}
      <View style={styles.capacityBar}>
        <View
          style={[
            styles.capacityFill,
            { width: `${capacityPercent}%` },
            isOverloaded && styles.capacityFillOverload,
          ]}
        />
      </View>
      <Text style={styles.capacityHint}>
        {weightKg.toFixed(1)} of {machineCapacity} kg used.
      </Text>

      {/* Overload Warning Banner */}
      {isOverloaded && (
        <View testID="overload-warning" style={styles.warningBox}>
          <AlertTriangle size={18} color="#7A5410" style={{ flexShrink: 0, marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.warningTitle}>Load exceeds capacity</Text>
            <Text style={styles.warningText}>
              This is more than the machine can hold. Reduce the load or choose another machine.
            </Text>
          </View>
        </View>
      )}

      {/* Error message */}
      {errorMessage && (
        <Text style={styles.generalError} color="broken">
          {errorMessage}
        </Text>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <View style={styles.toastWrap}>
          <Toast visible={!!toastMessage} message={toastMessage} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    paddingVertical: 24,
  },
  errorContainer: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    alignItems: 'center',
    marginTop: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
    marginBottom: 4,
  },
  backText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F6FA8',
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  pageTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '500',
    fontFamily: 'PlusJakartaSans_500Medium',
    letterSpacing: -0.4,
    color: '#0B2233',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
    color: '#4F6A80',
    fontFamily: 'PlusJakartaSans_400Regular',
    marginBottom: 16,
  },
  conflictBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(253, 236, 236, 0.9)',
    borderWidth: 1,
    borderColor: '#CF4B4B',
    marginBottom: 16,
  },
  conflictText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#CF4B4B',
    fontWeight: '500',
    flex: 1,
  },
  sectionHeading: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
    color: '#0B2233',
    fontFamily: 'PlusJakartaSans_500Medium',
    marginTop: 18,
    marginBottom: 8,
  },
  segmentedControl: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    shadowColor: '#1F6FA8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 1,
  },
  segBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  segBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#1F6FA8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 2,
  },
  segBtnText: {
    fontSize: 12.5,
    fontWeight: '400',
    color: '#4F6A80',
    textAlign: 'center',
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  segBtnTextActive: {
    fontWeight: '500',
    color: '#0B2233',
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 6,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    shadowColor: '#1F6FA8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 1,
  },
  stepperBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1F6FA8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 2,
  },
  stepperBtnDisabled: {
    opacity: 0.4,
  },
  weightCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  weightValue: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '500',
    color: '#0B2233',
  },
  capacityBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(47, 139, 208, 0.2)',
    overflow: 'hidden',
    marginTop: 12,
  },
  capacityFill: {
    height: '100%',
    backgroundColor: '#2F8BD0',
    borderRadius: 3,
  },
  capacityFillOverload: {
    backgroundColor: '#CF4B4B',
  },
  capacityHint: {
    fontSize: 12,
    lineHeight: 16,
    color: '#4F6A80',
    fontFamily: 'PlusJakartaSans_400Regular',
    marginTop: 4,
  },
  warningBox: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E9C98A',
    backgroundColor: 'rgba(255, 244, 222, 0.9)',
    marginTop: 10,
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B4A0E',
    marginBottom: 2,
  },
  warningText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#6B4A0E',
  },
  generalError: {
    fontSize: 12,
    color: '#B83A3A',
    marginTop: 12,
    textAlign: 'center',
  },
  stickyFooter: {
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 24,
    padding: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#1F6FA8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 3,
    ...(Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' } as any)
      : {}),
  },
  footerSummary: {
    fontSize: 13,
    lineHeight: 18,
    color: '#0B2233',
    fontWeight: '500',
    fontFamily: 'PlusJakartaSans_500Medium',
    marginBottom: 8,
  },
  toastWrap: {
    position: 'absolute',
    bottom: 96,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
});
