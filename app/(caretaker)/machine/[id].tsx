import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, History, CheckCircle2 } from 'lucide-react-native';
import { colors } from '@/theme/tokens';
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
    queryKey: ['machine_status_logs', id],
    queryFn: () => (id ? fetchMachineStatusLogs(id) : []),
    enabled: !!id,
    refetchInterval: 1000 * 10,
  });

  const isLoading = isMachineLoading || isLogsLoading;
  const machineLabel = machine?.label || '01';

  return (
    <Screen
      scrollable
      header={{
        title: `Machine ${machineLabel}`,
        subtitle: machine ? `${machine.capacity_kg} kg drum · Audit Log` : 'Status History',
        onBack: () => router.back(),
      }}
    >
      {/* Current Machine Overview Card */}
      <View className="p-4 bg-surface rounded-md border border-hairline mb-6">
        <View className="flex-row items-center justify-between mb-2">
          <Text variant="section" color="ink">
            Current Status
          </Text>
          {machine && <Chip variant={machine.status} />}
        </View>

        {machine?.note ? (
          <Text variant="body" color="ink" style={{ marginTop: 4, fontStyle: 'italic' }}>
            &ldquo;{machine.note}&rdquo;
          </Text>
        ) : null}

        <Text variant="caption" color="muted" style={{ marginTop: 6 }}>
          Last updated:{' '}
          {machine?.status_updated_at
            ? formatLogTimestamp(machine.status_updated_at)
            : 'Not yet recorded'}
        </Text>
      </View>

      {/* History Section Header */}
      <View className="flex-row items-center gap-2 mb-3">
        <History size={18} strokeWidth={1.75} color={colors.ink.muted} />
        <Text variant="section" color="ink">
          Status history & audit trail
        </Text>
      </View>

      {/* Log list or loading state */}
      {isLoading ? (
        <View testID="logs-loading-skeletons" className="space-y-3 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <View
              key={`log-skeleton-${i}`}
              className="p-3.5 bg-surface border border-hairline rounded-md"
            >
              <Skeleton.Line width="60%" style={{ height: 20 }} />
              <View className="h-2" />
              <Skeleton.Line width="40%" style={{ height: 14 }} />
            </View>
          ))}
        </View>
      ) : logs.length === 0 ? (
        <View
          testID="no-logs-state"
          className="p-8 bg-surface border border-hairline rounded-md items-center text-center my-4"
        >
          <CheckCircle2 size={32} strokeWidth={1.75} color={colors.ink.muted} />
          <Text variant="section" color="ink" style={{ textAlign: 'center', marginTop: 12 }}>
            No status changes logged
          </Text>
          <Text variant="caption" color="muted" style={{ textAlign: 'center', marginTop: 4 }}>
            Status transitions recorded by caretaker verification or automated sessions will appear
            here.
          </Text>
        </View>
      ) : (
        <View testID="status-logs-list" className="space-y-3 gap-3">
          {logs.map((log) => {
            const changerName = log.profiles?.name || 'System / Auto';

            return (
              <View
                key={log.id}
                testID={`log-entry-${log.id}`}
                className="p-3.5 bg-surface border border-hairline rounded-md"
              >
                {/* Status Transition Row */}
                <View className="flex-row items-center gap-2 mb-2">
                  <Chip variant={log.old_status} />
                  <ArrowRight size={14} strokeWidth={2} color={colors.ink.muted} />
                  <Chip variant={log.new_status} />
                </View>

                {/* Metadata Row */}
                <View className="flex-row items-center justify-between pt-1 border-t border-hairline">
                  <Text variant="caption" color="muted">
                    Updated by {changerName}
                  </Text>
                  <Text variant="caption" color="muted" tabular>
                    {formatLogTimestamp(log.changed_at)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View className="mt-8 mb-4">
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
