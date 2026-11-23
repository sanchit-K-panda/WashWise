import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Modal, TextInput, Pressable, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Flag, AlertTriangle } from 'lucide-react-native';
import { colors } from '@/theme/tokens';
import { Screen, Text, Button, ProgressRing, Skeleton } from '@/components/ui';
import { Toast } from '@/components/ui/Toast';
import {
  fetchSessionDetails,
  collectWash,
  cancelWash,
  reportMachineIssue,
  WashSessionDetails,
} from '@/services/wash';
import { scheduleWashNotifications, cancelSessionNotifications } from '@/services/notifications';

function formatClockTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return 'soon';
  }
}

function formatRemaining(totalSeconds: number): string {
  if (totalSeconds <= 0) return '00:00';
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
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
    error,
  } = useQuery<WashSessionDetails | null>({
    queryKey: ['wash_session', id],
    queryFn: () => (id ? fetchSessionDetails(id) : null),
    enabled: !!id,
    refetchInterval: 1000 * 10,
  });

  // Clock tick for countdown calculation
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  useEffect(() => {
    if (!session || !session.ends_at) return;

    // Restore local notifications on reopen
    const endsDate = new Date(session.ends_at);
    if (endsDate.getTime() > Date.now()) {
      scheduleWashNotifications(session.id, session.machine?.label || '01', endsDate).catch(
        () => {}
      );
    }

    const endMs = endsDate.getTime();
    const updateCountdown = () => {
      const now = Date.now();
      const diffSec = Math.max(0, Math.round((endMs - now) / 1000));
      setSecondsRemaining(diffSec);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [session]);

  const totalCycleSeconds = useMemo(() => {
    if (!session || !session.ends_at) return 2700;
    const startMs = session.started_at
      ? new Date(session.started_at).getTime()
      : new Date(session.ends_at).getTime() - 45 * 60 * 1000;
    const endMs = new Date(session.ends_at).getTime();
    return Math.max(60, Math.round((endMs - startMs) / 1000));
  }, [session]);

  const elapsedSeconds = Math.max(0, totalCycleSeconds - secondsRemaining);
  const progressPercent = Math.min(100, Math.max(0, (elapsedSeconds / totalCycleSeconds) * 100));
  const isDone = secondsRemaining <= 0 || session?.status === 'collected';

  // Dialog states
  const [showCollectSheet, setShowCollectSheet] = useState(false);
  const [showCancelSheet, setShowCancelSheet] = useState(false);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [reportText, setReportText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleCollect = async () => {
    if (!session) return;
    setIsSubmitting(true);
    try {
      await collectWash(session.id);
      await cancelSessionNotifications(session.id);
      queryClient.invalidateQueries({ queryKey: ['active-session'] });
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      queryClient.invalidateQueries({ queryKey: ['history'] });
      setShowCollectSheet(false);
      router.replace('/(student)');
    } catch {
      showToast('Failed to free machine. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!session) return;
    setIsSubmitting(true);
    try {
      await cancelWash(session.id);
      await cancelSessionNotifications(session.id);
      queryClient.invalidateQueries({ queryKey: ['active-session'] });
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      queryClient.invalidateQueries({ queryKey: ['history'] });
      setShowCancelSheet(false);
      router.replace('/(student)');
    } catch {
      showToast('Failed to cancel wash.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReport = async () => {
    if (!session || !reportText.trim()) return;
    setIsSubmitting(true);
    const res = await reportMachineIssue(session.machine_id, reportText.trim());
    setIsSubmitting(false);
    if (res.success) {
      setReportSuccess(true);
      setTimeout(() => {
        setShowReportSheet(false);
        setReportText('');
        setReportSuccess(false);
      }, 1000);
      showToast('Sent to the caretaker');
      queryClient.invalidateQueries({ queryKey: ['issues'] });
    } else {
      showToast(res.error || 'Failed to submit report.');
    }
  };

  if (isLoading) {
    return (
      <Screen>
        <View testID="timer-loading" style={styles.loadingContainer}>
          <Skeleton.Line width={140} style={{ height: 20, marginBottom: 8 }} />
          <Skeleton.Line width={180} style={{ height: 34, marginBottom: 16 }} />
          <View style={styles.skeletonRing}>
            <Skeleton.Line width={120} style={{ height: 44, marginBottom: 8 }} />
            <Skeleton.Line width={60} style={{ height: 16 }} />
          </View>
          <Skeleton.Line width="100%" style={{ height: 160, borderRadius: 12 }} />
        </View>
      </Screen>
    );
  }

  if (isError || !session) {
    return (
      <Screen>
        <View testID="session-not-found" style={styles.errorContainer}>
          <AlertTriangle size={32} color={colors.status.broken} />
          <Text variant="section" style={{ marginTop: 12, marginBottom: 4 }}>
            No active session found
          </Text>
          <Text variant="body" color="muted" style={{ textAlign: 'center', marginBottom: 16 }}>
            {error?.message || 'This wash session may have already completed or was collected.'}
          </Text>
          <Button variant="secondary" onPress={() => router.replace('/(student)')}>
            Back to machines
          </Button>
        </View>
      </Screen>
    );
  }

  const machineLabel = session.machine?.label || '01';
  const endsAtFormatted = formatClockTime(session.ends_at);
  const formattedCountdown = formatRemaining(secondsRemaining);

  return (
    <Screen scrollable contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Top line with machine label and block */}
      <View style={styles.topBar}>
        <Text style={styles.topCaption}>Machine {machineLabel}</Text>
        <Text style={styles.topCaption}> · Block A</Text>
      </View>

      {/* Screen Title & Subtitle */}
      <Text style={styles.title}>{isDone ? 'Finished' : 'Washing'}</Text>
      <Text style={styles.subtitle}>
        {isDone ? 'Ready to collect' : `Ends at ${endsAtFormatted}`}
      </Text>

      {/* Hero Circular Progress Ring & Center Mono Countdown */}
      <View style={styles.ringWrap}>
        <ProgressRing
          size={220}
          strokeWidth={10}
          progress={progressPercent}
          color={isDone ? colors.status.available : colors.sky[500]}
          trackColor={colors.sky[200]}
        >
          <View testID="timer-countdown" style={styles.ringCenter}>
            <Text
              style={[
                styles.remainingCaption,
                { color: isDone ? colors.status.available : colors.ink.muted },
              ]}
            >
              {isDone ? 'CYCLE COMPLETE' : 'TIME REMAINING'}
            </Text>
            <Text style={styles.monoCountdown}>{formattedCountdown}</Text>
          </View>
        </ProgressRing>
      </View>

      {/* Program details Key-Value card */}
      <View style={styles.detailCard}>
        <View style={styles.kvRow}>
          <Text style={styles.kvLabel}>Program</Text>
          <Text style={styles.kvValue}>{session.program?.name || 'Normal'}</Text>
        </View>
        <View style={styles.kvRow}>
          <Text style={styles.kvLabel}>Temperature</Text>
          <Text style={styles.kvValue}>
            {session.temp.includes('°') || session.temp === 'Cold'
              ? `${session.temp} · ${session.spin} spin`
              : `${session.temp}°C · ${session.spin} spin`}
          </Text>
        </View>
        <View style={styles.kvRow}>
          <Text style={styles.kvLabel}>Spin</Text>
          <Text style={styles.kvValue}>{session.spin}</Text>
        </View>
        <View style={[styles.kvRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.kvLabel}>Load</Text>
          <Text style={styles.kvValue}>{Number(session.weight_kg).toFixed(1)} kg</Text>
        </View>
      </View>

      {/* Reminder Hint */}
      <Text style={styles.hint}>We will remind you 5 minutes before it ends.</Text>

      {/* Action Buttons */}
      <View style={styles.actionsWrap}>
        <Button
          testID="collected-button"
          variant="primary"
          leftIcon={<Check size={18} strokeWidth={2} color="#FFFFFF" />}
          onPress={handleCollect}
          accessibilityLabel="I collected my clothes"
        >
          I collected my clothes
        </Button>

        <Button
          testID="report-issue-button"
          variant="secondary"
          leftIcon={<Flag size={18} strokeWidth={1.75} color={colors.ink.DEFAULT} />}
          onPress={() => setShowReportSheet(true)}
          accessibilityLabel="Report a problem"
          style={{ marginTop: 8 }}
        >
          Report a problem
        </Button>

        <Button
          variant="ghost"
          onPress={() => setShowCancelSheet(true)}
          accessibilityLabel="Cancel this wash"
          style={styles.cancelGhostBtn}
        >
          <Text style={styles.cancelGhostText}>Cancel this wash</Text>
        </Button>
      </View>

      {/* Collect confirmation bottom sheet */}
      <Modal
        visible={showCollectSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCollectSheet(false)}
      >
        <Pressable style={styles.scrim} onPress={() => setShowCollectSheet(false)} />
        <View
          style={styles.panel}
          accessibilityRole="dialog"
          accessibilityLabel="Done with machine"
        >
          <View style={styles.grab} />
          <Text style={styles.sheetTitle}>Done with Machine {machineLabel}?</Text>
          <Text style={styles.sheetCaption}>
            The machine becomes available for the next student.
          </Text>
          <Button
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting}
            onPress={handleCollect}
            style={{ marginTop: 16 }}
          >
            Yes, free the machine
          </Button>
          <Button
            variant="secondary"
            disabled={isSubmitting}
            onPress={() => setShowCollectSheet(false)}
            style={{ marginTop: 8 }}
          >
            Not yet
          </Button>
        </View>
      </Modal>

      {/* Cancel confirmation bottom sheet */}
      <Modal
        visible={showCancelSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCancelSheet(false)}
      >
        <Pressable style={styles.scrim} onPress={() => setShowCancelSheet(false)} />
        <View style={styles.panel} accessibilityRole="dialog" accessibilityLabel="Cancel wash">
          <View style={styles.grab} />
          <Text style={styles.sheetTitle}>Cancel this wash?</Text>
          <Text style={styles.sheetCaption}>
            The cycle stops and the machine is released. Your clothes will be wet, so collect them.
          </Text>
          <Button
            variant="danger"
            loading={isSubmitting}
            disabled={isSubmitting}
            onPress={handleCancel}
            style={{ marginTop: 16 }}
          >
            Cancel wash
          </Button>
          <Button
            variant="secondary"
            disabled={isSubmitting}
            onPress={() => setShowCancelSheet(false)}
            style={{ marginTop: 8 }}
          >
            Keep washing
          </Button>
        </View>
      </Modal>

      {/* Report problem bottom sheet */}
      <Modal
        testID="report-issue-modal"
        visible={showReportSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReportSheet(false)}
      >
        <Pressable style={styles.scrim} onPress={() => setShowReportSheet(false)} />
        <View
          style={styles.panel}
          accessibilityRole="dialog"
          accessibilityLabel="Report machine issue"
        >
          <View style={styles.grab} />
          <Text style={styles.sheetTitle}>Report machine issue</Text>
          <Text style={styles.fieldLabel}>What is wrong with Machine {machineLabel}?</Text>
          <View style={styles.textareaWrapper}>
            <TextInput
              testID="issue-description-input"
              value={reportText}
              onChangeText={setReportText}
              placeholder="e.g. Door will not lock"
              placeholderTextColor={colors.ink.muted}
              multiline
              numberOfLines={4}
              style={styles.textarea}
              textAlignVertical="top"
            />
          </View>

          {reportSuccess && (
            <View testID="issue-success-message" style={{ marginBottom: 12 }}>
              <Text style={{ color: colors.status.available, fontWeight: '600' }}>
                Report submitted successfully!
              </Text>
            </View>
          )}

          <Button
            testID="submit-issue-button"
            variant="primary"
            loading={isSubmitting}
            disabled={!reportText.trim() || isSubmitting}
            onPress={handleReport}
          >
            Send report
          </Button>
          <Button
            variant="secondary"
            disabled={isSubmitting}
            onPress={() => setShowReportSheet(false)}
            style={{ marginTop: 8 }}
          >
            Cancel
          </Button>
        </View>
      </Modal>

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
    alignItems: 'center',
  },
  skeletonRing: {
    width: 216,
    height: 216,
    borderRadius: 108,
    borderWidth: 9,
    borderColor: 'rgba(47, 139, 208, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    alignSelf: 'center',
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
  topBar: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  topCaption: {
    fontSize: 12,
    lineHeight: 16,
    color: '#4F6A80',
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '500',
    fontFamily: 'PlusJakartaSans_500Medium',
    letterSpacing: -0.4,
    color: '#0B2233',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
    color: '#4F6A80',
    fontFamily: 'PlusJakartaSans_400Regular',
    marginBottom: 12,
  },
  ringWrap: {
    width: 216,
    height: 216,
    borderRadius: 108,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: 16,
    shadowColor: '#1F6FA8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 2,
    ...(Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' } as any)
      : {}),
  },
  ringCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  monoCountdown: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '500',
    color: '#0B2233',
  },
  remainingCaption: {
    fontSize: 12,
    lineHeight: 16,
    color: '#4F6A80',
    fontFamily: 'PlusJakartaSans_400Regular',
    marginTop: 2,
  },
  detailCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 14,
    marginTop: 12,
    shadowColor: '#1F6FA8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 2,
    ...(Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' } as any)
      : {}),
  },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 34, 48, 0.07)',
  },
  kvLabel: {
    fontSize: 13,
    color: '#4F6A80',
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  kvValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0B2233',
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  hint: {
    fontSize: 12,
    color: '#4F6A80',
    textAlign: 'center',
    marginVertical: 10,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  actionsWrap: {
    marginTop: 6,
    gap: 8,
  },
  cancelGhostBtn: {
    backgroundColor: 'transparent',
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelGhostText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#B83A3A',
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 34, 51, 0.38)',
  },
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxWidth: 430,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 28,
    shadowColor: '#0B2233',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.18,
    shadowRadius: 40,
    elevation: 8,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(26px) saturate(1.7)',
          WebkitBackdropFilter: 'blur(26px) saturate(1.7)',
        } as any)
      : {}),
  },
  grab: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(15, 34, 48, 0.18)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
    color: '#0B2233',
    fontFamily: 'PlusJakartaSans_500Medium',
    marginBottom: 4,
  },
  sheetCaption: {
    fontSize: 14,
    lineHeight: 20,
    color: '#0B2233',
    marginBottom: 12,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0B2233',
    marginVertical: 8,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  textareaWrapper: {
    minHeight: 80,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    marginBottom: 14,
  },
  textarea: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: '#0B2233',
    minHeight: 64,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  toastWrap: {
    position: 'absolute',
    bottom: 84,
    left: 18,
    right: 18,
    alignItems: 'center',
    zIndex: 9,
  },
});
