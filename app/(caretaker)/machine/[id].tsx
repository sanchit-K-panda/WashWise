import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, History, CheckCircle2, AlertCircle, ChevronLeft } from 'lucide-react-native';
import { colors, typography } from '@/theme/tokens';
import { glassCard } from '@/theme/glass';
import { Screen, Text, Chip, Skeleton, Button } from '@/components/ui';
import { fetchMachineById } from '@/services/wash';
import { fetchMachineStatusLogs } from '@/services/caretaker';
import { StatusLogEntry } from '@/types';

function formatLogTimestamp(timestamp: string): string {
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return timestamp;
    return `${d.toLocaleDateString([], { day: '2-digit', month: 'short' })}, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return timestamp;
  }
}

export default function CaretakerMachineLogScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Fetch machine info
  const { data: machine, isLoading: isMachineLoading } = useQuery({
    queryKey: ['machine', id],
    queryFn: () => (id ? fetchMachineById(id) : null),
    enabled: !!id,
  });

  // Fetch status logs for this machine
  const { data: logs = [], isLoading: isLogsLoading } = useQuery<StatusLogEntry[]>({
    queryKey: ['machine-log', id],
    queryFn: () => (id ? fetchMachineStatusLogs(id) : []),
    enabled: !!id,
    refetchInterval: 1000 * 10,
  });

  const isLoading = isMachineLoading || isLogsLoading;
  const machineLabel = machine?.label || '01';

  // Guard: Machine not found
  if (!isLoading && !machine) {
    return (
      <Screen scrollable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to machines"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ChevronLeft size={16} color={colors.sky[700]} />
          <Text style={styles.backText}>Machines</Text>
        </Pressable>

        <View testID="machine-not-found" style={styles.emptyCard}>
          <AlertCircle size={32} strokeWidth={1.75} color={colors.ink.muted} />
          <Text style={[styles.cardTitle, { textAlign: 'center', marginTop: 12 }]}>
            Machine not found
          </Text>
          <Text style={[styles.cardSub, { textAlign: 'center', marginTop: 4, marginBottom: 16 }]}>
            The requested washing machine could not be located in this hostel block.
          </Text>
          <Button variant="secondary" onPress={() => router.back()}>
            Back to machines
          </Button>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to machines"
        onPress={() => router.back()}
        style={styles.backButton}
      >
        <ChevronLeft size={16} color={colors.sky[700]} />
        <Text style={styles.backText}>Machines</Text>
      </Pressable>

      <Text style={styles.title}>Machine {machineLabel}</Text>
      <Text style={styles.subtitle}>
        {machine ? `${machine.capacity_kg} kg drum · Audit Log` : 'Status History'}
      </Text>

      {/* Current Machine Overview Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>Current Status</Text>
          {machine && <Chip variant={machine.status} />}
        </View>

        {machine?.note ? <Text style={styles.noteText}>&ldquo;{machine.note}&rdquo;</Text> : null}

        <Text style={styles.cardSub}>
          Last updated:{' '}
          {machine?.status_updated_at
            ? formatLogTimestamp(machine.status_updated_at)
            : 'Not yet recorded'}
        </Text>
      </View>

      {/* History Section Header */}
      <View style={styles.sectionHeaderRow}>
        <History size={16} strokeWidth={1.75} color={colors.sky[700]} />
        <Text style={styles.sectionTitle}>Status history & audit trail</Text>
      </View>

      {/* Log list or loading state */}
      {isLoading ? (
        <View testID="logs-loading-skeletons" style={styles.skeletonList}>
          {Array.from({ length: 3 }).map((_, i) => (
            <View key={`log-skeleton-${i}`} style={styles.logCard}>
              <Skeleton.Line width="60%" style={{ height: 20 }} />
              <View style={{ height: 8 }} />
              <Skeleton.Line width="40%" style={{ height: 14 }} />
            </View>
          ))}
        </View>
      ) : logs.length === 0 ? (
        <View testID="no-logs-state" style={styles.emptyCard}>
          <CheckCircle2 size={32} strokeWidth={1.75} color={colors.sky[700]} />
          <Text style={[styles.cardTitle, { textAlign: 'center', marginTop: 12 }]}>
            No status changes logged
          </Text>
          <Text style={[styles.cardSub, { textAlign: 'center', marginTop: 4 }]}>
            Status transitions recorded by caretaker verification or automated sessions will appear
            here.
          </Text>
        </View>
      ) : (
        <View testID="status-logs-list" style={styles.logsList}>
          {logs.map((log) => {
            const changerName = log.profiles?.name || 'System / Auto';

            return (
              <View key={log.id} testID={`log-entry-${log.id}`} style={styles.logCard}>
                {/* Status Transition Row */}
                <View style={styles.transitionRow}>
                  {log.old_status ? (
                    <Chip variant={log.old_status} />
                  ) : (
                    <Text style={styles.cardSub}>Created</Text>
                  )}
                  <ArrowRight size={14} strokeWidth={2} color={colors.ink.muted} />
                  <Chip variant={log.new_status} />
                </View>

                {/* Metadata Row */}
                <View style={styles.metaRow}>
                  <Text style={styles.cardSub}>Updated by {changerName}</Text>
                  <Text style={styles.cardSub}>{formatLogTimestamp(log.changed_at)}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={{ marginTop: 24, marginBottom: 16 }}>
        <Button
          variant="secondary"
          onPress={() => router.back()}
          accessibilityLabel="Back to machine list"
        >
          Back to machines
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 28,
    marginBottom: 4,
  },
  backText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 12,
    fontWeight: '500',
    color: colors.sky[700],
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
  card: {
    ...glassCard,
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: typography.section.fontFamily,
    fontWeight: '500',
    color: colors.ink.DEFAULT,
  },
  cardSub: {
    fontSize: 12,
    fontFamily: typography.caption.fontFamily,
    color: colors.ink.muted,
    marginTop: 4,
  },
  noteText: {
    fontSize: 14,
    fontFamily: typography.body.fontFamily,
    color: colors.ink.DEFAULT,
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: typography.section.fontFamily,
    fontWeight: '500',
    color: colors.ink.DEFAULT,
  },
  logsList: {
    gap: 10,
  },
  skeletonList: {
    gap: 10,
  },
  logCard: {
    ...glassCard,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  emptyCard: {
    ...glassCard,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transitionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(15, 34, 48, 0.07)',
  },
});
