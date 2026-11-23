import React, { useState } from 'react';
import { View, StyleSheet, RefreshControl } from 'react-native';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { colors, typography } from '@/theme/tokens';
import { glassCard } from '@/theme/glass';
import { Screen, Text, Button, Skeleton, ErrorBanner } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useMachines } from '@/hooks/useMachines';
import { useIssues } from '@/hooks/useIssues';
import { resolveIssue } from '@/services/caretaker';
import { ResolveIssueParams, MachineStatus } from '@/types';

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
    return 'Recently';
  }
}

export default function CaretakerIssuesScreen() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { block } = useMachines(profile?.hostel_block_id);
  const blockName = block?.name || 'Block A';

  const { issues, openCount, isLoading, isRefetching, isError, error, refetch } = useIssues();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2400);
  };

  const resolveMutation = useMutation({
    mutationFn: (params: ResolveIssueParams) => resolveIssue(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      if (variables.resultingMachineStatus === 'broken') {
        showToast('Marked broken & resolved');
      } else if (variables.resultingMachineStatus === 'maintenance') {
        showToast('Set to maintenance & resolved');
      } else {
        showToast('Issue resolved');
      }
    },
    onError: (err) => {
      showToast(err instanceof Error ? err.message : 'Failed to resolve issue');
    },
  });

  const handleResolveOnly = (issueId: string) => {
    resolveMutation.mutate({ issueId });
  };

  const handleResolveWithStatus = (issueId: string, status: MachineStatus) => {
    resolveMutation.mutate({
      issueId,
      resultingMachineStatus: status,
      resolutionNote: `Status updated to ${status} upon resolution`,
    });
  };

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
        <Text style={styles.topBarText}>{blockName} · Caretaker</Text>
      </View>

      <Text style={styles.title}>Issues</Text>
      <Text style={styles.subtitle}>{openCount} open reports from students</Text>

      {isError && (
        <View style={{ marginBottom: 16 }}>
          <ErrorBanner
            message={error instanceof Error ? error.message : 'Failed to load issues.'}
            onRetry={refetch}
          />
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Skeleton.Line width="50%" />
          <Skeleton.Card />
          <Skeleton.Card />
        </View>
      ) : issues.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No open issues</Text>
          <Text style={styles.emptySub}>New reports from students will show up here.</Text>
        </View>
      ) : (
        <View style={styles.rowsContainer}>
          {issues.map((item, index) => {
            const isLast = index === issues.length - 1;
            const machineLabel = item.machines?.label || '01';
            const reportedAgo = formatReportedTime(item.created_at);

            return (
              <View
                key={item.id}
                style={[styles.rowItem, isLast && styles.rowItemLast]}
                accessibilityLabel={`Issue for Machine ${machineLabel}: ${item.description}`}
              >
                <View style={styles.rowHeader}>
                  <Text style={styles.machineLabel}>Machine {machineLabel}</Text>
                  <Text style={styles.reportedTime}>{reportedAgo}</Text>
                </View>

                <Text style={styles.description}>{item.description}</Text>

                <View style={styles.actionButtonsRow}>
                  <Button
                    variant="secondary"
                    onPress={() => handleResolveWithStatus(item.id, 'broken')}
                    disabled={resolveMutation.isPending}
                    style={styles.actionBtnSec}
                    accessibilityLabel="Resolve, mark broken"
                  >
                    Resolve, mark broken
                  </Button>

                  <Button
                    variant="primary"
                    onPress={() => handleResolveOnly(item.id)}
                    disabled={resolveMutation.isPending}
                    style={styles.actionBtnPri}
                    accessibilityLabel="Resolve"
                  >
                    Resolve
                  </Button>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <View style={styles.toast} accessibilityRole="alert">
          <Text style={styles.toastText}>{toastMessage}</Text>
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
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderRadius: 20,
    gap: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: typography.section.fontFamily,
    color: colors.ink.DEFAULT,
  },
  emptySub: {
    fontSize: 14,
    fontFamily: typography.caption.fontFamily,
    color: colors.ink.muted,
  },
  rowsContainer: {
    ...glassCard,
    borderRadius: 20,
    overflow: 'hidden',
  },
  rowItem: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 34, 48, 0.07)',
    gap: 8,
  },
  rowItemLast: {
    borderBottomWidth: 0,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  machineLabel: {
    fontFamily: typography.monoMachineId.fontFamily,
    fontSize: 15,
    fontWeight: '500',
    color: colors.ink.DEFAULT,
  },
  reportedTime: {
    fontSize: 12,
    fontFamily: typography.caption.fontFamily,
    color: colors.ink.muted,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: typography.body.fontFamily,
    color: colors.ink.DEFAULT,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionBtnSec: {
    flex: 1,
    minHeight: 44,
    fontSize: 13,
  },
  actionBtnPri: {
    flex: 1,
    minHeight: 44,
    fontSize: 13,
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
});
