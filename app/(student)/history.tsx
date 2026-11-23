import React from 'react';
import { View, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { colors, typography } from '@/theme/tokens';
import { glassCard } from '@/theme/glass';
import { Screen, Text, Skeleton, ErrorBanner } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useHostelBlock } from '@/hooks/useMachines';
import { fetchUserHistory, WashSessionDetails } from '@/services/wash';

function formatSessionDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Recently';

    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (isToday) {
      return `Today, ${timeStr}`;
    }

    const dayStr = d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
    return `${dayStr} · ${timeStr}`;
  } catch {
    return 'Recently';
  }
}

function calculateDurationMinutes(
  startedAt: string,
  endsAt: string,
  collectedAt: string | null
): number {
  try {
    const start = new Date(startedAt).getTime();
    const end = collectedAt ? new Date(collectedAt).getTime() : new Date(endsAt).getTime();
    const diffMins = Math.round((end - start) / (1000 * 60));
    return Math.max(1, diffMins);
  } catch {
    return 45;
  }
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m} min` : `${h}h`;
}

export default function HistoryScreen() {
  const { user, profile } = useAuth();
  const { block } = useHostelBlock(profile?.hostel_block_id);
  const blockName = block?.name || 'Block A';

  const {
    data: sessions = [],
    isLoading,
    isRefetching,
    isError,
    error,
    refetch,
  } = useQuery<WashSessionDetails[]>({
    queryKey: ['history'],
    queryFn: () => (user?.id ? fetchUserHistory(user.id) : Promise.resolve([])),
    enabled: !!user?.id,
    staleTime: 1000 * 15,
  });

  return (
    <Screen
      scrollable
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => {
            refetch();
          }}
          tintColor={colors.sky[500]}
          colors={[colors.sky[500]]}
        />
      }
    >
      <View style={styles.topBar}>
        <Text style={styles.topBarText}>{blockName}</Text>
      </View>

      <Text style={styles.title}>History</Text>
      <Text style={styles.subtitle}>Your last washes</Text>

      {isError && (
        <View style={{ marginBottom: 16 }}>
          <ErrorBanner
            message={error instanceof Error ? error.message : 'Failed to load wash history.'}
            onRetry={refetch}
          />
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Skeleton.Line width="60%" />
          <Skeleton.Card />
          <Skeleton.Card />
          <Skeleton.Card />
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No past washes</Text>
          <Text style={styles.emptySub}>Your completed wash sessions will appear here.</Text>
        </View>
      ) : (
        <View style={styles.rowsContainer}>
          {sessions.map((session, index) => {
            const isLast = index === sessions.length - 1;
            const machineLabel = session.machine?.label || '—';
            const programName = session.program?.name || 'Wash';
            const duration = calculateDurationMinutes(
              session.started_at,
              session.ends_at,
              session.collected_at
            );
            const dateStr = formatSessionDate(session.started_at);

            let chipLabel = 'Collected';
            let chipColor = '#12805A';

            if (session.status === 'running') {
              chipLabel = 'Running';
              chipColor = '#1F6FA8';
            } else if (session.status === 'cancelled') {
              chipLabel = 'Cancelled';
              chipColor = '#4F6A80';
            }

            return (
              <View
                key={session.id}
                style={[styles.rowItem, isLast && styles.rowItemLast]}
                accessibilityLabel={`Machine ${machineLabel}, ${programName}, ${chipLabel}`}
              >
                <View style={styles.idBox}>
                  <Text style={styles.idText}>{machineLabel}</Text>
                  <Text style={styles.idSub}>Machine</Text>
                </View>

                <View style={styles.growCol}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {programName} · {Number(session.weight_kg).toFixed(1)} kg
                  </Text>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {dateStr} · {formatDuration(duration)}
                  </Text>
                </View>

                <View style={styles.chip}>
                  <Text style={[styles.chipText, { color: chipColor }]}>{chipLabel}</Text>
                </View>
              </View>
            );
          })}
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
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: typography.caption.fontFamily,
    color: colors.ink.muted,
    marginBottom: 16,
    marginTop: 2,
  },
  loadingContainer: {
    gap: 12,
  },
  emptyContainer: {
    ...glassCard,
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: typography.section.fontFamily,
    color: colors.ink.DEFAULT,
  },
  emptySub: {
    fontSize: 13,
    fontFamily: typography.caption.fontFamily,
    color: colors.ink.muted,
    textAlign: 'center',
  },
  rowsContainer: {
    ...glassCard,
    borderRadius: 20,
    overflow: 'hidden',
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 34, 48, 0.07)',
    gap: 12,
  },
  rowItemLast: {
    borderBottomWidth: 0,
  },
  idBox: {
    flexShrink: 0,
    minWidth: 54,
  },
  idText: {
    fontFamily: typography.monoMachineId.fontFamily,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '500',
    color: colors.ink.DEFAULT,
  },
  idSub: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: typography.caption.fontFamily,
    color: colors.ink.muted,
  },
  growCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowTitle: {
    fontSize: 15,
    fontFamily: typography.body.fontFamily,
    fontWeight: '500',
    color: colors.ink.DEFAULT,
  },
  rowSub: {
    fontSize: 12,
    fontFamily: typography.caption.fontFamily,
    color: colors.ink.muted,
  },
  chip: {
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 99,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    fontSize: 12,
    fontFamily: typography.caption.fontFamily,
    fontWeight: '500',
  },
});
