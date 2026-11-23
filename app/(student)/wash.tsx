import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, TextInput, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Flag, WashingMachine } from 'lucide-react-native';
import { colors, typography } from '@/theme/tokens';
import { glassCard, glassPanel, btnPrimary, btnGhost } from '@/theme/glass';
import { Screen, Text, Button, ProgressRing, Skeleton } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useActiveSession } from '@/hooks/useActiveSession';
import { useHostelBlock } from '@/hooks/useMachines';
import { endWash, reportMachineIssue } from '@/services/wash';

export default function MyWashScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { activeSession, isLoading } = useActiveSession();
  const { block } = useHostelBlock(profile?.hostel_block_id);
  const blockName = block?.name || 'Block A';

  // Countdown timer state
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  const totalSeconds = activeSession
    ? Math.max(
        60,
        Math.round(
          (new Date(activeSession.ends_at).getTime() -
            new Date(activeSession.started_at).getTime()) /
            1000
        )
      )
    : 2700;

  // Sheets state
  const [showCollectSheet, setShowCollectSheet] = useState(false);
  const [showCancelSheet, setShowCancelSheet] = useState(false);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [reportText, setReportText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  useEffect(() => {
    if (!activeSession) return;

    const endMs = new Date(activeSession.ends_at).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diffSec = Math.max(0, Math.round((endMs - now) / 1000));
      setSecondsRemaining(diffSec);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const handleCollect = async () => {
    if (!activeSession) return;
    setIsSubmitting(true);
    try {
      await endWash(activeSession.id, 'collected');
      queryClient.invalidateQueries({ queryKey: ['active-session'] });
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      queryClient.invalidateQueries({ queryKey: ['history'] });
      setShowCollectSheet(false);
      showToast('Machine freed. Thank you!');
    } catch {
      showToast('Failed to free machine. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!activeSession) return;
    setIsSubmitting(true);
    try {
      await endWash(activeSession.id, 'cancelled');
      queryClient.invalidateQueries({ queryKey: ['active-session'] });
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      queryClient.invalidateQueries({ queryKey: ['history'] });
      setShowCancelSheet(false);
      showToast('Wash cancelled.');
    } catch {
      showToast('Failed to cancel wash.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReport = async () => {
    if (!activeSession || !reportText.trim()) return;
    setIsSubmitting(true);
    try {
      await reportMachineIssue(
        activeSession.machine_id,
        reportText.trim(),
        activeSession.machine?.label
      );
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      setShowReportSheet(false);
      setReportText('');
      showToast('Report sent to the caretaker');
    } catch {
      showToast('Failed to send report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Screen>
        <View style={{ gap: 16, paddingTop: 16 }}>
          <Skeleton.Line width="40%" />
          <Skeleton.Line width="60%" />
          <Skeleton.Card />
        </View>
      </Screen>
    );
  }

  // Empty state when no wash is running
  if (!activeSession || activeSession.status !== 'running') {
    return (
      <Screen scrollable>
        <View style={styles.topBar}>
          <Text style={styles.topBarText}>{blockName}</Text>
        </View>

        <Text style={styles.title}>My wash</Text>
        <Text style={styles.subtitle}>Active wash timer</Text>

        <View style={styles.emptyCard}>
          <View style={styles.emptyIconCircle}>
            <WashingMachine size={26} strokeWidth={1.75} color={colors.sky[700]} />
          </View>
          <Text style={styles.emptyTitle}>No wash running</Text>
          <Text style={styles.emptyDesc}>
            Start a wash from the Machines tab to see your live countdown and finish time here.
          </Text>
          <Button
            variant="primary"
            onPress={() => router.push('/(student)')}
            style={styles.emptyButton}
            accessibilityLabel="Find a machine"
          >
            Find a machine
          </Button>
        </View>
      </Screen>
    );
  }

  // Active wash running state
  const machineLabel = activeSession.machine?.label || '01';
  const endsAtFormatted = new Date(activeSession.ends_at).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const progressPercent = Math.max(
    0,
    Math.min(100, Math.round(((totalSeconds - secondsRemaining) / totalSeconds) * 100))
  );

  return (
    <Screen scrollable>
      <View style={styles.topBar}>
        <Text style={styles.topBarText}>
          Machine {machineLabel} · {blockName}
        </Text>
      </View>

      <Text style={styles.title}>Washing</Text>
      <Text style={styles.subtitle}>Ends at {endsAtFormatted}</Text>

      {/* Countdown Ring */}
      <View style={styles.ringOuter}>
        <View style={styles.ringContainer}>
          <ProgressRing
            progress={progressPercent}
            size={200}
            strokeWidth={10}
            color={colors.sky[500]}
            trackColor="rgba(47, 139, 208, 0.20)"
          >
            <View style={styles.ringCenterText}>
              <Text style={styles.ringTime}>{timeFormatted}</Text>
              <Text style={styles.ringSub}>remaining</Text>
            </View>
          </ProgressRing>
        </View>
      </View>

      {/* Details Card */}
      <View style={styles.card}>
        <View style={styles.kvRow}>
          <Text style={styles.kvKey}>Program</Text>
          <Text style={styles.kvValue}>{activeSession.program?.name || 'Normal'}</Text>
        </View>
        <View style={styles.kvRow}>
          <Text style={styles.kvKey}>Temperature</Text>
          <Text style={styles.kvValue}>
            {activeSession.temp === 'cold' ? 'Cold' : `${activeSession.temp}°C`}
          </Text>
        </View>
        <View style={styles.kvRow}>
          <Text style={styles.kvKey}>Spin</Text>
          <Text style={styles.kvValue}>
            {activeSession.spin.charAt(0).toUpperCase() + activeSession.spin.slice(1)}
          </Text>
        </View>
        <View style={[styles.kvRow, styles.kvRowLast]}>
          <Text style={styles.kvKey}>Load</Text>
          <Text style={styles.kvValue}>{activeSession.weight_kg.toFixed(1)} kg</Text>
        </View>
      </View>

      <Text style={styles.reminderHint}>We will remind you 5 minutes before it ends.</Text>

      {/* Action Buttons */}
      <Button
        variant="primary"
        onPress={() => setShowCollectSheet(true)}
        accessibilityLabel="I collected my clothes"
        style={styles.actionBtn}
        leftIcon={<Check size={18} strokeWidth={2} color="#FFFFFF" />}
      >
        I collected my clothes
      </Button>

      <Button
        variant="secondary"
        onPress={() => setShowReportSheet(true)}
        accessibilityLabel="Report a problem"
        style={styles.actionBtn}
        leftIcon={<Flag size={18} strokeWidth={1.75} color={colors.ink.DEFAULT} />}
      >
        Report a problem
      </Button>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cancel this wash"
        onPress={() => setShowCancelSheet(true)}
        style={styles.cancelBtn}
      >
        <Text style={styles.cancelBtnText}>Cancel this wash</Text>
      </Pressable>

      {/* Toast Notification */}
      {toastMessage && (
        <View style={styles.toast} accessibilityRole="alert">
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* Collect Sheet */}
      <Modal
        visible={showCollectSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCollectSheet(false)}
      >
        <Pressable style={styles.modalScrim} onPress={() => setShowCollectSheet(false)}>
          <Pressable style={styles.bottomSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.grabBar} />
            <Text style={styles.sheetTitle}>Done with Machine {machineLabel}?</Text>
            <Text style={styles.sheetDesc}>
              The machine will be marked free for the next student.
            </Text>
            <Button
              variant="primary"
              onPress={handleCollect}
              disabled={isSubmitting}
              accessibilityLabel="Yes, free the machine"
              style={{ marginBottom: 8 }}
            >
              Yes, free the machine
            </Button>
            <Button
              variant="secondary"
              onPress={() => setShowCollectSheet(false)}
              accessibilityLabel="Not yet"
            >
              Not yet
            </Button>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Cancel Sheet */}
      <Modal
        visible={showCancelSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCancelSheet(false)}
      >
        <Pressable style={styles.modalScrim} onPress={() => setShowCancelSheet(false)}>
          <Pressable style={styles.bottomSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.grabBar} />
            <Text style={styles.sheetTitle}>Cancel this wash?</Text>
            <Text style={styles.sheetDesc}>
              The cycle stops and the machine is released. Your clothes will be wet, so remember to
              collect them.
            </Text>
            <Button
              variant="danger"
              onPress={handleCancel}
              disabled={isSubmitting}
              accessibilityLabel="Cancel wash"
              style={{ marginBottom: 8 }}
            >
              Cancel wash
            </Button>
            <Button
              variant="secondary"
              onPress={() => setShowCancelSheet(false)}
              accessibilityLabel="Keep washing"
            >
              Keep washing
            </Button>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Report Sheet */}
      <Modal
        visible={showReportSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReportSheet(false)}
      >
        <Pressable style={styles.modalScrim} onPress={() => setShowReportSheet(false)}>
          <Pressable style={styles.bottomSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.grabBar} />
            <Text style={styles.sheetTitle}>Report a problem</Text>
            <Text style={styles.sheetSubtitle}>What is wrong with Machine {machineLabel}?</Text>
            <View style={styles.inputArea}>
              <TextInput
                value={reportText}
                onChangeText={setReportText}
                placeholder="e.g. Door will not unlock, drum not spinning"
                placeholderTextColor={colors.ink.muted}
                multiline
                numberOfLines={3}
                style={styles.textInput}
              />
            </View>
            <Button
              variant="primary"
              onPress={handleReport}
              disabled={isSubmitting || !reportText.trim()}
              accessibilityLabel="Send report"
              style={{ marginBottom: 8, marginTop: 12 }}
            >
              Send report
            </Button>
            <Button
              variant="secondary"
              onPress={() => setShowReportSheet(false)}
              accessibilityLabel="Cancel"
            >
              Cancel
            </Button>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    minHeight: 28,
    justifyContent: 'center',
    marginBottom: 2,
  },
  topBarText: {
    fontSize: 12,
    fontFamily: typography.caption.fontFamily,
    color: colors.ink.muted,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: typography.screenTitle.fontFamily,
    fontWeight: '500',
    color: colors.ink.DEFAULT,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: typography.caption.fontFamily,
    color: colors.ink.muted,
    marginBottom: 16,
    marginTop: 2,
  },
  emptyCard: {
    ...glassCard,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: typography.section.fontFamily,
    fontWeight: '500',
    marginBottom: 4,
    color: colors.ink.DEFAULT,
  },
  emptyDesc: {
    fontSize: 14,
    fontFamily: typography.body.fontFamily,
    color: colors.ink.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
    maxWidth: 290,
  },
  emptyButton: {
    ...btnPrimary,
    width: '100%',
    minHeight: 50,
    borderRadius: 16,
  },
  ringOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
  },
  ringContainer: {
    ...glassCard,
    width: 216,
    height: 216,
    borderRadius: 108,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenterText: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringTime: {
    fontFamily: typography.monoTimer.fontFamily,
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '500',
    color: colors.ink.DEFAULT,
  },
  ringSub: {
    fontSize: 12,
    fontFamily: typography.caption.fontFamily,
    color: colors.ink.muted,
    marginTop: 2,
  },
  card: {
    ...glassCard,
    borderRadius: 20,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 34, 48, 0.07)',
  },
  kvRowLast: {
    borderBottomWidth: 0,
  },
  kvKey: {
    fontSize: 13,
    fontFamily: typography.body.fontFamily,
    color: colors.ink.muted,
  },
  kvValue: {
    fontSize: 14,
    fontFamily: typography.body.fontFamily,
    fontWeight: '500',
    color: colors.ink.DEFAULT,
  },
  reminderHint: {
    fontSize: 12,
    fontFamily: typography.caption.fontFamily,
    color: colors.ink.muted,
    textAlign: 'center',
    marginBottom: 18,
  },
  actionBtn: {
    minHeight: 50,
    borderRadius: 16,
    marginBottom: 10,
  },
  cancelBtn: {
    ...btnGhost,
    minHeight: 44,
    marginTop: 2,
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#B83A3A',
    fontFamily: typography.body.fontFamily,
    fontSize: 14,
    fontWeight: '500',
  },
  toast: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: colors.ink.DEFAULT,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    zIndex: 40,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  modalScrim: {
    flex: 1,
    backgroundColor: 'rgba(15, 34, 48, 0.45)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    ...glassPanel,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 28,
  },
  grabBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(15, 34, 48, 0.18)',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 19,
    fontFamily: typography.section.fontFamily,
    fontWeight: '500',
    marginBottom: 6,
    color: colors.ink.DEFAULT,
  },
  sheetSubtitle: {
    fontSize: 12,
    fontFamily: typography.caption.fontFamily,
    color: colors.ink.muted,
    marginBottom: 10,
  },
  sheetDesc: {
    fontSize: 14,
    fontFamily: typography.body.fontFamily,
    color: colors.ink.muted,
    marginBottom: 16,
    lineHeight: 20,
  },
  inputArea: {
    ...glassCard,
    borderRadius: 16,
    padding: 12,
    minHeight: 80,
    marginBottom: 10,
  },
  textInput: {
    fontFamily: typography.body.fontFamily,
    fontSize: 14,
    color: colors.ink.DEFAULT,
    minHeight: 56,
    textAlignVertical: 'top',
  },
});
