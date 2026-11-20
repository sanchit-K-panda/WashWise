import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useSyncExternalStore,
} from 'react';
import { View, Modal, TextInput, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, AlertTriangle, X, Clock, HelpCircle } from 'lucide-react-native';
import { colors } from '@/theme/tokens';
import { Screen, Text, Button, Chip, ProgressRing, Skeleton } from '@/components/ui';
import {
  fetchSessionDetails,
  collectWash,
  reportMachineIssue,
  WashSessionDetails,
} from '@/services/wash';
import { cancelSessionNotifications } from '@/services/notifications';

let currentClockTime = 0;
const clockListeners = new Set<() => void>();
let clockIntervalId: ReturnType<typeof setInterval> | null = null;

function subscribeToClock(callback: () => void) {
  clockListeners.add(callback);
  if (clockListeners.size === 1) {
    currentClockTime = Date.now();
    clockIntervalId = setInterval(() => {
      currentClockTime = Date.now();
      clockListeners.forEach((listener) => listener());
    }, 1000);
  }
  return () => {
    clockListeners.delete(callback);
    if (clockListeners.size === 0 && clockIntervalId) {
      clearInterval(clockIntervalId);
      clockIntervalId = null;
    }
  };
}

function getClockSnapshot() {
  if (currentClockTime === 0) {
    currentClockTime = Date.now();
  }
  return currentClockTime;
}

function getClockServerSnapshot() {
  return 0;
}

function formatRemainingTime(seconds: number): string {
  if (seconds <= 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours}:${String(remMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatClockTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'soon';
  }
}

export default function TimerScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Fetch session details from server (source of truth)
  const {
    data: session,
    isLoading,
    isError,
  } = useQuery<WashSessionDetails | null>({
    queryKey: ['wash_session', id],
    queryFn: () => (id ? fetchSessionDetails(id) : null),
    enabled: !!id,
    refetchInterval: 1000 * 10,
  });

  // Client timestamp subscribed to clock, ticked every second for countdown calculation
  const now = useSyncExternalStore(subscribeToClock, getClockSnapshot, getClockServerSnapshot);
  const [isCollecting, setIsCollecting] = useState(false);

  // Issue reporting modal state
  const [isIssueModalVisible, setIsIssueModalVisible] = useState(false);
  const [issueDescription, setIssueDescription] = useState('');
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);
  const [issueSubmittedSuccess, setIssueSubmittedSuccess] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);

  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  // Compute remaining seconds and progress from server ends_at and started_at
  const { remainingSeconds, progressPercent, isCompleted } = useMemo(() => {
    if (!session || !session.ends_at) {
      return { remainingSeconds: 0, progressPercent: 0, isCompleted: false };
    }

    const endMs = new Date(session.ends_at).getTime();
    const startMs = session.started_at
      ? new Date(session.started_at).getTime()
      : endMs - 45 * 60 * 1000;
    const totalMs = Math.max(1000, endMs - startMs);
    const effectiveNow = now > 0 ? now : startMs;
    const remainingMs = Math.max(0, endMs - effectiveNow);
    const elapsedMs = Math.max(0, Math.min(totalMs, effectiveNow - startMs));

    const seconds = Math.ceil(remainingMs / 1000);
    const progress = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
    const done = seconds <= 0 || session.status === 'done' || session.status === 'collected';

    return {
      remainingSeconds: done ? 0 : seconds,
      progressPercent: done ? 100 : progress,
      isCompleted: done,
    };
  }, [session, now]);

  // Handle marking laundry collected and freeing the machine
  const handleCollect = useCallback(async () => {
    if (!session || isCollecting) return;

    setIsCollecting(true);
    try {
      await collectWash(session.id);
      await cancelSessionNotifications(session.id);
      await queryClient.invalidateQueries({ queryKey: ['machines'] });
      await queryClient.invalidateQueries({ queryKey: ['active_session'] });
      router.replace('/(student)');
    } catch {
      // In case of error, still attempt navigation
      router.replace('/(student)');
    } finally {
      setIsCollecting(false);
    }
  }, [session, isCollecting, queryClient, router]);

  // Handle reporting an issue with the machine
  const handleSubmitIssue = useCallback(async () => {
    if (!session || !issueDescription.trim() || isSubmittingIssue) return;

    setIsSubmittingIssue(true);
    setIssueError(null);

    const result = await reportMachineIssue(session.machine_id, issueDescription.trim());
    setIsSubmittingIssue(false);

    if (result.success) {
      setIssueSubmittedSuccess(true);
      successTimeoutRef.current = setTimeout(() => {
        setIsIssueModalVisible(false);
        setIssueSubmittedSuccess(false);
        setIssueDescription('');
      }, 1500);
    } else {
      setIssueError(result.error || 'Failed to submit report. Please try again.');
    }
  }, [session, issueDescription, isSubmittingIssue]);

  // Loading skeleton state
  if (isLoading) {
    return (
      <Screen
        header={{
          title: 'Wash Timer',
          subtitle: 'Loading session…',
          onBack: () => router.replace('/(student)'),
        }}
      >
        <View testID="timer-loading" className="items-center py-12">
          <View className="w-56 h-56 rounded-full border-4 border-hairline items-center justify-center mb-8">
            <Skeleton.Line width={100} style={{ height: 32 }} />
            <View className="h-3" />
            <Skeleton.Line width={70} style={{ height: 16 }} />
          </View>
          <View className="w-full p-4 rounded-md border border-hairline bg-surface">
            <Skeleton.Line width="75%" style={{ height: 20 }} />
            <View className="h-2" />
            <Skeleton.Line width="50%" style={{ height: 16 }} />
          </View>
        </View>
      </Screen>
    );
  }

  // Not found or error state
  if (isError || !session) {
    return (
      <Screen
        header={{
          title: 'Wash Timer',
          subtitle: 'Session not found',
          onBack: () => router.replace('/(student)'),
        }}
      >
        <View
          testID="session-not-found"
          className="p-6 rounded-md border border-hairline bg-surface items-center text-center my-8"
        >
          <HelpCircle size={32} strokeWidth={1.75} color={colors.ink.muted} />
          <Text variant="section" color="ink" style={{ textAlign: 'center', marginTop: 12 }}>
            No active session found
          </Text>
          <Text
            variant="body"
            color="muted"
            style={{ textAlign: 'center', marginTop: 4, marginBottom: 16 }}
          >
            This wash session may have already completed or was collected.
          </Text>
          <Button variant="secondary" onPress={() => router.replace('/(student)')}>
            Back to machines
          </Button>
        </View>
      </Screen>
    );
  }

  const machineLabel = session.machine?.label || '01';
  const programName = session.program?.name || 'Normal';
  const endsAtFormatted = formatClockTime(session.ends_at);
  const formattedCountdown = formatRemainingTime(remainingSeconds);

  return (
    <Screen
      scrollable
      header={{
        title: `Machine ${machineLabel}`,
        subtitle: isCompleted ? 'Cycle complete' : `Ends approx. ${endsAtFormatted}`,
        onBack: () => router.replace('/(student)'),
      }}
      stickyFooter={
        <View className="space-y-3 gap-3">
          <Button
            testID="collected-button"
            variant="primary"
            leftIcon={<Check size={18} strokeWidth={2} color="#FFFFFF" />}
            loading={isCollecting}
            disabled={isCollecting}
            onPress={handleCollect}
            accessibilityLabel="Mark laundry collected and free machine"
          >
            Collected
          </Button>

          <Button
            testID="report-issue-button"
            variant="outline"
            leftIcon={<AlertTriangle size={18} strokeWidth={1.75} color={colors.ink.muted} />}
            onPress={() => setIsIssueModalVisible(true)}
            accessibilityLabel="Report issue with this machine"
          >
            Report issue
          </Button>
        </View>
      }
    >
      {/* Hero Circular Progress & Tabular Mono Countdown */}
      <View className="items-center py-6">
        <ProgressRing
          size={220}
          strokeWidth={5}
          progress={progressPercent}
          color={isCompleted ? colors.status.available : colors.sky[500]}
          trackColor={colors.hairline}
        >
          <View className="items-center px-4">
            <Text
              variant="caption"
              color={isCompleted ? 'available' : 'muted'}
              style={{ fontWeight: '600', letterSpacing: 0.5, marginBottom: 4 }}
            >
              {isCompleted ? 'CYCLE COMPLETE' : 'TIME REMAINING'}
            </Text>

            <Text
              testID="timer-countdown"
              variant="monoTimer"
              color="ink"
              style={{ fontSize: 44, lineHeight: 52 }}
            >
              {formattedCountdown}
            </Text>

            <View style={{ marginTop: 6 }}>
              {isCompleted ? (
                <Chip variant="available" label="Ready to collect" />
              ) : (
                <Chip variant="in_use" label="Washing" />
              )}
            </View>
          </View>
        </ProgressRing>
      </View>

      {/* Machine & Cycle Details Card */}
      <View className="p-4 bg-surface rounded-md border border-hairline mb-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text variant="section" color="ink">
            Cycle details
          </Text>
          <Text variant="caption" color="muted">
            {session.machine ? `${session.machine.capacity_kg} kg drum` : ''}
          </Text>
        </View>

        <View className="space-y-2 gap-2">
          <View className="flex-row justify-between">
            <Text variant="body" color="muted">
              Program
            </Text>
            <Text variant="body" color="ink" style={{ fontWeight: '500' }}>
              {programName}
            </Text>
          </View>

          <View className="flex-row justify-between">
            <Text variant="body" color="muted">
              Settings
            </Text>
            <Text variant="body" color="ink">
              {session.temp}°C · {session.spin} spin
            </Text>
          </View>

          <View className="flex-row justify-between">
            <Text variant="body" color="muted">
              Load weight
            </Text>
            <Text variant="body" color="ink">
              {session.weight_kg} kg
            </Text>
          </View>

          <View className="flex-row justify-between pt-1 border-t border-hairline">
            <Text variant="body" color="muted">
              Completion
            </Text>
            <Text variant="body" tabular color="ink" style={{ fontWeight: '600' }}>
              {endsAtFormatted}
            </Text>
          </View>
        </View>
      </View>

      {/* Notification and collection guidance notice */}
      <View className="p-3.5 bg-surface rounded-md border border-hairline flex-row items-start gap-2.5 mb-6">
        <Clock size={18} strokeWidth={1.75} color={colors.ink.muted} style={{ marginTop: 2 }} />
        <View className="flex-1">
          <Text variant="caption" color="ink" style={{ fontWeight: '600' }}>
            Local reminders scheduled
          </Text>
          <Text variant="caption" color="muted" style={{ marginTop: 2 }}>
            You will receive a notification 5 minutes before cycle completion and when your clothes
            are ready.
          </Text>
        </View>
      </View>

      {/* Report Issue Modal */}
      <Modal
        visible={isIssueModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsIssueModalVisible(false)}
      >
        <View
          testID="report-issue-modal"
          className="flex-1 justify-center items-center px-5 bg-ink/40"
        >
          <View className="w-full max-w-sm bg-white p-5 rounded-lg border border-hairline">
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text variant="section" color="ink">
                  Report machine issue
                </Text>
                <Text variant="caption" color="muted">
                  Machine {machineLabel}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Close report modal"
                accessibilityRole="button"
                onPress={() => setIsIssueModalVisible(false)}
                className="w-8 h-8 items-center justify-center -mr-1 rounded-full active:bg-sky-50"
              >
                <X size={18} strokeWidth={1.75} color={colors.ink.muted} />
              </Pressable>
            </View>

            {issueSubmittedSuccess ? (
              <View testID="issue-success-message" className="py-6 items-center">
                <Check size={28} strokeWidth={2} color={colors.status.available} />
                <Text variant="body" color="ink" style={{ marginTop: 8, fontWeight: '500' }}>
                  Report submitted to caretaker
                </Text>
                <Text variant="caption" color="muted" style={{ marginTop: 4 }}>
                  Thank you for keeping laundry running smoothly.
                </Text>
              </View>
            ) : (
              <>
                <Text variant="caption" color="muted" style={{ marginBottom: 6 }}>
                  Describe what went wrong:
                </Text>

                <TextInput
                  testID="issue-description-input"
                  value={issueDescription}
                  onChangeText={setIssueDescription}
                  placeholder="e.g. Door won't unlock, water leak, loud vibrations…"
                  placeholderTextColor={colors.ink.muted}
                  multiline
                  numberOfLines={4}
                  style={{
                    backgroundColor: colors.surface,
                    borderColor: colors.hairline,
                    borderWidth: 1,
                    borderRadius: 8,
                    padding: 10,
                    fontSize: 14,
                    color: colors.ink.DEFAULT,
                    textAlignVertical: 'top',
                    minHeight: 88,
                    marginBottom: 12,
                  }}
                />

                {issueError && (
                  <Text variant="caption" color="broken" style={{ marginBottom: 10 }}>
                    {issueError}
                  </Text>
                )}

                <View className="flex-row justify-end gap-2.5">
                  <Button
                    variant="secondary"
                    fullWidth={false}
                    onPress={() => setIsIssueModalVisible(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    testID="submit-issue-button"
                    variant="primary"
                    fullWidth={false}
                    disabled={!issueDescription.trim() || isSubmittingIssue}
                    loading={isSubmittingIssue}
                    onPress={handleSubmitIssue}
                  >
                    Submit report
                  </Button>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
