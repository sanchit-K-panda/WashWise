import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Pressable,
  RefreshControl,
  Modal,
  TextInput,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  Timer,
  Weight,
  Check,
  Clock,
  Wrench,
  Ban,
  ChevronRight,
  X,
  AlertTriangle,
} from 'lucide-react-native';
import { colors } from '@/theme/tokens';
import { Screen, Text, Button, Chip, Skeleton } from '@/components/ui';
import { Toast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { useMachines } from '@/hooks/useMachines';
import { useActiveSession } from '@/hooks/useActiveSession';
import { reportMachineIssue } from '@/services/wash';
import { ExpoSecureStoreAdapter } from '@/services/supabase';
import { MachineWithSession } from '@/types';

const STORAGE_HOW_IT_WORKS_KEY = 'washwise_how_it_works_dismissed';

export default function StudentHomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { activeSession } = useActiveSession();

  const {
    machines,
    block,
    availableCount,
    totalCount,
    isLoading,
    isRefetching,
    isError,
    error,
    isOffline,
    lastSyncedAt,
    refetch,
  } = useMachines(profile?.hostel_block_id);

  // How it works card dismissal state
  const [showHowItWorks, setShowHowItWorks] = useState<boolean>(false);
  useEffect(() => {
    ExpoSecureStoreAdapter.getItem(STORAGE_HOW_IT_WORKS_KEY).then((val) => {
      if (val !== 'true') {
        setShowHowItWorks(true);
      }
    });
  }, []);

  const handleDismissHowItWorks = useCallback(() => {
    setShowHowItWorks(false);
    ExpoSecureStoreAdapter.setItem(STORAGE_HOW_IT_WORKS_KEY, 'true').catch(() => {});
  }, []);

  // Filter state: 'all' | 'available'
  const [filter, setFilter] = useState<'all' | 'available'>('all');

  // Bottom sheet state for selected machine
  const [selectedMachine, setSelectedMachine] = useState<MachineWithSession | null>(null);

  // Issue reporting dialog state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportDescription, setReportDescription] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Current timestamp stored in state for pure render calculations
  const [currentTimestamp] = useState(() => Date.now());

  const handleCloseReportModal = () => {
    setIsReportModalOpen(false);
    setReportDescription('');
    setReportError(null);
  };

  const handleSubmitReport = async () => {
    if (!selectedMachine || !reportDescription.trim() || isSubmittingReport) return;
    setIsSubmittingReport(true);
    setReportError(null);

    const res = await reportMachineIssue(
      selectedMachine.id,
      reportDescription.trim(),
      selectedMachine.label
    );

    setIsSubmittingReport(false);
    if (res.success) {
      handleCloseReportModal();
      setSelectedMachine(null);
      showToast('Issue report sent to the caretaker');
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      queryClient.invalidateQueries({ queryKey: ['issues'] });
    } else {
      setReportError(res.error || 'Failed to submit report. Please try again.');
    }
  };

  // Filtered machines
  const filteredMachines = useMemo(() => {
    if (filter === 'available') {
      return machines.filter((m) => m.status === 'available');
    }
    return machines;
  }, [machines, filter]);

  // Compute next free machine for empty state
  const nextFreeInfo = useMemo(() => {
    const running = machines
      .filter((m) => m.status === 'in_use' && m.ends_at)
      .map((m) => {
        const ms = new Date(m.ends_at!).getTime() - currentTimestamp;
        const mins = Math.max(1, Math.ceil(ms / (60 * 1000)));
        return { label: m.label, mins };
      })
      .sort((a, b) => a.mins - b.mins);

    if (running.length > 0) {
      return running[0];
    }
    return null;
  }, [machines, currentTimestamp]);

  // Format last synced time
  const formatSyncTime = (date: Date | null): string => {
    if (!date) return 'recently';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Active session time left
  const activeSessionTimeLeft = useMemo(() => {
    if (!activeSession || !activeSession.ends_at) return null;
    const ms = new Date(activeSession.ends_at).getTime() - currentTimestamp;
    return Math.max(0, Math.ceil(ms / (60 * 1000)));
  }, [activeSession, currentTimestamp]);

  const blockName = block?.name || 'Block A';

  if (isLoading && machines.length === 0) {
    return (
      <Screen
        header={{
          title: 'Checking machines…',
          subtitle: `${blockName} Laundry Room`,
        }}
      >
        <View testID="loading-skeletons" style={styles.grid}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.tileSkeleton}>
              <Skeleton.Line width={48} style={{ height: 24, marginBottom: 8 }} />
              <Skeleton.Line width="60%" style={{ height: 16, marginBottom: 16 }} />
              <Skeleton.Line width="80%" style={{ height: 28 }} />
            </View>
          ))}
        </View>
      </Screen>
    );
  }

  if (isError && machines.length === 0) {
    return (
      <Screen
        header={{
          title: 'Machines',
          subtitle: `${blockName} Laundry Room`,
        }}
      >
        <View testID="error-state" style={styles.errorContainer}>
          <AlertTriangle size={32} color={colors.status.broken} />
          <Text variant="section" style={{ marginTop: 12, marginBottom: 4 }}>
            Unable to load machines
          </Text>
          <Text variant="body" color="muted" style={{ textAlign: 'center', marginBottom: 16 }}>
            {error?.message || 'Could not connect to the laundry service.'}
          </Text>
          <Button variant="secondary" onPress={() => refetch()}>
            Try again
          </Button>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      scrollable
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor="#2F8BD0"
          colors={['#2F8BD0']}
        />
      }
      offlineBanner={{
        isOffline,
        lastSyncedAt: formatSyncTime(lastSyncedAt),
      }}
    >
      {/* Top Header matching HTML estimator */}
      <View style={styles.headerBlock}>
        <Text style={styles.topCap}>{blockName} · Laundry room</Text>
        <Text style={{ position: 'absolute', opacity: 0 }}>{blockName} Laundry Room</Text>
        <Text style={styles.h1}>
          {availableCount} of {totalCount} free
        </Text>
        <Text style={styles.topCap}>Updated just now · pull down to refresh</Text>
      </View>

      {/* Active wash session banner (ONE pressable, no nested interactive elements) */}
      {activeSession && (
        <Pressable
          testID="active-session-banner"
          accessibilityRole="button"
          accessibilityLabel={`Active wash on Machine ${activeSession.machine?.label || '01'}. Tap to view timer.`}
          onPress={() => router.push(`/(student)/timer/${activeSession.id}`)}
          style={styles.activeBanner}
        >
          <Timer size={24} color="#1F6FA8" style={{ flexShrink: 0 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Your wash is running</Text>
            <Text style={styles.bannerSubtitle}>
              Machine {activeSession.machine?.label || '01'} ·{' '}
              {activeSessionTimeLeft !== null && activeSessionTimeLeft > 0
                ? `${activeSessionTimeLeft} min left`
                : 'Finishing soon'}
            </Text>
          </View>
          <ChevronRight size={20} color="#4F6A80" style={{ flexShrink: 0 }} />
        </Pressable>
      )}

      {/* Dismissible How it works card */}
      {showHowItWorks && (
        <View style={styles.helpCard}>
          <View style={styles.helpHeader}>
            <Text style={styles.helpTitle}>How it works</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss"
              onPress={handleDismissHowItWorks}
              hitSlop={12}
              style={styles.dismissBtn}
            >
              <X size={18} color="#4F6A80" />
            </Pressable>
          </View>
          <View style={styles.helpList}>
            <Text style={styles.helpItem}>
              1. Tap a free machine. 2. Choose program and load. 3. Start and get your exact finish
              time.
            </Text>
          </View>
        </View>
      )}

      {/* Status legend */}
      <View style={styles.legend}>
        <View style={styles.chip}>
          <Check size={13} color="#12805A" strokeWidth={2.2} />
          <Text style={[styles.chipText, { color: '#12805A' }]}>Available</Text>
        </View>
        <View style={styles.chip}>
          <Clock size={13} color="#1F6FA8" strokeWidth={2.2} />
          <Text style={[styles.chipText, { color: '#1F6FA8' }]}>In use</Text>
        </View>
        <View style={styles.chip}>
          <Wrench size={13} color="#9A6612" strokeWidth={2.2} />
          <Text style={[styles.chipText, { color: '#9A6612' }]}>Maintenance</Text>
        </View>
        <View style={styles.chip}>
          <Ban size={13} color="#B83A3A" strokeWidth={2.2} />
          <Text style={[styles.chipText, { color: '#B83A3A' }]}>Broken</Text>
        </View>
      </View>

      {/* Segmented Filter */}
      <View style={styles.segmentedControl}>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: filter === 'all' }}
          onPress={() => setFilter('all')}
          style={[styles.segBtn, filter === 'all' && styles.segBtnActive]}
        >
          <Text style={[styles.segBtnText, filter === 'all' && styles.segBtnTextActive]}>All</Text>
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: filter === 'available' }}
          onPress={() => setFilter('available')}
          style={[styles.segBtn, filter === 'available' && styles.segBtnActive]}
        >
          <Text style={[styles.segBtnText, filter === 'available' && styles.segBtnTextActive]}>
            Free only
          </Text>
        </Pressable>
      </View>

      {/* Machine Tiles Grid */}
      <View testID="machine-grid" style={styles.grid}>
        {filteredMachines.map((machine) => {
          const isInUse = machine.status === 'in_use';
          const isBroken = machine.status === 'broken';
          const isMaintenance = machine.status === 'maintenance';
          const isDim = isBroken || isMaintenance;

          // Status label & color
          let statusLabel = 'Available';
          let statusColor: string = colors.status.available;
          let StatusIcon = Check;
          if (isInUse) {
            statusLabel = 'In use';
            statusColor = colors.status.in_use;
            StatusIcon = Clock;
          } else if (isMaintenance) {
            statusLabel = 'Maintenance';
            statusColor = colors.status.maintenance;
            StatusIcon = Wrench;
          } else if (isBroken) {
            statusLabel = 'Broken';
            statusColor = colors.status.broken;
            StatusIcon = Ban;
          }

          // Compute remaining minutes for in-use
          const timeLeft = machine.timeLeftMinutes ?? 12;
          const progressPercent = machine.progressPercent ?? 65;

          return (
            <Pressable
              key={machine.id}
              accessibilityRole="button"
              accessibilityLabel={`Machine ${machine.label}, ${machine.capacity_kg} kilograms, ${statusLabel}`}
              onPress={() => setSelectedMachine(machine)}
              style={[styles.tile, isDim && styles.tileDim]}
            >
              {/* Meta row: mono ID + weight */}
              <View style={styles.tileMeta}>
                <Text style={[styles.tileNumber, isDim && styles.tileNumberDim]}>
                  {machine.label}
                </Text>
                <View style={styles.tileWeight}>
                  <Weight size={16} color={colors.ink.muted} />
                  <Text style={styles.tileWeightText}>{machine.capacity_kg} kg</Text>
                </View>
              </View>

              {/* Status Chip */}
              <View
                testID={isBroken ? `broken-indicator-${machine.label}` : undefined}
                style={[styles.tileChip, { borderColor: colors.hairline }]}
              >
                <StatusIcon size={14} color={statusColor} />
                <Text style={[styles.tileChipText, { color: statusColor }]}>{statusLabel}</Text>
              </View>

              {/* Progress bar + time left for in-use */}
              {isInUse && (
                <View style={styles.tileProgressWrap}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
                  </View>
                  <Text style={styles.timeLeftText}>{timeLeft} min left</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Empty State when filter yields 0 machines */}
      {filteredMachines.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No machine is free right now</Text>
          <Text style={styles.emptySub}>
            {nextFreeInfo
              ? `The next one finishes in about ${nextFreeInfo.mins} minutes (Machine ${nextFreeInfo.label}).`
              : 'All machines are currently in use, broken, or under maintenance.'}
          </Text>
        </View>
      )}

      {/* Machine Details Bottom Sheet Dialog */}
      <Modal
        visible={!!selectedMachine && !isReportModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMachine(null)}
      >
        <Pressable style={styles.scrim} onPress={() => setSelectedMachine(null)} />
        <View style={styles.panel} accessibilityRole="dialog" accessibilityLabel="Machine details">
          <View style={styles.grab} />

          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Machine {selectedMachine?.label}</Text>
            {selectedMachine && <Chip variant={selectedMachine.status} />}
          </View>

          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Drum capacity</Text>
            <Text style={styles.kvValue}>{selectedMachine?.capacity_kg} kg</Text>
          </View>

          <Text style={styles.sheetNote}>
            {selectedMachine?.status === 'available'
              ? 'Ready now. Choose your settings on the next screen.'
              : selectedMachine?.status === 'in_use'
                ? `Running. ${selectedMachine.timeLeftMinutes ?? 12} min left. Pick another machine or wait.`
                : selectedMachine?.note ||
                  (selectedMachine?.status === 'broken'
                    ? 'Drum does not spin. Reported today.'
                    : 'Filter cleaning. Back by evening.')}
          </Text>

          {selectedMachine?.status === 'available' ? (
            <Button
              testID="sheet-start-wash-button"
              variant="primary"
              onPress={() => {
                const targetId = selectedMachine.id;
                setSelectedMachine(null);
                router.push(`/(student)/start?machineId=${targetId}`);
              }}
            >
              Start a wash here
            </Button>
          ) : (
            <Button
              variant="secondary"
              onPress={() => {
                setIsReportModalOpen(true);
              }}
            >
              Report a problem
            </Button>
          )}

          <Button
            variant="secondary"
            onPress={() => setSelectedMachine(null)}
            style={{ marginTop: 8 }}
          >
            Close
          </Button>
        </View>
      </Modal>

      {/* Report Problem Dialog */}
      <Modal
        testID="tile-report-issue-modal"
        visible={isReportModalOpen}
        transparent
        animationType="fade"
        onRequestClose={handleCloseReportModal}
      >
        <Pressable style={styles.scrim} onPress={handleCloseReportModal} />
        <View
          style={styles.panel}
          accessibilityRole="dialog"
          accessibilityLabel="Report machine issue"
        >
          <View style={styles.grab} />
          <Text style={styles.sheetTitle}>Report machine issue</Text>
          <Text style={styles.fieldLabel}>
            What is wrong with Machine {selectedMachine?.label}?
          </Text>

          <View style={styles.textareaWrapper}>
            <TextInput
              testID="tile-issue-description-input"
              value={reportDescription}
              onChangeText={setReportDescription}
              placeholder="e.g. Door will not lock"
              placeholderTextColor={colors.ink.muted}
              multiline
              numberOfLines={4}
              style={styles.textarea}
              textAlignVertical="top"
            />
          </View>

          {reportError && (
            <Text style={styles.errorText} color="broken">
              {reportError}
            </Text>
          )}

          <Button
            testID="submit-tile-issue-button"
            variant="primary"
            loading={isSubmittingReport}
            disabled={!reportDescription.trim() || isSubmittingReport}
            onPress={handleSubmitReport}
          >
            Send report
          </Button>

          <Button
            variant="secondary"
            disabled={isSubmittingReport}
            onPress={handleCloseReportModal}
            style={{ marginTop: 8 }}
          >
            Cancel
          </Button>
        </View>
      </Modal>

      {/* Toast Notification */}
      {toastMessage && (
        <View testID="tile-issue-success" style={styles.toastWrap}>
          <Toast visible={!!toastMessage} message={toastMessage} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    paddingTop: 4,
    marginBottom: 8,
  },
  topCap: {
    fontSize: 12,
    lineHeight: 16,
    color: '#4F6A80',
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  h1: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '500',
    fontFamily: 'PlusJakartaSans_500Medium',
    letterSpacing: -0.4,
    color: '#0B2233',
    marginVertical: 2,
  },
  updatedSub: {
    fontSize: 12,
    lineHeight: 16,
    color: '#4F6A80',
    fontFamily: 'PlusJakartaSans_400Regular',
    marginBottom: 14,
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 14,
    shadowColor: '#1F6FA8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 2,
    ...(Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' } as any)
      : {}),
  },
  bannerTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
    color: '#0B2233',
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  bannerSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    color: '#4F6A80',
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  helpCard: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    marginBottom: 14,
    shadowColor: '#1F6FA8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 2,
    ...(Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' } as any)
      : {}),
  },
  helpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  helpTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
    color: '#0B2233',
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  dismissBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpList: {
    gap: 4,
  },
  helpItem: {
    fontSize: 12,
    lineHeight: 16,
    color: '#0B2233',
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 99,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  segmentedControl: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 14,
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
    fontSize: 13,
    fontWeight: '400',
    color: '#4F6A80',
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  segBtnTextActive: {
    fontWeight: '500',
    color: '#0B2233',
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tile: {
    width: '48%',
    flexGrow: 1,
    minHeight: 116,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    gap: 10,
    shadowColor: '#1F6FA8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 2,
    ...(Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' } as any)
      : {}),
  },
  tileDim: {
    opacity: 0.78,
  },
  tileSkeleton: {
    width: '48%',
    flexGrow: 1,
    minHeight: 116,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
  },
  tileMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  tileNumber: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '500',
    color: '#0B2233',
  },
  tileNumberDim: {
    color: '#4F6A80',
  },
  tileWeight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tileWeightText: {
    fontSize: 12,
    color: '#4F6A80',
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  tileChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 99,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  tileChipText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  tileProgressWrap: {
    width: '100%',
    gap: 4,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(47, 139, 208, 0.2)',
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2F8BD0',
    borderRadius: 3,
  },
  timeLeftText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: '#1F6FA8',
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  emptyContainer: {
    paddingVertical: 32,
    paddingHorizontal: 8,
  },
  emptyTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
    color: '#0B2233',
    marginBottom: 4,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  emptySub: {
    fontSize: 13,
    color: '#4F6A80',
    fontFamily: 'PlusJakartaSans_400Regular',
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
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
    color: '#0B2233',
    fontFamily: 'PlusJakartaSans_500Medium',
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
  sheetNote: {
    fontSize: 14,
    lineHeight: 20,
    color: '#0B2233',
    marginVertical: 12,
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
  errorText: {
    fontSize: 12,
    color: '#B83A3A',
    marginBottom: 8,
    fontFamily: 'PlusJakartaSans_500Medium',
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
