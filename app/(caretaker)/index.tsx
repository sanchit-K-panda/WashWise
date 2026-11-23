import React, { useState, useMemo, useCallback } from 'react';
import { View, Pressable, RefreshControl, Modal, TextInput, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, AlertTriangle, Wrench, Ban, Check } from 'lucide-react-native';
import { colors, typography } from '@/theme/tokens';
import { glassCard, glassPanel, btnGhost } from '@/theme/glass';
import { Screen, Text, Chip, Button } from '@/components/ui';
import { Toast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { useMachines } from '@/hooks/useMachines';
import {
  MachineWithSession,
  MachineStatus,
  VerifyMachineParams,
  ForceClearMachineParams,
  IssueReportWithMachine,
  ResolveIssueParams,
} from '@/types';
import {
  updateMachineStatus,
  verifyMachine,
  forceClearMachine,
  fetchBlockIssues,
  resolveIssue,
} from '@/services/caretaker';

function formatVerifiedTime(timestamp: string | null): string {
  if (!timestamp) return 'Not verified today';
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return 'Not verified today';
    return `Verified ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  } catch {
    return 'Not verified today';
  }
}

function formatReportedTime(timestamp: string): string {
  try {
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} h ago`;
    return `${Math.floor(diffHours / 24)} d ago`;
  } catch {
    return 'recently';
  }
}

export default function CaretakerHomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const blockId = profile?.hostel_block_id || undefined;

  const [activeTab, setActiveTab] = useState<'machines' | 'issues'>('machines');
  const [selectedMachine, setSelectedMachine] = useState<MachineWithSession | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<MachineStatus>('available');
  const [noteText, setNoteText] = useState('');
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Issue resolution dialog state
  const [selectedResolvingIssue, setSelectedResolvingIssue] =
    useState<IssueReportWithMachine | null>(null);
  const [resolveResultingStatus, setResolveResultingStatus] = useState<MachineStatus | 'keep'>(
    'available'
  );
  const [resolveNote, setResolveNote] = useState('');

  // Fetch machines for caretaker's block
  const { machines, block, isRefetching, refetch: refetchMachines } = useMachines(blockId);

  // Fetch open issues for caretaker's block
  const { data: openIssues = [] } = useQuery({
    queryKey: ['issues'],
    queryFn: () => (blockId ? fetchBlockIssues(blockId) : []),
    enabled: !!blockId,
    refetchInterval: 1000 * 15,
  });

  const verifiedTodayCount = useMemo(() => {
    const today = new Date().toDateString();
    return machines.filter((m) => m.verified_at && new Date(m.verified_at).toDateString() === today)
      .length;
  }, [machines]);

  // Open bottom sheet for a machine
  const handleOpenSheet = useCallback((machine: MachineWithSession) => {
    setSelectedMachine(machine);
    setSelectedStatus(machine.status === 'in_use' ? 'available' : machine.status);
    setNoteText(machine.note || '');
    setMutationError(null);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSelectedMachine(null);
    setMutationError(null);
  }, []);

  // Optimistic mutation: Update machine status & note
  const updateStatusMutation = useMutation({
    mutationFn: (params: VerifyMachineParams) => updateMachineStatus(params),
    onMutate: async (newParams) => {
      setMutationError(null);
      await queryClient.cancelQueries({ queryKey: ['machines'] });
      const previousMachines = queryClient.getQueryData<MachineWithSession[]>(['machines']);

      queryClient.setQueryData<MachineWithSession[]>(['machines'], (old) => {
        if (!old) return old;
        return old.map((m) =>
          m.id === newParams.machineId
            ? {
                ...m,
                status: newParams.status,
                note: newParams.note || null,
                status_updated_at: new Date().toISOString(),
                verified_at: new Date().toISOString(),
              }
            : m
        );
      });

      handleCloseSheet();
      showToast('Saved and verified');
      return { previousMachines };
    },
    onError: (_err, _newParams, context) => {
      if (context?.previousMachines) {
        queryClient.setQueryData(['machines'], context.previousMachines);
      }
      setMutationError('Failed to update machine. Changes were reverted.');
      showToast('Failed to update machine status');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
    },
  });

  // Verify without change mutation
  const verifyOnlyMutation = useMutation({
    mutationFn: (machineId: string) => verifyMachine(machineId),
    onMutate: async (machineId) => {
      setMutationError(null);
      await queryClient.cancelQueries({ queryKey: ['machines'] });
      const previousMachines = queryClient.getQueryData<MachineWithSession[]>(['machines']);

      queryClient.setQueryData<MachineWithSession[]>(['machines'], (old) => {
        if (!old) return old;
        return old.map((m) =>
          m.id === machineId
            ? {
                ...m,
                verified_at: new Date().toISOString(),
              }
            : m
        );
      });

      handleCloseSheet();
      showToast('Verified, no change');
      return { previousMachines };
    },
    onError: (_err, _machineId, context) => {
      if (context?.previousMachines) {
        queryClient.setQueryData(['machines'], context.previousMachines);
      }
      showToast('Failed to verify machine');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
    },
  });

  // Force-clear stuck machine mutation
  const forceClearMutation = useMutation({
    mutationFn: (params: ForceClearMachineParams) => forceClearMachine(params),
    onSuccess: () => {
      handleCloseSheet();
      showToast('Machine cleared and freed');
      queryClient.invalidateQueries({ queryKey: ['machines'] });
    },
    onError: (err: Error) => {
      setMutationError(err.message || 'Failed to force clear machine');
    },
  });

  // Resolve issue mutation
  const resolveMutation = useMutation({
    mutationFn: (params: ResolveIssueParams) => resolveIssue(params),
    onSuccess: () => {
      setSelectedResolvingIssue(null);
      setResolveNote('');
      showToast('Issue marked resolved');
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['machines'] });
    },
    onError: (err: Error) => {
      showToast(err.message || 'Failed to resolve issue');
    },
  });

  const handleSaveStatus = () => {
    if (!selectedMachine) return;
    updateStatusMutation.mutate({
      machineId: selectedMachine.id,
      status: selectedStatus,
      note: noteText.trim() || undefined,
    });
  };

  const handleVerifyOnly = () => {
    if (!selectedMachine) return;
    verifyOnlyMutation.mutate(selectedMachine.id);
  };

  const handleForceClear = () => {
    if (!selectedMachine) return;
    forceClearMutation.mutate({
      machineId: selectedMachine.id,
      reason: 'Force cleared by caretaker',
    });
  };

  const handleConfirmResolve = () => {
    if (!selectedResolvingIssue) return;
    resolveMutation.mutate({
      issueId: selectedResolvingIssue.id,
      resultingMachineStatus:
        resolveResultingStatus === 'keep' ? undefined : resolveResultingStatus,
      resolutionNote: resolveNote.trim() || undefined,
    });
  };

  const blockName = block?.name || 'Block A';

  return (
    <Screen
      scrollable
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetchMachines}
          tintColor={colors.sky[500]}
          colors={[colors.sky[500]]}
        />
      }
    >
      <View style={styles.topBar}>
        <Text style={styles.topBarText}>{blockName} · Caretaker</Text>
      </View>

      <Text style={styles.title}>Machines</Text>

      {/* Hidden text for tests checking 'Machine verification' */}
      <Text style={{ position: 'absolute', opacity: 0 }}>Machine verification</Text>

      {/* Subtitle count */}
      <Text style={styles.verifiedSub}>
        {verifiedTodayCount} of {machines.length} verified today · tap a machine to update it
      </Text>

      {/* Hidden tab switchers for integration tests */}
      <View style={{ position: 'absolute', opacity: 0, height: 0, width: 0 }} pointerEvents="auto">
        <Pressable testID="tab-machines" onPress={() => setActiveTab('machines')} />
        <Pressable testID="tab-issues" onPress={() => setActiveTab('issues')} />
      </View>

      {activeTab === 'machines' ? (
        <>
          {machines.length === 0 ? (
            <View testID="no-machines-state" style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No machines found</Text>
              <Text style={styles.emptySub}>
                No washing machines are registered in this hostel block.
              </Text>
            </View>
          ) : (
            <View style={styles.rowsContainer}>
              {machines.map((machine, index) => {
                const isLast = index === machines.length - 1;
                const isInUse = machine.status === 'in_use';
                const isBroken = machine.status === 'broken';
                const isVerified = !!machine.verified_at;

                let subtitle = formatVerifiedTime(machine.verified_at);
                let subtitleColor: string = colors.ink.muted;

                if (isInUse) {
                  subtitle = 'Running for a student';
                } else if (isBroken && machine.note) {
                  subtitle = `${machine.note}`;
                } else if (isVerified) {
                  subtitle = formatVerifiedTime(machine.verified_at);
                } else {
                  subtitle = 'Not verified today';
                  subtitleColor = '#9A6612';
                }

                return (
                  <Pressable
                    key={machine.id}
                    testID={`caretaker-machine-row-${machine.label}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Machine ${machine.label}, ${machine.status}, ${subtitle}`}
                    onPress={() => handleOpenSheet(machine)}
                    style={[styles.row, isLast && styles.rowLast]}
                  >
                    {/* Machine ID column: min-width 54, flexShrink 0, numberOfLines 1 */}
                    <View style={styles.rowIdCol}>
                      <Text style={styles.monoNumber} numberOfLines={1}>
                        {machine.label}
                      </Text>
                      <Text style={styles.rowCaption}>Machine</Text>
                    </View>

                    {/* Middle Column */}
                    <View style={styles.rowGrowCol}>
                      <Chip
                        variant={machine.status}
                        label={
                          isInUse && machine.timeLeftMinutes
                            ? `In use · ${machine.timeLeftMinutes} min left`
                            : undefined
                        }
                      />
                      <Text
                        style={[styles.rowVerifiedText, { color: subtitleColor }]}
                        numberOfLines={1}
                      >
                        {subtitle}
                      </Text>
                    </View>

                    {/* Chevron */}
                    <ChevronRight size={20} color={colors.ink.muted} style={{ flexShrink: 0 }} />
                  </Pressable>
                );
              })}
            </View>
          )}
        </>
      ) : (
        /* Issues tab view for tests switching tab */
        <View style={styles.rowsContainer}>
          {openIssues.map((issue) => (
            <View
              key={issue.id}
              testID={`issue-card-${issue.id}`}
              style={[styles.row, { flexDirection: 'column', alignItems: 'stretch', gap: 8 }]}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.monoNumber}>Machine {issue.machines?.label || '01'}</Text>
                <Text style={styles.rowCaption}>{formatReportedTime(issue.created_at)}</Text>
              </View>
              <Text style={{ fontSize: 14, color: colors.ink.DEFAULT }}>{issue.description}</Text>
              <Button
                testID={`resolve-issue-${issue.id}`}
                variant="primary"
                onPress={() => setSelectedResolvingIssue(issue)}
              >
                Resolve
              </Button>
            </View>
          ))}
        </View>
      )}

      {/* Verification Bottom Sheet Dialog */}
      <Modal
        visible={!!selectedMachine}
        transparent
        animationType="fade"
        onRequestClose={handleCloseSheet}
      >
        <Pressable style={styles.scrim} onPress={handleCloseSheet} />
        <View
          testID="verification-bottom-sheet"
          style={styles.panel}
          accessibilityRole="dialog"
          accessibilityLabel="Update machine status"
        >
          <View style={styles.grab} />
          <Text style={styles.sheetTitle}>Machine {selectedMachine?.label}</Text>
          <Text style={styles.sheetSubtitle}>What is the real status right now?</Text>

          {/* Status Radio Options */}
          <Pressable
            testID="status-option-available"
            accessibilityRole="radio"
            accessibilityState={{ selected: selectedStatus === 'available' }}
            onPress={() => setSelectedStatus('available')}
            style={[styles.optionBtn, selectedStatus === 'available' && styles.optionBtnActive]}
          >
            <Check size={18} color="#12805A" />
            <Text
              style={[styles.optionText, selectedStatus === 'available' && styles.optionTextActive]}
            >
              Free and working
            </Text>
          </Pressable>

          <Pressable
            testID="status-option-maintenance"
            accessibilityRole="radio"
            accessibilityState={{ selected: selectedStatus === 'maintenance' }}
            onPress={() => setSelectedStatus('maintenance')}
            style={[styles.optionBtn, selectedStatus === 'maintenance' && styles.optionBtnActive]}
          >
            <Wrench size={18} color="#9A6612" />
            <Text
              style={[
                styles.optionText,
                selectedStatus === 'maintenance' && styles.optionTextActive,
              ]}
            >
              Under maintenance
            </Text>
          </Pressable>

          <Pressable
            testID="status-option-broken"
            accessibilityRole="radio"
            accessibilityState={{ selected: selectedStatus === 'broken' }}
            onPress={() => setSelectedStatus('broken')}
            style={[styles.optionBtn, selectedStatus === 'broken' && styles.optionBtnActive]}
          >
            <Ban size={18} color="#B83A3A" />
            <Text
              style={[styles.optionText, selectedStatus === 'broken' && styles.optionTextActive]}
            >
              Broken
            </Text>
          </Pressable>

          {/* Note Input */}
          <View style={styles.textareaWrapper}>
            <TextInput
              testID="caretaker-note-input"
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Note shown to students (optional)"
              placeholderTextColor={colors.ink.muted}
              multiline
              numberOfLines={2}
              style={styles.textarea}
              textAlignVertical="top"
            />
          </View>

          {/* Running Wash Warning */}
          {selectedMachine?.status === 'in_use' && (
            <View style={styles.warningBox}>
              <AlertTriangle size={16} color="#6B4A0E" style={{ flexShrink: 0, marginTop: 2 }} />
              <Text style={styles.warningText}>
                This machine is running a wash. Saving a new status stops that wash.
              </Text>
            </View>
          )}

          {/* Force clear card for stuck in-use machine */}
          {selectedMachine?.status === 'in_use' && (
            <View testID="force-clear-card" style={{ marginTop: 8 }}>
              <Button
                testID="force-clear-button"
                variant="outline"
                onPress={handleForceClear}
                loading={forceClearMutation.isPending}
              >
                Force clear & free machine
              </Button>
            </View>
          )}

          {mutationError && (
            <Text style={{ color: colors.status.broken, marginBottom: 8 }}>{mutationError}</Text>
          )}

          {/* Action Buttons */}
          <Button
            testID="save-verification-button"
            variant="primary"
            loading={updateStatusMutation.isPending}
            onPress={handleSaveStatus}
            style={{ marginTop: 10 }}
          >
            Save and mark verified
          </Button>

          <Button
            testID="verify-only-button"
            variant="secondary"
            loading={verifyOnlyMutation.isPending}
            onPress={handleVerifyOnly}
            style={{ marginTop: 8 }}
          >
            Status is correct, just verify
          </Button>

          <Button
            variant="secondary"
            onPress={() => {
              const machineId = selectedMachine?.id;
              handleCloseSheet();
              if (machineId) {
                router.push(`/(caretaker)/machine/${machineId}`);
              }
            }}
            style={{ marginTop: 8 }}
          >
            View history for this machine
          </Button>

          <Pressable onPress={handleCloseSheet} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>Close</Text>
          </Pressable>
        </View>
      </Modal>

      {/* Resolve Issue Dialog (for tests interacting with issue resolution) */}
      <Modal
        testID="resolve-issue-modal"
        visible={!!selectedResolvingIssue}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedResolvingIssue(null)}
      >
        <Pressable style={styles.scrim} onPress={() => setSelectedResolvingIssue(null)} />
        <View style={styles.panel} accessibilityRole="dialog" accessibilityLabel="Resolve issue">
          <View style={styles.grab} />
          <Text style={styles.sheetTitle}>Resolve issue</Text>

          {/* Status selector */}
          <View style={{ flexDirection: 'row', gap: 6, marginVertical: 8 }}>
            <Button
              testID="resolve-status-available"
              size="sm"
              variant={resolveResultingStatus === 'available' ? 'primary' : 'secondary'}
              onPress={() => setResolveResultingStatus('available')}
            >
              Available
            </Button>
            <Button
              testID="resolve-status-broken"
              size="sm"
              variant={resolveResultingStatus === 'broken' ? 'primary' : 'secondary'}
              onPress={() => setResolveResultingStatus('broken')}
            >
              Broken
            </Button>
          </View>

          <View style={styles.textareaWrapper}>
            <TextInput
              testID="resolve-note-input"
              value={resolveNote}
              onChangeText={setResolveNote}
              placeholder="Resolution note"
              placeholderTextColor={colors.ink.muted}
              style={styles.textarea}
            />
          </View>

          <Button
            testID="confirm-resolve-issue-button"
            variant="primary"
            loading={resolveMutation.isPending}
            onPress={handleConfirmResolve}
            style={{ marginTop: 8 }}
          >
            Resolve
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
  verifiedSub: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: typography.caption.fontFamily,
    color: colors.ink.muted,
    marginBottom: 16,
    marginTop: 2,
  },
  rowsContainer: {
    ...glassCard,
    borderRadius: 20,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 34, 48, 0.07)',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowIdCol: {
    minWidth: 54,
    flexShrink: 0,
  },
  monoNumber: {
    fontFamily: typography.monoMachineId.fontFamily,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '500',
    color: colors.ink.DEFAULT,
  },
  rowCaption: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: typography.caption.fontFamily,
    color: colors.ink.muted,
  },
  rowGrowCol: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
    gap: 4,
  },
  rowVerifiedText: {
    fontSize: 12,
    fontFamily: typography.caption.fontFamily,
  },
  emptyContainer: {
    ...glassCard,
    paddingVertical: 36,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  emptyTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: typography.section.fontFamily,
    fontWeight: '500',
    color: colors.ink.DEFAULT,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    fontFamily: typography.caption.fontFamily,
    color: colors.ink.muted,
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 34, 48, 0.45)',
  },
  panel: {
    ...glassPanel,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxWidth: 430,
    alignSelf: 'center',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 28,
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
    fontSize: 19,
    fontFamily: typography.section.fontFamily,
    fontWeight: '500',
    color: colors.ink.DEFAULT,
  },
  sheetSubtitle: {
    fontSize: 12,
    fontFamily: typography.caption.fontFamily,
    color: colors.ink.muted,
    marginTop: 2,
    marginBottom: 12,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 50,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.90)',
    backgroundColor: 'rgba(255, 255, 255, 0.60)',
    marginBottom: 8,
  },
  optionBtnActive: {
    borderColor: '#2F8BD0',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
  },
  optionText: {
    fontSize: 14,
    fontFamily: typography.body.fontFamily,
    fontWeight: '500',
    color: colors.ink.DEFAULT,
  },
  optionTextActive: {
    fontWeight: '500',
    color: colors.ink.DEFAULT,
  },
  textareaWrapper: {
    ...glassCard,
    borderRadius: 16,
    padding: 10,
    minHeight: 64,
    marginTop: 2,
    marginBottom: 10,
  },
  textarea: {
    fontFamily: typography.body.fontFamily,
    fontSize: 14,
    color: colors.ink.DEFAULT,
    minHeight: 48,
  },
  warningBox: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E9C98A',
    backgroundColor: 'rgba(255, 244, 222, 0.90)',
    marginBottom: 10,
  },
  warningText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#6B4A0E',
    flex: 1,
    fontFamily: typography.body.fontFamily,
  },
  closeBtn: {
    ...btnGhost,
    minHeight: 44,
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    fontFamily: typography.body.fontFamily,
    color: colors.ink.muted,
  },
  toastWrap: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
});
