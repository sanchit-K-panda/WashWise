import React, { useState, useMemo, useCallback } from 'react';
import { View, Pressable, RefreshControl, Modal, TextInput, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronRight,
  LogOut,
  X,
  AlertOctagon,
  History,
  CheckCircle2,
  Wrench,
  Ban,
  AlertCircle,
} from 'lucide-react-native';
import { colors } from '@/theme/tokens';
import { Screen, Text, Chip, Button, Skeleton } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useMachines } from '@/hooks/useMachines';
import {
  MachineWithSession,
  MachineStatus,
  VerifyMachineParams,
  ForceClearMachineParams,
} from '@/types';
import {
  updateMachineStatus,
  forceClearMachine,
  fetchBlockIssues,
  resolveIssue,
} from '@/services/caretaker';

function formatVerifiedTime(timestamp: string | null): string {
  if (!timestamp) return 'Not verified today';
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return 'Not verified today';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Not verified today';
  }
}

function formatReportedTime(timestamp: string): string {
  try {
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  } catch {
    return 'recently';
  }
}

export default function CaretakerHomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile, signOut } = useAuth();
  const blockId = profile?.hostel_block_id || undefined;

  const [activeTab, setActiveTab] = useState<'machines' | 'issues'>('machines');
  const [selectedMachine, setSelectedMachine] = useState<MachineWithSession | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<MachineStatus>('available');
  const [noteText, setNoteText] = useState('');
  const [mutationError, setMutationError] = useState<string | null>(null);

  // Fetch machines for caretaker's block
  const {
    machines,
    block,
    isLoading: isMachinesLoading,
    isRefetching,
    refetch: refetchMachines,
    isOffline,
    lastSyncedAt,
  } = useMachines(blockId);

  // Fetch open issues for caretaker's block
  const {
    data: openIssues = [],
    isLoading: isIssuesLoading,
    refetch: refetchIssues,
  } = useQuery({
    queryKey: ['block_issues', blockId],
    queryFn: () => (blockId ? fetchBlockIssues(blockId) : []),
    enabled: !!blockId,
    refetchInterval: 1000 * 15,
  });

  // Open bottom sheet for a machine
  const handleOpenSheet = useCallback((machine: MachineWithSession) => {
    setSelectedMachine(machine);
    // If machine is currently in_use, default verification choice is available
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
      await queryClient.cancelQueries({ queryKey: ['machines', blockId] });
      const previousMachines = queryClient.getQueryData<MachineWithSession[]>([
        'machines',
        blockId,
      ]);

      // Optimistically update machine in cache
      queryClient.setQueryData<MachineWithSession[]>(['machines', blockId], (old) => {
        if (!old) return old;
        return old.map((m) =>
          m.id === newParams.machineId
            ? {
                ...m,
                status: newParams.status,
                note: newParams.note || null,
                status_updated_at: new Date().toISOString(),
              }
            : m
        );
      });

      handleCloseSheet();
      return { previousMachines };
    },
    onError: (err, _newParams, context) => {
      if (context?.previousMachines) {
        queryClient.setQueryData(['machines', blockId], context.previousMachines);
      }
      setMutationError('Failed to update machine. Changes were reverted.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['machines', blockId] });
    },
  });

  // Optimistic mutation: Force clear stuck in-use machine
  const forceClearMutation = useMutation({
    mutationFn: (params: ForceClearMachineParams) => forceClearMachine(params),
    onMutate: async (newParams) => {
      setMutationError(null);
      await queryClient.cancelQueries({ queryKey: ['machines', blockId] });
      const previousMachines = queryClient.getQueryData<MachineWithSession[]>([
        'machines',
        blockId,
      ]);

      queryClient.setQueryData<MachineWithSession[]>(['machines', blockId], (old) => {
        if (!old) return old;
        return old.map((m) =>
          m.id === newParams.machineId
            ? {
                ...m,
                status: 'available',
                note: newParams.reason || 'Force cleared by caretaker',
                status_updated_at: new Date().toISOString(),
                activeSession: null,
                timeLeftMinutes: undefined,
              }
            : m
        );
      });

      handleCloseSheet();
      return { previousMachines };
    },
    onError: (err, _newParams, context) => {
      if (context?.previousMachines) {
        queryClient.setQueryData(['machines', blockId], context.previousMachines);
      }
      setMutationError('Failed to force clear machine. Changes were reverted.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['machines', blockId] });
      queryClient.invalidateQueries({ queryKey: ['active_session'] });
    },
  });

  // Resolve issue mutation
  const resolveIssueMutation = useMutation({
    mutationFn: (issueId: string) => resolveIssue(issueId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['block_issues', blockId] });
    },
  });

  const handleSaveVerification = () => {
    if (!selectedMachine) return;
    updateStatusMutation.mutate({
      machineId: selectedMachine.id,
      status: selectedStatus,
      note: noteText.trim() || null,
    });
  };

  const handleForceClear = () => {
    if (!selectedMachine) return;
    forceClearMutation.mutate({
      machineId: selectedMachine.id,
      reason: noteText.trim() || 'Force cleared by caretaker',
    });
  };

  const handleRefresh = () => {
    refetchMachines();
    refetchIssues();
  };

  const blockSubtitle = useMemo(() => {
    if (block?.name) {
      return `${block.name} · Caretaker View`;
    }
    return 'Block A · Caretaker View';
  }, [block]);

  return (
    <Screen
      scrollable
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={handleRefresh}
          tintColor={colors.sky[500]}
          colors={[colors.sky[500]]}
        />
      }
      offlineBanner={{
        isOffline,
        lastSyncedAt: lastSyncedAt
          ? lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : undefined,
      }}
      header={{
        title: 'Machine verification',
        subtitle: blockSubtitle,
        rightAction: (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            onPress={signOut}
            className="w-10 h-10 items-center justify-center -mr-2 rounded-full active:bg-sky-50"
          >
            <LogOut size={18} strokeWidth={1.75} color={colors.ink.muted} />
          </Pressable>
        ),
      }}
    >
      {/* Mutation Error / Rollback Alert Banner */}
      {mutationError && (
        <View
          testID="mutation-error-banner"
          className="p-3.5 rounded-md border border-status-broken/30 bg-surface mb-4 flex-row items-center gap-2.5"
        >
          <AlertCircle size={18} strokeWidth={1.75} color={colors.status.broken} />
          <Text variant="body" color="broken" style={{ flex: 1 }}>
            {mutationError}
          </Text>
        </View>
      )}

      {/* Segmented Tab Switcher */}
      <View className="flex-row gap-2 mb-4 bg-surface p-1 rounded-input border border-hairline">
        <Pressable
          testID="tab-machines"
          onPress={() => setActiveTab('machines')}
          className={`flex-1 py-2 items-center rounded-sm ${
            activeTab === 'machines' ? 'bg-white border border-hairline' : ''
          }`}
          accessibilityRole="tab"
          accessibilityLabel="All Machines tab"
        >
          <Text
            variant="caption"
            color={activeTab === 'machines' ? 'ink' : 'muted'}
            style={{ fontWeight: '600' }}
          >
            All Machines ({machines.length})
          </Text>
        </Pressable>

        <Pressable
          testID="tab-issues"
          onPress={() => setActiveTab('issues')}
          className={`flex-1 py-2 items-center rounded-sm ${
            activeTab === 'issues' ? 'bg-white border border-hairline' : ''
          }`}
          accessibilityRole="tab"
          accessibilityLabel="Issue Reports tab"
        >
          <Text
            variant="caption"
            color={activeTab === 'issues' ? 'ink' : 'muted'}
            style={{ fontWeight: '600' }}
          >
            Issue Reports ({openIssues.length})
          </Text>
        </Pressable>
      </View>

      {/* Tab 1: Machine List (Fast Scanning List View) */}
      {activeTab === 'machines' ? (
        <View className="space-y-2.5 gap-2.5">
          {isMachinesLoading && machines.length === 0 ? (
            <View testID="caretaker-loading-skeletons" className="space-y-2.5 gap-2.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <View
                  key={`skeleton-machine-${i}`}
                  className="p-3.5 bg-surface border border-hairline rounded-md flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-3">
                    <Skeleton.Line width={36} style={{ height: 28 }} />
                    <View className="gap-1.5">
                      <Skeleton.Line width={70} style={{ height: 20 }} />
                      <Skeleton.Line width={100} style={{ height: 14 }} />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            machines.map((machine) => {
              const verifiedText = `Verified ${formatVerifiedTime(machine.status_updated_at)}`;

              return (
                <Pressable
                  key={machine.id}
                  testID={`caretaker-machine-row-${machine.label}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Machine ${machine.label}, ${machine.status}, ${verifiedText}`}
                  onPress={() => handleOpenSheet(machine)}
                  className="flex-row items-center justify-between p-3.5 bg-surface border border-hairline rounded-md active:bg-sky-50"
                >
                  <View className="flex-row items-center gap-3 flex-1 mr-2">
                    <Text variant="monoMachineId" style={{ width: 36 }}>
                      {machine.label}
                    </Text>

                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Chip variant={machine.status} />
                        {machine.timeLeftMinutes != null && machine.status === 'in_use' && (
                          <Text variant="caption" color="muted">
                            {machine.timeLeftMinutes}m left
                          </Text>
                        )}
                      </View>

                      <Text variant="caption" color="muted" tabular style={{ marginTop: 4 }}>
                        {verifiedText}
                      </Text>

                      {machine.note ? (
                        <Text
                          variant="caption"
                          color="ink"
                          numberOfLines={1}
                          style={{ marginTop: 2, fontStyle: 'italic' }}
                        >
                          &ldquo;{machine.note}&rdquo;
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <ChevronRight size={18} strokeWidth={1.75} color={colors.ink.muted} />
                </Pressable>
              );
            })
          )}
        </View>
      ) : (
        /* Tab 2: Issue Reports Queue */
        <View className="space-y-3 gap-3">
          {isIssuesLoading && openIssues.length === 0 ? (
            <View testID="issues-loading" className="space-y-3 gap-3">
              <Skeleton.Line width="100%" style={{ height: 100 }} />
              <Skeleton.Line width="100%" style={{ height: 100 }} />
            </View>
          ) : openIssues.length === 0 ? (
            <View
              testID="no-issues-state"
              className="p-8 bg-surface border border-hairline rounded-md items-center text-center my-6"
            >
              <CheckCircle2 size={32} strokeWidth={1.75} color={colors.status.available} />
              <Text variant="section" color="ink" style={{ textAlign: 'center', marginTop: 12 }}>
                No open issue reports
              </Text>
              <Text variant="caption" color="muted" style={{ textAlign: 'center', marginTop: 4 }}>
                All laundry room machines in this block are operating normally.
              </Text>
            </View>
          ) : (
            openIssues.map((issue) => (
              <View
                key={issue.id}
                testID={`issue-card-${issue.id}`}
                className="p-4 bg-surface border border-hairline rounded-md"
              >
                <View className="flex-row items-center justify-between mb-2">
                  <Text variant="section">Issue Report</Text>
                  <Text variant="caption" color="broken">
                    {formatReportedTime(issue.created_at)}
                  </Text>
                </View>

                <Text variant="body" color="ink" style={{ marginBottom: 12 }}>
                  {issue.description}
                </Text>

                <Button
                  testID={`resolve-issue-${issue.id}`}
                  variant="outline"
                  size="sm"
                  onPress={() => resolveIssueMutation.mutate(issue.id)}
                  accessibilityLabel="Mark issue as resolved"
                >
                  Mark as Resolved
                </Button>
              </View>
            ))
          )}
        </View>
      )}

      {/* Verification Bottom Sheet Modal */}
      <Modal
        visible={!!selectedMachine}
        transparent
        animationType="slide"
        onRequestClose={handleCloseSheet}
      >
        <View className="flex-1 justify-end bg-ink/40">
          <Pressable testID="bottom-sheet-backdrop" onPress={handleCloseSheet} className="flex-1" />

          <View
            testID="verification-bottom-sheet"
            className="bg-white rounded-t-2xl border-t border-hairline p-5 max-h-[85%]"
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Sheet Drag Handle */}
              <View className="w-12 h-1 bg-hairline rounded-full self-center mb-4" />

              {/* Sheet Header */}
              <View className="flex-row items-center justify-between mb-4">
                <View>
                  <Text variant="section" style={{ fontSize: 20 }}>
                    Machine {selectedMachine?.label}
                  </Text>
                  <Text variant="caption" color="muted">
                    {selectedMachine?.capacity_kg} kg drum · {block?.name || 'Block A'}
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close verification sheet"
                  onPress={handleCloseSheet}
                  className="w-8 h-8 items-center justify-center rounded-full active:bg-sky-50"
                >
                  <X size={20} strokeWidth={1.75} color={colors.ink.muted} />
                </Pressable>
              </View>

              {/* Status Selection: Free / Broken / Maintenance */}
              <Text variant="section" style={{ marginBottom: 10 }}>
                Set machine status
              </Text>

              <View className="space-y-2 gap-2 mb-5">
                {/* 1. Free (Available) */}
                <Pressable
                  testID="status-option-available"
                  accessibilityRole="radio"
                  accessibilityState={{ selected: selectedStatus === 'available' }}
                  onPress={() => setSelectedStatus('available')}
                  className={`p-3.5 rounded-md border flex-row items-center justify-between ${
                    selectedStatus === 'available'
                      ? 'border-status-available bg-sky-50'
                      : 'border-hairline bg-surface'
                  }`}
                >
                  <View className="flex-row items-center gap-3">
                    <CheckCircle2 size={20} strokeWidth={2} color={colors.status.available} />
                    <View>
                      <Text variant="body" color="ink" style={{ fontWeight: '600' }}>
                        Free (Available)
                      </Text>
                      <Text variant="caption" color="muted">
                        Ready for student use
                      </Text>
                    </View>
                  </View>
                </Pressable>

                {/* 2. Maintenance */}
                <Pressable
                  testID="status-option-maintenance"
                  accessibilityRole="radio"
                  accessibilityState={{ selected: selectedStatus === 'maintenance' }}
                  onPress={() => setSelectedStatus('maintenance')}
                  className={`p-3.5 rounded-md border flex-row items-center justify-between ${
                    selectedStatus === 'maintenance'
                      ? 'border-status-maintenance bg-sky-50'
                      : 'border-hairline bg-surface'
                  }`}
                >
                  <View className="flex-row items-center gap-3">
                    <Wrench size={20} strokeWidth={2} color={colors.status.maintenance} />
                    <View>
                      <Text variant="body" color="ink" style={{ fontWeight: '600' }}>
                        Maintenance
                      </Text>
                      <Text variant="caption" color="muted">
                        Filter cleaning, servicing, offline
                      </Text>
                    </View>
                  </View>
                </Pressable>

                {/* 3. Broken */}
                <Pressable
                  testID="status-option-broken"
                  accessibilityRole="radio"
                  accessibilityState={{ selected: selectedStatus === 'broken' }}
                  onPress={() => setSelectedStatus('broken')}
                  className={`p-3.5 rounded-md border flex-row items-center justify-between ${
                    selectedStatus === 'broken'
                      ? 'border-status-broken bg-sky-50'
                      : 'border-hairline bg-surface'
                  }`}
                >
                  <View className="flex-row items-center gap-3">
                    <Ban size={20} strokeWidth={2} color={colors.status.broken} />
                    <View>
                      <Text variant="body" color="ink" style={{ fontWeight: '600' }}>
                        Broken
                      </Text>
                      <Text variant="caption" color="muted">
                        Out of order, needs technician
                      </Text>
                    </View>
                  </View>
                </Pressable>
              </View>

              {/* Note input field */}
              <View className="mb-5">
                <Text variant="section" style={{ marginBottom: 6 }}>
                  Status note (optional)
                </Text>
                <TextInput
                  testID="caretaker-note-input"
                  value={noteText}
                  onChangeText={setNoteText}
                  placeholder="e.g. Technician arriving at 3 PM, drum cleaned…"
                  placeholderTextColor={colors.ink.muted}
                  multiline
                  numberOfLines={3}
                  style={{
                    backgroundColor: colors.surface,
                    borderColor: colors.hairline,
                    borderWidth: 1,
                    borderRadius: 8,
                    padding: 10,
                    fontSize: 14,
                    color: colors.ink.DEFAULT,
                    textAlignVertical: 'top',
                    minHeight: 76,
                  }}
                />
              </View>

              {/* Force-Clear Option for Stuck In-Use Machines */}
              {selectedMachine?.status === 'in_use' && (
                <View
                  testID="force-clear-card"
                  className="p-3.5 rounded-md border border-status-maintenance/30 bg-surface mb-5"
                >
                  <View className="flex-row items-start gap-2.5 mb-2.5">
                    <AlertOctagon
                      size={18}
                      strokeWidth={1.75}
                      color={colors.status.maintenance}
                      style={{ marginTop: 2 }}
                    />
                    <View className="flex-1">
                      <Text variant="body" color="ink" style={{ fontWeight: '600' }}>
                        Machine is marked in use
                      </Text>
                      <Text variant="caption" color="muted">
                        If a student abandoned their cycle or the machine is stuck, you can
                        force-clear it immediately.
                      </Text>
                    </View>
                  </View>

                  <Button
                    testID="force-clear-button"
                    variant="outline"
                    size="sm"
                    loading={forceClearMutation.isPending}
                    onPress={handleForceClear}
                    accessibilityLabel="Force-clear stuck wash session"
                  >
                    Force clear session
                  </Button>
                </View>
              )}

              {/* Actions Footer */}
              <View className="space-y-2.5 gap-2.5 mb-6">
                <Button
                  testID="save-verification-button"
                  variant="primary"
                  loading={updateStatusMutation.isPending}
                  onPress={handleSaveVerification}
                  accessibilityLabel="Save verification status"
                >
                  Save verification
                </Button>

                <Button
                  testID="view-machine-logs-button"
                  variant="secondary"
                  leftIcon={<History size={18} strokeWidth={1.75} color={colors.ink.muted} />}
                  onPress={() => {
                    if (!selectedMachine) return;
                    const id = selectedMachine.id;
                    handleCloseSheet();
                    router.push(`/(caretaker)/machine/${id}`);
                  }}
                  accessibilityLabel="View machine status history log"
                >
                  View status history log
                </Button>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
